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

```
Массив: [3, 1, 5, 12, 2, 11], K = 3

Используем min-heap размера 3:

Шаг 1: Добавляем 3 → [3]
Шаг 2: Добавляем 1 → [1, 3]
Шаг 3: Добавляем 5 → [1, 3, 5]
Шаг 4: Добавляем 12 → [3, 5, 12] (удаляем 1)
Шаг 5: Добавляем 2 → [3, 5, 12] (2 < 3, не добавляем)
Шаг 6: Добавляем 11 → [5, 11, 12] (удаляем 3)

Результат: [5, 11, 12]
```

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

**Выигрыш**: При k << n: O(n log n) → O(n log k) - значительное улучшение!

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
- ****: Куча для хранения топ-k элементов
- **HashMap<K, V> (Rust) / Map (Go)**: Для подсчета частоты (опционально)

###  (Rust) / Heap (Go)

#### Что такое Heap (Куча)?

**Heap (куча)** — это специализированная древовидная структура данных, которая удовлетворяет свойству кучи: для max-heap родитель всегда больше или равен детям, для min-heap родитель всегда меньше или равен детям.

**Ключевые характеристики:**
- **Полное бинарное дерево**: Все уровни заполнены слева направо
- **Свойство кучи**: Корень содержит максимальный (max-heap) или минимальный (min-heap) элемент
- **Эффективные операции**: O(log n) для вставки и удаления, O(1) для доступа к корню

#### Как хранится в памяти:

**Rust BinaryHeap&lt;T&gt;** (для min-heap используйте `Reverse`):
```
Минимальная куча (для топ-k):
┌─────────────────────────────────────────┐
│ BinaryHeap&lt;Reverse&lt;i32&gt;&gt;                │
│ ┌─────────────┐                         │
│ │ data: Vec&lt;T&gt;│ Массив элементов        │
│ └─────────────┘                         │
└─────────────────────────────────────────┘
         │
         ▼
    [1][3][5][7][9]  ← размер k
    
    Представление в виде дерева:
          1
        /   \
       3     5
      / \   
     7   9
```

**Go Heap (container/heap)**:
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
- Rust `BinaryHeap` по умолчанию max-heap, для min-heap используйте `Reverse`
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

### HashMap<K, V> (Rust) / Map (Go)

#### Для подсчета частоты:

**Используется когда**:
- Нужно найти топ-k частых элементов
- Подсчет частоты перед добавлением в кучу

**Сложность**:
- Подсчет частоты: O(n)
- Добавление в кучу: O(n log k)
- Итого: O(n log k)

## Глубокое понимание: сложные концепции

### Escape Analysis (Go)

**Для Top K Elements**:
- Куча в куче
- HashMap в куче (если используется)
- Результаты могут escape

### Borrow Checker (Rust)

**Типичный паттерн**:
```rust
use std::collections::{BinaryHeap, HashMap};
use std::cmp::Reverse;

fn top_k_frequent(nums: Vec&lt;i32&gt;, k: i32) -> Vec&lt;i32&gt; {
    let mut freq = HashMap::new();
    // подсчет частоты
    let mut heap = BinaryHeap::new();
    // добавление в кучу
}
```

### Garbage Collector (Go)

**Для Top K Elements**:
- Куча в куче
- HashMap в куче
- Минимизация размера k критична

### Ownership и Move Semantics (Rust)

**Концепция владения**:
- `BinaryHeap&lt;T&gt;` владеет элементами
- `HashMap<K, V>` владеет ключами и значениями
- RAII гарантирует освобождение

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Top K Elements

В Rust для Top K Elements:
- **Куча**: `BinaryHeap&lt;T&gt;` - O(k) памяти в куче
- **HashMap для частоты**: `HashMap<T, usize>` - O(n) в худшем случае
- **Результат**: `Vec&lt;T&gt;` - O(k) памяти

#### Go: Top K Elements

В Go:
- **Куча**: `container/heap` - O(k) в куче
- **Map для частоты**: `map[T]int` - O(n) в куче
- **Результат**: `[]T` - O(k) в куче

### Анализ аллокаций для Top K Elements

#### Подход с кучей:

**Rust**:
```rust
// Аллокации:
// - heap: BinaryHeap&lt;T&gt; - O(k) в куче
// - frequency: HashMap<T, usize> - O(n) в худшем случае
// - result: Vec&lt;T&gt; - O(k)
// Итого: O(n) памяти в худшем случае
```

**Go**:
```go
// Аллокации:
// - heap: IntHeap - O(k) в куче
// - frequency: map[int]int - O(n) в куче
// - result: []int - O(k) в куче
// Итого: O(n) памяти в худшем случае
```

### Оптимизация памяти

#### Rust оптимизации:

1. **Предварительное выделение кучи**:
```rust
// ✅ Предварительное выделение
let mut heap = BinaryHeap::with_capacity(k);
```

2. **Предварительное выделение HashMap**:
```rust
// ✅ Предварительное выделение
let mut frequency = HashMap::with_capacity(n);
```

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

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Куча | BinaryHeap в куче | container/heap в куче |
| Частота | HashMap в куче | map в куче |
| Память | O(n) в худшем случае | O(n) в худшем случае |

## Оптимизация производительности

### Общие техники

1. **Предварительное выделение структур данных**
2. **Минимизация операций с кучей**
3. **Эффективные операции с HashMap/map**

### Специфичные оптимизации для Top K Elements

#### 1. Оптимизация с кучей:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub fn top_k_frequent_optimized(nums: Vec&lt;i32&gt;, k: i32) -> Vec&lt;i32&gt; {
    let mut frequency = HashMap::with_capacity(nums.len());
    for &num in &nums {
        *frequency.entry(num).or_insert(0) += 1;
    }
    
    let mut heap = BinaryHeap::with_capacity(k as usize);
    for (num, count) in frequency {
        heap.push((count, num));
        if heap.len() > k as usize {
            heap.pop();
        }
    }
    
    heap.into_iter().map(|(_, num)| num).collect()
}
```

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

### Оптимизация для Rust

1. **Использование `entry` API**:
```rust
// ✅ Эффективное обновление
*frequency.entry(num).or_insert(0) += 1;
```

2. **Предварительное выделение**:
```rust
// ✅ Предварительное выделение
let mut frequency = HashMap::with_capacity(nums.len());
```

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

#### Rust пример:

```rust
// benches/top_k_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_top_k(c: &mut Criterion) {
    let nums: Vec&lt;i32&gt; = (0..10000).cycle().take(100000).collect();
    
    c.bench_function("top_k_100", |b| {
        b.iter(|| top_k_frequent_optimized(black_box(nums.clone()), 100))
    });
}

criterion_group!(benches, bench_top_k);
criterion_main!(benches);
```

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

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые массивы
2. **Граничные случаи**: Пустой массив, k = 1, k = n
3. **Стресс-тесты**: Большие массивы

### Примеры тестов для Top K Elements

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_top_k_basic() {
        let nums = vec![1, 1, 1, 2, 2, 3];
        let result = top_k_frequent_optimized(nums, 2);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_top_k_empty() {
        let nums = vec![];
        let result = top_k_frequent_optimized(nums, 0);
        assert_eq!(result, Vec::&lt;i32&gt;::new());
    }
}
```

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

#### Rust:
```bash
cargo test
cargo test -- --nocapture
cargo bench
```

#### Go:
```bash
go test -v
go test -bench=. -benchmem
```

### Бенчмарки

#### Rust:
```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};

fn top_k_benchmark(c: &mut Criterion) {
    let sizes = vec![100, 1000, 10000];
    
    let mut group = c.benchmark_group("top_k");
    for size in sizes {
        let nums: Vec&lt;i32&gt; = (0..size).cycle().take(size * 10).collect();
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            &nums,
            |b, nums| {
                b.iter(|| top_k_frequent_optimized(black_box(nums.clone()), 10));
            },
        );
    }
    group.finish();
}
```

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

### Rust

```rust
// Примеры использования шаблона Top K Elements на Rust

use std::collections::{BinaryHeap, HashMap};
use std::cmp::Reverse;

/// Пример 1: K наибольших элементов
/// 
/// Задача: Найти K наибольших элементов в массиве
/// Временная сложность: O(n log k)
/// Пространственная сложность: O(k)
pub fn find_k_largest(nums: Vec&lt;i32&gt;, k: usize) -> Vec&lt;i32&gt; {
    let mut min_heap = BinaryHeap::new();

    for &num in &nums {
        if min_heap.len() < k {
            min_heap.push(Reverse(num));
        } else if let Some(&Reverse(min_val)) = min_heap.peek() {
            if num > min_val {
                min_heap.pop();
                min_heap.push(Reverse(num));
            }
        }
    }

    min_heap.into_iter().map(|Reverse(x)| x).collect()
}

/// Пример 2: K наименьших элементов
/// 
/// Задача: Найти K наименьших элементов в массиве
/// Временная сложность: O(n log k)
/// Пространственная сложность: O(k)
pub fn find_k_smallest(nums: Vec&lt;i32&gt;, k: usize) -> Vec&lt;i32&gt; {
    let mut max_heap = BinaryHeap::new();

    for &num in &nums {
        if max_heap.len() < k {
            max_heap.push(num);
        } else if let Some(&max_val) = max_heap.peek() {
            if num < max_val {
                max_heap.pop();
                max_heap.push(num);
            }
        }
    }

    max_heap.into_iter().collect()
}

/// Пример 3: K-й наибольший элемент
/// 
/// Задача: Найти K-й наибольший элемент в массиве
/// Временная сложность: O(n log k)
/// Пространственная сложность: O(k)
pub fn find_kth_largest(nums: Vec&lt;i32&gt;, k: i32) -> i32 {
    let mut min_heap = BinaryHeap::new();
    let k = k as usize;

    for &num in &nums {
        if min_heap.len() < k {
            min_heap.push(Reverse(num));
        } else if let Some(&Reverse(min_val)) = min_heap.peek() {
            if num > min_val {
                min_heap.pop();
                min_heap.push(Reverse(num));
            }
        }
    }

    min_heap.peek().unwrap().0
}

/// Пример 4: Топ K частых элементов
/// 
/// Задача: Найти K наиболее частых элементов
/// Временная сложность: O(n + k log k)
/// Пространственная сложность: O(n)
pub fn top_k_frequent(nums: Vec&lt;i32&gt;, k: i32) -> Vec&lt;i32&gt; {
    // Подсчитываем частоту
    let mut freq_map = HashMap::new();
    for &num in &nums {
        *freq_map.entry(num).or_insert(0) += 1;
    }

    // Используем min-heap для хранения топ K
    let mut min_heap = BinaryHeap::new();
    let k = k as usize;

    for (num, freq) in freq_map {
        if min_heap.len() < k {
            min_heap.push((Reverse(freq), num));
        } else if let Some(&(Reverse(min_freq), _)) = min_heap.peek() {
            if freq > min_freq {
                min_heap.pop();
                min_heap.push((Reverse(freq), num));
            }
        }
    }

    min_heap.into_iter().map(|(_, num)| num).collect()
}

/// Пример 5: K ближайших точек к началу координат
/// 
/// Задача: Найти K ближайших точек к началу координат
/// Временная сложность: O(n log k)
/// Пространственная сложность: O(k)
pub fn k_closest(points: Vec&lt;Vec<i32&gt;>, k: i32) -> Vec&lt;Vec<i32&gt;> {
    let mut max_heap = BinaryHeap::new();
    let k = k as usize;

    for point in &points {
        let distance = point[0] * point[0] + point[1] * point[1];
        
        if max_heap.len() < k {
            max_heap.push((distance, point.clone()));
        } else if let Some(&(max_dist, _)) = max_heap.peek() {
            if distance < max_dist {
                max_heap.pop();
                max_heap.push((distance, point.clone()));
            }
        }
    }

    max_heap.into_iter().map(|(_, point)| point).collect()
}

/// Пример 6: Сортировка символов по частоте
/// 
/// Задача: Отсортировать символы строки по убыванию частоты
/// Временная сложность: O(n log n)
/// Пространственная сложность: O(n)
pub fn frequency_sort(s: String) -> String {
    // Подсчитываем частоту
    let mut freq_map = HashMap::new();
    for ch in s.chars() {
        *freq_map.entry(ch).or_insert(0) += 1;
    }

    // Используем max-heap для сортировки по частоте
    let mut max_heap = BinaryHeap::new();
    for (ch, freq) in freq_map {
        max_heap.push((freq, ch));
    }

    // Строим результирующую строку
    let mut result = String::new();
    while let Some((freq, ch)) = max_heap.pop() {
        result.push_str(&ch.to_string().repeat(freq));
    }

    result
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

## Связанные шаблоны

- **[Two Heaps](./two-heaps.md)** - Использует две кучи для поддержания медианы
- **[K-way Merge](./k-way-merge.md)** - Использует кучу для слияния массивов
- **[Sliding Window](./sliding-window.md)** - Может комбинироваться с кучей для поиска максимума/минимума в окне

## Следующий шаг

После изучения Top K Elements рекомендуется перейти к **[K-way Merge](./k-way-merge.md)** для изучения слияния массивов или к **[Subsets](./subsets.md)** для изучения комбинаторных задач.

## Дополнительные ресурсы

- [Top K Elements - LeetCode Tag](https://leetcode.com/tag/heap/) - Коллекция задач на кучи
- [Heap Data Structure - GeeksforGeeks](https://www.geeksforgeeks.org/heap-data-structure/) - Подробное объяснение структуры данных кучи
- [Priority Queue - Wikipedia](https://en.wikipedia.org/wiki/Priority_queue) - Теория приоритетных очередей

