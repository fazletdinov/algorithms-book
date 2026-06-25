package designtwitter

import (
	"reflect"
	"testing"
)

// Сценарий из условия LeetCode: лента детерминирована (твиты упорядочены по
// глобальным «часам»).
func TestTwitterScenario(t *testing.T) {
	tw := Constructor()
	tw.PostTweet(1, 5)
	if got := tw.GetNewsFeed(1); !reflect.DeepEqual(got, []int{5}) {
		t.Fatalf("после PostTweet(1,5): GetNewsFeed(1) = %v, ожидалось [5]", got)
	}
	tw.Follow(1, 2)
	tw.PostTweet(2, 6)
	if got := tw.GetNewsFeed(1); !reflect.DeepEqual(got, []int{6, 5}) {
		t.Fatalf("после Follow(1,2)+PostTweet(2,6): GetNewsFeed(1) = %v, ожидалось [6 5]", got)
	}
	tw.Unfollow(1, 2)
	if got := tw.GetNewsFeed(1); !reflect.DeepEqual(got, []int{5}) {
		t.Fatalf("после Unfollow(1,2): GetNewsFeed(1) = %v, ожидалось [5]", got)
	}
}

// Лента ограничена 10 самыми свежими твитами.
func TestNewsFeedLimit(t *testing.T) {
	tw := Constructor()
	for i := 1; i <= 12; i++ {
		tw.PostTweet(1, i) // твиты 1..12 по возрастанию времени
	}
	got := tw.GetNewsFeed(1)
	want := []int{12, 11, 10, 9, 8, 7, 6, 5, 4, 3} // 10 самых свежих
	if !reflect.DeepEqual(got, want) {
		t.Errorf("GetNewsFeed(1) = %v, ожидалось %v", got, want)
	}
}

// Собственные твиты + твиты подписки сливаются по свежести (K-way merge).
func TestMergeFollowed(t *testing.T) {
	tw := Constructor()
	tw.PostTweet(1, 10) // время 1
	tw.PostTweet(2, 20) // время 2
	tw.PostTweet(1, 11) // время 3
	tw.PostTweet(2, 21) // время 4
	tw.Follow(1, 2)
	got := tw.GetNewsFeed(1)
	want := []int{21, 11, 20, 10} // по убыванию времени
	if !reflect.DeepEqual(got, want) {
		t.Errorf("GetNewsFeed(1) = %v, ожидалось %v", got, want)
	}
}
