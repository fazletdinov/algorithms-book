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

## Алгоритм/Подход

### Три типа обхода:

1. **Pre-order (Прямой обход)**: Корень → Левое поддерево → Правое поддерево
2. **In-order (Симметричный обход)**: Левое поддерево → Корень → Правое поддерево
3. **Post-order (Обратный обход)**: Левое поддерево → Правое поддерево → Корень

### Рекурсивный подход:

1. **Базовый случай**: Если узел равен `None`, вернитесь
2. **Обработка**: Обработайте текущий узел (в зависимости от типа обхода)
3. **Рекурсия**: Рекурсивно обработайте левое и правое поддеревья

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

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Рекурсивный обход

В Rust для Tree DFS:
- **Рекурсивный подход**: Стек вызовов - O(h) где h - высота дерева
- **Итеративный подход**: Стек (Vec) - O(h) в куче
- **Результат**: `Vec<i32>` - O(n) для всех значений

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
// - Результат: Vec<i32> - O(n) в худшем случае
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
// - Стек: Vec<Option<Rc<RefCell<TreeNode>>>> - O(h) в куче
// - Результат: Vec<i32> - O(n)
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
pub fn inorder_traversal_optimized(root: Option<Rc<RefCell<TreeNode>>>) -> Vec<i32> {
    let mut result = Vec::new();
    inorder_helper(&root, &mut result);
    result
}

fn inorder_helper(node: &Option<Rc<RefCell<TreeNode>>>, result: &mut Vec<i32>) {
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
fn inorder_helper(node: &Option<Rc<RefCell<TreeNode>>>, result: &mut Vec<i32>)
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

См. раздел "Профилирование" в [Sliding Window](./sliding-window/README.md#профилирование) для общих инструментов.

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
        assert_eq!(result, Vec::<i32>::new());
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

## Примеры кода

См. файлы:
- [Rust примеры](./rust/examples.rs)
- [Go примеры](./go/examples.go)

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

См. файлы:
- [Rust примеры](./rust/examples.rs)
- [Go примеры](./go/examples.go)

