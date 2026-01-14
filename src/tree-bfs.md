# Tree BFS (Обход дерева в ширину)

## Описание шаблона

Шаблон **Tree BFS** (Breadth-First Search) используется для обхода дерева уровень за уровнем. Алгоритм использует очередь для хранения узлов текущего уровня перед переходом к следующему уровню. Этот подход особенно полезен для задач, требующих обработки узлов по уровням.

### Исторический контекст

BFS был разработан в контексте поиска в графах и деревьях. Алгоритм гарантирует, что все узлы на уровне k будут обработаны перед узлами уровня k+1, что делает его идеальным для задач, связанных с уровнями дерева или кратчайшими путями.

### Основная идея

Ключевое наблюдение: используя очередь (FIFO), мы обрабатываем узлы в порядке их добавления, что естественным образом обеспечивает обход уровень за уровнем. Каждый уровень полностью обрабатывается перед переходом к следующему.

## Когда применять

Используйте этот шаблон, когда:
- Нужно обработать узлы дерева уровень за уровнем
- Требуется найти кратчайший путь в дереве
- Нужно найти все узлы на определенном уровне
- Задача связана с уровнями дерева или его шириной
- Требуется обход дерева в порядке уровней

## Алгоритм/Подход

### Базовый алгоритм:

1. **Инициализация**: Создайте очередь и добавьте корневой узел
2. **Итерация**: Пока очередь не пуста:
   - Определите размер текущего уровня
   - Обработайте все узлы текущего уровня
   - Для каждого узла добавьте его дочерние узлы в очередь
3. **Завершение**: Когда очередь пуста, обход завершен

### Структура:

**Что такое Queue (Очередь)?**

**Queue (Очередь)** — это структура данных типа FIFO (First In, First Out — первый пришел, первый ушел). Элементы добавляются в конец и извлекаются из начала.

**Основные операции**:
- **Enqueue (добавление)**: Добавить элемент в конец очереди
- **Dequeue (извлечение)**: Удалить элемент из начала очереди
- **Peek (просмотр)**: Посмотреть элемент в начале без удаления

**Почему Queue используется для BFS?**
- BFS обрабатывает узлы уровень за уровнем
- Узлы добавляются в очередь по порядку их обнаружения
- Извлечение из начала очереди гарантирует обработку узлов в правильном порядке (сначала узлы уровня k, затем уровня k+1)

```
Используйте очередь (Queue) для хранения узлов:
- Добавляйте узлы в конец очереди (enqueue)
- Извлекайте узлы из начала очереди (dequeue)
- Это обеспечивает обход уровень за уровнем
```

## Визуализация

### Обход дерева в ширину:

```
        1
       / \
      2   3
     / \   \
    4   5   6

Уровень 0: [1]
           Обрабатываем: 1
           Добавляем: 2, 3
           
Уровень 1: [2, 3]
           Обрабатываем: 2, 3
           Добавляем: 4, 5, 6
           
Уровень 2: [4, 5, 6]
           Обрабатываем: 4, 5, 6
           Нет дочерних узлов
           
Порядок обхода: 1 -> 2 -> 3 -> 4 -> 5 -> 6
```

## Математическое обоснование

### Почему алгоритм работает?

**Инвариант**: На каждом шаге очередь содержит все узлы текущего уровня, отсортированные слева направо.

**Доказательство корректности**:
1. **Базовый случай**: Очередь содержит только корень (уровень 0) - корректно
2. **Индуктивный шаг**: Предположим, очередь содержит узлы уровня k в правильном порядке
   - Обрабатываем все узлы уровня k
   - Добавляем их дочерние узлы (уровень k+1) в очередь
   - Порядок добавления сохраняет порядок слева направо
   - Очередь теперь содержит узлы уровня k+1 в правильном порядке

**Почему сложность O(n)?**

Каждый узел добавляется в очередь ровно один раз и извлекается ровно один раз. Для каждого узла выполняется константное количество операций → O(n).

## Временная и пространственная сложность

### Детальный анализ:

- **Временная сложность**: O(n)
  - Каждый узел посещается ровно один раз
  - Операции с очередью: O(1) для добавления/удаления
  - Итого: O(n)
- **Пространственная сложность**: O(w), где w - максимальная ширина дерева
  - В худшем случае (полное бинарное дерево): w = n/2
  - В лучшем случае (линейное дерево): w = 1

### Сравнение с DFS:

| Аспект | BFS | DFS |
|--------|-----|-----|
| Порядок обхода | Уровень за уровнем | Глубина за глубиной |
| Память | O(w) - ширина | O(h) - высота |
| Применение | Кратчайший путь, уровни | Обход, поиск |

## Типичные ошибки

1. **Забывание проверки на пустой корень**: Всегда проверяйте `root == None`
2. **Неправильное определение уровня**: Используйте размер очереди для определения границ уровня
3. **Добавление None в очередь**: Проверяйте дочерние узлы перед добавлением

## Практические советы

1. Используйте размер очереди для обработки уровня за уровнем
2. Для зигзагообразного обхода переворачивайте уровень при необходимости
3. Для задач на кратчайший путь BFS предпочтительнее DFS

## Структуры данных: внутреннее устройство

### Используемые структуры данных в Tree BFS

В шаблоне Tree BFS используются следующие структуры данных:
- **TreeNode**: Узлы дерева (Box&lt;T&gt; в Rust, указатели в Go)
- ****: Очередь для BFS обхода

### TreeNode (Узел дерева)

**Что такое бинарное дерево (Binary Tree)?**

**Бинарное дерево** — это иерархическая структура данных, где каждый узел имеет максимум два потомка (левый и правый). Дерево начинается с корневого узла и может быть пустым.

**Основные характеристики**:
- **Корневой узел**: Самый верхний узел дерева
- **Листья**: Узлы без потомков
- **Высота**: Максимальное расстояние от корня до листа
- **Уровень**: Расстояние от корня (корень на уровне 0)

**Структура узла (TreeNode)**:
- **val**: Значение узла (данные)
- **left**: Указатель на левого потомка (или None/nil)
- **right**: Указатель на правого потомка (или None/nil)

#### Как хранится в памяти:

**Rust (Box&lt;T&gt;)**:
```
Узел дерева:
┌─────────────────────────────────────────┐
│ Box&lt;TreeNode&gt;                            │
│ ┌─────────────┐                         │
│ │ val: i32    │ Значение                │
│ │ left: Option│ Левый потомок           │
│ │ right: Option│ Правый потомок         │
│ └─────────────┘                         │
└─────────────────────────────────────────┘
```

**Go (указатели)**:
```
Узел дерева:
┌─────────────────────────────────────────┐
│ *TreeNode                                │
│ ┌─────────────┐                         │
│ │ Val: int    │ Значение                │
│ │ Left: *TreeNode│ Левый потомок        │
│ │ Right: *TreeNode│ Правый потомок      │
│ └─────────────┘                         │
└─────────────────────────────────────────┘
```

### `VecDeque<T>` (Rust) / Queue (Go)

#### Как хранится в памяти:

**Rust `VecDeque<T>`**:
```
Кольцевой буфер:
┌─────────────────────────────────────────┐
│ VecDeque<Option&lt;Box&lt;TreeNode&gt;&gt;>         │
│ ┌─────────────┐                         │
│ │ head: usize │ Индекс начала           │
│ │ tail: usize │ Индекс конца            │
│ │ buf: Vec&lt;T&gt; │ Буфер данных            │
│ └─────────────┘                         │
└─────────────────────────────────────────┘
```

**Go Queue (через slice)**:
```go
type Queue []*TreeNode
// Используется как очередь через append и [1:]
```

#### Операции и их сложность:

| Операция | VecDeque | Queue (slice) | Объяснение |
|----------|----------|---------------|------------|
| Enqueue (push_back) | O(1) амортизированная | O(1) амортизированная | Добавление в конец |
| Dequeue (pop_front) | O(1) | O(1) | Удаление из начала |
| Размер | O(1) | O(1) | Простое вычисление |

**Почему VecDeque эффективен для BFS**:
- O(1) операции с обоих концов
- Непрерывная память (cache-friendly)
- Эффективнее чем LinkedList для очереди

## Глубокое понимание: сложные концепции

### Escape Analysis (Go)

**Для Tree BFS**:
- Узлы дерева в куче
- Очередь может escape, если возвращается
- Указатели на узлы - на стеке

### Borrow Checker (Rust)

**Типичный паттерн**:
```rust
fn bfs(root: Option&lt;Box&lt;TreeNode&gt;&gt;) -> Vec&lt;Vec<i32&gt;> {
    let mut queue = VecDeque::new();
    queue.push_back(root);
    // ...
}
```

### Garbage Collector (Go)

**Для Tree BFS**:
- Узлы дерева в куче
- Очередь также в куче
- Минимизация размера очереди критична

### Ownership и Move Semantics (Rust)

**Концепция владения**:
- Каждый `Box&lt;TreeNode&gt;` владеет потомками
- При добавлении в очередь передаем владение
- RAII гарантирует освобождение

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Очередь для BFS

В Rust для Tree BFS:
- **Очередь**: `VecDeque&lt;TreeNode&gt;` - аллоцируется в куче, O(w) где w - ширина дерева
- **Результат**: `Vec&lt;Vec<i32&gt;>` - O(n) для всех значений
- **Указатели**: `&TreeNode` - ссылки, не аллоцируют

#### Go: Очередь для BFS

В Go:
- **Очередь**: `[]*TreeNode` - слайс в куче, O(w)
- **Результат**: `[][]int` - O(n) в куче
- **Указатели**: `*TreeNode` - указатели, не аллоцируют

### Анализ аллокаций для Tree BFS

#### Базовый обход:

**Rust**:
```rust
// Аллокации:
// - queue: VecDeque - O(w) где w - максимальная ширина уровня
// - result: Vec&lt;Vec<i32&gt;> - O(n) для всех значений
// Итого: O(n) памяти в худшем случае (полное дерево)
```

**Go**:
```go
// Аллокации:
// - queue: []*TreeNode - O(w) в куче
// - result: [][]int - O(n) в куче
// Итого: O(n) памяти в худшем случае
```

### Оптимизация памяти

#### Rust оптимизации:

1. **Предварительное выделение очереди**:
```rust
// ✅ Предварительное выделение
let mut queue = VecDeque::with_capacity(max_width);
```

2. **Переиспользование векторов**:
```rust
// ✅ Переиспользование level вектора
let mut level = Vec::with_capacity(queue.len());
```

#### Go оптимизации:

1. **Предварительное выделение**:
```go
// ✅ Предварительное выделение
queue := make([]*TreeNode, 0, maxWidth)
```

2. **Переиспользование слайсов**:
```go
// ✅ Переиспользование level слайса
level := make([]int, 0, len(queue))
```

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Очередь | VecDeque в куче | Слайс в куче |
| Результат | `Vec&lt;Vec<i32&gt;>` | [][]int |
| Память | O(n) в худшем случае | O(n) в худшем случае |

## Оптимизация производительности

### Общие техники

1. **Предварительное выделение структур данных**
2. **Минимизация аллокаций в циклах**
3. **Использование размера очереди для батчинга**

### Специфичные оптимизации для Tree BFS

#### 1. Оптимизация обхода:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub fn level_order_optimized(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::new();
    if root.is_none() { return result; }
    
    let mut queue = VecDeque::with_capacity(100);
    queue.push_back(root.unwrap());
    
    while !queue.is_empty() {
        let level_size = queue.len();
        let mut level = Vec::with_capacity(level_size);
        
        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();
            level.push(node_ref.val);
            
            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }
        result.push(level);
    }
    result
}
```

**Go**:
```go
// ✅ Оптимизированная версия
func levelOrderOptimized(root *TreeNode) [][]int {
    if root == nil { return [][]int{} }
    
    result := make([][]int, 0)
    queue := make([]*TreeNode, 0, 100)
    queue = append(queue, root)
    
    for len(queue) > 0 {
        levelSize := len(queue)
        level := make([]int, 0, levelSize)
        
        for i := 0; i < levelSize; i++ {
            node := queue[0]
            queue = queue[1:]
            level = append(level, node.Val)
            
            if node.Left != nil {
                queue = append(queue, node.Left)
            }
            if node.Right != nil {
                queue = append(queue, node.Right)
            }
        }
        result = append(result, level)
    }
    return result
}
```

### Оптимизация для Rust

1. **Использование `VecDeque`**:
```rust
// ✅ Эффективная очередь с O(1) операциями
use std::collections::VecDeque;
```

2. **Предварительное выделение**:
```rust
// ✅ Предварительное выделение
let mut queue = VecDeque::with_capacity(max_width);
```

### Оптимизация для Go

1. **Предварительное выделение слайсов**:
```go
// ✅ Предварительное выделение
queue := make([]*TreeNode, 0, maxWidth)
```

2. **Батчинг по уровням**:
```go
// ✅ Обработка уровня целиком
levelSize := len(queue)
for i := 0; i < levelSize; i++ {
    // ...
}
```

## Профилирование

### Инструменты профилирования

См. раздел "Профилирование" в [Sliding Window](./sliding-window.md#профилирование) для общих инструментов.

### Как профилировать Tree BFS

#### Rust пример:

```rust
// benches/tree_bfs_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_level_order(c: &mut Criterion) {
    let tree = create_test_tree(1000);
    
    c.bench_function("level_order_1000", |b| {
        b.iter(|| level_order_optimized(black_box(tree.clone())))
    });
}

criterion_group!(benches, bench_level_order);
criterion_main!(benches);
```

#### Go пример:

```go
func BenchmarkLevelOrder(b *testing.B) {
    tree := createTestTree(1000)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        levelOrderOptimized(tree)
    }
}
```

### Примеры профилирования

**Анализ производительности**:
- Tree BFS: O(n) по времени, O(w) для очереди, O(n) для результата
- Ширина дерева определяет размер очереди

**Типичные узкие места**:
- Операции с очередью
- Создание векторов для уровней
- Клонирование узлов (в Rust)

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые деревья
2. **Граничные случаи**: Пустое дерево, один узел, вырожденное дерево
3. **Стресс-тесты**: Большие деревья

### Примеры тестов для Tree BFS

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_level_order_basic() {
        let tree = create_tree(vec![Some(3), Some(9), Some(20), None, None, Some(15), Some(7)]);
        let result = level_order_optimized(tree);
        assert_eq!(result, vec![vec![3], vec![9, 20], vec![15, 7]]);
    }

    #[test]
    fn test_level_order_empty() {
        let tree = None;
        let result = level_order_optimized(tree);
        assert_eq!(result, Vec::<Vec&lt;i32&gt;>::new());
    }
}
```

#### Go тесты:

```go
func TestLevelOrder(t *testing.T) {
    tests := []struct {
        name string
        tree *TreeNode
        want [][]int
    }{
        {"basic", createTree([]int{3, 9, 20, -1, -1, 15, 7}), [][]int{{3}, {9, 20}, {15, 7}}},
        {"empty", nil, [][]int{}},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := levelOrderOptimized(tt.tree)
            if !reflect.DeepEqual(result, tt.want) {
                t.Errorf("levelOrderOptimized() = %v, want %v", result, tt.want)
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

fn tree_bfs_benchmark(c: &mut Criterion) {
    let sizes = vec![100, 1000, 10000];
    
    let mut group = c.benchmark_group("tree_bfs");
    for size in sizes {
        let tree = create_test_tree(size);
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            &tree,
            |b, tree| {
                b.iter(|| level_order_optimized(black_box(tree.clone())));
            },
        );
    }
    group.finish();
}
```

#### Go:
```go
func BenchmarkTreeBFSSizes(b *testing.B) {
    sizes := []int{100, 1000, 10000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            tree := createTestTree(size)
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                levelOrderOptimized(tree)
            }
        })
    }
}
```

## Примеры кода

### Rust

```rust
// Примеры использования шаблона Tree BFS на Rust

use std::collections::VecDeque;
use std::rc::Rc;
use std::cell::RefCell;

// Определение узла бинарного дерева
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;,
    pub right: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;,
}

impl TreeNode {
    #[inline]
    pub fn new(val: i32) -> Self {
        TreeNode {
            val,
            left: None,
            right: None,
        }
    }
}

/// Пример 1: Обход дерева по уровням
/// 
/// Задача: Вернуть значения узлов, сгруппированные по уровням
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn level_order(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::new();
    
    if root.is_none() {
        return result;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());

    while !queue.is_empty() {
        let level_size = queue.len();
        let mut current_level = Vec::new();

        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();
            
            current_level.push(node_ref.val);

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }

        result.push(current_level);
    }

    result
}

/// Пример 2: Среднее значение каждого уровня
/// 
/// Задача: Вычислить среднее значение узлов на каждом уровне
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn average_of_levels(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> Vec&lt;f64&gt; {
    let mut result = Vec::new();
    
    if root.is_none() {
        return result;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());

    while !queue.is_empty() {
        let level_size = queue.len();
        let mut sum = 0i64;

        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();
            
            sum += node_ref.val as i64;

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }

        result.push(sum as f64 / level_size as f64);
    }

    result
}

/// Пример 3: Вид дерева справа
/// 
/// Задача: Вернуть значения узлов, видимых справа на каждом уровне
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn right_side_view(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> Vec&lt;i32&gt; {
    let mut result = Vec::new();
    
    if root.is_none() {
        return result;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());

    while !queue.is_empty() {
        let level_size = queue.len();
        let mut rightmost = 0;

        for i in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();
            
            rightmost = node_ref.val;

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }

        result.push(rightmost);
    }

    result
}

/// Пример 4: Зигзагообразный обход дерева
/// 
/// Задача: Обойти дерево зигзагообразно (слева направо, затем справа налево)
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn zigzag_level_order(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> Vec&lt;Vec<i32&gt;> {
    let mut result = Vec::new();
    
    if root.is_none() {
        return result;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());
    let mut left_to_right = true;

    while !queue.is_empty() {
        let level_size = queue.len();
        let mut current_level = Vec::new();

        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();
            
            current_level.push(node_ref.val);

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }

        if !left_to_right {
            current_level.reverse();
        }

        result.push(current_level);
        left_to_right = !left_to_right;
    }

    result
}

/// Пример 5: Максимальная глубина дерева (BFS подход)
/// 
/// Задача: Найти максимальную глубину бинарного дерева
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn max_depth_bfs(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> i32 {
    if root.is_none() {
        return 0;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());
    let mut depth = 0;

    while !queue.is_empty() {
        let level_size = queue.len();
        depth += 1;

        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }
    }

    depth
}

/// Пример 6: Минимальная глубина дерева
/// 
/// Задача: Найти минимальную глубину дерева (до ближайшего листа)
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn min_depth(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> i32 {
    if root.is_none() {
        return 0;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());
    let mut depth = 0;

    while !queue.is_empty() {
        let level_size = queue.len();
        depth += 1;

        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();

            // Если это лист, возвращаем текущую глубину
            if node_ref.left.is_none() && node_ref.right.is_none() {
                return depth;
            }

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }
    }

    depth
}
```

### Go

```go
package main

import (
	"fmt"
)

// Определение узла бинарного дерева
type TreeNode struct {
	Val   int
	Left  *TreeNode
	Right *TreeNode
}

// Пример 1: Обход дерева по уровням
//
// Задача: Вернуть значения узлов, сгруппированные по уровням
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func levelOrder(root *TreeNode) [][]int {
	var result [][]int

	if root == nil {
		return result
	}

	queue := []*TreeNode{root}

	for len(queue) > 0 {
		levelSize := len(queue)
		var currentLevel []int

		for i := 0; i < levelSize; i++ {
			node := queue[0]
			queue = queue[1:]

			currentLevel = append(currentLevel, node.Val)

			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}

		result = append(result, currentLevel)
	}

	return result
}

// Пример 2: Среднее значение каждого уровня
//
// Задача: Вычислить среднее значение узлов на каждом уровне
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func averageOfLevels(root *TreeNode) []float64 {
	var result []float64

	if root == nil {
		return result
	}

	queue := []*TreeNode{root}

	for len(queue) > 0 {
		levelSize := len(queue)
		sum := 0

		for i := 0; i < levelSize; i++ {
			node := queue[0]
			queue = queue[1:]

			sum += node.Val

			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}

		result = append(result, float64(sum)/float64(levelSize))
	}

	return result
}

// Пример 3: Вид дерева справа
//
// Задача: Вернуть значения узлов, видимых справа на каждом уровне
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func rightSideView(root *TreeNode) []int {
	var result []int

	if root == nil {
		return result
	}

	queue := []*TreeNode{root}

	for len(queue) > 0 {
		levelSize := len(queue)
		var rightmost int

		for i := 0; i < levelSize; i++ {
			node := queue[0]
			queue = queue[1:]

			rightmost = node.Val

			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}

		result = append(result, rightmost)
	}

	return result
}

// Пример 4: Зигзагообразный обход дерева
//
// Задача: Обойти дерево зигзагообразно (слева направо, затем справа налево)
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func zigzagLevelOrder(root *TreeNode) [][]int {
	var result [][]int

	if root == nil {
		return result
	}

	queue := []*TreeNode{root}
	leftToRight := true

	for len(queue) > 0 {
		levelSize := len(queue)
		var currentLevel []int

		for i := 0; i < levelSize; i++ {
			node := queue[0]
			queue = queue[1:]

			currentLevel = append(currentLevel, node.Val)

			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}

		if !leftToRight {
			// Разворачиваем уровень
			for i, j := 0, len(currentLevel)-1; i < j; i, j = i+1, j-1 {
				currentLevel[i], currentLevel[j] = currentLevel[j], currentLevel[i]
			}
		}

		result = append(result, currentLevel)
		leftToRight = !leftToRight
	}

	return result
}

// Пример 5: Максимальная глубина дерева (BFS подход)
//
// Задача: Найти максимальную глубину бинарного дерева
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func maxDepthBFS(root *TreeNode) int {
	if root == nil {
		return 0
	}

	queue := []*TreeNode{root}
	depth := 0

	for len(queue) > 0 {
		levelSize := len(queue)
		depth++

		for i := 0; i < levelSize; i++ {
			node := queue[0]
			queue = queue[1:]

			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}
	}

	return depth
}

// Пример 6: Минимальная глубина дерева
//
// Задача: Найти минимальную глубину дерева (до ближайшего листа)
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func minDepth(root *TreeNode) int {
	if root == nil {
		return 0
	}

	queue := []*TreeNode{root}
	depth := 0

	for len(queue) > 0 {
		levelSize := len(queue)
		depth++

		for i := 0; i < levelSize; i++ {
			node := queue[0]
			queue = queue[1:]

			// Если это лист, возвращаем текущую глубину
			if node.Left == nil && node.Right == nil {
				return depth
			}

			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}
	}

	return depth
}
```

## Примеры задач на LeetCode

### Легкие:
- [Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/) - Обход дерева по уровням
- [Average of Levels in Binary Tree](https://leetcode.com/problems/average-of-levels-in-binary-tree/) - Среднее значение уровней
- [Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/) - Максимальная глубина дерева

### Средние:
- [Binary Tree Zigzag Level Order Traversal](https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/) - Зигзагообразный обход
- [Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/) - Вид справа
- [Cousins in Binary Tree](https://leetcode.com/problems/cousins-in-binary-tree/) - Двоюродные братья в дереве

### Сложные:
- [Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) - Сериализация дерева
- [Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/) - Максимальная сумма пути

