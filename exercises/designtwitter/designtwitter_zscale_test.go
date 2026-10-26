package designtwitter

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestTwitterScales — сложность, а не ответ. 20 авторов публикуют по очереди
// 15000 твитов (по 750), пользователь 1 подписан на всех, затем 4000 раз
// GetNewsFeed(1). Слияние голов кучей — O(F + 10·log F)
// на ленту (F = 20). «Собрать все твиты подписок и отсортировать по времени» —
// O(T log T) на ленту, T = 15000.
func TestTwitterScales(t *testing.T) {
	const authors, posts = 20, 15000
	const feeds = 4000
	tw := Constructor()
	failed, at, got := false, 0, []int(nil)
	scaletest.Within(t, scaletest.Limit,
		"Twitter: 15000 твитов от 20 подписок, затем 4000 GetNewsFeed — похоже на сортировку"+
			" всех твитов подписок на каждую ленту вместо слияния голов кучей"+
			" (замер: эталон ~10–35 мс, сбор и сортировка всех твитов ~9.4 с)",
		func() {
			for k := 0; k < posts; k++ {
				tw.PostTweet(2+k%authors, k)
			}
			for a := 0; a < authors; a++ {
				tw.Follow(1, 2+a)
			}
			for f := 0; f < feeds; f++ {
				feed := tw.GetNewsFeed(1)
				if len(feed) != 10 || feed[0] != posts-1 || feed[9] != posts-10 {
					failed, at, got = true, f, feed
					return
				}
			}
		})
	if failed {
		t.Fatalf("GetNewsFeed(1) на вызове %d = %v, ожидалось [%d … %d]", at, got, posts-1, posts-10)
	}
	feed := tw.GetNewsFeed(1)
	for i, id := range feed {
		if id != posts-1-i {
			t.Fatalf("GetNewsFeed(1) = %v, ожидалось %d самых свежих от %d вниз", feed, 10, posts-1)
		}
	}
}
