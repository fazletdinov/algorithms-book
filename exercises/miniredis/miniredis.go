//go:build !solution

// Package miniredis — капстоун книги: RESP-сервер (протокол настоящего
// Redis, совместимый с redis-cli) поверх техник, уже реализованных в других
// пакетах тренажёра. Маршрут по этапам и теория — в книге:
// ../../src/miniredis.md
//
//	cd exercises && go run ./cmd/miniredis   # поднять сервер на localhost:6380
//	go test ./miniredis/                     # твои решения
//	go test -tags solution ./miniredis/      # эталон
//
// Протокол (resp.go), маршрутизация команд и PING/ECHO (dispatch.go),
// хранилище (store.go) даны готовыми — это протокольная/инфраструктурная
// возня, а не алгоритмическая задача книги. Store общий на все подключения
// (см. cmd/miniredis/main.go — горутина на соединение), поэтому доступ к
// store.data/store.expire защищай store.mu, как в SafeTokenBucket.
//
// Этап 3 добавил TTL: SET/GET/DEL из этапа 2 пришлось слегка пересмотреть
// (реальная система так и живёт — сквозная забота вроде TTL требует
// вернуться в уже написанный код, а не только дописать новое), плюс два
// новых обработчика — EXPIRE и TTL.
//
// Этап 4 добавил ZADD/ZSCORE/ZRANGE/ZRANK — упорядоченное множество (ZSET),
// та же идея, что в leaderboard.Leaderboard (map[string]int64 участник→очки
// + сортировка по запросу), но на своём ключе и с настоящими протокольными
// тонкостями: ZRANGE/ZRANK у Redis — по ВОЗРАСТАНИЮ очков (не по убыванию,
// как в лидерборде), а отсутствующий участник — это NilBulk, а не сентинел
// -1. На этот раз ничего из SET/GET/DEL/EXPIRE/TTL менять не пришлось —
// ZSET живёт в своей карте, независимо от строковых ключей.
//
// Этап 5 — не новая RESP-команда, а мидлварь: лимит запросов на клиента
// через ratelimiter.TokenBucket, уже реализованный в отдельной главе. В
// отличие от Store (общего на все подключения и потому защищённого
// store.mu), ведро — на СОЕДИНЕНИЕ: создаёт и хранит его
// cmd/miniredis/main.go, поэтому его никогда не делят две горутины и
// обычный TokenBucket, без Safe-обёртки, вполне корректен.
package miniredis

import "github.com/fazletdinov/algorithms-book/exercises/ratelimiter"

// SET key value — сохраняет значение по ключу, отвечает +OK. Ровно 2
// аргумента, иначе — ошибка "wrong number of arguments". Настоящий Redis
// при обычном SET (без опции KEEPTTL, которую мы не реализуем) СБРАСЫВАЕТ
// прежний TTL ключа — свежая запись живёт вечно, пока не попросят иначе.
//
// Пример: SET foo bar -> +OK.
func dispatchSet(store *Store, args []string) Reply {
	// TODO: если len(args) != 2 — Err("ERR wrong number of arguments for
	// 'set' command"). Иначе под store.mu: store.data[key] = value И
	// delete(store.expire, key) (сброс TTL — см. комментарий выше). Верни
	// SimpleString("OK").
	panic("TODO: реализуй SET")
}

// GET key — возвращает значение по ключу или NilBulk, если ключа нет или он
// истёк по TTL. Ровно 1 аргумент, иначе — ошибка "wrong number of
// arguments".
//
// Пример: после SET foo bar -> GET foo -> "bar"; GET missing -> (nil).
func dispatchGet(store *Store, args []string) Reply {
	// TODO: если len(args) != 1 — Err(...). Иначе под store.mu вызови
	// value, ok := store.live(key) (эта функция уже учитывает TTL и лениво
	// удаляет истёкшие ключи — см. store.go); нет — NilBulk(), есть —
	// BulkString(value).
	panic("TODO: реализуй GET")
}

// DEL key [key...] — удаляет один или несколько ключей (и их TTL, если был),
// возвращает Integer — сколько ключей реально было (отсутствовавшие и уже
// истёкшие не считаются). Хотя бы 1 аргумент, иначе — ошибка "wrong number
// of arguments".
//
// Пример: SET a 1; SET b 2; DEL a b c -> :2 (a и b удалены, c не было).
func dispatchDel(store *Store, args []string) Reply {
	// TODO: если len(args) == 0 — Err(...). Иначе под store.mu пройди по
	// args: store.live(key) скажет, жив ли ключ (и попутно вычистит
	// истёкшие); для живых — delete(store.data, key) И
	// delete(store.expire, key), увеличь счётчик. Верни
	// Integer(int64(счётчик)).
	panic("TODO: реализуй DEL")
}

// EXPIRE key seconds — назначает ключу TTL в секундах от текущего момента.
// Возвращает Integer(1), если TTL назначен, Integer(0) — если ключа нет (в
// т.ч. уже истёк). seconds <= 0 — как в настоящем Redis, ключ считается
// истёкшим НЕМЕДЛЕННО (удаляется, ответ всё равно 1 — TTL был "назначен",
// просто в прошлом).
//
// Пример: SET foo bar; EXPIRE foo 100 -> :1; EXPIRE missing 100 -> :0.
func dispatchExpire(store *Store, args []string) Reply {
	// TODO: ровно 2 аргумента (key, seconds); seconds не парсится как целое
	// — Err("ERR value is not an integer or out of range"). Под store.mu:
	// store.live(key) — нет ключа, верни Integer(0). seconds <= 0 —
	// сразу delete(store.data, key) и delete(store.expire, key), верни
	// Integer(1). Иначе store.expire[key] = store.now().Add(time.Duration(seconds) * time.Second),
	// верни Integer(1).
	panic("TODO: реализуй EXPIRE")
}

// TTL key — сколько секунд осталось жить ключу. Integer(-2), если ключа нет
// (в т.ч. истёк); Integer(-1), если ключ есть, но TTL не назначен (живёт
// вечно); иначе — оставшиеся целые секунды, дробная часть отбрасывается
// (так считает эталон и golden-тест; настоящий Redis 7.4.11 округляет до
// ближайшей секунды — замер в главе «Капстоун: мини-Redis», этап 3).
//
// Пример: SET foo bar; TTL foo -> :-1; EXPIRE foo 100; TTL foo -> :100 (или
// чуть меньше — время идёт).
func dispatchTTL(store *Store, args []string) Reply {
	// TODO: ровно 1 аргумент. Под store.mu: store.live(key) — нет ключа,
	// Integer(-2). Есть — глянь store.expire[key] напрямую (live() уже
	// подтвердил, что TTL, если есть, ещё не истёк): нет записи в expire —
	// Integer(-1); есть — время до истечения exp.Sub(store.now()), верни
	// Integer(int64(остаток.Seconds())).
	panic("TODO: реализуй TTL")
}

// ZADD key score member [score member ...] — задаёт очки участнику(ам)
// zset'а на ключе key (создаёт zset, если его ещё не было). Возвращает
// Integer — сколько участников были НОВЫМИ (обновление очков уже
// существующего не считается, ровно как в настоящем Redis). Хотя бы одна
// пара (score, member), иначе — ошибка "wrong number of arguments"; score
// не парсится как целое — "ERR value is not an integer or out of range"
// (упрощение: здесь целые очки, не float, как у настоящего ZADD).
//
// Пример: ZADD board 10 alice 20 bob -> :2 (оба новые).
// ZADD board 15 alice -> :0 (alice уже была, просто обновились очки).
func dispatchZAdd(store *Store, args []string) Reply {
	// TODO: len(args) < 3 или (len(args)-1) нечётно — Err(...). Распарси
	// ВСЕ пары (score, member) заранее (strconv.ParseInt), прежде чем
	// менять store — битый score где-то в середине не должен применить
	// только часть пар. Под store.mu: если store.zsets[key] ещё нет —
	// создай make(map[string]int64) и присвой. Для каждой пары: если
	// участника ещё не было в zset — увеличь счётчик новых; в любом
	// случае запиши zset[member] = score. Верни Integer(int64(счётчик)).
	panic("TODO: реализуй ZADD")
}

// ZSCORE key member — очки участника как строка (BulkString), или NilBulk,
// если ключа/участника нет. Ровно 2 аргумента.
//
// Пример: ZADD board 10 alice; ZSCORE board alice -> "10"; ZSCORE board bob -> (nil).
func dispatchZScore(store *Store, args []string) Reply {
	// TODO: len(args) != 2 — Err(...). Под store.mu: нет store.zsets[key] —
	// NilBulk(). Нет member в zset — NilBulk(). Иначе
	// BulkString(strconv.FormatInt(score, 10)).
	panic("TODO: реализуй ZSCORE")
}

// ZRANGE key start stop — участники в индексном диапазоне [start, stop]
// (включительно), упорядоченные zsetOrdered (по возрастанию очков). Индексы
// как в Python-срезах: отрицательные считаются от конца (-1 — последний),
// выход за границы усекается. Пустой диапазон или ключа нет — пустой Array,
// НЕ nil-массив (так отвечает настоящий Redis). Ровно 3 аргумента, start/
// stop не парсятся как целые — ошибка.
//
// Пример: ZADD board 10 a 20 b 30 c; ZRANGE board 0 -1 -> ["a","b","c"]
// (весь диапазон); ZRANGE board 0 0 -> ["a"] (только минимальный).
func dispatchZRange(store *Store, args []string) Reply {
	// TODO: len(args) != 3 — Err(...). Распарси start/stop
	// (strconv.Atoi). Под store.mu получи members := zsetOrdered(store.zsets[key])
	// (nil-карта — ключа нет, zsetOrdered на nil безопасен, вернёт пустой
	// срез). n := len(members); отрицательный индекс — прибавь n;
	// зажми start в [0, n), stop в [..., n-1]; если после этого
	// start > stop или n == 0 — верни Array(nil) (пустой массив). Иначе
	// оберни members[start:stop+1] в []Reply из BulkString и верни
	// Array(...).
	panic("TODO: реализуй ZRANGE")
}

// ZRANK key member — 0-based позиция участника при сортировке по
// возрастанию очков (0 — самый маленький счёт), или NilBulk, если ключа/
// участника нет (настоящий Redis отвечает именно nil, а не сентинел вроде
// -1 — так и есть корректный протокольный способ сказать «неприменимо»).
// Ровно 2 аргумента.
//
// Пример: ZADD board 10 a 20 b; ZRANK board a -> :0; ZRANK board zzz -> (nil).
func dispatchZRank(store *Store, args []string) Reply {
	// TODO: len(args) != 2 — Err(...). Под store.mu: нет store.zsets[key]
	// или нет member в нём — NilBulk(). Иначе пройди
	// zsetOrdered(store.zsets[key]) и верни Integer(int64(индекс)) для
	// найденной позиции member.
	panic("TODO: реализуй ZRANK")
}

// RateLimitReply — проверка ведра ПЕРЕД вызовом Dispatch (сам Dispatch о
// лимите ничего не знает — это отдельная забота, вызывающий код в
// cmd/miniredis/main.go запускает её первой). nil означает «токен потрачен,
// можно выполнять команду»; иначе — уже готовый ответ об ошибке, который
// нужно отправить клиенту ВМЕСТО вызова Dispatch.
//
// Пример: bucket := ratelimiter.NewTokenBucket(5, 2) — первые 5 вызовов
// подряд (без хода часов) вернут nil, 6-й — ошибку.
func RateLimitReply(bucket *ratelimiter.TokenBucket, nowMs int64) Reply {
	// TODO: bucket.Allow(nowMs) — true, верни nil (команда разрешена);
	// false — верни Err("ERR rate limit exceeded, try again later").
	panic("TODO: реализуй RateLimitReply")
}

// SaveSnapshot сериализует ТЕКУЩЕЕ состояние store (данные, TTL, zset'ы) в
// файл path — команда SAVE (dispatchSave) и автозагрузка при старте сервера
// (cmd/miniredis/main.go) вызывают её/LoadSnapshot напрямую.
//
// Критично: пиши не в path напрямую, а во ВРЕМЕННЫЙ файл рядом с ним,
// затем os.Rename(tmp, path). Rename на одной файловой системе — атомарная
// операция: кто угодно, открывший path на чтение в этот момент, увидит либо
// целиком старый файл, либо целиком новый, никогда — наполовину записанный.
// Прямая запись в path (os.WriteFile/os.Create) сначала обнуляет файл, потом
// заполняет его — упади процесс (или открой файл конкурентный читатель)
// между этими шагами, и снапшот окажется пустым или битым. Это не абстрактная
// осторожность: persistence_test.go проверяет ровно это гонкой, а не
// описанием — TestSnapshotSaveIsAtomic реально гоняет SAVE и чтение файла на
// живых горутинах одновременно и требует НИ ОДНОГО сбоя декодирования.
func SaveSnapshot(store *Store, path string) error {
	// TODO: под store.mu скопируй store.data/store.expire/store.zsets в
	// СОБСТВЕННЫЙ тип с экспортируемыми полями (например, struct{ Data
	// map[string]string; Expire map[string]time.Time; ZSets
	// map[string]map[string]int64 }) — не сериализуй *Store напрямую, у
	// него есть мьютекс и неэкспортированные поля. Сериализуй
	// (encoding/gob: gob.NewEncoder(w).Encode(snapshot) — time.Time уже
	// умеет кодироваться сама) во временный файл РЯДОМ с path
	// (os.CreateTemp(filepath.Dir(path), "*.tmp") — самый простой способ),
	// закрой его, затем os.Rename(tmp, path). Ошибка на любом шаге до
	// Rename — удали временный файл (os.Remove) и верни ошибку, не
	// оставляя мусор на диске.
	panic("TODO: реализуй SaveSnapshot")
}

// LoadSnapshot загружает снапшот из path в store, заменяя его текущее
// содержимое. Файла нет (сервер запускается первый раз, ещё ни разу не
// сохранялись) — это НЕ ошибка: верни nil, ничего не меняя в store.
func LoadSnapshot(store *Store, path string) error {
	// TODO: os.Open(path); errors.Is(err, os.ErrNotExist) — верни nil.
	// Любая другая ошибка открытия — верни её как есть. Раскодируй
	// (gob.NewDecoder(f).Decode(&snapshot)) в тот же тип, что использует
	// SaveSnapshot. Под store.mu ЗАМЕНИТЕ store.data/store.expire/
	// store.zsets раскодированными картами (не мержи со старым
	// содержимым — LoadSnapshot вызывается один раз при старте на пустом
	// Store).
	panic("TODO: реализуй LoadSnapshot")
}

// dispatchSave — команда SAVE: без аргументов сохраняет в файл по умолчанию
// ("dump.rdb", как настоящий Redis), с одним аргументом — по указанному
// пути. Настоящий Redis дополнительно умеет BGSAVE (сохраняет в форкнутом
// дочернем процессе, не блокируя клиентов, пока пишется большой снапшот) —
// здесь его нет: SaveSnapshot синхронная и держит store.mu на всё время
// сохранения, как самый обычный (не BGSAVE) SAVE настоящего Redis.
func dispatchSave(store *Store, args []string) Reply {
	// TODO: len(args) > 1 — Err(...). path := "dump.rdb"; если один
	// аргумент есть — path = args[0]. Вызови SaveSnapshot(store, path);
	// ошибка — верни Err("ERR " + err.Error()); иначе SimpleString("OK").
	panic("TODO: реализуй SAVE")
}
