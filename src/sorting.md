# 🔢 Алгоритмы сортировки и порядковые статистики

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Sorting <span class="algo-hero__ru">Сортировки</span></div>
    <div class="algo-hero__tag">Упорядочить данные — и десятки задач решаются за O(n log n) или быстрее</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Сравнениями</span><b>O(n log n)</b></div>
    <div class="algo-hero__metric"><span>Подсчётом</span><b>O(n + k)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда сортировать</div>
    <ul>
      <li>порядок упрощает задачу: дубликаты, k-й по величине, пары с условием;</li>
      <li>нужен <b>стабильный</b> порядок (по нескольким ключам) — merge sort;</li>
      <li>числа в узком диапазоне — подсчётом за <b>O(n + k)</b>;</li>
      <li>нужен лишь <b>один</b> элемент по рангу — QuickSelect за O(n).</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ сортировать</div>
    <ul>
      <li>достаточно одного прохода (сумма, максимум) — сортировка лишняя;</li>
      <li>порядок важен сам по себе и сортировать его нельзя;</li>
      <li>данные уже отсортированы — проверь это до O(n log n);</li>
      <li>нужен top-k в потоке — куча (heap), а не полная сортировка.</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать:</b> «<b>k-й наибольший / наименьший</b>», «найти дубликаты», «сгруппировать одинаковые», «пары/тройки с суммой», «расписание по времени», «медиана» — почти всегда первым шагом стоит сортировка (или её частный приём — QuickSelect / подсчёт).</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Карта сортировок — что выбрать</div>
    <ul>
      <li><b>Merge sort</b> — гарантированные O(n log n), <b>устойчива</b>, но O(n) памяти. Внешняя сортировка, связные списки, сортировка по нескольким ключам.</li>
      <li><b>Quick sort</b> — O(n log n) в среднем, на месте, отличная константа. Худший случай O(n²) лечится случайным pivot. Это «рабочая лошадь» в памяти.</li>
      <li><b>Heap sort</b> — гарантированные O(n log n) и O(1) памяти, но плохо дружит с кэшем. Когда память критична, а worst-case недопустим.</li>
      <li><b>Counting sort</b> — O(n + k) без сравнений, когда ключи — целые в узком диапазоне.</li>
      <li><b>QuickSelect</b> — не сортирует весь массив: k-й элемент по рангу за O(n) в среднем.</li>
    </ul>
    <p>Сравнениями нельзя быстрее <b>O(n log n)</b> — это доказанная нижняя граница (см. «Почему это корректно»). Обойти её можно, только перестав сравнивать элементы (counting / radix).</p>
  </div>
</div>

## ⚡ Что помнить на собеседовании

В памяти языка почти всегда вызывают встроенную сортировку — `slices.Sort` в Go (это
[pattern-defeating quicksort](#-цена-на-практике)). Свою сортировку пишут, чтобы
**показать понимание**: чаще всего просят merge sort (устойчивость, divide-and-conquer)
или partition из quick sort (он же — основа QuickSelect). Эти два приёма — обязательный
минимум.

```go
import "slices"

slices.Sort(nums)                                   // по возрастанию, O(n log n)
slices.SortFunc(p, func(a, b Point) int {           // по своему компаратору
    return a.X - b.X                                // <0, 0, >0
})
slices.SortStableFunc(recs, byKey)                  // устойчивая (сохраняет порядок равных)
```

<div class="algo-mental">
  <div class="algo-mental__icon">✍️</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Прогони руками — до того, как читать дальше</div>
    <p>Возьми <code>[5, 2, 4, 1, 3]</code> и вручную прогони <b>partition Ломуто</b> (pivot = последний, <code>3</code>): выписывай <code>i</code>, <code>j</code> и массив после каждого шага. Где в итоге окажется <code>3</code>? Почему всё слева от него меньше, а справа — больше?</p>
    <p>Затем слей две половины <code>[2, 5]</code> и <code>[1, 3, 4]</code> вручную: на каждом шаге сравнивай головы и выписывай, какую выдал. Сколько всего сравнений? Совпадает ли с длиной результата минус один в лучшем случае?</p>
    <p>Сделав это руками, ты выведешь инварианты из раздела «Почему это корректно» сам — до того, как я их сформулирую.</p>
  </div>
</div>

## 📊 Сравнение алгоритмов

| Алгоритм        | Время (средн.) | Время (худш.) | Память   | Устойчива | На месте |
|-----------------|----------------|---------------|----------|-----------|----------|
| Insertion sort  | O(n²)          | O(n²)         | O(1)     | ✅        | ✅       |
| Merge sort      | O(n log n)     | O(n log n)    | O(n)     | ✅        | ❌       |
| Quick sort      | O(n log n)     | O(n²)         | O(log n) | ❌        | ✅       |
| Heap sort       | O(n log n)     | O(n log n)    | O(1)     | ❌        | ✅       |
| Counting sort   | O(n + k)       | O(n + k)      | O(n + k) | ✅        | ❌       |

*Устойчивая (stable)* — равные элементы сохраняют исходный относительный порядок. Это
критично при сортировке по нескольким ключам подряд. *На месте (in-place)* — без
дополнительной памяти сверх O(log n).

## 1. Сортировка вставками (Insertion Sort)

Простейшая и поучительная: держим **отсортированный префикс** слева и по одному
«вставляем» в него следующий элемент, сдвигая большие вправо. На почти отсортированных
данных работает за O(n) — поэтому именно ею встроенные сортировки добивают мелкие
куски.

```go
func insertionSort(a []int) {
    for i := 1; i < len(a); i++ {
        key := a[i]
        j := i - 1
        for j >= 0 && a[j] > key {
            a[j+1] = a[j] // сдвигаем больший элемент вправо
            j--
        }
        a[j+1] = key // вставляем key на освободившееся место
    }
}
```

Зелёным — растущий отсортированный префикс; `key` (янтарный) «всплывает» влево, пока
слева есть элементы больше него:

<div class="algo-viz" data-viz="insertion-sort" data-array="5,2,4,1,3,6"></div>

## 2. Сортировка слиянием (Merge Sort)

**Divide and conquer**: делим массив пополам, рекурсивно сортируем половины и **сливаем**
два отсортированных куска в один за O(n). Глубина рекурсии log n, на каждом уровне суммарно
O(n) работы — итого O(n log n), причём **всегда**, без худшего случая.

```go
func mergeSort(a []int) []int {
    if len(a) <= 1 {
        return a
    }
    mid := len(a) / 2
    left := mergeSort(a[:mid])
    right := mergeSort(a[mid:])
    return merge(left, right)
}

func merge(left, right []int) []int {
    out := make([]int, 0, len(left)+len(right))
    i, j := 0, 0
    for i < len(left) && j < len(right) {
        if left[i] <= right[j] { // ≤, а не < — это и даёт устойчивость
            out = append(out, left[i])
            i++
        } else {
            out = append(out, right[j])
            j++
        }
    }
    out = append(out, left[i:]...)  // хвост одной из половин
    out = append(out, right[j:]...)
    return out
}
```

Сердце алгоритма — **слияние**. Массив не двигаем: сравниваем головы двух отсортированных
половин и «выдаём» меньшую в результат (клетки зеленеют в порядке выдачи). Левую половину
указывает `i`, правую — `j`:

<div class="algo-viz" data-viz="merge-sort" data-array="2,5,8,1,3,6,7" data-mid="3"></div>

## 3. Быстрая сортировка (Quick Sort)

Тоже divide and conquer, но деление «умное»: выбираем **pivot** и за один проход
**разбиваем** массив на «меньше pivot» и «больше pivot» (partition). Pivot встаёт на
финальное место, дальше рекурсия в обе части. В среднем O(n log n) с лучшей в классе
константой; работает на месте.

```go
func quickSort(a []int, lo, hi int) {
    if lo >= hi {
        return
    }
    p := partition(a, lo, hi) // pivot встал на место p
    quickSort(a, lo, p-1)
    quickSort(a, p+1, hi)
}

// Схема Ломуто: pivot = a[hi], i — граница зоны «меньше pivot».
func partition(a []int, lo, hi int) int {
    pivot := a[hi]
    i := lo
    for j := lo; j < hi; j++ {
        if a[j] < pivot {
            a[i], a[j] = a[j], a[i]
            i++
        }
    }
    a[i], a[hi] = a[hi], a[i] // pivot между зонами
    return i
}
```

Ключевой шаг — **partition**. Зелёная зона слева — «меньше pivot», `i` её граница, `j`
сканирует остаток, pivot (янтарный) ждёт в конце и встаёт на своё место последним:

<div class="algo-viz" data-viz="quick-sort" data-array="7,2,9,4,3,8,1,5"></div>

> ⚠️ Фиксированный pivot (всегда последний) даёт O(n²) на **уже отсортированном** входе —
> классический «провал» наивного quicksort. Лечится выбором **случайного** pivot или
> «медианы трёх». Подробнее — в [«Почему это корректно»](#-почему-это-корректно).

## 4. Пирамидальная сортировка (Heap Sort)

Строим из массива **max-кучу** (heapify за O(n)), затем n−1 раз снимаем максимум из
корня в конец массива и восстанавливаем кучу просеиванием вниз. Гарантированные
O(n log n) и **O(1) памяти** — но прыжки по индексам кучи плохо ложатся в кэш.

```go
func heapSort(a []int) {
    n := len(a)
    for i := n/2 - 1; i >= 0; i-- { // построить кучу за O(n)
        siftDown(a, i, n)
    }
    for end := n - 1; end > 0; end-- {
        a[0], a[end] = a[end], a[0] // максимум — в конец
        siftDown(a, 0, end)         // восстановить кучу на [0, end)
    }
}

func siftDown(a []int, i, size int) {
    for {
        l, r, largest := 2*i+1, 2*i+2, i
        if l < size && a[l] > a[largest] {
            largest = l
        }
        if r < size && a[r] > a[largest] {
            largest = r
        }
        if largest == i {
            return
        }
        a[i], a[largest] = a[largest], a[i]
        i = largest
    }
}
```

> 🔍 Механику кучи (sift-up / sift-down на дереве и в массиве) подробно показывают
> интерактивные виджеты в главе [«Бинарная куча: устройство»](heap-structure.md) — heap
> sort это и есть повторное `siftDown`. Не дублируем здесь.

## 5. Сортировка подсчётом (Counting Sort)

Без единого сравнения: считаем, сколько раз встречается каждое значение, затем
разворачиваем счётчики в отсортированный массив. O(n + k), где k — ширина диапазона
значений. Быстрее любой сортировки сравнениями, **пока k не велик**.

```go
func countingSort(a []int) []int {
    if len(a) == 0 {
        return []int{}
    }
    min, max := a[0], a[0]
    for _, v := range a {
        if v < min { min = v }
        if v > max { max = v }
    }
    count := make([]int, max-min+1)
    for _, v := range a {
        count[v-min]++ // смещение на min — чтобы работать с отрицательными
    }
    out := make([]int, 0, len(a))
    for i, c := range count {
        for ; c > 0; c-- {
            out = append(out, i+min)
        }
    }
    return out
}
```

## 6. QuickSelect — k-й элемент за O(n)

Если нужен **не весь** отсортированный массив, а лишь k-й по величине — сортировать
целиком расточительно. QuickSelect — это quicksort, который рекурсирует только в **одну**
половину: ту, где лежит искомый ранг. Сумма n + n/2 + n/4 + … = O(n) в среднем.

```go
// k-й наименьший (k от 1). k=1 — минимум, k=len — максимум.
func quickSelect(a []int, k int) int {
    lo, hi, target := 0, len(a)-1, k-1
    for {
        if lo == hi {
            return a[lo]
        }
        p := partition(a, lo, hi)
        switch {
        case p == target:
            return a[p]
        case p < target:
            lo = p + 1 // искомый ранг правее — идём только вправо
        default:
            hi = p - 1
        }
    }
}
```

Окно поиска `[lo, hi]` сжимается: всё вне его (затемнено) отброшено, `pivot` после каждого
`partition` делит оставшееся и выкидывает половину — поэтому в среднем O(n), а не O(n log n):

<div class="algo-viz" data-viz="quick-select" data-array="7,2,9,4,3,8,1,5" data-k="4"></div>

## 🧠 Почему это корректно

Четыре вопроса отделяют «работает на примере» от «я знаю, почему»: **нижняя граница
O(n log n)**, **устойчивость merge**, **корректность partition** и **почему QuickSelect
линеен**.

### Нижняя граница: быстрее O(n log n) сравнениями нельзя

Любая сортировка, сравнивающая элементы, — это дерево решений: каждое сравнение даёт
один бит (`<` или `≥`). Чтобы различить все `n!` перестановок, нужно ≥ log₂(n!) листьев,
а log₂(n!) = Θ(n log n) (формула Стирлинга). Значит, **никакой** алгоритм сравнениями не
обгонит O(n log n) в худшем случае. Counting/radix обходят границу, потому что **не
сравнивают** — они адресуют по значению.

### Устойчивость merge — это `≤`, а не `<`

В `merge` при равенстве голов (`left[i] <= right[j]`) мы берём из **левой** половины.
Левая половина в исходном массиве шла раньше — значит, равные элементы сохраняют
относительный порядок. Замени `≤` на `<` — устойчивость сломается, хотя массив всё ещё
будет отсортирован. Это та деталь, на которой валятся на собеседовании.

### Инвариант partition (Ломуто)

На каждой итерации `j` поддерживается: **`a[lo..i-1]` < pivot**, **`a[i..j-1]` ≥ pivot**,
`a[hi]` = pivot. Когда `a[j] < pivot`, мы свопаем его в позицию `i` (граница) и двигаем
`i` — инвариант сохраняется. После цикла всё левее `i` меньше pivot; финальный своп
`a[i] ↔ a[hi]` ставит pivot в `i`, и он оказывается **на своём окончательном месте** в
отсортированном массиве. Поэтому рекурсия не трогает `a[p]` — он уже корректен.

### Почему QuickSelect — O(n) в среднем, а quicksort — O(n log n)

Quicksort рекурсирует в **обе** половины: T(n) = 2·T(n/2) + O(n) = O(n log n).
QuickSelect — только в **одну**: T(n) = T(n/2) + O(n) = O(n) (геометрическая сумма
n + n/2 + … → 2n). Оба деградируют до O(n²) при злом pivot (например, всегда минимум на
отсортированном входе) — поэтому на практике pivot **рандомизируют**: тогда матожидание
числа сравнений снова линейно/логарифмически, независимо от входных данных.

## ⚙️ Цена на практике

### Что вызывает `slices.Sort` в Go

Стандартная `slices.Sort` (и `sort.Slice`) — это **pattern-defeating quicksort
(pdqsort)**, проверено по исходникам Go (`slices.Sort → pdqsortOrdered`). Это гибрид:
quicksort с медианой-из-трёх в общем случае, **переключение на insertion sort** для
коротких кусков (≤ 12 элементов — где квадратичная сортировка с её крошечной константой и
дружбой с кэшем реально быстрее) и **аварийный откат на heapsort**, если рекурсия
заходит слишком глубоко (защита от O(n²)). Итог: быстро в среднем и **гарантированные
O(n log n)** в худшем случае. `slices.SortFunc` **не устойчива** — для устойчивости есть
`slices.SortStableFunc`.

### Устойчивость стоит памяти

`slices.Sort`/quicksort неустойчивы, зато на месте. Устойчивая сортировка (merge,
`SortStableFunc`) требует O(n) дополнительной памяти или хитрого block-merge. Правило:
если порядок равных не важен — бери неустойчивую (быстрее, без аллокаций); если
сортируешь по второму ключу, сохраняя первый, — нужна устойчивая.

### Аллокации: in-place против копии

`mergeSort` выше возвращает **новый** срез и аллоцирует на каждом слиянии — наглядно, но
на горячем пути дорого. Промышленный merge sort использует **один** буфер на весь вызов
(`make([]int, n)` один раз) и сливает в него. `quickSort`/`heapSort` не аллоцируют вовсе.
Когда меряешь (`testing.B`, `pprof`) — аллокации в merge часто и есть «скрытая»
константа.

### O(n log n) не всегда быстрее O(n²)

На `n ≤ 12` insertion sort обгоняет любой quicksort из-за константы и кэша — именно
поэтому pdqsort переключается на неё. «Асимптотически лучше» ≠ «быстрее на твоих данных».
Меряй, а не угадывай — это привычка инженера, а не кодера.

### Counting sort: O(n + k) — палка о двух концах

Для `[]int{1, 1000000}` диапазон k = 10⁶: counting sort выделит миллион счётчиков ради
двух чисел. Она выигрывает, **только** когда k = O(n) (узкий диапазон: оценки 0..100,
байты, возрасты). Иначе — мусор в памяти и проигрыш quicksort.

## ⚠️ Типичные ошибки

1. **`<` вместо `≤` в merge** — массив отсортируется, но сортировка перестанет быть
   устойчивой. Тихо ломает сортировку по нескольким ключам.
2. **Фиксированный pivot** в quicksort/quickselect — O(n²) на отсортированном входе.
   Рандомизируй pivot или бери медиану трёх.
3. **Переполнение в `(lo+hi)/2`** при больших индексах — в Go для `int` на 64 битах
   неактуально, но `lo + (hi-lo)/2` — хорошая привычка из бинпоиска.
4. **Counting sort с отрицательными** без смещения на `min` — выход за границы массива
   счётчиков (паника).
5. **QuickSelect возвращает не то** — путаница 0-/1-индексации `k`. Зафиксируй контракт
   (здесь `k` от 1) и считай `target := k-1`.
6. **Рекурсия quicksort без хвостовой оптимизации** на отсортированном входе — глубина
   O(n) и переполнение стека. Рекурсируй в меньшую часть, большую — циклом.

## 📝 Разбор задачи: k-й наибольший элемент

> **Задача** ([LeetCode 215](https://leetcode.com/problems/kth-largest-element-in-an-array/)).
> Дан массив `nums` и число `k`. Вернуть k-й **наибольший** элемент (по значению, не по
> уникальности). Пример: `nums = [3,2,1,5,6,4]`, `k = 2` → `5`.

**Шаг 1. Наивно: отсортировать — O(n log n).**

```go
func findKthLargest(nums []int, k int) int {
    slices.Sort(nums)
    return nums[len(nums)-k] // k-й с конца
}
```

Работает и проходит. Но мы сортируем **весь** массив ради одного элемента — лишняя работа.

**Шаг 2. Наблюдение.** k-й наибольший — это `(n−k+1)`-й наименьший. Нам не нужен полный
порядок, нужен **один элемент по рангу** — это ровно задача QuickSelect.

**Шаг 3. Оптимум: QuickSelect — O(n) в среднем.**

```go
func findKthLargest(nums []int, k int) int {
    return quickSelect(nums, len(nums)-k+1) // (n−k+1)-й наименьший
}
```

Сортировка делает O(n log n) и упорядочивает всё; QuickSelect делает O(n) и находит
только нужный ранг. На собеседовании важно проговорить этот переход — он показывает, что
ты выбираешь алгоритм под задачу, а не лупишь сортировкой по всему.

## 🧩 Задачи

Реши прямо здесь — выбери вариант или впиши ответ, кнопка проверит. Готового решения рядом
нет: смысл в том, чтобы дойти самому.

<div class="algo-challenge" data-type="choice" data-options="Quick sort|Heap sort|Insertion sort|Merge sort" data-answer="2" data-explain="Вставками: O(1) памяти (на месте) И сохраняет порядок равных (устойчива). Quick/Heap неустойчивы, Merge не на месте.">
<div class="algo-challenge__q">Какая сортировка одновременно <b>устойчива</b> И работает <b>на месте</b>?</div>
</div>

<div class="algo-challenge" data-type="choice" data-options="O(n)|O(n log n)|O(log n)|O(√n)" data-answer="1" data-explain="Дерево решений из сравнений должно различить n! перестановок → высота ≥ log₂(n!) = Θ(n log n).">
<div class="algo-challenge__q">Нижняя граница времени сортировки <b>сравнениями</b>?</div>
</div>

<div class="algo-challenge" data-type="choice" data-options="Так быстрее|Для устойчивости|Чтобы сэкономить память" data-answer="1" data-explain="При равных головах берём из ЛЕВОЙ половины — она шла раньше, значит порядок равных сохраняется.">
<div class="algo-challenge__q">В <code>merge</code> при равных головах (<code>left[i] ≤ right[j]</code>) берут из <b>левой</b> половины. Зачем?</div>
</div>

<div class="algo-challenge" data-type="predict" data-answer="1" data-hint="Проследи i (граница «меньше») и j. Меньшие pivot уезжают влево." data-explain="3 не меньше 2; 1 меньше 2 → своп, i=1; финальный своп ставит pivot на индекс 1 → [1, 2, 3].">
<div class="algo-challenge__q">Partition Ломуто массива <code>[3, 1, 2]</code>, pivot = последний (2). На каком <b>индексе</b> окажется pivot?</div>
</div>

<div class="algo-challenge" data-type="choice" data-options="O(n log n)|O(n)|O(log n)" data-answer="1" data-explain="Рекурсия идёт только в ОДНУ половину: n + n/2 + n/4 + … = O(n) в среднем.">
<div class="algo-challenge__q">За сколько в среднем QuickSelect находит k-й элемент?</div>
</div>

<div class="algo-challenge" data-type="choice" data-options="Данные почти отсортированы|Диапазон значений k мал|Массив очень большой|Нужна устойчивость" data-answer="1" data-explain="Counting sort — O(n + k); она выигрывает, только когда k = O(n) (узкий диапазон). Иначе тратит память и время на весь диапазон.">
<div class="algo-challenge__q">Когда counting sort выгоднее quicksort?</div>
</div>

<div class="algo-challenge" data-type="choice" data-options="Merge sort|Pattern-defeating quicksort (pdqsort)|Heap sort|Пузырёк" data-answer="1" data-explain="slices.Sort → pdqsortOrdered: quicksort + insertion для мелких кусков + откат на heapsort от глубокой рекурсии.">
<div class="algo-challenge__q">Что под капотом у <code>slices.Sort</code> в Go?</div>
</div>

<div class="algo-challenge" data-type="predict" data-answer="3" data-hint="Снизу вверх ширина окна удваивается: 1, 2, 4…" data-explain="Bottom-up merge: проходы ширины 1→2→4 для 8 элементов = log₂8 = 3 уровня слияния.">
<div class="algo-challenge__q">Сколько уровней слияния сделает merge sort для массива из <b>8</b> элементов?</div>
</div>

**Прорешать целиком** — постановки в нашем тренажёре и на LeetCode (там же проверка):

- [Sort Colors](https://leetcode.com/problems/sort-colors/) (LeetCode 75) — голландский флаг, partition на 3 зоны
- [Merge Sorted Array](https://leetcode.com/problems/merge-sorted-array/) (LeetCode 88) — слияние с конца
- [Kth Largest Element](https://leetcode.com/problems/kth-largest-element-in-an-array/) (LeetCode 215) — QuickSelect
- [Sort an Array](https://leetcode.com/problems/sort-an-array/) (LeetCode 912) — напиши merge sort сам
- [Largest Number](https://leetcode.com/problems/largest-number/) (LeetCode 179) — нестандартный компаратор
- [Top K Frequent](https://leetcode.com/problems/top-k-frequent-elements/) (LeetCode 347) — bucket sort по частоте
- [Count of Smaller Numbers After Self](https://leetcode.com/problems/count-of-smaller-numbers-after-self/) (LeetCode 315) — merge sort + подсчёт инверсий
- [Maximum Gap](https://leetcode.com/problems/maximum-gap/) (LeetCode 164) — bucket/radix за O(n)

**Тренажёр** — пакет `sorting`:

```bash
cd exercises
go test ./sorting/                 # ваши реализации (красные)
go test -tags solution ./sorting/  # эталон (зелёные)
```

Реализуйте `MergeSort` (устойчивое слияние), `QuickSort` (partition + рекурсия),
`HeapSort` (heapify + извлечение), `CountingSort` (со смещением на min) и `QuickSelect`
(k-й наименьший за O(n)).

### 💻 Реши прямо здесь — пакет `sorting`

Напиши реализацию сам и проверь тестами, не выходя из книги. Готового решения нет:
зелёное — справился, красное — видно, какой тест упал. Подними локальный runner
(`cd exercises && go run ./cmd/runner`), затем обнови страницу.

<div class="algo-runner" data-pkg="sorting"></div>

## 🔗 Связанные шаблоны

- **[Бинарная куча: устройство](heap-structure.md)** — heap sort это повторное `siftDown`;
  там же интерактивные виджеты push/pop.
- **[Top K Elements](top-k-elements.md)** — когда нужен не полный порядок, а k элементов:
  куча или QuickSelect/bucket sort.
- **[Modified Binary Search](modified-binary-search.md)** — работает только по
  **отсортированным** данным; сортировка часто стоит первым шагом.
- **[Cyclic Sort](cyclic-sort.md)** — частный O(n) случай для чисел из диапазона 1..N.
- **[Дерево Фенвика](fenwick-tree.md)** — альтернатива merge-sort-подсчёту инверсий.
- Память, аллокации и профилирование в Go — [приложение](appendix-go-memory.md).
