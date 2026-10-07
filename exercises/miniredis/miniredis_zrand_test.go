package miniredis

import (
	"fmt"
	"math/rand"
	"strconv"
	"testing"
)

// TestDispatchSetGetDelRandom — тысячи случайных SET/GET/DEL на маленьком
// пространстве ключей (чтобы коллизии/перезаписи/повторные DEL встречались
// часто) сверяются с наивной моделью — обычной Go map, которую циклевать
// негде: она заведомо верна. Ловит краевые случаи, которые ручные кейсы
// в TestDispatchSetGetDel могли пропустить.
func TestDispatchSetGetDelRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(42))
	store := NewStore()
	model := map[string]string{}

	keys := make([]string, 8)
	for i := range keys {
		keys[i] = fmt.Sprintf("k%d", i)
	}
	randKey := func() string { return keys[rng.Intn(len(keys))] }
	randVal := func() string { return fmt.Sprintf("v%d", rng.Intn(1000)) }

	for range 3000 {
		switch rng.Intn(3) {
		case 0: // SET
			k, v := randKey(), randVal()
			got := writeReply(t, Dispatch(store, []string{"SET", k, v}))
			if want := "+OK\r\n"; got != want {
				t.Fatalf("SET %s %s: wire = %q, want %q", k, v, got, want)
			}
			model[k] = v
		case 1: // GET
			k := randKey()
			got := writeReply(t, Dispatch(store, []string{"GET", k}))
			want, ok := model[k]
			var wantWire string
			if ok {
				wantWire = fmt.Sprintf("$%d\r\n%s\r\n", len(want), want)
			} else {
				wantWire = "$-1\r\n"
			}
			if got != wantWire {
				t.Fatalf("GET %s: wire = %q, want %q (модель: %q, ok=%v)", k, got, wantWire, want, ok)
			}
		case 2: // DEL одного-двух ключей разом
			k1, k2 := randKey(), randKey()
			got := writeReply(t, Dispatch(store, []string{"DEL", k1, k2}))
			deleted := 0
			for _, k := range []string{k1, k2} {
				if _, ok := model[k]; ok {
					delete(model, k)
					deleted++
				}
			}
			// k1 могло совпасть с k2 — модель считает то же самое, что и
			// Dispatch (у обоих один и тот же список args, включая дубликат).
			if want := fmt.Sprintf(":%d\r\n", deleted); got != want {
				t.Fatalf("DEL %s %s: wire = %q, want %q", k1, k2, got, want)
			}
		}
	}
}

// TestDispatchZAddZScoreZRankRandom — тысячи случайных ZADD/ZSCORE/ZRANK на
// одном ключе с маленьким пространством участников (чтобы перезаписи очков
// и совпадения по рангу встречались часто) сверяются с наивной моделью.
// Ранг модель считает НЕ через zsetOrdered (это была бы проверка кода сам
// через себя), а прямым подсчётом «сколько участников строго раньше в
// порядке (очки, имя)» — независимый способ прийти к тому же числу.
func TestDispatchZAddZScoreZRankRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	store := NewStore()
	model := map[string]int64{}

	members := make([]string, 10)
	for i := range members {
		members[i] = fmt.Sprintf("m%d", i)
	}
	randMember := func() string { return members[rng.Intn(len(members))] }

	naiveRank := func(target string) int {
		rank := 0
		for m, s := range model {
			if m == target {
				continue
			}
			if s < model[target] || (s == model[target] && m < target) {
				rank++
			}
		}
		return rank
	}

	for range 3000 {
		switch rng.Intn(3) {
		case 0: // ZADD одной паре
			m, score := randMember(), int64(rng.Intn(50))
			_, existed := model[m]
			got := writeReply(t, Dispatch(store, []string{"ZADD", "board", strconv.FormatInt(score, 10), m}))
			wantAdded := 0
			if !existed {
				wantAdded = 1
			}
			if want := fmt.Sprintf(":%d\r\n", wantAdded); got != want {
				t.Fatalf("ZADD board %d %s: wire = %q, want %q", score, m, got, want)
			}
			model[m] = score
		case 1: // ZSCORE
			m := randMember()
			got := writeReply(t, Dispatch(store, []string{"ZSCORE", "board", m}))
			score, ok := model[m]
			want := "$-1\r\n"
			if ok {
				s := strconv.FormatInt(score, 10)
				want = fmt.Sprintf("$%d\r\n%s\r\n", len(s), s)
			}
			if got != want {
				t.Fatalf("ZSCORE board %s: wire = %q, want %q", m, got, want)
			}
		case 2: // ZRANK
			m := randMember()
			got := writeReply(t, Dispatch(store, []string{"ZRANK", "board", m}))
			_, ok := model[m]
			want := "$-1\r\n"
			if ok {
				want = fmt.Sprintf(":%d\r\n", naiveRank(m))
			}
			if got != want {
				t.Fatalf("ZRANK board %s: wire = %q, want %q", m, got, want)
			}
		}
	}
}
