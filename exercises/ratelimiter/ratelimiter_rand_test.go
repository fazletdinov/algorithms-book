package ratelimiter

import (
	"math/rand"
	"sort"
	"testing"
)

// modelLimiter — наивная модель sliding window log: хранит ПОЛНЫЙ список меток
// всех когда-либо пропущенных запросов и на каждый вызов фильтрует окно заново.
// Медленно (O(история)), зато очевидно корректно — эталон для сверки.
type modelLimiter struct {
	limit    int
	windowMs int64
	passed   map[string][]int64 // clientID -> метки ВСЕХ пропущенных запросов
}

func newModelLimiter(limit int, windowMs int64) *modelLimiter {
	return &modelLimiter{limit: limit, windowMs: windowMs, passed: make(map[string][]int64)}
}

// inWindow — сколько пропущенных меток клиента попадает в окно на момент nowMs
// (метка в окне, если t > nowMs-windowMs).
func (m *modelLimiter) inWindow(clientID string, nowMs int64) int {
	cnt := 0
	for _, t := range m.passed[clientID] {
		if t > nowMs-m.windowMs {
			cnt++
		}
	}
	return cnt
}

func (m *modelLimiter) allow(clientID string, nowMs int64) bool {
	if m.inWindow(clientID, nowMs) >= m.limit {
		return false
	}
	m.passed[clientID] = append(m.passed[clientID], nowMs)
	return true
}

// retryAfter — наивно: перебираем моменты-кандидаты (сейчас и моменты выхода
// каждой метки из окна) по возрастанию и ищем первый, где в окне есть место.
// Состояние не меняет.
func (m *modelLimiter) retryAfter(clientID string, nowMs int64) int64 {
	if m.limit <= 0 {
		return -1
	}
	cands := []int64{nowMs}
	for _, t := range m.passed[clientID] {
		if exit := t + m.windowMs; exit > nowMs {
			cands = append(cands, exit)
		}
	}
	sort.Slice(cands, func(i, j int) bool { return cands[i] < cands[j] })
	for _, at := range cands {
		if m.inWindow(clientID, at) < m.limit {
			return at - nowMs
		}
	}
	return -1 // недостижимо при limit > 0
}

// TestRateLimiterRandom: случайные потоки запросов против наивной модели.
// Маленький пул клиентов даёт коллизии по ключу; время неубывающее со
// случайными скачками, включая скачки РОВНО на windowMs — это бьёт по границе
// окна ('>' vs '>=' при отбросе устаревших меток). Сид фиксирован → падение
// воспроизводимо.
func TestRateLimiterRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260707))
	clientPool := []string{"a", "b", "c", "d"}
	for run := 0; run < 50; run++ {
		limit := rng.Intn(6)                  // 0..5, включая вырожденный limit=0
		windowMs := int64(20 + rng.Intn(181)) // 20..200 мс
		clients := clientPool[:2+rng.Intn(3)] // 2..4 клиента
		rl := NewRateLimiter(limit, windowMs)
		model := newModelLimiter(limit, windowMs)

		now := int64(0)
		for step := 0; step < 2000; step++ {
			switch rng.Intn(6) {
			case 0: // время стоит — несколько запросов в один момент
			case 1:
				now += windowMs // скачок ровно на окно — граница!
			case 2:
				now += windowMs - 1 // на волосок до границы
			default:
				now += int64(rng.Intn(int(windowMs)))
			}
			c := clients[rng.Intn(len(clients))]

			// RetryAfter не мутирует — сверяем перед каждым Allow.
			if got, want := rl.RetryAfter(c, now), model.retryAfter(c, now); got != want {
				t.Fatalf("run %d step %d: RetryAfter(%q, %d) = %d, модель = %d (limit=%d window=%d)",
					run, step, c, now, got, want, limit, windowMs)
			}
			if got, want := rl.Allow(c, now), model.allow(c, now); got != want {
				t.Fatalf("run %d step %d: Allow(%q, %d) = %v, модель = %v (limit=%d window=%d)",
					run, step, c, now, got, want, limit, windowMs)
			}
		}
	}
}
