//go:build solution

package ratelimiter

import "sync"

// ── 1. RateLimiter: sliding window log (паттерн главы) ──────────────────────
//
// Для каждого клиента храним отсортированные метки времени запросов в окне.
// Точный алгоритм; платит за точность памятью O(число запросов в окне).
type RateLimiter struct {
	limit    int
	windowMs int64
	hits     map[string][]int64 // clientID -> метки времени в окне (по возрастанию)
}

func NewRateLimiter(limit int, windowMs int64) *RateLimiter {
	return &RateLimiter{limit: limit, windowMs: windowMs, hits: make(map[string][]int64)}
}

// active возвращает метки clientID, ещё попадающие в окно на момент nowMs,
// попутно обрезая устаревшие в хранилище.
//
// Прод-нюанс про память: ключ клиента, у которого в окне не осталось меток,
// надо УДАЛЯТЬ из map — иначе карта растёт с числом «когда-либо виденных»
// клиентов, а не активных (классическая утечка лимитеров; в распределённых
// реализациях её решает TTL ключа в Redis).
func (r *RateLimiter) active(clientID string, nowMs int64) []int64 {
	q := r.hits[clientID]
	cutoff := nowMs - r.windowMs
	i := 0
	for i < len(q) && q[i] <= cutoff {
		i++
	}
	q = q[i:]
	if len(q) == 0 {
		delete(r.hits, clientID)
	} else {
		r.hits[clientID] = q
	}
	return q
}

func (r *RateLimiter) Allow(clientID string, nowMs int64) bool {
	q := r.active(clientID, nowMs)
	if len(q) >= r.limit {
		return false // лимит в окне исчерпан
	}
	r.hits[clientID] = append(q, nowMs)
	return true
}

// RetryAfter возвращает, через сколько миллисекунд запрос от clientID снова
// будет пропущен: 0 — можно прямо сейчас; -1 — никогда (limit <= 0).
func (r *RateLimiter) RetryAfter(clientID string, nowMs int64) int64 {
	if r.limit <= 0 {
		return -1
	}
	q := r.active(clientID, nowMs)
	if len(q) < r.limit {
		return 0
	}
	// Слот освободится, когда из окна выйдет метка, стоящая на limit-й с конца:
	// после её ухода в окне останется limit-1 запрос.
	freeAt := q[len(q)-r.limit] + r.windowMs
	if freeAt <= nowMs {
		return 0
	}
	return freeAt - nowMs
}

// ── 2. TokenBucket: то, что реально в проде ─────────────────────────────────
//
// Модель golang.org/x/time/rate: ведро ёмкости capacity, изначально полное,
// пополняется refillPerSec токенами в секунду. Запрос тратит 1 токен. Терпит
// всплески до capacity и стоит O(1) памяти (два числа) — в отличие от лога.
type TokenBucket struct {
	capacity    float64
	refillPerMs float64
	tokens      float64
	lastMs      int64
	inited      bool
}

func NewTokenBucket(capacity int, refillPerSec float64) *TokenBucket {
	return &TokenBucket{
		capacity:    float64(capacity),
		refillPerMs: refillPerSec / 1000,
		tokens:      float64(capacity), // изначально полное
	}
}

func (b *TokenBucket) Allow(nowMs int64) bool {
	if !b.inited {
		b.lastMs = nowMs
		b.inited = true
	}
	// Пополняем на прошедшее время, не переливая через край.
	if elapsed := nowMs - b.lastMs; elapsed > 0 {
		b.tokens += float64(elapsed) * b.refillPerMs
		if b.tokens > b.capacity {
			b.tokens = b.capacity
		}
		b.lastMs = nowMs
	}
	if b.tokens >= 1 {
		b.tokens--
		return true // токен есть — пропускаем
	}
	return false // токенов нет — отклоняем
}

// ── 3. SafeTokenBucket: потокобезопасная обёртка ────────────────────────────
//
// TokenBucket.Allow — «check-then-act»: прочитать tokens, решить, записать.
// Без синхронизации две горутины читают одно значение и обе пропускают запрос
// по последнему токену (lost update), а -race видит гонку на tokens/lastMs.
// Мьютекс делает всю пару атомарной — ровно так устроен
// golang.org/x/time/rate.Limiter (sync.Mutex внутри).
type SafeTokenBucket struct {
	mu    sync.Mutex
	inner *TokenBucket
}

func NewSafeTokenBucket(capacity int, refillPerSec float64) *SafeTokenBucket {
	return &SafeTokenBucket{inner: NewTokenBucket(capacity, refillPerSec)}
}

func (b *SafeTokenBucket) Allow(nowMs int64) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.inner.Allow(nowMs)
}
