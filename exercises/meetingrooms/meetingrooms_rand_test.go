package meetingrooms

import (
	"math/rand"
	"testing"
)

// naiveMinRooms — максимум одновременных встреч «в лоб»: пик перекрытий
// достигается в момент начала какой-то встречи, поэтому для каждого начала s
// считаем, сколько интервалов его накрывает (полуоткрыто: start <= s < end —
// встреча, кончившаяся ровно в s, комнату уже освободила).
func naiveMinRooms(intervals [][]int) int {
	best := 0
	for _, iv := range intervals {
		s := iv[0]
		cnt := 0
		for _, jv := range intervals {
			if jv[0] <= s && s < jv[1] {
				cnt++
			}
		}
		if cnt > best {
			best = cnt
		}
	}
	return best
}

// TestMinMeetingRoomsRandom: случайные интервалы против наивного подсчёта пика
// перекрытий. Времена из крошечного пула 0..11 — чтобы постоянно совпадали
// границы (конец одной = начало другой): именно там живёт классическая ошибка
// '<' vs '<=' при освобождении комнаты. Наивный ответ считается ДО вызова
// функции: эталон сортирует intervals на месте. Сид фиксирован.
func TestMinMeetingRoomsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2608))
	for i := 0; i < 5000; i++ {
		n := rng.Intn(9) // 0..8, включая пустой список
		intervals := make([][]int, n)
		for j := 0; j < n; j++ {
			s := rng.Intn(8)
			e := s + 1 + rng.Intn(4)
			intervals[j] = []int{s, e}
		}
		want := naiveMinRooms(intervals)
		if got := MinMeetingRooms(intervals); got != want {
			t.Fatalf("MinMeetingRooms(%v) = %d, наивный подсчёт = %d", intervals, got, want)
		}
	}
}
