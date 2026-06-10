# 🎯 Two Pointers (Два указателя)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Two Pointers <span class="algo-hero__ru">Два указателя</span></div>
    <div class="algo-hero__tag">Поиск пары · фильтрация · дедупликация в линейной структуре</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Время</span><b>O(n)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(1)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>массив (или строка) <b>отсортирован</b></li>
      <li>ищем пару / тройку / подмассив под условие</li>
      <li>нужно убрать дубликаты или отфильтровать на месте</li>
      <li>движение навстречу или в одном направлении</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>данные не отсортированы и сортировать нельзя</li>
      <li>нужен честный полный перебор всех пар</li>
      <li>структура — граф или дерево</li>
      <li>порядок элементов важно сохранить (для фильтрации на месте)</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> массив <b>отсортирован</b> (или его можно отсортировать) · встречаются слова <b>«пара», «тройка», «сумма», «палиндром»</b> · просят <b>O(1) памяти</b> без хеш-таблицы. Увидел это — почти наверняка Two Pointers.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li>сумма <b>меньше</b> target → <b>left++</b> (тянем нижнюю границу вверх)</li>
      <li>сумма <b>больше</b> target → <b>right--</b> (тянем верхнюю вниз)</li>
      <li>сумма <b>равна</b> target → ответ найден</li>
    </ul>
    <p>Работает, потому что массив отсортирован: сдвиг указателя монотонно меняет сумму, поэтому каждый шаг отбрасывает целую группу заведомо негодных пар.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация (дашборд).** Нажимайте «▶»: синий указатель `lo` и
> фиолетовый `hi` сходятся с краёв, видны текущая сумма и сравнение с целью. Справа —
> код с подсветкой исполняемой строки и таблица переменных (как окно Locals в IDE);
> внизу — лента «Пошаговое выполнение» (по карточке шага можно **кликнуть**, чтобы
> перейти к нему). Можно подставить свой массив и `target` и нажать «⟲ Запустить».
> (Виджет работает в собранной книге `mdbook serve`/`mdbook build`, а не при просмотре
> `.md` на GitHub.)

<b>Встречные указатели</b> — ищем пару с заданной суммой (указатели сходятся с краёв):

<div class="algo-viz" data-viz="two-pointers-sum" data-array="1,3,4,6,8,9,11,14" data-target="13"></div>

<b>Одно направление</b> — удаляем дубликаты из отсортированного массива на месте: `slow` отмечает границу уникальных, `fast` сканирует:

<div class="algo-viz" data-viz="two-pointers-dedup" data-array="1,1,2,2,2,3,4,4"></div>

## ⚡ Шаблон для собеседования

Голый каркас встречных указателей — его и стоит держать в голове:

```go
left, right := 0, len(arr)-1
for left < right {
    sum := arr[left] + arr[right]
    switch {
    case sum == target:
        // нашли ответ
    case sum < target:
        left++  // нужна сумма больше
    default:
        right-- // нужна сумма меньше
    }
}
```

1. указатели по краям (`left = 0`, `right = n-1`);
2. считаем величину (сумму / разницу / площадь);
3. сравниваем с целью и двигаем **один** указатель;
4. повторяем, пока `left < right`.

## 📖 Разбор

<details class="algo-details">
<summary>Теория, варианты техники и сложность</summary>

**Two Pointers** — техника, в которой по линейной структуре (массив, строка, список)
движутся два индекса, согласованно меняя позиции до выполнения условия. Вместо перебора
всех пар (O(n²)) мы используем отсортированность или монотонность данных, чтобы за один
шаг отбрасывать целые области поиска. Это снижает сложность до **O(n)** при O(1) памяти.

Три основных варианта:

- **Встречные указатели** — `left` с начала, `right` с конца, движутся навстречу.
- **Одно направление** — `slow` и `fast` идут с одного края (фильтрация, дедупликация).
- **Быстрый и медленный** — движение с разной скоростью (см. [Fast & Slow Pointers](fast-slow-pointers.md)).

#### Встречные указатели

`left` и `right` стоят на краях. Сравниваем сумму с целью: если меньше — двигаем `left`
вправо (нужно больше), если больше — двигаем `right` влево (нужно меньше).

```go
func twoSumSorted(arr []int, target int) (int, int, bool) {
    left, right := 0, len(arr)-1
    for left < right {
        sum := arr[left] + arr[right]
        switch {
        case sum == target:
            return left, right, true
        case sum < target:
            left++ // нужна большая сумма
        default:
            right-- // нужна меньшая сумма
        }
    }
    return 0, 0, false
}
```

#### Одно направление

`slow` отмечает границу обработанной части, `fast` сканирует массив. Применяется для
удаления дубликатов из отсортированного массива на месте: `arr[0..slow]` всегда
содержит уникальные элементы.

```go
func removeDuplicates(nums []int) int {
    if len(nums) == 0 {
        return 0
    }
    slow := 0
    for fast := 1; fast < len(nums); fast++ {
        if nums[slow] != nums[fast] {
            slow++
            nums[slow] = nums[fast]
        }
    }
    return slow + 1 // длина уникального префикса
}
```

#### Сложность

| Вариант            | Время | Память |
|--------------------|-------|--------|
| Встречные          | O(n)  | O(1)   |
| Одно направление   | O(n)  | O(1)   |

Линейность следует из того, что `left` только растёт, `right` только убывает, а в
варианте «одно направление» каждый указатель проходит массив максимум один раз.

</details>

## ⚠️ Типичные ошибки

1. **Применение встречных указателей к неотсортированному массиву** — сначала
   `sort.Ints(arr)`, иначе логика отбрасывания пар неверна.
2. **Неверное условие цикла** — используйте `for left < right`, а не `!=`, чтобы не
   проскочить точку пересечения.
3. **Неправильное направление сдвига** — при `sum < target` двигают `left`, при
   `sum > target` — `right`; перепутать значит зациклиться или пропустить пару.
4. **Off-by-one в «одном направлении»** — сначала `slow++`, затем
   `nums[slow] = nums[fast]`, иначе затрёте нужный элемент.
5. **Забыли обновить результат** в задачах на максимум (площадь, вода) перед сдвигом
   указателей.
6. **Не обработаны границы** — пустой массив или массив из одного элемента.

## 🧩 Задачи

**LeetCode:**

- [Two Sum II - Input array is sorted](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/)
- [Valid Palindrome](https://leetcode.com/problems/valid-palindrome/)
- [Remove Duplicates from Sorted Array](https://leetcode.com/problems/remove-duplicates-from-sorted-array/)
- [3Sum](https://leetcode.com/problems/3sum/)
- [Container With Most Water](https://leetcode.com/problems/container-with-most-water/)
- [Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/)
- [Squares of a Sorted Array](https://leetcode.com/problems/squares-of-a-sorted-array/)
- [4Sum](https://leetcode.com/problems/4sum/) (сложная)
- [Partition Labels](https://leetcode.com/problems/partition-labels/)

**Тренажёр** — пакет `twopointers`:

```bash
cd exercises
go test ./twopointers/                 # ваши решения
go test -tags solution ./twopointers/  # эталон
```

Реализуйте `PairWithTargetSum` (встречные указатели), `RemoveDuplicates` (на месте),
`SortedSquares` (квадраты в отсортированном порядке), `TripletsSumToZero` (тройки с суммой 0)
и `DutchFlagSort` (сортировка 0/1/2).

## 🔗 Связанные шаблоны

- **[Sliding Window](sliding-window.md)** — окно тоже задаётся двумя указателями;
  родственная техника для подмассивов и подстрок.
- **[Fast & Slow Pointers](fast-slow-pointers.md)** — вариация двух указателей для
  связанных списков.
- **[Merge Intervals](merge-intervals.md)** — сортировка плюс два указателя для
  интервалов.
- Для общей теории по памяти и профилированию в Go см.
  [приложение](appendix-go-memory.md).
