# Sliding Window (Скользящее окно)

## Теория

**Скользящее окно** — техника для операций над подмассивами или подстроками
**фиксированного** или **переменного** размера в линейной структуре (массив, строка).

Ключевая идея — **инкрементальное обновление**: переходя к следующему окну, мы
добавляем один новый элемент и убираем один старый, вместо полного пересчёта. Это
снижает сложность с O(n·k) (наивный пересчёт каждого окна) до **O(n)**.

**Когда применять:**

- данные линейны (массив, строка, список);
- нужно найти самый длинный/короткий/оптимальный подмассив или подстроку;
- задача о подмассиве фиксированного размера `k`;
- решение можно ускорить, переиспользуя вычисления соседнего окна.

## Алгоритм

Различают два типа окон.

### Фиксированное окно

Размер `k` постоянен. Считаем сумму первого окна, затем двигаем границу, добавляя
`arr[i]` и вычитая `arr[i-k]`.

```go
func maxSumSubarray(arr []int, k int) int {
    if k <= 0 || k > len(arr) {
        return 0
    }
    windowSum := 0
    for i := 0; i < k; i++ {
        windowSum += arr[i]
    }
    maxSum := windowSum
    for i := k; i < len(arr); i++ {
        windowSum += arr[i] - arr[i-k] // +новый, −старый за O(1)
        if windowSum > maxSum {
            maxSum = windowSum
        }
    }
    return maxSum
}
```

### Переменное окно

Размер меняется под условие: расширяем окно правой границей `right`, а при нарушении
условия сжимаем слева `left`. Состояние окна (счётчики, частоты) держим в `map` или
переменной.

```go
// Самая длинная подстрока, где не более k различных символов
func longestKDistinct(s string, k int) int {
    freq := make(map[byte]int)
    left, maxLen := 0, 0
    for right := 0; right < len(s); right++ {
        freq[s[right]]++
        for len(freq) > k { // условие нарушено — сжимаем слева
            freq[s[left]]--
            if freq[s[left]] == 0 {
                delete(freq, s[left])
            }
            left++
        }
        if cur := right - left + 1; cur > maxLen {
            maxLen = cur
        }
    }
    return maxLen
}
```

Порядок шагов для переменного окна: **расширить** (`right++`) → **проверить условие** →
**сжать** при необходимости (`left++`) → **обновить результат**.

### Сложность

| Тип окна            | Время | Память                          |
|---------------------|-------|----------------------------------|
| Фиксированное       | O(n)  | O(1)                             |
| Переменное          | O(n)  | O(k) или O(σ) (σ — размер алфавита) |

Переменное окно линейно, потому что каждый элемент добавляется и удаляется не более
одного раза (и `left`, и `right` проходят массив всего по разу).

## Визуализация

> 💡 **Интерактивная демонстрация.** Нажимайте «▶», чтобы увидеть, как окно скользит по
> массиву и пересчитывает сумму за O(1). (Виджет работает в собранной книге
> `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="sliding-window-fixed" data-array="1,2,3,4,5,6" data-k="3"></div>

Разбор для `[1, 2, 3, 4, 5, 6]`, `k = 3`:

```
[1 2 3] 4  5  6   sum = 6
 1 [2 3 4] 5  6   sum = 6 − 1 + 4 = 9
 1  2 [3 4 5] 6   sum = 9 − 2 + 5 = 12
 1  2  3 [4 5 6]  sum = 12 − 3 + 6 = 15   ← максимум
```

Каждый сдвиг — две операции (`+новый`, `−старый`), а не пересчёт всех `k` элементов.

## Типичные ошибки

1. **Пересчёт всей суммы окна заново** в цикле — это возвращает O(n·k). Обновляйте
   инкрементально: `windowSum += arr[right] - arr[left]`.
2. **Off-by-one в размере окна** — длина окна это `right - left + 1`, а не `right - left`.
3. **Забыли обновить результат после сжатия** переменного окна — обновляйте `maxLen`
   после того, как условие снова выполнено.
4. **Неверный момент пометки в `map`** — увеличивайте/уменьшайте частоты строго при
   входе элемента в окно и выходе из него, иначе состояние «съезжает».
5. **Не обработаны границы** — пустой массив, `k > len(arr)`, `k = 0`.

## Задачи

**LeetCode:**

- [Maximum Average Subarray I](https://leetcode.com/problems/maximum-average-subarray-i/) (фиксированное окно)
- [Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/)
- [Longest Substring with At Most K Distinct Characters](https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters/)
- [Fruit Into Baskets](https://leetcode.com/problems/fruit-into-baskets/)
- [Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/) (сложная)
- [Sliding Window Maximum](https://leetcode.com/problems/sliding-window-maximum/) (с deque)

**Тренажёр** — пакет `slidingwindow`:

```bash
cd exercises
go test ./slidingwindow/                 # ваши решения
go test -tags solution ./slidingwindow/  # эталон
```

Реализуйте `MaxSumSubarray` (фиксированное окно), `LongestSubstringKDistinct`
(≤k различных символов), `SmallestSubarrayWithSum` (минимальная длина с суммой ≥ target),
`LongestSubstringNoRepeat` (без повторов) и `MaxSlidingWindow` (максимум окна через дек).

## Связанные шаблоны

- **[Two Pointers](two-pointers.md)** — окно задаётся двумя указателями; родственная
  техника для отсортированных массивов и пар.
- **[Modified Binary Search](modified-binary-search.md)** — иногда оптимальный размер
  окна ищут бинарным поиском.
- Для общей теории по памяти и профилированию в Go см.
  [приложение](appendix-go-memory.md).
