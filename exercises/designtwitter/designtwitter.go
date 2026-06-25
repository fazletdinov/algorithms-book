//go:build !solution

// Package designtwitter — Design Twitter: хеш-таблица + K-way merge (комбинация).
// Разбор — в книге: ../../src/pattern-combinations.md (раздел «Design Twitter»).
//
//	go test ./designtwitter/                 # ваши решения
//	go test -tags solution ./designtwitter/  # эталон
//
// Реализуйте ленту: PostTweet, Follow, Unfollow и GetNewsFeed (10 самых свежих
// твитов пользователя и тех, на кого он подписан). Связи и твиты — хеш-таблицы;
// лента — слияние нескольких отсортированных по времени списков (K-way merge кучей
// их «голов»). Заводите глобальные «часы», чтобы упорядочивать твиты по свежести.
package designtwitter

// Twitter — лента: твиты пользователей + подписки.
type Twitter struct {
	// TODO: ваши поля. Подсказка: clock int; tweets map[int][]tweet;
	// follows map[int]map[int]bool.
}

// Constructor создаёт пустую ленту.
func Constructor() Twitter {
	panic("TODO: реализуйте Constructor")
}

// PostTweet публикует твит tweetId от пользователя userId.
func (t *Twitter) PostTweet(userId, tweetId int) {
	panic("TODO: реализуйте PostTweet")
}

// Follow: follower подписывается на followee.
func (t *Twitter) Follow(follower, followee int) {
	panic("TODO: реализуйте Follow")
}

// Unfollow: follower отписывается от followee.
func (t *Twitter) Unfollow(follower, followee int) {
	panic("TODO: реализуйте Unfollow")
}

// GetNewsFeed возвращает id до 10 самых свежих твитов пользователя и его подписок
// (от самого свежего к старому).
func (t *Twitter) GetNewsFeed(userId int) []int {
	// TODO: источники — сам пользователь + подписки; слейте их отсортированные по
	// времени списки макс-кучей по времени, снимая по одному до 10 штук.
	panic("TODO: реализуйте GetNewsFeed")
}
