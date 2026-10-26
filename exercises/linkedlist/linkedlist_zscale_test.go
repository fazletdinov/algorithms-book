package linkedlist

import (
	"slices"
	"testing"
)

// Тесты этого файла — не про порядок значений (его держат табличные и случайные
// тесты), а про обещание «на месте, O(1) памяти». Решение, которое собирает
// новый список из копий узлов или складывает значения в срез, отвечает верно,
// но и узлы у него чужие, и аллокаций — на каждый узел. Список собирается ДО
// замера, поэтому любая аллокация в замере — аллокация самой функции.

const (
	allocNodes = 10000 // узлов в списке
	allocRuns  = 20    // прогонов в testing.AllocsPerRun
	// dummyAllocs — сколько аллокаций за вызов прощается функциям с фиктивной
	// головой: ReverseKGroup эталона отдаёт &ListNode{} в кучу (компилятор не
	// доказал, что он не покидает функцию) — 1 аллокация на вызов, от n не
	// зависит. Новые узлы дали бы n = 10000.
	dummyAllocs = 2
)

// indexList — список 0, 1, …, n−1: значение узла — его номер во входе, поэтому
// по значению узла результата видно, каким узлом входа он обязан быть.
func indexList(n int) (*ListNode, []*ListNode) {
	vals := make([]int, n)
	for i := range vals {
		vals[i] = i
	}
	head := fromSlice(vals)
	var nodes []*ListNode
	for p := head; p != nil; p = p.Next {
		nodes = append(nodes, p)
	}
	return head, nodes
}

// checkSameNodes требует, чтобы результат состоял ровно из узлов входа: узел со
// значением v — тот самый узел, что стоял во входе на месте v.
func checkSameNodes(t *testing.T, what string, before []*ListNode, head *ListNode) {
	t.Helper()
	seen := make([]bool, len(before))
	count := 0
	for p := head; p != nil; p = p.Next {
		if count == len(before) {
			t.Fatalf("%s: в результате больше %d узлов — список зациклен или узлы добавлены", what, len(before))
		}
		v := p.Val
		if v < 0 || v >= len(before) || seen[v] || p != before[v] {
			t.Fatalf("%s: узел со значением %d — не тот узел, что был во входе; "+
				"разворот на месте перецепляет Next, новых узлов не создаёт", what, v)
		}
		seen[v] = true
		count++
	}
	if count != len(before) {
		t.Fatalf("%s: в результате %d узлов, ожидалось %d", what, count, len(before))
	}
}

func TestReverseListInPlace(t *testing.T) {
	for _, n := range []int{1, 2, 5} {
		head, before := indexList(n)
		checkSameNodes(t, "ReverseList", before, ReverseList(head))
	}
}

func TestReverseSublistInPlace(t *testing.T) {
	for _, c := range []struct{ n, p, q int }{{5, 2, 4}, {5, 1, 5}, {3, 1, 2}, {3, 2, 3}, {3, 2, 2}} {
		head, before := indexList(c.n)
		checkSameNodes(t, "ReverseSublist", before, ReverseSublist(head, c.p, c.q))
	}
}

func TestReverseKGroupInPlace(t *testing.T) {
	for _, c := range []struct{ n, k int }{{5, 2}, {5, 3}, {4, 2}, {3, 3}, {2, 3}} {
		head, before := indexList(c.n)
		checkSameNodes(t, "ReverseKGroup", before, ReverseKGroup(head, c.k))
	}
}

func TestReverseListNoAllocs(t *testing.T) {
	head, _ := indexList(allocNodes)
	// Чётное число разворотов возвращает исходный список — замер можно повторять.
	allocs := testing.AllocsPerRun(allocRuns, func() { head = ReverseList(ReverseList(head)) })
	if head == nil || head.Val != 0 {
		t.Fatalf("ReverseList дважды не вернул исходный список")
	}
	if allocs != 0 {
		t.Fatalf("ReverseList(%d узлов): %.0f аллокаций за два вызова, ожидалось 0 — "+
			"похоже на новые узлы или срез там, где нужна O(1) памяти", allocNodes, allocs)
	}
}

func TestReverseSublistNoAllocs(t *testing.T) {
	head, _ := indexList(allocNodes)
	allocs := testing.AllocsPerRun(allocRuns, func() {
		head = ReverseSublist(ReverseSublist(head, 2, allocNodes-1), 2, allocNodes-1)
	})
	if head == nil || head.Val != 0 {
		t.Fatalf("ReverseSublist дважды не вернул исходный список")
	}
	if allocs > 2*dummyAllocs {
		t.Fatalf("ReverseSublist(%d узлов): %.0f аллокаций за два вызова, ожидалось не больше %d (фиктивная голова) — "+
			"похоже на новые узлы или срез там, где нужна O(1) памяти", allocNodes, allocs, 2*dummyAllocs)
	}
}

func TestReverseKGroupNoAllocs(t *testing.T) {
	head, _ := indexList(allocNodes)
	allocs := testing.AllocsPerRun(allocRuns, func() { head = ReverseKGroup(ReverseKGroup(head, 7), 7) })
	if head == nil || head.Val != 0 {
		t.Fatalf("ReverseKGroup дважды не вернул исходный список")
	}
	if allocs > 2*dummyAllocs {
		t.Fatalf("ReverseKGroup(%d узлов): %.0f аллокаций за два вызова, ожидалось не больше %d (фиктивная голова) — "+
			"похоже на новые узлы или срез там, где нужна O(1) памяти", allocNodes, allocs, 2*dummyAllocs)
	}
}

// TestIsPalindromeNoAllocs — копия значений в срез отвечает верно, но аллоцирует;
// разворот второй половины — ни разу. Заодно: после проверки список прежний.
func TestIsPalindromeNoAllocs(t *testing.T) {
	vals := make([]int, allocNodes)
	for i := range vals {
		vals[i] = min(i, allocNodes-1-i) // палиндром: 0, 1, …, 1, 0
	}
	head := fromSlice(vals)
	var before []*ListNode
	for p := head; p != nil; p = p.Next {
		before = append(before, p)
	}
	var got bool
	allocs := testing.AllocsPerRun(allocRuns, func() { got = IsPalindrome(head) })
	if !got {
		t.Fatalf("IsPalindrome(палиндром из %d узлов) = false, ожидалось true", allocNodes)
	}
	if allocs != 0 {
		t.Fatalf("IsPalindrome(%d узлов): %.0f аллокаций за вызов, ожидалось 0 — "+
			"похоже на копию значений в срез там, где нужна O(1) памяти (разворот половины: 0 аллокаций)",
			allocNodes, allocs)
	}
	var after []*ListNode
	for p := head; p != nil && len(after) <= allocNodes; p = p.Next {
		after = append(after, p)
	}
	if !slices.Equal(after, before) {
		t.Fatalf("IsPalindrome испортил список: после вызова узлы не те или не на своих местах")
	}
}
