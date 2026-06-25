//go:build solution

package designtwitter

import "container/heap"

type tweet struct{ time, id int }

// Twitter — лента: твиты пользователей (по возрастанию времени) + подписки.
type Twitter struct {
	clock   int
	tweets  map[int][]tweet
	follows map[int]map[int]bool
}

func Constructor() Twitter {
	return Twitter{tweets: map[int][]tweet{}, follows: map[int]map[int]bool{}}
}

func (t *Twitter) PostTweet(userId, tweetId int) {
	t.clock++
	t.tweets[userId] = append(t.tweets[userId], tweet{t.clock, tweetId})
}

func (t *Twitter) Follow(follower, followee int) {
	if t.follows[follower] == nil {
		t.follows[follower] = map[int]bool{}
	}
	t.follows[follower][followee] = true
}

func (t *Twitter) Unfollow(follower, followee int) {
	delete(t.follows[follower], followee)
}

func (t *Twitter) GetNewsFeed(userId int) []int {
	users := []int{userId}
	for u := range t.follows[userId] {
		if u != userId {
			users = append(users, u)
		}
	}
	h := &feed{} // max-heap по времени: на вершине самый свежий твит среди голов
	for _, u := range users {
		if lst := t.tweets[u]; len(lst) > 0 {
			heap.Push(h, cursor{u, len(lst) - 1, lst[len(lst)-1]})
		}
	}
	res := []int{}
	for h.Len() > 0 && len(res) < 10 {
		c := heap.Pop(h).(cursor)
		res = append(res, c.tw.id)
		if c.i > 0 { // подтягиваем следующий по свежести твит того же автора
			lst := t.tweets[c.u]
			heap.Push(h, cursor{c.u, c.i - 1, lst[c.i-1]})
		}
	}
	return res
}

type cursor struct {
	u, i int
	tw   tweet
}
type feed []cursor

func (h feed) Len() int           { return len(h) }
func (h feed) Less(i, j int) bool { return h[i].tw.time > h[j].tw.time }
func (h feed) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *feed) Push(x any)        { *h = append(*h, x.(cursor)) }
func (h *feed) Pop() any {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}
