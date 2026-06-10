# 🧵 K-way Merge (K-way слияние)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">K-way Merge <span class="algo-hero__ru">Слияние K списков</span></div>
    <div class="algo-hero__tag">Объединить K отсортированных списков в один через min-heap голов</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Время</span><b>O(n log k)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(k)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>слить <b>K отсортированных</b> массивов/списков в один</li>
      <li>внешняя сортировка (данные в отсортированных файлах)</li>
      <li>несколько отсортированных потоков, нужен глобальный минимум</li>
      <li>k-й наименьший в матрице/нескольких списках</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>списки не отсортированы</li>
      <li>всего два списка — достаточно слияния двух указателями</li>
      <li>нужен только топ-K, а не весь объединённый порядок</li>
      <li>данные помещаются и проще конкатенация + сортировка</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«K отсортированных списков / массивов», «merge k sorted»</b> · «отсортированная матрица», «наименьший диапазон по K спискам» · несколько упорядоченных источников.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li>следующий минимум результата — это минимум среди <b>текущих голов</b> всех K списков;</li>
      <li>min-heap хранит по одной голове от каждого списка → минимум за O(log k);</li>
      <li>в куче храни <b>значение + номер списка + индекс</b>, иначе не подложишь следующий;</li>
      <li>извлёк минимум → добавь следующий элемент из того же списка.</li>
    </ul>
    <p>Это обобщение слияния двух отсортированных массивов на K источников.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация.** Жёлтым — выбранный минимум среди голов списков, который уходит
> в результат (зелёный), обработанные элементы тускнеют. Справа — код с подсветкой строки и переменные,
> внизу — кликабельные шаги. Можно подставить свои списки (через `;`) и нажать «⟲ Запустить». (Виджет
> работает в собранной книге `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="k-way-merge" data-lists="1,4,7;2,5,8;3,6,9"></div>

## ⚡ Шаблон для собеседования

```go
h := &MinHeap{} // элемент: (значение, номер списка, индекс)
for i := range lists {
    if len(lists[i]) > 0 {
        h.Push(lists[i][0], i, 0) // головы всех списков
    }
}
var out []int
for h.Len() > 0 {
    v, li, ci := h.Pop()           // минимальная голова
    out = append(out, v)
    if ci+1 < len(lists[li]) {     // следующий из того же списка
        h.Push(lists[li][ci+1], li, ci+1)
    }
}
```

1. кладём в кучу первый элемент каждого непустого списка;
2. извлекаем глобальный минимум в результат;
3. подкладываем следующий элемент из того же списка;
4. повторяем, пока куча не пуста.

## 📖 Разбор

<details class="algo-details">
<summary>Теория, реализация с container/heap и сложность</summary>

**K-way Merge** объединяет K отсортированных массивов (списков, потоков) в один
отсортированный результат — обобщение слияния двух отсортированных массивов.

Ключевая идея: следующий минимальный элемент результата — это минимум среди *первых*
непрочитанных элементов всех K массивов. Min-heap позволяет находить этот минимум за
O(log k), храня по одному «текущему» элементу от каждого массива.

```go
import "container/heap"

// Элемент кучи: значение + откуда оно пришло
type Element struct {
    Val      int // значение
    ArrayIdx int // индекс массива
    ElemIdx  int // позиция в этом массиве
}

type MinHeap []Element

func (h MinHeap) Len() int            { return len(h) }
func (h MinHeap) Less(i, j int) bool  { return h[i].Val < h[j].Val }
func (h MinHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *MinHeap) Push(x interface{}) { *h = append(*h, x.(Element)) }
func (h *MinHeap) Pop() interface{} {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[:n-1]
    return x
}

func mergeKSortedArrays(arrays [][]int) []int {
    h := &MinHeap{}
    heap.Init(h)
    for i := range arrays {
        if len(arrays[i]) > 0 {
            heap.Push(h, Element{Val: arrays[i][0], ArrayIdx: i, ElemIdx: 0})
        }
    }

    result := make([]int, 0)
    for h.Len() > 0 {
        minElem := heap.Pop(h).(Element) // глобальный минимум среди непрочитанных
        result = append(result, minElem.Val)

        next := minElem.ElemIdx + 1
        if next < len(arrays[minElem.ArrayIdx]) {
            heap.Push(h, Element{
                Val:      arrays[minElem.ArrayIdx][next],
                ArrayIdx: minElem.ArrayIdx,
                ElemIdx:  next,
            })
        }
    }
    return result
}
```

#### Сложность

| Подход                     | Время       | Память |
|----------------------------|-------------|--------|
| Наивный (минимум из k каждый раз) | O(n·k) | O(1)   |
| K-way merge с кучей        | O(n log k)  | O(k)   |

Где `n` — общее число элементов, `k` — количество массивов. Каждый из `n` элементов
проходит через push/pop кучи размера ≤ k за O(log k).

</details>

## ⚠️ Типичные ошибки

1. **Не сохранён источник элемента** — в куче нужно хранить индекс массива и позицию,
   иначе непонятно, какой элемент подкладывать следующим.
2. **Добавление пустых массивов на старте** — кладите в кучу только первый элемент
   *непустых* массивов.
3. **Выход за границу при подкладывании** — проверяйте `next < len(arrays[idx])`
   перед push.
4. **Сравнение в `Less` наоборот** — для min-heap это `h[i].Val < h[j].Val`; знак `>`
   даст max-heap и неверный порядок.
5. **Забыли `heap.Init`** — куча, собранная без Init/Push, не поддерживает инвариант.

## 🧩 Задачи

**LeetCode:**

- [Merge k Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/)
- [Kth Smallest Element in a Sorted Matrix](https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/)
- [Find K Pairs with Smallest Sums](https://leetcode.com/problems/find-k-pairs-with-smallest-sums/) (сложная)
- [Smallest Range Covering Elements from K Lists](https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/) (сложная)

**Тренажёр** — пакет `kwaymerge`:

```bash
cd exercises
go test ./kwaymerge/                 # ваши решения
go test -tags solution ./kwaymerge/  # эталон
```

Реализуйте `MergeKSortedArrays` (слить k массивов), `KthSmallestInSortedArrays`
(k-й наименьший), `SmallestRange` (наименьший диапазон, покрывающий все списки) и
`KthSmallestInMatrix` (k-й наименьший в сортированной матрице).

## 🔗 Связанные шаблоны

- **[Top K Elements](top-k-elements.md)** — тоже опирается на кучу для выбора
  экстремальных элементов.
- **[Two Heaps](two-heaps.md)** — другой шаблон на основе куч.
- **[Modified Binary Search](modified-binary-search.md)** — альтернатива для
  отсортированных данных.
- Для общей теории по памяти и профилированию в Go см. [приложение](appendix-go-memory.md).
