# Tree DFS (Обход дерева в глубину)

## Теория

**Tree DFS** (Depth-First Search) идёт вглубь по каждой ветви до конца, прежде чем
вернуться и перейти к следующей. Рекурсивная природа дерева (корень + поддеревья)
естественно ложится на рекурсию; неявный стек вызовов хранит путь от корня. Порядок
обработки корня относительно поддеревьев задаёт три варианта обхода:

- **Pre-order**: корень → левое → правое (копирование дерева, префиксные выражения);
- **In-order**: левое → корень → правое (для BST даёт **отсортированную** последовательность);
- **Post-order**: левое → правое → корень (удаление дерева, постфиксные выражения).

**Когда применять:**

- нужно обойти все узлы или найти путь от корня до листа;
- проверяются свойства дерева (симметричность, валидность BST);
- значение узла зависит от результатов поддеревьев (сумма, высота, путь).

## Алгоритм

Все три обхода отличаются только моментом записи `node.Val` относительно рекурсивных
вызовов.

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

// Pre-order: корень → левое → правое
func preorderTraversal(root *TreeNode) []int {
    result := []int{}

    var dfs func(*TreeNode)
    dfs = func(node *TreeNode) {
        if node == nil { // базовый случай
            return
        }
        result = append(result, node.Val) // обрабатываем ДО рекурсии
        dfs(node.Left)
        dfs(node.Right)
    }

    dfs(root)
    return result
}

// In-order: левое → корень → правое
func inorderTraversal(root *TreeNode) []int {
    result := []int{}

    var dfs func(*TreeNode)
    dfs = func(node *TreeNode) {
        if node == nil {
            return
        }
        dfs(node.Left)
        result = append(result, node.Val) // обрабатываем МЕЖДУ рекурсиями
        dfs(node.Right)
    }

    dfs(root)
    return result
}

// Post-order: левое → правое → корень
func postorderTraversal(root *TreeNode) []int {
    result := []int{}

    var dfs func(*TreeNode)
    dfs = func(node *TreeNode) {
        if node == nil {
            return
        }
        dfs(node.Left)
        dfs(node.Right)
        result = append(result, node.Val) // обрабатываем ПОСЛЕ рекурсии
    }

    dfs(root)
    return result
}
```

Для очень глубоких деревьев рекурсия рискует переполнить стек — тогда используют
итеративный обход с явным стеком `[]*TreeNode`.

### Сложность

| Метрика | Значение                                                  |
|---------|------------------------------------------------------------|
| Время   | O(n) — каждый узел посещается один раз                     |
| Память  | O(h), где h — высота дерева (O(log n) сбалансированное, O(n) линейное) |

## Визуализация

> 💡 **Интерактивная демонстрация.** Нажимайте «▶»: узлы подсвечиваются в порядке
> обхода в глубину (preorder: корень → левое поддерево → правое). (Виджет работает в
> собранной книге `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="tree-dfs" data-tree="1,2,3,4,5,null,6"></div>

Дерево:

```
        1
       / \
      2   3
     / \   \
    4   5   6
```

Один и тот же обход, разный момент записи узла:

```
Pre-order  (корень→левое→правое):  1 → 2 → 4 → 5 → 3 → 6
In-order   (левое→корень→правое):  4 → 2 → 5 → 1 → 6 → 3
Post-order (левое→правое→корень):  4 → 5 → 2 → 6 → 3 → 1
```

Трассировка post-order: спускаемся к листу 4, записываем его; затем 5; возвращаемся в 2
и записываем его (оба ребёнка готовы); далее правое поддерево даёт 6, потом 3; в конце —
корень 1. Так post-order всегда обрабатывает узел только после всех его потомков.

## Типичные ошибки

1. **Забыт базовый случай** — без проверки `node == nil` рекурсия разыменует nil-указатель.
2. **Неправильный момент записи узла** — место `append` относительно `dfs(node.Left)` и
   `dfs(node.Right)` определяет тип обхода; перепутали — получили не тот порядок.
3. **Переполнение стека на глубоком дереве** — вырожденное в список дерево даёт глубину n;
   используйте итеративный обход со стеком.
4. **Модификация дерева во время обхода** — меняет структуру под рекурсией и ломает её.
5. **Неверная инициализация для путей** — при максимальной сумме пути с отрицательными
   значениями начинайте с `math.MinInt`, а не с 0.

## Задачи

**LeetCode:**

- [Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/)
- [Same Tree](https://leetcode.com/problems/same-tree/)
- [Symmetric Tree](https://leetcode.com/problems/symmetric-tree/)
- [Binary Tree Inorder Traversal](https://leetcode.com/problems/binary-tree-inorder-traversal/)
- [Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/)
- [Path Sum](https://leetcode.com/problems/path-sum/)
- [Lowest Common Ancestor of a Binary Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/)
- [Construct Binary Tree from Preorder and Inorder Traversal](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/)
- [Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/) (сложная)
- [Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) (сложная)

## Связанные шаблоны

- **[Tree BFS](tree-bfs.md)** — обход по уровням; память O(w) вместо O(h), нужен для
  задач на уровни и кратчайший путь.
- **[Subsets](subsets.md)** — тот же рекурсивный каркас с backtracking.
- **[Topological Sort](topological-sort.md)** — DFS по графу с post-order порядком.
- По работе со стеком, памятью и профилированию в Go см. [приложение](appendix-go-memory.md).
