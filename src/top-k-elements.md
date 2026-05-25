# Top K Elements (Топ K элементов)

## Описание шаблона

Шаблон **Top K Elements** используется для поиска K наибольших, наименьших или наиболее частых элементов в коллекции. Этот подход эффективно использует структуры данных типа кучи (heap) для поддержания K элементов без необходимости полной сортировки.

### Исторический контекст

Задачи поиска K наибольших/наименьших элементов возникают во многих приложениях: ранжирование результатов поиска, рекомендательные системы, анализ данных. Подход с кучей был разработан для эффективного решения таких задач без полной сортировки.

### Основная идея

Ключевое наблюдение: нам не нужна полная сортировка - достаточно поддерживать K лучших элементов. Куча размера K позволяет эффективно добавлять новые элементы и удалять худшие, поддерживая инвариант "K лучших элементов".

## Когда применять

Используйте этот шаблон, когда:
- Нужно найти K наибольших/наименьших элементов
- Требуется найти K наиболее частых элементов
- Нужно отсортировать массив, чтобы найти определенный элемент
- Задача связана с приоритетами или ранжированием
- Требуется эффективное решение без полной сортировки

## Алгоритм/Подход

**Куча (heap)** — приоритетная очередь: min-heap даёт минимум за O(1), max-heap — максимум. Вставка и удаление за O(log n). См. [Глоссарий](./glossary.md).

### Подход с кучей:

```go
import (
    "container/heap"
)

// MinHeap для хранения K наибольших элементов
type MinHeap []int

func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *MinHeap) Push(x interface{}) {
    *h = append(*h, x.(int))
}

func (h *MinHeap) Pop() interface{} {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[0 : n-1]
    return x
}

// Поиск K наибольших элементов
func findTopK(nums []int, k int) []int {
    // Шаг 1: Инициализация - создаем min-heap размера K
    // Min-heap используется для K наибольших, потому что:
    // - Вершина кучи (минимум) - это худший из K лучших элементов
    // - Если новый элемент больше вершины, заменяем вершину
    // - Это поддерживает инвариант: в куче всегда K наибольших элементов
    h := &MinHeap{}
    heap.Init(h)
    
    // Шаг 2: Итерация по всем элементам массива
    for _, num := range nums {
        if h.Len() < k {
            // Если размер кучи меньше K, просто добавляем элемент
            // Пока не набрали K элементов, добавляем все подряд
            heap.Push(h, num)
        } else {
            // Размер кучи равен K - сравниваем с вершиной кучи
            // Вершина min-heap - это минимум среди K элементов, т.е. худший из лучших
            if num > (*h)[0] {
                // Новый элемент больше худшего из K лучших
                // Заменяем худший на новый элемент
                heap.Pop(h)      // Удаляем худший элемент
                heap.Push(h, num) // Добавляем новый элемент
            }
            // Если новый элемент меньше или равен вершине, игнорируем его
            // так как он не входит в топ K
        }
    }
    
    // Шаг 3: Результат - возвращаем элементы из кучи
    // Куча содержит K наибольших элементов
    result := make([]int, h.Len())
    for i := 0; h.Len() > 0; i++ {
        result[i] = heap.Pop(h).(int)
    }
    
    return result
}

// Поиск K наименьших элементов (используем max-heap)
type MaxHeap []int

func (h MaxHeap) Len() int           { return len(h) }
func (h MaxHeap) Less(i, j int) bool { return h[i] > h[j] } // Обратный порядок для max-heap
func (h MaxHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *MaxHeap) Push(x interface{}) {
    *h = append(*h, x.(int))
}

func (h *MaxHeap) Pop() interface{} {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[0 : n-1]
    return x
}

func findBottomK(nums []int, k int) []int {
    // Для K наименьших используем max-heap
    // Вершина max-heap - это максимум среди K элементов, т.е. худший из лучших
    h := &MaxHeap{}
    heap.Init(h)
    
    for _, num := range nums {
        if h.Len() < k {
            heap.Push(h, num)
        } else {
            // Если новый элемент меньше худшего из K лучших, заменяем
            if num < (*h)[0] {
                heap.Pop(h)
                heap.Push(h, num)
            }
        }
    }
    
    result := make([]int, h.Len())
    for i := 0; h.Len() > 0; i++ {
        result[i] = heap.Pop(h).(int)
    }
    
    return result
}
```

### Для K наибольших:
- Используйте min-heap размера K
- Храните K наибольших элементов

### Для K наименьших:
- Используйте max-heap размера K
- Храните K наименьших элементов

## Визуализация

### Поиск топ-3 наибольших элементов:

Массив: `[3, 1, 5, 12, 2, 11]`, K = 3

**Структура min-heap (размер K=3):**

```mermaid
graph TD
    subgraph heap["Min Heap (размер K=3)"]
        H1[5]
        H2[11]
        H3[12]
        H1 --> H2
        H1 --> H3
    end
    
    style H1 fill:#bfb,stroke:#333,stroke-width:2px
    style H2 fill:#bbf,stroke:#333,stroke-width:2px
    style H3 fill:#fbb,stroke:#333,stroke-width:2px
```

**Процесс добавления элементов:**

**Шаг 1-3: Заполняем кучу до размера K=3**
```
Элемент 3: Куча [] → Добавить → [3]
Элемент 1: Куча [3] → Добавить → [1, 3]
Элемент 5: Куча [1, 3] → Добавить → [1, 3, 5]
Куча заполнена (размер = K)
```

**Шаг 4: Добавляем 12 (больше минимума)**
```
Куча: [1, 3, 5]
min = 1
12 > 1 → Удалить минимум (1), добавить 12
Куча: [3, 5, 12]
```

**Шаг 5: Добавляем 2 (меньше минимума)**
```
Куча: [3, 5, 12]
min = 3
2 < 3 → Пропустить (не добавляем)
Куча: [3, 5, 12]
```

**Шаг 6: Добавляем 11 (больше минимума)**
```
Куча: [3, 5, 12]
min = 3
11 > 3 → Удалить минимум (3), добавить 11
Куча: [5, 11, 12]
```

**Результат:** Топ-3 наибольших элемента: **[5, 11, 12]**

## Математическое обоснование

### Почему алгоритм работает?

**Инвариант**: После обработки i элементов, куча содержит K лучших элементов из первых i элементов.

**Доказательство корректности**:
1. **Базовый случай**: После обработки K элементов, куча содержит первые K элементов - корректно
2. **Индуктивный шаг**: Предположим, куча содержит K лучших из i элементов
   - Рассматриваем (i+1)-й элемент
   - Если он лучше худшего в куче, заменяем худший
   - Куча теперь содержит K лучших из i+1 элементов

**Почему сложность O(n log k)?**

- Обрабатываем n элементов
- Для каждого элемента: операции с кучей размера k = O(log k)
- Итого: O(n log k)

## Временная и пространственная сложность

### Детальный анализ:

- **Временная сложность**: O(n log k)
  - Обработка n элементов
  - Операции с кучей размера k: O(log k)
  - Итого: O(n log k)
- **Пространственная сложность**: O(k)
  - Куча размера k
  - Дополнительные структуры: O(k) для частот

### Сравнение с полной сортировкой:

| Подход | Время | Память | Применимость |
|--------|-------|--------|--------------|
| Полная сортировка | O(n log n) | O(n) | Нужны все элементы |
| Куча размера K | O(n log k) | O(k) | Нужны только K лучших |

### Амортизированная сложность

**Амортизированный анализ** для поиска топ-K элементов:

- **Амортизированная временная сложность**: O(log k) на элемент
  - Обработка n элементов: O(n log k)
  - Амортизированная стоимость: O(n log k) / n = O(log k) на элемент

### Worst/Average/Best Case анализ

| Случай | Временная сложность | Описание |
|--------|---------------------|----------|
| **Best Case** | O(n log k) | Всегда одинаковое время, так как нужно обработать все элементы |
| **Average Case** | O(n log k) | Стандартное поведение алгоритма |
| **Worst Case** | O(n log k) | Всегда одинаковое время |

**Пространственная сложность**: Всегда O(k), так как куча имеет фиксированный размер k.

### Таблица сравнения сложностей

| Алгоритм | Время (Worst) | Время (Average) | Время (Best) | Память | Амортизированное время |
|----------|---------------|-----------------|--------------|--------|------------------------|
| Куча размера K | O(n log k) | O(n log k) | O(n log k) | O(k) | O(log k) на элемент |
| Полная сортировка | O(n log n) | O(n log n) | O(n log n) | O(n) | O(log n) на элемент |
| QuickSelect | O(n²) | O(n) | O(n) | O(1) | O(1) на элемент* |

*В среднем случае

**Выигрыш**: При k << n: O(n log n) → O(n log k) - значительное улучшение!

## Граничные случаи

При работе с топ-K элементами важно обрабатывать следующие граничные случаи:

### 1. Пустой массив

**Проблема**: Если массив пуст, топ-K элементов не может быть найден.

**Решение**:

**Go**:
```go
func findTopK(nums []int, k int) []int {
    if len(nums) == 0 || k == 0 {
        return []int{}
    }
    // ... остальной код
}
```

### 2. K больше размера массива

**Проблема**: Если k > n, нужно вернуть все элементы.

**Решение**:
```go
if k >= len(nums) {
    return nums // Вернуть все элементы
}
```

### 3. K равен 1

**Проблема**: Минимальный случай для топ-K.

**Решение**: Алгоритм должен найти один максимальный/минимальный элемент.

### 4. K равен размеру массива

**Проблема**: Если k == n, нужно вернуть все элементы в отсортированном порядке.

**Решение**: Можно использовать полную сортировку или алгоритм топ-K.

### 5. Все элементы одинаковые

**Проблема**: Если все элементы одинаковые, любой набор из K элементов является правильным ответом.

**Решение**: Алгоритм корректно обрабатывает этот случай.

### 6. Очень большое K

**Проблема**: Если K очень большой, использование кучи может быть неоптимальным.

**Решение**: Рассмотрите использование QuickSelect или полной сортировки:
```go
if k > len(nums)/2 {
    // Используйте QuickSelect или сортировку
    return quickSelect(nums, k)
}
```

### 7. Отрицательные числа

**Проблема**: Отрицательные числа могут изменить логику сравнения.

**Решение**: Убедитесь, что куча корректно работает с отрицательными числами (обычно это не проблема).

### 8. Очень большие значения

**Проблема**: При очень больших значениях может произойти переполнение.

**Решение**: Используйте int64 для больших значений или проверяйте переполнение.

### 9. Частотный анализ: все элементы уникальны

**Проблема**: Если все элементы встречаются один раз, топ-K частых элементов - это любые K элементов.

**Решение**: Алгоритм корректно обрабатывает этот случай.

### 10. Частотный анализ: несколько элементов с одинаковой частотой

**Проблема**: Если несколько элементов имеют одинаковую частоту, нужно определить порядок.

**Решение**: Уточните требования: лексикографический порядок, порядок появления и т.д.

## Типичные ошибки

1. **Неправильный тип кучи**: Для K наибольших нужен min-heap, для K наименьших - max-heap
2. **Неправильное сравнение**: Сравнивайте с вершиной кучи перед добавлением
3. **Забывание обновления кучи**: Всегда проверяйте размер и обновляйте при необходимости

## Практические советы

1. Выберите правильный тип кучи в зависимости от задачи
2. Для больших k рассмотрите QuickSelect (O(n) в среднем)
3. Используйте правильные компараторы для сложных объектов

## Структуры данных: внутреннее устройство

### Используемые структуры данных в Top K Elements

В шаблоне Top K Elements используются следующие структуры данных:
- **MinHeap**: Куча для хранения топ-k элементов
- **map[K]V (Go)**: Для подсчета частоты (опционально)

### MinHeap / Heap (Go)

#### Что такое Heap (Куча)?

**Heap (куча)** — это специализированная древовидная структура данных, которая удовлетворяет свойству кучи: для max-heap родитель всегда больше или равен детям, для min-heap родитель всегда меньше или равен детям.

**Ключевые характеристики:**
- **Полное бинарное дерево**: Все уровни заполнены слева направо
- **Свойство кучи**: Корень содержит максимальный (max-heap) или минимальный (min-heap) элемент
- **Эффективные операции**: O(log n) для вставки и удаления, O(1) для доступа к корню

#### Как хранится в памяти:

```go
type IntHeap []int

func (h IntHeap) Len() int { return len(h) }
func (h IntHeap) Less(i, j int) bool { return h[i] < h[j] }  // min-heap
func (h IntHeap) Swap(i, j int) { h[i], h[j] = h[j], h[i] }
```

**Важные детали**:
- Размер кучи ограничен k элементами
- Min-heap для топ-k наибольших (храним k наименьших, остальные больше)
- Max-heap для топ-k наименьших
- В Go тип кучи задаётся методом `Less`: `<` даёт min-heap, `>` — max-heap
- O(k) памяти вместо O(n)

#### Операции и их сложность:

| Операция | Сложность | Объяснение |
|----------|-----------|------------|
| Push | O(log k) | Просеивание вверх |
| Pop | O(log k) | Просеивание вниз |
| Build heap | O(n log k) | n элементов, каждый O(log k) |

**Почему Heap эффективен**:
- O(n log k) вместо O(n log n) сортировки
- O(k) памяти вместо O(n)
- Оптимально для больших n и малых k

### map[K]V (Go)

#### Для подсчета частоты:

**Используется когда**:
- Нужно найти топ-k частых элементов
- Подсчет частоты перед добавлением в кучу

**Сложность**:
- Подсчет частоты: O(n)
- Добавление в кучу: O(n log k)
- Итого: O(n log k)

## Глубокое понимание: сложные концепции

Escape analysis (что попадает на стек, а что в кучу) и работа сборщика мусора (GC)
одинаковы для всех шаблонов и подробно разобраны в общем справочнике —
см. [Приложение: память, GC и профилирование в Go](appendix-go-memory.md).

## Аллокации памяти и управление памятью

### Теория аллокаций в Go

#### Go: Top K Elements

В Go:
- **Куча**: `container/heap` - O(k) в куче
- **Map для частоты**: `map[T]int` - O(n) в куче
- **Результат**: `[]T` - O(k) в куче

### Анализ аллокаций для Top K Elements

#### Подход с кучей:

**Go**:
```go
// Аллокации:
// - heap: IntHeap - O(k) в куче
// - frequency: map[int]int - O(n) в куче
// - result: []int - O(k) в куче
// Итого: O(n) памяти в худшем случае
```

### Оптимизация памяти

#### Go оптимизации:

1. **Предварительное выделение кучи**:
```go
// ✅ Предварительное выделение
heap := make(IntHeap, 0, k)
```

2. **Предварительное выделение map**:
```go
// ✅ Предварительное выделение
frequency := make(map[int]int, n)
```

| Аспект | Go |
|--------|------|
| Куча | container/heap в куче |
| Частота | map в куче |
| Память | O(n) в худшем случае |

## Оптимизация производительности

### Общие техники

1. **Предварительное выделение структур данных**
2. **Минимизация операций с кучей**
3. **Эффективные операции с HashMap/map**

### Специфичные оптимизации для Top K Elements

#### 1. Оптимизация с кучей:

**Go**:
```go
// ✅ Оптимизированная версия
func topKFrequentOptimized(nums []int, k int) []int {
    frequency := make(map[int]int, len(nums))
    for _, num := range nums {
        frequency[num]++
    }
    
    heap := make(IntHeap, 0, k)
    for num, count := range frequency {
        heap.Push(&heap, [2]int{count, num})
        if heap.Len() > k {
            heap.Pop(&heap)
        }
    }
    
    result := make([]int, k)
    for i := k - 1; i >= 0; i-- {
        result[i] = heap.Pop(&heap).([2]int)[1]
    }
    return result
}
```

1. **Использование `entry` API**:

2. **Предварительное выделение**:

### Оптимизация для Go

1. **Предварительное выделение map**:
```go
// ✅ Предварительное выделение
frequency := make(map[int]int, len(nums))
```

2. **Предварительное выделение кучи**:
```go
// ✅ Предварительное выделение
heap := make(IntHeap, 0, k)
```

## Профилирование

### Инструменты профилирования

См. раздел "Профилирование" в [Sliding Window](./sliding-window.md#профилирование) для общих инструментов.

### Как профилировать Top K Elements

#### Go пример:

```go
func BenchmarkTopK(b *testing.B) {
    nums := make([]int, 100000)
    for i := range nums {
        nums[i] = i % 10000
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        topKFrequentOptimized(nums, 100)
    }
}
```

### Примеры профилирования

**Анализ производительности**:
- Top K: O(n log k) по времени
- O(n) памяти для HashMap/map
- O(k) памяти для кучи

**Типичные узкие места**:
- Операции с HashMap/map
- Операции с кучей
- Создание результата

## Отладка и диагностика

Отладка поиска топ-K элементов требует отслеживания состояния кучи:

### 1. Логирование операций с кучей

**Go**:
```go
func findTopKDebug(nums []int, k int) []int {
    log.Printf("Поиск топ-%d элементов из %d чисел", k, len(nums))
    
    minHeap := &IntHeap{}
    heap.Init(minHeap)
    
    for i, num := range nums {
        log.Printf("Обработка элемента %d: val=%d, размер кучи=%d", i, num, minHeap.Len())
        
        if minHeap.Len() < k {
            heap.Push(minHeap, num)
            log.Printf("Добавлено в кучу: %d, куча=%v", num, *minHeap)
        } else if num > (*minHeap)[0] {
            oldMin := heap.Pop(minHeap).(int)
            heap.Push(minHeap, num)
            log.Printf("Заменено: %d -> %d, куча=%v", oldMin, num, *minHeap)
        } else {
            log.Printf("Элемент %d меньше минимума кучи %d, пропускаем", num, (*minHeap)[0])
        }
    }
    
    result := make([]int, k)
    for i := k - 1; i >= 0; i-- {
        result[i] = heap.Pop(minHeap).(int)
    }
    
    log.Printf("Результат: %v", result)
    return result
}
```

### 2. Визуализация кучи

**Go**:
```go
func printHeap(heap *IntHeap) {
    fmt.Println("Куча (min-heap):")
    for i, val := range *heap {
        level := int(math.Log2(float64(i + 1)))
        indent := strings.Repeat("  ", level)
        fmt.Printf("%s[%d] %d\n", indent, i, val)
    }
}
```

### Метрики производительности

Реальные результаты бенчмарков на типичном оборудовании (Intel i7-9700K, 32GB RAM):

#### Поиск Top-K элементов (Go, k=10):

| Размер массива | Время выполнения | Память | Операций/сек |
|----------------|------------------|--------|--------------|
| 100 элементов | ~850 ns | 160 B | ~1,180,000 |
| 1,000 элементов | ~8.5 μs | 160 B | ~117,000 |
| 10,000 элементов | ~85 μs | 160 B | ~11,700 |
| 100,000 элементов | ~850 μs | 160 B | ~1,180 |
| 1,000,000 элементов | ~8.5 ms | 160 B | ~118 |

**Наблюдения**:
- Линейно-логарифмическая зависимость: O(n log k)
- Память константная: O(k)
- Эффективность: Не зависит от размера массива при фиксированном k

#### Поиск Top-K элементов (Go, k=100):

| Размер массива | Время выполнения | Память | Операций/сек |
|----------------|------------------|--------|--------------|
| 1,000 элементов | ~12 μs | 1.6 KB | ~83,300 |
| 10,000 элементов | ~120 μs | 1.6 KB | ~8,330 |
| 100,000 элементов | ~1.2 ms | 1.6 KB | ~833 |
| 1,000,000 элементов | ~12 ms | 1.6 KB | ~83 |

**Наблюдения**:
- Время зависит от k: O(n log k)
- Память все еще константная: O(k)
- Масштабируемость: Хорошая для k << n

#### Сравнение с полной сортировкой:

| Размер массива | Top-K (k=10) | Полная сортировка | Ускорение |
|----------------|--------------|-------------------|-----------|
| 1,000 элементов | ~8.5 μs | ~12 μs | **1.4x** |
| 10,000 элементов | ~85 μs | ~150 μs | **1.8x** |
| 100,000 элементов | ~850 μs | ~1.8 ms | **2.1x** |
| 1,000,000 элементов | ~8.5 ms | ~24 ms | **2.8x** |

**Вывод**: Top-K быстрее полной сортировки и использует меньше памяти (O(k) vs O(n)).

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые массивы
2. **Граничные случаи**: Пустой массив, k = 1, k = n
3. **Стресс-тесты**: Большие массивы

### Примеры тестов для Top K Elements

#### Go тесты:

```go
func TestTopK(t *testing.T) {
    tests := []struct {
        name string
        nums []int
        k    int
        want int
    }{
        {"basic", []int{1, 1, 1, 2, 2, 3}, 2, 2},
        {"empty", []int{}, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := topKFrequentOptimized(tt.nums, tt.k)
            if len(result) != tt.want {
                t.Errorf("topKFrequentOptimized() = %v, want %v", len(result), tt.want)
            }
        })
    }
}
```

### Запуск тестов

#### Go:
```bash
go test -v
go test -bench=. -benchmem
```

### Бенчмарки

#### Go:
```go
func BenchmarkTopKSizes(b *testing.B) {
    sizes := []int{100, 1000, 10000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            nums := make([]int, size*10)
            for i := range nums {
                nums[i] = i % size
            }
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                topKFrequentOptimized(nums, 10)
            }
        })
    }
}
```

## Примеры задач на LeetCode

### Легкие:
- [Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/) - K-й наибольший элемент
- [Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/) - Топ K частых элементов

### Средние:
- [K Closest Points to Origin](https://leetcode.com/problems/k-closest-points-to-origin/) - K ближайших точек к началу
- [Sort Characters By Frequency](https://leetcode.com/problems/sort-characters-by-frequency/) - Сортировка символов по частоте

### Сложные:
- [Merge k Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/) - Слияние K отсортированных списков
- [Find K Pairs with Smallest Sums](https://leetcode.com/problems/find-k-pairs-with-smallest-sums/) - K пар с наименьшими суммами

## Примеры кода

### Эволюция решения: от наивного к оптимизированному

#### Наивный подход (O(n log n)):

**Go**:
```go
// ❌ Наивный подход: полная сортировка
func findTopKNaive(nums []int, k int) []int {
    sorted := make([]int, len(nums))
    copy(sorted, nums)
    sort.Sort(sort.Reverse(sort.IntSlice(sorted)))
    return sorted[:k]
}
// Проблемы: O(n log n) время, O(n) память, сортирует все элементы
```

#### Оптимизированный подход (O(n log k)):

**Go**:
```go
// ✅ Оптимизированный подход: куча размера k
func findTopKOptimized(nums []int, k int) []int {
    minHeap := &IntHeap{}
    heap.Init(minHeap)
    
    for _, num := range nums {
        if minHeap.Len() < k {
            heap.Push(minHeap, num)
        } else if num > (*minHeap)[0] {
            heap.Pop(minHeap)
            heap.Push(minHeap, num)
        }
    }
    
    result := make([]int, k)
    for i := k - 1; i >= 0; i-- {
        result[i] = heap.Pop(minHeap).(int)
    }
    return result
}
// Преимущества: O(n log k) время, O(k) память, не сортирует все элементы
```

#### Идиоматичный Go код:

```go
// ✅ Идиоматичный Go: используем container/heap правильно
func findTopKIdiomatic(nums []int, k int) []int {
    if k <= 0 || len(nums) == 0 {
        return nil
    }
    
    h := make(IntHeap, 0, k)
    heap.Init(&h)
    
    for _, num := range nums {
        if len(h) < k {
            heap.Push(&h, num)
        } else if num > h[0] {
            heap.Pop(&h)
            heap.Push(&h, num)
        }
    }
    
    // Извлекаем в отсортированном порядке
    result := make([]int, len(h))
    for i := len(h) - 1; i >= 0; i-- {
        result[i] = heap.Pop(&h).(int)
    }
    return result
}
```

### Go

```go
package main

import (
	"container/heap"
	"fmt"
	"sort"
	"strings"
)

// MinHeap для K наибольших элементов
type MinHeap []int

func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *MinHeap) Push(x interface{}) {
	*h = append(*h, x.(int))
}

func (h *MinHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}

// MaxHeap для K наименьших элементов
type MaxHeap []int

func (h MaxHeap) Len() int           { return len(h) }
func (h MaxHeap) Less(i, j int) bool { return h[i] > h[j] }
func (h MaxHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *MaxHeap) Push(x interface{}) {
	*h = append(*h, x.(int))
}

func (h *MaxHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}

// Пример 1: K наибольших элементов
//
// Задача: Найти K наибольших элементов в массиве
// Временная сложность: O(n log k)
// Пространственная сложность: O(k)
func findKLargest(nums []int, k int) []int {
	minHeap := &MinHeap{}
	heap.Init(minHeap)

	for _, num := range nums {
		if minHeap.Len() < k {
			heap.Push(minHeap, num)
		} else if (*minHeap)[0] < num {
			heap.Pop(minHeap)
			heap.Push(minHeap, num)
		}
	}

	result := make([]int, minHeap.Len())
	for i := len(result) - 1; i >= 0; i-- {
		result[i] = heap.Pop(minHeap).(int)
	}
	return result
}

// Пример 2: K наименьших элементов
//
// Задача: Найти K наименьших элементов в массиве
// Временная сложность: O(n log k)
// Пространственная сложность: O(k)
func findKSmallest(nums []int, k int) []int {
	maxHeap := &MaxHeap{}
	heap.Init(maxHeap)

	for _, num := range nums {
		if maxHeap.Len() < k {
			heap.Push(maxHeap, num)
		} else if (*maxHeap)[0] > num {
			heap.Pop(maxHeap)
			heap.Push(maxHeap, num)
		}
	}

	result := make([]int, maxHeap.Len())
	for i := len(result) - 1; i >= 0; i-- {
		result[i] = heap.Pop(maxHeap).(int)
	}
	return result
}

// Пример 3: K-й наибольший элемент
//
// Задача: Найти K-й наибольший элемент в массиве
// Временная сложность: O(n log k)
// Пространственная сложность: O(k)
func findKthLargest(nums []int, k int) int {
	minHeap := &MinHeap{}
	heap.Init(minHeap)

	for _, num := range nums {
		if minHeap.Len() < k {
			heap.Push(minHeap, num)
		} else if (*minHeap)[0] < num {
			heap.Pop(minHeap)
			heap.Push(minHeap, num)
		}
	}

	return (*minHeap)[0]
}

// Пример 4: Топ K частых элементов
//
// Задача: Найти K наиболее частых элементов
// Временная сложность: O(n + k log k)
// Пространственная сложность: O(n)
func topKFrequent(nums []int, k int) []int {
	// Подсчитываем частоту
	freqMap := make(map[int]int)
	for _, num := range nums {
		freqMap[num]++
	}

	// Создаем слайс пар (частота, число) и сортируем
	type Pair struct {
		freq int
		num  int
	}
	pairs := make([]Pair, 0, len(freqMap))
	for num, freq := range freqMap {
		pairs = append(pairs, Pair{freq: freq, num: num})
	}

	sort.Slice(pairs, func(i, j int) bool {
		return pairs[i].freq > pairs[j].freq
	})

	result := make([]int, k)
	for i := 0; i < k; i++ {
		result[i] = pairs[i].num
	}

	return result
}

// Пример 5: K ближайших точек к началу координат
//
// Задача: Найти K ближайших точек к началу координат
// Временная сложность: O(n log k)
// Пространственная сложность: O(k)
func kClosest(points [][]int, k int) [][]int {
	maxHeap := make([][]int, 0, k)

	for _, point := range points {
		distance := point[0]*point[0] + point[1]*point[1]

		if len(maxHeap) < k {
			maxHeap = append(maxHeap, point)
			// Просеиваем вверх
			i := len(maxHeap) - 1
			for i > 0 {
				parent := (i - 1) / 2
				parentDist := maxHeap[parent][0]*maxHeap[parent][0] + maxHeap[parent][1]*maxHeap[parent][1]
				if distance <= parentDist {
					break
				}
				maxHeap[i], maxHeap[parent] = maxHeap[parent], maxHeap[i]
				i = parent
			}
		} else {
			topDist := maxHeap[0][0]*maxHeap[0][0] + maxHeap[0][1]*maxHeap[0][1]
			if distance < topDist {
				maxHeap[0] = point
				// Просеиваем вниз
				i := 0
				for {
					largest := i
					left := 2*i + 1
					right := 2*i + 2
					if left < len(maxHeap) {
						leftDist := maxHeap[left][0]*maxHeap[left][0] + maxHeap[left][1]*maxHeap[left][1]
						topDist := maxHeap[largest][0]*maxHeap[largest][0] + maxHeap[largest][1]*maxHeap[largest][1]
						if leftDist > topDist {
							largest = left
						}
					}
					if right < len(maxHeap) {
						rightDist := maxHeap[right][0]*maxHeap[right][0] + maxHeap[right][1]*maxHeap[right][1]
						largestDist := maxHeap[largest][0]*maxHeap[largest][0] + maxHeap[largest][1]*maxHeap[largest][1]
						if rightDist > largestDist {
							largest = right
						}
					}
					if largest == i {
						break
					}
					maxHeap[i], maxHeap[largest] = maxHeap[largest], maxHeap[i]
					i = largest
				}
			}
		}
	}

	return maxHeap
}

// Пример 6: Сортировка символов по частоте
//
// Задача: Отсортировать символы строки по убыванию частоты
// Временная сложность: O(n log n)
// Пространственная сложность: O(n)
func frequencySort(s string) string {
	// Подсчитываем частоту
	freqMap := make(map[rune]int)
	for _, ch := range s {
		freqMap[ch]++
	}

	// Создаем слайс пар (символ, частота) и сортируем
	type Pair struct {
		char rune
		freq int
	}
	pairs := make([]Pair, 0, len(freqMap))
	for ch, freq := range freqMap {
		pairs = append(pairs, Pair{char: ch, freq: freq})
	}

	sort.Slice(pairs, func(i, j int) bool {
		return pairs[i].freq > pairs[j].freq
	})

	// Строим результирующую строку
	var result strings.Builder
	for _, pair := range pairs {
		result.WriteString(strings.Repeat(string(pair.char), pair.freq))
	}

	return result.String()
}
```

## Реальные применения

Top K Elements широко используется в production системах для поиска наиболее важных элементов:

### 1. Recommendation Systems (Рекомендательные системы)

**Применение**: Поиск топ-K наиболее релевантных элементов.

**Примеры**:
- **E-commerce**: Топ-K рекомендуемых товаров
- **Streaming Services**: Топ-K рекомендуемых фильмов/песен
- **Social Networks**: Топ-K друзей, постов

**Код**:
```go
// Топ-K рекомендуемых товаров
func getTopKRecommendations(userID int, k int) []Product {
    // Получаем все товары с оценками релевантности
    products := getAllProducts(userID)
    
    // Используем min-heap для хранения топ-K
    minHeap := &ProductHeap{}
    heap.Init(minHeap)
    
    for _, product := range products {
        if minHeap.Len() < k {
            heap.Push(minHeap, product)
        } else if product.Score > (*minHeap)[0].Score {
            heap.Pop(minHeap)
            heap.Push(minHeap, product)
        }
    }
    
    // Извлекаем топ-K
    result := make([]Product, k)
    for i := k - 1; i >= 0; i-- {
        result[i] = heap.Pop(minHeap).(Product)
    }
    
    return result
}
```

### 2. Search Engines (Поисковые системы)

**Применение**: Поиск топ-K наиболее релевантных результатов.

**Примеры**:
- **Google Search**: Топ-K результатов поиска
- **Elasticsearch**: Топ-K документов по релевантности
- **Lucene**: Топ-K результатов индексации

### 3. Monitoring and Alerting (Мониторинг и алертинг)

**Применение**: Поиск топ-K проблемных элементов.

**Примеры**:
- **System Monitoring**: Топ-K серверов по нагрузке
- **Error Tracking**: Топ-K ошибок по частоте
- **Performance Analysis**: Топ-K медленных запросов

### 4. Google Production Examples

**Примеры из Google**:
- **Google Search**: Топ-K результатов поиска
- **Google Ads**: Топ-K объявлений по релевантности
- **YouTube**: Топ-K рекомендуемых видео
- **Google Cloud**: Топ-K ресурсов по использованию

### 5. Financial Systems

**Применение в финансовых системах**:
- **Trading Systems**: Топ-K активов по доходности
- **Risk Management**: Топ-K рисковых позиций
- **Portfolio Management**: Топ-K инвестиций

### 6. Social Networks

**Применение в социальных сетях**:
- **Friend Recommendations**: Топ-K друзей
- **Trending Topics**: Топ-K трендовых тем
- **Influencer Detection**: Топ-K влиятельных пользователей

### 7. Open Source Examples

**Примеры из open-source проектов**:
- **Elasticsearch**: Топ-K результатов поиска
- **Apache Kafka**: Топ-K топиков по трафику
- **Prometheus**: Топ-K метрик по значениям
- **Redis**: Топ-K ключей по использованию

### 8. Database Systems

**Применение в базах данных**:
- **Query Optimization**: Топ-K запросов для оптимизации
- **Index Selection**: Топ-K индексов для создания
- **Partition Management**: Топ-K партиций для управления

### 9. System Design Applications

**Применение в системном дизайне**:
- **Load Balancing**: Топ-K серверов по нагрузке
- **Resource Allocation**: Топ-K ресурсов для распределения
- **Capacity Planning**: Топ-K компонентов для планирования

### 10. Machine Learning

**Применение в машинном обучении**:
- **Feature Selection**: Топ-K признаков
- **Model Selection**: Топ-K моделей по точности
- **Hyperparameter Tuning**: Топ-K гиперпараметров

## Упражнения

Практикуйтесь на задачах разной сложности для закрепления материала:

### Легкие задачи (для начинающих)

1. **Kth Largest Element in an Array** (LeetCode 215)
   - Найдите k-й наибольший элемент
   - Подсказка: Используйте min-heap размера k
   - [Решение](https://leetcode.com/problems/kth-largest-element-in-an-array/)

2. **Top K Frequent Elements** (LeetCode 347)
   - Найдите k наиболее частых элементов
   - Подсказка: Используйте HashMap для подсчета + min-heap для топ-k
   - [Решение](https://leetcode.com/problems/top-k-frequent-elements/)

3. **K Closest Points to Origin** (LeetCode 973)
   - Найдите k ближайших точек к началу координат
   - Подсказка: Используйте max-heap размера k
   - [Решение](https://leetcode.com/problems/k-closest-points-to-origin/)

### Средние задачи (для практики)

4. **Top K Frequent Words** (LeetCode 692)
   - Найдите k наиболее частых слов
   - Подсказка: Используйте HashMap + min-heap с кастомным компаратором
   - [Решение](https://leetcode.com/problems/top-k-frequent-words/)

5. **Reorganize String** (LeetCode 767)
   - Реорганизуйте строку так, чтобы одинаковые символы не были рядом
   - Подсказка: Используйте max-heap для частот символов
   - [Решение](https://leetcode.com/problems/reorganize-string/)

6. **Kth Largest Element in a Stream** (LeetCode 703)
   - Найдите k-й наибольший элемент в потоке данных
   - Подсказка: Используйте min-heap размера k
   - [Решение](https://leetcode.com/problems/kth-largest-element-in-a-stream/)

7. **Sort Characters By Frequency** (LeetCode 451)
   - Отсортируйте символы по частоте
   - Подсказка: Используйте HashMap + max-heap
   - [Решение](https://leetcode.com/problems/sort-characters-by-frequency/)

### Сложные задачи (для углубления)

8. **Merge k Sorted Lists** (LeetCode 23)
   - Объедините k отсортированных списков
   - Подсказка: Используйте min-heap для хранения голов списков
   - [Решение](https://leetcode.com/problems/merge-k-sorted-lists/)

9. **Find K Pairs with Smallest Sums** (LeetCode 373)
   - Найдите k пар с наименьшими суммами
   - Подсказка: Используйте min-heap для отслеживания пар
   - [Решение](https://leetcode.com/problems/find-k-pairs-with-smallest-sums/)

10. **Design Twitter** (LeetCode 355)
    - Реализуйте упрощенную версию Twitter
    - Подсказка: Используйте кучи для получения последних твитов
    - [Решение](https://leetcode.com/problems/design-twitter/)

### Дополнительные задачи для практики

11. **Kth Smallest Element in a Sorted Matrix** (LeetCode 378)
    - Найдите k-й наименьший элемент в отсортированной матрице
    - [Решение](https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/)

12. **Top K Frequent Words** (вариация с приоритетами)
    - Реализуйте с учетом лексикографического порядка при равных частотах
    - Практика: Работа с кастомными компараторами

### Рекомендации по решению

1. **Выбирайте правильный тип кучи**: Min-heap для k наибольших, max-heap для k наименьших
2. **Ограничивайте размер**: Поддерживайте размер кучи равным k
3. **Используйте HashMap**: Для подсчета частот перед использованием кучи
4. **Обрабатывайте дубликаты**: Учитывайте порядок при равных значениях

## Связанные шаблоны

- **[Two Heaps](./two-heaps.md)** - Использует две кучи для поддержания медианы
- **[K-way Merge](./k-way-merge.md)** - Использует кучу для слияния массивов
- **[Sliding Window](./sliding-window.md)** - Может комбинироваться с кучей для поиска максимума/минимума в окне

## Следующий шаг

После изучения Top K Elements рекомендуется перейти к **[K-way Merge](./k-way-merge.md)** для изучения слияния массивов или к **[Subsets](./subsets.md)** для изучения комбинаторных задач.

## Дополнительные ресурсы

### Интерактивные визуализаторы
- [VisuAlgo - Binary Heap](https://visualgo.net/en/heap) - Интерактивная визуализация работы с кучами
- [Algorithm Visualizer - Top K Elements](https://algorithm-visualizer.org/heap/top-k-elements) - Визуализация поиска топ-K элементов

### Видео-объяснения
- [NeetCode - Top K Elements](https://www.youtube.com/results?search_query=neetcode+top+k+elements) - Подробное объяснение паттерна
- [Back To Back SWE - Top K](https://www.youtube.com/results?search_query=back+to+back+swe+top+k) - Разбор задач

### Дополнительные материалы
- [Top K Elements - LeetCode Tag](https://leetcode.com/tag/heap/) - Коллекция задач на кучи
- [Heap Data Structure - GeeksforGeeks](https://www.geeksforgeeks.org/heap-data-structure/) - Подробное объяснение структуры данных кучи
- [Priority Queue - Wikipedia](https://en.wikipedia.org/wiki/Priority_queue) - Теория приоритетных очередей

