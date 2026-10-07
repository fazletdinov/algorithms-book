package treebfs

import (
	"strconv"
	"strings"
	"testing"
)

// maxTreeNodes — потолок печати. Помощник обходит дерево уже ПОСЛЕ функции
// читателя: останься в нём цикл (обход Морриса без снятия нитей), обход без
// границы не кончился бы, а предела памяти у go test нет.
const maxTreeNodes = 127

// treeString печатает дерево по уровням, как в условиях LeetCode: [1,2,3,null,4].
// Нужна сообщениям тестов: «MaxDepth = 3, want 4» без самого дерева не воспроизвести.
// После maxTreeNodes узлов печать обрывается многоточием.
func treeString(root *TreeNode) string {
	var parts []string
	queue := []*TreeNode{root}
	nodes := 0
	for len(queue) > 0 {
		n := queue[0]
		queue = queue[1:]
		if n == nil {
			parts = append(parts, "null")
			continue
		}
		if nodes == maxTreeNodes {
			parts = append(parts, "…")
			break
		}
		nodes++
		parts = append(parts, strconv.Itoa(n.Val))
		queue = append(queue, n.Left, n.Right)
	}
	for len(parts) > 0 && parts[len(parts)-1] == "null" {
		parts = parts[:len(parts)-1]
	}
	return "[" + strings.Join(parts, ",") + "]"
}

func TestTreeString(t *testing.T) {
	gap := &TreeNode{Val: 1, Right: &TreeNode{Val: 2, Left: &TreeNode{Val: 3}}}
	for want, root := range map[string]*TreeNode{"[]": nil, "[7]": {Val: 7}, "[1,null,2,3]": gap} {
		if got := treeString(root); got != want {
			t.Errorf("treeString = %s, ожидалось %s", got, want)
		}
	}
}

// Дерево с нитью назад (правый потомок листа 2 — корень) обходится бесконечно:
// печать обязана оборваться на потолке, а не расти без предела.
func TestTreeStringStopsOnCycle(t *testing.T) {
	root := &TreeNode{Val: 1, Left: &TreeNode{Val: 2}}
	root.Left.Right = root
	got := treeString(root)
	if !strings.HasPrefix(got, "[1,2,null,null,1,2,") || !strings.HasSuffix(got, ",…]") {
		t.Fatalf("treeString(дерево с циклом) = %s, ожидалось начало «[1,2,null,null,1,2,» и обрыв «,…]»", got)
	}
	printed := 0
	for _, p := range strings.Split(strings.Trim(got, "[]"), ",") {
		if p != "null" && p != "…" {
			printed++
		}
	}
	if printed != maxTreeNodes {
		t.Errorf("напечатано %d узлов, ожидалось %d (потолок)", printed, maxTreeNodes)
	}
}

// Ровно maxTreeNodes узлов — не повод для многоточия.
func TestTreeStringCeilingIsExact(t *testing.T) {
	var root *TreeNode
	for v := maxTreeNodes; v >= 1; v-- {
		root = &TreeNode{Val: v, Left: root}
	}
	got := treeString(root)
	if strings.Contains(got, "…") {
		t.Errorf("%d узлов не превышают потолок, но печать оборвана: %s", maxTreeNodes, got)
	}
}
