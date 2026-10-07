package intervals

import (
	"math/rand"
	"sort"
	"testing"
)

// randIntervals — k случайных интервалов [start, start+len] с координатами в [0..20].
func randIntervals(rng *rand.Rand, k int) [][]int {
	res := make([][]int, k)
	for i := range res {
		s := rng.Intn(20)
		e := s + rng.Intn(6)
		res[i] = []int{s, e}
	}
	return res
}

func sortByStart(iv [][]int) {
	sort.Slice(iv, func(i, j int) bool {
		if iv[i][0] != iv[j][0] {
			return iv[i][0] < iv[j][0]
		}
		return iv[i][1] < iv[j][1]
	})
}

func equalIntervals(a, b [][]int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i][0] != b[i][0] || a[i][1] != b[i][1] {
			return false
		}
	}
	return true
}

// bruteMerge — слияние интервалов БЕЗ сортировки: пока есть хоть одна пара
// перекрывающихся интервалов (max(start) <= min(end)), сливаем её. Совершенно
// другой алгоритм, чем sweep-эталон, поэтому годится как независимая проверка.
func bruteMerge(intervals [][]int) [][]int {
	work := make([][]int, len(intervals))
	for i, iv := range intervals {
		work[i] = []int{iv[0], iv[1]}
	}
	for {
		merged := false
		for i := 0; i < len(work) && !merged; i++ {
			for j := i + 1; j < len(work); j++ {
				lo := work[i][0]
				if work[j][0] > lo {
					lo = work[j][0]
				}
				hi := work[i][1]
				if work[j][1] < hi {
					hi = work[j][1]
				}
				if lo <= hi { // перекрываются (с учётом касания)
					if work[j][0] < work[i][0] {
						work[i][0] = work[j][0]
					}
					if work[j][1] > work[i][1] {
						work[i][1] = work[j][1]
					}
					work = append(work[:j], work[j+1:]...)
					merged = true
					break
				}
			}
		}
		if !merged {
			break
		}
	}
	sortByStart(work)
	return work
}

func TestMergeIntervalsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(701))
	for range 3000 {
		in := randIntervals(rng, rng.Intn(6)+1)
		got := MergeIntervals(in)
		want := bruteMerge(in)
		sortByStart(got)
		if !equalIntervals(got, want) {
			t.Fatalf("MergeIntervals(%v) = %v, brute = %v", in, got, want)
		}
	}
}

func TestInsertIntervalRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(702))
	for range 3000 {
		base := randIntervals(rng, rng.Intn(6))
		// InsertInterval требует уже слитый и отсортированный вход.
		base = MergeIntervals(base)
		ni := []int{rng.Intn(20), 0}
		ni[1] = ni[0] + rng.Intn(6)
		got := InsertInterval(base, ni)
		want := bruteMerge(append(append([][]int{}, base...), ni))
		sortByStart(got)
		if !equalIntervals(got, want) {
			t.Fatalf("InsertInterval(%v, %v) = %v, brute = %v", base, ni, got, want)
		}
	}
}

// bruteIntersection — попарное пересечение всех интервалов из a и b. Так как
// внутри каждого списка интервалы не перекрываются, попарных пересечений ровно
// столько, сколько даёт двухуказательный эталон.
func bruteIntersection(a, b [][]int) [][]int {
	var res [][]int
	for _, x := range a {
		for _, y := range b {
			lo := x[0]
			if y[0] > lo {
				lo = y[0]
			}
			hi := x[1]
			if y[1] < hi {
				hi = y[1]
			}
			if lo <= hi {
				res = append(res, []int{lo, hi})
			}
		}
	}
	sortByStart(res)
	return res
}

// sortedDisjoint — отсортированные непересекающиеся интервалы (вход для пересечения).
func sortedDisjoint(rng *rand.Rand, k int) [][]int {
	res := [][]int{}
	cur := rng.Intn(3)
	for i := 0; i < k; i++ {
		s := cur + rng.Intn(3)
		e := s + rng.Intn(4)
		res = append(res, []int{s, e})
		cur = e + 1 + rng.Intn(3)
	}
	return res
}

func TestIntervalsIntersectionRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(703))
	for range 3000 {
		a := sortedDisjoint(rng, rng.Intn(5))
		b := sortedDisjoint(rng, rng.Intn(5))
		got := IntervalsIntersection(a, b)
		want := bruteIntersection(a, b)
		sortByStart(got)
		if !equalIntervals(got, want) {
			t.Fatalf("IntervalsIntersection(%v, %v) = %v, brute = %v", a, b, got, want)
		}
	}
}

// bruteCanAttend — O(n²): любая пара конфликтует, если max(start) < min(end).
func bruteCanAttend(intervals [][]int) bool {
	for i := range intervals {
		for j := i + 1; j < len(intervals); j++ {
			lo := intervals[i][0]
			if intervals[j][0] > lo {
				lo = intervals[j][0]
			}
			hi := intervals[i][1]
			if intervals[j][1] < hi {
				hi = intervals[j][1]
			}
			if lo < hi {
				return false
			}
		}
	}
	return true
}

func TestCanAttendAllMeetingsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(704))
	for range 3000 {
		// Ненулевые встречи: эталон сортирует только по началу и сравнивает
		// соседей, поэтому вырожденная [s,s] внутри другой встречи трактовалась
		// бы как конфликт, хотя в модели [start, end) точка встречи пуста.
		k := rng.Intn(6) + 1
		in := make([][]int, k)
		for i := range in {
			s := rng.Intn(20)
			in[i] = []int{s, s + rng.Intn(5) + 1}
		}
		if got, want := CanAttendAllMeetings(in), bruteCanAttend(in); got != want {
			t.Fatalf("CanAttendAllMeetings(%v) = %v, want %v", in, got, want)
		}
	}
}

// bruteMinRooms — максимум одновременно идущих встреч. Полуинтервал [start, end):
// точка s «занята» встречей iv, если iv[0] <= s < iv[1]. Перебираем все стартовые
// точки — пик нагрузки достигается ровно в одной из них.
func bruteMinRooms(intervals [][]int) int {
	best := 0
	for _, p := range intervals {
		s := p[0]
		cnt := 0
		for _, iv := range intervals {
			if iv[0] <= s && s < iv[1] {
				cnt++
			}
		}
		if cnt > best {
			best = cnt
		}
	}
	return best
}

func TestMinMeetingRoomsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(705))
	for range 3000 {
		k := rng.Intn(7) + 1
		// Встречи строго ненулевой длины (start < end): sweep-эталон оперирует
		// двумя отдельно отсортированными массивами концов и на вырожденном
		// [s,s] (start == end) сошёл бы с рельсов.
		in := make([][]int, k)
		for i := range in {
			s := rng.Intn(20)
			in[i] = []int{s, s + rng.Intn(5) + 1}
		}
		if got, want := MinMeetingRooms(in), bruteMinRooms(in); got != want {
			t.Fatalf("MinMeetingRooms(%v) = %d, want %d", in, got, want)
		}
	}
}
