# 🗻 Two Heaps (Две кучи)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Two Heaps <span class="algo-hero__ru">Две кучи</span></div>
    <div class="algo-hero__tag">Медиана потока и баланс двух половин через max-heap + min-heap</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Вставка</span><b>O(log n)</b></div>
    <div class="algo-hero__metric"><span>Медиана</span><b>O(1)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>поддерживать <b>медиану потока</b> чисел</li>
      <li>данные делятся на «меньшую» и «большую» половины с балансом</li>
      <li>нужен K-й элемент или баланс между двумя множествами</li>
      <li>скользящая медиана, планирование с приоритетами</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>достаточно одной кучи (тогда это Top K)</li>
      <li>данные статичны — проще один раз отсортировать</li>
      <li>не нужен порядок/медиана, а только наличие элемента</li>
      <li>нужен произвольный доступ по индексу</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«медиана потока», «median from data stream»</b> · «две половины», «баланс множеств», «скользящая медиана» · элементы приходят по одному.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li><b>max-heap</b> хранит меньшую половину, <b>min-heap</b> — большую;</li>
      <li>инвариант: любой из max-heap ≤ любого из min-heap, размеры отличаются ≤ 1;</li>
      <li>медиана = вершина большей кучи (или среднее двух вершин при равных размерах);</li>
      <li>после каждой вставки <b>балансируй</b> размеры переносом вершины.</li>
    </ul>
    <p>Медиану двух вершин считай через <code>float64</code>, иначе <code>(2+3)/2</code> даст 2 вместо 2.5.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация.** Число попадает в одну из половин, кучи балансируются, медиана
> читается с вершин (подсвечены). Справа — код с подсветкой строки и переменные, внизу — кликабельные
> шаги. Можно подставить свой поток и нажать «⟲ Запустить». (Виджет работает в собранной книге
> `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="two-heaps-median" data-stream="5,15,1,3,8,7,9,10,20,6"></div>

## ⚡ Шаблон для собеседования

```go
func (mf *MedianFinder) AddNum(num int) {
    if mf.lo.Len() == 0 || num <= mf.lo.Top() {
        heap.Push(mf.lo, num) // max-heap: меньшая половина
    } else {
        heap.Push(mf.hi, num) // min-heap: большая половина
    }
    // балансировка: размеры отличаются не более чем на 1
    if mf.lo.Len() > mf.hi.Len()+1 {
        heap.Push(mf.hi, heap.Pop(mf.lo))
    } else if mf.hi.Len() > mf.lo.Len()+1 {
        heap.Push(mf.lo, heap.Pop(mf.hi))
    }
}
// медиана: равные размеры → среднее вершин; иначе вершина большей кучи
```

1. кладём в нужную кучу по сравнению с вершиной max-heap;
2. балансируем размеры переносом вершины;
3. медиана читается с вершин за O(1).

## 📖 Разбор

<details class="algo-details">
<summary>Теория, полная реализация на container/heap и сложность</summary>

**Two Heaps** хранит данные в двух кучах: max-heap для меньшей половины элементов и
min-heap для большей. Медиана разделяет отсортированный набор на две равные части —
держа это разделение, мы получаем медиану из вершин куч за O(1), а вставку — за O(log n),
вместо пересортировки всего набора.

Инвариант после каждой вставки: любой элемент max-heap ≤ любого элемента min-heap;
размеры куч отличаются не более чем на 1.

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

// MinHeap — большая половина (минимум на вершине): аналогично, но Less даёт h[i] < h[j]

type MedianFinder struct {
    maxHeap *MaxHeap // все элементы <= медианы
    minHeap *MinHeap // все элементы >= медианы
}

func (mf *MedianFinder) AddNum(num int) {
    if mf.maxHeap.Len() == 0 || num <= (*mf.maxHeap)[0] {
        heap.Push(mf.maxHeap, num)
    } else {
        heap.Push(mf.minHeap, num)
    }
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

**Куча (heap)** — приоритетная очередь: min-heap даёт минимум за O(1), max-heap —
максимум, вставка и удаление — за O(log n). В Go куча реализуется через `container/heap`
поверх среза.

#### Сложность

| Операция     | Время    | Память |
|--------------|----------|--------|
| `AddNum`     | O(log n) | O(n)   |
| `FindMedian` | O(1)     | O(1)   |

</details>

## 🧠 Почему это корректно

Вся корректность держится на **двух инвариантах** и на том, что вставка их сохраняет.

### Инварианты и почему из них следует медиана

1. **Порядок:** любой элемент max-heap ≤ любого элемента min-heap. Значит max-heap —
   это в точности *меньшая половина*, min-heap — *большая*, а граница между ними проходит
   ровно по медиане.
2. **Баланс:** размеры отличаются не более чем на 1.

Из (1) следует, что медиана — на **границе** половин: при нечётном общем числе это
вершина большей кучи, при чётном — среднее вершин обеих. Поэтому `FindMedian` за `O(1)`
смотрит только на вершины — не нужен весь отсортированный набор, нужна лишь **середина**.

### Почему вставка сохраняет инварианты

Шаг 1 — кладём `num` в правильную половину: сравнение с вершиной max-heap решает, в
меньшую или большую половину он попадает → инвариант (1) держится. Шаг 2 — это могло
нарушить баланс (2); чинит **перенос вершины** из переполненной кучи в другую.

Почему перенос не ломает (1)? Переносится **экстремум** — вершина max-heap (наибольший
из меньшей половины) или вершина min-heap (наименьший из большей). Это ровно граничный
элемент: он `≤` всего в min-heap и `≥` всего в max-heap, поэтому, переехав, он
оказывается корректным минимумом/максимумом принимающей кучи. Оба инварианта
восстановлены за одну операцию.

Каждая вставка — одна-две операции с кучей по `O(log n)`.

## ⚙️ Цена на практике

### Почему две кучи, а не отсортированная структура

Отсортированный массив даёт медиану за `O(1)`, но вставку за `O(n)` (сдвиг).
Сбалансированное дерево — `O(log n)` на всё, но тяжелее в реализации. Две кучи дают
`O(log n)` вставку **и** `O(1)` медиану на простых срезах. Фокус: тебе не нужен полный
порядок — нужна только **граница по середине**, а её две кучи и обнажают.

### Скользящая медиана: удаление — вот где сложно

В `SlidingWindowMedian` при сдвиге окна нужно **удалить** выбывший элемент, а куча не
умеет удалять произвольный элемент за `O(log n)` из коробки. Решение — **ленивое
удаление**: пометить выбывший и пропускать, когда он всплывёт на вершину (плюс
балансировать счётчики «эффективных» размеров). Это самая ошибкоопасная часть паттерна —
её и проверяет [рандом-тест тренажёра](https://github.com/fazletdinov/algorithms-book).

### Паттерн шире медианы

«Поддерживать порог, делящий поток на две части» — это всегда две кучи. В `MaximizeCapital`
(IPO) одна куча хранит проекты, доступные по текущему капиталу, вторая выбирает из них
максимально прибыльный — та же идея «две кучи под две роли».

## ⚠️ Типичные ошибки

1. **Сломанная балансировка** — после каждой вставки разница размеров должна оставаться
   ≤ 1; иначе вершина перестаёт быть медианой.
2. **Перепутаны типы куч** — меньшая половина в max-heap, большая в min-heap; обратный
   выбор нарушает инвариант «maxHeap ≤ minHeap».
3. **Деление на целых** — медиану двух вершин считайте через `float64`, иначе потеряете
   половину (`(2+3)/2 == 2` вместо `2.5`).
4. **Чтение медианы из пустой структуры** — проверяйте, что хотя бы одна куча непуста.
5. **Сравнение не с той вершиной** — выбор кучи для нового элемента делается по вершине
   max-heap, а не min-heap.

## 🧩 Задачи

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

## 🔗 Связанные шаблоны

- **[Top K Elements](./top-k-elements.md)** — одна куча для поиска K наибольших/наименьших.
- **[K-way Merge](./k-way-merge.md)** — куча для слияния нескольких отсортированных списков.
- По работе с памятью и профилированию в Go см. [приложение](appendix-go-memory.md).
