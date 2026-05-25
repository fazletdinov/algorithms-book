# Строковые алгоритмы: поиск подстроки

## Описание

Задача поиска подстроки — найти первое вхождение образца `pattern` (длины `m`) в текст
`text` (длины `n`). **Наивный** подход сравнивает образец с каждой позицией текста за
O(n · m): при несовпадении он «забывает» всё, что уже сравнил, и начинает заново.

Два классических алгоритма доводят это до **O(n + m)**, по-разному переиспользуя
информацию: **KMP** — через предвычисленную префикс-функцию, **Rabin–Karp** — через
скользящий хеш.

## Knuth–Morris–Pratt (KMP)

Идея: при несовпадении не возвращать указатель текста назад, а сдвинуть образец на
максимально возможную величину, используя уже совпавший префикс. Для этого считают
**префикс-функцию** (LPS, *longest proper prefix which is also suffix*): `lps[i]` —
длина наибольшего собственного префикса `pattern[0..i]`, совпадающего с его суффиксом.

```go
// lps[i] — длина наибольшего префикса-суффикса для pattern[:i+1]
func buildLPS(pattern string) []int {
    lps := make([]int, len(pattern))
    length := 0
    for i := 1; i < len(pattern); {
        if pattern[i] == pattern[length] {
            length++
            lps[i] = length
            i++
        } else if length > 0 {
            length = lps[length-1] // откатываемся по уже посчитанным префиксам
        } else {
            lps[i] = 0
            i++
        }
    }
    return lps
}

func kmpSearch(text, pattern string) int {
    if len(pattern) == 0 {
        return 0
    }
    lps := buildLPS(pattern)
    i, j := 0, 0 // i — по тексту, j — по образцу
    for i < len(text) {
        if text[i] == pattern[j] {
            i++
            j++
            if j == len(pattern) {
                return i - j // нашли вхождение
            }
        } else if j > 0 {
            j = lps[j-1] // сдвигаем образец, НЕ трогая i
        } else {
            i++
        }
    }
    return -1
}
```

**Сложность:** O(n + m) по времени, O(m) на массив `lps`. Указатель текста `i` никогда
не уменьшается — в этом весь выигрыш.

## Rabin–Karp

Идея: сравнивать не символы, а **хеши**. Считаем полиномиальный хеш образца и хеш
каждого окна длины `m` в тексте. Хеш окна обновляется за O(1) по принципу **скользящего
окна** (rolling hash): убрали левый символ, добавили правый. Совпали хеши — проверяем
строки посимвольно (защита от коллизий).

```go
func rabinKarp(text, pattern string) int {
    n, m := len(text), len(pattern)
    if m == 0 {
        return 0
    }
    if m > n {
        return -1
    }
    const base, mod = 256, 1_000_000_007

    power := 1 // base^(m-1) % mod — вклад самого левого символа окна
    for i := 0; i < m-1; i++ {
        power = power * base % mod
    }

    var patHash, winHash int
    for i := 0; i < m; i++ {
        patHash = (patHash*base + int(pattern[i])) % mod
        winHash = (winHash*base + int(text[i])) % mod
    }

    for i := 0; i+m <= n; i++ {
        if patHash == winHash && text[i:i+m] == pattern {
            return i
        }
        if i+m < n { // сдвигаем окно вправо
            remove := int(text[i]) * power % mod
            winHash = ((winHash-remove+mod)*base + int(text[i+m])) % mod
        }
    }
    return -1
}
```

**Сложность:** O(n + m) в среднем; в худшем случае (много коллизий) — O(n · m), но при
хорошем `mod` это редкость. Rabin–Karp особенно удобен для поиска **нескольких** образцов
сразу и для задач со сравнением подстрок по хешу.

## Сравнение

| Алгоритм     | Время (средн.) | Время (худш.) | Память | Когда выбирать                       |
|--------------|----------------|---------------|--------|--------------------------------------|
| Наивный      | O(n · m)       | O(n · m)      | O(1)   | короткие строки, разовый поиск       |
| KMP          | O(n + m)       | O(n + m)      | O(m)   | гарантированно линейный поиск одного образца |
| Rabin–Karp   | O(n + m)       | O(n · m)      | O(1)   | несколько образцов, сравнение по хешу |

## Визуализация

> 💡 **Интерактивная демонстрация (KMP).** Нажимайте «▶»: образец скользит под текстом,
> зелёным отмечено совпадение символа, красным — несовпадение. При несовпадении образец
> сдвигается по префикс-функции, а указатель текста не откатывается назад. (Виджет
> работает в собранной книге `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="kmp" data-text="abxabcabcaby" data-pattern="abcaby"></div>

## Типичные ошибки

1. **В KMP двигают указатель текста назад** — теряется весь смысл; назад откатывается
   только `j` через `lps`.
2. **Неверная префикс-функция** — самая частая ошибка; протестируйте `buildLPS`
   отдельно (например, `"aabaab"` → `[0,1,0,1,2,3]`).
3. **Rabin–Karp без проверки строк при совпадении хешей** — коллизии дадут ложные
   срабатывания.
4. **Переполнение/отрицательные значения хеша** — берите остаток по модулю и
   добавляйте `mod` перед `%`, чтобы избежать отрицательных чисел.
5. **Пустой образец** — договоритесь о соглашении (здесь — возвращаем 0).

## Примеры задач на LeetCode

- [Find the Index of the First Occurrence in a String](https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/) — strStr (KMP)
- [Repeated String Match](https://leetcode.com/problems/repeated-string-match/)
- [Shortest Palindrome](https://leetcode.com/problems/shortest-palindrome/) — префикс-функция
- [Longest Happy Prefix](https://leetcode.com/problems/longest-happy-prefix/) — прямое применение LPS

## Упражнения

В [Go-тренажёре](https://github.com/fazletdinov/algorithms-book/tree/main/exercises)
есть пакет `strmatch`:

```bash
cd exercises
go test ./strmatch/                 # ваши решения
go test -tags solution ./strmatch/  # эталон
```

Реализуйте `KMPSearch` и `RabinKarp` — обе ищут первое вхождение образца.

## Связанные шаблоны

- **[Sliding Window](sliding-window.md)** — Rabin–Karp это скользящее окно по хешу.
- **[Two Pointers](two-pointers.md)** — базовая техника движения указателей по строке.
- **[Trie](trie.md)** — для поиска множества образцов одновременно.
