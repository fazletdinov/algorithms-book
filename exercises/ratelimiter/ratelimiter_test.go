package ratelimiter

import (
	"sync"
	"sync/atomic"
	"testing"
)

// ── 1. Sliding window log: Allow ────────────────────────────────────────────

// Каждый шаг сценария: запрос клиента client в момент nowMs (мс) и ожидаемый
// ответ want (true — пропущен, false — отклонён).
type step struct {
	client string
	nowMs  int64
	want   bool
}

func runScenario(t *testing.T, name string, limit int, windowMs int64, steps []step) {
	t.Helper()
	rl := NewRateLimiter(limit, windowMs)
	for i, s := range steps {
		if got := rl.Allow(s.client, s.nowMs); got != s.want {
			t.Errorf("%s: шаг %d Allow(%q, %d) = %v, ожидалось %v",
				name, i, s.client, s.nowMs, got, s.want)
		}
	}
}

func TestRateLimiterBurstWithinWindow(t *testing.T) {
	runScenario(t, "всплеск", 3, 1000, []step{
		{"a", 0, true},
		{"a", 100, true},
		{"a", 200, true},
		{"a", 300, false}, // 4-й запрос в окне [0..300] — лимит исчерпан
	})
}

func TestRateLimiterWindowSlides(t *testing.T) {
	runScenario(t, "окно скользит", 2, 1000, []step{
		{"a", 0, true},
		{"a", 500, true},
		{"a", 600, false},  // в окне уже 2 (метки 0 и 500)
		{"a", 1001, true},  // метка 0 вышла из окна (cutoff=1) → место освободилось
		{"a", 1002, false}, // теперь в окне 500 и 1001
	})
}

func TestRateLimiterPerClientIsolation(t *testing.T) {
	runScenario(t, "изоляция клиентов", 1, 1000, []step{
		{"a", 0, true},
		{"a", 0, false}, // клиент a исчерпал лимит
		{"b", 0, true},  // клиент b независим
		{"c", 0, true},
	})
}

func TestRateLimiterWindowBoundary(t *testing.T) {
	runScenario(t, "граница окна", 1, 1000, []step{
		{"a", 0, true},
		{"a", 999, false}, // 0 всё ещё в окне (cutoff=-1)
		{"a", 1000, true}, // 0 ровно на границе (cutoff=0, отбрасывается)
	})
}

func TestRateLimiterZeroAndSingleLimit(t *testing.T) {
	rl0 := NewRateLimiter(0, 1000)
	if rl0.Allow("a", 0) {
		t.Errorf("limit=0: запрос не должен проходить")
	}
	runScenario(t, "лимит 1", 1, 100, []step{
		{"a", 0, true},
		{"a", 50, false},
		{"a", 101, true}, // метка 0 вышла (cutoff=1)
	})
}

func TestRateLimiterOverallRespectsLimit(t *testing.T) {
	// Инвариант: в любом окне пропущенных не больше limit.
	const limit, window = 5, 1000
	rl := NewRateLimiter(limit, window)
	var passed []int64
	for now := int64(0); now < 10000; now += 50 {
		if rl.Allow("a", now) {
			passed = append(passed, now)
		}
	}
	for i, t0 := range passed {
		cnt := 0
		for j := i; j >= 0 && passed[j] > t0-window; j-- {
			cnt++
		}
		if cnt > limit {
			t.Fatalf("в окне, кончающемся на %d, пропущено %d > limit=%d", t0, cnt, limit)
		}
	}
	if len(passed) == 0 {
		t.Fatalf("ожидались пропущенные запросы")
	}
}

// ── 2. Sliding window log: RetryAfter ───────────────────────────────────────

func TestRateLimiterRetryAfter(t *testing.T) {
	rl := NewRateLimiter(2, 1000)
	rl.Allow("a", 0)   // окно: {0}
	rl.Allow("a", 500) // окно: {0, 500} — заполнено

	if got := rl.RetryAfter("a", 600); got != 400 {
		t.Errorf("RetryAfter(600) = %d, ожидалось 400 (метка 0 выйдет в 1000)", got)
	}
	if got := rl.RetryAfter("a", 700); got != 300 {
		t.Errorf("RetryAfter(700) = %d, ожидалось 300", got)
	}

	// Есть место в окне — можно прямо сейчас.
	free := NewRateLimiter(2, 1000)
	free.Allow("a", 0)
	if got := free.RetryAfter("a", 0); got != 0 {
		t.Errorf("RetryAfter при свободном слоте = %d, ожидалось 0", got)
	}

	// limit=0 — никогда.
	never := NewRateLimiter(0, 1000)
	if got := never.RetryAfter("a", 0); got != -1 {
		t.Errorf("RetryAfter при limit=0 = %d, ожидалось -1", got)
	}

	// После RetryAfter Allow всё ещё должен отклонять (запрос не мутирует).
	if rl.Allow("a", 600) {
		t.Errorf("RetryAfter не должен освобождать слот — Allow(600) обязан отклонить")
	}
}

// ── 3. Token bucket ─────────────────────────────────────────────────────────

func TestTokenBucketBurst(t *testing.T) {
	// Ёмкость 2, пополнение 1 токен/сек. Изначально полное → всплеск на 2.
	b := NewTokenBucket(2, 1.0)
	if !b.Allow(0) {
		t.Fatalf("первый запрос должен пройти (ведро полное)")
	}
	if !b.Allow(0) {
		t.Fatalf("второй запрос должен пройти (ведро полное)")
	}
	if b.Allow(0) {
		t.Errorf("третий запрос в тот же момент должен быть отклонён (токенов нет)")
	}
}

func TestTokenBucketRefill(t *testing.T) {
	b := NewTokenBucket(2, 1.0) // 1 токен/сек = 0.001/мс
	b.Allow(0)
	b.Allow(0) // токены исчерпаны
	if b.Allow(0) {
		t.Fatalf("токенов нет")
	}
	if !b.Allow(1000) { // за 1000мс накопился 1 токен
		t.Errorf("через 1с должен накопиться токен")
	}
	if b.Allow(1000) {
		t.Errorf("второй токен за тот же момент не должен пройти")
	}
	// За 2с накопится 2 (но не больше capacity=2).
	if !b.Allow(3000) {
		t.Errorf("за 2с должен накопиться первый токен")
	}
	if !b.Allow(3000) {
		t.Errorf("за 2с должен накопиться и второй токен (до потолка capacity)")
	}
	if b.Allow(3000) {
		t.Errorf("капасити ограничивает накопление — третьего токена нет")
	}
}

func TestTokenBucketSteadyRate(t *testing.T) {
	// Ёмкость 1, 10 токенов/сек → один запрос раз в ~100мс.
	b := NewTokenBucket(1, 10.0)
	if !b.Allow(0) {
		t.Fatalf("первый запрос проходит (ведро полное)")
	}
	if b.Allow(50) { // за 50мс накопилось 0.5 токена
		t.Errorf("через 50мс токена ещё нет (0.5)")
	}
	if !b.Allow(100) { // за 100мс накопился ровно 1
		t.Errorf("через 100мс токен накоплен — запрос проходит")
	}
}

// ── 4. SafeTokenBucket: потокобезопасность ──────────────────────────────────

func TestSafeTokenBucketDelegates(t *testing.T) {
	// Последовательная семантика — ровно как у TokenBucket: обёртка делегирует,
	// пополнение по времени работает сквозь неё.
	b := NewSafeTokenBucket(1, 1.0)
	if !b.Allow(0) {
		t.Fatalf("первый запрос должен пройти (ведро полное)")
	}
	if b.Allow(0) {
		t.Errorf("токенов нет — второй запрос в тот же момент отклоняется")
	}
	if !b.Allow(1000) {
		t.Errorf("пополнение должно работать через обёртку: за 1с накопился токен")
	}
}

func TestSafeTokenBucketConcurrent(t *testing.T) {
	// capacity=100 без пополнения, 8 горутин × 50 вызовов в один момент времени:
	// пройти должны РОВНО 100. Несинхронизированная реализация под -race даст
	// гонку на tokens, а «lost update» (две горутины увидели один и тот же
	// токен) — насчитает больше 100 пропущенных.
	const (
		goroutines = 8
		calls      = 50
		capacity   = 100
	)
	b := NewSafeTokenBucket(capacity, 0)
	var allowed atomic.Int64
	var wg sync.WaitGroup
	for g := 0; g < goroutines; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < calls; i++ {
				if b.Allow(0) {
					allowed.Add(1)
				}
			}
		}()
	}
	wg.Wait()
	if got := allowed.Load(); got != capacity {
		t.Fatalf("из %d конкурентных запросов пропущено %d, ожидалось ровно %d",
			goroutines*calls, got, capacity)
	}
}
