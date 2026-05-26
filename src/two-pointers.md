# Two Pointers (Два указателя)

## Теория

**Two Pointers** — техника, в которой по линейной структуре (массив, строка, список)
движутся два индекса, согласованно меняя позиции до выполнения условия. Вместо перебора
всех пар (O(n²)) мы используем отсортированность или монотонность данных, чтобы за один
шаг отбрасывать целые области поиска. Это снижает сложность до **O(n)** при O(1) памяти.

Три основных варианта:

- **Встречные указатели** — `left` с начала, `right` с конца, движутся навстречу.
- **Одно направление** — `slow` и `fast` идут с одного края (фильтрация, дедупликация).
- **Быстрый и медленный** — движение с разной скоростью (см. [Fast & Slow Pointers](fast-slow-pointers.md)).

**Когда применять:**

- массив отсортирован (для встречных указателей это обязательно);
- нужно найти пару/тройку/подмассив, удовлетворяющий условию;
- задача сводится к движению с двух концов или к фильтрации на месте;
- хочется убрать вложенный цикл и улучшить сложность.

## Алгоритм

### Встречные указатели

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

### Одно направление

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

### Сложность

| Вариант            | Время | Память |
|--------------------|-------|--------|
| Встречные          | O(n)  | O(1)   |
| Одно направление   | O(n)  | O(1)   |

Линейность следует из того, что `left` только растёт, `right` только убывает, а в
варианте «одно направление» каждый указатель проходит массив максимум один раз.

## Визуализация

> 💡 **Интерактивная демонстрация.** Нажимайте «▶»: указатели сходятся с краёв,
> а сумма подсказывает, какой из них сдвинуть. (Виджет работает в собранной книге
> `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="two-pointers-sum" data-array="1,2,3,4,5,6" data-target="7"></div>

Поиск пар с суммой 7 в `[1, 2, 3, 4, 5, 6]`:

```
[1 2 3 4 5 6]   1+6 = 7 ✓  пара (0,5) → left++, right--
 1[2 3 4 5]6    2+5 = 7 ✓  пара (1,4) → left++, right--
 1 2[3 4]5 6    3+4 = 7 ✓  пара (2,3) → left++, right--
 1 2 3[]4 5 6   left >= right → конец
```

На каждом шаге сравнение суммы с целью сразу отбрасывает целую группу заведомо
негодных пар, поэтому массив проходится один раз.

## Типичные ошибки

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

## Задачи

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

Реализуйте `PairWithTargetSum` (встречные указатели) и `RemoveDuplicates`
(одно направление).

## Связанные шаблоны

- **[Sliding Window](sliding-window.md)** — окно тоже задаётся двумя указателями;
  родственная техника для подмассивов и подстрок.
- **[Fast & Slow Pointers](fast-slow-pointers.md)** — вариация двух указателей для
  связанных списков.
- **[Merge Intervals](merge-intervals.md)** — сортировка плюс два указателя для
  интервалов.
- Для общей теории по памяти и профилированию в Go см.
  [приложение](appendix-go-memory.md).
