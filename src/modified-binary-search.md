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

```go
// Базовый шаблон модифицированного бинарного поиска
func modifiedBinarySearch(arr []int, target int) int {
    // Шаг 1: Инициализация границ поиска
    // left - левая граница интервала поиска (включительно)
    // right - правая граница интервала поиска (включительно)
    left := 0
    right := len(arr) - 1
    
    // Шаг 2: Цикл поиска - продолжаем, пока интервал не пуст
    // Условие left <= right означает, что интервал [left, right] содержит хотя бы один элемент
    for left <= right {
        // Вычисляем средний индекс интервала
        // Используем формулу left + (right - left) / 2 вместо (left + right) / 2
        // чтобы избежать переполнения при больших значениях left и right
        mid := left + (right-left)/2
        
        // Проверяем условие для среднего элемента
        // В зависимости от задачи, условие может быть разным:
        // - arr[mid] == target: обычный бинарный поиск
        // - arr[mid] >= target: поиск первого вхождения
        // - arr[mid] <= target: поиск последнего вхождения
        // - и другие модификации для специфических задач
        if arr[mid] == target {
            // Нашли элемент - возвращаем индекс
            // В модифицированных версиях здесь может быть дополнительная логика
            return mid
        } else if arr[mid] < target {
            // Средний элемент меньше цели - ищем в правой половине
            // Обновляем left, исключая левую половину из поиска
            left = mid + 1
        } else {
            // Средний элемент больше цели - ищем в левой половине
            // Обновляем right, исключая правую половину из поиска
            right = mid - 1
        }
    }
    
    // Шаг 3: Возврат результата
    // Если мы дошли сюда, элемент не найден
    // В зависимости от задачи, можно вернуть:
    // - -1 для "не найдено"
    // - left для "позиция вставки"
    // - right для других вариантов
    return -1
}

// Пример: Поиск первого вхождения элемента (если есть дубликаты)
func findFirstOccurrence(arr []int, target int) int {
    left := 0
    right := len(arr) - 1
    result := -1
    
    for left <= right {
        mid := left + (right-left)/2
        
        if arr[mid] == target {
            // Нашли элемент, но продолжаем искать влево для первого вхождения
            result = mid
            right = mid - 1  // Ищем дальше влево
        } else if arr[mid] < target {
            left = mid + 1
        } else {
            right = mid - 1
        }
    }
    
    return result
}
```

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

## Структуры данных: внутреннее устройство

### Используемые структуры данных в Modified Binary Search

В шаблоне Modified Binary Search используются следующие структуры данных:
- ****: Отсортированный массив для поиска
- **Индексы**: left, right, mid для навигации (хранятся на стеке)

###  (Rust) / Slice (Go)

#### Как хранится в памяти:

**Rust Vec&lt;T&gt;**:
```
Отсортированный массив:
┌─────────────────────────────────────────┐
│ Vec&lt;i32&gt;                                 │
│ ┌─────────────┐                         │
│ │ ptr: *mut i32│ Указатель на данные    │
│ │ len: usize  │ Количество элементов    │
│ └─────────────┘                         │
└─────────────────────────────────────────┘
         │
         ▼
    [1][3][5][7][9][11][13]
    0  1  2  3  4  5   6
```

**Важные детали**:
- Массив должен быть отсортирован
- Доступ по индексу O(1)
- Непрерывная память (cache-friendly)
- Binary search использует индексы, не создает новых структур

#### Операции и их сложность:

| Операция | Сложность | Объяснение |
|----------|-----------|------------|
| Binary search | O(log n) | Каждый шаг уменьшает пространство поиска в 2 раза |
| Доступ по индексу | O(1) | Прямой доступ к памяти |
| Сравнение элементов | O(1) | Простое сравнение значений |

**Почему Binary Search эффективен**:
- O(log n) время вместо O(n) линейного поиска
- O(1) дополнительная память (только индексы)
- Cache-friendly доступ к памяти

## Глубокое понимание: сложные концепции

### Escape Analysis (Go)

**Для Modified Binary Search**:
- Входной массив может быть на стеке (если небольшой) или в куче
- Индексы left, right, mid - на стеке
- Результаты могут escape

### Borrow Checker (Rust)

**Типичный паттерн**:
```rust
fn binary_search(arr: &[i32], target: i32) -> Option&lt;usize&gt; {
    let mut left = 0;
    let mut right = arr.len();
    // arr - immutable borrow
    // left, right - на стеке
    // ...
}
```

### Garbage Collector (Go)

**Для Modified Binary Search**:
- In-place поиск, не создает новых структур
- Минимальное влияние на GC
- Только индексы на стеке

### Ownership и Move Semantics (Rust)

**Концепция владения**:
- Входные данные: `&[T]` (заимствование)
- Не берем владение, только читаем
- Нет необходимости в новом Vec

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Бинарный поиск

В Rust для Modified Binary Search:
- **Индексы**: `usize` на стеке - O(1)
- **Входные данные**: `&[i32]` - ссылка, не аллоцирует
- **Результат**: `Option&lt;usize&gt;` - на стеке, O(1)

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
// - Результат: Option&lt;usize&gt; (стек) - O(1)
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
fn binary_search(arr: &[i32], target: i32) -> Option&lt;usize&gt; {
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
pub fn binary_search_optimized(arr: &[i32], target: i32) -> Option&lt;usize&gt; {
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

См. раздел "Профилирование" в [Sliding Window](./sliding-window.md#профилирование) для общих инструментов.

### Как профилировать Modified Binary Search

#### Rust пример:

```rust
// benches/binary_search_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_binary_search(c: &mut Criterion) {
    let arr: Vec&lt;i32&gt; = (0..1000000).collect();
    
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
        let arr: Vec&lt;i32&gt; = (0..size).collect();
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

### Rust

```rust
// Примеры использования шаблона Modified Binary Search на Rust

/// Пример 1: Классический бинарный поиск
/// 
/// Задача: Найти индекс элемента target в отсортированном массиве
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn binary_search(nums: Vec&lt;i32&gt;, target: i32) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];

        if mid_val == target {
            return mid;
        } else if mid_val < target {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    -1
}

/// Пример 2: Поиск первого вхождения элемента
/// 
/// Задача: Найти индекс первого вхождения target в отсортированном массиве
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn search_first(nums: Vec&lt;i32&gt;, target: i32) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;
    let mut result = -1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];

        if mid_val == target {
            result = mid;
            right = mid - 1; // Продолжаем искать влево
        } else if mid_val < target {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    result
}

/// Пример 3: Поиск последнего вхождения элемента
/// 
/// Задача: Найти индекс последнего вхождения target в отсортированном массиве
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn search_last(nums: Vec&lt;i32&gt;, target: i32) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;
    let mut result = -1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];

        if mid_val == target {
            result = mid;
            left = mid + 1; // Продолжаем искать вправо
        } else if mid_val < target {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    result
}

/// Пример 4: Поиск в повернутом отсортированном массиве
/// 
/// Задача: Найти target в массиве, который был повернут
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn search_rotated(nums: Vec&lt;i32&gt;, target: i32) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];

        if mid_val == target {
            return mid;
        }

        // Определяем, какая часть отсортирована
        if nums[left as usize] <= mid_val {
            // Левая часть отсортирована
            if nums[left as usize] <= target && target < mid_val {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        } else {
            // Правая часть отсортирована
            if mid_val < target && target <= nums[right as usize] {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
    }

    -1
}

/// Пример 5: Поиск минимума в повернутом массиве
/// 
/// Задача: Найти минимальный элемент в повернутом отсортированном массиве
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn find_min_rotated(nums: Vec&lt;i32&gt;) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;

    while left < right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];
        let right_val = nums[right as usize];

        if mid_val > right_val {
            // Минимум в правой части
            left = mid + 1;
        } else {
            // Минимум в левой части (включая mid)
            right = mid;
        }
    }

    nums[left as usize]
}

/// Пример 6: Поиск в 2D матрице
/// 
/// Задача: Найти target в отсортированной 2D матрице
/// Временная сложность: O(log(m×n))
/// Пространственная сложность: O(1)
pub fn search_matrix(matrix: Vec&lt;Vec<i32&gt;>, target: i32) -> bool {
    if matrix.is_empty() || matrix[0].is_empty() {
        return false;
    }

    let rows = matrix.len();
    let cols = matrix[0].len();
    let mut left = 0;
    let mut right = (rows * cols) as i32 - 1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let row = (mid / cols as i32) as usize;
        let col = (mid % cols as i32) as usize;
        let mid_val = matrix[row][col];

        if mid_val == target {
            return true;
        } else if mid_val < target {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    false
}

/// Пример 7: Поиск вставки элемента
/// 
/// Задача: Найти индекс, куда нужно вставить target в отсортированном массиве
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn search_insert(nums: Vec&lt;i32&gt;, target: i32) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];

        if mid_val == target {
            return mid;
        } else if mid_val < target {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    left
}
```

### Go

```go
package main

import (
	"fmt"
)

// Пример 1: Классический бинарный поиск
//
// Задача: Найти индекс элемента target в отсортированном массиве
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func binarySearch(nums []int, target int) int {
	left := 0
	right := len(nums) - 1

	for left <= right {
		mid := left + (right-left)/2
		midVal := nums[mid]

		if midVal == target {
			return mid
		} else if midVal < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return -1
}

// Пример 2: Поиск первого вхождения элемента
//
// Задача: Найти индекс первого вхождения target в отсортированном массиве
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func searchFirst(nums []int, target int) int {
	left := 0
	right := len(nums) - 1
	result := -1

	for left <= right {
		mid := left + (right-left)/2
		midVal := nums[mid]

		if midVal == target {
			result = mid
			right = mid - 1 // Продолжаем искать влево
		} else if midVal < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return result
}

// Пример 3: Поиск последнего вхождения элемента
//
// Задача: Найти индекс последнего вхождения target в отсортированном массиве
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func searchLast(nums []int, target int) int {
	left := 0
	right := len(nums) - 1
	result := -1

	for left <= right {
		mid := left + (right-left)/2
		midVal := nums[mid]

		if midVal == target {
			result = mid
			left = mid + 1 // Продолжаем искать вправо
		} else if midVal < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return result
}

// Пример 4: Поиск в повернутом отсортированном массиве
//
// Задача: Найти target в массиве, который был повернут
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func searchRotated(nums []int, target int) int {
	left := 0
	right := len(nums) - 1

	for left <= right {
		mid := left + (right-left)/2
		midVal := nums[mid]

		if midVal == target {
			return mid
		}

		// Определяем, какая часть отсортирована
		if nums[left] <= midVal {
			// Левая часть отсортирована
			if nums[left] <= target && target < midVal {
				right = mid - 1
			} else {
				left = mid + 1
			}
		} else {
			// Правая часть отсортирована
			if midVal < target && target <= nums[right] {
				left = mid + 1
			} else {
				right = mid - 1
			}
		}
	}

	return -1
}

// Пример 5: Поиск минимума в повернутом массиве
//
// Задача: Найти минимальный элемент в повернутом отсортированном массиве
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func findMinRotated(nums []int) int {
	left := 0
	right := len(nums) - 1

	for left < right {
		mid := left + (right-left)/2
		midVal := nums[mid]
		rightVal := nums[right]

		if midVal > rightVal {
			// Минимум в правой части
			left = mid + 1
		} else {
			// Минимум в левой части (включая mid)
			right = mid
		}
	}

	return nums[left]
}

// Пример 6: Поиск в 2D матрице
//
// Задача: Найти target в отсортированной 2D матрице
// Временная сложность: O(log(m×n))
// Пространственная сложность: O(1)
func searchMatrix(matrix [][]int, target int) bool {
	if len(matrix) == 0 || len(matrix[0]) == 0 {
		return false
	}

	rows := len(matrix)
	cols := len(matrix[0])
	left := 0
	right := rows*cols - 1

	for left <= right {
		mid := left + (right-left)/2
		row := mid / cols
		col := mid % cols
		midVal := matrix[row][col]

		if midVal == target {
			return true
		} else if midVal < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return false
}

// Пример 7: Поиск вставки элемента
//
// Задача: Найти индекс, куда нужно вставить target в отсортированном массиве
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func searchInsert(nums []int, target int) int {
	left := 0
	right := len(nums) - 1

	for left <= right {
		mid := left + (right-left)/2
		midVal := nums[mid]

		if midVal == target {
			return mid
		} else if midVal < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return left
}
```

## Связанные шаблоны

- **[Cyclic Sort](./cyclic-sort.md)** - Работа с массивами в определенном диапазоне
- **[Merge Intervals](./merge-intervals.md)** - Работа с отсортированными интервалами
- **[K-way Merge](./k-way-merge.md)** - Слияние отсортированных массивов

## Следующий шаг

После изучения Modified Binary Search рекомендуется перейти к **[Reverse Linked List](./reverse-linked-list.md)** для изучения работы со списками или к **[Tree BFS](./tree-bfs.md)** для изучения обхода деревьев.

## Дополнительные ресурсы

- [Binary Search - LeetCode Tag](https://leetcode.com/tag/binary-search/) - Коллекция задач на бинарный поиск
- [Binary Search Algorithm - GeeksforGeeks](https://www.geeksforgeeks.org/binary-search/) - Подробное объяснение
- [Binary Search - Wikipedia](https://en.wikipedia.org/wiki/Binary_search_algorithm) - Исторический контекст и вариации

