//go:build !solution

// Package numbertheory — базовые алгоритмы теории чисел для собеседований.
// Теория и разбор — в книге: ../../src/number-theory.md
//
// Реализуй функции ниже, затем запусти тесты:
//
//	go test ./numbertheory/
//
// Тесты должны стать зелёными. Эталон лежит в numbertheory_solution.go;
// убедиться, что он проходит те же тесты:
//
//	go test -tags solution ./numbertheory/
package numbertheory

// GCD возвращает наибольший общий делитель a и b (неотрицательный).
// GCD(0, 0) = 0.
//
// Пример: GCD(48, 36) = 12.
//
// Ожидаемая сложность: O(log(min(a, b))) — алгоритм Евклида.
func GCD(a, b int) int {
	// TODO: алгоритм Евклида — пока b != 0, заменяй (a, b) на (b, a % b).
	panic("TODO: реализуй GCD")
}

// LCM возвращает наименьшее общее кратное a и b (неотрицательное).
// Если a или b равно 0 — верни 0.
//
// Пример: LCM(4, 6) = 12.
//
// Ожидаемая сложность: O(log(min(a, b))).
func LCM(a, b int) int {
	// TODO: LCM = |a / GCD(a,b) * b|. Дели ДО умножения, чтобы не переполниться.
	panic("TODO: реализуй LCM")
}

// IsPrime сообщает, является ли n простым числом.
//
// Пример: IsPrime(7) = true, IsPrime(1) = false, IsPrime(9) = false.
//
// Ожидаемая сложность: O(sqrt(n)) — пробное деление до корня.
func IsPrime(n int) bool {
	// TODO: n < 2 — не простое; проверяй делители до sqrt(n) (i*i <= n).
	panic("TODO: реализуй IsPrime")
}

// SieveOfEratosthenes возвращает все простые числа в диапазоне [2, n]
// по возрастанию. Если n < 2 — верни пустой срез.
//
// Пример: SieveOfEratosthenes(11) = [2, 3, 5, 7, 11].
//
// Ожидаемая сложность: O(n log log n) по времени, O(n) по памяти.
func SieveOfEratosthenes(n int) []int {
	// TODO: заведи []bool размера n+1; для каждого невычеркнутого p добавь его
	// в ответ и вычеркни кратные, начиная с p*p, шагом p.
	panic("TODO: реализуй SieveOfEratosthenes")
}

// PowMod возвращает (base^exp) mod m методом быстрого возведения в степень.
// Гарантируется exp >= 0 и m >= 1.
//
// Пример: PowMod(2, 10, 1000) = 24 (1024 mod 1000).
//
// Ожидаемая сложность: O(log exp) умножений.
func PowMod(base, exp, m int) int {
	// TODO: бинарное возведение — пока exp > 0: если младший бит exp равен 1,
	// домножь результат на base (по модулю); затем base = base*base % m, exp >>= 1.
	panic("TODO: реализуй PowMod")
}
