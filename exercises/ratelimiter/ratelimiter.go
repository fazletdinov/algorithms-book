//go:build !solution

// Package ratelimiter — боевой мини-проект: два лимитера частоты запросов.
// Теория паттерна — в книге: ../../src/sliding-window.md
//
//	go test ./ratelimiter/                 # ваша реализация
//	go test -tags solution ./ratelimiter/  # эталон
//
// Реализуйте ДВА подхода и сравните:
//  1. RateLimiter — sliding window log (паттерн главы): точный, память O(окна);
//  2. TokenBucket — то, что реально в проде (модель golang.org/x/time/rate):
//     терпит всплески, память O(1).
package ratelimiter

// RateLimiter ограничивает частоту: не более limit запросов от одного клиента
// за скользящее окно длиной windowMs миллисекунд.
type RateLimiter struct {
	limit    int
	windowMs int64
	// TODO: поле для хранения меток времени по клиентам
	// (например, map[string][]int64 — отсортированные метки в окне).
}

// NewRateLimiter создаёт лимитер: не более limit запросов за последние windowMs
// миллисекунд на клиента.
func NewRateLimiter(limit int, windowMs int64) *RateLimiter {
	return &RateLimiter{limit: limit, windowMs: windowMs}
}

// Allow отвечает, можно ли пропустить запрос от clientID в момент nowMs (мс).
// Пропущенный запрос учитывается в окне; отклонённый — нет.
// Запрос в окне, если его метка t удовлетворяет t > nowMs-windowMs.
//
// Ожидаемая сложность: амортизированно O(1) на вызов.
func (r *RateLimiter) Allow(clientID string, nowMs int64) bool {
	// TODO: скользящее окно меток по clientID:
	// 1) выкинуть из начала метки со временем <= nowMs - windowMs (устарели);
	//    если меток не осталось — УДАЛИТЬ ключ клиента из map (иначе прод-утечка:
	//    карта растёт с числом когда-либо виденных клиентов, а не активных);
	// 2) если оставшихся меньше limit — добавить nowMs в конец и вернуть true;
	// 3) иначе вернуть false (лимит исчерпан).
	panic("TODO: реализуйте Allow")
}

// RetryAfter возвращает, через сколько миллисекунд запрос от clientID снова
// пройдёт: 0 — можно прямо сейчас; -1 — никогда (limit <= 0). Состояние НЕ
// меняет (это запрос, а не попытка).
func (r *RateLimiter) RetryAfter(clientID string, nowMs int64) int64 {
	// TODO: если в окне есть место — 0; иначе вычислить, когда из окна выйдет
	// метка, стоящая limit-й с конца (после её ухода останется limit-1), и
	// вернуть, сколько до этого ждать.
	panic("TODO: реализуйте RetryAfter")
}

// TokenBucket — лимитер на «ведре токенов» (модель golang.org/x/time/rate):
// ведро ёмкости capacity, изначально полное, пополняется refillPerSec токенами
// в секунду; запрос тратит 1 токен. Терпит всплески до capacity, память O(1).
type TokenBucket struct {
	capacity    float64
	refillPerMs float64
	// TODO: текущее число токенов и время последнего пополнения.
}

// NewTokenBucket создаёт ведро ёмкости capacity, пополняемое со скоростью
// refillPerSec токенов в секунду. Изначально ведро полное.
func NewTokenBucket(capacity int, refillPerSec float64) *TokenBucket {
	return &TokenBucket{capacity: float64(capacity), refillPerMs: refillPerSec / 1000}
}

// Allow отвечает, есть ли токен на запрос в момент nowMs (мс), и тратит его.
func (b *TokenBucket) Allow(nowMs int64) bool {
	// TODO: 1) пополнить токены на прошедшее с прошлого вызова время
	// (tokens += elapsedMs * refillPerMs), не превышая capacity;
	// 2) если токенов >= 1 — вычесть 1 и вернуть true; иначе false.
	panic("TODO: реализуйте Allow (token bucket)")
}

// SafeTokenBucket — потокобезопасная обёртка над TokenBucket: в реальном
// сервисе один лимитер дёргают много горутин-обработчиков одновременно, а сам
// TokenBucket не защищён. Его Allow — «check-then-act»: прочитать tokens,
// решить, записать. Без синхронизации две горутины прочитают одно и то же
// значение и ОБЕ пропустят запрос по последнему токену (lost update).
type SafeTokenBucket struct {
	inner *TokenBucket
	// TODO: добавьте sync.Mutex, который сделает вызов inner.Allow атомарным.
}

// NewSafeTokenBucket создаёт потокобезопасное ведро ёмкости capacity,
// пополняемое со скоростью refillPerSec токенов в секунду.
func NewSafeTokenBucket(capacity int, refillPerSec float64) *SafeTokenBucket {
	return &SafeTokenBucket{inner: NewTokenBucket(capacity, refillPerSec)}
}

// Allow — как TokenBucket.Allow, но безопасен для вызова из многих горутин.
func (b *SafeTokenBucket) Allow(nowMs int64) bool {
	// TODO: возьмите мьютекс на время всего вызова b.inner.Allow(nowMs) —
	// пара «проверить токены → потратить» должна выполняться атомарно.
	// Без замка -race покажет гонку, а конкурентный тест насчитает лишние
	// пропущенные запросы.
	panic("TODO: реализуйте Allow (потокобезопасно)")
}
