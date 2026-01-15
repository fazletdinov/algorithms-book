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

```go
// Генерация всех подмножеств с использованием backtracking
func subsets(nums []int) [][]int {
    result := [][]int{}
    current := []int{}  // Текущее подмножество, которое мы строим
    
    var backtrack func(int)
    backtrack = func(index int) {
        // Шаг 1: Базовый случай - если достигнут конец массива
        // Добавляем текущее подмножество в результат
        // Важно: создаем копию current, так как мы будем изменять его дальше
        if index == len(nums) {
            subset := make([]int, len(current))
            copy(subset, current)
            result = append(result, subset)
            return
        }
        
        // Шаг 2: Рекурсия - для каждого элемента у нас два выбора
        
        // Вариант 1: Включить элемент в подмножество
        // Добавляем текущий элемент в current
        current = append(current, nums[index])
        // Рекурсивно обрабатываем следующий элемент
        backtrack(index + 1)
        
        // Шаг 3: Backtracking - удаляем элемент из текущего подмножества
        // Это критически важно: после обработки всех вариантов с включенным элементом,
        // мы должны "откатиться" к состоянию до включения элемента
        current = current[:len(current)-1]  // Удаляем последний элемент (backtrack)
        
        // Вариант 2: Исключить элемент из подмножества
        // Не добавляем элемент и рекурсивно обрабатываем следующий
        backtrack(index + 1)
    }
    
    // Начинаем с индекса 0
    backtrack(0)
    return result
}

// Альтернативный подход: итеративная генерация
func subsetsIterative(nums []int) [][]int {
    // Начинаем с пустого подмножества
    result := [][]int{{}}
    
    // Для каждого элемента добавляем его ко всем существующим подмножествам
    for _, num := range nums {
        // Сохраняем текущий размер результата
        // Это важно, так как мы будем добавлять новые подмножества
        size := len(result)
        
        // Для каждого существующего подмножества создаем новое с текущим элементом
        for i := 0; i < size; i++ {
            // Создаем новое подмножество на основе существующего
            newSubset := make([]int, len(result[i]))
            copy(newSubset, result[i])
            // Добавляем текущий элемент
            newSubset = append(newSubset, num)
            // Добавляем в результат
            result = append(result, newSubset)
        }
    }
    
    return result
}
```

### Что такое Backtracking?

**Backtracking (возврат, откат)** — это техника решения задач, при которой мы строим решение пошагово, и если на каком-то шаге понимаем, что текущий путь не ведет к решению, мы "откатываемся" назад и пробуем другой путь.

**Ключевая идея backtracking:**
- Мы используем один и тот же массив для хранения текущего решения
- Когда делаем выбор (включаем элемент), добавляем его в массив
- После обработки всех вариантов с этим выбором, "откатываемся" — удаляем элемент
- Это позволяет переиспользовать память и избежать создания множества копий

**Пошаговый пример backtracking для [1, 2, 3]:**

```
Инициализация: current = [], index = 0

Шаг 1: Обрабатываем элемент 1 (index = 0)
  ├─ Включаем 1: current = [1]
  │   └─ Рекурсивный вызов для index = 1
  │       ├─ Включаем 2: current = [1, 2]
  │       │   └─ Рекурсивный вызов для index = 2
  │       │       ├─ Включаем 3: current = [1, 2, 3]
  │       │       │   └─ index = 3 (конец) → сохраняем [1, 2, 3]
  │       │       └─ BACKTRACK: удаляем 3 → current = [1, 2]
  │       │       └─ Исключаем 3: current = [1, 2]
  │       │           └─ index = 3 (конец) → сохраняем [1, 2]
  │       └─ BACKTRACK: удаляем 2 → current = [1]
  │       └─ Исключаем 2: current = [1]
  │           └─ Рекурсивный вызов для index = 2
  │               ├─ Включаем 3: current = [1, 3]
  │               │   └─ index = 3 (конец) → сохраняем [1, 3]
  │               └─ BACKTRACK: удаляем 3 → current = [1]
  │               └─ Исключаем 3: current = [1]
  │                   └─ index = 3 (конец) → сохраняем [1]
  └─ BACKTRACK: удаляем 1 → current = []
  └─ Исключаем 1: current = []
      └─ Рекурсивный вызов для index = 1
          ├─ Включаем 2: current = [2]
          │   └─ Рекурсивный вызов для index = 2
          │       ├─ Включаем 3: current = [2, 3]
          │       │   └─ index = 3 (конец) → сохраняем [2, 3]
          │       └─ BACKTRACK: удаляем 3 → current = [2]
          │       └─ Исключаем 3: current = [2]
          │           └─ index = 3 (конец) → сохраняем [2]
          └─ BACKTRACK: удаляем 2 → current = []
          └─ Исключаем 2: current = []
              └─ Рекурсивный вызов для index = 2
                  ├─ Включаем 3: current = [3]
                  │   └─ index = 3 (конец) → сохраняем [3]
                  └─ BACKTRACK: удаляем 3 → current = []
                  └─ Исключаем 3: current = []
                      └─ index = 3 (конец) → сохраняем []

Результат: [[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]
```

**Почему backtracking эффективен?**

1. **Экономия памяти**: Вместо создания 2^n копий массивов, мы используем один массив и изменяем его
2. **Естественная структура**: Соответствует дереву решений — каждый узел представляет состояние
3. **Простота реализации**: Легко понять и реализовать рекурсивно

**Ключевой момент:** После каждого рекурсивного вызова мы должны "откатиться" к предыдущему состоянию, удалив элемент, который мы добавили. Это гарантирует, что при возврате из рекурсии массив находится в том же состоянии, что и до вызова.

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

## Структуры данных: внутреннее устройство

### Используемые структуры данных в Subsets

В шаблоне Subsets используются следующие структуры данных:
- ****: Для хранения всех подмножеств
- ****: Для текущего подмножества (backtracking)

### > (Rust) / [][]T (Go)

#### Как хранится в памяти:

**Rust Vec&lt;Vec<i32&gt;>**:
```
Результат (все подмножества):
┌─────────────────────────────────────────┐
│ Vec&lt;Vec<i32&gt;>                           │
│ ┌─────────────┐                         │
│ │ ptr: *mut   │ Указатель на массив     │
│ │   Vec&lt;i32&gt;  │                         │
│ │ len: usize  │ Количество подмножеств  │
│ └─────────────┘                         │
└─────────────────────────────────────────┘
         │
         ▼
    [Vec&lt;i32&gt;][Vec&lt;i32&gt;][Vec&lt;i32&gt;]...
    ┌────┐  ┌──────┐  ┌──────┐
    │[]  │  │[1]   │  │[1,2] │
    └────┘  └──────┘  └──────┘
```

**Важные детали**:
- Количество подмножеств: 2^n
- Каждое подмножество - отдельный Vec
- Backtracking экономит память (переиспользование текущего подмножества)

#### Операции и их сложность:

| Операция | Сложность | Объяснение |
|----------|-----------|------------|
| Генерация всех подмножеств | O(2^n * n) | 2^n подмножеств, каждое размером до n |
| Backtracking | O(2^n) | Рекурсивные вызовы |
| Копирование подмножества | O(n) | При добавлении в результат |

**Почему Backtracking эффективен**:
- Переиспользование текущего подмножества
- Не создаем все подмножества сразу
- Экономия памяти

## Глубокое понимание: сложные концепции

### Escape Analysis (Go)

**Для Subsets**:
- Результирующие подмножества в куче
- Текущее подмножество может остаться на стеке (если небольшое)
- Результат escape при возврате

### Borrow Checker (Rust)

**Типичный паттерн**:
```rust
fn subsets(nums: &[i32]) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::new();
    let mut current = Vec::new();
    backtrack(nums, 0, &mut current, &mut result);
    result
}

fn backtrack(nums: &[i32], start: usize, 
             current: &mut Vec&lt;i32&gt;, 
             result: &mut Vec&lt;Vec<i32&gt;>) {
    result.push(current.clone());  // копирование
    // ...
}
```

### Garbage Collector (Go)

**Для Subsets**:
- Все подмножества в куче
- 2^n подмножеств - много аллокаций
- Минимизация копирований критична

### Ownership и Move Semantics (Rust)

**Концепция владения**:
- `Vec&lt;Vec<i32&gt;>` владеет всеми подмножествами
- При backtracking клонируем текущее подмножество
- RAII гарантирует освобождение

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Генерация подмножеств

В Rust для Subsets:
- **Backtracking**: Стек вызовов - O(n) для глубины рекурсии
- **Результат**: `Vec&lt;Vec<i32&gt;>` - O(2^n * n) в худшем случае
- **Текущий путь**: `Vec&lt;i32&gt;` - O(n) для каждого пути

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
// - result: Vec&lt;Vec<i32&gt;> - O(2^n * n) в худшем случае
// - current: Vec&lt;i32&gt; - O(n) для каждого пути
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
fn backtrack(nums: &[i32], start: usize, current: &mut Vec&lt;i32&gt;, result: &mut Vec&lt;Vec<i32&gt;>) {
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
pub fn subsets_optimized(nums: Vec&lt;i32&gt;) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::with_capacity(1 << nums.len());
    let mut current = Vec::new();
    backtrack(&nums, 0, &mut current, &mut result);
    result
}

fn backtrack(nums: &[i32], start: usize, current: &mut Vec&lt;i32&gt;, result: &mut Vec&lt;Vec<i32&gt;>) {
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

См. раздел "Профилирование" в [Sliding Window](./sliding-window.md#профилирование) для общих инструментов.

### Как профилировать Subsets

#### Rust пример:

```rust
// benches/subsets_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_subsets(c: &mut Criterion) {
    let nums: Vec&lt;i32&gt; = (0..10).collect();
    
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
        let nums: Vec&lt;i32&gt; = (0..size).collect();
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

### Rust

```rust
// Примеры использования шаблона Subsets на Rust

/// Пример 1: Генерация всех подмножеств (рекурсивный подход)
/// 
/// Задача: Вернуть все возможные подмножества массива
/// Временная сложность: O(2^n × n)
/// Пространственная сложность: O(2^n × n)
pub fn subsets(nums: Vec&lt;i32&gt;) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::new();
    let mut current = Vec::new();

    fn backtrack(
        nums: &[i32],
        start: usize,
        current: &mut Vec&lt;i32&gt;,
        result: &mut Vec&lt;Vec<i32&gt;>,
    ) {
        // Добавляем текущее подмножество
        result.push(current.clone());

        // Генерируем подмножества для оставшихся элементов
        for i in start..nums.len() {
            current.push(nums[i]);
            backtrack(nums, i + 1, current, result);
            current.pop(); // Backtrack
        }
    }

    backtrack(&nums, 0, &mut current, &mut result);
    result
}

/// Пример 2: Генерация всех подмножеств (итеративный подход)
/// 
/// Задача: Вернуть все возможные подмножества массива итеративно
/// Временная сложность: O(2^n × n)
/// Пространственная сложность: O(2^n × n)
pub fn subsets_iterative(nums: Vec&lt;i32&gt;) -> Vec&lt;Vec<i32&gt;> {
    let mut result: Vec&lt;Vec<i32&gt;> = vec![vec![]];

    for &num in &nums {
        let mut new_subsets = Vec::new();
        for subset in &result {
            let mut new_subset = subset.clone();
            new_subset.push(num);
            new_subsets.push(new_subset);
        }
        result.extend(new_subsets);
    }

    result
}

/// Пример 3: Подмножества с дубликатами
/// 
/// Задача: Вернуть все подмножества массива с дубликатами
/// Временная сложность: O(2^n × n)
/// Пространственная сложность: O(2^n × n)
pub fn subsets_with_dup(mut nums: Vec&lt;i32&gt;) -> Vec&lt;Vec<i32&gt;> {
    nums.sort();
    let mut result = Vec::new();
    let mut current = Vec::new();

    fn backtrack(
        nums: &[i32],
        start: usize,
        current: &mut Vec&lt;i32&gt;,
        result: &mut Vec&lt;Vec<i32&gt;>,
    ) {
        result.push(current.clone());

        for i in start..nums.len() {
            // Пропускаем дубликаты
            if i > start && nums[i] == nums[i - 1] {
                continue;
            }
            current.push(nums[i]);
            backtrack(nums, i + 1, current, result);
            current.pop();
        }
    }

    backtrack(&nums, 0, &mut current, &mut result);
    result
}

/// Пример 4: Комбинации заданной длины
/// 
/// Задача: Вернуть все комбинации длины k из массива
/// Временная сложность: O(C(n,k) × k)
/// Пространственная сложность: O(C(n,k) × k)
pub fn combine(n: i32, k: i32) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::new();
    let mut current = Vec::new();

    fn backtrack(
        start: i32,
        n: i32,
        k: i32,
        current: &mut Vec&lt;i32&gt;,
        result: &mut Vec&lt;Vec<i32&gt;>,
    ) {
        if current.len() == k as usize {
            result.push(current.clone());
            return;
        }

        for i in start..=n {
            current.push(i);
            backtrack(i + 1, n, k, current, result);
            current.pop();
        }
    }

    backtrack(1, n, k, &mut current, &mut result);
    result
}

/// Пример 5: Комбинации с суммой
/// 
/// Задача: Найти все уникальные комбинации, сумма которых равна target
/// Временная сложность: O(2^n)
/// Пространственная сложность: O(target)
pub fn combination_sum(candidates: Vec&lt;i32&gt;, target: i32) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::new();
    let mut current = Vec::new();
    let mut candidates = candidates;
    candidates.sort();

    fn backtrack(
        candidates: &[i32],
        target: i32,
        start: usize,
        current: &mut Vec&lt;i32&gt;,
        result: &mut Vec&lt;Vec<i32&gt;>,
    ) {
        if target == 0 {
            result.push(current.clone());
            return;
        }

        if target < 0 {
            return;
        }

        for i in start..candidates.len() {
            current.push(candidates[i]);
            backtrack(candidates, target - candidates[i], i, current, result);
            current.pop();
        }
    }

    backtrack(&candidates, target, 0, &mut current, &mut result);
    result
}

/// Пример 6: Перестановки
/// 
/// Задача: Вернуть все возможные перестановки массива
/// Временная сложность: O(n! × n)
/// Пространственная сложность: O(n! × n)
pub fn permute(nums: Vec&lt;i32&gt;) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::new();
    let mut current = Vec::new();
    let mut used = vec![false; nums.len()];

    fn backtrack(
        nums: &[i32],
        used: &mut [bool],
        current: &mut Vec&lt;i32&gt;,
        result: &mut Vec&lt;Vec<i32&gt;>,
    ) {
        if current.len() == nums.len() {
            result.push(current.clone());
            return;
        }

        for i in 0..nums.len() {
            if !used[i] {
                used[i] = true;
                current.push(nums[i]);
                backtrack(nums, used, current, result);
                current.pop();
                used[i] = false;
            }
        }
    }

    backtrack(&nums, &mut used, &mut current, &mut result);
    result
}
```

### Go

```go
package main

import (
	"fmt"
	"sort"
)

// Пример 1: Генерация всех подмножеств (рекурсивный подход)
//
// Задача: Вернуть все возможные подмножества массива
// Временная сложность: O(2^n × n)
// Пространственная сложность: O(2^n × n)
func subsets(nums []int) [][]int {
	var result [][]int
	var current []int

	var backtrack func(int)
	backtrack = func(start int) {
		// Добавляем текущее подмножество
		temp := make([]int, len(current))
		copy(temp, current)
		result = append(result, temp)

		// Генерируем подмножества для оставшихся элементов
		for i := start; i < len(nums); i++ {
			current = append(current, nums[i])
			backtrack(i + 1)
			current = current[:len(current)-1] // Backtrack
		}
	}

	backtrack(0)
	return result
}

// Пример 2: Генерация всех подмножеств (итеративный подход)
//
// Задача: Вернуть все возможные подмножества массива итеративно
// Временная сложность: O(2^n × n)
// Пространственная сложность: O(2^n × n)
func subsetsIterative(nums []int) [][]int {
	result := [][]int{{}}

	for _, num := range nums {
		var newSubsets [][]int
		for _, subset := range result {
			newSubset := make([]int, len(subset))
			copy(newSubset, subset)
			newSubset = append(newSubset, num)
			newSubsets = append(newSubsets, newSubset)
		}
		result = append(result, newSubsets...)
	}

	return result
}

// Пример 3: Подмножества с дубликатами
//
// Задача: Вернуть все подмножества массива с дубликатами
// Временная сложность: O(2^n × n)
// Пространственная сложность: O(2^n × n)
func subsetsWithDup(nums []int) [][]int {
	sort.Ints(nums)
	var result [][]int
	var current []int

	var backtrack func(int)
	backtrack = func(start int) {
		temp := make([]int, len(current))
		copy(temp, current)
		result = append(result, temp)

		for i := start; i < len(nums); i++ {
			// Пропускаем дубликаты
			if i > start && nums[i] == nums[i-1] {
				continue
			}
			current = append(current, nums[i])
			backtrack(i + 1)
			current = current[:len(current)-1]
		}
	}

	backtrack(0)
	return result
}

// Пример 4: Комбинации заданной длины
//
// Задача: Вернуть все комбинации длины k из массива
// Временная сложность: O(C(n,k) × k)
// Пространственная сложность: O(C(n,k) × k)
func combine(n, k int) [][]int {
	var result [][]int
	var current []int

	var backtrack func(int)
	backtrack = func(start int) {
		if len(current) == k {
			temp := make([]int, len(current))
			copy(temp, current)
			result = append(result, temp)
			return
		}

		for i := start; i <= n; i++ {
			current = append(current, i)
			backtrack(i + 1)
			current = current[:len(current)-1]
		}
	}

	backtrack(1)
	return result
}

// Пример 5: Комбинации с суммой
//
// Задача: Найти все уникальные комбинации, сумма которых равна target
// Временная сложность: O(2^n)
// Пространственная сложность: O(target)
func combinationSum(candidates []int, target int) [][]int {
	var result [][]int
	var current []int
	sort.Ints(candidates)

	var backtrack func(int, int)
	backtrack = func(start, remaining int) {
		if remaining == 0 {
			temp := make([]int, len(current))
			copy(temp, current)
			result = append(result, temp)
			return
		}

		if remaining < 0 {
			return
		}

		for i := start; i < len(candidates); i++ {
			current = append(current, candidates[i])
			backtrack(i, remaining-candidates[i])
			current = current[:len(current)-1]
		}
	}

	backtrack(0, target)
	return result
}

// Пример 6: Перестановки
//
// Задача: Вернуть все возможные перестановки массива
// Временная сложность: O(n! × n)
// Пространственная сложность: O(n! × n)
func permute(nums []int) [][]int {
	var result [][]int
	var current []int
	used := make([]bool, len(nums))

	var backtrack func()
	backtrack = func() {
		if len(current) == len(nums) {
			temp := make([]int, len(current))
			copy(temp, current)
			result = append(result, temp)
			return
		}

		for i := 0; i < len(nums); i++ {
			if !used[i] {
				used[i] = true
				current = append(current, nums[i])
				backtrack()
				current = current[:len(current)-1]
				used[i] = false
			}
		}
	}

	backtrack()
	return result
}
```

## Связанные шаблоны

- **[Tree DFS](./tree-dfs.md)** - Использует похожий рекурсивный подход
- **[Topological Sort](./topological-sort.md)** - Работа с графами и зависимостями
- **[Modified Binary Search](./modified-binary-search.md)** - Для задач поиска в отсортированных данных

## Следующий шаг

После изучения Subsets рекомендуется перейти к **[Topological Sort](./topological-sort.md)** для изучения работы с графами и зависимостями.

## Дополнительные ресурсы

- [Subsets - LeetCode](https://leetcode.com/problems/subsets/) - Классическая задача на генерацию подмножеств
- [Backtracking Algorithm - GeeksforGeeks](https://www.geeksforgeeks.org/backtracking-algorithms/) - Подробное объяснение backtracking
- [Power Set - Wikipedia](https://en.wikipedia.org/wiki/Power_set) - Математическая теория подмножеств

