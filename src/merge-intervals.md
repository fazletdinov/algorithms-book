# Merge Intervals (Слияние интервалов)

## Теория

**Merge Intervals** — техника для работы с перекрывающимися интервалами: их слияния,
поиска пересечений и вставки новых интервалов в отсортированный список.

Ключевая идея: если интервалы отсортированы по начальной точке, то для проверки
перекрытия достаточно сравнить начало текущего интервала с концом последнего
объединённого. Два интервала `[a, b]` и `[c, d]` перекрываются при `a <= d && c <= b`;
при слиянии получаем `[min(a, c), max(b, d)]`. Сортировка превращает задачу из O(n²)
(проверка всех пар) в O(n log n).

**Когда применять:**

- работаете с интервалами, которые могут перекрываться;
- нужно объединить перекрытия или найти их пересечения;
- задача связана с временными диапазонами, расписаниями или сегментами;
- нужно вставить новый интервал в отсортированный список.

## Алгоритм

Сортируем по началу, затем идём в один проход, сравнивая текущий интервал только с
последним в результате.

```go
func mergeIntervals(intervals [][]int) [][]int {
    if len(intervals) == 0 {
        return [][]int{}
    }
    // Сортировка по началу — после неё достаточно смотреть только на последний интервал
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i][0] < intervals[j][0]
    })

    result := [][]int{intervals[0]}
    for i := 1; i < len(intervals); i++ {
        current := intervals[i]
        last := result[len(result)-1]
        if current[0] <= last[1] { // перекрытие
            if current[1] > last[1] {
                last[1] = current[1] // расширяем конец до максимума
            }
        } else {
            result = append(result, current) // разрыв — новый интервал
        }
    }
    return result
}
```

Для **вставки** нового интервала в уже отсортированный список делаем один проход:
интервалы, заканчивающиеся до нового, копируем как есть; пересекающиеся поглощаем,
расширяя границы нового; остальные добавляем после.

```go
func insertInterval(intervals [][]int, newInterval []int) [][]int {
    var result [][]int
    i, n := 0, len(intervals)

    for i < n && intervals[i][1] < newInterval[0] { // целиком слева
        result = append(result, intervals[i])
        i++
    }
    merged := []int{newInterval[0], newInterval[1]}
    for i < n && intervals[i][0] <= merged[1] { // перекрытие — поглощаем
        if intervals[i][0] < merged[0] {
            merged[0] = intervals[i][0]
        }
        if intervals[i][1] > merged[1] {
            merged[1] = intervals[i][1]
        }
        i++
    }
    result = append(result, merged)

    for i < n { // целиком справа
        result = append(result, intervals[i])
        i++
    }
    return result
}
```

### Сложность

| Операция          | Время       | Память |
|-------------------|-------------|--------|
| Слияние интервалов | O(n log n) | O(n)   |
| Вставка интервала  | O(n)       | O(n)   |

Для слияния доминирует сортировка O(n log n), сам проход линеен. Вставка не требует
сортировки — вход уже упорядочен.

## Визуализация

> 💡 **Интерактивная демонстрация.** Нажимайте «▶»: сверху — исходные интервалы (жёлтым
> подсвечен текущий), снизу — результат слияния, который растёт по мере прохода. (Виджет
> работает в собранной книге `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="merge-intervals" data-intervals="1-3,2-6,8-10,15-18"></div>

Слияние `[[1,3], [2,6], [8,10], [15,18]]` (уже отсортированы по началу):

```
[1,3]                       result: [1,3]
[2,6]   2 ≤ 3 → перекрытие  result: [1,6]   (конец = max(3,6))
[8,10]  8 > 6 → разрыв      result: [1,6] [8,10]
[15,18] 15 > 10 → разрыв    result: [1,6] [8,10] [15,18]
```

На числовой оси первые два интервала сливаются, остальные стоят отдельно:

```
        1   3
        └───┘
          2     6
          └─────┘   →  [1────6]   [8──10]      [15───18]
                 8  10
                 └──┘
                            15    18
                            └─────┘
```

Результат: `[[1,6], [8,10], [15,18]]`.

## Типичные ошибки

1. **Забыли отсортировать** перед проходом — без сортировки сравнение только с
   последним интервалом некорректно.
2. **Неверное объединение концов** — берите `max(last[1], current[1])`, иначе
   присваивание `last[1] = current[1]` может *уменьшить* интервал.
3. **Неправильная проверка перекрытия** — условие именно `current[0] <= last[1]`
   (с учётом равенства, если касание считается перекрытием).
4. **Пустой вход** — обращение к `intervals[0]` упадёт; обработайте `len == 0`.
5. **Некорректный интервал** (`start > end`) — при необходимости валидируйте вход.

## Задачи

**LeetCode:**

- [Merge Intervals](https://leetcode.com/problems/merge-intervals/)
- [Insert Interval](https://leetcode.com/problems/insert-interval/)
- [Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/)
- [Meeting Rooms II](https://leetcode.com/problems/meeting-rooms-ii/)
- [Interval List Intersections](https://leetcode.com/problems/interval-list-intersections/)
- [Employee Free Time](https://leetcode.com/problems/employee-free-time/) (сложная)
- [Minimum Number of Arrows to Burst Balloons](https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/)

## Связанные шаблоны

- **[Two Pointers](two-pointers.md)** — пересечение двух списков интервалов удобно
  искать двумя указателями.
- **[Cyclic Sort](cyclic-sort.md)** — другой шаблон для работы с упорядоченными данными.
- **[Modified Binary Search](modified-binary-search.md)** — позицию вставки интервала
  можно искать бинарным поиском.
- Для общей теории по памяти и профилированию в Go см.
  [приложение](appendix-go-memory.md).
