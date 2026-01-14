# Two Heaps (Две кучи)

## Описание шаблона

Шаблон **Two Heaps** использует две кучи (min-heap и max-heap) для эффективного решения задач, связанных с поддержанием медианы, разделением данных на две части или поиском элементов в определенном диапазоне. Одна куча хранит меньшие элементы, другая - большие.

### Исторический контекст

Поддержание медианы в потоке данных - классическая задача в области алгоритмов потоковых данных. Подход с двумя кучами был разработан для эффективного решения этой задачи с логарифмическим временем вставки и константным временем получения медианы.

### Основная идея

Ключевое наблюдение: медиана разделяет отсортированный массив на две равные (или почти равные) части. Используя max-heap для меньшей половины и min-heap для большей половины, мы можем эффективно поддерживать это разделение при добавлении новых элементов.

## Когда применять

Используйте этот шаблон, когда:
- Нужно поддерживать медиану потока данных
- Требуется разделить данные на две части (меньшие и большие)
- Нужно найти K-й наименьший/наибольший элемент
- Задача связана с балансировкой двух множеств данных
- Требуется эффективное добавление и удаление элементов с поддержанием порядка

## Алгоритм/Подход

### Базовая структура:

1. **Две кучи**:
   - `max_heap`: Хранит меньшую половину элементов (максимум на вершине)
   - `min_heap`: Хранит большую половину элементов (минимум на вершине)

2. **Балансировка**:
   - Размеры куч должны отличаться максимум на 1
   - Если разница больше 1, перемещаем элемент из большей кучи в меньшую

3. **Медиана**:
   - Если размеры равны: медиана = (max_heap.top() + min_heap.top()) / 2
   - Если размеры разные: медиана = вершина большей кучи

## Визуализация

### Поддержание медианы:

```
Поток данных: [1, 5, 2, 3, 4]

Шаг 1: Добавляем 1
        max_heap: [1]          min_heap: []
        Медиана: 1

Шаг 2: Добавляем 5
        max_heap: [1]          min_heap: [5]
        Медиана: (1 + 5) / 2 = 3

Шаг 3: Добавляем 2
        max_heap: [2, 1]       min_heap: [5]
        Медиана: 2

Шаг 4: Добавляем 3
        max_heap: [2, 1]       min_heap: [3, 5]
        Медиана: (2 + 3) / 2 = 2.5

Шаг 5: Добавляем 4
        max_heap: [2, 1]       min_heap: [3, 4, 5]
        Балансируем: перемещаем 3 в max_heap
        max_heap: [3, 2, 1]    min_heap: [4, 5]
        Медиана: 3
```

## Математическое обоснование

### Почему алгоритм работает?

**Инвариант**: После каждой операции:
- Все элементы в max_heap ≤ все элементы в min_heap
- Размеры куч отличаются максимум на 1
- Если размеры равны: медиана = среднее двух вершин
- Если размеры разные: медиана = вершина большей кучи

**Доказательство корректности**:
1. **Инициализация**: Обе кучи пусты, инвариант выполнен
2. **Добавление элемента**:
   - Добавляем в соответствующую кучу
   - Если нарушен баланс, перемещаем элемент
   - Инвариант сохраняется
3. **Получение медианы**: По определению медианы и инварианту, результат корректен

**Почему сложность O(log n) для добавления?**

Операции с кучей (добавление, удаление) имеют сложность O(log n), где n - размер кучи. Балансировка также требует O(log n) операций.

## Временная и пространственная сложность

### Детальный анализ:

- **Временная сложность**:
  - Добавление: O(log n) - добавление в кучу + возможная балансировка
  - Получение медианы: O(1) - доступ к вершине кучи
  - Удаление: O(log n) - удаление из кучи + балансировка
- **Пространственная сложность**: O(n)
  - Две кучи вместе хранят все n элементов

### Сравнение с альтернативными подходами:

| Подход | Время добавления | Время медианы | Память |
|--------|------------------|---------------|--------|
| Сортировка после каждого добавления | O(n log n) | O(1) | O(n) |
| Две кучи | O(log n) | O(1) | O(n) |
| Отсортированный список | O(n) | O(1) | O(n) |

## Типичные ошибки

1. **Неправильная балансировка**: Убедитесь, что размеры куч отличаются максимум на 1
2. **Неправильный выбор кучи**: max_heap для меньших, min_heap для больших
3. **Забывание обновления медианы**: После каждого добавления проверяйте баланс

## Практические советы

1. Всегда поддерживайте инвариант баланса после каждой операции
2. Используйте правильные типы куч (max для меньших, min для больших)
3. Для задач с удалением используйте ленивое удаление или балансированные BST

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Две кучи

В Rust для Two Heaps:
- **MaxHeap и MinHeap**: `BinaryHeap<T>` - аллоцируются в куче, O(n) памяти
- **Балансировка**: Перемещение элементов между кучами
- **Результат**: O(1) для получения медианы

#### Go: Две кучи

В Go:
- **MaxHeap и MinHeap**: Используется `container/heap` - аллоцируются в куче
- **Балансировка**: Перемещение элементов между кучами
- **Результат**: O(1) для получения медианы

### Анализ аллокаций для Two Heaps

#### Базовый подход:

**Rust**:
```rust
// Аллокации:
// - max_heap: BinaryHeap<i32> - O(n/2) в худшем случае
// - min_heap: BinaryHeap<i32> - O(n/2) в худшем случае
// Итого: O(n) памяти в куче
```

**Go**:
```go
// Аллокации:
// - maxHeap: IntHeap - O(n/2) в куче
// - minHeap: IntHeap - O(n/2) в куче
// Итого: O(n) памяти в куче
```

### Оптимизация памяти

#### Rust оптимизации:

1. **Предварительное выделение куч**:
```rust
// ✅ Предварительное выделение
let mut max_heap = BinaryHeap::with_capacity(n / 2);
let mut min_heap = BinaryHeap::with_capacity(n / 2);
```

2. **Переиспользование куч**:
```rust
// ✅ Очистка и переиспользование
max_heap.clear();
min_heap.clear();
```

#### Go оптимизации:

1. **Предварительное выделение**:
```go
// ✅ Предварительное выделение
maxHeap := make(IntHeap, 0, n/2)
minHeap := make(IntHeap, 0, n/2)
```

2. **Переиспользование куч**:
```go
// ✅ Очистка и переиспользование
maxHeap = maxHeap[:0]
minHeap = minHeap[:0]
```

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Кучи | BinaryHeap в куче | container/heap в куче |
| Память | O(n) | O(n) |
| Балансировка | O(log n) | O(log n) |

## Оптимизация производительности

### Общие техники

1. **Предварительное выделение куч**
2. **Минимизация операций балансировки**
3. **Эффективные операции с кучами**

### Специфичные оптимизации для Two Heaps

#### 1. Оптимизация балансировки:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub struct MedianFinder {
    max_heap: BinaryHeap<i32>,  // Меньшая половина
    min_heap: BinaryHeap<Reverse<i32>>,  // Большая половина
}

impl MedianFinder {
    pub fn new() -> Self {
        Self {
            max_heap: BinaryHeap::with_capacity(1000),
            min_heap: BinaryHeap::with_capacity(1000),
        }
    }

    pub fn add_num(&mut self, num: i32) {
        if self.max_heap.is_empty() || num <= *self.max_heap.peek().unwrap() {
            self.max_heap.push(num);
        } else {
            self.min_heap.push(Reverse(num));
        }

        // Балансировка
        if self.max_heap.len() > self.min_heap.len() + 1 {
            if let Some(val) = self.max_heap.pop() {
                self.min_heap.push(Reverse(val));
            }
        } else if self.min_heap.len() > self.max_heap.len() + 1 {
            if let Some(Reverse(val)) = self.min_heap.pop() {
                self.max_heap.push(val);
            }
        }
    }
}
```

**Go**:
```go
// ✅ Оптимизированная версия
type MedianFinder struct {
    maxHeap IntHeap  // Меньшая половина (max heap)
    minHeap IntHeap  // Большая половина (min heap)
}

func NewMedianFinder() *MedianFinder {
    return &MedianFinder{
        maxHeap: make(IntHeap, 0, 1000),
        minHeap: make(IntHeap, 0, 1000),
    }
}

func (mf *MedianFinder) AddNum(num int) {
    if len(mf.maxHeap) == 0 || num <= mf.maxHeap[0] {
        heap.Push(&mf.maxHeap, num)
    } else {
        heap.Push(&mf.minHeap, num)
    }

    // Балансировка
    if len(mf.maxHeap) > len(mf.minHeap)+1 {
        val := heap.Pop(&mf.maxHeap).(int)
        heap.Push(&mf.minHeap, val)
    } else if len(mf.minHeap) > len(mf.maxHeap)+1 {
        val := heap.Pop(&mf.minHeap).(int)
        heap.Push(&mf.maxHeap, val)
    }
}
```

### Оптимизация для Rust

1. **Использование `Reverse` для min heap**:
```rust
// ✅ Эффективная min heap
use std::cmp::Reverse;
let mut min_heap = BinaryHeap::new();
min_heap.push(Reverse(5));
```

2. **Предварительное выделение**:
```rust
// ✅ Предварительное выделение
let mut max_heap = BinaryHeap::with_capacity(n / 2);
```

### Оптимизация для Go

1. **Использование `container/heap`**:
```go
// ✅ Стандартная реализация кучи
import "container/heap"
```

2. **Предварительное выделение**:
```go
// ✅ Предварительное выделение
maxHeap := make(IntHeap, 0, n/2)
```

## Профилирование

### Инструменты профилирования

См. раздел "Профилирование" в [Sliding Window](./sliding-window/README.md#профилирование) для общих инструментов.

### Как профилировать Two Heaps

#### Rust пример:

```rust
// benches/two_heaps_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_median_finder(c: &mut Criterion) {
    let mut finder = MedianFinder::new();
    let nums: Vec<i32> = (0..1000).collect();
    
    c.bench_function("add_num_1000", |b| {
        b.iter(|| {
            for &num in &nums {
                finder.add_num(black_box(num));
            }
        })
    });
}

criterion_group!(benches, bench_median_finder);
criterion_main!(benches);
```

#### Go пример:

```go
func BenchmarkMedianFinder(b *testing.B) {
    finder := NewMedianFinder()
    nums := make([]int, 1000)
    for i := range nums {
        nums[i] = i
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        for _, num := range nums {
            finder.AddNum(num)
        }
    }
}
```

### Примеры профилирования

**Анализ производительности**:
- Добавление: O(log n) по времени
- Получение медианы: O(1) по времени
- Память: O(n) для обеих куч

**Типичные узкие места**:
- Операции с кучами (push/pop)
- Балансировка куч
- Проверки размера куч

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые последовательности чисел
2. **Граничные случаи**: Пустая структура, один элемент, два элемента
3. **Стресс-тесты**: Большие последовательности чисел

### Примеры тестов для Two Heaps

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_median_finder_basic() {
        let mut finder = MedianFinder::new();
        finder.add_num(1);
        finder.add_num(2);
        assert_eq!(finder.find_median(), 1.5);
        finder.add_num(3);
        assert_eq!(finder.find_median(), 2.0);
    }

    #[test]
    fn test_median_finder_empty() {
        let finder = MedianFinder::new();
        // Обработка пустой структуры
    }
}
```

#### Go тесты:

```go
func TestMedianFinder(t *testing.T) {
    tests := []struct {
        name   string
        nums   []int
        want   float64
    }{
        {"basic", []int{1, 2}, 1.5},
        {"three", []int{1, 2, 3}, 2.0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            finder := NewMedianFinder()
            for _, num := range tt.nums {
                finder.AddNum(num)
            }
            if got := finder.FindMedian(); got != tt.want {
                t.Errorf("FindMedian() = %v, want %v", got, tt.want)
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

fn two_heaps_benchmark(c: &mut Criterion) {
    let sizes = vec![100, 1000, 10000];
    
    let mut group = c.benchmark_group("two_heaps");
    for size in sizes {
        let nums: Vec<i32> = (0..size).collect();
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            &nums,
            |b, nums| {
                let mut finder = MedianFinder::new();
                b.iter(|| {
                    for &num in nums {
                        finder.add_num(black_box(num));
                    }
                });
            },
        );
    }
    group.finish();
}
```

#### Go:
```go
func BenchmarkTwoHeapsSizes(b *testing.B) {
    sizes := []int{100, 1000, 10000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            nums := make([]int, size)
            for i := range nums {
                nums[i] = i
            }
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                finder := NewMedianFinder()
                for _, num := range nums {
                    finder.AddNum(num)
                }
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

### Средние:
- [Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/) - Медиана из потока данных
- [Sliding Window Median](https://leetcode.com/problems/sliding-window-median/) - Медиана скользящего окна

### Сложные:
- [IPO](https://leetcode.com/problems/ipo/) - Первичное публичное размещение
- [Design Twitter](https://leetcode.com/problems/design-twitter/) - Дизайн Twitter

## Примеры кода

См. файлы:
- [Rust примеры](./rust/examples.rs)
- [Go примеры](./go/examples.go)

