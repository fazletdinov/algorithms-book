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

1. **Инициализация**: Создайте min-heap или max-heap размера K
2. **Итерация**: Для каждого элемента:
   - Если размер кучи < K, добавьте элемент
   - Иначе сравните с вершиной кучи и замените при необходимости
3. **Результат**: Верните элементы из кучи

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

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Top K Elements

В Rust для Top K Elements:
- **Куча**: `BinaryHeap<T>` - O(k) памяти в куче
- **HashMap для частоты**: `HashMap<T, usize>` - O(n) в худшем случае
- **Результат**: `Vec<T>` - O(k) памяти

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
// - heap: BinaryHeap<T> - O(k) в куче
// - frequency: HashMap<T, usize> - O(n) в худшем случае
// - result: Vec<T> - O(k)
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
pub fn top_k_frequent_optimized(nums: Vec<i32>, k: i32) -> Vec<i32> {
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

См. раздел "Профилирование" в [Sliding Window](./sliding-window/README.md#профилирование) для общих инструментов.

### Как профилировать Top K Elements

#### Rust пример:

```rust
// benches/top_k_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_top_k(c: &mut Criterion) {
    let nums: Vec<i32> = (0..10000).cycle().take(100000).collect();
    
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
        assert_eq!(result, Vec::<i32>::new());
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
        let nums: Vec<i32> = (0..size).cycle().take(size * 10).collect();
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

## Примеры кода

См. файлы:
- [Rust примеры](./rust/examples.rs)
- [Go примеры](./go/examples.go)

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

См. файлы:
- [Rust примеры](./rust/examples.rs)
- [Go примеры](./go/examples.go)

