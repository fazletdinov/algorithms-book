# 🔀 Merge Intervals (Слияние интервалов)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Merge Intervals <span class="algo-hero__ru">Слияние интервалов</span></div>
    <div class="algo-hero__tag">Слить перекрытия, найти пересечения, вставить интервал</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Время</span><b>O(n log n)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(n)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>работаете с интервалами, которые могут перекрываться</li>
      <li>нужно объединить перекрытия или найти их пересечения</li>
      <li>временные диапазоны, расписания, сегменты, переговорки</li>
      <li>вставить новый интервал в отсортированный список</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>данные не интервальные (одиночные точки/значения)</li>
      <li>порядок не имеет смысла и сортировать нельзя</li>
      <li>интервалы многомерные (прямоугольники) — нужен другой подход</li>
      <li>достаточно простого пересчёта без объединения</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«интервалы», «диапазоны», «[start, end]»</b> · «слить перекрывающиеся», «вставить интервал», «расписание / переговорки / встречи», «пересечение списков».</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li>сначала <b>сортируем по началу</b> — тогда достаточно смотреть лишь на последний в результате;</li>
      <li>перекрытие: <code>current.start ≤ last.end</code>;</li>
      <li>при слиянии конец = <code>max(last.end, current.end)</code> (не присваивай вслепую!);</li>
      <li>разрыв → начинаем новый интервал в результате.</li>
    </ul>
    <p>Сортировка превращает наивное O(n²) (проверка всех пар) в O(n log n): один проход после сортировки.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация.** Сверху — исходные интервалы на числовой прямой (жёлтым
> подсвечен текущий), снизу — результат слияния, который растёт по мере прохода. Справа — код
> с подсветкой строки и переменные, внизу — кликабельные шаги. Можно подставить свои интервалы
> и нажать «⟲ Запустить». (Виджет работает в собранной книге `mdbook serve`/`mdbook build`, а не
> при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="merge-intervals" data-intervals="1-3,2-6,8-10,15-18"></div>

## ⚡ Шаблон для собеседования

```go
sort.Slice(intervals, func(i, j int) bool {
    return intervals[i][0] < intervals[j][0] // по началу
})
result := [][]int{intervals[0]}
for i := 1; i < len(intervals); i++ {
    cur, last := intervals[i], result[len(result)-1]
    if cur[0] <= last[1] {                 // перекрытие
        last[1] = max(last[1], cur[1])     // расширяем конец
    } else {                               // разрыв
        result = append(result, cur)       // новый интервал
    }
}
return result
```

1. сортируем по началу;
2. кладём первый интервал в результат;
3. для каждого следующего сравниваем `cur.start` с `last.end`;
4. перекрытие → расширяем `last.end`; разрыв → добавляем новый.

## 📖 Разбор

<details class="algo-details">
<summary>Теория, слияние, вставка интервала и сложность</summary>

**Merge Intervals** — техника для работы с перекрывающимися интервалами: их слияния,
поиска пересечений и вставки новых интервалов в отсортированный список.

Ключевая идея: если интервалы отсортированы по начальной точке, то для проверки
перекрытия достаточно сравнить начало текущего интервала с концом последнего
объединённого. Два интервала `[a, b]` и `[c, d]` перекрываются при `a <= d && c <= b`;
при слиянии получаем `[min(a, c), max(b, d)]`. Сортировка превращает задачу из O(n²)
в O(n log n).

```go
func mergeIntervals(intervals [][]int) [][]int {
    if len(intervals) == 0 {
        return [][]int{}
    }
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

#### Вставка интервала

Для вставки нового интервала в уже отсортированный список делаем один проход:
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

#### Сложность

| Операция          | Время       | Память |
|-------------------|-------------|--------|
| Слияние интервалов | O(n log n) | O(n)   |
| Вставка интервала  | O(n)       | O(n)   |

Для слияния доминирует сортировка O(n log n), сам проход линеен. Вставка не требует
сортировки — вход уже упорядочен.

</details>

## 🧠 Почему это корректно

### Почему сортировки по началу достаточно

После сортировки по началу действует ключевой факт:

> Расширить текущий интервал может **только** последний добавленный в результат. Все
> более ранние результирующие интервалы заканчиваются раньше, чем начинается текущий
> (начала отсортированы, а эти интервалы уже были отделены разрывом).

Поэтому сравнение лишь с `result[last]` ничего не пропускает. Это тот же принцип, что у
[двух указателей](two-pointers.md): сортировка делает решение **локальным**. Инвариант:
`result` всегда хранит непересекающиеся интервалы по возрастанию; очередной либо
продлевает последний (`current.start <= last.end`), либо начинает новый.

При сортировке по началу условие перекрытия `a <= d && c <= b` упрощается до
`current.start <= last.end` — вторая половина выполнена автоматически.

## ⚙️ Цена на практике

### Сортировка — это и есть стоимость

Слияние — `O(n log n)`, где доминирует **сортировка**; сам проход линеен. Не заявляй
`O(n)`. А вот **вставка** интервала — честные `O(n)`: вход уже отсортирован, сортировать
не нужно. Увидел «список уже упорядочен» — не сортируй заново.

## ⚠️ Типичные ошибки

1. **Забыли отсортировать** перед проходом — без сортировки сравнение только с
   последним интервалом некорректно.
2. **Неверное объединение концов** — берите `max(last[1], current[1])`, иначе
   присваивание `last[1] = current[1]` может *уменьшить* интервал.
3. **Неправильная проверка перекрытия** — условие именно `current[0] <= last[1]`
   (с учётом равенства, если касание считается перекрытием).
4. **Пустой вход** — обращение к `intervals[0]` упадёт; обработайте `len == 0`.
5. **Некорректный интервал** (`start > end`) — при необходимости валидируйте вход.

## 🧩 Задачи

**LeetCode:**

- [Merge Intervals](https://leetcode.com/problems/merge-intervals/)
- [Insert Interval](https://leetcode.com/problems/insert-interval/)
- [Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/)
- [Meeting Rooms II](https://leetcode.com/problems/meeting-rooms-ii/)
- [Interval List Intersections](https://leetcode.com/problems/interval-list-intersections/)
- [Employee Free Time](https://leetcode.com/problems/employee-free-time/) (сложная)
- [Minimum Number of Arrows to Burst Balloons](https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/)

**Тренажёр** — пакет `intervals`:

```bash
cd exercises
go test ./intervals/                 # ваши решения
go test -tags solution ./intervals/  # эталон
```

Реализуйте `MergeIntervals` (слить пересекающиеся), `InsertInterval`
(вставить и слить), `IntervalsIntersection` (пересечения двух списков),
`CanAttendAllMeetings` (без наложений) и `MinMeetingRooms` (минимум переговорок).

## 🔗 Связанные шаблоны

- **[Two Pointers](two-pointers.md)** — пересечение двух списков интервалов удобно
  искать двумя указателями.
- **[Cyclic Sort](cyclic-sort.md)** — другой шаблон для работы с упорядоченными данными.
- **[Modified Binary Search](modified-binary-search.md)** — позицию вставки интервала
  можно искать бинарным поиском.
- Для общей теории по памяти и профилированию в Go см.
  [приложение](appendix-go-memory.md).
