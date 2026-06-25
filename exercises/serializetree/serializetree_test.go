package serializetree

import "testing"

// Свойство round-trip: Deserialize(Serialize(t)) == t по структуре и значениям.
func TestRoundTrip(t *testing.T) {
	trees := map[string]*TreeNode{
		"nil":           nil,
		"один узел":     {Val: 42},
		"полное":        {Val: 1, Left: &TreeNode{Val: 2}, Right: &TreeNode{Val: 3}},
		"перекошено":    {Val: 1, Right: &TreeNode{Val: 2, Right: &TreeNode{Val: 3}}},
		"с дырками":     {Val: 1, Left: &TreeNode{Val: 2}, Right: &TreeNode{Val: 3, Left: &TreeNode{Val: 4}, Right: &TreeNode{Val: 5}}},
		"отрицательные": {Val: -5, Left: &TreeNode{Val: -10}, Right: &TreeNode{Val: 7}},
	}
	for name, tree := range trees {
		t.Run(name, func(t *testing.T) {
			got := Deserialize(Serialize(tree))
			if !sameTree(got, tree) {
				t.Errorf("round-trip изменил дерево %q: Serialize дал %q", name, Serialize(tree))
			}
		})
	}
}
