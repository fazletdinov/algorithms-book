# Tree DFS (Обход дерева в глубину)

## Описание шаблона

Шаблон **Tree DFS** (Depth-First Search) используется для обхода дерева в глубину, то есть до конца каждой ветви перед переходом к следующей. Алгоритм использует рекурсию или стек для отслеживания пути. Существует три основных варианта DFS: Pre-order, In-order и Post-order.

### Исторический контекст

DFS является одним из фундаментальных алгоритмов обхода графов и деревьев, разработанным в контексте теории графов. Для деревьев DFS особенно эффективен, так как деревья не содержат циклов, что упрощает реализацию.

### Основная идея

Ключевое наблюдение: рекурсивная природа деревьев (дерево состоит из корня и поддеревьев) естественным образом приводит к рекурсивному обходу. Порядок обработки корня относительно поддеревьев определяет тип обхода (pre/in/post-order).

## Когда применять

Используйте этот шаблон, когда:
- Нужно обработать все узлы дерева
- Требуется найти путь от корня до листа
- Нужно проверить свойства дерева (симметричность, валидность BST)
- Задача связана с накоплением значений при обходе
- Требуется рекурсивное решение задачи на дереве

### Что такое BST (Binary Search Tree)?

**BST (бинарное дерево поиска)** — это бинарное дерево, где для каждого узла выполняется следующее свойство:
- Все значения в левом поддереве **меньше** значения узла
- Все значения в правом поддереве **больше** значения узла
- Это свойство должно выполняться рекурсивно для всех узлов дерева

**Пример валидного BST**:
```
        5
       / \
      3   7
     / \ / \
    2  4 6  8

Проверка:
- Узел 5: левое поддерево (3,2,4) < 5, правое (7,6,8) > 5 ✓
- Узел 3: левое (2) < 3, правое (4) > 3 ✓
- Узел 7: левое (6) < 7, правое (8) > 7 ✓
```

**Пример НЕ-валидного BST**:
```
        5
       / \
      3   2  ← Ошибка: 2 < 5, но находится справа
```

**Важное свойство**: In-order обход (левое → корень → правое) валидного BST дает **отсортированную последовательность** значений. Это используется для проверки валидности BST.

## Алгоритм/Подход

### Три типа обхода:

1. **Pre-order (Прямой обход)**: Корень → Левое поддерево → Правое поддерево
2. **In-order (Симметричный обход)**: Левое поддерево → Корень → Правое поддерево
3. **Post-order (Обратный обход)**: Левое поддерево → Правое поддерево → Корень

### Рекурсивный подход:

```go
// Определение узла дерева
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

// Pre-order обход: Корень → Левое поддерево → Правое поддерево
func preorderTraversal(root *TreeNode) []int {
    result := []int{}
    
    var dfs func(*TreeNode)
    dfs = func(node *TreeNode) {
        // Шаг 1: Базовый случай - если узел равен nil, возвращаемся
        // Это означает, что мы достигли листа или пустого поддерева
        if node == nil {
            return
        }
        
        // Шаг 2: Обработка текущего узла (для pre-order - сначала корень)
        // Добавляем значение узла в результат
        result = append(result, node.Val)
        
        // Шаг 3: Рекурсия - рекурсивно обрабатываем левое и правое поддеревья
        // Для pre-order: сначала левое, потом правое
        dfs(node.Left)   // Рекурсивный вызов для левого поддерева
        dfs(node.Right)  // Рекурсивный вызов для правого поддерева
    }
    
    dfs(root)
    return result
}

// In-order обход: Левое поддерево → Корень → Правое поддерево
func inorderTraversal(root *TreeNode) []int {
    result := []int{}
    
    var dfs func(*TreeNode)
    dfs = func(node *TreeNode) {
        if node == nil {
            return
        }
        
        // Для in-order: сначала обрабатываем левое поддерево
        dfs(node.Left)
        
        // Потом обрабатываем корень (текущий узел)
        result = append(result, node.Val)
        
        // Затем обрабатываем правое поддерево
        dfs(node.Right)
    }
    
    dfs(root)
    return result
}

// Post-order обход: Левое поддерево → Правое поддерево → Корень
func postorderTraversal(root *TreeNode) []int {
    result := []int{}
    
    var dfs func(*TreeNode)
    dfs = func(node *TreeNode) {
        if node == nil {
            return
        }
        
        // Для post-order: сначала обрабатываем оба поддерева
        dfs(node.Left)
        dfs(node.Right)
        
        // Потом обрабатываем корень (текущий узел)
        result = append(result, node.Val)
    }
    
    dfs(root)
    return result
}
```

### Итеративный подход:

Используйте стек для имитации рекурсии.

## Визуализация

### Pre-order обход:

```
        1
       / \
      2   3
     / \   \
    4   5   6

Pre-order: 1 -> 2 -> 4 -> 5 -> 3 -> 6
(Корень, затем левое, затем правое)
```

### In-order обход:

```
        1
       / \
      2   3
     / \   \
    4   5   6

In-order: 4 -> 2 -> 5 -> 1 -> 3 -> 6
(Левое, затем корень, затем правое)
```

### Post-order обход:

```
        1
       / \
      2   3
     / \   \
    4   5   6

Post-order: 4 -> 5 -> 2 -> 6 -> 3 -> 1
(Левое, затем правое, затем корень)
```

## Математическое обоснование

### Почему алгоритм работает?

**Инвариант**: После обработки поддерева с корнем в узле v, все узлы этого поддерева обработаны в правильном порядке.

**Доказательство корректности** (индукция по высоте дерева):
1. **Базовый случай**: Лист обрабатывается корректно (нет поддеревьев)
2. **Индуктивный шаг**: Предположим, поддеревья обрабатываются корректно
   - Обрабатываем корень (pre-order) или после поддеревьев (post-order)
   - Рекурсивно обрабатываем поддеревья
   - Результат корректен по индукции

**Почему сложность O(n)?**

Каждый узел посещается ровно один раз, и для каждого узла выполняется константное количество операций → O(n).

## Временная и пространственная сложность

### Детальный анализ:

- **Временная сложность**: O(n)
  - Каждый узел посещается ровно один раз
  - Операции с узлом: O(1)
  - Итого: O(n)
- **Пространственная сложность**: O(h), где h - высота дерева
  - Рекурсивный: глубина стека вызовов = высота дерева
  - Итеративный: размер стека = высота дерева
  - В худшем случае (линейное дерево): h = n → O(n)
  - В лучшем случае (сбалансированное): h = log n → O(log n)

### Сравнение типов обхода:

| Тип | Порядок обработки | Применение |
|-----|-------------------|------------|
| Pre-order | Корень → Левое → Правое | Копирование дерева, префиксные выражения |
| In-order | Левое → Корень → Правое | BST: отсортированный порядок |
| Post-order | Левое → Правое → Корень | Удаление дерева, постфиксные выражения |

## Типичные ошибки

1. **Неправильный порядок обработки**: Убедитесь, что обрабатываете корень в правильный момент
2. **Забывание базового случая**: Всегда проверяйте `node == None`
3. **Изменение структуры во время обхода**: Избегайте модификации дерева во время обхода

## Практические советы

1. Используйте рекурсию для простоты, итеративный подход для больших деревьев
2. In-order обход для BST дает отсортированную последовательность
3. Post-order полезен когда нужно обработать дочерние узлы перед родителем

## Структуры данных: внутреннее устройство

### Используемые структуры данных в Tree DFS

В шаблоне Tree DFS используются следующие структуры данных:
- **TreeNode**: Узлы дерева (Box&lt;T&gt; в Rust, указатели в Go)
- **Stack (неявный)**: Стек вызовов для рекурсии или Vec/Stack для итеративного подхода

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

### Stack (Стек)

#### Рекурсивный подход (неявный стек):

**Стек вызовов**:
- Каждый рекурсивный вызов добавляет фрейм в стек
- Глубина стека = высота дерева
- O(h) памяти, где h - высота дерева

**Итеративный подход (явный стек)**:

**Rust Vec&lt;T&gt; как стек**:
```rust
let mut stack = Vec::new();
stack.push(root);
while let Some(node) = stack.pop() {
    // обработка узла
}
```

**Go slice как стек**:
```go
stack := []*TreeNode{root}
for len(stack) > 0 {
    node := stack[len(stack)-1]
    stack = stack[:len(stack)-1]
    // обработка узла
}
```

#### Операции и их сложность:

| Операция | Сложность | Объяснение |
|----------|-----------|------------|
| Push | O(1) амортизированная | Добавление в конец |
| Pop | O(1) | Удаление из конца |
| Обход дерева | O(n) | Посещение всех узлов |

**Почему DFS эффективен**:
- Рекурсивный: простой код, неявный стек
- Итеративный: контроль над стеком, избежание переполнения
- O(n) время для обхода всех узлов

## Глубокое понимание: сложные концепции

### Escape Analysis (Go)

**Для Tree DFS**:
- Узлы дерева в куче
- Стек вызовов на стеке (рекурсия)
- Результаты могут escape

### Borrow Checker (Rust)

**Типичный паттерн**:
```rust
fn dfs(root: Option&lt;Box&lt;TreeNode&gt;&gt;) -> Vec&lt;i32&gt; {
    let mut result = Vec::new();
    dfs_helper(&root, &mut result);
    result
}

fn dfs_helper(node: &Option&lt;Box&lt;TreeNode&gt;&gt;, result: &mut Vec&lt;i32&gt;) {
    if let Some(n) = node {
        result.push(n.val);
        dfs_helper(&n.left, result);
        dfs_helper(&n.right, result);
    }
}
```

### Garbage Collector (Go)

**Для Tree DFS**:
- Узлы дерева в куче
- Стек вызовов на стеке
- Минимальное влияние на GC

### Ownership и Move Semantics (Rust)

**Концепция владения**:
- Каждый `Box&lt;TreeNode&gt;` владеет потомками
- При рекурсии используем ссылки `&Option&lt;Box&lt;TreeNode&gt;&gt;`
- RAII гарантирует освобождение

**Примечание о `Rc&lt;RefCell&lt;T&gt;&gt;`**:

В примерах кода используется `Rc&lt;RefCell&lt;TreeNode&gt;&gt;` вместо `Box&lt;TreeNode&gt;`. Это связано с тем, что в некоторых задачах нужно иметь несколько ссылок на один узел или изменять дерево во время обхода.

- **`Rc&lt;T&gt;`** (Reference Counted): Умный указатель с подсчетом ссылок. Позволяет нескольким владельцам одного значения. Используется когда нужно разделить владение данными.
- **`RefCell&lt;T&gt;`**: Обеспечивает внутреннюю изменяемость (interior mutability). Позволяет изменять данные через неизменяемую ссылку, проверяя правила заимствования во время выполнения (runtime), а не во время компиляции.
- **`Rc&lt;RefCell&lt;T&gt;&gt;`**: Комбинация, которая позволяет иметь несколько владельцев и изменять данные. Используется в задачах на деревья, где узлы могут быть доступны из разных мест.

**Пример использования**:
```rust
let node = Rc::new(RefCell::new(TreeNode::new(5)));
let left = Rc::clone(&node);  // Дополнительная ссылка на тот же узел
node.borrow_mut().val = 10;   // Изменение через RefCell
```

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Рекурсивный обход

В Rust для Tree DFS:
- **Рекурсивный подход**: Стек вызовов - O(h) где h - высота дерева
- **Итеративный подход**: Стек (Vec) - O(h) в куче
- **Результат**: `Vec&lt;i32&gt;` - O(n) для всех значений

#### Go: Рекурсивный обход

В Go:
- **Рекурсивный подход**: Стек вызовов - O(h)
- **Итеративный подход**: Стек (слайс) - O(h) в куче
- **Результат**: `[]int` - O(n) в куче

### Анализ аллокаций для Tree DFS

#### Рекурсивный подход:

**Rust**:
```rust
// Аллокации:
// - Стек вызовов: O(h) где h - высота дерева
// - Результат: Vec&lt;i32&gt; - O(n) в худшем случае
// Итого: O(h) для стека + O(n) для результата
```

**Go**:
```go
// Аллокации:
// - Стек вызовов: O(h)
// - Результат: []int - O(n) в куче
// Итого: O(h) для стека + O(n) для результата
```

#### Итеративный подход:

**Rust**:
```rust
// Аллокации:
// - Стек: Vec&lt;Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;&gt; - O(h) в куче
// - Результат: Vec&lt;i32&gt; - O(n)
// Итого: O(h) + O(n) памяти
```

**Go**:
```go
// Аллокации:
// - Стек: []*TreeNode - O(h) в куче
// - Результат: []int - O(n) в куче
// Итого: O(h) + O(n) памяти
```

### Оптимизация памяти

#### Rust оптимизации:

1. **Использование итеративного подхода для больших деревьев**:
```rust
// ✅ Избегаем переполнения стека
let mut stack = Vec::with_capacity(max_depth);
```

2. **Предварительное выделение результата**:
```rust
// ✅ Предварительное выделение
let mut result = Vec::with_capacity(n);
```

#### Go оптимизации:

1. **Использование итеративного подхода**:
```go
// ✅ Избегаем переполнения стека
stack := make([]*TreeNode, 0, maxDepth)
```

2. **Предварительное выделение результата**:
```go
// ✅ Предварительное выделение
result := make([]int, 0, n)
```

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Рекурсивный | O(h) стек | O(h) стек |
| Итеративный | O(h) + O(n) | O(h) + O(n) |
| Производительность | Предсказуемая | Может быть паузы GC |

## Оптимизация производительности

### Общие техники

1. **Выбор подхода**: Рекурсия для простоты, итерация для больших деревьев
2. **Предварительное выделение**: Для стека и результата
3. **Минимизация аллокаций**: Переиспользование структур

### Специфичные оптимизации для Tree DFS

#### 1. Оптимизация рекурсивного подхода:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub fn inorder_traversal_optimized(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> Vec&lt;i32&gt; {
    let mut result = Vec::new();
    inorder_helper(&root, &mut result);
    result
}

fn inorder_helper(node: &Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;, result: &mut Vec&lt;i32&gt;) {
    if let Some(n) = node {
        let n_ref = n.borrow();
        inorder_helper(&n_ref.left, result);
        result.push(n_ref.val);
        inorder_helper(&n_ref.right, result);
    }
}
```

**Go**:
```go
// ✅ Оптимизированная версия
func inorderTraversalOptimized(root *TreeNode) []int {
    result := make([]int, 0)
    inorderHelper(root, &result)
    return result
}

func inorderHelper(node *TreeNode, result *[]int) {
    if node == nil {
        return
    }
    inorderHelper(node.Left, result)
    *result = append(*result, node.Val)
    inorderHelper(node.Right, result)
}
```

### Оптимизация для Rust

1. **Использование ссылок**:
```rust
// ✅ Передаем ссылки вместо клонирования
fn inorder_helper(node: &Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;, result: &mut Vec&lt;i32&gt;)
```

2. **Предварительное выделение**:
```rust
// ✅ Предварительное выделение
let mut result = Vec::with_capacity(n);
```

### Оптимизация для Go

1. **Передача указателя на слайс**:
```go
// ✅ Избегаем копирования слайса
func inorderHelper(node *TreeNode, result *[]int)
```

2. **Предварительное выделение**:
```go
// ✅ Предварительное выделение
result := make([]int, 0, n)
```

## Профилирование

### Инструменты профилирования

См. раздел "Профилирование" в [Sliding Window](./sliding-window.md#профилирование) для общих инструментов.

### Как профилировать Tree DFS

#### Rust пример:

```rust
// benches/tree_dfs_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_inorder_traversal(c: &mut Criterion) {
    let tree = create_test_tree(1000);
    
    c.bench_function("inorder_1000", |b| {
        b.iter(|| inorder_traversal_optimized(black_box(tree.clone())))
    });
}

criterion_group!(benches, bench_inorder_traversal);
criterion_main!(benches);
```

#### Go пример:

```go
func BenchmarkInorderTraversal(b *testing.B) {
    tree := createTestTree(1000)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        inorderTraversalOptimized(tree)
    }
}
```

### Примеры профилирования

**Анализ производительности**:
- Рекурсивный: O(n) по времени, O(h) для стека
- Итеративный: O(n) по времени, O(h) + O(n) памяти
- Высота дерева определяет размер стека

**Типичные узкие места**:
- Рекурсивные вызовы (может быть переполнение стека)
- Операции со стеком
- Создание векторов для результата

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые деревья
2. **Граничные случаи**: Пустое дерево, один узел, вырожденное дерево
3. **Стресс-тесты**: Большие деревья, глубокие деревья

### Примеры тестов для Tree DFS

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_inorder_basic() {
        let tree = create_tree(vec![Some(1), None, Some(2), Some(3)]);
        let result = inorder_traversal_optimized(tree);
        assert_eq!(result, vec![1, 3, 2]);
    }

    #[test]
    fn test_inorder_empty() {
        let tree = None;
        let result = inorder_traversal_optimized(tree);
        assert_eq!(result, Vec::&lt;i32&gt;::new());
    }
}
```

#### Go тесты:

```go
func TestInorderTraversal(t *testing.T) {
    tests := []struct {
        name string
        tree *TreeNode
        want []int
    }{
        {"basic", createTree([]int{1, -1, 2, 3}), []int{1, 3, 2}},
        {"empty", nil, []int{}},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := inorderTraversalOptimized(tt.tree)
            if !reflect.DeepEqual(result, tt.want) {
                t.Errorf("inorderTraversalOptimized() = %v, want %v", result, tt.want)
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

fn tree_dfs_benchmark(c: &mut Criterion) {
    let sizes = vec![100, 1000, 10000];
    
    let mut group = c.benchmark_group("tree_dfs");
    for size in sizes {
        let tree = create_test_tree(size);
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            &tree,
            |b, tree| {
                b.iter(|| inorder_traversal_optimized(black_box(tree.clone())));
            },
        );
    }
    group.finish();
}
```

#### Go:
```go
func BenchmarkTreeDFSSizes(b *testing.B) {
    sizes := []int{100, 1000, 10000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            tree := createTestTree(size)
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                inorderTraversalOptimized(tree)
            }
        })
    }
}
```

## Примеры задач на LeetCode

### Легкие:
- [Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/) - Максимальная глубина дерева
- [Same Tree](https://leetcode.com/problems/same-tree/) - Одинаковые деревья
- [Symmetric Tree](https://leetcode.com/problems/symmetric-tree/) - Симметричное дерево

### Средние:
- [Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/) - Валидация BST
- [Path Sum](https://leetcode.com/problems/path-sum/) - Сумма пути
- [Construct Binary Tree from Preorder and Inorder Traversal](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/) - Построение дерева

### Сложные:
- [Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/) - Максимальная сумма пути
- [Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) - Сериализация дерева

## Примеры кода

### Rust

```rust
// Примеры использования шаблона Tree DFS на Rust

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

/// Пример 1: Pre-order обход (Корень -> Левое -> Правое)
/// 
/// Задача: Вернуть значения узлов в порядке pre-order
/// Временная сложность: O(n)
/// Пространственная сложность: O(h), где h - высота дерева
pub fn preorder_traversal(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> Vec&lt;i32&gt; {
    let mut result = Vec::new();
    
    // Вспомогательная рекурсивная функция для DFS обхода
    fn dfs(node: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;, result: &mut Vec&lt;i32&gt;) {
        if let Some(n) = node {
            let node_ref = n.borrow();
            // Pre-order: обрабатываем корень ПЕРЕД рекурсивными вызовами
            result.push(node_ref.val);
            // Рекурсивно обходим левое поддерево
            dfs(node_ref.left.clone(), result);
            // Рекурсивно обходим правое поддерево
            dfs(node_ref.right.clone(), result);
        }
        // Базовый случай: если node == None, просто возвращаемся
    }
    
    dfs(root, &mut result);
    result
}

/// Пример 2: In-order обход (Левое -> Корень -> Правое)
/// 
/// Задача: Вернуть значения узлов в порядке in-order
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn inorder_traversal(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> Vec&lt;i32&gt; {
    let mut result = Vec::new();
    
    // Вспомогательная рекурсивная функция для DFS обхода
    fn dfs(node: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;, result: &mut Vec&lt;i32&gt;) {
        if let Some(n) = node {
            let node_ref = n.borrow();
            // In-order: обрабатываем корень МЕЖДУ рекурсивными вызовами
            // Сначала обходим левое поддерево
            dfs(node_ref.left.clone(), result);
            // Затем обрабатываем корень
            result.push(node_ref.val);
            // Наконец обходим правое поддерево
            dfs(node_ref.right.clone(), result);
        }
    }
    
    dfs(root, &mut result);
    result
}

/// Пример 3: Post-order обход (Левое -> Правое -> Корень)
/// 
/// Задача: Вернуть значения узлов в порядке post-order
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn postorder_traversal(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> Vec&lt;i32&gt; {
    let mut result = Vec::new();
    
    // Вспомогательная рекурсивная функция для DFS обхода
    fn dfs(node: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;, result: &mut Vec&lt;i32&gt;) {
        if let Some(n) = node {
            let node_ref = n.borrow();
            // Post-order: обрабатываем корень ПОСЛЕ рекурсивных вызовов
            // Сначала обходим левое поддерево
            dfs(node_ref.left.clone(), result);
            // Затем обходим правое поддерево
            dfs(node_ref.right.clone(), result);
            // Наконец обрабатываем корень (после всех потомков)
            result.push(node_ref.val);
        }
    }
    
    dfs(root, &mut result);
    result
}

/// Пример 4: Максимальная глубина дерева (DFS)
/// 
/// Задача: Найти максимальную глубину бинарного дерева
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn max_depth_dfs(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> i32 {
    match root {
        // Базовый случай: пустое дерево имеет глубину 0
        None => 0,
        Some(node) => {
            let node_ref = node.borrow();
            // Рекурсивно находим глубину левого поддерева
            let left_depth = max_depth_dfs(node_ref.left.clone());
            // Рекурсивно находим глубину правого поддерева
            let right_depth = max_depth_dfs(node_ref.right.clone());
            // Глубина текущего узла = 1 + максимальная глубина поддеревьев
            1 + left_depth.max(right_depth)
        }
    }
}

/// Пример 5: Проверка симметричности дерева
/// 
/// Задача: Определить, является ли дерево симметричным
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn is_symmetric(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> bool {
    // Вспомогательная функция для проверки, являются ли два поддерева зеркальными
    fn is_mirror(
        left: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;,
        right: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;,
    ) -> bool {
        match (left, right) {
            // Оба поддерева пусты - симметричны
            (None, None) => true,
            // Оба поддерева существуют - проверяем значения и рекурсивно
            (Some(l), Some(r)) => {
                let l_ref = l.borrow();
                let r_ref = r.borrow();
                // Значения должны совпадать
                l_ref.val == r_ref.val
                    // Левое поддерево левого узла должно быть зеркальным правому поддереву правого узла
                    && is_mirror(l_ref.left.clone(), r_ref.right.clone())
                    // Правое поддерево левого узла должно быть зеркальным левому поддереву правого узла
                    && is_mirror(l_ref.right.clone(), r_ref.left.clone())
            }
            // Одно поддерево пусто, другое нет - не симметричны
            _ => false,
        }
    }

    match root {
        // Пустое дерево симметрично
        None => true,
        Some(node) => {
            let node_ref = node.borrow();
            // Проверяем, являются ли левое и правое поддеревья зеркальными
            is_mirror(node_ref.left.clone(), node_ref.right.clone())
        }
    }
}

/// Пример 6: Проверка валидности BST
/// 
/// Задача: Определить, является ли дерево валидным бинарным деревом поиска
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn is_valid_bst(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> bool {
    fn validate(
        node: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;,
        min: Option&lt;i32&gt;,
        max: Option&lt;i32&gt;,
    ) -> bool {
        match node {
            None => true,
            Some(n) => {
                let node_ref = n.borrow();
                let val = node_ref.val;

                // Проверяем границы
                if let Some(min_val) = min {
                    if val <= min_val {
                        return false;
                    }
                }
                if let Some(max_val) = max {
                    if val >= max_val {
                        return false;
                    }
                }

                // Рекурсивно проверяем поддеревья
                validate(node_ref.left.clone(), min, Some(val))
                    && validate(node_ref.right.clone(), Some(val), max)
            }
        }
    }

    validate(root, None, None)
}

/// Пример 7: Сумма пути
/// 
/// Задача: Проверить, существует ли путь от корня до листа с заданной суммой
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn has_path_sum(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;, target_sum: i32) -> bool {
    match root {
        None => false,
        Some(node) => {
            let node_ref = node.borrow();
            let remaining = target_sum - node_ref.val;

            // Если это лист и сумма равна цели
            if node_ref.left.is_none() && node_ref.right.is_none() {
                return remaining == 0;
            }

            // Рекурсивно проверяем левое и правое поддеревья
            has_path_sum(node_ref.left.clone(), remaining)
                || has_path_sum(node_ref.right.clone(), remaining)
        }
    }
}

/// Пример 8: Максимальная сумма пути
/// 
/// Задача: Найти максимальную сумму пути в дереве (путь может начинаться и заканчиваться где угодно)
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn max_path_sum(root: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;) -> i32 {
    let mut max_sum = i32::MIN;

    fn dfs(node: Option&lt;Rc&lt;RefCell&lt;TreeNode&gt;&gt;&gt;, max_sum: &mut i32) -> i32 {
        match node {
            None => 0,
            Some(n) => {
                let node_ref = n.borrow();
                let left_sum = dfs(node_ref.left.clone(), max_sum).max(0);
                let right_sum = dfs(node_ref.right.clone(), max_sum).max(0);

                // Текущая максимальная сумма с текущим узлом как корнем
                let current_sum = node_ref.val + left_sum + right_sum;
                *max_sum = (*max_sum).max(current_sum);

                // Возвращаем максимальную сумму пути через текущий узел
                node_ref.val + left_sum.max(right_sum)
            }
        }
    }

    dfs(root, &mut max_sum);
    max_sum
}
```

### Go

```go
package main

import (
	"fmt"
	"math"
)

// Определение узла бинарного дерева
type TreeNode struct {
	Val   int
	Left  *TreeNode
	Right *TreeNode
}

// Пример 1: Pre-order обход (Корень -> Левое -> Правое)
//
// Задача: Вернуть значения узлов в порядке pre-order
// Временная сложность: O(n)
// Пространственная сложность: O(h), где h - высота дерева
func preorderTraversal(root *TreeNode) []int {
	var result []int

	var dfs func(*TreeNode)
	dfs = func(node *TreeNode) {
		if node == nil {
			return
		}
		result = append(result, node.Val)
		dfs(node.Left)
		dfs(node.Right)
	}

	dfs(root)
	return result
}

// Пример 2: In-order обход (Левое -> Корень -> Правое)
//
// Задача: Вернуть значения узлов в порядке in-order
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func inorderTraversal(root *TreeNode) []int {
	var result []int

	var dfs func(*TreeNode)
	dfs = func(node *TreeNode) {
		if node == nil {
			return
		}
		dfs(node.Left)
		result = append(result, node.Val)
		dfs(node.Right)
	}

	dfs(root)
	return result
}

// Пример 3: Post-order обход (Левое -> Правое -> Корень)
//
// Задача: Вернуть значения узлов в порядке post-order
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func postorderTraversal(root *TreeNode) []int {
	var result []int

	var dfs func(*TreeNode)
	dfs = func(node *TreeNode) {
		if node == nil {
			return
		}
		dfs(node.Left)
		dfs(node.Right)
		result = append(result, node.Val)
	}

	dfs(root)
	return result
}

// Пример 4: Максимальная глубина дерева (DFS)
//
// Задача: Найти максимальную глубину бинарного дерева
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func maxDepthDFS(root *TreeNode) int {
	if root == nil {
		return 0
	}

	leftDepth := maxDepthDFS(root.Left)
	rightDepth := maxDepthDFS(root.Right)

	return 1 + max(leftDepth, rightDepth)
}

// Пример 5: Проверка симметричности дерева
//
// Задача: Определить, является ли дерево симметричным
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func isSymmetric(root *TreeNode) bool {
	if root == nil {
		return true
	}

	return isMirror(root.Left, root.Right)
}

func isMirror(left, right *TreeNode) bool {
	if left == nil && right == nil {
		return true
	}
	if left == nil || right == nil {
		return false
	}

	return left.Val == right.Val &&
		isMirror(left.Left, right.Right) &&
		isMirror(left.Right, right.Left)
}

// Пример 6: Проверка валидности BST
//
// Задача: Определить, является ли дерево валидным бинарным деревом поиска
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func isValidBST(root *TreeNode) bool {
	return validate(root, nil, nil)
}

func validate(node *TreeNode, min, max *int) bool {
	if node == nil {
		return true
	}

	val := node.Val

	// Проверяем границы
	if min != nil && val <= *min {
		return false
	}
	if max != nil && val >= *max {
		return false
	}

	// Рекурсивно проверяем поддеревья
	return validate(node.Left, min, &val) &&
		validate(node.Right, &val, max)
}

// Пример 7: Сумма пути
//
// Задача: Проверить, существует ли путь от корня до листа с заданной суммой
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func hasPathSum(root *TreeNode, targetSum int) bool {
	if root == nil {
		return false
	}

	remaining := targetSum - root.Val

	// Если это лист и сумма равна цели
	if root.Left == nil && root.Right == nil {
		return remaining == 0
	}

	// Рекурсивно проверяем левое и правое поддеревья
	return hasPathSum(root.Left, remaining) ||
		hasPathSum(root.Right, remaining)
}

// Пример 8: Максимальная сумма пути
//
// Задача: Найти максимальную сумму пути в дереве (путь может начинаться и заканчиваться где угодно)
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func maxPathSum(root *TreeNode) int {
	maxSum := math.MinInt32

	var dfs func(*TreeNode) int
	dfs = func(node *TreeNode) int {
		if node == nil {
			return 0
		}

		leftSum := max(dfs(node.Left), 0)
		rightSum := max(dfs(node.Right), 0)

		// Текущая максимальная сумма с текущим узлом как корнем
		currentSum := node.Val + leftSum + rightSum
		maxSum = max(maxSum, currentSum)

		// Возвращаем максимальную сумму пути через текущий узел
		return node.Val + max(leftSum, rightSum)
	}

	dfs(root)
	return maxSum
}

// Вспомогательные функции
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
```

## Связанные шаблоны

- **[Tree BFS](./tree-bfs.md)** - Альтернативный подход для обхода деревьев в ширину
- **[Subsets](./subsets.md)** - Использует похожий рекурсивный подход с backtracking
- **[Topological Sort](./topological-sort.md)** - Использует DFS для работы с графами

## Следующий шаг

После изучения Tree DFS рекомендуется перейти к **[Two Heaps](./two-heaps.md)** для изучения продвинутых структур данных или к **[Subsets](./subsets.md)** для изучения комбинаторных задач.

## Дополнительные ресурсы

- [Binary Tree Traversal - LeetCode Tag](https://leetcode.com/tag/tree/) - Коллекция задач на деревья
- [Depth-First Search - GeeksforGeeks](https://www.geeksforgeeks.org/depth-first-search-or-dfs-for-a-graph/) - Подробное объяснение алгоритма DFS
- [Tree Traversal - Wikipedia](https://en.wikipedia.org/wiki/Tree_traversal) - Теория обхода деревьев (Pre-order, In-order, Post-order)

