# Fenwick Tree (Дерево Фенвика, BIT)

## Описание шаблона

**Дерево Фенвика** (Binary Indexed Tree, BIT) — компактная структура для **префиксных
сумм с обновлениями**: и точечное обновление, и запрос префиксной суммы выполняются за
O(log n), используя всего один массив размера `n+1`.

По возможностям оно уже, чем [дерево отрезков](segment-tree.md) (только обратимые
операции вроде суммы, без min/max в общем случае), зато **проще в коде, меньше по памяти
и с меньшей константой**. Если задача — «сумма на диапазоне + точечные изменения», BIT
обычно лучший выбор.

## Когда применять

- Префиксные/диапазонные **суммы** при частых точечных обновлениях.
- Подсчёт инверсий, «сколько меньших элементов слева/справа».
- Везде, где хватает обратимой операции (сумма, xor) и не нужен min/max.

## Идея: младший установленный бит

Вся магия — в трюке `i & (-i)`, выделяющем **младший установленный бит** числа. Узел `i`
отвечает за `i & (-i)` элементов, заканчивающихся на позиции `i`. Поэтому:

- при **обновлении** идём вверх, прибавляя младший бит: `i += i & (-i)`;
- при **запросе** префикса идём вниз, вычитая его: `i -= i & (-i)`.

Дерево использует **1-индексацию** внутри; наружу удобно отдавать привычную 0-индексацию.

```go
type Fenwick struct {
    n    int
    tree []int // 1-индексация: tree[0] не используется
}

// NewFenwick строит дерево по массиву.
func NewFenwick(arr []int) *Fenwick {
    f := &Fenwick{n: len(arr), tree: make([]int, len(arr)+1)}
    for i, v := range arr {
        f.add(i+1, v)
    }
    return f
}

// add прибавляет delta к 1-индексированной позиции i, обновляя предков.
func (f *Fenwick) add(i, delta int) {
    for ; i <= f.n; i += i & (-i) {
        f.tree[i] += delta
    }
}

// Update прибавляет delta к элементу с 0-индексом i (это ДОБАВЛЕНИЕ, не запись).
func (f *Fenwick) Update(i, delta int) {
    f.add(i+1, delta)
}

// prefix возвращает сумму 1-индексированных элементов [1..i].
func (f *Fenwick) prefix(i int) int {
    sum := 0
    for ; i > 0; i -= i & (-i) {
        sum += f.tree[i]
    }
    return sum
}

// PrefixSum возвращает сумму элементов [0..i] (0-индексация, включительно).
func (f *Fenwick) PrefixSum(i int) int {
    return f.prefix(i + 1)
}

// RangeSum возвращает сумму на включительном диапазоне [l, r].
func (f *Fenwick) RangeSum(l, r int) int {
    return f.PrefixSum(r) - f.PrefixSum(l-1) // при l=0 PrefixSum(-1)=0
}
```

## Временная и пространственная сложность

| Операция            | Время    | Память |
|---------------------|----------|--------|
| Построение          | O(n log n) | O(n) |
| Update (точечное)   | O(log n) | —      |
| PrefixSum / RangeSum| O(log n) | —      |

(Построение можно сделать и за O(n), но цикл из `Update` нагляднее.)

## BIT против дерева отрезков

| Критерий            | Fenwick (BIT)         | Segment Tree              |
|---------------------|-----------------------|---------------------------|
| Код                 | очень компактный      | объёмнее                  |
| Память              | `n+1`                 | `2n`–`4n`                 |
| Операции            | сумма, xor (обратимые)| любые (min/max/gcd, lazy) |
| Диапазонные обновления | сложнее (нужны два BIT) | через lazy propagation |

## Визуализация

> 💡 **Интерактивная демонстрация (prefixSum).** Нажимайте «▶»: запрос префиксной суммы
> «прыгает» по индексам `i −= i & (−i)`, складывая зоны ответственности BIT-узлов
> (подсвечены). (Виджет работает в собранной книге `mdbook serve`/`mdbook build`, а не при
> просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="fenwick-prefix" data-array="3,2,-1,6,5,4,-3,3" data-index="5"></div>

## Типичные ошибки

1. **Путаница 0- и 1-индексации** — самая частая ошибка; держите 1-индексацию строго
   внутри, конвертируйте на границе.
2. **`Update` как «запись» вместо «прибавления»** — BIT хранит дельты; чтобы
   *установить* значение, прибавьте `(новое − старое)`.
3. **Попытка хранить min/max** — обычный BIT не поддерживает необратимые операции на
   произвольных диапазонах.
4. **Цикл `i -= i & (-i)` при `i = 0`** — не зайдёт в тело (условие `i > 0`), это
   корректно возвращает 0.

## Примеры задач на LeetCode

- [Range Sum Query - Mutable](https://leetcode.com/problems/range-sum-query-mutable/)
- [Count of Smaller Numbers After Self](https://leetcode.com/problems/count-of-smaller-numbers-after-self/)
- [Reverse Pairs](https://leetcode.com/problems/reverse-pairs/)
- [Create Sorted Array through Instructions](https://leetcode.com/problems/create-sorted-array-through-instructions/)

## Упражнения

В [Go-тренажёре](https://github.com/fazletdinov/algorithms-book/tree/main/exercises)
есть пакет `fenwick`:

```bash
cd exercises
go test ./fenwick/                 # ваши решения
go test -tags solution ./fenwick/  # эталон
```

Реализуйте `NewFenwick`, `Update`, `PrefixSum` и `RangeSum`.

## Связанные шаблоны

- **[Segment Tree](segment-tree.md)** — более универсальная, но более тяжёлая
  альтернатива.
- **[Bit Manipulation](bit-manipulation.md)** — трюк `i & (-i)` для младшего бита.
- **[Merge Sort / подсчёт инверсий]** — классическое применение BIT.
