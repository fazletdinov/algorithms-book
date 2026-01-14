# Topological Sort (Топологическая сортировка)

## Описание шаблона

Шаблон **Topological Sort** используется для нахождения линейного порядка элементов в ориентированном ациклическом графе (DAG), где каждое ребро представляет зависимость. Если элемент A зависит от элемента B, то B должен появиться перед A в топологическом порядке.

### Что такое DAG (Directed Acyclic Graph)?

**DAG (Directed Acyclic Graph)** — это ориентированный граф без циклов. 

**Ключевые характеристики:**
- **Ориентированный (Directed)**: Ребра имеют направление (A → B означает, что A предшествует B)
- **Ациклический (Acyclic)**: В графе нет циклов — невозможно вернуться к уже посещенной вершине, следуя по направленным ребрам

**Пример DAG:**
```
Зависимости курсов:
A → B → D
A → C → D
B → C

Граф:
    A
   / \
  B   C
   \ /
    D

Это DAG, потому что:
- Все ребра направлены (A → B, B → D, и т.д.)
- Нет циклов (нельзя вернуться к A, начав с A и следуя по ребрам)
```

**Пример НЕ-DAG (с циклом):**
```
A → B → C → A  (цикл!)

Это НЕ DAG, потому что:
- Есть цикл: A → B → C → A
- Топологическая сортировка невозможна (A зависит от C, C зависит от B, B зависит от A)
```

### Исторический контекст

Топологическая сортировка была разработана в контексте планирования задач и компиляции программ, где нужно определить порядок выполнения операций с учетом зависимостей. Алгоритм Кана был предложен в 1962 году, а DFS-подход является классическим применением обхода в глубину.

### Основная идея

Ключевое наблюдение: в DAG всегда есть хотя бы одна вершина без входящих ребер (источник). Обрабатывая источники и удаляя их из графа, мы получаем новые источники, что позволяет построить линейный порядок.

## Когда применять

Используйте этот шаблон, когда:
- Работаете с ориентированным ациклическим графом (DAG)
- Нужно определить порядок выполнения задач с зависимостями
- Требуется найти линейный порядок элементов с учетом зависимостей
- Задача связана с планированием или последовательностью выполнения
- Нужно проверить, можно ли выполнить все задачи (нет циклов)

## Алгоритм/Подход

### Алгоритм Кана (Kahn's Algorithm):

1. **Инициализация**: 
   - Подсчитайте входящие степени (in-degree) для каждой вершины
   - Добавьте все вершины с in-degree = 0 в очередь
2. **Обработка**:
   - Извлеките вершину из очереди
   - Добавьте её в результат
   - Уменьшите in-degree всех соседних вершин на 1
   - Если in-degree вершины стал 0, добавьте её в очередь
3. **Проверка**: Если размер результата != количеству вершин, есть цикл

### Что такое in-degree и out-degree?

**In-degree (входящая степень)** — количество ребер, входящих в вершину (сколько вершин зависят от этой вершины как предшественника).

**Out-degree (исходящая степень)** — количество ребер, выходящих из вершины (от скольких вершин зависит эта вершина).

**Визуализация:**

```
Граф зависимостей:
A → B → D
A → C → D
B → C

Визуализация in-degree и out-degree:

    A (in: 0, out: 2)  ← нет входящих, 2 исходящих (к B и C)
   / \
  B   C (in: 2, out: 1)  ← 2 входящих (от A и B), 1 исходящий (к D)
   \ /
    D (in: 2, out: 0)  ← 2 входящих (от B и C), нет исходящих

Подробный разбор:
- Вершина A: 
  - In-degree = 0 (нет входящих ребер)
  - Out-degree = 2 (ребра A→B и A→C)
  
- Вершина B:
  - In-degree = 1 (ребро A→B)
  - Out-degree = 2 (ребра B→C и B→D)
  
- Вершина C:
  - In-degree = 2 (ребра A→C и B→C)
  - Out-degree = 1 (ребро C→D)
  
- Вершина D:
  - In-degree = 2 (ребра B→D и C→D)
  - Out-degree = 0 (нет исходящих ребер)
```

**Почему in-degree важен для топологической сортировки?**

Вершины с in-degree = 0 не имеют зависимостей и могут быть обработаны первыми. После их обработки мы "удаляем" их из графа (уменьшаем in-degree соседних вершин), что может сделать другие вершины готовыми к обработке (их in-degree станет 0).

### DFS подход:

1. Используйте DFS для обхода графа
2. Когда вершина полностью обработана (все потомки посещены), добавляйте её в стек
3. Разверните стек для получения топологического порядка

## Визуализация

### Пример графа зависимостей:

```
Задачи: A -> B -> D
        A -> C -> D
        B -> C

Граф:
    A
   / \
  B   C
   \ /
    D

In-degrees:
A: 0, B: 1, C: 2, D: 2

Шаг 1: Очередь = [A], Результат = []
        Обрабатываем A: уменьшаем in-degree B и C
        B: 0, C: 1, D: 2
        Очередь = [B]

Шаг 2: Обрабатываем B: уменьшаем in-degree C и D
        C: 0, D: 1
        Очередь = [C]

Шаг 3: Обрабатываем C: уменьшаем in-degree D
        D: 0
        Очередь = [D]

Шаг 4: Обрабатываем D
        Очередь = []

Результат: [A, B, C, D]
```

## Математическое обоснование

### Почему алгоритм работает?

**Теорема**: В любом DAG существует хотя бы одна топологическая сортировка.

**Доказательство** (алгоритм Кана):
1. **Существование источника**: В DAG всегда есть вершина с in-degree = 0 (иначе был бы цикл)
2. **Индуктивный шаг**: Предположим, мы обработали k вершин в правильном порядке
   - После удаления этих вершин, оставшийся граф также является DAG
   - В нем есть источник (вершина с in-degree = 0)
   - Обрабатываем этот источник
   - Порядок остается корректным

**Почему сложность O(V + E)?**

- Построение графа и подсчет in-degree: O(V + E)
- Каждая вершина обрабатывается один раз: O(V)
- Каждое ребро рассматривается один раз: O(E)
- Итого: O(V + E)

## Временная и пространственная сложность

### Детальный анализ:

**Алгоритм Кана**:
- **Временная сложность**: O(V + E)
  - Построение графа: O(E)
  - Подсчет in-degree: O(V)
  - Обработка вершин: O(V)
  - Обновление in-degree: O(E)
- **Пространственная сложность**: O(V + E)
  - Граф: O(V + E)
  - Очередь: O(V)
  - In-degree массив: O(V)

**DFS подход**:
- **Временная сложность**: O(V + E)
- **Пространственная сложность**: O(V + E) для графа + O(V) для стека

### Сравнение подходов:

| Подход | Преимущества | Недостатки |
|--------|--------------|------------|
| Алгоритм Кана | Интуитивный, легко понять | Требует подсчет in-degree |
| DFS | Компактный код | Менее интуитивный |

## Типичные ошибки

1. **Неправильный подсчет in-degree**: Убедитесь, что считаете входящие, а не исходящие ребра
2. **Забывание проверки циклов**: Если результат содержит меньше V вершин, есть цикл
3. **Неправильное обновление in-degree**: Уменьшайте in-degree только для соседних вершин

## Практические советы

1. Используйте алгоритм Кана для интуитивности, DFS для компактности
2. Всегда проверяйте наличие циклов после выполнения
3. Для задач с весами используйте модифицированный алгоритм

## Структуры данных: внутреннее устройство

### Используемые структуры данных в Topological Sort

В шаблоне Topological Sort используются следующие структуры данных:
- **Graph**: Представление графа (список смежности)
- ****: Список смежности
- ****: Массив in-degree для каждого узла
- ****: Очередь для BFS обхода

### Graph (Граф)

#### Представление графа:

**Список смежности (Adjacency List)**:
```
┌─────────────────────────────────────────┐
│ Vec&lt;Vec<usize&gt;>                         │
│ ┌─────────────┐                        │
│ │ [1,2]       │ Узел 0 → узлы 1,2     │
│ │ [3]         │ Узел 1 → узел 3       │
│ │ [3]         │ Узел 2 → узел 3       │
│ │ []          │ Узел 3 → нет           │
│ └─────────────┘                        │
└─────────────────────────────────────────┘
```

**Важные детали**:
- O(V + E) памяти, где V - узлы, E - ребра
- Эффективнее матрицы смежности для разреженных графов
- Легко найти соседей узла

###  (Rust) / []int (Go) - In-degree массив

#### Массив in-degree:

**Структура**:
```
┌─────────────────────────────────────────┐
│ Vec&lt;i32&gt; / []int                        │
│ ┌─────────────┐                        │
│ │ [0]         │ Узел 0: 0 входящих     │
│ │ [1]         │ Узел 1: 1 входящий    │
│ │ [1]         │ Узел 2: 1 входящий    │
│ │ [2]         │ Узел 3: 2 входящих    │
│ └─────────────┘                        │
└─────────────────────────────────────────┘
```

**Важные детали**:
- Хранит количество входящих ребер для каждого узла
- O(V) памяти
- Обновляется при обработке узлов

###  (Rust) / Queue (Go)

#### Очередь для BFS:

**Используется для**:
- Хранения узлов с in-degree = 0
- Обработки узлов в правильном порядке
- O(V) памяти в худшем случае

#### Операции и их сложность:

| Операция | Сложность | Объяснение |
|----------|-----------|------------|
| Построение графа | O(V + E) | Проход по всем ребрам |
| Вычисление in-degree | O(V + E) | Проход по всем ребрам |
| Topological sort | O(V + E) | BFS обход всех узлов и ребер |

**Почему Topological Sort эффективен**:
- O(V + E) время - оптимально
- O(V + E) памяти для графа
- Линейная сложность

## Глубокое понимание: сложные концепции

### Escape Analysis (Go)

**Для Topological Sort**:
- Граф в куче
- Очередь в куче
- In-degree массив может быть на стеке (если небольшой)
- Результаты могут escape

### Borrow Checker (Rust)

**Типичный паттерн**:
```rust
fn topological_sort(graph: &[Vec&lt;usize&gt;]) -> Vec&lt;usize&gt; {
    let mut in_degree = vec![0; graph.len()];
    let mut queue = VecDeque::new();
    // ...
}
```

### Garbage Collector (Go)

**Для Topological Sort**:
- Граф в куче
- Очередь в куче
- Минимизация размера графа критична

### Ownership и Move Semantics (Rust)

**Концепция владения**:
- Граф: `&[Vec&lt;usize&gt;]` (заимствование) или `Vec&lt;Vec<usize&gt;>` (владение)
- Очередь: `VecDeque&lt;usize&gt;` (владение)
- RAII гарантирует освобождение

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Topological Sort

В Rust для Topological Sort:
- **Граф**: `Vec&lt;Vec<usize&gt;>` - O(V + E) памяти
- **In-degree массив**: `Vec&lt;usize&gt;` - O(V) памяти
- **Очередь**: `VecDeque&lt;usize&gt;` - O(V) в худшем случае
- **Результат**: `Vec&lt;usize&gt;` - O(V) памяти

#### Go: Topological Sort

В Go:
- **Граф**: `[][]int` - O(V + E) в куче
- **In-degree массив**: `[]int` - O(V) в куче
- **Очередь**: `[]int` - O(V) в худшем случае
- **Результат**: `[]int` - O(V) в куче

### Анализ аллокаций для Topological Sort

#### Алгоритм Кана:

**Rust**:
```rust
// Аллокации:
// - graph: Vec&lt;Vec<usize&gt;> - O(V + E) памяти
// - in_degree: Vec&lt;usize&gt; - O(V) памяти
// - queue: VecDeque&lt;usize&gt; - O(V) в худшем случае
// - result: Vec&lt;usize&gt; - O(V) памяти
// Итого: O(V + E) памяти
```

**Go**:
```go
// Аллокации:
// - graph: [][]int - O(V + E) в куче
// - inDegree: []int - O(V) в куче
// - queue: []int - O(V) в худшем случае
// - result: []int - O(V) в куче
// Итого: O(V + E) памяти
```

### Оптимизация памяти

#### Rust оптимизации:

1. **Предварительное выделение графа**:
```rust
// ✅ Предварительное выделение
let mut graph = vec![Vec::new(); num_courses];
```

2. **Предварительное выделение in-degree**:
```rust
// ✅ Предварительное выделение
let mut in_degree = vec![0; num_courses];
```

#### Go оптимизации:

1. **Предварительное выделение графа**:
```go
// ✅ Предварительное выделение
graph := make([][]int, numCourses)
```

2. **Предварительное выделение in-degree**:
```go
// ✅ Предварительное выделение
inDegree := make([]int, numCourses)
```

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Граф | `Vec&lt;Vec<usize&gt;>` | [][]int |
| Память | O(V + E) | O(V + E) |
| Производительность | Предсказуемая | Может быть паузы GC |

## Оптимизация производительности

### Общие техники

1. **Предварительное выделение структур данных**
2. **Минимизация операций с очередью**
3. **Эффективные операции с графом**

### Специфичные оптимизации для Topological Sort

#### 1. Оптимизация алгоритма Кана:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub fn topological_sort_optimized(num_courses: i32, prerequisites: Vec&lt;Vec<i32&gt;>) -> Vec&lt;i32&gt; {
    let n = num_courses as usize;
    let mut graph = vec![Vec::new(); n];
    let mut in_degree = vec![0; n];
    
    for edge in &prerequisites {
        graph[edge[1] as usize].push(edge[0] as usize);
        in_degree[edge[0] as usize] += 1;
    }
    
    let mut queue = VecDeque::with_capacity(n);
    for i in 0..n {
        if in_degree[i] == 0 {
            queue.push_back(i);
        }
    }
    
    let mut result = Vec::with_capacity(n);
    while let Some(course) = queue.pop_front() {
        result.push(course as i32);
        for &next in &graph[course] {
            in_degree[next] -= 1;
            if in_degree[next] == 0 {
                queue.push_back(next);
            }
        }
    }
    
    result
}
```

**Go**:
```go
// ✅ Оптимизированная версия
func topologicalSortOptimized(numCourses int, prerequisites [][]int) []int {
    graph := make([][]int, numCourses)
    inDegree := make([]int, numCourses)
    
    for _, edge := range prerequisites {
        graph[edge[1]] = append(graph[edge[1]], edge[0])
        inDegree[edge[0]]++
    }
    
    queue := make([]int, 0, numCourses)
    for i := 0; i < numCourses; i++ {
        if inDegree[i] == 0 {
            queue = append(queue, i)
        }
    }
    
    result := make([]int, 0, numCourses)
    for len(queue) > 0 {
        course := queue[0]
        queue = queue[1:]
        result = append(result, course)
        
        for _, next := range graph[course] {
            inDegree[next]--
            if inDegree[next] == 0 {
                queue = append(queue, next)
            }
        }
    }
    
    return result
}
```

### Оптимизация для Rust

1. **Использование `VecDeque`**:
```rust
// ✅ Эффективная очередь
use std::collections::VecDeque;
let mut queue = VecDeque::with_capacity(n);
```

2. **Предварительное выделение**:
```rust
// ✅ Предварительное выделение
let mut graph = vec![Vec::new(); n];
```

### Оптимизация для Go

1. **Предварительное выделение слайсов**:
```go
// ✅ Предварительное выделение
graph := make([][]int, numCourses)
queue := make([]int, 0, numCourses)
```

2. **Эффективные операции**:
```go
// ✅ Использование слайсов для очереди
queue = queue[1:]  // Удаление первого элемента
```

## Профилирование

### Инструменты профилирования

См. раздел "Профилирование" в [Sliding Window](./sliding-window.md#профилирование) для общих инструментов.

### Как профилировать Topological Sort

#### Rust пример:

```rust
// benches/topological_sort_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

// Вспомогательная функция для создания тестовых данных
fn create_test_prerequisites(num_courses: usize, num_edges: usize) -> Vec&lt;Vec<i32&gt;> {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let mut prerequisites = Vec::new();
    
    for _ in 0..num_edges {
        let from = rng.gen_range(0..num_courses) as i32;
        let to = rng.gen_range(0..num_courses) as i32;
        if from != to {
            prerequisites.push(vec![to, from]); // [to, from] означает from → to
        }
    }
    
    prerequisites
}

fn bench_topological_sort(c: &mut Criterion) {
    let prerequisites = create_test_prerequisites(1000, 5000);
    
    c.bench_function("topological_sort_1000", |b| {
        b.iter(|| topological_sort_optimized(black_box(1000), black_box(prerequisites.clone())))
    });
}

criterion_group!(benches, bench_topological_sort);
criterion_main!(benches);
```

#### Go пример:

```go
func BenchmarkTopologicalSort(b *testing.B) {
    prerequisites := createTestPrerequisites(1000, 5000)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        topologicalSortOptimized(1000, prerequisites)
    }
}
```

### Примеры профилирования

**Анализ производительности**:
- Topological Sort: O(V + E) по времени
- O(V + E) памяти для графа
- O(V) памяти для очереди и результата

**Типичные узкие места**:
- Построение графа
- Операции с очередью
- Обновление in-degree

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые графы
2. **Граничные случаи**: Пустой граф, один узел, циклы
3. **Стресс-тесты**: Большие графы

### Примеры тестов для Topological Sort

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_topological_sort_basic() {
        let prerequisites = vec![vec![1, 0], vec![2, 0], vec![3, 1], vec![3, 2]];
        let result = topological_sort_optimized(4, prerequisites);
        assert_eq!(result.len(), 4);
    }

    #[test]
    fn test_topological_sort_empty() {
        let prerequisites = vec![];
        let result = topological_sort_optimized(2, prerequisites);
        assert_eq!(result.len(), 2);
    }
}
```

#### Go тесты:

```go
func TestTopologicalSort(t *testing.T) {
    tests := []struct {
        name         string
        numCourses   int
        prerequisites [][]int
        want         int
    }{
        {"basic", 4, [][]int{{1, 0}, {2, 0}, {3, 1}, {3, 2}}, 4},
        {"empty", 2, [][]int{}, 2},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := topologicalSortOptimized(tt.numCourses, tt.prerequisites)
            if len(result) != tt.want {
                t.Errorf("topologicalSortOptimized() = %v, want %v", len(result), tt.want)
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

fn topological_sort_benchmark(c: &mut Criterion) {
    let sizes = vec![100, 1000, 10000];
    
    let mut group = c.benchmark_group("topological_sort");
    for size in sizes {
        let prerequisites = create_test_prerequisites(size, size * 2);
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            &prerequisites,
            |b, prerequisites| {
                b.iter(|| topological_sort_optimized(black_box(size), black_box(prerequisites.clone())));
            },
        );
    }
    group.finish();
}
```

#### Go:
```go
func BenchmarkTopologicalSortSizes(b *testing.B) {
    sizes := []int{100, 1000, 10000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            prerequisites := createTestPrerequisites(size, size*2)
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                topologicalSortOptimized(size, prerequisites)
            }
        })
    }
}
```

## Примеры кода

### Rust

```rust
// Примеры использования шаблона Topological Sort на Rust

use std::collections::{VecDeque, HashMap};

/// Пример 1: Топологическая сортировка (алгоритм Кана)
/// 
/// Задача: Найти топологический порядок вершин в графе
/// Временная сложность: O(V + E)
/// Пространственная сложность: O(V + E)
pub fn topological_sort(num_courses: i32, prerequisites: Vec&lt;Vec<i32&gt;>) -> Vec&lt;i32&gt; {
    let n = num_courses as usize;
    // Инициализируем граф как список смежности (каждая вершина -> список соседей)
    let mut graph: Vec&lt;Vec<usize&gt;> = vec![Vec::new(); n];
    // Массив для хранения входящих степеней каждой вершины
    let mut in_degree = vec![0; n];

    // Шаг 1: Строим граф и подсчитываем входящие степени (in-degree)
    // prerequisites[i] = [to, from] означает, что курс 'to' зависит от курса 'from'
    // В графе это ребро: from → to
    for prereq in prerequisites {
        let from = prereq[1] as usize;  // Предшественник
        let to = prereq[0] as usize;      // Зависимый курс
        graph[from].push(to);            // Добавляем ребро from → to
        in_degree[to] += 1;              // Увеличиваем in-degree для 'to'
    }

    // Шаг 2: Находим все вершины с in-degree = 0 (источники)
    // Эти вершины не имеют зависимостей и могут быть обработаны первыми
    let mut queue = VecDeque::new();
    for i in 0..n {
        if in_degree[i] == 0 {
            queue.push_back(i);  // Добавляем источник в очередь
        }
    }

    let mut result = Vec::new();

    // Шаг 3: Обрабатываем вершины из очереди (алгоритм Кана)
    while let Some(node) = queue.pop_front() {
        // Добавляем обработанную вершину в результат
        result.push(node as i32);

        // Для каждого соседа текущей вершины:
        for &neighbor in &graph[node] {
            // Уменьшаем in-degree, так как мы "удалили" предшественника
            in_degree[neighbor] -= 1;
            // Если in-degree стал 0, вершина готова к обработке
            if in_degree[neighbor] == 0 {
                queue.push_back(neighbor);
            }
        }
    }

    // Шаг 4: Проверка на циклы
    // Если не все вершины обработаны, значит в графе есть цикл
    if result.len() == n {
        result  // Все вершины обработаны - топологическая сортировка возможна
    } else {
        Vec::new()  // Есть цикл - топологическая сортировка невозможна
    }
}

/// Пример 2: Проверка возможности завершения курсов
/// 
/// Задача: Определить, можно ли завершить все курсы (нет циклов)
/// Временная сложность: O(V + E)
/// Пространственная сложность: O(V + E)
pub fn can_finish(num_courses: i32, prerequisites: Vec&lt;Vec<i32&gt;>) -> bool {
    let n = num_courses as usize;
    let mut graph: Vec&lt;Vec<usize&gt;> = vec![Vec::new(); n];
    let mut in_degree = vec![0; n];

    for prereq in prerequisites {
        let from = prereq[1] as usize;
        let to = prereq[0] as usize;
        graph[from].push(to);
        in_degree[to] += 1;
    }

    let mut queue = VecDeque::new();
    for i in 0..n {
        if in_degree[i] == 0 {
            queue.push_back(i);
        }
    }

    let mut count = 0;

    while let Some(node) = queue.pop_front() {
        count += 1;

        for &neighbor in &graph[node] {
            in_degree[neighbor] -= 1;
            if in_degree[neighbor] == 0 {
                queue.push_back(neighbor);
            }
        }
    }

    count == n
}

/// Пример 3: Топологическая сортировка с DFS
/// 
/// Задача: Найти топологический порядок используя DFS
/// Временная сложность: O(V + E)
/// Пространственная сложность: O(V + E)
pub fn topological_sort_dfs(num_courses: i32, prerequisites: Vec&lt;Vec<i32&gt;>) -> Vec&lt;i32&gt; {
    let n = num_courses as usize;
    let mut graph: Vec&lt;Vec<usize&gt;> = vec![Vec::new(); n];
    
    for prereq in prerequisites {
        let from = prereq[1] as usize;
        let to = prereq[0] as usize;
        graph[from].push(to);
    }

    let mut visited = vec![0; n]; // 0: не посещено, 1: посещено, 2: обработано
    let mut result = Vec::new();

    fn dfs(
        node: usize,
        graph: &[Vec&lt;usize&gt;],
        visited: &mut [i32],
        result: &mut Vec&lt;i32&gt;,
    ) -> bool {
        if visited[node] == 1 {
            // Обнаружен цикл
            return false;
        }
        if visited[node] == 2 {
            return true;
        }

        visited[node] = 1;
        for &neighbor in &graph[node] {
            if !dfs(neighbor, graph, visited, result) {
                return false;
            }
        }
        visited[node] = 2;
        result.push(node as i32);
        true
    }

    for i in 0..n {
        if visited[i] == 0 {
            if !dfs(i, &graph, &mut visited, &mut result) {
                return Vec::new();
            }
        }
    }

    result.reverse();
    result
}

/// Пример 4: Минимальная высота деревьев
/// 
/// Задача: Найти корни деревьев минимальной высоты в неориентированном графе
/// Временная сложность: O(V + E)
/// Пространственная сложность: O(V + E)
pub fn find_min_height_trees(n: i32, edges: Vec&lt;Vec<i32&gt;>) -> Vec&lt;i32&gt; {
    if n == 1 {
        return vec![0];
    }

    let n = n as usize;
    let mut graph: Vec&lt;Vec<usize&gt;> = vec![Vec::new(); n];
    let mut degree = vec![0; n];

    for edge in edges {
        let u = edge[0] as usize;
        let v = edge[1] as usize;
        graph[u].push(v);
        graph[v].push(u);
        degree[u] += 1;
        degree[v] += 1;
    }

    // Начинаем с листьев (степень = 1)
    let mut queue = VecDeque::new();
    for i in 0..n {
        if degree[i] == 1 {
            queue.push_back(i);
        }
    }

    let mut remaining = n;

    // Удаляем листья слой за слоем
    while remaining > 2 {
        let size = queue.len();
        remaining -= size;

        for _ in 0..size {
            let leaf = queue.pop_front().unwrap();
            for &neighbor in &graph[leaf] {
                degree[neighbor] -= 1;
                if degree[neighbor] == 1 {
                    queue.push_back(neighbor);
                }
            }
        }
    }

    queue.into_iter().map(|x| x as i32).collect()
}
```

### Go

```go
package main

import (
	"fmt"
)

// Пример 1: Топологическая сортировка (алгоритм Кана)
//
// Задача: Найти топологический порядок вершин в графе
// Временная сложность: O(V + E)
// Пространственная сложность: O(V + E)
func topologicalSort(numCourses int, prerequisites [][]int) []int {
	graph := make([][]int, numCourses)
	inDegree := make([]int, numCourses)

	// Строим граф и подсчитываем входящие степени
	for _, prereq := range prerequisites {
		from := prereq[1]
		to := prereq[0]
		graph[from] = append(graph[from], to)
		inDegree[to]++
	}

	// Находим все вершины с in-degree = 0
	queue := []int{}
	for i := 0; i < numCourses; i++ {
		if inDegree[i] == 0 {
			queue = append(queue, i)
		}
	}

	result := []int{}

	// Обрабатываем вершины
	for len(queue) > 0 {
		node := queue[0]
		queue = queue[1:]
		result = append(result, node)

		// Уменьшаем in-degree соседних вершин
		for _, neighbor := range graph[node] {
			inDegree[neighbor]--
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
		}
	}

	// Если не все вершины обработаны, есть цикл
	if len(result) == numCourses {
		return result
	}
	return []int{}
}

// Пример 2: Проверка возможности завершения курсов
//
// Задача: Определить, можно ли завершить все курсы (нет циклов)
// Временная сложность: O(V + E)
// Пространственная сложность: O(V + E)
func canFinish(numCourses int, prerequisites [][]int) bool {
	graph := make([][]int, numCourses)
	inDegree := make([]int, numCourses)

	for _, prereq := range prerequisites {
		from := prereq[1]
		to := prereq[0]
		graph[from] = append(graph[from], to)
		inDegree[to]++
	}

	queue := []int{}
	for i := 0; i < numCourses; i++ {
		if inDegree[i] == 0 {
			queue = append(queue, i)
		}
	}

	count := 0

	for len(queue) > 0 {
		node := queue[0]
		queue = queue[1:]
		count++

		for _, neighbor := range graph[node] {
			inDegree[neighbor]--
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
		}
	}

	return count == numCourses
}

// Пример 3: Топологическая сортировка с DFS
//
// Задача: Найти топологический порядок используя DFS
// Временная сложность: O(V + E)
// Пространственная сложность: O(V + E)
func topologicalSortDFS(numCourses int, prerequisites [][]int) []int {
	graph := make([][]int, numCourses)

	for _, prereq := range prerequisites {
		from := prereq[1]
		to := prereq[0]
		graph[from] = append(graph[from], to)
	}

	visited := make([]int, numCourses) // 0: не посещено, 1: посещено, 2: обработано
	result := []int{}

	var dfs func(int) bool
	dfs = func(node int) bool {
		if visited[node] == 1 {
			// Обнаружен цикл
			return false
		}
		if visited[node] == 2 {
			return true
		}

		visited[node] = 1
		for _, neighbor := range graph[node] {
			if !dfs(neighbor) {
				return false
			}
		}
		visited[node] = 2
		result = append(result, node)
		return true
	}

	for i := 0; i < numCourses; i++ {
		if visited[i] == 0 {
			if !dfs(i) {
				return []int{}
			}
		}
	}

	// Разворачиваем результат
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}

	return result
}

// Пример 4: Минимальная высота деревьев
//
// Задача: Найти корни деревьев минимальной высоты в неориентированном графе
// Временная сложность: O(V + E)
// Пространственная сложность: O(V + E)
func findMinHeightTrees(n int, edges [][]int) []int {
	if n == 1 {
		return []int{0}
	}

	graph := make([][]int, n)
	degree := make([]int, n)

	for _, edge := range edges {
		u := edge[0]
		v := edge[1]
		graph[u] = append(graph[u], v)
		graph[v] = append(graph[v], u)
		degree[u]++
		degree[v]++
	}

	// Начинаем с листьев (степень = 1)
	queue := []int{}
	for i := 0; i < n; i++ {
		if degree[i] == 1 {
			queue = append(queue, i)
		}
	}

	remaining := n

	// Удаляем листья слой за слоем
	for remaining > 2 {
		size := len(queue)
		remaining -= size

		for i := 0; i < size; i++ {
			leaf := queue[0]
			queue = queue[1:]
			for _, neighbor := range graph[leaf] {
				degree[neighbor]--
				if degree[neighbor] == 1 {
					queue = append(queue, neighbor)
				}
			}
		}
	}

	return queue
}
```

## Примеры задач на LeetCode

### Средние:
- [Course Schedule](https://leetcode.com/problems/course-schedule/) - Расписание курсов
- [Course Schedule II](https://leetcode.com/problems/course-schedule-ii/) - Расписание курсов II
- [Alien Dictionary](https://leetcode.com/problems/alien-dictionary/) - Словарь инопланетян

### Сложные:
- [Minimum Height Trees](https://leetcode.com/problems/minimum-height-trees/) - Деревья минимальной высоты
- [Sequence Reconstruction](https://leetcode.com/problems/sequence-reconstruction/) - Реконструкция последовательности

