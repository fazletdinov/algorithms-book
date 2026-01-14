# Modified Binary Search (Модифицированный бинарный поиск)

## Описание шаблона

Шаблон **Modified Binary Search** расширяет классический бинарный поиск для работы с различными условиями поиска. Вместо простого поиска точного значения, мы ищем первое/последнее вхождение, границы диапазона, или элемент в повернутом/неотсортированном массиве.

### Исторический контекст

Бинарный поиск был разработан в 1940-х годах и является одним из самых эффективных алгоритмов поиска. Модифицированные версии расширяют его применение на задачи поиска границ, повернутых массивов и других структур данных.

### Основная идея

Ключевое наблюдение: бинарный поиск работает не только для точного совпадения, но и для любых монотонных предикатов. Изменяя условие обновления границ и условие завершения, мы можем решать различные задачи поиска.

## Когда применять

Используйте этот шаблон, когда:
- Массив отсортирован (или частично отсортирован)
- Нужно найти первое или последнее вхождение элемента
- Требуется найти границы диапазона значений
- Массив повернут или имеет особую структуру
- Нужно найти элемент в 2D матрице или другом пространстве поиска
- Задача связана с поиском в отсортированных данных с условиями

## Алгоритм/Подход

### Базовый модифицированный бинарный поиск:

1. **Инициализация**: `left = 0`, `right = n - 1`
2. **Цикл**: Пока `left <= right`:
   - Вычислить `mid = left + (right - left) / 2`
   - Проверить условие для `mid`
   - Обновить `left` или `right` в зависимости от условия
3. **Возврат**: Вернуть результат в зависимости от задачи

### Варианты условий:

- **Первое вхождение**: Продолжать поиск влево при равенстве
- **Последнее вхождение**: Продолжать поиск вправо при равенстве
- **Повернутый массив**: Проверять, какая часть отсортирована

## Визуализация

### Поиск первого вхождения:

```
Массив: [1, 2, 2, 2, 3, 4, 5], target = 2

Шаг 1: left=0, right=6, mid=3, arr[3]=2
        [1, 2, 2, 2, 3, 4, 5]
         ↑        ↑        ↑
        left    mid     right
        Найдено 2, но продолжаем влево для первого вхождения
        right = mid - 1 = 2

Шаг 2: left=0, right=2, mid=1, arr[1]=2
        [1, 2, 2, 2, 3, 4, 5]
         ↑  ↑  ↑
        left mid right
        Найдено 2, продолжаем влево
        right = mid - 1 = 0

Шаг 3: left=0, right=0, mid=0, arr[0]=1
        [1, 2, 2, 2, 3, 4, 5]
         ↑
        left=right=mid
        arr[0] != 2, left = mid + 1 = 1

Результат: left = 1 (первое вхождение 2)
```

## Математическое обоснование

### Почему алгоритм работает?

**Инвариант бинарного поиска**: На каждом шаге интервал [left, right] содержит решение (если оно существует), и размер интервала уменьшается вдвое.

**Доказательство корректности**:
1. **Базовый случай**: Исходный интервал [0, n-1] содержит решение
2. **Индуктивный шаг**: Предположим, интервал [left, right] содержит решение
   - Вычисляем mid
   - По условию монотонности, можем исключить половину интервала
   - Новый интервал также содержит решение
   - Размер интервала уменьшается вдвое

**Почему сложность O(log n)?**

На каждом шаге размер интервала уменьшается вдвое. Максимальное количество шагов = log₂(n) → O(log n).

## Временная и пространственная сложность

### Детальный анализ:

- **Временная сложность**: O(log n)
  - На каждом шаге интервал уменьшается вдвое
  - Максимум log₂(n) шагов
  - Операции на каждом шаге: O(1)
  - Итого: O(log n)
- **Пространственная сложность**: O(1)
  - Только переменные для границ

### Сравнение с линейным поиском:

| Подход | Время | Применимость |
|--------|-------|--------------|
| Линейный поиск | O(n) | Любые данные |
| Бинарный поиск | O(log n) | Отсортированные данные |

**Выигрыш**: O(n) → O(log n) - экспоненциальное улучшение!

## Типичные ошибки

1. **Переполнение при вычислении mid**: Используйте `left + (right - left) / 2` вместо `(left + right) / 2`
2. **Неправильное условие завершения**: `left <= right` vs `left < right` зависит от задачи
3. **Неправильное обновление границ**: `left = mid + 1` vs `left = mid` зависит от условия

## Практические советы

1. Всегда используйте формулу `mid = left + (right - left) / 2` для избежания переполнения
2. Определите предикат перед написанием кода
3. Тестируйте на граничных случаях: пустой массив, один элемент, элемент не найден

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Бинарный поиск

В Rust для Modified Binary Search:
- **Индексы**: `usize` на стеке - O(1)
- **Входные данные**: `&[i32]` - ссылка, не аллоцирует
- **Результат**: `Option<usize>` - на стеке, O(1)

#### Go: Бинарный поиск

В Go:
- **Индексы**: `int` на стеке - O(1)
- **Входные данные**: `[]int` - уже в куче
- **Результат**: `int` и `bool` - на стеке, O(1)

### Анализ аллокаций для Modified Binary Search

#### Базовый подход:

**Rust**:
```rust
// Аллокации:
// - left, right, mid: usize (стек) - O(1)
// - Результат: Option<usize> (стек) - O(1)
// Итого: O(1) памяти, никаких аллокаций в куче
```

**Go**:
```go
// Аллокации:
// - left, right, mid: int (стек) - O(1)
// - Результат: int, bool (стек) - O(1)
// Итого: O(1) памяти, никаких аллокаций в куче
```

### Оптимизация памяти

#### Rust оптимизации:

1. **Использование ссылок**:
```rust
// ✅ Используем ссылки вместо владения
fn binary_search(arr: &[i32], target: i32) -> Option<usize> {
    // ...
}
```

2. **Избежание клонирования**:
```rust
// ✅ Работаем с индексами, не клонируем элементы
let mid = left + (right - left) / 2;
```

#### Go оптимизации:

1. **Работа с индексами**:
```go
// ✅ Работаем с индексами, не создаем новые слайсы
mid := left + (right-left)/2
```

2. **Избежание аллокаций**:
```go
// ✅ Все операции на стеке
left, right := 0, len(arr)-1
```

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Память | O(1) константная | O(1) константная |
| Индексы | usize на стеке | int на стеке |
| Производительность | Предсказуемая | Предсказуемая |

## Оптимизация производительности

### Общие техники

1. **Избежание переполнения**: Используйте `left + (right - left) / 2`
2. **Минимизация проверок**: Оптимизируйте условия
3. **Ранние выходы**: Когда возможно

### Специфичные оптимизации для Modified Binary Search

#### 1. Оптимизация бинарного поиска:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub fn binary_search_optimized(arr: &[i32], target: i32) -> Option<usize> {
    let mut left = 0;
    let mut right = arr.len().saturating_sub(1);
    
    while left <= right {
        let mid = left + (right - left) / 2;  // Избегаем переполнения
        match arr[mid].cmp(&target) {
            std::cmp::Ordering::Equal => return Some(mid),
            std::cmp::Ordering::Less => left = mid + 1,
            std::cmp::Ordering::Greater => right = mid - 1,
        }
    }
    None
}
```

**Go**:
```go
// ✅ Оптимизированная версия
func binarySearchOptimized(arr []int, target int) (int, bool) {
    left, right := 0, len(arr)-1
    
    for left <= right {
        mid := left + (right-left)/2  // Избегаем переполнения
        switch {
        case arr[mid] == target:
            return mid, true
        case arr[mid] < target:
            left = mid + 1
        default:
            right = mid - 1
        }
    }
    return 0, false
}
```

### Оптимизация для Rust

1. **Использование `cmp`**:
```rust
// ✅ Более эффективное сравнение
match arr[mid].cmp(&target) {
    Ordering::Equal => return Some(mid),
    // ...
}
```

2. **Избежание bounds checking**:
```rust
// Компилятор Rust оптимизирует проверки границ
```

### Оптимизация для Go

1. **Использование switch**:
```go
// ✅ Эффективный switch
switch {
case arr[mid] == target:
    return mid, true
// ...
}
```

2. **Минимизация проверок**:
```go
// ✅ Простые проверки
for left <= right {
    // ...
}
```

## Профилирование

### Инструменты профилирования

См. раздел "Профилирование" в [Sliding Window](./sliding-window/README.md#профилирование) для общих инструментов.

### Как профилировать Modified Binary Search

#### Rust пример:

```rust
// benches/binary_search_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_binary_search(c: &mut Criterion) {
    let arr: Vec<i32> = (0..1000000).collect();
    
    c.bench_function("binary_search_1M", |b| {
        b.iter(|| binary_search_optimized(black_box(&arr), 500000))
    });
}

criterion_group!(benches, bench_binary_search);
criterion_main!(benches);
```

#### Go пример:

```go
func BenchmarkBinarySearch(b *testing.B) {
    arr := make([]int, 1000000)
    for i := range arr {
        arr[i] = i
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        binarySearchOptimized(arr, 500000)
    }
}
```

### Примеры профилирования

**Анализ производительности**:
- Binary Search: O(log n) по времени
- O(1) дополнительной памяти
- Минимальные аллокации (только индексы)

**Типичные узкие места**:
- Доступ к элементам массива
- Сравнения
- Условные операторы

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые случаи поиска
2. **Граничные случаи**: Пустой массив, один элемент, элемент не найден
3. **Стресс-тесты**: Большие массивы

### Примеры тестов для Modified Binary Search

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_binary_search_basic() {
        let arr = vec![1, 2, 3, 4, 5];
        assert_eq!(binary_search_optimized(&arr, 3), Some(2));
    }

    #[test]
    fn test_binary_search_not_found() {
        let arr = vec![1, 2, 3, 4, 5];
        assert_eq!(binary_search_optimized(&arr, 6), None);
    }

    #[test]
    fn test_binary_search_empty() {
        let arr = vec![];
        assert_eq!(binary_search_optimized(&arr, 1), None);
    }
}
```

#### Go тесты:

```go
func TestBinarySearch(t *testing.T) {
    tests := []struct {
        name   string
        arr    []int
        target int
        want   bool
    }{
        {"basic", []int{1, 2, 3, 4, 5}, 3, true},
        {"not_found", []int{1, 2, 3, 4, 5}, 6, false},
        {"empty", []int{}, 1, false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            _, got := binarySearchOptimized(tt.arr, tt.target)
            if got != tt.want {
                t.Errorf("binarySearchOptimized() = %v, want %v", got, tt.want)
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

fn binary_search_benchmark(c: &mut Criterion) {
    let sizes = vec![1000, 100000, 10000000];
    
    let mut group = c.benchmark_group("binary_search");
    for size in sizes {
        let arr: Vec<i32> = (0..size).collect();
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            &arr,
            |b, arr| {
                b.iter(|| binary_search_optimized(black_box(arr), size as i32 / 2));
            },
        );
    }
    group.finish();
}
```

#### Go:
```go
func BenchmarkBinarySearchSizes(b *testing.B) {
    sizes := []int{1000, 100000, 10000000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            arr := make([]int, size)
            for i := range arr {
                arr[i] = i
            }
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                binarySearchOptimized(arr, size/2)
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
- [Binary Search](https://leetcode.com/problems/binary-search/) - Бинарный поиск
- [First Bad Version](https://leetcode.com/problems/first-bad-version/) - Первая плохая версия

### Средние:
- [Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/) - Поиск в повернутом массиве
- [Find First and Last Position of Element in Sorted Array](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/) - Первая и последняя позиция
- [Search a 2D Matrix](https://leetcode.com/problems/search-a-2d-matrix/) - Поиск в 2D матрице

### Сложные:
- [Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) - Минимум в повернутом массиве
- [Median of Two Sorted Arrays](https://leetcode.com/problems/median-of-two-sorted-arrays/) - Медиана двух отсортированных массивов

## Примеры кода

См. файлы:
- [Rust примеры](./rust/examples.rs)
- [Go примеры](./go/examples.go)

