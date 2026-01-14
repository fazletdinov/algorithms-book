# Subsets (Подмножества)

## Описание шаблона

Шаблон **Subsets** используется для генерации всех возможных подмножеств заданного множества. Этот подход основан на рекурсии и backtracking, где мы решаем, включать или не включать каждый элемент в текущее подмножество.

### Исторический контекст

Генерация всех подмножеств множества - классическая задача комбинаторики. Для множества из n элементов существует 2^n подмножеств (включая пустое множество). Алгоритм основан на принципе включения-исключения и является фундаментальным для многих задач перебора.

### Основная идея

Ключевое наблюдение: для каждого элемента у нас есть два выбора - включить его в подмножество или не включать. Это создает бинарное дерево решений с 2^n листьями, каждый из которых представляет одно подмножество.

## Когда применять

Используйте этот шаблон, когда:
- Нужно сгенерировать все возможные подмножества множества
- Требуется найти все комбинации элементов
- Задача связана с перебором всех возможных вариантов
- Нужно решить задачу методом "включить/исключить" для каждого элемента
- Требуется найти подмножества с определенными свойствами

## Алгоритм/Подход

### Рекурсивный подход:

1. **Базовый случай**: Если достигнут конец массива, добавить текущее подмножество в результат
2. **Рекурсия**: Для каждого элемента:
   - Включить элемент в подмножество и рекурсивно обработать следующий
   - Исключить элемент и рекурсивно обработать следующий
3. **Backtracking**: После обработки удалить элемент из текущего подмножества

### Итеративный подход:

Начать с пустого подмножества и для каждого элемента добавлять его ко всем существующим подмножествам.

## Визуализация

### Генерация подмножеств для [1, 2, 3]:

```
Рекурсивное дерево:

                    []
                  /    \
               [1]      []
              /  \     /  \
          [1,2] [1]  [2]  []
          /  \   / \  / \  / \
    [1,2,3][1,2][1,3][1][2,3][2][3][]

Результат: [[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]
```

### Итеративный подход:

```
Шаг 1: [[]]
Шаг 2: [[], [1]]                    (добавляем 1)
Шаг 3: [[], [1], [2], [1,2]]        (добавляем 2)
Шаг 4: [[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]  (добавляем 3)
```

## Математическое обоснование

### Почему алгоритм работает?

**Инвариант**: После обработки k элементов, текущее подмножество содержит решение для первых k элементов, и мы генерируем все возможные комбинации включения/исключения оставшихся элементов.

**Доказательство корректности** (индукция по n):
1. **Базовый случай**: Для пустого множества генерируется только пустое подмножество - корректно
2. **Индуктивный шаг**: Предположим, алгоритм корректно генерирует подмножества для n-1 элементов
   - Для n-го элемента: либо включаем, либо не включаем
   - В каждом случае рекурсивно генерируем подмножества для оставшихся n-1 элементов
   - По индукции получаем все 2^n подмножеств

**Почему сложность O(2^n × n)?**

- Генерируется 2^n подмножеств
- Каждое подмножество требует O(n) времени для копирования
- Итого: O(2^n × n)

## Временная и пространственная сложность

### Детальный анализ:

- **Временная сложность**: O(2^n × n)
  - Рекурсивное дерево имеет 2^n листьев
  - Каждый путь от корня до листа имеет длину n
  - Копирование каждого подмножества: O(n)
  - Итого: O(2^n × n)
- **Пространственная сложность**: O(2^n × n)
  - Результирующий список: O(2^n × n)
  - Рекурсивный стек: O(n) - глубина рекурсии

### Оптимизации:

- **Итеративный подход**: Может быть более эффективным по памяти (не хранит весь стек)
- **Backtracking**: Использует один массив и изменяет его, избегая копирования

## Типичные ошибки

1. **Забывание backtracking**: Удаляйте элемент после рекурсивного вызова
2. **Неправильный порядок операций**: Сначала включайте, затем исключайте
3. **Модификация исходного массива**: Используйте копии при необходимости

## Практические советы

1. Используйте backtracking для экономии памяти
2. Для больших n рассмотрите итеративный подход
3. Обрабатывайте дубликаты специально (пропускайте одинаковые элементы)

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Генерация подмножеств

В Rust для Subsets:
- **Backtracking**: Стек вызовов - O(n) для глубины рекурсии
- **Результат**: `Vec<Vec<i32>>` - O(2^n * n) в худшем случае
- **Текущий путь**: `Vec<i32>` - O(n) для каждого пути

#### Go: Генерация подмножеств

В Go:
- **Backtracking**: Стек вызовов - O(n)
- **Результат**: `[][]int` - O(2^n * n) в куче
- **Текущий путь**: `[]int` - O(n) для каждого пути

### Анализ аллокаций для Subsets

#### Рекурсивный подход:

**Rust**:
```rust
// Аллокации:
// - Стек вызовов: O(n) для глубины рекурсии
// - result: Vec<Vec<i32>> - O(2^n * n) в худшем случае
// - current: Vec<i32> - O(n) для каждого пути
// Итого: O(2^n * n) памяти в худшем случае
```

**Go**:
```go
// Аллокации:
// - Стек вызовов: O(n)
// - result: [][]int - O(2^n * n) в куче
// - current: []int - O(n) для каждого пути
// Итого: O(2^n * n) памяти в худшем случае
```

### Оптимизация памяти

#### Rust оптимизации:

1. **Использование backtracking**:
```rust
// ✅ Переиспользование current вектора
fn backtrack(nums: &[i32], start: usize, current: &mut Vec<i32>, result: &mut Vec<Vec<i32>>) {
    result.push(current.clone());
    for i in start..nums.len() {
        current.push(nums[i]);
        backtrack(nums, i + 1, current, result);
        current.pop();  // Backtrack
    }
}
```

2. **Предварительное выделение результата**:
```rust
// ✅ Предварительное выделение
let mut result = Vec::with_capacity(1 << nums.len());
```

#### Go оптимизации:

1. **Использование backtracking**:
```go
// ✅ Переиспользование current слайса
func backtrack(nums []int, start int, current []int, result *[][]int) {
    *result = append(*result, append([]int{}, current...))
    for i := start; i < len(nums); i++ {
        current = append(current, nums[i])
        backtrack(nums, i+1, current, result)
        current = current[:len(current)-1]  // Backtrack
    }
}
```

2. **Предварительное выделение результата**:
```go
// ✅ Предварительное выделение
result := make([][]int, 0, 1<<len(nums))
```

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Backtracking | O(n) стек | O(n) стек |
| Результат | O(2^n * n) | O(2^n * n) |
| Производительность | Предсказуемая | Может быть паузы GC |

## Оптимизация производительности

### Общие техники

1. **Использование backtracking** для экономии памяти
2. **Предварительное выделение** результата
3. **Минимизация клонирования** путей

### Специфичные оптимизации для Subsets

#### 1. Оптимизация backtracking:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub fn subsets_optimized(nums: Vec<i32>) -> Vec<Vec<i32>> {
    let mut result = Vec::with_capacity(1 << nums.len());
    let mut current = Vec::new();
    backtrack(&nums, 0, &mut current, &mut result);
    result
}

fn backtrack(nums: &[i32], start: usize, current: &mut Vec<i32>, result: &mut Vec<Vec<i32>>) {
    result.push(current.clone());
    for i in start..nums.len() {
        current.push(nums[i]);
        backtrack(nums, i + 1, current, result);
        current.pop();
    }
}
```

**Go**:
```go
// ✅ Оптимизированная версия
func subsetsOptimized(nums []int) [][]int {
    result := make([][]int, 0, 1<<len(nums))
    current := make([]int, 0)
    backtrack(nums, 0, current, &result)
    return result
}

func backtrack(nums []int, start int, current []int, result *[][]int) {
    *result = append(*result, append([]int{}, current...))
    for i := start; i < len(nums); i++ {
        current = append(current, nums[i])
        backtrack(nums, i+1, current, result)
        current = current[:len(current)-1]
    }
}
```

### Оптимизация для Rust

1. **Минимизация клонирования**:
```rust
// ✅ Клонируем только при добавлении в результат
result.push(current.clone());
```

2. **Предварительное выделение**:
```rust
// ✅ Предварительное выделение
let mut result = Vec::with_capacity(1 << nums.len());
```

### Оптимизация для Go

1. **Переиспользование слайса**:
```go
// ✅ Backtrack с уменьшением размера
current = current[:len(current)-1]
```

2. **Предварительное выделение**:
```go
// ✅ Предварительное выделение
result := make([][]int, 0, 1<<len(nums))
```

## Профилирование

### Инструменты профилирования

См. раздел "Профилирование" в [Sliding Window](./sliding-window/README.md#профилирование) для общих инструментов.

### Как профилировать Subsets

#### Rust пример:

```rust
// benches/subsets_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_subsets(c: &mut Criterion) {
    let nums: Vec<i32> = (0..10).collect();
    
    c.bench_function("subsets_10", |b| {
        b.iter(|| subsets_optimized(black_box(nums.clone())))
    });
}

criterion_group!(benches, bench_subsets);
criterion_main!(benches);
```

#### Go пример:

```go
func BenchmarkSubsets(b *testing.B) {
    nums := make([]int, 10)
    for i := range nums {
        nums[i] = i
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        subsetsOptimized(nums)
    }
}
```

### Примеры профилирования

**Анализ производительности**:
- Subsets: O(2^n * n) по времени и памяти
- Экспоненциальная сложность для больших n
- Backtracking экономит память по сравнению с итеративным подходом

**Типичные узкие места**:
- Клонирование путей
- Операции с векторами/слайсами
- Рекурсивные вызовы

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые массивы
2. **Граничные случаи**: Пустой массив, один элемент
3. **Стресс-тесты**: Большие массивы (осторожно с экспоненциальной сложностью)

### Примеры тестов для Subsets

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subsets_basic() {
        let nums = vec![1, 2, 3];
        let result = subsets_optimized(nums);
        assert_eq!(result.len(), 8);  // 2^3 = 8
    }

    #[test]
    fn test_subsets_empty() {
        let nums = vec![];
        let result = subsets_optimized(nums);
        assert_eq!(result, vec![vec![]]);
    }
}
```

#### Go тесты:

```go
func TestSubsets(t *testing.T) {
    tests := []struct {
        name string
        nums []int
        want int
    }{
        {"basic", []int{1, 2, 3}, 8},  // 2^3 = 8
        {"empty", []int{}, 1},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := subsetsOptimized(tt.nums)
            if len(result) != tt.want {
                t.Errorf("subsetsOptimized() = %v, want %v", len(result), tt.want)
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

fn subsets_benchmark(c: &mut Criterion) {
    let sizes = vec![5, 10, 15];
    
    let mut group = c.benchmark_group("subsets");
    for size in sizes {
        let nums: Vec<i32> = (0..size).collect();
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            &nums,
            |b, nums| {
                b.iter(|| subsets_optimized(black_box(nums.clone())));
            },
        );
    }
    group.finish();
}
```

#### Go:
```go
func BenchmarkSubsetsSizes(b *testing.B) {
    sizes := []int{5, 10, 15}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            nums := make([]int, size)
            for i := range nums {
                nums[i] = i
            }
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                subsetsOptimized(nums)
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
- [Subsets](https://leetcode.com/problems/subsets/) - Все подмножества
- [Subsets II](https://leetcode.com/problems/subsets-ii/) - Подмножества с дубликатами

### Средние:
- [Combination Sum](https://leetcode.com/problems/combination-sum/) - Сумма комбинаций
- [Permutations](https://leetcode.com/problems/permutations/) - Перестановки
- [Letter Combinations of a Phone Number](https://leetcode.com/problems/letter-combinations-of-a-phone-number/) - Комбинации букв телефона

### Сложные:
- [Word Search II](https://leetcode.com/problems/word-search-ii/) - Поиск слов II
- [N-Queens](https://leetcode.com/problems/n-queens/) - N ферзей

## Примеры кода

См. файлы:
- [Rust примеры](./rust/examples.rs)
- [Go примеры](./go/examples.go)

