# K-way Merge (K-way слияние)

## Описание шаблона

Шаблон **K-way Merge** используется для эффективного слияния K отсортированных массивов, списков или последовательностей в один отсортированный результат. Алгоритм использует кучу (min-heap) для выбора минимального элемента среди всех K массивов на каждом шаге.

### Исторический контекст

K-way merge является обобщением классического алгоритма слияния двух отсортированных массивов. Он широко используется в внешней сортировке, где данные не помещаются в память и хранятся в нескольких отсортированных файлах.

### Основная идея

Ключевое наблюдение: для получения следующего минимального элемента нужно сравнить только первые элементы каждого массива. Куча позволяет эффективно находить минимум среди K элементов за O(log k) времени.

## Когда применять

Используйте этот шаблон, когда:
- Нужно объединить K отсортированных массивов/списков
- Требуется найти минимальный элемент среди K отсортированных последовательностей
- Задача связана с внешней сортировкой или слиянием больших данных
- Нужно обработать несколько отсортированных потоков данных
- Требуется эффективное слияние без полного копирования данных

## Алгоритм/Подход

### Базовый алгоритм:

1. **Инициализация**: Создайте min-heap и добавьте первый элемент каждого из K массивов
2. **Извлечение минимума**: Извлеките минимальный элемент из кучи
3. **Добавление следующего**: Добавьте следующий элемент из того же массива в кучу
4. **Повторение**: Повторяйте шаги 2-3, пока куча не станет пустой

### Структура элемента кучи:

Каждый элемент кучи содержит:
- Значение элемента
- Индекс массива, из которого он пришел
- Индекс элемента в этом массиве

## Визуализация

### Слияние 3 отсортированных массивов:

```
Массив 1: [1, 4, 7]
Массив 2: [2, 5, 8]
Массив 3: [3, 6, 9]

Инициализация кучи:
Heap: [(1, arr1, 0), (2, arr2, 0), (3, arr3, 0)]

Шаг 1: Извлекаем 1, добавляем 4
        Результат: [1]
        Heap: [(2, arr2, 0), (3, arr3, 0), (4, arr1, 1)]

Шаг 2: Извлекаем 2, добавляем 5
        Результат: [1, 2]
        Heap: [(3, arr3, 0), (4, arr1, 1), (5, arr2, 1)]

Шаг 3: Извлекаем 3, добавляем 6
        Результат: [1, 2, 3]
        Heap: [(4, arr1, 1), (5, arr2, 1), (6, arr3, 1)]

... и так далее

Финальный результат: [1, 2, 3, 4, 5, 6, 7, 8, 9]
```

## Математическое обоснование

### Почему алгоритм работает?

**Инвариант**: На каждом шаге куча содержит минимальный непрочитанный элемент каждого массива, и мы всегда извлекаем глобальный минимум.

**Доказательство корректности**:
1. **Инициализация**: Куча содержит первые элементы всех массивов - корректно
2. **Индуктивный шаг**: Предположим, мы правильно обработали i элементов
   - Извлекаем минимум из кучи (глобальный минимум среди непрочитанных)
   - Добавляем следующий элемент из того же массива
   - Куча снова содержит минимальные непрочитанные элементы
   - (i+1)-й элемент в результате корректен

**Почему сложность O(n log k)?**

- Обрабатываем n элементов
- Для каждого элемента: операции с кучей размера k = O(log k)
- Итого: O(n log k)

## Временная и пространственная сложность

### Детальный анализ:

- **Временная сложность**: O(n log k)
  - Инициализация кучи: O(k log k)
  - Обработка n элементов: n × O(log k) = O(n log k)
  - Итого: O(n log k)
- **Пространственная сложность**: O(k)
  - Куча размера k
  - Индексы массивов: O(k)

### Сравнение с наивным подходом:

| Подход | Время | Применимость |
|--------|-------|--------------|
| Наивный (поиск минимума каждый раз) | O(nk) | Простой, но медленный |
| K-way merge с кучей | O(n log k) | Эффективный |

**Выигрыш**: O(nk) → O(n log k) - значительное улучшение при больших k!

## Типичные ошибки

1. **Неправильное отслеживание индексов**: Сохраняйте индекс массива и позицию в массиве
2. **Забывание проверки пустых массивов**: Проверяйте, есть ли еще элементы в массиве
3. **Неправильная инициализация**: Добавляйте только первые элементы непустых массивов

## Практические советы

1. Используйте структуру данных для хранения (значение, индекс массива, позиция)
2. Для больших k рассмотрите разделение на группы
3. Оптимизируйте сравнения для сложных объектов

## Структуры данных: внутреннее устройство

### Используемые структуры данных в K-way Merge

В шаблоне K-way Merge используются следующие структуры данных:
- ****: Куча для хранения элементов из k массивов
- ****: K отсортированных массивов
- **Структура элемента**: (значение, индекс массива, позиция в массиве)

###  (Rust) / Heap (Go)

#### Что такое Heap (Куча)?

**Heap (куча)** — это специализированная древовидная структура данных, которая удовлетворяет свойству кучи: для max-heap родитель всегда больше или равен детям, для min-heap родитель всегда меньше или равен детям.

**Ключевые характеристики:**
- **Полное бинарное дерево**: Все уровни заполнены слева направо
- **Свойство кучи**: Корень содержит максимальный (max-heap) или минимальный (min-heap) элемент
- **Эффективные операции**: O(log n) для вставки и удаления, O(1) для доступа к корню

#### Как хранится в памяти:

**Rust BinaryHeap с кастомной структурой**:
```rust
#[derive(PartialEq, Eq)]
struct Element {
    val: i32,
    array_idx: usize,
    pos: usize,
}
```

**Куча хранит**:
- Минимальный элемент из каждого массива
- Размер кучи: k элементов (по одному из каждого массива)
- O(k) памяти

#### Операции и их сложность:

| Операция | Сложность | Объяснение |
|----------|-----------|------------|
| Push | O(log k) | Добавление элемента в кучу |
| Pop | O(log k) | Удаление минимального элемента |
| Общая сложность | O(n log k) | n элементов, каждый O(log k) |

**Почему K-way Merge эффективен**:
- O(n log k) вместо O(nk) наивного подхода
- O(k) памяти вместо O(n)
- Оптимально для больших k

### > (Rust) / [][]T (Go)

#### K отсортированных массивов:

**Структура**:
```
┌─────────────────────────────────────────┐
│ Vec&lt;Vec<i32&gt;>                          │
│ ┌─────────────┐                        │
│ │ [1,4,7]    │ Массив 0               │
│ │ [2,5,8]    │ Массив 1               │
│ │ [3,6,9]    │ Массив 2               │
│ └─────────────┘                        │
└─────────────────────────────────────────┘
```

**Важные детали**:
- Каждый массив отсортирован
- Индексы для отслеживания позиции в каждом массиве
- O(n) общая память для всех массивов

## Глубокое понимание: сложные концепции

### Escape Analysis (Go)

**Для K-way Merge**:
- Куча в куче
- Массивы в куче
- Результаты могут escape

### Borrow Checker (Rust)

**Типичный паттерн**:
```rust
fn merge_k_sorted(arrays: Vec&lt;Vec<i32&gt;>) -> Vec&lt;i32&gt; {
    let mut heap = BinaryHeap::new();
    let mut indices = vec![0; arrays.len()];
    // ...
}
```

### Garbage Collector (Go)

**Для K-way Merge**:
- Куча в куче
- Массивы в куче
- Минимизация k критична

### Ownership и Move Semantics (Rust)

**Концепция владения**:
- `Vec&lt;Vec<i32&gt;>` владеет массивами
- `BinaryHeap` владеет элементами
- RAII гарантирует освобождение

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: K-way Merge

В Rust для K-way Merge:
- **Куча**: `BinaryHeap&lt;(i32, usize, usize)&gt;` - O(k) в куче
- **Результат**: `Vec&lt;i32&gt;` - O(n) где n - общее количество элементов
- **Индексы**: `usize` на стеке - O(1)

#### Go: K-way Merge

В Go:
- **Куча**: `container/heap` - O(k) в куче
- **Результат**: `[]int` - O(n) в куче
- **Индексы**: `int` на стеке - O(1)

### Анализ аллокаций для K-way Merge

#### Подход с кучей:

**Rust**:
```rust
// Аллокации:
// - heap: BinaryHeap&lt;(i32, usize, usize)&gt; - O(k) в куче
// - result: Vec&lt;i32&gt; - O(n) где n - общее количество элементов
// Итого: O(k) + O(n) памяти
```

**Go**:
```go
// Аллокации:
// - heap: ItemHeap - O(k) в куче
// - result: []int - O(n) в куче
// Итого: O(k) + O(n) памяти
```

### Оптимизация памяти

#### Rust оптимизации:

1. **Предварительное выделение кучи**:
```rust
// ✅ Предварительное выделение
let mut heap = BinaryHeap::with_capacity(k);
```

2. **Предварительное выделение результата**:
```rust
// ✅ Предварительное выделение
let mut result = Vec::with_capacity(total_elements);
```

#### Go оптимизации:

1. **Предварительное выделение кучи**:
```go
// ✅ Предварительное выделение
heap := make(ItemHeap, 0, k)
```

2. **Предварительное выделение результата**:
```go
// ✅ Предварительное выделение
result := make([]int, 0, totalElements)
```

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Куча | BinaryHeap в куче | container/heap в куче |
| Результат | Vec в куче | Слайс в куче |
| Память | O(k) + O(n) | O(k) + O(n) |

## Оптимизация производительности

### Общие техники

1. **Предварительное выделение структур данных**
2. **Минимизация операций с кучей**
3. **Эффективные сравнения**

### Специфичные оптимизации для K-way Merge

#### 1. Оптимизация с кучей:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub fn merge_k_lists_optimized(lists: Vec&lt;Option&lt;Box&lt;ListNode&gt;&gt;&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    let mut heap = BinaryHeap::with_capacity(lists.len());
    
    for (idx, list) in lists.iter().enumerate() {
        if let Some(node) = list {
            heap.push((Reverse(node.val), idx));
        }
    }
    
    let mut dummy = Box::new(ListNode::new(0));
    let mut current = &mut dummy;
    
    while let Some((Reverse(val), idx)) = heap.pop() {
        current.next = Some(Box::new(ListNode::new(val)));
        current = current.next.as_mut().unwrap();
        
        // Добавляем следующий элемент из того же списка
        if let Some(next) = &lists[idx].as_ref().unwrap().next {
            heap.push((Reverse(next.val), idx));
        }
    }
    
    dummy.next
}
```

**Go**:
```go
// ✅ Оптимизированная версия
func mergeKListsOptimized(lists []*ListNode) *ListNode {
    heap := make(ItemHeap, 0, len(lists))
    
    for i, list := range lists {
        if list != nil {
            heap = append(heap, &Item{Val: list.Val, ListIdx: i})
        }
    }
    heap.Init(&heap)
    
    dummy := &ListNode{}
    current := dummy
    
    for heap.Len() > 0 {
        item := heap.Pop(&heap).(*Item)
        current.Next = &ListNode{Val: item.Val}
        current = current.Next
        
        if lists[item.ListIdx].Next != nil {
            lists[item.ListIdx] = lists[item.ListIdx].Next
            heap.Push(&heap, &Item{Val: lists[item.ListIdx].Val, ListIdx: item.ListIdx})
        }
    }
    
    return dummy.Next
}
```

### Оптимизация для Rust

1. **Использование `Reverse` для min heap**:
```rust
// ✅ Эффективная min heap
use std::cmp::Reverse;
heap.push((Reverse(val), idx));
```

2. **Предварительное выделение**:
```rust
// ✅ Предварительное выделение
let mut heap = BinaryHeap::with_capacity(k);
```

### Оптимизация для Go

1. **Предварительное выделение кучи**:
```go
// ✅ Предварительное выделение
heap := make(ItemHeap, 0, k)
```

2. **Эффективные операции**:
```go
// ✅ Использование указателей
heap.Push(&heap, item)
```

## Профилирование

### Инструменты профилирования

См. раздел "Профилирование" в [Sliding Window](./sliding-window.md#профилирование) для общих инструментов.

### Как профилировать K-way Merge

#### Rust пример:

```rust
// benches/k_way_merge_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

// Определение ListNode для связанных списков
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option&lt;Box&lt;ListNode&gt;&gt;,
}

impl ListNode {
    #[inline]
    fn new(val: i32) -> Self {
        ListNode { next: None, val }
    }
}

// Вспомогательная функция для создания связанного списка из вектора
fn create_list(vals: Vec&lt;i32&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    if vals.is_empty() {
        return None;
    }
    let mut head = Box::new(ListNode::new(vals[0]));
    let mut current = &mut head;
    for val in vals.into_iter().skip(1) {
        current.next = Some(Box::new(ListNode::new(val)));
        current = current.next.as_mut().unwrap();
    }
    Some(head)
}

// Вспомогательная функция для преобразования списка в вектор
fn list_to_vec(mut head: Option&lt;Box&lt;ListNode&gt;&gt;) -> Vec&lt;i32&gt; {
    let mut result = Vec::new();
    while let Some(node) = head {
        result.push(node.val);
        head = node.next;
    }
    result
}

// Вспомогательная функция для создания тестовых списков
fn create_test_lists(k: usize, size_per_list: usize) -> Vec&lt;Option&lt;Box&lt;ListNode&gt;&gt;&gt; {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let mut lists = Vec::new();
    
    for _ in 0..k {
        let mut vals = Vec::new();
        for _ in 0..size_per_list {
            vals.push(rng.gen_range(0..1000));
        }
        vals.sort();
        lists.push(create_list(vals));
    }
    
    lists
}

fn bench_merge_k_lists(c: &mut Criterion) {
    let lists = create_test_lists(10, 1000);
    
    c.bench_function("merge_10_lists", |b| {
        b.iter(|| merge_k_lists_optimized(black_box(lists.clone())))
    });
}

criterion_group!(benches, bench_merge_k_lists);
criterion_main!(benches);
```

#### Go пример:

```go
func BenchmarkMergeKLists(b *testing.B) {
    lists := createTestLists(10, 1000)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        mergeKListsOptimized(lists)
    }
}
```

### Примеры профилирования

**Анализ производительности**:
- K-way Merge: O(n log k) по времени где n - общее количество элементов
- O(k) памяти для кучи
- O(n) памяти для результата

**Типичные узкие места**:
- Операции с кучей
- Создание результата
- Обновление индексов

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые списки
2. **Граничные случаи**: Пустые списки, один список, все пустые
3. **Стресс-тесты**: Большое количество списков

### Примеры тестов для K-way Merge

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_k_lists_basic() {
        // Используем вспомогательные функции create_list и list_to_vec
        // (определены выше в разделе профилирования)
        let lists = vec![
            create_list(vec![1, 4, 5]),
            create_list(vec![1, 3, 4]),
            create_list(vec![2, 6]),
        ];
        let result = merge_k_lists_optimized(lists);
        assert_eq!(list_to_vec(result), vec![1, 1, 2, 3, 4, 4, 5, 6]);
    }

    #[test]
    fn test_merge_k_lists_empty() {
        let lists = vec![];
        let result = merge_k_lists_optimized(lists);
        assert_eq!(list_to_vec(result), Vec::&lt;i32&gt;::new());
    }
}
```

#### Go тесты:

```go
func TestMergeKLists(t *testing.T) {
    tests := []struct {
        name  string
        lists []*ListNode
        want  []int
    }{
        {"basic", []*ListNode{
            createList([]int{1, 4, 5}),
            createList([]int{1, 3, 4}),
            createList([]int{2, 6}),
        }, []int{1, 1, 2, 3, 4, 4, 5, 6}},
        {"empty", []*ListNode{}, []int{}},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := mergeKListsOptimized(tt.lists)
            if !reflect.DeepEqual(listToVec(result), tt.want) {
                t.Errorf("mergeKListsOptimized() = %v, want %v", listToVec(result), tt.want)
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

fn k_way_merge_benchmark(c: &mut Criterion) {
    let k_values = vec![5, 10, 20];
    
    let mut group = c.benchmark_group("k_way_merge");
    for k in k_values {
        let lists = create_test_lists(k, 100);
        group.bench_with_input(
            BenchmarkId::from_parameter(k),
            &lists,
            |b, lists| {
                b.iter(|| merge_k_lists_optimized(black_box(lists.clone())));
            },
        );
    }
    group.finish();
}
```

#### Go:
```go
func BenchmarkKWayMergeSizes(b *testing.B) {
    kValues := []int{5, 10, 20}
    
    for _, k := range kValues {
        b.Run(fmt.Sprintf("k_%d", k), func(b *testing.B) {
            lists := createTestLists(k, 100)
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                mergeKListsOptimized(lists)
            }
        })
    }
}
```

## Примеры кода

### Rust

```rust
// Примеры использования шаблона K-way Merge на Rust

use std::collections::BinaryHeap;
use std::cmp::Reverse;

// Определение узла связанного списка
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option&lt;Box&lt;ListNode&gt;&gt;,
}

impl ListNode {
    #[inline]
    pub fn new(val: i32) -> Self {
        ListNode { next: None, val }
    }
}

/// Пример 1: Слияние K отсортированных списков
/// 
/// Задача: Объединить K отсортированных связанных списков в один
/// Временная сложность: O(n log k), где n - общее количество узлов
/// Пространственная сложность: O(k)
pub fn merge_k_lists(lists: Vec&lt;Option&lt;Box&lt;ListNode&gt;&gt;&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    let mut heap = BinaryHeap::new();

    // Добавляем первые элементы всех списков в кучу
    for (idx, list) in lists.iter().enumerate() {
        if let Some(node) = list {
            heap.push(Reverse((node.val, idx)));
        }
    }

    let mut dummy = Box::new(ListNode::new(0));
    let mut current = &mut dummy;
    let mut lists = lists;

    while let Some(Reverse((val, idx))) = heap.pop() {
        // Создаем новый узел
        current.next = Some(Box::new(ListNode::new(val)));
        current = current.next.as_mut().unwrap();

        // Перемещаемся к следующему узлу в списке
        if let Some(node) = &mut lists[idx] {
            *node = node.next.take();
            if let Some(next_node) = &node {
                heap.push(Reverse((next_node.val, idx)));
            }
        }
    }

    dummy.next
}

/// Пример 2: Слияние K отсортированных массивов
/// 
/// Задача: Объединить K отсортированных массивов в один отсортированный массив
/// Временная сложность: O(n log k)
/// Пространственная сложность: O(k)
pub fn merge_k_arrays(arrays: Vec&lt;Vec<i32&gt;>) -> Vec&lt;i32&gt; {
    let mut heap = BinaryHeap::new();
    let mut indices = vec![0; arrays.len()];
    let mut result = Vec::new();

    // Добавляем первые элементы всех массивов в кучу
    for (idx, arr) in arrays.iter().enumerate() {
        if !arr.is_empty() {
            heap.push(Reverse((arr[0], idx)));
        }
    }

    while let Some(Reverse((val, arr_idx))) = heap.pop() {
        result.push(val);
        indices[arr_idx] += 1;

        // Добавляем следующий элемент из того же массива
        if indices[arr_idx] < arrays[arr_idx].len() {
            let next_val = arrays[arr_idx][indices[arr_idx]];
            heap.push(Reverse((next_val, arr_idx)));
        }
    }

    result
}

/// Пример 3: K-й наименьший элемент в отсортированной матрице
/// 
/// Задача: Найти K-й наименьший элемент в матрице, где каждая строка и столбец отсортированы
/// Временная сложность: O(k log k)
/// Пространственная сложность: O(k)
pub fn kth_smallest(matrix: Vec&lt;Vec<i32&gt;>, k: i32) -> i32 {
    let mut heap = BinaryHeap::new();
    let n = matrix.len();

    // Добавляем первые элементы каждой строки
    for i in 0..n.min(k as usize) {
        heap.push(Reverse((matrix[i][0], i, 0)));
    }

    let mut count = 0;
    let mut result = 0;

    while let Some(Reverse((val, row, col))) = heap.pop() {
        count += 1;
        if count == k {
            result = val;
            break;
        }

        // Добавляем следующий элемент из той же строки
        if col + 1 < n {
            heap.push(Reverse((matrix[row][col + 1], row, col + 1)));
        }
    }

    result
}

/// Пример 4: K пар с наименьшими суммами
/// 
/// Задача: Найти K пар (u, v), где u из nums1, v из nums2, с наименьшими суммами
/// Временная сложность: O(k log k)
/// Пространственная сложность: O(k)
pub fn k_smallest_pairs(nums1: Vec&lt;i32&gt;, nums2: Vec&lt;i32&gt;, k: i32) -> Vec&lt;Vec<i32&gt;> {
    let mut heap = BinaryHeap::new();
    let k = k as usize;

    // Добавляем первые пары
    for i in 0..nums1.len().min(k) {
        heap.push(Reverse((
            nums1[i] + nums2[0],
            i,
            0,
        )));
    }

    let mut result = Vec::new();

    while let Some(Reverse((sum, i, j))) = heap.pop() {
        result.push(vec![nums1[i], nums2[j]]);

        if result.len() == k {
            break;
        }

        // Добавляем следующую пару из того же элемента nums1
        if j + 1 < nums2.len() {
            heap.push(Reverse((
                nums1[i] + nums2[j + 1],
                i,
                j + 1,
            )));
        }
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
)

// Определение узла связанного списка
type ListNode struct {
	Val  int
	Next *ListNode
}

// MinHeap для элементов с индексами массива
type Element struct {
	val     int
	arrIdx  int
	elemIdx int
}

type MinHeap []Element

func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i].val < h[j].val }
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *MinHeap) Push(x interface{}) {
	*h = append(*h, x.(Element))
}

func (h *MinHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}

// Пример 1: Слияние K отсортированных массивов
//
// Задача: Объединить K отсортированных массивов в один отсортированный массив
// Временная сложность: O(n log k)
// Пространственная сложность: O(k)
func mergeKArrays(arrays [][]int) []int {
	minHeap := &MinHeap{}
	heap.Init(minHeap)
	indices := make([]int, len(arrays))
	var result []int

	// Добавляем первые элементы всех массивов в кучу
	for i, arr := range arrays {
		if len(arr) > 0 {
			heap.Push(minHeap, Element{val: arr[0], arrIdx: i, elemIdx: 0})
		}
	}

	for minHeap.Len() > 0 {
		elem := heap.Pop(minHeap).(Element)
		result = append(result, elem.val)
		indices[elem.arrIdx]++

		// Добавляем следующий элемент из того же массива
		if indices[elem.arrIdx] < len(arrays[elem.arrIdx]) {
			nextVal := arrays[elem.arrIdx][indices[elem.arrIdx]]
			heap.Push(minHeap, Element{
				val:     nextVal,
				arrIdx:  elem.arrIdx,
				elemIdx: indices[elem.arrIdx],
			})
		}
	}

	return result
}

// Пример 2: K-й наименьший элемент в отсортированной матрице
//
// Задача: Найти K-й наименьший элемент в матрице, где каждая строка и столбец отсортированы
// Временная сложность: O(k log k)
// Пространственная сложность: O(k)
func kthSmallest(matrix [][]int, k int) int {
	minHeap := &MinHeap{}
	heap.Init(minHeap)
	n := len(matrix)

	// Добавляем первые элементы каждой строки
	for i := 0; i < n && i < k; i++ {
		heap.Push(minHeap, Element{val: matrix[i][0], arrIdx: i, elemIdx: 0})
	}

	count := 0
	result := 0

	for minHeap.Len() > 0 {
		elem := heap.Pop(minHeap).(Element)
		count++
		if count == k {
			result = elem.val
			break
		}

		// Добавляем следующий элемент из той же строки
		if elem.elemIdx+1 < n {
			heap.Push(minHeap, Element{
				val:     matrix[elem.arrIdx][elem.elemIdx+1],
				arrIdx:  elem.arrIdx,
				elemIdx: elem.elemIdx + 1,
			})
		}
	}

	return result
}

// Пример 3: K пар с наименьшими суммами
//
// Задача: Найти K пар (u, v), где u из nums1, v из nums2, с наименьшими суммами
// Временная сложность: O(k log k)
// Пространственная сложность: O(k)
func kSmallestPairs(nums1, nums2 []int, k int) [][]int {
	type Pair struct {
		sum int
		i   int
		j   int
	}

	minHeap := make([]Pair, 0)
	for i := 0; i < len(nums1) && i < k; i++ {
		minHeap = append(minHeap, Pair{sum: nums1[i] + nums2[0], i: i, j: 0})
		// Просеиваем вверх
		for idx := len(minHeap) - 1; idx > 0 && minHeap[idx].sum < minHeap[(idx-1)/2].sum; idx = (idx - 1) / 2 {
			minHeap[idx], minHeap[(idx-1)/2] = minHeap[(idx-1)/2], minHeap[idx]
		}
	}

	var result [][]int
	for len(minHeap) > 0 && len(result) < k {
		// Извлекаем минимум
		pair := minHeap[0]
		result = append(result, []int{nums1[pair.i], nums2[pair.j]})

		// Просеиваем вниз
		minHeap[0] = minHeap[len(minHeap)-1]
		minHeap = minHeap[:len(minHeap)-1]
		i := 0
		for {
			smallest := i
			left := 2*i + 1
			right := 2*i + 2
			if left < len(minHeap) && minHeap[left].sum < minHeap[smallest].sum {
				smallest = left
			}
			if right < len(minHeap) && minHeap[right].sum < minHeap[smallest].sum {
				smallest = right
			}
			if smallest == i {
				break
			}
			minHeap[i], minHeap[smallest] = minHeap[smallest], minHeap[i]
			i = smallest
		}

		// Добавляем следующую пару
		if pair.j+1 < len(nums2) {
			newPair := Pair{sum: nums1[pair.i] + nums2[pair.j+1], i: pair.i, j: pair.j + 1}
			minHeap = append(minHeap, newPair)
			// Просеиваем вверх
			idx := len(minHeap) - 1
			for idx > 0 && minHeap[idx].sum < minHeap[(idx-1)/2].sum {
				minHeap[idx], minHeap[(idx-1)/2] = minHeap[(idx-1)/2], minHeap[idx]
				idx = (idx - 1) / 2
			}
		}
	}

	return result
}
```

## Примеры задач на LeetCode

### Средние:
- [Merge k Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/) - Слияние K отсортированных списков
- [Kth Smallest Element in a Sorted Matrix](https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/) - K-й наименьший элемент в матрице

### Сложные:
- [Find K Pairs with Smallest Sums](https://leetcode.com/problems/find-k-pairs-with-smallest-sums/) - K пар с наименьшими суммами
- [Smallest Range Covering Elements from K Lists](https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/) - Наименьший диапазон

