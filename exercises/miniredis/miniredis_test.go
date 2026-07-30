package miniredis

import (
	"testing"
	"time"

	"github.com/fazletdinov/algorithms-book/exercises/ratelimiter"
)

// newStoreForTest создаёт Store с управляемыми часами вместо time.Now —
// тесты EXPIRE/TTL так не завязаны на реальное время и не спят секундами:
// advance двигает fake-время вперёд между шагами сценария.
func newStoreForTest(start time.Time) (store *Store, advance func(time.Duration)) {
	cur := start
	store = &Store{
		data:   make(map[string]string),
		expire: make(map[string]time.Time),
		now:    func() time.Time { return cur },
	}
	return store, func(d time.Duration) { cur = cur.Add(d) }
}

func TestDispatchPing(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want string // ожидаемый wire-формат ответа
	}{
		{"без аргументов", []string{"PING"}, "+PONG\r\n"},
		{"с одним аргументом — эхо", []string{"PING", "hello"}, "$5\r\nhello\r\n"},
		{"регистр не важен", []string{"ping"}, "+PONG\r\n"},
		{"два аргумента — ошибка", []string{"PING", "a", "b"}, "-ERR wrong number of arguments for 'ping' command\r\n"},
	}
	store := NewStore()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := writeReply(t, Dispatch(store, tt.args))
			if got != tt.want {
				t.Errorf("Dispatch(%v) wire = %q, want %q", tt.args, got, tt.want)
			}
		})
	}
}

func TestDispatchEcho(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want string
	}{
		{"обычная строка", []string{"ECHO", "hello world"}, "$11\r\nhello world\r\n"},
		{"пустая строка", []string{"ECHO", ""}, "$0\r\n\r\n"},
		{"без аргументов — ошибка", []string{"ECHO"}, "-ERR wrong number of arguments for 'echo' command\r\n"},
		{"два аргумента — ошибка", []string{"ECHO", "a", "b"}, "-ERR wrong number of arguments for 'echo' command\r\n"},
	}
	store := NewStore()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := writeReply(t, Dispatch(store, tt.args))
			if got != tt.want {
				t.Errorf("Dispatch(%v) wire = %q, want %q", tt.args, got, tt.want)
			}
		})
	}
}

func TestDispatchUnknownAndEmpty(t *testing.T) {
	store := NewStore()
	if got, want := writeReply(t, Dispatch(store, []string{"FOO", "bar"})), "-ERR unknown command 'FOO'\r\n"; got != want {
		t.Errorf("Dispatch(FOO) wire = %q, want %q", got, want)
	}
	if got, want := writeReply(t, Dispatch(store, nil)), "-ERR empty command\r\n"; got != want {
		t.Errorf("Dispatch(nil) wire = %q, want %q", got, want)
	}
	if got, want := writeReply(t, Dispatch(store, []string{})), "-ERR empty command\r\n"; got != want {
		t.Errorf("Dispatch([]) wire = %q, want %q", got, want)
	}
}

// TestDispatchSetGetDel — ПОСЛЕДОВАТЕЛЬНЫЙ сценарий на одном Store (не
// независимые случаи): GET/DEL зависят от того, что записал предыдущий SET,
// поэтому шаги идут по порядку на общем сторе, как реальная сессия клиента.
func TestDispatchSetGetDel(t *testing.T) {
	store := NewStore()
	steps := []struct {
		name string
		args []string
		want string
	}{
		{"SET foo bar", []string{"SET", "foo", "bar"}, "+OK\r\n"},
		{"GET foo", []string{"GET", "foo"}, "$3\r\nbar\r\n"},
		{"GET несуществующего ключа", []string{"GET", "missing"}, "$-1\r\n"},
		{"SET перезаписывает", []string{"SET", "foo", "baz"}, "+OK\r\n"},
		{"GET после перезаписи", []string{"GET", "foo"}, "$3\r\nbaz\r\n"},
		{"SET второй ключ", []string{"SET", "num", "42"}, "+OK\r\n"},
		{"DEL foo, num и отсутствующий разом", []string{"DEL", "foo", "num", "missing"}, ":2\r\n"},
		{"GET после DEL — снова nil", []string{"GET", "foo"}, "$-1\r\n"},
		{"DEL уже удалённого — 0", []string{"DEL", "foo"}, ":0\r\n"},
	}
	for _, step := range steps {
		t.Run(step.name, func(t *testing.T) {
			got := writeReply(t, Dispatch(store, step.args))
			if got != step.want {
				t.Fatalf("Dispatch(%v) wire = %q, want %q", step.args, got, step.want)
			}
		})
	}
}

func TestDispatchSetGetDelArgErrors(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want string
	}{
		{"SET без аргументов", []string{"SET"}, "-ERR wrong number of arguments for 'set' command\r\n"},
		{"SET один аргумент", []string{"SET", "foo"}, "-ERR wrong number of arguments for 'set' command\r\n"},
		{"SET три аргумента", []string{"SET", "foo", "bar", "extra"}, "-ERR wrong number of arguments for 'set' command\r\n"},
		{"GET без аргументов", []string{"GET"}, "-ERR wrong number of arguments for 'get' command\r\n"},
		{"GET два аргумента", []string{"GET", "a", "b"}, "-ERR wrong number of arguments for 'get' command\r\n"},
		{"DEL без аргументов", []string{"DEL"}, "-ERR wrong number of arguments for 'del' command\r\n"},
	}
	store := NewStore()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := writeReply(t, Dispatch(store, tt.args))
			if got != tt.want {
				t.Errorf("Dispatch(%v) wire = %q, want %q", tt.args, got, tt.want)
			}
		})
	}
}

// TestDispatchExpireAndTTL — сценарий на управляемых часах: назначили TTL,
// подождали (fake-время, без time.Sleep), проверили, что TTL считается
// правильно, а по истечении GET/TTL честно говорят, что ключа больше нет.
func TestDispatchExpireAndTTL(t *testing.T) {
	store, advance := newStoreForTest(time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC))

	steps := []struct {
		name string
		args []string
		want string
	}{
		{"SET foo bar", []string{"SET", "foo", "bar"}, "+OK\r\n"},
		{"TTL без EXPIRE — вечный (-1)", []string{"TTL", "foo"}, ":-1\r\n"},
		{"EXPIRE foo 100 -> 1", []string{"EXPIRE", "foo", "100"}, ":1\r\n"},
		{"TTL сразу после EXPIRE — все 100", []string{"TTL", "foo"}, ":100\r\n"},
	}
	for _, step := range steps {
		t.Run(step.name, func(t *testing.T) {
			if got := writeReply(t, Dispatch(store, step.args)); got != step.want {
				t.Fatalf("Dispatch(%v) wire = %q, want %q", step.args, got, step.want)
			}
		})
	}

	advance(50 * time.Second)
	if got, want := writeReply(t, Dispatch(store, []string{"TTL", "foo"})), ":50\r\n"; got != want {
		t.Fatalf("TTL foo после +50с = %q, want %q", got, want)
	}

	advance(51 * time.Second) // итого 101с > 100с — истёк
	if got, want := writeReply(t, Dispatch(store, []string{"TTL", "foo"})), ":-2\r\n"; got != want {
		t.Fatalf("TTL foo после истечения = %q, want %q", got, want)
	}
	if got, want := writeReply(t, Dispatch(store, []string{"GET", "foo"})), "$-1\r\n"; got != want {
		t.Fatalf("GET foo после истечения = %q, want %q (ленивое удаление по TTL)", got, want)
	}

	if got, want := writeReply(t, Dispatch(store, []string{"EXPIRE", "missing", "10"})), ":0\r\n"; got != want {
		t.Fatalf("EXPIRE missing = %q, want %q", got, want)
	}
	if got, want := writeReply(t, Dispatch(store, []string{"TTL", "missing"})), ":-2\r\n"; got != want {
		t.Fatalf("TTL missing = %q, want %q", got, want)
	}
}

// TestDispatchSetClearsTTL — SET без опций (KEEPTTL не реализован) обязан
// сбросить прежний TTL: это тонкость, которую легко упустить, если просто
// перезаписать store.data и забыть про store.expire.
func TestDispatchSetClearsTTL(t *testing.T) {
	store, _ := newStoreForTest(time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC))

	writeReply(t, Dispatch(store, []string{"SET", "foo", "bar"}))
	writeReply(t, Dispatch(store, []string{"EXPIRE", "foo", "100"}))
	if got, want := writeReply(t, Dispatch(store, []string{"TTL", "foo"})), ":100\r\n"; got != want {
		t.Fatalf("TTL до перезаписи = %q, want %q", got, want)
	}

	writeReply(t, Dispatch(store, []string{"SET", "foo", "baz"})) // должен сбросить TTL
	if got, want := writeReply(t, Dispatch(store, []string{"TTL", "foo"})), ":-1\r\n"; got != want {
		t.Fatalf("TTL после перезаписи SET = %q, want %q (TTL должен был сброситься)", got, want)
	}
}

// TestDispatchExpireNonPositiveSeconds — EXPIRE с seconds <= 0 удаляет ключ
// немедленно (как настоящий Redis), не дожидаясь хода часов.
func TestDispatchExpireNonPositiveSeconds(t *testing.T) {
	store := NewStore()
	writeReply(t, Dispatch(store, []string{"SET", "foo", "bar"}))

	if got, want := writeReply(t, Dispatch(store, []string{"EXPIRE", "foo", "0"})), ":1\r\n"; got != want {
		t.Fatalf("EXPIRE foo 0 = %q, want %q", got, want)
	}
	if got, want := writeReply(t, Dispatch(store, []string{"GET", "foo"})), "$-1\r\n"; got != want {
		t.Fatalf("GET foo после EXPIRE 0 = %q, want %q (должен исчезнуть сразу)", got, want)
	}
}

func TestDispatchExpireTTLArgErrors(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want string
	}{
		{"EXPIRE без аргументов", []string{"EXPIRE"}, "-ERR wrong number of arguments for 'expire' command\r\n"},
		{"EXPIRE один аргумент", []string{"EXPIRE", "foo"}, "-ERR wrong number of arguments for 'expire' command\r\n"},
		{"EXPIRE seconds не число", []string{"EXPIRE", "foo", "soon"}, "-ERR value is not an integer or out of range\r\n"},
		{"TTL без аргументов", []string{"TTL"}, "-ERR wrong number of arguments for 'ttl' command\r\n"},
		{"TTL два аргумента", []string{"TTL", "a", "b"}, "-ERR wrong number of arguments for 'ttl' command\r\n"},
	}
	store := NewStore()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := writeReply(t, Dispatch(store, tt.args))
			if got != tt.want {
				t.Errorf("Dispatch(%v) wire = %q, want %q", tt.args, got, tt.want)
			}
		})
	}
}

// TestDispatchZAddZScoreZRankZRange — последовательный сценарий: наполняем
// zset, проверяем ранги/очки/диапазоны, затем меняем очки участнику так,
// чтобы порядок реально перетасовался, и проверяем это тоже.
func TestDispatchZAddZScoreZRankZRange(t *testing.T) {
	store := NewStore()

	steps := []struct {
		name string
		args []string
		want string
	}{
		{"ZADD 3 новых участника", []string{"ZADD", "board", "10", "alice", "20", "bob", "30", "carol"}, ":3\r\n"},
		{"ZADD обновление очков — 0 новых", []string{"ZADD", "board", "15", "alice"}, ":0\r\n"},
		{"ZSCORE после обновления", []string{"ZSCORE", "board", "alice"}, "$2\r\n15\r\n"},
		{"ZSCORE отсутствующего", []string{"ZSCORE", "board", "dave"}, "$-1\r\n"},
		{"ZSCORE отсутствующего ключа", []string{"ZSCORE", "missing", "alice"}, "$-1\r\n"},
		// порядок пока прежний: alice(15) < bob(20) < carol(30)
		{"ZRANK alice", []string{"ZRANK", "board", "alice"}, ":0\r\n"},
		{"ZRANK bob", []string{"ZRANK", "board", "bob"}, ":1\r\n"},
		{"ZRANK carol", []string{"ZRANK", "board", "carol"}, ":2\r\n"},
		{"ZRANK отсутствующего — nil, не -1", []string{"ZRANK", "board", "dave"}, "$-1\r\n"},
		{"ZRANK отсутствующего ключа", []string{"ZRANK", "missing", "alice"}, "$-1\r\n"},
		{"ZRANGE весь диапазон (0 -1)", []string{"ZRANGE", "board", "0", "-1"}, "*3\r\n$5\r\nalice\r\n$3\r\nbob\r\n$5\r\ncarol\r\n"},
		{"ZRANGE только первый", []string{"ZRANGE", "board", "0", "0"}, "*1\r\n$5\r\nalice\r\n"},
		{"ZRANGE последние два (отрицательные индексы)", []string{"ZRANGE", "board", "-2", "-1"}, "*2\r\n$3\r\nbob\r\n$5\r\ncarol\r\n"},
		{"ZRANGE за пределами — пустой массив", []string{"ZRANGE", "board", "5", "10"}, "*0\r\n"},
		{"ZRANGE несуществующего ключа — пустой массив", []string{"ZRANGE", "missing", "0", "-1"}, "*0\r\n"},
		// теперь двигаем alice выше bob — порядок обязан перетасоваться
		{"ZADD alice перепрыгивает bob", []string{"ZADD", "board", "25", "alice"}, ":0\r\n"},
		{"ZRANK bob после перестановки", []string{"ZRANK", "board", "bob"}, ":0\r\n"},
		{"ZRANK alice после перестановки", []string{"ZRANK", "board", "alice"}, ":1\r\n"},
		{"ZRANGE отражает новый порядок", []string{"ZRANGE", "board", "0", "-1"}, "*3\r\n$3\r\nbob\r\n$5\r\nalice\r\n$5\r\ncarol\r\n"},
	}
	for _, step := range steps {
		t.Run(step.name, func(t *testing.T) {
			if got := writeReply(t, Dispatch(store, step.args)); got != step.want {
				t.Fatalf("Dispatch(%v) wire = %q, want %q", step.args, got, step.want)
			}
		})
	}
}

// TestDispatchZAddTieBreak — при равных очках порядок лексикографический по
// имени участника (соглашение настоящего Redis для sorted set).
func TestDispatchZAddTieBreak(t *testing.T) {
	store := NewStore()
	writeReply(t, Dispatch(store, []string{"ZADD", "ties", "5", "zebra", "5", "apple"}))

	if got, want := writeReply(t, Dispatch(store, []string{"ZRANGE", "ties", "0", "-1"})), "*2\r\n$5\r\napple\r\n$5\r\nzebra\r\n"; got != want {
		t.Fatalf("ZRANGE ties = %q, want %q", got, want)
	}
	if got, want := writeReply(t, Dispatch(store, []string{"ZRANK", "ties", "apple"})), ":0\r\n"; got != want {
		t.Fatalf("ZRANK apple = %q, want %q", got, want)
	}
	if got, want := writeReply(t, Dispatch(store, []string{"ZRANK", "ties", "zebra"})), ":1\r\n"; got != want {
		t.Fatalf("ZRANK zebra = %q, want %q", got, want)
	}
}

// TestRateLimitReply — ведро на 3 токена без пополнения (nowMs не двигаем):
// первые 3 вызова разрешены, 4-й отклонён с конкретным wire-текстом ошибки,
// затем ход часов на секунду вперёд пополняет ведро и 5-й снова проходит.
func TestRateLimitReply(t *testing.T) {
	bucket := ratelimiter.NewTokenBucket(3, 1)
	now := int64(1000)

	for i := 0; i < 3; i++ {
		if reply := RateLimitReply(bucket, now); reply != nil {
			t.Fatalf("вызов %d: ожидался nil (разрешено), получили wire %q", i, writeReply(t, reply))
		}
	}

	reply := RateLimitReply(bucket, now)
	if reply == nil {
		t.Fatal("4-й вызов подряд без пополнения должен быть отклонён")
	}
	if got, want := writeReply(t, reply), "-ERR rate limit exceeded, try again later\r\n"; got != want {
		t.Fatalf("wire = %q, want %q", got, want)
	}

	if reply := RateLimitReply(bucket, now+1000); reply != nil {
		t.Fatalf("после пополнения (+1с) ожидался nil, получили wire %q", writeReply(t, reply))
	}
}

func TestDispatchZCommandsArgErrors(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want string
	}{
		{"ZADD без пар", []string{"ZADD", "board"}, "-ERR wrong number of arguments for 'zadd' command\r\n"},
		{"ZADD нечётное число аргументов", []string{"ZADD", "board", "10", "alice", "20"}, "-ERR wrong number of arguments for 'zadd' command\r\n"},
		{"ZADD score не число", []string{"ZADD", "board", "ten", "alice"}, "-ERR value is not an integer or out of range\r\n"},
		{"ZSCORE без аргументов", []string{"ZSCORE", "board"}, "-ERR wrong number of arguments for 'zscore' command\r\n"},
		{"ZRANGE два аргумента", []string{"ZRANGE", "board", "0"}, "-ERR wrong number of arguments for 'zrange' command\r\n"},
		{"ZRANGE start не число", []string{"ZRANGE", "board", "a", "1"}, "-ERR value is not an integer or out of range\r\n"},
		{"ZRANK один аргумент", []string{"ZRANK", "board"}, "-ERR wrong number of arguments for 'zrank' command\r\n"},
	}
	store := NewStore()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := writeReply(t, Dispatch(store, tt.args))
			if got != tt.want {
				t.Errorf("Dispatch(%v) wire = %q, want %q", tt.args, got, tt.want)
			}
		})
	}
}
