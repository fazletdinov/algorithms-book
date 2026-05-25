# Segment Tree (Дерево отрезков)

## Описание шаблона

**Дерево отрезков** — структура для задач, где нужно одновременно **запрашивать
агрегат на диапазоне** (сумму, минимум, максимум, НОД…) и **обновлять элементы**, причём
обе операции — за O(log n).

Сравните с альтернативами:

- **Массив**: запрос суммы на диапазоне O(n), обновление O(1).
- **Префиксные суммы**: запрос O(1), но обновление O(n) (нужно пересчитать хвост).
- **Дерево отрезков**: и запрос, и обновление O(log n) — баланс, выигрывающий, когда
  обновления и запросы **чередуются**.

## Когда применять

- Много запросов «сумма/мин/макс на [l, r]» **вперемешку** с изменениями элементов.
- Динамические задачи на диапазонах: подсчёт инверсий, «сколько меньших справа».
- Когда префиксных сумм не хватает из-за частых обновлений.

## Идея

Лист дерева хранит элемент массива, внутренний узел — агрегат своих двух детей. Запрос
на диапазоне разбивается на O(log n) узлов, целиком покрывающих этот диапазон.

```
arr = [1, 3, 5, 7]            сумма на [1,3] = 3+5+7 = 15

                 [0..3]=16
                /         \
         [0..1]=4         [2..3]=12
         /     \          /      \
     [0]=1   [1]=3    [2]=5    [3]=7
```

## Реализация (итеративная, сумма)

Компактный вариант: массив `tree` размера `2n`, листья в `[n, 2n)`, родитель узла `i` —
это `i/2`.

```go
type SegmentTree struct {
    n    int
    tree []int
}

// NewSegmentTree строит дерево за O(n).
func NewSegmentTree(arr []int) *SegmentTree {
    n := len(arr)
    st := &SegmentTree{n: n, tree: make([]int, 2*n)}
    for i := 0; i < n; i++ {
        st.tree[n+i] = arr[i] // листья
    }
    for i := n - 1; i > 0; i-- {
        st.tree[i] = st.tree[2*i] + st.tree[2*i+1] // агрегат снизу вверх
    }
    return st
}

// Update устанавливает arr[i] = val за O(log n).
func (st *SegmentTree) Update(i, val int) {
    i += st.n
    st.tree[i] = val
    for i > 1 {
        i /= 2
        st.tree[i] = st.tree[2*i] + st.tree[2*i+1] // обновляем предков
    }
}

// Query возвращает сумму на ВКЛЮЧИТЕЛЬНОМ диапазоне [l, r] за O(log n).
func (st *SegmentTree) Query(l, r int) int {
    res := 0
    l += st.n
    r += st.n + 1 // полуинтервал [l, r)
    for l < r {
        if l&1 == 1 { // l — правый ребёнок: берём его и сдвигаемся
            res += st.tree[l]
            l++
        }
        if r&1 == 1 { // r — правый ребёнок: берём левого соседа
            r--
            res += st.tree[r]
        }
        l /= 2
        r /= 2
    }
    return res
}
```

Чтобы получить дерево минимумов/максимумов, замените `+` на `min`/`max` в трёх местах
(построение, обновление, запрос) и нейтральный элемент `0` на `+∞`/`−∞`.

## Временная и пространственная сложность

| Операция | Время    | Память |
|----------|----------|--------|
| Построение | O(n)   | O(n)   |
| Query    | O(log n) | —      |
| Update   | O(log n) | —      |

## Варианты

- **Lazy propagation** (отложенные обновления) — позволяет обновлять **целый диапазон**
  за O(log n), откладывая применение в узлах (см. раздел ниже).
- **Fenwick (BIT)** — [дерево Фенвика](fenwick-tree.md) проще и быстрее для сумм с
  точечным обновлением, но менее универсально, чем дерево отрезков.

## Lazy propagation: обновление диапазона

Точечного обновления мало для задач вида «прибавить значение ко всем элементам [l, r]».
Наивно это O(n) на запрос. **Отложенные обновления** решают проблему: если узел целиком
покрыт диапазоном обновления, мы применяем изменение к нему **сразу**, а к детям — позже
(«проталкиваем» лениво, только когда в них спускаемся). Так range-update и range-query
оба становятся O(log n).

Хранятся два массива: `tree` (агрегаты) и `lazy` (отложенная прибавка для поддерева).
Удобнее рекурсивная реализация.

```go
type LazySegmentTree struct {
    n          int
    tree, lazy []int
}

func NewLazySegmentTree(arr []int) *LazySegmentTree {
    n := len(arr)
    l := &LazySegmentTree{n: n, tree: make([]int, 4*n), lazy: make([]int, 4*n)}
    if n > 0 {
        l.build(1, 0, n-1, arr)
    }
    return l
}

func (l *LazySegmentTree) build(node, lo, hi int, arr []int) {
    if lo == hi {
        l.tree[node] = arr[lo]
        return
    }
    mid := (lo + hi) / 2
    l.build(2*node, lo, mid, arr)
    l.build(2*node+1, mid+1, hi, arr)
    l.tree[node] = l.tree[2*node] + l.tree[2*node+1]
}

// apply применяет прибавку delta ко всему отрезку [lo, hi] узла.
func (l *LazySegmentTree) apply(node, lo, hi, delta int) {
    l.tree[node] += (hi - lo + 1) * delta // вклад в сумму
    l.lazy[node] += delta                 // запоминаем для детей
}

// push проталкивает отложенное значение детям.
func (l *LazySegmentTree) push(node, lo, hi int) {
    if l.lazy[node] != 0 {
        mid := (lo + hi) / 2
        l.apply(2*node, lo, mid, l.lazy[node])
        l.apply(2*node+1, mid+1, hi, l.lazy[node])
        l.lazy[node] = 0
    }
}

// RangeUpdate прибавляет delta ко всем элементам [ql, qr].
func (l *LazySegmentTree) RangeUpdate(ql, qr, delta int) { l.update(1, 0, l.n-1, ql, qr, delta) }

func (l *LazySegmentTree) update(node, lo, hi, ql, qr, delta int) {
    if qr < lo || hi < ql { // не пересекается
        return
    }
    if ql <= lo && hi <= qr { // целиком внутри — применяем и не спускаемся
        l.apply(node, lo, hi, delta)
        return
    }
    l.push(node, lo, hi)
    mid := (lo + hi) / 2
    l.update(2*node, lo, mid, ql, qr, delta)
    l.update(2*node+1, mid+1, hi, ql, qr, delta)
    l.tree[node] = l.tree[2*node] + l.tree[2*node+1]
}

// RangeQuery возвращает сумму на [ql, qr].
func (l *LazySegmentTree) RangeQuery(ql, qr int) int { return l.query(1, 0, l.n-1, ql, qr) }

func (l *LazySegmentTree) query(node, lo, hi, ql, qr int) int {
    if qr < lo || hi < ql {
        return 0
    }
    if ql <= lo && hi <= qr {
        return l.tree[node]
    }
    l.push(node, lo, hi)
    mid := (lo + hi) / 2
    return l.query(2*node, lo, mid, ql, qr) + l.query(2*node+1, mid+1, hi, ql, qr)
}
```

Ключевое правило: **перед спуском к детям всегда `push`**, иначе они вернут устаревшие
данные. И `update`, и `query` соблюдают это.

## Типичные ошибки

1. **Путаница включительного/полуоткрытого диапазона** — в `Query` здесь `r` сдвигается
   на `+1`, превращая `[l, r]` в `[l, r)`.
2. **Забыли обновить предков** в `Update` — запрос вернёт устаревшие данные.
3. **Неверный нейтральный элемент** для min/max-дерева (`0` вместо `±∞`).
4. **Выход за границы** при `l`/`r` вне `[0, n)` — добавьте проверки на вызывающей
   стороне.

## Примеры задач на LeetCode

- [Range Sum Query - Mutable](https://leetcode.com/problems/range-sum-query-mutable/)
- [Count of Smaller Numbers After Self](https://leetcode.com/problems/count-of-smaller-numbers-after-self/)
- [The Skyline Problem](https://leetcode.com/problems/the-skyline-problem/)
- [Range Sum Query 2D - Mutable](https://leetcode.com/problems/range-sum-query-2d-mutable/)

## Упражнения

В [Go-тренажёре](https://github.com/fazletdinov/algorithms-book/tree/main/exercises)
есть пакет `segtree`:

```bash
cd exercises
go test ./segtree/                 # ваши решения
go test -tags solution ./segtree/  # эталон
```

Реализуйте `NewSegmentTree`, `Update` и `Query` для суммы на диапазоне, а также
`LazySegmentTree` (`RangeUpdate` / `RangeQuery`) с отложенными обновлениями.

## Связанные шаблоны

- **[Tree DFS](tree-dfs.md)** — рекурсивная версия дерева отрезков строится обходом в
  глубину.
- **[Bit Manipulation](bit-manipulation.md)** — дерево Фенвика опирается на битовые
  трюки с индексами.
- **[Modified Binary Search](modified-binary-search.md)** — «спуск по дереву» для поиска
  k-го элемента родственен бинарному поиску.
