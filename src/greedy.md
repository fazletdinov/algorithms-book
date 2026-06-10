# 💰 Greedy (Жадные алгоритмы)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Greedy <span class="algo-hero__ru">Жадные алгоритмы</span></div>
    <div class="algo-hero__tag">Локально оптимальный выбор → глобальный оптимум (когда доказуемо)</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Время</span><b>O(n log n)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(1)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>расписание/интервалы: максимум непересекающихся событий</li>
      <li>минимизация/максимизация с очевидным критерием сортировки</li>
      <li>доказуемо «greedy stays ahead» или работает exchange argument</li>
      <li>выбор не нужно пересматривать в будущем</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>свойство жадного выбора <b>не доказано</b> (Coin Change, 0/1 рюкзак → ДП)</li>
      <li>нужно пересматривать прошлые решения</li>
      <li>оптимум требует учёта будущих шагов</li>
      <li>есть контрпример, где жадность проигрывает</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> «выбрать максимум/минимум ...», «можно ли ...», очевидный критерий сортировки (по концу интервала, по стоимости). ⚠️ <b>Если жадность не доказуема — это динамическое программирование.</b></p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li>на каждом шаге — <b>локально оптимальный</b> выбор, без пересмотра;</li>
      <li>корректно только при <b>свойстве жадного выбора</b> + оптимальной подструктуре;</li>
      <li>доказывай через <b>greedy stays ahead</b> или <b>exchange argument</b>;</li>
      <li>не доказал — жадность лишь гипотеза, бери ДП.</li>
    </ul>
    <p>⚠️ Контрпример: размен 6 монетами <code>[1,3,4]</code>. Жадность даёт <code>4+1+1=3</code>, оптимум — <code>3+3=2</code>. Поэтому Coin Change решается ДП.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация (Jump Game).** Жёлтым — текущий индекс, синим — диапазон
> достижимых позиций, тусклым — пока недостижимые. Жадность ведёт самую дальнюю достижимую точку
> (`maxReach`). Справа — код с подсветкой строки и переменные, внизу — шаги. Можно подставить свой
> массив и нажать «⟲ Запустить». (Виджет работает в собранной книге `mdbook serve`/`mdbook build`,
> а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="jump-game" data-array="2,3,1,1,4"></div>

## ⚡ Шаблон для собеседования

```go
// Jump Game: ведём самую дальнюю достижимую позицию
func canJump(nums []int) bool {
    maxReach := 0
    for i, v := range nums {
        if i > maxReach {
            return false // сюда не допрыгнуть
        }
        if i+v > maxReach {
            maxReach = i + v // жадно расширяем горизонт
        }
    }
    return true
}
```

1. ведём `maxReach` — самую дальнюю достижимую позицию;
2. если текущий индекс уже за горизонтом — провал;
3. иначе расширяем горизонт `i + nums[i]`;
4. дошли до конца — можно.

## 📖 Разбор

<details class="algo-details">
<summary>Доказательство корректности, Activity Selection, Jump Game и сложность</summary>

**Жадный алгоритм** на каждом шаге делает **локально оптимальный** выбор в надежде, что
последовательность таких выборов приведёт к **глобальному оптимуму**, и никогда не
пересматривает уже сделанный выбор.

Жадность корректна, только когда задача обладает **свойством жадного выбора** (локально
оптимальный выбор входит в некоторое глобально оптимальное решение) и **оптимальной
подструктурой**. Иначе нужно [динамическое программирование](dynamic-programming.md).

#### Как доказать корректность

1. **Greedy stays ahead** — по индукции: после каждого шага жадное решение не хуже любого
   другого.
2. **Exchange argument** — берём оптимальное решение и «переставляем» его к жадному, не
   ухудшив.

#### Пример 1: выбор заявок (Activity Selection)

Выбрать максимум взаимно непересекающихся интервалов. Критерий: **сортировка по времени
окончания**, берём каждый следующий, что начинается не раньше конца предыдущего.

```go
func maxActivities(intervals [][]int) int {
    if len(intervals) == 0 {
        return 0
    }
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i][1] < intervals[j][1] // по концу
    })
    count := 1
    lastEnd := intervals[0][1]
    for _, iv := range intervals[1:] {
        if iv[0] >= lastEnd { // не пересекается с последним выбранным
            count++
            lastEnd = iv[1]
        }
    }
    return count
}
```

Выбирая интервал, заканчивающийся раньше всех, мы оставляем максимум места для остальных —
это и есть «жадный остаётся впереди».

#### Пример 2: Jump Game

```go
func canJump(nums []int) bool {
    maxReach := 0
    for i, v := range nums {
        if i > maxReach {
            return false
        }
        if i+v > maxReach {
            maxReach = i + v
        }
    }
    return true
}
```

#### Сложность

| Задача            | Время        | Память |
|-------------------|--------------|--------|
| Выбор заявок      | O(n log n)   | O(1)   |
| Jump Game         | O(n)         | O(1)   |

Чаще всего стоимость определяется **сортировкой** O(n log n); сам проход линейный.

</details>

## ⚠️ Типичные ошибки

1. **Неверный критерий жадности** — для выбора заявок сортировка по началу или по
   длительности даёт неоптимум; правильно — по концу.
2. **Применение жадности без доказательства** — для многих задач (Coin Change,
   0/1 рюкзак) жадность неверна, нужно ДП.
3. **Игнорирование граничных случаев** — пустой вход, один элемент, совпадающие границы
   интервалов.

## 🧩 Задачи

**LeetCode:**

- [Jump Game](https://leetcode.com/problems/jump-game/)
- [Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/) — выбор заявок
- [Gas Station](https://leetcode.com/problems/gas-station/)
- [Task Scheduler](https://leetcode.com/problems/task-scheduler/)
- [Partition Labels](https://leetcode.com/problems/partition-labels/)

**Тренажёр** — пакет `greedy`:

```bash
cd exercises
go test ./greedy/                 # ваши решения
go test -tags solution ./greedy/  # эталон
```

Реализуйте `MaxNonOverlapping` (выбор заявок), `CanJump` (Jump Game), `MinJumps` (мин. число прыжков), `MaxProfit` (акции, много сделок) и `FractionalKnapsack` (дробный рюкзак).

## 🔗 Связанные шаблоны

- **[Merge Intervals](merge-intervals.md)** — тоже о работе с интервалами, но без выбора
  оптимума.
- **[Dynamic Programming](dynamic-programming.md)** — когда жадность неверна, спасает ДП.
- **[Two Pointers](two-pointers.md)** — часто сопровождает жадные проходы по
  отсортированным данным.
