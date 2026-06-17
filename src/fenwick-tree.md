# 📏 Дерево Фенвика: разбор задач

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Fenwick Tree <span class="algo-hero__ru">Дерево Фенвика, BIT</span></div>
    <div class="algo-hero__tag">Применяем BIT к задачам: число инверсий, «меньших справа», сжатие координат</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Sum/Update</span><b>O(log n)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(n)</b></div>
  </div>
</div>

> 📦 **Эта глава опирается на структуру.** Устройство BIT, зоны ответственности, трюк `i & (−i)`,
> операции `Add`/`PrefixSum`/`RangeSum` (с визуализациями) и построение за O(n) разобраны в главе
> [«Дерево Фенвика: устройство и операции»](fenwick-tree-structure.md) — пройди её прежде, чем
> браться за задачи. Здесь BIT считается знакомым инструментом, а в фокусе — применение к задаче
> о числе инверсий со **сжатием координат**.

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Что держим в голове из прошлой главы</div>
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

## 📝 Разбор задачи

Пройдём путь от наивного решения к оптимальному — так, как стоит рассуждать на
собеседовании: сначала рабочий перебор, затем понимание, *почему* он медленный, и
только потом BIT.

> **Задача.** Дан массив целых `nums`. Посчитать число **инверсий** — пар индексов
> `i < j`, для которых `nums[i] > nums[j]`. (Тот же приём решает «count of smaller
> numbers after self».)
> Пример: `nums = [5,2,6,1]` → ответ `4` (пары `(5,2)`, `(5,1)`, `(2,1)`, `(6,1)`).

**Шаг 1. Наивно: перебрать все пары — O(n²).**

```go
func countInversionsNaive(nums []int) int {
    cnt := 0
    for i := 0; i < len(nums); i++ {
        for j := i + 1; j < len(nums); j++ {
            if nums[i] > nums[j] { // элемент слева больше элемента справа
                cnt++
            }
        }
    }
    return cnt
}
```

Это **работает и проходит тесты**, но делает O(n²) сравнений. Для каждого `i` мы заново
просматриваем весь хвост справа, хотя по сути нас интересует одно и то же: «сколько уже
виденных элементов меньше текущего». Этот повторяющийся подсчёт «меньших» и убирает BIT.

**Шаг 2. Ключевое наблюдение.** Пройдём массив **справа налево** и будем поддерживать
частотную таблицу уже встреченных значений. Тогда вклад элемента `nums[i]` в число
инверсий — это **количество уже встреченных (то есть стоящих справа) значений, строго
меньших `nums[i]`**, а это в точности **префиксная сумма частот** на отрезке рангов
`[1, rank−1]`. Частоты меняются точечно (`+1` за элемент), а запрашиваем префикс — ровно
то, для чего создан [дерево Фенвика](fenwick-tree-structure.md#зона-ответственности-узла-и-почему-i---i--это-младший-бит):
оба за O(log n) благодаря прыжкам по `i & (-i)`.

Значения бывают большими/отрицательными, поэтому делаем **сжатие координат**: уникальные
отсортированные значения нумеруем рангами `1..m`, и BIT работает по рангам, а не по самим
числам. Размер дерева — `m+1`, а не максимум значения.

> ⚠️ Дубликаты: спрашиваем `prefix(rank−1)` (строго меньшие), поэтому равные значения
> справа **не** считаются инверсией — это и нужно для определения `nums[i] > nums[j]`.

**Шаг 3. Оптимум: сжатие координат + BIT по частотам — O(n log n).**

```go
func countInversionsBIT(nums []int) int {
    // сжатие координат: значение -> ранг 1..m
    sorted := append([]int(nil), nums...)
    sort.Ints(sorted)
    rank := make(map[int]int)
    m := 0
    for _, v := range sorted {
        if _, ok := rank[v]; !ok {
            m++
            rank[v] = m
        }
    }
    tree := make([]int, m+1) // BIT по частотам рангов, 1-индексация
    add := func(i int) {
        for ; i <= m; i += i & (-i) {
            tree[i]++
        }
    }
    prefix := func(i int) int {
        s := 0
        for ; i > 0; i -= i & (-i) {
            s += tree[i]
        }
        return s
    }
    inv := 0
    for i := len(nums) - 1; i >= 0; i-- { // справа налево
        ri := rank[nums[i]]
        inv += prefix(ri - 1) // сколько справа строго меньше nums[i]
        add(ri)               // регистрируем nums[i] как встреченный
    }
    return inv
}
```

Сортировка для сжатия — O(n log n), затем `n` пар операций `add`/`prefix` по O(log m) —
итого **O(n log n)**, память **O(n)**.

**Шаг 4. Трассировка** на `nums = [5,2,6,1]`. Ранги: `1→1, 2→2, 5→3, 6→4`. Идём справа
налево; `tree[1..4]` — частотный BIT (узел `i` отвечает за зону, заканчивающуюся в `i` по
`i & (-i)`):

| `i` | `nums[i]` | `rank` | `prefix(rank−1)` | вклад | `add` обновляет узлы | `tree[1..4]` | `inv` |
|-----|-----------|--------|------------------|-------|----------------------|--------------|-------|
| 3   | 1         | 1      | `prefix(0)` = 0  | 0     | 1→2→4                | `[1,1,0,1]`  | 0     |
| 2   | 6         | 4      | `prefix(3)` = 1  | 1     | 4                    | `[1,1,0,2]`  | 1     |
| 1   | 2         | 2      | `prefix(1)` = 1  | 1     | 2→4                  | `[1,2,0,3]`  | 2     |
| 0   | 5         | 3      | `prefix(2)` = 2  | 2     | 3→4                  | `[1,2,1,4]`  | **4** |

Ответ — `4`, что совпадает с наивным перебором. Обрати внимание на строку `i=2`:
`prefix(3)` спускается `3 → 3−(3&-3)=2 → 2−2=0`, складывая `tree[3]+tree[2] = 0+1 = 1` —
один меньший элемент (`1`) уже стоял справа от `6`.

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
