# 🗄️ Капстоун: мини-Redis на настоящем RESP-протоколе

> 🧭 **Зачем эта глава.** Все предыдущие главы — независимые острова: реши задачу, пройди
> тесты, переходи к следующей. Здесь — наоборот: один сквозной проект, который растёт от
> главы к главе и в конце умеет разговаривать с настоящим `redis-cli`, как настоящий Redis.
> В [«Карте: структуры данных в реальных системах»](real-world-map.md) ты уже разбирал, из
> чего сделан Redis — skip list, инкрементальный rehashing, HyperLogLog. Здесь ты не читаешь
> про это, а строишь сам: те же боевые техники, что ты уже реализовал в `cache` (TTL-вытеснение),
> `leaderboard` (sorted set) и `ratelimiter` (token bucket), становятся обработчиками настоящих
> команд `GET`/`SET`/`ZADD`/... за настоящим TCP-сокетом.

## Маршрут

Проект растёт по этапам — каждый добавляет команды и реально запускается уже на этом шаге,
не дожидаясь конца главы:

1. **Протокол + `PING`/`ECHO`** (этот этап) — сервер уже отвечает по-настоящему.
2. `GET`/`SET`/`DEL` — строковое хранилище (та же идея, что `hashtable`, но ключ — `string`).
3. `EXPIRE`/`TTL` — вытеснение по времени, как в `cache`.
4. `ZADD`/`ZSCORE`/`ZRANGE`/`ZRANK` — sorted set, как в `leaderboard`.
5. Лимит запросов на клиента — `ratelimiter.TokenBucket` мидлварью перед диспетчером.
6. (опционально) конкурентная безопасность на нескольких клиентах сразу — мьютекс, `-race`.

## Этап 1 (пройден): протокол дан готовым

Сетевой слой и разбор [RESP-протокола](https://redis.io/docs/latest/develop/reference/protocol-spec/)
(того самого, которым говорит настоящий `redis-server`) — это протокольная возня, а не
алгоритмическая задача книги, поэтому он **дан готовым**: `exercises/miniredis/resp.go`
(разбор запроса, сборка ответа) и `exercises/cmd/miniredis/main.go` (TCP-сервер). Открывать их
не обязательно — они уже работают.

### Запусти сервер

```bash
cd exercises
go run ./cmd/miniredis        # слушает localhost:6380, Ctrl+C — остановить
```

### Подключись настоящим клиентом

Если есть `redis-cli` ([установка](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/)):

```bash
redis-cli -p 6380 PING          # PONG
redis-cli -p 6380 PING hello    # "hello"
redis-cli -p 6380 ECHO world    # "world"
redis-cli -p 6380 FOO           # (error) ERR unknown command 'FOO'
```

Нет `redis-cli` под рукой — тот же протокол понимает `nc`:

```bash
printf 'PING\r\n' | nc localhost 6380
```

Оба способа говорят с сервером **одним и тем же RESP-протоколом** — `redis-cli` просто умеет
собирать более сложные фреймы (массивы bulk-строк), а `nc` с голым текстом полагается на
inline-формат, который `resp.go` тоже понимает (см. `ReadCommand`).

> 💡 Если `redis-cli` выведет предупреждение про `HELLO`/RESP3 при подключении — это нормально:
> современный `redis-cli` сначала пробует более новую версию протокола, не получает ответа и
> откатывается на RESP2, которым здесь и говорит сервер.

## Этап 2 (пройден): `SET`/`GET`/`DEL`

Теперь `exercises/miniredis/miniredis.go` — заготовка с тремя `panic("TODO")`:
`dispatchSet`, `dispatchGet`, `dispatchDel`. Всё остальное по-прежнему дано готовым:

- `resp.go` — кодек протокола (не трогать);
- `dispatch.go` — маршрутизация команд и `PING`/`ECHO` (не трогать);
- `store.go` — тип `Store` (map ключ→значение под мьютексом) и `NewStore()` (не трогать).

**Почему в `Store` уже есть мьютекс, хотя про конкурентность речь только на этапе 6.**
`cmd/miniredis/main.go` обслуживает каждое TCP-соединение в своей горутине — `Store` один на
все соединения. Открой два терминала с `redis-cli -p 6380` одновременно — оба будут писать в
одну и ту же карту. Без синхронизации это не «плохой стиль», а гонка данных вплоть до фатальной
паники рантайма («concurrent map writes»); `store.mu` защищает от этого с первого дня, а не
только когда до конкурентности дойдёт явный разговор на этапе 6.

### Что нужно сделать

```go
func dispatchSet(store *Store, args []string) Reply {
	// ровно 2 аргумента: ключ, значение. Не так — Err("ERR wrong number of
	// arguments for 'set' command"). Иначе под store.mu запишите
	// store.data[key] = value и верните SimpleString("OK").
}

func dispatchGet(store *Store, args []string) Reply {
	// ровно 1 аргумент: ключ. Под store.mu прочитайте store.data[key]; нет
	// ключа — NilBulk(), есть — BulkString(value).
}

func dispatchDel(store *Store, args []string) Reply {
	// один или несколько ключей. Под store.mu удалите каждый существующий,
	// верните Integer — сколько реально было удалено.
}
```

Полные подсказки — прямо в комментариях над `panic("TODO")` в `miniredis.go`.

### Проверь

```bash
go test ./miniredis/                 # ваши решения (пока красные на SET/GET/DEL)
go test -tags solution ./miniredis/  # эталон (зелёные)
```

А когда тесты позеленеют — снова `go run ./cmd/miniredis` и вживую:

```bash
redis-cli -p 6380 SET foo bar    # OK
redis-cli -p 6380 GET foo        # "bar"
redis-cli -p 6380 GET missing    # (nil)
redis-cli -p 6380 DEL foo        # (integer) 1
```

## Этап 3 (пройден): `EXPIRE`/`TTL` — TTL заставляет вернуться в уже написанный код

Настоящая система так и живёт: сквозная забота (здесь — TTL) редко умещается в новый файл,
обычно приходится вернуться в то, что уже работает. `dispatchSet`/`dispatchGet`/`dispatchDel`
из этапа 2 придётся слегка поправить — это нормально, не «ты плохо спроектировал». Заготовка
`miniredis.go` уже обновлена под этап 3: у всех пяти функций (три старых + `dispatchExpire`,
`dispatchTTL`) снова `panic("TODO")` с подсказками в комментариях.

**Что появилось в `store.go` (дано, не трогать):**

```go
type Store struct {
	mu     sync.Mutex
	data   map[string]string
	expire map[string]time.Time // отсутствие ключа = TTL не задан
	now    func() time.Time     // в проде time.Now, в тестах — управляемые часы
}

func (s *Store) live(key string) (value string, ok bool)
```

`live` — единая точка правды «жив ли ключ»: смотрит и в `data`, и в `expire`, и если TTL истёк —
лениво удаляет ключ из обеих карт (ровно так ведёт себя настоящий Redis: не подметает по
таймеру, а проверяет при обращении). Вызывать только под `store.mu`.

**Почему у `Store` появились «часы» (`now func() time.Time`), а не просто `time.Now()` внутри
`dispatchExpire`/`dispatchTTL`.** Протокол `EXPIRE`/`TTL` не принимает текущее время от
клиента — это было бы нечестно, настоящий `redis-cli` такое не пришлёт. Значит, параметром
функции время не пробросить, как это делает `cache.TTLCache.Get(key, nowMs)`. Вместо этого
часы внедряются на уровень `Store` — стандартный приём для тестируемого кода, зависящего от
времени, без `time.Sleep` в тестах (см. `newStoreForTest` в `miniredis_test.go`, если любопытно,
как выглядят тесты на управляемых часах).

### Что нужно сделать

```go
func dispatchSet(store *Store, args []string) Reply {
	// как на этапе 2, но ПОСЛЕ записи store.data[key] = value — ещё и
	// delete(store.expire, key): обычный SET сбрасывает прежний TTL.
}

func dispatchGet(store *Store, args []string) Reply {
	// вместо прямого store.data[key] — value, ok := store.live(key): она
	// уже учитывает TTL и лениво чистит истёкшее.
}

func dispatchDel(store *Store, args []string) Reply {
	// как на этапе 2 (через store.live для проверки), но удаляйте ключ ещё
	// и из store.expire, не только из store.data.
}

func dispatchExpire(store *Store, args []string) Reply {
	// EXPIRE key seconds: ключа нет — Integer(0); seconds <= 0 — удалить
	// немедленно, Integer(1); иначе store.expire[key] = store.now().Add(...),
	// Integer(1).
}

func dispatchTTL(store *Store, args []string) Reply {
	// TTL key: ключа нет — Integer(-2); есть, но TTL не задан — Integer(-1);
	// иначе — оставшиеся целые секунды.
}
```

Полные подсказки — в комментариях над каждым `panic("TODO")` в `miniredis.go`.

### Проверь

```bash
go test ./miniredis/                 # ваши решения (снова красные — теперь на 5 функциях)
go test -tags solution ./miniredis/  # эталон (зелёные)
```

Вживую (`go run ./cmd/miniredis`, отдельным терминалом):

```bash
redis-cli -p 6380 SET foo bar
redis-cli -p 6380 EXPIRE foo 100   # (integer) 1
redis-cli -p 6380 TTL foo          # (integer) 100 (или чуть меньше)
redis-cli -p 6380 EXPIRE foo 1     # (integer) 1
sleep 2
redis-cli -p 6380 GET foo          # (nil) — истёк
redis-cli -p 6380 TTL foo          # (integer) -2
redis-cli -p 6380 TTL missing      # (integer) -2
redis-cli -p 6380 SET nottl x
redis-cli -p 6380 TTL nottl        # (integer) -1 — жив, но без TTL
```

## Этап 4: `ZADD`/`ZSCORE`/`ZRANGE`/`ZRANK` — sorted set по образцу `leaderboard`

Та же идея, что в `leaderboard.Leaderboard` (`map[string]int64` участник → очки, порядок
считаем при запросе, а не поддерживаем структурой на лету — «учебная реализация семантики»,
как честно сказано в комментарии над `Leaderboard`; настоящий Redis держит skip list ради
`O(log n)`, здесь `O(n log n)` на запрос — сознательный трейд-офф в пользу простоты, тот же,
что уже был в `leaderboard`). Но два отличия, ради подлинности протокола:

1. **Порядок.** `leaderboard.Rank`/`TopN` сортируют ПО УБЫВАНИЮ — это естественно для таблицы
   лидеров («1-е место — больше всех очков»). Настоящие `ZRANGE`/`ZRANK` в Redis — ПО
   ВОЗРАСТАНИЮ (rank 0 — наименьший счёт). Здесь используем возрастание, чтобы `redis-cli`
   вело себя ровно как в документации Redis, а не как удобно нам.
2. **Отсутствующий участник.** `leaderboard.Rank` возвращает сентинел `-1`, если участника
   нет — рабочий приём для Go-функции с одним возвращаемым `int`. В RESP так поступать не
   нужно: протокол умеет честно сказать «нет ответа» через `NilBulk` (`$-1\r\n`), и настоящий
   Redis отвечает именно так. Сентинел здесь был бы код-смеллом: у типа `Reply` уже есть
   правильный способ выразить отсутствие.

**Хорошая новость: `dispatchSet`/`dispatchGet`/`dispatchDel`/`dispatchExpire`/`dispatchTTL`
трогать не придётся.** В отличие от TTL на этапе 3, ZSET живёт в своей карте
(`store.zsets`), независимо от строковых ключей в `store.data` — не любая новая забота
требует ревизии старого кода, иногда действительно можно просто дописать.

**Что появилось в `store.go` (дано, не трогать):**

```go
type Store struct {
	// ...
	zsets map[string]map[string]int64 // ключ -> участник -> очки
}

func zsetOrdered(zset map[string]int64) []string // по возрастанию очков, тай-брейк по имени
```

> ⚠️ Упрощение: очки здесь целые (`int64`), не `float64`, как у настоящего `ZADD`, и TTL на
> zset-ключи не распространяется — `EXPIRE`/`TTL` работают только со строками. Настоящий Redis
> ещё возвращает `WRONGTYPE`, если, скажем, `ZADD` целится в ключ, уже занятый строкой через
> `SET` — этого тоже нет, задача помечена явно, если захочешь добавить сам.

### Что нужно сделать

```go
func dispatchZAdd(store *Store, args []string) Reply {
	// ZADD key score member [score member ...]. Разберите ВСЕ пары заранее,
	// прежде чем менять store. Верните Integer — сколько участников были
	// НОВЫМИ (обновление очков существующего не считается).
}

func dispatchZScore(store *Store, args []string) Reply {
	// ZSCORE key member. Нет ключа/участника — NilBulk(). Есть —
	// BulkString(strconv.FormatInt(score, 10)).
}

func dispatchZRange(store *Store, args []string) Reply {
	// ZRANGE key start stop. zsetOrdered + Python-style индексы
	// (отрицательные — от конца, выход за границы усекается). Пустой
	// диапазон — Array(nil), НЕ NilBulk (это разные виды «пусто» в RESP).
}

func dispatchZRank(store *Store, args []string) Reply {
	// ZRANK key member. Нет ключа/участника — NilBulk(). Есть — позиция в
	// zsetOrdered.
}
```

Полные подсказки — в комментариях над каждым `panic("TODO")` в `miniredis.go`.

### Проверь

```bash
go test ./miniredis/                 # ваши решения (SET/GET/DEL/EXPIRE/TTL уже зелёные)
go test -tags solution ./miniredis/  # эталон
```

Вживую:

```bash
redis-cli -p 6380 ZADD board 10 alice 20 bob 30 carol   # (integer) 3
redis-cli -p 6380 ZSCORE board alice                     # "10"
redis-cli -p 6380 ZRANK board alice                      # (integer) 0 — самый маленький счёт
redis-cli -p 6380 ZRANK board nobody                      # (nil)
redis-cli -p 6380 ZRANGE board 0 -1                       # 1) "alice" 2) "bob" 3) "carol"
redis-cli -p 6380 ZADD board 25 alice                      # (integer) 0 — уже была, просто обновили
redis-cli -p 6380 ZRANGE board 0 -1                       # порядок сам перестроился
```

## 🧩 Задачи

- Реализуй `dispatchZAdd`/`dispatchZScore`/`dispatchZRange`/`dispatchZRank` в `miniredis.go`,
  добейся зелёных `go test ./miniredis/`.
- Проверь вживую через `redis-cli`, что после `ZADD` с изменением очков порядок в `ZRANGE`
  действительно перестраивается, а не остаётся прежним.
- Убедись, что `ZRANK`/`ZSCORE` на несуществующем участнике отвечают `(nil)`, а не число — так
  и должно быть в настоящем RESP.

## 🔗 Связанные темы

- **[Карта: структуры данных в реальных системах](real-world-map.md)** — раздел 2 разбирает,
  из чего устроен настоящий Redis; здесь ты строишь упрощённую версию тех же идей.
- **[Комбинации паттернов](pattern-combinations.md)** — там же собраны `cache`/`leaderboard` и
  другие флагманы, чья логика переедет сюда на следующих этапах.
