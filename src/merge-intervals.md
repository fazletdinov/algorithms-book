# Merge Intervals (Слияние интервалов)

## Описание шаблона

Шаблон **Merge Intervals** используется для работы с перекрывающимися интервалами. Он эффективно объединяет пересекающиеся интервалы и обрабатывает задачи, связанные с временными интервалами, диапазонами или сегментами данных.

### Исторический контекст

Задачи на интервалы часто возникают в реальных приложениях: планирование встреч, управление ресурсами, обработка временных рядов, анализ покрытия. Алгоритм слияния интервалов является фундаментальным для таких задач.

### Основная идея

Ключевое наблюдение: если интервалы отсортированы по начальной точке, то для определения перекрытия достаточно сравнить начало текущего интервала с концом последнего объединенного интервала. Это позволяет обработать все интервалы за один проход после сортировки.

## Когда применять

Используйте этот шаблон, когда:
- Работаете с интервалами, которые могут перекрываться
- Нужно объединить перекрывающиеся интервалы
- Требуется найти пересечения интервалов
- Задача связана с временными диапазонами или сегментами
- Нужно вставить новый интервал в отсортированный список интервалов

## Алгоритм/Подход

### Базовый алгоритм слияния:

1. **Сортировка**: Отсортируйте интервалы по начальной точке
2. **Инициализация**: Создайте результирующий список с первым интервалом
3. **Итерация**: Для каждого следующего интервала:
   - Если текущий интервал перекрывается с последним в результате, объедините их
   - Иначе добавьте текущий интервал в результат
4. **Возврат**: Верните объединенный список интервалов

### Проверка перекрытия:

Два интервала `[a, b]` и `[c, d]` перекрываются, если:
- `a <= d` и `c <= b`

При объединении: `[min(a, c), max(b, d)]`

## Визуализация

### Слияние перекрывающихся интервалов:

```
Исходные интервалы: [[1,3], [2,6], [8,10], [15,18]]

Шаг 1: Сортировка (уже отсортированы)
        [1,3]  [2,6]  [8,10]  [15,18]

Шаг 2: Результат = [[1,3]]
        [1,3]  [2,6]  [8,10]  [15,18]
        ^
        Результат: [[1,3]]

Шаг 3: [2,6] перекрывается с [1,3] → объединяем
        [1,3]  [2,6]  [8,10]  [15,18]
        [----] [----]
        Результат: [[1,6]]

Шаг 4: [8,10] не перекрывается → добавляем
        [1,6]  [8,10]  [15,18]
               ^
        Результат: [[1,6], [8,10]]

Шаг 5: [15,18] не перекрывается → добавляем
        [1,6]  [8,10]  [15,18]
                      ^
        Результат: [[1,6], [8,10], [15,18]]
```

## Математическое обоснование

### Почему алгоритм работает?

**Инвариант**: После обработки i интервалов, результирующий список содержит все объединенные интервалы из первых i интервалов, отсортированные по начальной точке и не перекрывающиеся.

**Доказательство корректности**:
1. **Базовый случай**: После обработки первого интервала, результат корректен (один интервал)
2. **Индуктивный шаг**: Предположим, результат корректен после i интервалов
   - Рассмотрим (i+1)-й интервал
   - Если он перекрывается с последним в результате, объединение корректно (берем min начал, max концов)
   - Если не перекрывается, добавление также корректно
   - Результат остается отсортированным и не перекрывающимся

**Почему достаточно проверять только последний интервал?**

После сортировки, если интервал [a,b] не перекрывается с [c,d] (где c ≥ b), то он не может перекрываться ни с каким более ранним интервалом, так как все они заканчиваются не позже d, а a ≥ c ≥ b.

## Временная и пространственная сложность

### Детальный анализ:

**Слияние интервалов**:
- **Временная сложность**: O(n log n)
  - Сортировка: O(n log n) - доминирующая операция
  - Один проход по интервалам: O(n)
  - Итого: O(n log n)
- **Пространственная сложность**: O(n)
  - Результирующий список: O(n) в худшем случае (нет перекрытий)
  - Стек вызовов сортировки: O(log n)

**Вставка интервала**:
- **Временная сложность**: O(n)
  - Поиск позиции вставки: O(n) (можно оптимизировать до O(log n) бинарным поиском)
  - Объединение: O(n)
- **Пространственная сложность**: O(n)

### Сравнение с наивным подходом:

| Подход | Время | Память |
|--------|-------|--------|
| Наивный (проверка всех пар) | O(n²) | O(n) |
| Сортировка + один проход | O(n log n) | O(n) |

**Выигрыш**: O(n²) → O(n log n) - значительное улучшение для больших n

## Примеры задач на LeetCode

### Легкие:
- [Merge Intervals](https://leetcode.com/problems/merge-intervals/) - Слияние интервалов
- [Insert Interval](https://leetcode.com/problems/insert-interval/) - Вставка интервала

### Средние:
- [Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/) - Неперекрывающиеся интервалы
- [Meeting Rooms II](https://leetcode.com/problems/meeting-rooms-ii/) - Комнаты для встреч II
- [Interval List Intersections](https://leetcode.com/problems/interval-list-intersections/) - Пересечения интервалов

### Сложные:
- [Employee Free Time](https://leetcode.com/problems/employee-free-time/) - Свободное время сотрудников
- [Minimum Number of Arrows to Burst Balloons](https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/) - Минимальное количество стрел

## Типичные ошибки и подводные камни

### 1. Неправильная проверка перекрытия

❌ **Неправильно**:

**Go**:
```go
if current[0] <= last[1] {  // Не учитывает случай, когда current полностью справа
    merge()
}
```

**Rust**:
```rust
if current[0] <= last[1] {  // Не учитывает случай, когда current полностью справа
    merge();
}
```

✅ **Правильно**:

**Go**:
```go
if current[0] <= last[1] {  // Перекрытие: начало текущего <= конец последнего
    if current[1] > last[1] {
        last[1] = current[1]  // Берем максимум
    }
}
```

**Rust**:
```rust
if current[0] <= last[1] {  // Перекрытие: начало текущего <= конец последнего
    last[1] = last[1].max(current[1]);  // Берем максимум
}
```

### 2. Забывание сортировки

❌ **Неправильно**:

**Go**:
```go
result := [][]int{intervals[0]}
for _, interval := range intervals[1:] {  // Не отсортированы!
    // ...
}
```

**Rust**:
```rust
let mut result = vec![intervals[0].clone()];
for interval in intervals.iter().skip(1) {  // Не отсортированы!
    // ...
}
```

✅ **Правильно**:

**Go**:
```go
sort.Slice(intervals, func(i, j int) bool {
    return intervals[i][0] < intervals[j][0]
})
result := [][]int{intervals[0]}
for _, interval := range intervals[1:] {
    // ...
}
```

**Rust**:
```rust
intervals.sort_by_key(|x| x[0]);
let mut result = vec![intervals[0].clone()];
for interval in intervals.iter().skip(1) {
    // ...
}
```

### 3. Неправильное объединение интервалов

❌ **Неправильно**:

**Go**:
```go
last[1] = current[1]  // Может уменьшить интервал!
```

**Rust**:
```rust
last[1] = current[1];  // Может уменьшить интервал!
```

✅ **Правильно**:

**Go**:
```go
if current[1] > last[1] {
    last[1] = current[1]  // Берем максимум
}
```

**Rust**:
```rust
last[1] = last[1].max(current[1]);  // Берем максимум
```

### 4. Обработка пустого списка

❌ **Неправильно**:

**Go**:
```go
result := [][]int{intervals[0]}  // Ошибка если intervals пуст
```

**Rust**:
```rust
let mut result = vec![intervals[0].clone()];  // Ошибка если intervals пуст
```

✅ **Правильно**:

**Go**:
```go
if len(intervals) == 0 {
    return [][]int{}
}
result := [][]int{intervals[0]}
```

**Rust**:
```rust
if intervals.is_empty() {
    return Vec::new();
}
let mut result = vec![intervals[0].clone()];
```

## Практические советы

1. **Всегда сортируйте по начальной точке** перед обработкой
2. **Используйте правильную проверку перекрытия**: `current[0] <= last[1]`
3. **При объединении берите максимум концов**: `max(last[1], current[1])`
4. **Обрабатывайте граничные случаи**: пустой список, один интервал, все перекрываются

## Вариации

### Поиск пересечений интервалов:

Используйте два указателя на разных списках интервалов:

**Go**:
```go
i, j := 0, 0
for i < len(A) && j < len(B) {
    start := A[i][0]
    if B[j][0] > start {
        start = B[j][0]
    }
    end := A[i][1]
    if B[j][1] < end {
        end = B[j][1]
    }
    if start <= end {
        result = append(result, []int{start, end})
    }
    if A[i][1] < B[j][1] {
        i++
    } else {
        j++
    }
}
```

**Rust**:
```rust
let mut i = 0;
let mut j = 0;
while i < A.len() && j < B.len() {
    let start = A[i][0].max(B[j][0]);
    let end = A[i][1].min(B[j][1]);
    if start <= end {
        result.push(vec![start, end]);
    }
    if A[i][1] < B[j][1] {
        i += 1;
    } else {
        j += 1;
    }
}
```

## Структуры данных: внутреннее устройство

### Используемые структуры данных в Merge Intervals

В шаблоне Merge Intervals используются следующие структуры данных:
- ****: Для хранения интервалов
- ****: Для хранения результата
- **Структуры интервалов**: Tuple/Struct для представления интервала [start, end]

###  (Rust) / Slice (Go)

#### Как хранится в памяти:

**Rust Vec&lt;Vec<i32&gt;>** (массив интервалов):
```
┌─────────────────────────────────────────┐
│ Vec&lt;Vec<i32&gt;>                           │
│ ┌─────────────┐                         │
│ │ ptr: *mut   │ Указатель на массив     │
│ │   Vec&lt;i32&gt;  │                         │
│ │ len: usize  │ Количество интервалов  │
│ │ cap: usize  │ Емкость                 │
│ └─────────────┘                         │
└─────────────────────────────────────────┘
         │
         ▼
    [Vec&lt;i32&gt;][Vec&lt;i32&gt;][Vec&lt;i32&gt;]...
    ┌──────┐  ┌──────┐  ┌──────┐
    │[1,3] │  │[2,6] │  │[8,10]│
    └──────┘  └──────┘  └──────┘
```

**Важные детали**:
- Каждый интервал - это отдельный Vec&lt;i32&gt; (или можно использовать tuple/struct)
- Интервалы хранятся в непрерывной памяти (массив указателей на Vec)
- Сортировка интервалов - O(n log n), но затем линейный проход

**Go [][]int** (массив интервалов):
```
┌─────────────────────────────────────────┐
│ [][]int                                  │
│ ┌─────────────┐                         │
│ │ ptr: *[]int │ Указатель на массив     │
│ │ len: int    │ Количество интервалов   │
│ │ cap: int    │ Емкость                 │
│ └─────────────┘                         │
└─────────────────────────────────────────┘
         │
         ▼
    [][]int
    ┌──────┐  ┌──────┐  ┌──────┐
    │[1,3] │  │[2,6] │  │[8,10]│
    └──────┘  └──────┘  └──────┘
```

#### Операции и их сложность:

| Операция | Сложность | Объяснение |
|----------|-----------|------------|
| Сортировка интервалов | O(n log n) | Нужна для правильного слияния |
| Проход по интервалам | O(n) | Линейный проход после сортировки |
| Сравнение интервалов | O(1) | Сравнение start и end |
| Слияние интервалов | O(1) | Просто обновление end |

#### Когда использовать:

**Используйте Vec/Slice когда**:
- Нужна сортировка интервалов
- Нужен последовательный доступ
- Интервалы могут перекрываться

**Альтернативы**:
- Interval Tree: для частых запросов пересечения (O(log n))
- Для Merge Intervals Vec/Slice оптимальны

### Структуры интервалов

#### Rust: Tuple vs Struct

**Tuple**:
```rust
type Interval = (i32, i32);  // (start, end)
let interval = (1, 3);
```

**Struct** (более читаемо):
```rust
#[derive(Debug, Clone, PartialEq, Eq)]
struct Interval {
    start: i32,
    end: i32,
}
```

**Память**:
- Tuple: 8 байт (2 * i32)
- Struct: 8 байт (2 * i32)
- Нет разницы в памяти, struct более читаем

#### Go: Slice vs Struct

**Slice**:
```go
interval := []int{1, 3}  // [start, end]
```

**Struct** (более читаемо):
```go
type Interval struct {
    Start int
    End   int
}
```

**Память**:
- Slice: 24 байта (3 поля: ptr, len, cap) + данные
- Struct: 16 байт (2 * int)
- Struct эффективнее для представления интервала

## Глубокое понимание: сложные концепции

### Escape Analysis (Go)

#### Что это такое:

**Escape Analysis** определяет, должны ли интервалы быть в куче.

**Для Merge Intervals**:
- Результирующие интервалы могут escape, если возвращаются
- Временные структуры могут остаться на стеке

#### Как проверить:

```bash
go build -gcflags=-m main.go
```

**Пример**:
```go
func merge(intervals [][]int) [][]int {
    result := make([][]int, 0)  // может escape
    // ...
    return result  // escape в кучу
}
```

#### Оптимизация:

**Предварительное выделение**:
```go
// ✅ Хорошо: предварительное выделение
result := make([][]int, 0, len(intervals))
```

### Borrow Checker (Rust)

#### Что это такое:

**Borrow Checker** проверяет заимствования для безопасной работы.

**Для Merge Intervals**:
- Обычно работаем с `&[Vec&lt;i32&gt;]` для входных данных
- Создаем новый `Vec&lt;Vec<i32&gt;>` для результата
- Проблемы редко возникают

#### Примеры:

**Типичный паттерн**:
```rust
fn merge(intervals: &[Vec&lt;i32&gt;]) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::new();
    // intervals - immutable borrow
    // result - новое владение
    result
}
```

### Garbage Collector (Go)

#### Как работает GC:

**Для Merge Intervals**:
- Интервалы в куче - управляются GC
- Результирующие интервалы также в куче
- Минимизация аллокаций критична

#### Оптимизация:

**Переиспользование слайсов**:
```go
// ✅ Избегаем создания новых слайсов
func merge(intervals [][]int) [][]int {
    result := make([][]int, 0, len(intervals))
    // переиспользуем capacity
    return result
}
```

### Ownership и Move Semantics (Rust)

#### Концепция владения:

**Для Merge Intervals**:
- Входные данные: `&[Vec&lt;i32&gt;]` (заимствование)
- Результат: `Vec&lt;Vec<i32&gt;>` (новое владение)
- Сортировка может потребовать владения (если изменяем исходный массив)

**Пример**:
```rust
fn merge(mut intervals: Vec&lt;Vec<i32&gt;>) -> Vec&lt;Vec<i32&gt;> {
    intervals.sort_by_key(|v| v[0]);  // берем владение для сортировки
    // ...
    result
}
```

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Владение и аллокации

В Rust для Merge Intervals:
- **Сортировка**: Может аллоцировать временную память (зависит от алгоритма)
- **Результат**: `Vec&lt;Interval&gt;` - аллоцируется в куче
- **Входные данные**: Обычно `&[Interval]` - ссылка, не аллоцирует

#### Go: Сборщик мусора

В Go:
- **Сортировка**: Может аллоцировать временную память
- **Результат**: `[][]int` - слайс слайсов в куче
- **Входные данные**: `[][]int` - уже в куче

### Анализ аллокаций для Merge Intervals

#### Базовое слияние:

**Rust**:
```rust
// Аллокации:
// - Сортировка: O(n) дополнительной памяти (для стабильной сортировки)
// - result: Vec&lt;Interval&gt; - O(n) в худшем случае
// Итого: O(n) памяти в куче
```

**Go**:
```go
// Аллокации:
// - Сортировка: O(log n) для стека рекурсии
// - result: [][]int - O(n) в куче
// Итого: O(n) памяти в куче
```

#### Оптимизация: In-place слияние:

**Rust**:
```rust
// ✅ In-place: модифицируем входной массив
intervals.sort_by_key(|x| x.start);
let mut result = Vec::with_capacity(intervals.len());
```

**Go**:
```go
// ✅ In-place: модифицируем входной слайс
sort.Slice(intervals, func(i, j int) bool {
    return intervals[i][0] < intervals[j][0]
})
result := make([][]int, 0, len(intervals))
```

### Оптимизация памяти

#### Rust оптимизации:

1. **Предварительное выделение результата**:
```rust
// ✅ Хорошо: предварительное выделение
let mut result = Vec::with_capacity(intervals.len());
```

2. **Избежание клонирования**:
```rust
// ✅ Используем ссылки на интервалы
fn merge_intervals(intervals: &mut [Interval]) -> Vec&lt;Interval&gt; {
    // Модифицируем на месте
}
```

3. **Использование `sort_unstable`**:
```rust
// ✅ Нестабильная сортировка быстрее и использует меньше памяти
intervals.sort_unstable_by_key(|x| x.start);
```

#### Go оптимизации:

1. **Предварительное выделение**:
```go
// ✅ Предварительное выделение
result := make([][]int, 0, len(intervals))
```

2. **Избежание создания новых слайсов**:
```go
// ✅ Модифицируем последний элемент вместо создания нового
result[len(result)-1][1] = max(result[len(result)-1][1], current[1])
```

3. **Переиспользование слайсов**:
```go
// Очистка и переиспользование
result = result[:0]
```

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Сортировка | Контролируемая память | GC управляет |
| Результат | Vec в куче | Слайсы в куче |
| In-place | Возможно с `&mut` | Возможно с указателями |
| Производительность | Предсказуемая | Может быть паузы GC |

## Оптимизация производительности

### Общие техники

1. **Оптимизация сортировки**:
   - Используйте нестабильную сортировку если порядок не важен
   - Предварительно выделяйте память

2. **Минимизация аллокаций**:
   - Предварительно выделяйте результат
   - Модифицируйте на месте когда возможно

### Специфичные оптимизации для Merge Intervals

#### 1. Оптимизация слияния:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub fn merge_intervals_optimized(mut intervals: Vec&lt;Interval&gt;) -> Vec&lt;Interval&gt; {
    if intervals.is_empty() {
        return Vec::new();
    }
    
    intervals.sort_unstable_by_key(|x| x.start);
    let mut result = Vec::with_capacity(intervals.len());
    result.push(intervals[0]);
    
    for current in intervals.into_iter().skip(1) {
        let last = result.last_mut().unwrap();
        if current.start <= last.end {
            last.end = last.end.max(current.end);
        } else {
            result.push(current);
        }
    }
    
    result
}
```

**Go**:
```go
// ✅ Оптимизированная версия
func mergeIntervalsOptimized(intervals [][]int) [][]int {
    if len(intervals) == 0 {
        return [][]int{}
    }
    
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i][0] < intervals[j][0]
    })
    
    result := make([][]int, 0, len(intervals))
    result = append(result, intervals[0])
    
    for i := 1; i < len(intervals); i++ {
        last := result[len(result)-1]
        if intervals[i][0] <= last[1] {
            if intervals[i][1] > last[1] {
                last[1] = intervals[i][1]
            }
        } else {
            result = append(result, intervals[i])
        }
    }
    
    return result
}
```

### Оптимизация для Rust

1. **Использование `sort_unstable`**:
```rust
// ✅ Быстрее и использует меньше памяти
intervals.sort_unstable_by_key(|x| x.start);
```

2. **Избежание лишних аллокаций**:
```rust
// ✅ Предварительное выделение
let mut result = Vec::with_capacity(intervals.len());
```

### Оптимизация для Go

1. **Предварительное выделение**:
```go
// ✅ Предварительное выделение
result := make([][]int, 0, len(intervals))
```

2. **Модификация на месте**:
```go
// ✅ Модифицируем последний элемент
last := result[len(result)-1]
last[1] = max(last[1], current[1])
```

## Профилирование

### Инструменты профилирования

См. раздел "Профилирование" в [Sliding Window](./sliding-window.md#профилирование) для общих инструментов.

### Как профилировать Merge Intervals

#### Rust пример:

```rust
// benches/merge_intervals_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_merge_intervals(c: &mut Criterion) {
    let intervals = create_test_intervals(1000);
    
    c.bench_function("merge_1000", |b| {
        b.iter(|| merge_intervals_optimized(black_box(intervals.clone())))
    });
}

criterion_group!(benches, bench_merge_intervals);
criterion_main!(benches);
```

#### Go пример:

```go
func BenchmarkMergeIntervals(b *testing.B) {
    intervals := createTestIntervals(1000)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        mergeIntervalsOptimized(intervals)
    }
}
```

### Примеры профилирования

**Анализ производительности**:
- Сортировка: O(n log n) - доминирующая операция
- Слияние: O(n) - один проход
- Память: O(n) для результата

**Типичные узкие места**:
- Сортировка (особенно для больших массивов)
- Аллокации результата
- Проверки перекрытия

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые случаи слияния
2. **Граничные случаи**: Пустой список, один интервал, все перекрываются
3. **Стресс-тесты**: Большие списки интервалов

### Примеры тестов для Merge Intervals

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_basic() {
        let intervals = vec![
            Interval::new(1, 3),
            Interval::new(2, 6),
            Interval::new(8, 10),
        ];
        let result = merge_intervals_optimized(intervals);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_merge_empty() {
        let intervals = vec![];
        let result = merge_intervals_optimized(intervals);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_merge_all_overlap() {
        let intervals = vec![
            Interval::new(1, 4),
            Interval::new(2, 5),
            Interval::new(3, 6),
        ];
        let result = merge_intervals_optimized(intervals);
        assert_eq!(result.len(), 1);
    }
}
```

#### Go тесты:

```go
func TestMergeIntervals(t *testing.T) {
    tests := []struct {
        name      string
        intervals [][]int
        want      int
    }{
        {"basic", [][]int{{1, 3}, {2, 6}, {8, 10}}, 2},
        {"empty", [][]int{}, 0},
        {"all_overlap", [][]int{{1, 4}, {2, 5}, {3, 6}}, 1},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := mergeIntervalsOptimized(tt.intervals)
            if len(result) != tt.want {
                t.Errorf("mergeIntervalsOptimized() = %v, want %v", len(result), tt.want)
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

fn merge_intervals_benchmark(c: &mut Criterion) {
    let sizes = vec![100, 1000, 10000, 100000];
    
    let mut group = c.benchmark_group("merge_intervals");
    for size in sizes {
        let intervals = create_test_intervals(size);
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            &intervals,
            |b, intervals| {
                b.iter(|| merge_intervals_optimized(black_box(intervals.clone())));
            },
        );
    }
    group.finish();
}
```

#### Go:
```go
func BenchmarkMergeIntervalsSizes(b *testing.B) {
    sizes := []int{100, 1000, 10000, 100000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            intervals := createTestIntervals(size)
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                mergeIntervalsOptimized(intervals)
            }
        })
    }
}
```

## Примеры кода

### Rust

```rust
// Примеры использования шаблона Merge Intervals на Rust

/// Пример 1: Слияние перекрывающихся интервалов
/// 
/// Задача: Объединить все перекрывающиеся интервалы
/// Временная сложность: O(n log n)
/// Пространственная сложность: O(n)
pub fn merge_intervals(mut intervals: Vec&lt;Vec<i32&gt;>) -> Vec&lt;Vec<i32&gt;> {
    if intervals.is_empty() {
        return vec![];
    }

    // Сортируем интервалы по начальной точке
    intervals.sort_by_key(|interval| interval[0]);

    let mut merged = vec![intervals[0].clone()];

    for current in intervals.into_iter().skip(1) {
        let last = merged.last_mut().unwrap();

        // Если текущий интервал перекрывается с последним, объединяем
        if current[0] <= last[1] {
            last[1] = last[1].max(current[1]);
        } else {
            // Иначе добавляем новый интервал
            merged.push(current);
        }
    }

    merged
}

/// Пример 2: Вставка нового интервала
/// 
/// Задача: Вставить новый интервал в отсортированный список неперекрывающихся интервалов
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn insert_interval(mut intervals: Vec&lt;Vec<i32&gt;>, new_interval: Vec&lt;i32&gt;) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::new();
    let mut i = 0;
    let n = intervals.len();

    // Добавляем все интервалы, которые заканчиваются до начала нового интервала
    while i < n && intervals[i][1] < new_interval[0] {
        result.push(intervals[i].clone());
        i += 1;
    }

    // Объединяем все перекрывающиеся интервалы
    let mut merged_interval = new_interval.clone();
    while i < n && intervals[i][0] <= merged_interval[1] {
        merged_interval[0] = merged_interval[0].min(intervals[i][0]);
        merged_interval[1] = merged_interval[1].max(intervals[i][1]);
        i += 1;
    }
    result.push(merged_interval);

    // Добавляем оставшиеся интервалы
    while i < n {
        result.push(intervals[i].clone());
        i += 1;
    }

    result
}

/// Пример 3: Поиск неперекрывающихся интервалов
/// 
/// Задача: Найти минимальное количество интервалов для удаления,
/// чтобы сделать остальные неперекрывающимися
/// Временная сложность: O(n log n)
/// Пространственная сложность: O(1)
pub fn erase_overlap_intervals(mut intervals: Vec&lt;Vec<i32&gt;>) -> i32 {
    if intervals.is_empty() {
        return 0;
    }

    // Сортируем по конечной точке
    intervals.sort_by_key(|interval| interval[1]);

    let mut count = 0;
    let mut end = intervals[0][1];

    for i in 1..intervals.len() {
        // Если интервал перекрывается с предыдущим, удаляем его
        if intervals[i][0] < end {
            count += 1;
        } else {
            end = intervals[i][1];
        }
    }

    count
}

/// Пример 4: Пересечения двух списков интервалов
/// 
/// Задача: Найти пересечения интервалов из двух списков
/// Временная сложность: O(n + m)
/// Пространственная сложность: O(k), где k - количество пересечений
pub fn interval_intersection(
    first_list: Vec&lt;Vec<i32&gt;>,
    second_list: Vec&lt;Vec<i32&gt;>,
) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::new();
    let mut i = 0;
    let mut j = 0;

    while i < first_list.len() && j < second_list.len() {
        let first = &first_list[i];
        let second = &second_list[j];

        // Находим пересечение
        let start = first[0].max(second[0]);
        let end = first[1].min(second[1]);

        if start <= end {
            result.push(vec![start, end]);
        }

        // Перемещаем указатель с меньшей конечной точкой
        if first[1] < second[1] {
            i += 1;
        } else {
            j += 1;
        }
    }

    result
}

/// Пример 5: Комнаты для встреч II (Meeting Rooms II)
/// 
/// Задача: Найти минимальное количество комнат, необходимое для всех встреч
/// Временная сложность: O(n log n)
/// Пространственная сложность: O(n)
pub fn min_meeting_rooms(intervals: Vec&lt;Vec<i32&gt;>) -> i32 {
    if intervals.is_empty() {
        return 0;
    }

    // Извлекаем времена начала и конца
    let mut starts: Vec&lt;i32&gt; = intervals.iter().map(|i| i[0]).collect();
    let mut ends: Vec&lt;i32&gt; = intervals.iter().map(|i| i[1]).collect();

    starts.sort();
    ends.sort();

    let mut rooms = 0;
    let mut end_ptr = 0;

    // Проходим по временам начала
    for start in starts {
        // Если текущее время начала >= времени окончания,
        // освобождаем комнату
        if start >= ends[end_ptr] {
            end_ptr += 1;
        } else {
            // Иначе нужна новая комната
            rooms += 1;
        }
    }

    rooms
}
```

### Go

```go
package main

import (
	"fmt"
	"sort"
)

// Пример 1: Слияние перекрывающихся интервалов
//
// Задача: Объединить все перекрывающиеся интервалы
// Временная сложность: O(n log n)
// Пространственная сложность: O(n)
func mergeIntervals(intervals [][]int) [][]int {
	if len(intervals) == 0 {
		return [][]int{}
	}

	// Сортируем интервалы по начальной точке
	sort.Slice(intervals, func(i, j int) bool {
		return intervals[i][0] < intervals[j][0]
	})

	merged := [][]int{intervals[0]}

	for i := 1; i < len(intervals); i++ {
		current := intervals[i]
		last := merged[len(merged)-1]

		// Если текущий интервал перекрывается с последним, объединяем
		if current[0] <= last[1] {
			if current[1] > last[1] {
				last[1] = current[1]
			}
		} else {
			// Иначе добавляем новый интервал
			merged = append(merged, current)
		}
	}

	return merged
}

// Пример 2: Вставка нового интервала
//
// Задача: Вставить новый интервал в отсортированный список неперекрывающихся интервалов
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func insertInterval(intervals [][]int, newInterval []int) [][]int {
	var result [][]int
	i := 0
	n := len(intervals)

	// Добавляем все интервалы, которые заканчиваются до начала нового интервала
	for i < n && intervals[i][1] < newInterval[0] {
		result = append(result, intervals[i])
		i++
	}

	// Объединяем все перекрывающиеся интервалы
	mergedInterval := []int{newInterval[0], newInterval[1]}
	for i < n && intervals[i][0] <= mergedInterval[1] {
		if intervals[i][0] < mergedInterval[0] {
			mergedInterval[0] = intervals[i][0]
		}
		if intervals[i][1] > mergedInterval[1] {
			mergedInterval[1] = intervals[i][1]
		}
		i++
	}
	result = append(result, mergedInterval)

	// Добавляем оставшиеся интервалы
	for i < n {
		result = append(result, intervals[i])
		i++
	}

	return result
}

// Пример 3: Поиск неперекрывающихся интервалов
//
// Задача: Найти минимальное количество интервалов для удаления,
// чтобы сделать остальные неперекрывающимися
// Временная сложность: O(n log n)
// Пространственная сложность: O(1)
func eraseOverlapIntervals(intervals [][]int) int {
	if len(intervals) == 0 {
		return 0
	}

	// Сортируем по конечной точке
	sort.Slice(intervals, func(i, j int) bool {
		return intervals[i][1] < intervals[j][1]
	})

	count := 0
	end := intervals[0][1]

	for i := 1; i < len(intervals); i++ {
		// Если интервал перекрывается с предыдущим, удаляем его
		if intervals[i][0] < end {
			count++
		} else {
			end = intervals[i][1]
		}
	}

	return count
}

// Пример 4: Пересечения двух списков интервалов
//
// Задача: Найти пересечения интервалов из двух списков
// Временная сложность: O(n + m)
// Пространственная сложность: O(k), где k - количество пересечений
func intervalIntersection(firstList [][]int, secondList [][]int) [][]int {
	var result [][]int
	i, j := 0, 0

	for i < len(firstList) && j < len(secondList) {
		first := firstList[i]
		second := secondList[j]

		// Находим пересечение
		start := max(first[0], second[0])
		end := min(first[1], second[1])

		if start <= end {
			result = append(result, []int{start, end})
		}

		// Перемещаем указатель с меньшей конечной точкой
		if first[1] < second[1] {
			i++
		} else {
			j++
		}
	}

	return result
}

// Пример 5: Комнаты для встреч II (Meeting Rooms II)
//
// Задача: Найти минимальное количество комнат, необходимое для всех встреч
// Временная сложность: O(n log n)
// Пространственная сложность: O(n)
func minMeetingRooms(intervals [][]int) int {
	if len(intervals) == 0 {
		return 0
	}

	// Извлекаем времена начала и конца
	starts := make([]int, len(intervals))
	ends := make([]int, len(intervals))

	for i, interval := range intervals {
		starts[i] = interval[0]
		ends[i] = interval[1]
	}

	sort.Ints(starts)
	sort.Ints(ends)

	rooms := 0
	endPtr := 0

	// Проходим по временам начала
	for _, start := range starts {
		// Если текущее время начала >= времени окончания,
		// освобождаем комнату
		if start >= ends[endPtr] {
			endPtr++
		} else {
			// Иначе нужна новая комната
			rooms++
		}
	}

	return rooms
}

// Вспомогательные функции
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
```

## Дополнительные ресурсы

- [Interval Scheduling - Wikipedia](https://en.wikipedia.org/wiki/Interval_scheduling) - Теоретическая база
- [LeetCode Interval Problems](https://leetcode.com/tag/array/) - Практика

