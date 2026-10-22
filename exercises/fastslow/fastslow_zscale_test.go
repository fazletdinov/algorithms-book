package fastslow

import "testing"

// Тесты этого файла — не про ответ и не про время, а про память: суть главы —
// найти цикл за O(1) дополнительной памяти. Решение на map[*ListNode]bool
// отвечает верно и за O(n), но аллоцирует на каждой записи в map; Флойд не
// аллоцирует ничего. Список собирается ДО замера, поэтому любая аллокация в
// замере — аллокация самой функции.

// cycleList — список из n узлов, хвост которого замкнут на узел с индексом pos.
func cycleList(n, pos int) *ListNode {
	vals := make([]int, n)
	for i := range vals {
		vals[i] = i
	}
	return fromSliceWithCycle(vals, pos)
}

const (
	allocNodes = 10000 // узлов в списке
	allocPos   = 3000  // начало цикла: хвост 3000, кольцо 7000
	allocRuns  = 20    // прогонов в testing.AllocsPerRun
)

func TestHasCycleNoAllocs(t *testing.T) {
	head := cycleList(allocNodes, allocPos)
	var got bool
	allocs := testing.AllocsPerRun(allocRuns, func() { got = HasCycle(head) })
	if !got {
		t.Fatalf("HasCycle(список с циклом из %d узлов) = false, ожидалось true", allocNodes)
	}
	if allocs != 0 {
		t.Fatalf("HasCycle(%d узлов): %.0f аллокаций за вызов, ожидалось 0 — "+
			"похоже на множество посещённых узлов там, где нужна O(1) памяти (Флойд: 0 аллокаций)",
			allocNodes, allocs)
	}
}

func TestDetectCycleNoAllocs(t *testing.T) {
	head := cycleList(allocNodes, allocPos)
	want := nodeAt(head, allocPos)
	var got *ListNode
	allocs := testing.AllocsPerRun(allocRuns, func() { got = DetectCycle(head) })
	if got != want {
		t.Fatalf("DetectCycle(%d узлов, цикл с индекса %d) вернул не тот узел", allocNodes, allocPos)
	}
	if allocs != 0 {
		t.Fatalf("DetectCycle(%d узлов): %.0f аллокаций за вызов, ожидалось 0 — "+
			"похоже на множество посещённых узлов там, где нужна O(1) памяти (Флойд: 0 аллокаций)",
			allocNodes, allocs)
	}
}

func TestCycleLengthNoAllocs(t *testing.T) {
	head := cycleList(allocNodes, allocPos)
	var got int
	allocs := testing.AllocsPerRun(allocRuns, func() { got = CycleLength(head) })
	if want := allocNodes - allocPos; got != want {
		t.Fatalf("CycleLength(%d узлов, цикл с индекса %d) = %d, ожидалось %d",
			allocNodes, allocPos, got, want)
	}
	if allocs != 0 {
		t.Fatalf("CycleLength(%d узлов): %.0f аллокаций за вызов, ожидалось 0 — "+
			"похоже на map посещённых узлов там, где нужна O(1) памяти (Флойд: 0 аллокаций)",
			allocNodes, allocs)
	}
}

// TestIsHappyNumberNoAllocs — условие обещает «без вспомогательного множества».
// 99999999 — несчастливое: 648 → 116 → 38 → 73 → 58 и дальше по кольцу
// 58 → 89 → 145 → 42 → 20 → 4 → 16 → 37 → 58, 7 — счастливое. Встреченных чисел
// больше восьми нарочно: маленькая map, не покидающая функцию, может лечь на
// стек и не дать ни одной аллокации.
func TestIsHappyNumberNoAllocs(t *testing.T) {
	var unhappy, happy bool
	allocs := testing.AllocsPerRun(allocRuns, func() {
		unhappy = IsHappyNumber(99999999)
		happy = IsHappyNumber(7)
	})
	if unhappy || !happy {
		t.Fatalf("IsHappyNumber(99999999) = %v, IsHappyNumber(7) = %v; ожидалось false и true", unhappy, happy)
	}
	if allocs != 0 {
		t.Fatalf("IsHappyNumber: %.0f аллокаций за два вызова, ожидалось 0 — "+
			"похоже на множество встреченных чисел там, где нужна O(1) памяти (Флойд: 0 аллокаций)", allocs)
	}
}
