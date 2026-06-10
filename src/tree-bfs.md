# 🌳 Tree BFS (Обход дерева в ширину)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Tree BFS <span class="algo-hero__ru">Обход в ширину</span></div>
    <div class="algo-hero__tag">Уровень за уровнем через очередь (FIFO): ближние раньше дальних</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Время</span><b>O(n)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(w)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>обработать узлы <b>по уровням</b> (вывод построчно, среднее уровня)</li>
      <li>вид справа/слева, зигзаг, ширина уровня</li>
      <li>кратчайший путь по числу рёбер (минимальная глубина)</li>
      <li>важен порядок обнаружения узлов слева направо</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>значение узла зависит от поддеревьев (нужен DFS/post-order)</li>
      <li>ищем путь от корня до листа</li>
      <li>дерево очень широкое — очередь до O(n/2)</li>
      <li>нужна память O(h), а не O(w)</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> слова <b>«по уровням», «level order», «построчно»</b> · «вид справа», «зигзаг», «минимальная глубина», «среднее уровня» · «кратчайший путь по рёбрам».</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li>узлы живут в <b>очереди</b> (FIFO): извлекаем из начала, детей кладём в конец;</li>
      <li>зафиксируй <code>levelSize := len(queue)</code> до внутреннего цикла — иначе границы уровней «съедут»;</li>
      <li>проверяй <code>node.Left != nil</code> перед добавлением, чтобы не положить nil;</li>
      <li>порядок гарантированно слева направо, уровень за уровнем.</li>
    </ul>
    <p>FIFO — суть BFS: чтение с конца превратит обход в DFS.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация.** Узлы подсвечиваются в порядке обхода в ширину, уровень за
> уровнем (синий — текущий, зелёные — посещённые). Справа — код с подсветкой строки и переменные
> (порядок обхода), внизу — кликабельные шаги. Можно подставить своё дерево (уровни, `null` = пусто)
> и нажать «⟲ Запустить». (Виджет работает в собранной книге `mdbook serve`/`mdbook build`, а не
> при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="tree-bfs" data-tree="1,2,3,4,5,null,6"></div>

## ⚡ Шаблон для собеседования

```go
queue := []*TreeNode{root}
for len(queue) > 0 {
    levelSize := len(queue)       // снимок размера уровня!
    for i := 0; i < levelSize; i++ {
        node := queue[0]
        queue = queue[1:]         // dequeue из начала
        // ... обрабатываем node.Val ...
        if node.Left != nil { queue = append(queue, node.Left) }
        if node.Right != nil { queue = append(queue, node.Right) }
    }
}
```

1. кладём корень в очередь;
2. фиксируем `levelSize` — сколько узлов на текущем уровне;
3. обрабатываем ровно столько, добавляя детей в конец;
4. повторяем, пока очередь не пуста.

## 📖 Разбор

<details class="algo-details">
<summary>Теория, обход по уровням и сложность</summary>

**Tree BFS** (Breadth-First Search) обходит дерево уровень за уровнем: все узлы
уровня `k` обрабатываются прежде, чем алгоритм перейдёт к уровню `k+1`. Узлы хранятся
в **очереди** (FIFO): добавляем в конец, извлекаем из начала — это естественным образом
задаёт порядок «сначала ближние, потом дальние».

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

#### Сложность

| Метрика | Значение                                        |
|---------|--------------------------------------------------|
| Время   | O(n) — каждый узел добавляется и извлекается один раз |
| Память  | O(w), где w — максимальная ширина дерева (до n/2) |

</details>

## 🧠 Почему это корректно

### Почему уровни не «съезжают»

В момент снимка `levelSize := len(queue)` очередь содержит **ровно узлы текущего
уровня**. Извлекая именно столько, мы опустошаем уровень, а добавленные за это время
дети образуют **следующий** уровень — и попадут в свой снимок на следующей итерации.
Без фиксации размера дети текущего уровня смешались бы с ним, и границы поехали.

### Почему дереву не нужен `visited`

В отличие от [BFS по графу](graphs.md), дереву не нужна пометка посещённого: в дереве
**нет циклов** и у каждого узла ровно один родитель, поэтому повторно в узел не зайти.
Первое достижение узла — на его минимальной глубине, поэтому BFS естественно решает
задачи на минимальную глубину и «вид сбоку».

## ⚙️ Цена на практике

### Память `O(w)` против `O(h)` у DFS

BFS держит в очереди целый уровень — до `~n/2` узлов в последнем уровне полного дерева
(`O(w)`, ширина). [DFS](tree-dfs.md) тратит `O(h)` (высота). Поэтому: широкое мелкое
дерево дешевле обходить DFS, а узкие задачи «по уровням / ближайший узел» — это BFS.

### Очередь срезом

`queue = queue[1:]` не освобождает начало нижележащего массива (как и в
[графах](graphs.md)) — на огромных деревьях веди индекс головы по фиксированному срезу.

## ⚠️ Типичные ошибки

1. **Не зафиксирован размер уровня** — `levelSize` нужно взять до внутреннего цикла,
   иначе добавленные дети попадут в текущий уровень.
2. **Добавление nil в очередь** — проверяйте `node.Left != nil` и `node.Right != nil`
   перед `append`, иначе при dequeue получите разыменование nil.
3. **Не обработан пустой корень** — при `root == nil` возвращайте `[][]int{}`, не входя в цикл.
4. **Извлечение не из того конца** — BFS требует FIFO (`queue[0]`); чтение с конца
   превратит обход в DFS.
5. **DFS вместо BFS для уровней** — рекурсия с передачей уровня тоже даёт группировку,
   но BFS нагляднее и гарантирует порядок слева направо без лишней логики.

## 🧩 Задачи

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

## 🔗 Связанные шаблоны

- **[Tree DFS](tree-dfs.md)** — обход в глубину; память O(h) вместо O(w), удобен для
  задач на пути и свойства поддеревьев.
- **[Topological Sort](topological-sort.md)** — BFS по графу (алгоритм Кана).
- По работе с памятью и профилированию в Go см. [приложение](appendix-go-memory.md).
