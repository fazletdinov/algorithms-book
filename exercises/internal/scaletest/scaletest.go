// Package scaletest — общий помощник тестов масштаба (<pkg>_zscale_test.go).
//
// Тест масштаба проверяет не ответ, а сложность: на худшем входе решение,
// хуже задуманного на целый класс (n² вместо n, экспонента вместо полинома),
// не укладывается в срок. Лишний log он не ловит — и не должен.
package scaletest

import (
	"fmt"
	"runtime/debug"
	"testing"
	"time"
)

// Limit — срок по умолчанию. Входы тестов подобраны так, что эталон укладывается
// примерно в 50 мс, а решение хуже на класс — в 6 с и больше: запас на порядок в
// обе стороны выдерживает и машину CI (медленнее в 2–3 раза), и -race (~10×).
const Limit = 2 * time.Second

// Within выполняет run в горутине и роняет тест, если она не вернулась за limit
// или запаниковала. what — что гонялось и что значит падение: вход, ожидаемый
// класс, замеры. Ответ run проверяет сам тест после Within.
//
// После срока run продолжает работать до выхода тестового бинарника: остановить
// чужую горутину в Go нельзя. Поэтому файлы тестов масштаба идут последними.
func Within(t testing.TB, limit time.Duration, what string, run func()) {
	t.Helper()
	if testing.Short() {
		t.Skip("тест масштаба пропущен в -short")
		return
	}
	done := make(chan string, 1) // "" — вернулась, иначе текст паники
	start := time.Now()
	go func() {
		defer func() {
			if p := recover(); p != nil {
				done <- fmt.Sprintf("%v\n%s", p, debug.Stack())
			}
		}()
		run()
		done <- ""
	}()
	select {
	case p := <-done:
		if p != "" {
			t.Fatalf("паника на большом входе: %s — %s", what, p)
			return
		}
		t.Logf("уложилось за %v (срок %v)", time.Since(start).Round(time.Millisecond), limit)
	case <-time.After(limit):
		t.Fatalf("не уложилось в %v: %s", limit, what)
	}
}
