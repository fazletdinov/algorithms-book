# 🏆 Top K Elements (Топ K элементов)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Top K Elements <span class="algo-hero__ru">Топ K</span></div>
    <div class="algo-hero__tag">K наибольших / наименьших / частых без полной сортировки</div>
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
      <li>нужно K наибольших / наименьших элементов</li>
      <li>K наиболее частых элементов</li>
      <li>задача про приоритеты или ранжирование</li>
      <li>выгодно без полной сортировки при <code>k ≪ n</code></li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>нужен полный отсортированный порядок</li>
      <li><code>k ≈ n</code> — проще отсортировать целиком</li>
      <li>нужна медиана/баланс двух половин (тогда Two Heaps)</li>
      <li>данные не сравнимы по приоритету</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> слова <b>«K наибольших / наименьших / самых частых», «K-й по величине», «K ближайших»</b> · «top K», «kth largest» · намёк, что полная сортировка избыточна.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li>для <b>K наибольших</b> держи <b>min-heap размера k</b>: вершина — худший из лучших;</li>
      <li>новый элемент &gt; вершины → вытолкни вершину, вставь новый;</li>
      <li>для <b>K наименьших</b> симметрично — max-heap;</li>
      <li>в конце в куче ровно K нужных элементов.</li>
    </ul>
    <p>Куча размера k даёт O(n log k) против O(n log n) полной сортировки — выигрыш при малом k.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация.** Идём по массиву (текущий жёлтый, обработанные тускнеют), а внизу
> — min-heap размера k (минимум подсвечен). Когда размер превышает k, выкидываем минимум. Справа —
> код с подсветкой строки и переменные, внизу — шаги. Можно подставить свой массив и `k` и нажать
> «⟲ Запустить». (Виджет работает в собранной книге `mdbook serve`/`mdbook build`, а не при просмотре
> `.md` на GitHub.)

<div class="algo-viz" data-viz="top-k" data-array="5,3,8,1,9,2" data-k="3"></div>

## ⚡ Шаблон для собеседования

```go
h := &MinHeap{} // куча из k наибольших
for _, num := range nums {
    heap.Push(h, num)
    if h.Len() > k {
        heap.Pop(h) // выкинуть минимум — он не в топе
    }
}
// в h — k наибольших элементов
```

1. кладём каждый элемент в min-heap;
2. как только размер превысил `k` — выкидываем минимум;
3. остаётся ровно `k` наибольших.

## 📖 Разбор

<details class="algo-details">
<summary>Теория, K наибольших, K частых и сложность</summary>

**Top K Elements** — шаблон для поиска K наибольших, наименьших или наиболее частых
элементов коллекции без полной сортировки. Ключевая идея — поддерживать **кучу
размера K** (приоритетную очередь): нам не нужны все элементы в порядке, достаточно
держать инвариант «в куче — K лучших».

```go
import "container/heap"

// MinHeap — для K наибольших (минимум на вершине)
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

func findKLargest(nums []int, k int) []int {
    if k <= 0 || len(nums) == 0 {
        return nil
    }
    h := &MinHeap{}
    heap.Init(h)
    for _, num := range nums {
        if h.Len() < k {
            heap.Push(h, num)
        } else if num > (*h)[0] { // больше худшего из лучших — заменяем
            heap.Pop(h)
            heap.Push(h, num)
        }
    }
    result := make([]int, h.Len())
    for i := len(result) - 1; i >= 0; i-- {
        result[i] = heap.Pop(h).(int)
    }
    return result
}
```

Для **K наиболее частых** сначала считаем частоты в `map`, затем тем же приёмом
отбираем K элементов с наибольшей частотой:

```go
func topKFrequent(nums []int, k int) []int {
    freq := make(map[int]int, len(nums))
    for _, num := range nums {
        freq[num]++
    }
    type pair struct{ num, count int }
    pairs := make([]pair, 0, len(freq))
    for num, count := range freq {
        pairs = append(pairs, pair{num, count})
    }
    sort.Slice(pairs, func(i, j int) bool { return pairs[i].count > pairs[j].count })
    result := make([]int, k)
    for i := 0; i < k; i++ {
        result[i] = pairs[i].num
    }
    return result
}
```

#### Сложность

| Задача                | Время       | Память |
|-----------------------|-------------|--------|
| K наибольших/наименьших | O(n log k) | O(k)   |
| K наиболее частых     | O(n + k log k) | O(n)  |

Куча размера K даёт O(n log k) против O(n log n) полной сортировки — заметный выигрыш
при малом k.

</details>

## ⚠️ Типичные ошибки

1. **Неправильный тип кучи** — для K наибольших нужен min-heap, для K наименьших — max-heap.
2. **Сравнение не с вершиной** — новый элемент сравнивайте именно с корнем кучи `(*h)[0]`.
3. **Куча не ограничена по размеру** — забыв вытолкнуть лишнее, получаете O(n log n) и O(n) памяти.
4. **Пустой массив или `k = 0`** — возвращайте пустой результат до работы с кучей.
5. **`k >= len(nums)`** — тогда возвращаются все элементы, отдельная обработка не нужна, но проверьте границы.
6. **Большое k** (`k > n/2`) — куча перестаёт быть выгодной, рассмотрите QuickSelect или сортировку.

## 🧩 Задачи

**LeetCode:**

- [Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/)
- [Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/)
- [K Closest Points to Origin](https://leetcode.com/problems/k-closest-points-to-origin/)
- [Sort Characters By Frequency](https://leetcode.com/problems/sort-characters-by-frequency/)
- [Merge k Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/) (сложная)
- [Find K Pairs with Smallest Sums](https://leetcode.com/problems/find-k-pairs-with-smallest-sums/) (сложная)

**Тренажёр** — пакет `topk`:

```bash
cd exercises
go test ./topk/                 # ваши решения
go test -tags solution ./topk/  # эталон
```

Реализуйте `FindKLargest` (k наибольших), `TopKFrequent` (k самых частых),
`KthLargest` (k-й по величине), `KClosestPoints` (k ближайших точек к началу координат)
и `KClosestNumbers` (k ближайших к x).

## 🔗 Связанные шаблоны

- **[Two Heaps](./two-heaps.md)** — две кучи для поддержания медианы.
- **[K-way Merge](./k-way-merge.md)** — куча для слияния отсортированных массивов.
- **[Sliding Window](./sliding-window.md)** — комбинируется с кучей для максимума/минимума в окне.
- Для общей теории по памяти и профилированию в Go см. [приложение](appendix-go-memory.md).
