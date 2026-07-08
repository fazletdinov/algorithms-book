package leaderboard

import (
	"reflect"
	"testing"
)

// ── TopK (min-куча размера K) ────────────────────────────────────────────────

func TestTopK(t *testing.T) {
	tk := NewTopK(3)
	for _, x := range []int{5, 1, 9, 3, 7, 2} {
		tk.Add(x)
	}
	if got := tk.Top(); !reflect.DeepEqual(got, []int{9, 7, 5}) {
		t.Errorf("Top() = %v, ожидалось [9 7 5]", got)
	}
}

func TestTopKFewerThanK(t *testing.T) {
	tk := NewTopK(3)
	tk.Add(4)
	tk.Add(2)
	if got := tk.Top(); !reflect.DeepEqual(got, []int{4, 2}) {
		t.Errorf("Top() = %v, ожидалось [4 2]", got)
	}
}

func TestTopKZero(t *testing.T) {
	tk := NewTopK(0)
	tk.Add(5)
	if got := tk.Top(); len(got) != 0 {
		t.Errorf("Top() при k=0 = %v, ожидалось пусто", got)
	}
}

// ── Leaderboard (модель Redis ZSET) ──────────────────────────────────────────

func TestLeaderboardBasic(t *testing.T) {
	lb := NewLeaderboard()
	lb.Set("alice", 100)
	lb.Set("bob", 200)
	lb.Set("carol", 150)

	if got := lb.TopN(2); !reflect.DeepEqual(got, []string{"bob", "carol"}) {
		t.Errorf("TopN(2) = %v, ожидалось [bob carol]", got)
	}
	if got := lb.Rank("bob"); got != 0 {
		t.Errorf("Rank(bob) = %d, ожидалось 0", got)
	}
	if got := lb.Rank("alice"); got != 2 {
		t.Errorf("Rank(alice) = %d, ожидалось 2", got)
	}
	if got := lb.Rank("dan"); got != -1 {
		t.Errorf("Rank(dan) = %d, ожидалось -1", got)
	}
	if s, ok := lb.Score("carol"); !ok || s != 150 {
		t.Errorf("Score(carol) = (%d,%v), ожидалось (150,true)", s, ok)
	}
	if _, ok := lb.Score("dan"); ok {
		t.Errorf("Score(dan): ok=true, ожидалось false")
	}
}

func TestLeaderboardIncr(t *testing.T) {
	lb := NewLeaderboard()
	lb.Set("alice", 100)
	lb.Set("bob", 200)

	if got := lb.Incr("alice", 150); got != 250 { // 100 + 150
		t.Errorf("Incr(alice, 150) = %d, ожидалось 250", got)
	}
	if got := lb.TopN(1); !reflect.DeepEqual(got, []string{"alice"}) {
		t.Errorf("после Incr TopN(1) = %v, ожидалось [alice]", got)
	}
	// Incr нового участника — заводит его с нуля.
	if got := lb.Incr("new", 10); got != 10 {
		t.Errorf("Incr(new, 10) = %d, ожидалось 10", got)
	}
	if s, ok := lb.Score("new"); !ok || s != 10 {
		t.Errorf("Score(new) = (%d,%v), ожидалось (10,true)", s, ok)
	}
}

func TestLeaderboardTieBreak(t *testing.T) {
	// При равных очках выше по рангу — лексикографически меньшее имя.
	lb := NewLeaderboard()
	lb.Set("yak", 50)
	lb.Set("ant", 50)
	lb.Set("cat", 50)
	if got := lb.TopN(3); !reflect.DeepEqual(got, []string{"ant", "cat", "yak"}) {
		t.Errorf("TopN(3) при равных очках = %v, ожидалось [ant cat yak]", got)
	}
	if got := lb.Rank("cat"); got != 1 {
		t.Errorf("Rank(cat) = %d, ожидалось 1", got)
	}
}

func TestLeaderboardTopNClamp(t *testing.T) {
	lb := NewLeaderboard()
	lb.Set("a", 1)
	lb.Set("b", 2)
	if got := lb.TopN(10); !reflect.DeepEqual(got, []string{"b", "a"}) {
		t.Errorf("TopN(10) с 2 участниками = %v, ожидалось [b a]", got)
	}
	if got := lb.TopN(0); len(got) != 0 {
		t.Errorf("TopN(0) = %v, ожидалось пусто", got)
	}
}
