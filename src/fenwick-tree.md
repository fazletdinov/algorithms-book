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

## 🧠 Почему это корректно

Вся магия BIT — в одной операции `i & (-i)` и в том, **за какой диапазон отвечает**
каждый узел.

### Зона ответственности узла и почему `i & -i` — это младший бит

`tree[i]` хранит сумму **`lowbit(i)` элементов, заканчивающихся в `i`**, то есть отрезок
`(i − lowbit(i), i]`, где `lowbit(i) = i & (-i)`.

Почему `i & -i` выделяет младший установленный бит? В дополнительном коде
`-i = ~i + 1`: прибавление `1` к инвертированному `i` переворачивает все нули в младшем
хвосте обратно в нули, **сохраняя единственный младший установленный бит** и инвертируя
всё выше него. Поэтому `i & -i` обнуляет всё, кроме этого бита. Например `i = 12 = 1100₂`
→ `i & -i = 100₂ = 4` → узел отвечает за 4 элемента `(8, 12]`.

### Почему два обхода покрывают ровно что нужно

- **`prefix(i)`** идёт `i -= i & -i`: на каждом шаге берём отрезок `(i−lowbit, i]` и
  прыгаем в `i − lowbit`, то есть к началу следующего непокрытого куска. Эти отрезки
  **дизъюнктны и в точности замощают `[1, i]`** → префиксная сумма верна. Число шагов =
  число единичных битов в `i` ≤ `log n`.
- **`add(i)`** идёт `i += i & -i`: позиция `i` входит в зону ответственности узла `i`,
  затем `i + lowbit`, и т.д. — это ровно все узлы, чьи отрезки накрывают позицию `i`.

Эти два обхода **взаимно согласованы**: каждый узел, который `add(i)` обновляет, будет
учтён в `prefix(j)` для всех `j ≥ i`, чьи отрезки его включают. Это и есть инвариант BIT.

### Почему только обратимые операции

`RangeSum(l, r) = prefix(r) − prefix(l−1)` опирается на **вычитание**. Для суммы и XOR
обратный элемент есть. Для `min`/`max` его нет: из `min[0..r]` и `min[0..l−1]` нельзя
получить `min[l..r]`. Поэтому диапазонный минимум — это [дерево отрезков](segment-tree.md),
а не Фенвик.

## ⚙️ Цена на практике

### Легче дерева отрезков, когда задача подходит

Один массив `n+1` против `2n–4n`, крошечная константа, предсказуемые прыжки по памяти.
Если нужны **точечное обновление + префиксная/диапазонная сумма обратимой операции** —
BIT короче, быстрее и экономнее. Нужен range-min/max или range-update — бери дерево
отрезков.

### 1-индексация обязательна

`i & -i` для `i = 0` равно `0` → шаг `i += 0` не двигается, цикл зависает (или `prefix`
не стартует). Именно поэтому в `Update`/`PrefixSum` стоит сдвиг `+1`: у позиции `0` нет
младшего бита. Это самый частый баг при реализации BIT.

### Построение за `O(n)` вместо `O(n log n)`

Наивно строим `n` вызовами `add` — это `O(n log n)`. Но можно за `O(n)`: положить
`tree[i] = arr[i-1]`, затем каждый узел протолкнуть в родителя:

```go
for i := 1; i <= n; i++ {
    if j := i + (i & -i); j <= n {
        tree[j] += tree[i]
    }
}
```

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
