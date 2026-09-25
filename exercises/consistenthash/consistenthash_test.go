package consistenthash

import (
	"math"
	"slices"
	"strconv"
	"testing"
)

func testKeys(n int) []string {
	keys := make([]string, n)
	for i := range keys {
		keys[i] = "user:" + strconv.Itoa(i)
	}
	return keys
}

func nodeNames(n int) []string {
	names := make([]string, n)
	for i := range names {
		names[i] = "cache-" + strconv.Itoa(i+1)
	}
	return names
}

func ringWith(replicas int, nodes ...string) *Ring {
	r := NewRing(replicas)
	r.Add(nodes...)
	return r
}

func TestRingEmpty(t *testing.T) {
	if got := NewRing(10).Get("user:1"); got != "" {
		t.Errorf("Get на пустом кольце = %q, ожидалась пустая строка", got)
	}
}

func TestRingSingleNode(t *testing.T) {
	r := ringWith(10, "only")
	for _, k := range testKeys(200) {
		if got := r.Get(k); got != "only" {
			t.Fatalf("Get(%q) = %q, ожидался единственный узел «only»", k, got)
		}
	}
}

// Раскладка не должна зависеть от порядка добавления узлов: иначе два сервиса,
// поднявшие кольцо из одного конфига в разном порядке, отправят ключ в разные узлы.
func TestRingOrderIndependent(t *testing.T) {
	a := ringWith(50, "a", "b", "c", "d")
	b := ringWith(50, "d", "b")
	b.Add("c", "a")
	for _, k := range testKeys(2000) {
		if a.Get(k) != b.Get(k) {
			t.Fatalf("ключ %q: %q против %q — раскладка зависит от порядка Add", k, a.Get(k), b.Get(k))
		}
	}
}

// Повторный Add не должен менять раскладку — например, заводить точки с новыми
// номерами реплик, продолжая счёт с уже существующих.
func TestRingAddExistingIsNoop(t *testing.T) {
	a := ringWith(20, "a", "b", "c")
	b := ringWith(20, "a", "b", "c")
	b.Add("b", "b")
	for _, k := range testKeys(1000) {
		if a.Get(k) != b.Get(k) {
			t.Fatalf("повторный Add изменил раскладку для %q", k)
		}
	}
}

func TestRingRemoveUnknownIsNoop(t *testing.T) {
	a := ringWith(20, "a", "b")
	b := ringWith(20, "a", "b")
	b.Remove("zzz")
	for _, k := range testKeys(1000) {
		if a.Get(k) != b.Get(k) {
			t.Fatalf("Remove неизвестного узла изменил раскладку для %q", k)
		}
	}
}

// Главное свойство консистентного хеширования: при добавлении узла ключи
// переезжают ТОЛЬКО на него. Ни один ключ не прыгает между старыми узлами.
func TestRingAddMovesOnlyToNewNode(t *testing.T) {
	before := ringWith(100, nodeNames(10)...)
	after := ringWith(100, nodeNames(10)...)
	after.Add("cache-new")
	for _, k := range testKeys(20000) {
		if b, a := before.Get(k), after.Get(k); b != a && a != "cache-new" {
			t.Fatalf("ключ %q переехал %q → %q, а не на новый узел", k, b, a)
		}
	}
}

// Зеркальное свойство: при удалении узла переезжают ТОЛЬКО его ключи.
func TestRingRemoveMovesOnlyFromRemoved(t *testing.T) {
	before := ringWith(100, nodeNames(10)...)
	after := ringWith(100, nodeNames(10)...)
	after.Remove("cache-5")
	for _, k := range testKeys(20000) {
		b, a := before.Get(k), after.Get(k)
		if a == "cache-5" {
			t.Fatalf("ключ %q остался на удалённом узле", k)
		}
		if b != a && b != "cache-5" {
			t.Fatalf("ключ %q переехал %q → %q, хотя его узел не удаляли", k, b, a)
		}
	}
}

// Контракт размещения: владелец — первая точка с хешем >= хеша ключа, с
// переходом через ноль, а при равных хешах — узел с меньшим именем. Сверяется
// с прямым перебором точек на кольце из шести точек.
func TestRingPlacementContract(t *testing.T) {
	r := ringWith(3, "a", "b")
	type pt struct {
		h    uint32
		node string
	}
	var pts []pt
	for _, n := range []string{"a", "b"} {
		for i := range 3 {
			pts = append(pts, pt{HashKey(n + "#" + strconv.Itoa(i)), n})
		}
	}
	slices.SortFunc(pts, func(x, y pt) int {
		if x.h != y.h {
			if x.h < y.h {
				return -1
			}
			return 1
		}
		if x.node < y.node {
			return -1
		}
		return 1
	})
	owner := func(h uint32) string {
		for _, p := range pts {
			if p.h >= h {
				return p.node
			}
		}
		return pts[0].node
	}
	// Имена самих точек — ключи, чей хеш РАВЕН хешу точки: только на них видно
	// разницу между «>=» из контракта и «>» (на случайных ключах её нет никогда).
	keys := testKeys(5000)
	for _, n := range []string{"a", "b"} {
		for i := range 3 {
			keys = append(keys, n+"#"+strconv.Itoa(i))
		}
	}
	for _, k := range keys {
		if got, want := r.Get(k), owner(HashKey(k)); got != want {
			t.Fatalf("Get(%q) = %q, по контракту кольца ожидался %q", k, got, want)
		}
	}
}

// Правило ничьей: при равных хешах точек владельцем считается узел с меньшим
// именем. Ничья случается только при коллизии 32-битного хеша, поэтому пара
// подобрана заранее перебором (парадокс дней рождения): нулевые точки узлов
// n512789 и n749192 обе хешируются в 0x5c71ba6. На кольце с одной репликой
// других точек нет, и ЛЮБОЙ ключ обязан уйти к n512789 — в любом порядке Add.
func TestRingTieBreak(t *testing.T) {
	if HashKey("n512789#0") != HashKey("n749192#0") {
		t.Fatal("подобранная коллизия больше не коллизия — HashKey изменился, подбери пару заново")
	}
	for _, order := range [][]string{{"n512789", "n749192"}, {"n749192", "n512789"}} {
		r := ringWith(1, order...)
		for _, k := range testKeys(500) {
			if got := r.Get(k); got != "n512789" {
				t.Fatalf("порядок Add %v: Get(%q) = %q, при ничьей ожидался узел с меньшим именем n512789", order, k, got)
			}
		}
	}
}

func TestMovedFraction(t *testing.T) {
	same := func(k string) string { return "x" }
	other := func(k string) string { return "y" }
	oneMoved := func(k string) string {
		if k == "k4" {
			return "y"
		}
		return "x"
	}
	tests := []struct {
		name          string
		keys          []string
		before, after func(string) string
		want          float64
	}{
		{"ничего не переехало", []string{"k1", "k2"}, same, same, 0},
		{"переехало всё", []string{"k1", "k2"}, same, other, 1},
		{"переехал один из четырёх", []string{"k1", "k2", "k3", "k4"}, same, oneMoved, 0.25},
		{"пустой список ключей", nil, same, other, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MovedFraction(tt.keys, tt.before, tt.after); math.Abs(got-tt.want) > 1e-12 {
				t.Errorf("MovedFraction = %v, ожидалось %v", got, tt.want)
			}
		})
	}
}

func TestJumpHash(t *testing.T) {
	tests := []struct {
		name    string
		key     uint64
		buckets int
		want    int
	}{
		{"нет корзин", 42, 0, -1},
		{"отрицательное число корзин", 42, -3, -1},
		{"одна корзина — всегда 0", 42, 1, 0},
		{"одна корзина, другой ключ", 1 << 60, 1, 0},
		// Ключ 0 выводится вручную: первый же шаг даёт key = 1, (1 >> 33) = 0,
		// j = 1 · 2^31 — за любой границей до 2^31 корзин, ответ остаётся 0.
		{"ключ 0 — всегда корзина 0", 0, 1000, 0},
		// Регрессионные значения: сняты с эталона, который построчно повторяет
		// код из статьи. Корректность проверяют тесты свойств ниже, эти — только
		// ловят случайную правку формулы (порядок операций, сдвиг, константу).
		{"регрессия: ключ 1", 1, 10, 6},
		{"регрессия: ключ 0xDEADBEEF", 0xDEADBEEF, 128, 87},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := JumpHash(tt.key, tt.buckets); got != tt.want {
				t.Errorf("JumpHash(%d, %d) = %d, ожидалось %d", tt.key, tt.buckets, got, tt.want)
			}
		})
	}
}

// Свойство jump hash: при переходе n → n+1 корзин ключ либо остаётся, либо
// переезжает ровно в новую корзину n.
func TestJumpHashMonotone(t *testing.T) {
	for _, k := range testKeys(3000) {
		key := HashKey64(k)
		prev := JumpHash(key, 1)
		for n := 2; n <= 64; n++ {
			cur := JumpHash(key, n)
			if cur < 0 || cur >= n {
				t.Fatalf("JumpHash(%q, %d) = %d вне диапазона", k, n, cur)
			}
			if cur != prev && cur != n-1 {
				t.Fatalf("ключ %q при %d → %d корзинах переехал %d → %d, а не в новую корзину %d", k, n-1, n, prev, cur, n-1)
			}
			prev = cur
		}
	}
}

// TestShardingExperiment — таблицы главы, воспроизводимые одной командой:
//
//	go test -tags solution -run ShardingExperiment -v ./consistenthash/
//
// Хеши детерминированы, поэтому у читателя выйдут те же числа. Проверки ниже —
// выводы главы с запасом, откалиброванным по этим числам.
func TestShardingExperiment(t *testing.T) {
	keys := testKeys(100000)
	mod := func(n int) func(string) string {
		return func(k string) string { return strconv.Itoa(ModShard(k, n)) }
	}
	jump := func(n int) func(string) string {
		return func(k string) string { return strconv.Itoa(JumpHash(HashKey64(k), n)) }
	}
	ring := func(n int) func(string) string { return ringWith(100, nodeNames(n)...).Get }

	t.Log("Сколько ключей переезжает при добавлении одного узла:")
	for _, n := range []int{3, 10, 100} {
		ideal := 1 / float64(n+1)
		m := MovedFraction(keys, mod(n), mod(n+1))
		r := MovedFraction(keys, ring(n), ring(n+1))
		j := MovedFraction(keys, jump(n), jump(n+1))
		t.Logf("  %3d → %-3d  идеал %5.1f%%  остаток %5.1f%%  кольцо(V=100) %5.1f%%  jump %5.1f%%",
			n, n+1, 100*ideal, 100*m, 100*r, 100*j)
		if m < 0.7 {
			t.Errorf("%d → %d: остаток от деления перенёс всего %.1f%% — ожидалось почти всё", n, n+1, 100*m)
		}
		if r > 1.5*ideal || j > 1.2*ideal {
			t.Errorf("%d → %d: кольцо %.1f%% / jump %.1f%% — далеко от идеала %.1f%%", n, n+1, 100*r, 100*j, 100*ideal)
		}
	}

	t.Log("Разброс нагрузки на 10 узлов в зависимости от числа виртуальных узлов V:")
	spread := func(hash func(string) uint32, v int) float64 {
		// тот же алгоритм кольца, но с подставной хеш-функцией
		type pt struct {
			h uint32
			n int
		}
		var pts []pt
		for n := range 10 {
			for i := range v {
				pts = append(pts, pt{hash("cache-" + strconv.Itoa(n+1) + "#" + strconv.Itoa(i)), n})
			}
		}
		slices.SortFunc(pts, func(a, b pt) int {
			if a.h != b.h {
				if a.h < b.h {
					return -1
				}
				return 1
			}
			return a.n - b.n
		})
		load := make([]float64, 10)
		for _, k := range keys {
			h := hash(k)
			i, _ := slices.BinarySearchFunc(pts, h, func(p pt, t uint32) int {
				if p.h < t {
					return -1
				} else if p.h > t {
					return 1
				}
				return 0
			})
			load[pts[i%len(pts)].n]++
		}
		mean, ss := float64(len(keys))/10, 0.0
		for _, l := range load {
			ss += (l - mean) * (l - mean)
		}
		return math.Sqrt(ss/10) / mean
	}
	var mixed100, raw100 float64
	for _, v := range []int{1, 10, 100, 1000} {
		raw, mix := spread(fnv32a, v), spread(HashKey, v)
		t.Logf("  V=%-5d  голый FNV-1a %5.1f%%   FNV-1a + перемешивание %5.1f%%", v, 100*raw, 100*mix)
		if v == 100 {
			raw100, mixed100 = raw, mix
		}
	}
	if mixed100 > 0.15 {
		t.Errorf("V=100 с перемешиванием: разброс %.1f%% — ожидалось около 10%%", 100*mixed100)
	}
	if raw100 < 3*mixed100 {
		t.Errorf("V=100: голый FNV-1a (%.1f%%) должен балансировать заметно хуже перемешанного (%.1f%%)", 100*raw100, 100*mixed100)
	}

	t.Log("Где на окружности (доля от 0 до 1) лежат первые точки узла cache-1:")
	for i := range 4 {
		s := "cache-1#" + strconv.Itoa(i)
		t.Logf("  %-10s  голый FNV-1a %.4f   с перемешиванием %.4f", s, float64(fnv32a(s))/(1<<32), float64(HashKey(s))/(1<<32))
	}

	removed := ringWith(100, nodeNames(10)...)
	removed.Remove("cache-5")
	gone := MovedFraction(keys, ring(10), removed.Get)
	t.Logf("Удаление cache-5 из 10 узлов кольца: переехало %.1f%% (идеал 10%%)", 100*gone)
	if gone > 0.15 {
		t.Errorf("удаление узла из кольца перенесло %.1f%% — ожидалось около 10%%", 100*gone)
	}

	load := make([]int, 10)
	for _, k := range keys {
		load[JumpHash(HashKey64(k), 10)]++
	}
	top := slices.Max(load)
	t.Logf("Jump hash, 10 корзин: самая нагруженная — %.3f от средней", float64(top)/float64(len(keys)/10))
	if float64(top)/float64(len(keys)/10) > 1.05 {
		t.Errorf("jump hash: самая нагруженная корзина %.3f от средней — ожидался почти идеальный баланс", float64(top)/float64(len(keys)/10))
	}
}
