package designtwitter

import (
	"math/rand"
	"reflect"
	"testing"
)

// modelPost — запись наивной модели: кто и что запостил (время — позиция в срезе).
type modelPost struct{ user, tweet int }

// modelTwitter — наивная модель: единый глобальный лог постов + подписки.
// Лента — проход по логу с конца с фильтром по авторам. Медленно, зато
// семантика прозрачна: свежесть = позиция в логе, свои твиты видны всегда.
type modelTwitter struct {
	posts   []modelPost
	follows map[int]map[int]bool
}

func (m *modelTwitter) post(user, tweet int) {
	m.posts = append(m.posts, modelPost{user, tweet})
}

func (m *modelTwitter) follow(a, b int) {
	if m.follows[a] == nil {
		m.follows[a] = map[int]bool{}
	}
	m.follows[a][b] = true
}

func (m *modelTwitter) unfollow(a, b int) {
	delete(m.follows[a], b)
}

func (m *modelTwitter) feed(user int) []int {
	res := []int{}
	for i := len(m.posts) - 1; i >= 0 && len(res) < 10; i-- {
		p := m.posts[i]
		if p.user == user || m.follows[user][p.user] {
			res = append(res, p.tweet)
		}
	}
	return res
}

// TestTwitterRandom: model-based тест — случайные перемешанные PostTweet /
// Follow / Unfollow / GetNewsFeed против наивной модели на срезах. Крошечный
// пул пользователей 0..4 заставляет постоянно срабатывать подписку на себя,
// повторные Follow, Unfollow без подписки и переполнение ленты (>10 твитов
// от смешанных авторов — проверяется и обрезка, и порядок K-way merge).
// Сид фиксирован → падение воспроизводимо.
func TestTwitterRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2614))
	for run := 0; run < 30; run++ {
		tw := Constructor()
		model := &modelTwitter{follows: map[int]map[int]bool{}}
		nextTweet := 0
		for step := 0; step < 1000; step++ {
			u := rng.Intn(5)
			switch rng.Intn(4) {
			case 0:
				nextTweet++
				tw.PostTweet(u, nextTweet)
				model.post(u, nextTweet)
			case 1:
				v := rng.Intn(5) // включая v == u: подписка на себя не должна дублировать твиты
				tw.Follow(u, v)
				model.follow(u, v)
			case 2:
				v := rng.Intn(5) // отписка и от того, на кого не подписан
				tw.Unfollow(u, v)
				model.unfollow(u, v)
			case 3:
				got := tw.GetNewsFeed(u)
				want := model.feed(u)
				if !reflect.DeepEqual(got, want) {
					t.Fatalf("run %d step %d: GetNewsFeed(%d) = %v, модель = %v",
						run, step, u, got, want)
				}
			}
		}
	}
}
