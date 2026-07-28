package skyline

import (
	"math/rand"
	"reflect"
	"testing"
)

// naiveSkyline — профиль высот «в лоб»: для каждой целой точки x берём максимум
// высот зданий, накрывающих её (здание [l, r, h] покрывает l <= x < r), и
// записываем ключевую точку там, где высота изменилась. Работает только на
// маленьких целых координатах — ровно такие мы и генерируем.
func naiveSkyline(buildings [][]int) [][]int {
	maxX := 0
	for _, b := range buildings {
		if b[1] > maxX {
			maxX = b[1]
		}
	}
	res := [][]int{}
	prev := 0
	for x := 0; x <= maxX; x++ {
		h := 0
		for _, b := range buildings {
			if b[0] <= x && x < b[1] && b[2] > h {
				h = b[2]
			}
		}
		if h != prev {
			res = append(res, []int{x, h})
			prev = h
		}
	}
	return res
}

// TestGetSkylineRandom: дифференциальный тест против наивного профиля высот.
// Координаты из крошечного пула 0..14 и высоты 1..5 — чтобы постоянно
// совпадали края зданий (левый-левый, правый-левый, правый-правый) и высоты:
// именно на дубликатах граней ломаются порядок событий при равном x и ленивое
// удаление из кучи. Сид фиксирован → падение воспроизводимо.
func TestGetSkylineRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2607))
	for i := 0; i < 3000; i++ {
		n := 1 + rng.Intn(6)
		buildings := make([][]int, n)
		for j := 0; j < n; j++ {
			l := rng.Intn(12)
			r := l + 1 + rng.Intn(4)
			h := 1 + rng.Intn(5)
			buildings[j] = []int{l, r, h}
		}
		want := naiveSkyline(buildings)
		got := GetSkyline(buildings)
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("GetSkyline(%v) =\n  %v\nнаивный профиль:\n  %v", buildings, got, want)
		}
	}
}
