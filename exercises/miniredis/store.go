package miniredis

import (
	"sort"
	"sync"
	"time"
)

// Store — состояние сервера, ОБЩЕЕ на все подключения: cmd/miniredis/main.go
// обслуживает каждое соединение в своей горутине (см. handleConn), поэтому
// доступ к data/expire/zsets защищён мьютексом с самого начала — как ты уже
// делал в SafeTokenBucket, только здесь это не отдельная задача, а данность
// с этапа 2.
//
// now — точка впрыска времени: в проде это time.Now, в тестах (см.
// newStoreForTest в miniredis_test.go) — фиксированные/управляемые часы.
// Команды сами по себе (EXPIRE/TTL) текущее время НЕ принимают — это было бы
// нечестным протоколом, настоящий redis-cli такое не пришлёт, — поэтому
// внедрять подменяемые часы приходится именно здесь, на уровне Store, а не
// через параметр функции, как в cache.TTLCache.
//
// zsets — упорядоченные множества (ZADD/ZSCORE/ZRANGE/ZRANK), КАЖДОЕ под
// своим ключом (у настоящего Redis тоже так — можно ZADD leaderboard1 и
// ZADD leaderboard2 независимо). Внутри — ровно map[string]int64
// (участник → очки), как l.score в leaderboard.Leaderboard; здесь просто
// много таких карт, по одной на ключ. TTL на zset-ключи в этом капстоуне
// сознательно не распространяется (упрощение) — EXPIRE/TTL работают только
// со строковыми ключами из data.
type Store struct {
	mu     sync.Mutex
	data   map[string]string
	expire map[string]time.Time // отсутствие ключа в expire = TTL не задан
	zsets  map[string]map[string]int64
	now    func() time.Time
}

// NewStore создаёт пустое хранилище с настоящими часами (time.Now).
func NewStore() *Store {
	return &Store{
		data:   make(map[string]string),
		expire: make(map[string]time.Time),
		zsets:  make(map[string]map[string]int64),
		now:    time.Now,
	}
}

// live проверяет, жив ли ключ: есть в data и (если задан TTL) срок ещё не
// истёк. Если TTL истёк — лениво удаляет ключ из обеих карт и сообщает
// «ключа нет». Другого удаления по сроку в мини-Redis нет: ключ, к которому
// не обращаются, так и лежит в памяти. Настоящий Redis удаляет и лениво, и
// активно — без единого обращения (замер на Redis 7.4.11:
// redislab/measure.sh active, разбор — в главе «Капстоун: мини-Redis»).
// Вызывающий код должен держать s.mu — это внутренний метод, а не отдельная
// команда протокола.
func (s *Store) live(key string) (value string, ok bool) {
	v, exists := s.data[key]
	if !exists {
		return "", false
	}
	if exp, hasTTL := s.expire[key]; hasTTL && !s.now().Before(exp) {
		delete(s.data, key)
		delete(s.expire, key)
		return "", false
	}
	return v, true
}

// zsetOrdered возвращает участников zset, отсортированных ПО ВОЗРАСТАНИЮ
// очков (при равенстве — по имени лексикографически): соглашение ZRANGE/
// ZRANK настоящего Redis (не путать с leaderboard.Leaderboard.ordered() —
// та же идея, но по убыванию, потому что там это буквально таблица лидеров,
// а не протокольная команда). nil-карта обрабатывается как пустая — ключа-
// зсета просто нет. Вызывающий код должен держать s.mu.
func zsetOrdered(zset map[string]int64) []string {
	members := make([]string, 0, len(zset))
	for m := range zset {
		members = append(members, m)
	}
	sort.Slice(members, func(i, j int) bool {
		if zset[members[i]] != zset[members[j]] {
			return zset[members[i]] < zset[members[j]]
		}
		return members[i] < members[j]
	})
	return members
}
