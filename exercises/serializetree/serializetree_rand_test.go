package serializetree

import (
	"math/rand"
	"testing"
)

// randTree — случайное бинарное дерево: каждый ребёнок существует с убывающей
// по глубине вероятностью, значения — маленькие, включая отрицательные и
// повторы (round-trip обязан различать форму, а не опираться на значения).
func randTree(rng *rand.Rand, depth int) *TreeNode {
	if depth == 0 || rng.Intn(3) == 0 {
		return nil
	}
	return &TreeNode{
		Val:   rng.Intn(21) - 10, // -10..10 — дубликаты и минусы часты
		Left:  randTree(rng, depth-1),
		Right: randTree(rng, depth-1),
	}
}

// TestRoundTripRandom: свойство Deserialize(Serialize(t)) == t на случайных
// деревьях, включая nil и сильно перекошенные формы. Сравнение — sameTree
// (структура + значения), то есть ловится любая потеря формы: перепутанные
// лево/право, съеденный nil-маркер, лишний узел. Сид фиксирован.
func TestRoundTripRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2612))
	for i := 0; i < 3000; i++ {
		tree := randTree(rng, 1+rng.Intn(6))
		data := Serialize(tree)
		got := Deserialize(data)
		if !sameTree(got, tree) {
			t.Fatalf("round-trip изменил дерево: Serialize = %q", data)
		}
	}
}

// TestSerializeDeterministic: одно и то же дерево сериализуется в одну и ту же
// строку, а повторный round-trip строки стабилен (Serialize(Deserialize(s)) == s)
// — иначе «одно дерево, две записи» ломает сравнение снапшотов/кешей.
func TestSerializeDeterministic(t *testing.T) {
	rng := rand.New(rand.NewSource(2613))
	for i := 0; i < 500; i++ {
		tree := randTree(rng, 1+rng.Intn(6))
		s1 := Serialize(tree)
		s2 := Serialize(Deserialize(s1))
		if s1 != s2 {
			t.Fatalf("Serialize нестабилен: %q, после round-trip %q", s1, s2)
		}
	}
}
