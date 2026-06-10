# 📏 Fenwick Tree (Дерево Фенвика, BIT)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Fenwick Tree <span class="algo-hero__ru">Дерево Фенвика, BIT</span></div>
    <div class="algo-hero__tag">Префиксные суммы с точечным обновлением за O(log n) в одном массиве</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Sum/Update</span><b>O(log n)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(n)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>префиксные / диапазонные <b>суммы</b> при частых точечных обновлениях</li>
      <li>подсчёт инверсий, «сколько меньших слева/справа»</li>
      <li>обратимая операция (сумма, xor) — не нужен min/max</li>
      <li>нужен компактный и быстрый код вместо дерева отрезков</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>нужен min/max/НОД на диапазоне → дерево отрезков</li>
      <li>обновление целого диапазона «из коробки» (нужны два BIT)</li>
      <li>массив статичен → префиксные суммы</li>
      <li>операция необратима</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«префиксная/диапазонная сумма» + «точечное обновление»</b>, «range sum query — mutable», «число инверсий», «count smaller after self» · обратимая операция.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li>вся магия — в <b><code>i & (-i)</code></b> (младший установленный бит);</li>
      <li>узел <code>i</code> отвечает за <code>i & (-i)</code> элементов, кончающихся на позиции <code>i</code>;</li>
      <li><b>обновление</b> идёт вверх: <code>i += i & (-i)</code>;</li>
      <li><b>запрос префикса</b> идёт вниз: <code>i -= i & (-i)</code>;</li>
      <li>внутри — 1-индексация, наружу удобна 0-индексация.</li>
    </ul>
    <p>RangeSum(l, r) = PrefixSum(r) − PrefixSum(l−1).</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация (prefixSum).** Запрос префиксной суммы «прыгает» по индексам
> `i −= i & (−i)`, складывая зоны ответственности BIT-узлов (подсвечены на массиве). Справа — код
> с подсветкой строки и переменные (узел, зона, итог), внизу — шаги. Можно подставить свой массив
> и индекс. (Виджет работает в собранной книге `mdbook serve`/`mdbook build`, а не при просмотре
> `.md` на GitHub.)

<div class="algo-viz" data-viz="fenwick-prefix" data-array="3,2,-1,6,5,4,-3,3" data-index="5"></div>

## ⚡ Шаблон для собеседования

```go
// 1-индексация внутри
func (f *Fenwick) Add(i, delta int) {
    for ; i <= f.n; i += i & (-i) { // вверх к предкам
        f.tree[i] += delta
    }
}
func (f *Fenwick) PrefixSum(i int) int {
    sum := 0
    for ; i > 0; i -= i & (-i) {     // вниз по зонам
        sum += f.tree[i]
    }
    return sum
}
```

1. `Add` поднимается, прибавляя младший бит;
2. `PrefixSum` спускается, вычитая его;
3. диапазон: `PrefixSum(r) − PrefixSum(l−1)`.

## 📖 Разбор

<details class="algo-details">
<summary>Полная реализация, BIT против дерева отрезков, сложность</summary>

**Дерево Фенвика** (BIT) — компактная структура для префиксных сумм с обновлениями: и
точечное обновление, и запрос префиксной суммы за O(log n), используя один массив
`n+1`. Уже, чем дерево отрезков (только обратимые операции), зато проще и легче.

```go
type Fenwick struct {
    n    int
    tree []int // 1-индексация: tree[0] не используется
}

func NewFenwick(arr []int) *Fenwick {
    f := &Fenwick{n: len(arr), tree: make([]int, len(arr)+1)}
    for i, v := range arr {
        f.add(i+1, v)
    }
    return f
}

func (f *Fenwick) add(i, delta int) {
    for ; i <= f.n; i += i & (-i) {
        f.tree[i] += delta
    }
}

func (f *Fenwick) Update(i, delta int) { f.add(i+1, delta) } // ДОБАВЛЕНИЕ, не запись

func (f *Fenwick) prefix(i int) int {
    sum := 0
    for ; i > 0; i -= i & (-i) {
        sum += f.tree[i]
    }
    return sum
}

func (f *Fenwick) PrefixSum(i int) int { return f.prefix(i + 1) }       // [0..i]
func (f *Fenwick) RangeSum(l, r int) int { return f.PrefixSum(r) - f.PrefixSum(l-1) }
```

#### BIT против дерева отрезков

| Критерий            | Fenwick (BIT)         | Segment Tree              |
|---------------------|-----------------------|---------------------------|
| Код                 | очень компактный      | объёмнее                  |
| Память              | `n+1`                 | `2n`–`4n`                 |
| Операции            | сумма, xor (обратимые)| любые (min/max/gcd, lazy) |
| Диапазонные обновления | сложнее (два BIT)  | через lazy propagation    |

#### Сложность

| Операция            | Время      | Память |
|---------------------|------------|--------|
| Построение          | O(n log n) | O(n)   |
| Update (точечное)   | O(log n)   | —      |
| PrefixSum / RangeSum| O(log n)   | —      |

</details>

## ⚠️ Типичные ошибки

1. **Путаница 0- и 1-индексации** — держите 1-индексацию строго внутри, конвертируйте на границе.
2. **`Update` как «запись» вместо «прибавления»** — BIT хранит дельты; чтобы *установить* значение, прибавьте `(новое − старое)`.
3. **Попытка хранить min/max** — обычный BIT не поддерживает необратимые операции.
4. **Цикл `i -= i & (-i)` при `i = 0`** — не зайдёт в тело (`i > 0`), корректно вернёт 0.

## 🧩 Задачи

**LeetCode:**

- [Range Sum Query - Mutable](https://leetcode.com/problems/range-sum-query-mutable/)
- [Count of Smaller Numbers After Self](https://leetcode.com/problems/count-of-smaller-numbers-after-self/)
- [Reverse Pairs](https://leetcode.com/problems/reverse-pairs/)
- [Create Sorted Array through Instructions](https://leetcode.com/problems/create-sorted-array-through-instructions/)

**Тренажёр** — пакет `fenwick`:

```bash
cd exercises
go test ./fenwick/                 # ваши решения
go test -tags solution ./fenwick/  # эталон
```

Реализуйте `NewFenwick`, `Update`, `PrefixSum`, `RangeSum`, `CountInversions` (число инверсий через BIT) и `CountSmallerToRight` (меньших справа).

## 🔗 Связанные шаблоны

- **[Segment Tree](segment-tree.md)** — более универсальная, но более тяжёлая альтернатива.
- **[Bit Manipulation](bit-manipulation.md)** — трюк `i & (-i)` для младшего бита.
- **[Modified Binary Search](modified-binary-search.md)** — поиск k-го элемента спуском по дереву.
