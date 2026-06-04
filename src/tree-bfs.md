# Tree BFS (Обход дерева в ширину)

## Теория

**Tree BFS** (Breadth-First Search) обходит дерево уровень за уровнем: все узлы
уровня `k` обрабатываются прежде, чем алгоритм перейдёт к уровню `k+1`. Узлы хранятся
в **очереди** (FIFO): добавляем в конец, извлекаем из начала — это естественным образом
задаёт порядок «сначала ближние, потом дальние».

**Когда применять:**

- нужно обработать узлы по уровням (вывод по строкам, среднее уровня, вид справа);
- ищется кратчайший путь по числу рёбер (минимальная глубина);
- задача связана с шириной дерева или порядком обнаружения узлов.

## Алгоритм

Кладём корень в очередь. На каждой итерации фиксируем размер текущего уровня
`levelSize` и обрабатываем ровно столько узлов, добавляя их детей в конец очереди для
следующего уровня.

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

// Обход по уровням: значения узлов, сгруппированные по уровням
func levelOrder(root *TreeNode) [][]int {
    if root == nil {
        return [][]int{}
    }

    queue := []*TreeNode{root}
    result := [][]int{}

    for len(queue) > 0 {
        levelSize := len(queue)               // сколько узлов на текущем уровне
        level := make([]int, 0, levelSize)

        for i := 0; i < levelSize; i++ {
            node := queue[0]
            queue = queue[1:]                 // dequeue из начала
            level = append(level, node.Val)

            if node.Left != nil {             // детей кладём в конец
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

Фиксация `levelSize` до начала внутреннего цикла критична: во время обработки уровня мы
добавляем детей в ту же очередь, и без снимка размера границы уровней «съедут».

### Сложность

| Метрика | Значение                                        |
|---------|--------------------------------------------------|
| Время   | O(n) — каждый узел добавляется и извлекается один раз |
| Память  | O(w), где w — максимальная ширина дерева (до n/2) |

## Визуализация

> 💡 **Интерактивная демонстрация.** Нажимайте «▶»: узлы подсвечиваются в порядке
> обхода в ширину, уровень за уровнем. (Виджет работает в собранной книге
> `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="tree-bfs" data-tree="1,2,3,4,5,null,6"></div>

Разбор для дерева:

```
        1
       / \
      2   3
     / \   \
    4   5   6
```

```
Очередь: [1]          уровень 0 → [1],         добавили 2, 3
Очередь: [2, 3]       уровень 1 → [2, 3],      добавили 4, 5, 6
Очередь: [4, 5, 6]    уровень 2 → [4, 5, 6],   детей нет
```

Результат: `[[1], [2, 3], [4, 5, 6]]`, порядок обхода **1 → 2 → 3 → 4 → 5 → 6**.

## Типичные ошибки

1. **Не зафиксирован размер уровня** — `levelSize` нужно взять до внутреннего цикла,
   иначе добавленные дети попадут в текущий уровень.
2. **Добавление nil в очередь** — проверяйте `node.Left != nil` и `node.Right != nil`
   перед `append`, иначе при dequeue получите разыменование nil.
3. **Не обработан пустой корень** — при `root == nil` возвращайте `[][]int{}`, не входя в цикл.
4. **Извлечение не из того конца** — BFS требует FIFO (`queue[0]`); чтение с конца
   превратит обход в DFS.
5. **DFS вместо BFS для уровней** — рекурсия с передачей уровня тоже даёт группировку,
   но BFS нагляднее и гарантирует порядок слева направо без лишней логики.

## Задачи

**LeetCode:**

- [Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/)
- [Average of Levels in Binary Tree](https://leetcode.com/problems/average-of-levels-in-binary-tree/)
- [Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/)
- [Binary Tree Zigzag Level Order Traversal](https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/)
- [Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/)
- [Cousins in Binary Tree](https://leetcode.com/problems/cousins-in-binary-tree/)
- [Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) (сложная)

**Тренажёр** — пакет `treebfs`:

```bash
cd exercises
go test ./treebfs/                 # ваши решения
go test -tags solution ./treebfs/  # эталон
```

Реализуйте `LevelOrder` (по уровням), `ZigzagLevelOrder` (змейкой), `RightSideView` (вид справа), `LevelAverages` (среднее по уровням) и `MinDepth` (минимальная глубина).

## Связанные шаблоны

- **[Tree DFS](tree-dfs.md)** — обход в глубину; память O(h) вместо O(w), удобен для
  задач на пути и свойства поддеревьев.
- **[Topological Sort](topological-sort.md)** — BFS по графу (алгоритм Кана).
- По работе с памятью и профилированию в Go см. [приложение](appendix-go-memory.md).
