//go:build !solution

// Package designtwitter — Design Twitter: хеш-таблица + K-way merge (комбинация).
// Разбор — в книге: ../../src/pattern-combinations.md (раздел «Design Twitter»).
//
//	go test ./designtwitter/                 # твои решения
//	go test -tags solution ./designtwitter/  # эталон
//
// Реализуй ленту: PostTweet, Follow, Unfollow и GetNewsFeed (10 самых свежих
// твитов пользователя и тех, на кого он подписан). Связи и твиты — хеш-таблицы;
// лента — слияние нескольких отсортированных по времени списков (K-way merge кучей
// их «голов»). Заводи глобальные «часы», чтобы упорядочивать твиты по свежести.
package designtwitter

// Twitter — упрощённая соцсеть. Методы: Constructor() создаёт пустую сеть;
// PostTweet(userId, tweetId) публикует твит; Follow(follower, followee) и
// Unfollow(follower, followee) подписывают и отписывают; GetNewsFeed(userId) возвращает
// id не больше 10 самых свежих твитов самого пользователя и тех, на кого он подписан,
// от свежего к старому. Свежесть — порядок вызовов PostTweet.
//
// Пример: PostTweet(1,5); Follow(1,2); PostTweet(2,6); GetNewsFeed(1) = [6 5];
// Unfollow(1,2); GetNewsFeed(1) = [5].
//
// Ограничения: до 500 пользователей, до 3·10⁴ вызовов всего.
//
// Ожидаемая сложность: GetNewsFeed за O(F + 10·log F), где F — число подписок: свои
// твиты у каждого уже отсортированы по времени, и десять свежих — слияние K списков кучей.
//
// Шаблон: k-way-merge
//
// Также решается: top-k-elements
//
// Признак: ответ — первые 10 из объединения нескольких списков, каждый из которых уже
// упорядочен.
type Twitter struct {
	// TODO: твои поля. Подсказка: clock int; tweets map[int][]tweet;
	// follows map[int]map[int]bool.
}

// Constructor создаёт пустую ленту.
func Constructor() Twitter {
	panic("TODO: реализуй Constructor")
}

// PostTweet публикует твит tweetId от пользователя userId.
func (t *Twitter) PostTweet(userId, tweetId int) {
	panic("TODO: реализуй PostTweet")
}

// Follow: follower подписывается на followee.
func (t *Twitter) Follow(follower, followee int) {
	panic("TODO: реализуй Follow")
}

// Unfollow: follower отписывается от followee.
func (t *Twitter) Unfollow(follower, followee int) {
	panic("TODO: реализуй Unfollow")
}

// GetNewsFeed возвращает id до 10 самых свежих твитов пользователя и его подписок
// (от самого свежего к старому).
func (t *Twitter) GetNewsFeed(userId int) []int {
	// TODO: источники — сам пользователь + подписки; слей их отсортированные по
	// времени списки макс-кучей по времени, снимая по одному до 10 штук.
	panic("TODO: реализуй GetNewsFeed")
}
