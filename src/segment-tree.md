# 🌴 Segment Tree (Дерево отрезков)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Segment Tree <span class="algo-hero__ru">Дерево отрезков</span></div>
    <div class="algo-hero__tag">Запрос агрегата на диапазоне И обновление — оба за O(log n)</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Запрос/Update</span><b>O(log n)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(n)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>запросы «сумма/мин/макс/НОД на [l, r]» <b>вперемешку</b> с изменениями</li>
      <li>динамические задачи на диапазонах (инверсии, «меньших справа»)</li>
      <li>когда префиксных сумм не хватает из-за частых обновлений</li>
      <li>обновление целого диапазона (lazy propagation)</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>массив статичен → префиксные суммы (запрос O(1))</li>
      <li>нужны только суммы с точечным обновлением → проще Fenwick</li>
      <li>нет запросов на диапазонах</li>
      <li>данные малы — обычный проход дешевле</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«сумма/мин/макс на отрезке» + «обновление элемента»</b>, «range sum query — mutable», «сколько меньших справа» · запросы и апдейты чередуются.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li>лист = элемент, внутренний узел = <b>агрегат двух детей</b>;</li>
      <li>запрос на [l, r] разбивается на <b>O(log n) узлов</b>, целиком покрывающих диапазон;</li>
      <li>узел вне запроса → skip, целиком внутри → take, частично → спускаемся;</li>
      <li>min/max-дерево: замени <code>+</code> на <code>min</code>/<code>max</code> и нейтраль <code>0</code> на <code>±∞</code>;</li>
      <li>обновление диапазона → <b>lazy propagation</b> (перед спуском всегда <code>push</code>).</li>
    </ul>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация (запрос суммы).** Запрос диапазона разбивается на O(log n) узлов:
> зелёные взяты целиком (take), синие — спускаемся глубже (split), бледные — вне запроса (skip).
> Справа — код с подсветкой строки и переменные, внизу — кликабельные шаги. Можно подставить свой
> массив и `[l, r]`. (Виджет работает в собранной книге `mdbook serve`/`mdbook build`, а не при
> просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="segtree-query" data-array="1,3,5,7,9,11,13,15" data-l="2" data-r="5"></div>

## ⚡ Шаблон для собеседования

```go
// Рекурсивный запрос суммы на [ql, qr]
func (t *Seg) Query(node, lo, hi, ql, qr int) int {
    if hi < ql || qr < lo {
        return 0              // вне запроса
    }
    if ql <= lo && hi <= qr {
        return t.sum[node]    // целиком внутри
    }
    mid := (lo + hi) / 2
    return t.Query(2*node, lo, mid, ql, qr) +
        t.Query(2*node+1, mid+1, hi, ql, qr) // частично — к детям
}
```

1. узел вне диапазона → 0;
2. узел целиком внутри → его агрегат;
3. иначе спускаемся к двум детям и складываем.

## 📖 Разбор

<details class="algo-details">
<summary>Итеративная реализация, lazy propagation и сложность</summary>

Лист хранит элемент, внутренний узел — агрегат детей. Запрос разбивается на O(log n)
узлов. Сравнение: массив (запрос O(n)), префиксные суммы (запрос O(1), но обновление
O(n)), дерево отрезков (и то, и другое O(log n)).

#### Итеративная реализация (сумма)

Массив `tree` размера `2n`, листья в `[n, 2n)`, родитель `i` — это `i/2`.

```go
type SegmentTree struct {
    n    int
    tree []int
}

func NewSegmentTree(arr []int) *SegmentTree {
    n := len(arr)
    st := &SegmentTree{n: n, tree: make([]int, 2*n)}
    for i := 0; i < n; i++ {
        st.tree[n+i] = arr[i]
    }
    for i := n - 1; i > 0; i-- {
        st.tree[i] = st.tree[2*i] + st.tree[2*i+1]
    }
    return st
}

func (st *SegmentTree) Update(i, val int) {
    i += st.n
    st.tree[i] = val
    for i > 1 {
        i /= 2
        st.tree[i] = st.tree[2*i] + st.tree[2*i+1]
    }
}

func (st *SegmentTree) Query(l, r int) int { // включительный [l, r]
    res := 0
    l += st.n
    r += st.n + 1
    for l < r {
        if l&1 == 1 {
            res += st.tree[l]
            l++
        }
        if r&1 == 1 {
            r--
            res += st.tree[r]
        }
        l /= 2
        r /= 2
    }
    return res
}
```

#### Lazy propagation (обновление диапазона)

Если узел целиком покрыт диапазоном обновления — применяем изменение сразу, а к детям
проталкиваем лениво. Так range-update и range-query оба O(log n).

```go
func (l *LazySegmentTree) apply(node, lo, hi, delta int) {
    l.tree[node] += (hi - lo + 1) * delta
    l.lazy[node] += delta
}
func (l *LazySegmentTree) push(node, lo, hi int) {
    if l.lazy[node] != 0 {
        mid := (lo + hi) / 2
        l.apply(2*node, lo, mid, l.lazy[node])
        l.apply(2*node+1, mid+1, hi, l.lazy[node])
        l.lazy[node] = 0
    }
}
func (l *LazySegmentTree) update(node, lo, hi, ql, qr, delta int) {
    if qr < lo || hi < ql {
        return
    }
    if ql <= lo && hi <= qr {
        l.apply(node, lo, hi, delta)
        return
    }
    l.push(node, lo, hi)
    mid := (lo + hi) / 2
    l.update(2*node, lo, mid, ql, qr, delta)
    l.update(2*node+1, mid+1, hi, ql, qr, delta)
    l.tree[node] = l.tree[2*node] + l.tree[2*node+1]
}
```

Ключевое правило: **перед спуском к детям всегда `push`**, иначе они вернут устаревшие
данные.

#### Сложность

| Операция   | Время    | Память |
|------------|----------|--------|
| Построение | O(n)     | O(n)   |
| Query      | O(log n) | —      |
| Update     | O(log n) | —      |

</details>

## ⚠️ Типичные ошибки

1. **Путаница включительного/полуоткрытого диапазона** — в `Query` `r` сдвигается на `+1`, превращая `[l, r]` в `[l, r)`.
2. **Забыли обновить предков** в `Update` — запрос вернёт устаревшие данные.
3. **Неверный нейтральный элемент** для min/max-дерева (`0` вместо `±∞`).
4. **Lazy: забыли `push`** перед спуском — дети вернут устаревшие данные.

## 🧩 Задачи

**LeetCode:**

- [Range Sum Query - Mutable](https://leetcode.com/problems/range-sum-query-mutable/)
- [Count of Smaller Numbers After Self](https://leetcode.com/problems/count-of-smaller-numbers-after-self/)
- [The Skyline Problem](https://leetcode.com/problems/the-skyline-problem/)
- [Range Sum Query 2D - Mutable](https://leetcode.com/problems/range-sum-query-2d-mutable/)

**Тренажёр** — пакет `segtree`:

```bash
cd exercises
go test ./segtree/                 # ваши решения
go test -tags solution ./segtree/  # эталон
```

Реализуйте `NewSegmentTree` / `Update` / `Query` (сумма на отрезке), а также тип
`MinSegmentTree` (`NewMinSegmentTree` / `Update` / `Query` — минимум на отрезке).

## 🔗 Связанные шаблоны

- **[Tree DFS](tree-dfs.md)** — рекурсивная версия строится обходом в глубину.
- **[Fenwick Tree](fenwick-tree.md)** — проще и легче для сумм с точечным обновлением.
- **[Bit Manipulation](bit-manipulation.md)** — индексные трюки в основе BIT.
