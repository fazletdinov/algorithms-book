package probabilistic

import (
	"fmt"
	"math/rand"
	"testing"
)

// randBytes — случайная строка байт длины 1..16 (сырые байты, не только ASCII).
func randBytes(rng *rand.Rand) []byte {
	b := make([]byte, 1+rng.Intn(16))
	for i := range b {
		b[i] = byte(rng.Intn(256))
	}
	return b
}

// TestBloomNoFalseNegativesRandom: жёсткое свойство Bloom — ложноотрицательных
// НЕ бывает ни при каких параметрах. Гоняем случайные множества на нарочно
// крошечных фильтрах (вплоть до m=1 после guard'а от NewBloom(0,0)): даже
// полностью насыщенный битами фильтр обязан отвечать true на всё добавленное.
// Сид фиксирован → падение воспроизводимо.
func TestBloomNoFalseNegativesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2616))
	for run := 0; run < 100; run++ {
		m := uint(rng.Intn(1025)) // 0..1024, включая вырожденный m=0
		k := uint(rng.Intn(6))    // 0..5, включая вырожденный k=0
		b := NewBloom(m, k)
		n := 1 + rng.Intn(200)
		added := make([][]byte, n)
		for i := 0; i < n; i++ {
			added[i] = randBytes(rng)
			b.Add(added[i])
		}
		for i := 0; i < n; i++ {
			if !b.MightContain(added[i]) {
				t.Fatalf("run %d (m=%d k=%d): ложноотрицательный ответ для %v",
					run, m, k, added[i])
			}
		}
	}
}

// TestBloomFalsePositiveRateRandom: на случайных (а не последовательных, как в
// базовом тесте) ключах частота ложных срабатываний остаётся в допуске.
// 1000 элементов в 10000 бит с 7 хешами — теоретический FP ≈ 1%; порог 0.05
// даёт пятикратный запас, при фиксированном сиде результат детерминирован
// (проверено на стабильность с -count=5). Множества «внутри»/«снаружи»
// заведомо не пересекаются за счёт разных префиксов.
func TestBloomFalsePositiveRateRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2617))
	b := NewBloom(10000, 7)
	for i := 0; i < 1000; i++ {
		b.Add([]byte(fmt.Sprintf("in:%x", rng.Int63())))
	}
	fp, trials := 0, 5000
	for i := 0; i < trials; i++ {
		if b.MightContain([]byte(fmt.Sprintf("out:%x", rng.Int63()))) {
			fp++
		}
	}
	if rate := float64(fp) / float64(trials); rate > 0.05 {
		t.Errorf("частота ложных срабатываний %.4f выше допуска 0.05", rate)
	}
}
