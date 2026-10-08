package probabilistic

import (
	"fmt"
	"testing"
)

// Пустой фильтр не содержит ничего — все биты нули, любой из k бит равен 0.
func TestBloomEmptyFilter(t *testing.T) {
	b := NewBloom(256, 3)
	if b.MightContain([]byte("anything")) {
		t.Error("пустой фильтр не должен содержать ничего")
	}
}

// Главная гарантия Bloom: ложноотрицательных ответов НЕ бывает.
// Всё, что добавили, обязано находиться.
func TestBloomNoFalseNegatives(t *testing.T) {
	b := NewBloom(4096, 4)
	var added [][]byte
	for i := 0; i < 300; i++ {
		x := []byte(fmt.Sprintf("item-%d", i))
		b.Add(x)
		added = append(added, x)
	}
	for _, x := range added {
		if !b.MightContain(x) {
			t.Errorf("ложноотрицательный ответ для %q — Bloom так ошибаться не может", x)
		}
	}
}

// Разные элементы должны давать разные наборы бит: сразу после Add одного
// элемента посторонний, как правило, ещё не «содержится».
func TestBloomDistinguishes(t *testing.T) {
	b := NewBloom(1024, 4)
	b.Add([]byte("cat"))
	if !b.MightContain([]byte("cat")) {
		t.Error("добавленный элемент должен находиться")
	}
	// Проверяем набор заведомо отсутствующих: почти все должны вернуть false.
	present := 0
	for i := 0; i < 100; i++ {
		if b.MightContain([]byte(fmt.Sprintf("absent-%d", i))) {
			present++
		}
	}
	if present > 5 {
		t.Errorf("слишком много посторонних элементов «нашлось» (%d из 100) — проверьте хеши/биты", present)
	}
}

// Частота ложных срабатываний должна быть низкой при разумном размере.
// ~1000 элементов в 10000 бит с 7 хешами → теоретически ~1%.
func TestBloomFalsePositiveRateLow(t *testing.T) {
	b := NewBloom(10000, 7)
	for i := 0; i < 1000; i++ {
		b.Add([]byte(fmt.Sprintf("in-%d", i)))
	}
	fp, trials := 0, 5000
	for i := 0; i < trials; i++ {
		if b.MightContain([]byte(fmt.Sprintf("out-%d", i))) {
			fp++
		}
	}
	if rate := float64(fp) / float64(trials); rate > 0.05 {
		t.Errorf("частота ложных срабатываний %.3f слишком высока (ожидали < 0.05)", rate)
	}
}
