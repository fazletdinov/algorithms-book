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

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: K-way Merge

В Rust для K-way Merge:
- **Куча**: `BinaryHeap<(i32, usize, usize)>` - O(k) в куче
- **Результат**: `Vec<i32>` - O(n) где n - общее количество элементов
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
// - heap: BinaryHeap<(i32, usize, usize)> - O(k) в куче
// - result: Vec<i32> - O(n) где n - общее количество элементов
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
pub fn merge_k_lists_optimized(lists: Vec<Option<Box<ListNode>>>) -> Option<Box<ListNode>> {
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

См. раздел "Профилирование" в [Sliding Window](./sliding-window/README.md#профилирование) для общих инструментов.

### Как профилировать K-way Merge

#### Rust пример:

```rust
// benches/k_way_merge_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

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
        assert_eq!(list_to_vec(result), Vec::<i32>::new());
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

См. файлы:
- [Rust примеры](./rust/examples.rs)
- [Go примеры](./go/examples.go)

## Примеры задач на LeetCode

### Средние:
- [Merge k Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/) - Слияние K отсортированных списков
- [Kth Smallest Element in a Sorted Matrix](https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/) - K-й наименьший элемент в матрице

### Сложные:
- [Find K Pairs with Smallest Sums](https://leetcode.com/problems/find-k-pairs-with-smallest-sums/) - K пар с наименьшими суммами
- [Smallest Range Covering Elements from K Lists](https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/) - Наименьший диапазон

## Примеры кода

См. файлы:
- [Rust примеры](./rust/examples.rs)
- [Go примеры](./go/examples.go)

