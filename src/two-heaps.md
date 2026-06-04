# Two Heaps (Две кучи)

## Теория

**Two Heaps** хранит данные в двух кучах: max-heap для меньшей половины элементов и
min-heap для большей. Медиана разделяет отсортированный набор на две равные части —
держа это разделение, мы получаем медиану из вершин куч за O(1), а вставку — за O(log n),
вместо пересортировки всего набора.

Инвариант, который поддерживается после каждой вставки:

- любой элемент max-heap ≤ любого элемента min-heap;
- размеры куч отличаются не более чем на 1.

**Когда применять:**

- нужно поддерживать медиану потока чисел;
- данные делятся на «меньшую» и «большую» половины с балансировкой;
- ищется K-й элемент или баланс между двумя множествами.

**Куча (heap)** — приоритетная очередь: min-heap даёт минимум за O(1), max-heap —
максимум, вставка и удаление — за O(log n). В Go куча реализуется через `container/heap`
поверх среза. См. также [Глоссарий](./glossary.md).

## Алгоритм

Новый элемент кладём в `maxHeap`, если он не больше его вершины, иначе в `minHeap`. Затем
выравниваем размеры: если одна куча переросла другую больше чем на 1, переносим вершину.
Медиана — это вершина большей кучи либо среднее двух вершин при равных размерах.

```go
import "container/heap"

// MaxHeap — меньшая половина (максимум на вершине)
type MaxHeap []int

func (h MaxHeap) Len() int            { return len(h) }
func (h MaxHeap) Less(i, j int) bool  { return h[i] > h[j] } // обратный порядок
func (h MaxHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *MaxHeap) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *MaxHeap) Pop() interface{} {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[:n-1]
    return x
}

// MinHeap — большая половина (минимум на вершине)
type MinHeap []int

func (h MinHeap) Len() int            { return len(h) }
func (h MinHeap) Less(i, j int) bool  { return h[i] < h[j] }
func (h MinHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *MinHeap) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *MinHeap) Pop() interface{} {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[:n-1]
    return x
}

type MedianFinder struct {
    maxHeap *MaxHeap // все элементы <= медианы
    minHeap *MinHeap // все элементы >= медианы
}

func NewMedianFinder() *MedianFinder {
    return &MedianFinder{maxHeap: &MaxHeap{}, minHeap: &MinHeap{}}
}

func (mf *MedianFinder) AddNum(num int) {
    if mf.maxHeap.Len() == 0 || num <= (*mf.maxHeap)[0] {
        heap.Push(mf.maxHeap, num)
    } else {
        heap.Push(mf.minHeap, num)
    }

    // балансировка: размеры отличаются не более чем на 1
    if mf.maxHeap.Len() > mf.minHeap.Len()+1 {
        heap.Push(mf.minHeap, heap.Pop(mf.maxHeap).(int))
    } else if mf.minHeap.Len() > mf.maxHeap.Len()+1 {
        heap.Push(mf.maxHeap, heap.Pop(mf.minHeap).(int))
    }
}

func (mf *MedianFinder) FindMedian() float64 {
    switch {
    case mf.maxHeap.Len() == mf.minHeap.Len():
        return float64((*mf.maxHeap)[0]+(*mf.minHeap)[0]) / 2.0
    case mf.maxHeap.Len() > mf.minHeap.Len():
        return float64((*mf.maxHeap)[0])
    default:
        return float64((*mf.minHeap)[0])
    }
}
```

### Сложность

| Операция     | Время    | Память |
|--------------|----------|--------|
| `AddNum`     | O(log n) | O(n)   |
| `FindMedian` | O(1)     | O(1)   |

## Визуализация

> 💡 **Интерактивная демонстрация.** Нажимайте «▶»: число попадает в одну из половин,
> кучи балансируются, а медиана читается с вершин (подсвечены). (Виджет работает в
> собранной книге `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="two-heaps-median" data-stream="5,15,1,3,8,7,9,10,20,6"></div>

Поток `[1, 5, 2, 3, 4]`, состояние после каждого добавления (maxHeap — меньшая половина,
вершина указана первой):

```
+1:  maxHeap=[1]      minHeap=[]       размеры 1:0   медиана = 1
+5:  maxHeap=[1]      minHeap=[5]      размеры 1:1   медиана = (1+5)/2 = 3
+2:  maxHeap=[2,1]    minHeap=[5]      размеры 2:1   медиана = 2
+3:  maxHeap=[2,1]    minHeap=[3,5]    размеры 2:2   медиана = (2+3)/2 = 2.5
+4:  maxHeap=[3,2,1]  minHeap=[4,5]    размеры 3:2   медиана = 3
```

Шаг `+4`: число 4 больше вершины maxHeap (2), поэтому идёт в minHeap → размеры 2:3.
Разница превысила 1, переносим вершину minHeap (3) в maxHeap → баланс 3:2, медиана = 3.

## Типичные ошибки

1. **Сломанная балансировка** — после каждой вставки разница размеров должна оставаться
   ≤ 1; иначе вершина перестаёт быть медианой.
2. **Перепутаны типы куч** — меньшая половина в max-heap, большая в min-heap; обратный
   выбор нарушает инвариант «maxHeap ≤ minHeap».
3. **Деление на целых** — медиану двух вершин считайте через `float64`, иначе потеряете
   половину (`(2+3)/2 == 2` вместо `2.5`).
4. **Чтение медианы из пустой структуры** — проверяйте, что хотя бы одна куча непуста.
5. **Сравнение не с той вершиной** — выбор кучи для нового элемента делается по вершине
   max-heap, а не min-heap.

## Задачи

**LeetCode:**

- [Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/)
- [Sliding Window Median](https://leetcode.com/problems/sliding-window-median/)
- [IPO](https://leetcode.com/problems/ipo/) (сложная)
- [Design Twitter](https://leetcode.com/problems/design-twitter/) (сложная)
- [The Skyline Problem](https://leetcode.com/problems/the-skyline-problem/) (сложная)
- [Kth Largest Element in a Stream](https://leetcode.com/problems/kth-largest-element-in-a-stream/)

**Тренажёр** — пакет `twoheaps`:

```bash
cd exercises
go test ./twoheaps/                 # ваши решения
go test -tags solution ./twoheaps/  # эталон
```

Реализуйте `MedianFinder` (медиана потока: `NewMedianFinder`/`AddNum`/`FindMedian`),
`SlidingWindowMedian` (медиана скользящего окна) и `MaximizeCapital` (задача IPO).

## Связанные шаблоны

- **[Top K Elements](./top-k-elements.md)** — одна куча для поиска K наибольших/наименьших.
- **[K-way Merge](./k-way-merge.md)** — куча для слияния нескольких отсортированных списков.
- По работе с памятью и профилированию в Go см. [приложение](appendix-go-memory.md).
