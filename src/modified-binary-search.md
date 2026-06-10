# 🔍 Modified Binary Search (Модифицированный бинарный поиск)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Modified Binary Search <span class="algo-hero__ru">Бинарный поиск</span></div>
    <div class="algo-hero__tag">Значение, граница или позиция вставки в отсортированном за логарифм</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Время</span><b>O(log n)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(1)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>массив отсортирован (целиком или частично — повёрнут)</li>
      <li>ищем значение, первое/последнее вхождение, позицию вставки</li>
      <li>пространство поиска <b>монотонно</b> (значение, индекс, «ответ»)</li>
      <li>нужно O(log n) вместо линейного прохода</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>данные не отсортированы и нет монотонного предиката</li>
      <li>нет доступа к элементу по индексу за O(1)</li>
      <li>нужно перебрать все элементы (поиск максимума в хаосе)</li>
      <li>условие немонотонно (то истинно, то ложно)</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«отсортированный массив»</b> · просят <b>O(log n)</b> · «первое/последнее вхождение», «позиция вставки», «повёрнутый массив», «минимум/пик», «квадратный корень». Монотонность → бинарный поиск.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li>инвариант: ответ, если он есть, всегда лежит в <code>[left, right]</code>;</li>
      <li>сравнили середину → <b>отбросили половину</b>, где ответа точно нет;</li>
      <li><code>left &lt;= right</code> — поиск значения; <code>left &lt; right</code> (с <code>right = mid</code>) — поиск границы;</li>
      <li>первое вхождение: при равенстве <b>запомни и иди левее</b>, не выходи сразу.</li>
    </ul>
    <p>Середину считай как <code>left + (right-left)/2</code> — это бережёт от переполнения.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация.** Жёлтым отмечен `mid`, синим/фиолетовым — границы `left`/`right`,
> затемнены отброшенные половины. Справа — код с подсветкой строки и таблица переменных, внизу —
> кликабельные шаги. Можно подставить свой массив и `target` и нажать «⟲ Запустить». (Виджет
> работает в собранной книге `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

**Точный поиск** — классический бинарный поиск значения:

<div class="algo-viz" data-viz="binary-search" data-array="1,3,5,7,9,11,13" data-target="9"></div>

**Первое вхождение** — при равенстве не останавливаемся, а сжимаем правую границу, чтобы найти самый левый из дубликатов:

<div class="algo-viz" data-viz="binary-search-first" data-array="1,2,2,2,3,4,5" data-target="2"></div>

## ⚡ Шаблон для собеседования

```go
left, right := 0, len(arr)-1
for left <= right {
    mid := left + (right-left)/2
    switch {
    case arr[mid] == target:
        return mid
    case arr[mid] < target:
        left = mid + 1  // ответ правее
    default:
        right = mid - 1 // ответ левее
    }
}
return -1
```

1. границы по краям, инвариант «ответ в `[left, right]`»;
2. `mid := left + (right-left)/2`;
3. сравнили `arr[mid]` с целью → сдвинули **одну** границу;
4. цикл, пока `left <= right`.

## 📖 Разбор

<details class="algo-details">
<summary>Теория, варианты (первое вхождение, повёрнутый массив, sort.Search) и сложность</summary>

**Modified Binary Search** расширяет классический бинарный поиск на задачи, где
ищут не точное значение, а **границу монотонного предиката**: первое/последнее
вхождение, позицию вставки, минимум в повёрнутом массиве, элемент в 2D-матрице.

Ключевая идея: бинарный поиск работает для любого монотонного условия. Меняя
условие сравнения и правило обновления границ, мы решаем разные задачи поиска за
**O(log n)**, сохраняя инвариант «решение, если оно есть, лежит в `[left, right]`».

#### Классический поиск значения

```go
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

#### Первое вхождение

При равенстве не останавливаемся, а продолжаем сжимать правую границу — так находим
самый левый индекс с `target`.

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

#### Повёрнутый массив

Одна из половин `[left..mid]` или `[mid..right]` всегда отсортирована. Проверяем
`arr[left] <= arr[mid]`: если да — отсортирована левая половина, иначе правая. Ищем
`target` только в отсортированной половине.

#### Идиоматичный Go

`sort.Search` находит наименьший индекс, для которого предикат истинен:

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

#### Сложность

| Случай       | Время    | Память |
|--------------|----------|--------|
| Лучший       | O(1)     | O(1)   |
| Средний/худший | O(log n) | O(1)   |

На каждом шаге интервал уменьшается вдвое, отсюда не более `log₂(n)` шагов; память
константна — храним только индексы.

</details>

## ⚠️ Типичные ошибки

1. **Переполнение `mid`** — считайте `left + (right-left)/2`, а не
   `(left + right)/2`.
2. **Неверное условие цикла** — `left <= right` ищет в закрытом интервале;
   `left < right` (с `right = mid`) — для поиска границы. Смешивать нельзя.
3. **Неправильное обновление границ** — для первого вхождения при равенстве надо
   двигать `right = mid - 1`, а не возвращать `mid` сразу.
4. **Повёрнутый массив**: забыли определить отсортированную половину перед
   отбрасыванием — тогда теряете `target`.
5. **Не обработаны границы** — пустой массив, один элемент, `target` вне диапазона.

## 🧩 Задачи

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

Реализуйте `Search` (точное значение), `FindCeiling` (наименьший элемент ≥ `key`),
`FindFloor` (наибольший элемент ≤ `target`), `SearchRotated` (поиск в повёрнутом массиве),
`FindFirstLast` (первая и последняя позиция) и `IntSqrt` (целочисленный квадратный корень).

## 🔗 Связанные шаблоны

- **[Sliding Window](sliding-window.md)** — иногда оптимальный размер окна ищут
  бинарным поиском по ответу.
- **[Cyclic Sort](cyclic-sort.md)** — работа с массивами в фиксированном диапазоне.
- **[K-way Merge](k-way-merge.md)** — слияние отсортированных массивов.
- Для общей теории по памяти и профилированию в Go см.
  [приложение](appendix-go-memory.md).
