package leaderboard

import (
	"math/rand"
	"reflect"
	"sort"
	"testing"
)

// modelBoard — наивная модель лидерборда: map очков + полная пересортировка
// среза на КАЖДЫЙ запрос. Медленно, зато контракт очевиден: по очкам убыв.,
// при равенстве — по имени лексикографически.
type modelBoard map[string]int

func (m modelBoard) ordered() []string {
	ms := make([]string, 0, len(m))
	for name := range m {
		ms = append(ms, name)
	}
	sort.Slice(ms, func(i, j int) bool {
		if m[ms[i]] != m[ms[j]] {
			return m[ms[i]] > m[ms[j]]
		}
		return ms[i] < ms[j]
	})
	return ms
}

func (m modelBoard) topN(n int) []string {
	ms := m.ordered()
	if n < 0 {
		n = 0
	}
	if n > len(ms) {
		n = len(ms)
	}
	return ms[:n]
}

func (m modelBoard) rank(member string) int {
	if _, ok := m[member]; !ok {
		return -1
	}
	for i, name := range m.ordered() {
		if name == member {
			return i
		}
	}
	return -1
}

// TestLeaderboardRandom: случайные Set/Incr против наивной модели, после
// каждой мутации сверяем TopN/Rank/Score. Узкий диапазон очков даёт много
// равных значений — это вскрывает ошибки тай-брейка, которые маленькие
// табличные кейсы пропускают. Сид фиксирован → падение воспроизводимо.
func TestLeaderboardRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260707))
	members := []string{"ant", "bee", "cat", "dog", "elk", "fox"}
	for run := 0; run < 50; run++ {
		lb := NewLeaderboard()
		model := modelBoard{}
		for step := 0; step < 400; step++ {
			m := members[rng.Intn(len(members))]
			if rng.Intn(2) == 0 {
				s := rng.Intn(10) // узкий диапазон → частые равенства очков
				lb.Set(m, s)
				model[m] = s
			} else {
				d := rng.Intn(7) - 3 // включая отрицательные дельты
				got := lb.Incr(m, d)
				model[m] += d
				if got != model[m] {
					t.Fatalf("run %d step %d: Incr(%q, %d) = %d, модель = %d", run, step, m, d, got, model[m])
				}
			}

			n := rng.Intn(len(members) + 2) // включая 0 и n > числа участников
			if got, want := lb.TopN(n), model.topN(n); !sameStrings(got, want) {
				t.Fatalf("run %d step %d: TopN(%d) = %v, модель = %v (очки %v)", run, step, n, got, want, model)
			}
			probe := members[rng.Intn(len(members))]
			if rng.Intn(8) == 0 {
				probe = "ghost" // участник, которого никогда не заводили
			}
			if got, want := lb.Rank(probe), model.rank(probe); got != want {
				t.Fatalf("run %d step %d: Rank(%q) = %d, модель = %d (очки %v)", run, step, probe, got, want, model)
			}
			gotS, gotOK := lb.Score(probe)
			wantS, wantOK := model[probe]
			if gotS != wantS || gotOK != wantOK {
				t.Fatalf("run %d step %d: Score(%q) = (%d,%v), модель = (%d,%v)", run, step, probe, gotS, gotOK, wantS, wantOK)
			}
		}
	}
}

// TestTopKRandom: поток случайных значений против «отсортировать всё и взять
// первые K». Дубликаты в узком диапазоне проверяют, что TopK хранит мультимножество.
func TestTopKRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260707))
	for run := 0; run < 200; run++ {
		k := rng.Intn(6) // 0..5
		tk := NewTopK(k)
		var all []int
		n := 1 + rng.Intn(40)
		for i := 0; i < n; i++ {
			x := rng.Intn(20) - 10
			tk.Add(x)
			all = append(all, x)

			want := append([]int(nil), all...)
			sort.Sort(sort.Reverse(sort.IntSlice(want)))
			if k < len(want) {
				want = want[:k]
			}
			got := tk.Top()
			if len(got) == 0 && len(want) == 0 {
				continue
			}
			if !reflect.DeepEqual(got, want) {
				t.Fatalf("run %d: после %v Top() = %v, модель = %v (k=%d)", run, all, got, want, k)
			}
		}
	}
}

func sameStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
