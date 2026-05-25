# Modified Binary Search (Модифицированный бинарный поиск)

## Теория

**Modified Binary Search** расширяет классический бинарный поиск на задачи, где
ищут не точное значение, а **границу монотонного предиката**: первое/последнее
вхождение, позицию вставки, минимум в повернутом массиве, элемент в 2D-матрице.

Ключевая идея: бинарный поиск работает для любого монотонного условия. Меняя
условие сравнения и правило обновления границ, мы решаем разные задачи поиска за
**O(log n)**, сохраняя инвариант «решение, если оно есть, лежит в `[left, right]`».

**Когда применять:**

- массив отсортирован (полностью или частично — например, повернут);
- нужно первое/последнее вхождение или позиция вставки;
- ищем границу диапазона значений;
- пространство поиска монотонно (значение, индекс, ответ в матрице).

## Алгоритм

Делим интервал `[left, right]` пополам, сравниваем `arr[mid]` с `target` и
отбрасываем половину, где `target` заведомо нет. `mid` считаем как
`left + (right-left)/2`, чтобы избежать переполнения.

```go
// Классический поиск точного значения
func binarySearch(arr []int, target int) int {
    left, right := 0, len(arr)-1
    for left <= right {
        mid := left + (right-left)/2
        switch {
        case arr[mid] == target:
            return mid
        case arr[mid] < target:
            left = mid + 1 // ищем в правой половине
        default:
            right = mid - 1 // ищем в левой половине
        }
    }
    return -1 // не найдено
}
```

Для **первого вхождения** при равенстве не останавливаемся, а продолжаем сжимать
правую границу — так находим самый левый индекс с `target`.

```go
func findFirstOccurrence(arr []int, target int) int {
    left, right := 0, len(arr)-1
    result := -1
    for left <= right {
        mid := left + (right-left)/2
        switch {
        case arr[mid] == target:
            result = mid    // запоминаем и продолжаем влево
            right = mid - 1
        case arr[mid] < target:
            left = mid + 1
        default:
            right = mid - 1
        }
    }
    return result
}
```

В **повернутом массиве** одна из половин `[left..mid]` или `[mid..right]` всегда
отсортирована. Проверяем `arr[left] <= arr[mid]`: если да — отсортирована левая
половина, иначе правая. Ищем `target` только в отсортированной половине.

Идиоматичный Go использует `sort.Search` — он находит наименьший индекс, для
которого предикат истинен:

```go
import "sort"

func searchIdiomatic(arr []int, target int) int {
    i := sort.Search(len(arr), func(i int) bool {
        return arr[i] >= target
    })
    if i < len(arr) && arr[i] == target {
        return i
    }
    return -1
}
```

### Сложность

| Случай       | Время    | Память |
|--------------|----------|--------|
| Лучший       | O(1)     | O(1)   |
| Средний/худший | O(log n) | O(1)   |

На каждом шаге интервал уменьшается вдвое, отсюда не более `log₂(n)` шагов; память
константна — храним только индексы.

## Визуализация

> 💡 **Интерактивная демонстрация.** Нажимайте «▶»: жёлтой рамкой отмечен `mid`,
> синим — текущий диапазон поиска `[lo, hi]`. (Виджет работает в собранной книге
> `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="binary-search" data-array="1,3,5,7,9,11,13" data-target="9"></div>

Поиск первого вхождения `target = 2` в `[1, 2, 2, 2, 3, 4, 5]`:

```
[1 2 2 2 3 4 5]  left=0 right=6 mid=3  arr[3]=2 == 2  → запомнили, right=2
[1 2 2]2 3 4 5   left=0 right=2 mid=1  arr[1]=2 == 2  → запомнили, left=0..right=0
[1]2 2 2 3 4 5   left=0 right=0 mid=0  arr[0]=1 < 2   → left=1
                 left > right → стоп. Результат: индекс 1
```

При равенстве не выходим сразу, а сдвигаем `right` влево — поэтому находим самый
левый из дубликатов.

## Типичные ошибки

1. **Переполнение `mid`** — считайте `left + (right-left)/2`, а не
   `(left + right)/2`.
2. **Неверное условие цикла** — `left <= right` ищет в закрытом интервале;
   `left < right` (с `right = mid`) — для поиска границы. Смешивать нельзя.
3. **Неправильное обновление границ** — для первого вхождения при равенстве надо
   двигать `right = mid - 1`, а не возвращать `mid` сразу.
4. **Повернутый массив**: забыли определить отсортированную половину перед
   отбрасыванием — тогда теряете `target`.
5. **Не обработаны границы** — пустой массив, один элемент, `target` вне диапазона.

## Задачи

**LeetCode:**

- [Binary Search](https://leetcode.com/problems/binary-search/)
- [Search Insert Position](https://leetcode.com/problems/search-insert-position/)
- [First Bad Version](https://leetcode.com/problems/first-bad-version/)
- [Find First and Last Position of Element in Sorted Array](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/)
- [Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/)
- [Search a 2D Matrix](https://leetcode.com/problems/search-a-2d-matrix/)
- [Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/)
- [Median of Two Sorted Arrays](https://leetcode.com/problems/median-of-two-sorted-arrays/) (сложная)

**Тренажёр** — пакет `binarysearch`:

```bash
cd exercises
go test ./binarysearch/                 # ваши решения
go test -tags solution ./binarysearch/  # эталон
```

Реализуйте `Search` (поиск точного значения) и `FindCeiling` (наименьший элемент,
не меньший `key` — поиск границы предиката).

## Связанные шаблоны

- **[Sliding Window](sliding-window.md)** — иногда оптимальный размер окна ищут
  бинарным поиском по ответу.
- **[Cyclic Sort](cyclic-sort.md)** — работа с массивами в фиксированном диапазоне.
- **[K-way Merge](k-way-merge.md)** — слияние отсортированных массивов.
- Для общей теории по памяти и профилированию в Go см.
  [приложение](appendix-go-memory.md).
