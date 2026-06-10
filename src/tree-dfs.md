# 🌲 Tree DFS (Обход дерева в глубину)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Tree DFS <span class="algo-hero__ru">Обход в глубину</span></div>
    <div class="algo-hero__tag">Вглубь по ветви до конца · pre / in / post-order рекурсией</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Время</span><b>O(n)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(h)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>обойти все узлы или найти путь от корня до листа</li>
      <li>значение узла зависит от поддеревьев (сумма, высота, диаметр)</li>
      <li>проверка свойств: симметричность, валидность BST</li>
      <li>in-order по BST даёт отсортированную последовательность</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>нужна обработка строго по уровням (тогда BFS)</li>
      <li>кратчайший путь по числу рёбер (BFS короче)</li>
      <li>дерево вырождено в список — глубина n, риск переполнения стека</li>
      <li>важна минимальная глубина первого листа</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«путь от корня до листа», «сумма/высота/диаметр поддерева»</b> · «валидный BST», «симметричное дерево», «inorder» · значение узла считается из детей.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни (момент записи узла)</div>
    <ul>
      <li><b>Pre-order</b> (корень → левое → правое) — запись ДО рекурсии;</li>
      <li><b>In-order</b> (левое → корень → правое) — запись МЕЖДУ; для BST это сортировка;</li>
      <li><b>Post-order</b> (левое → правое → корень) — запись ПОСЛЕ; узел после всех потомков;</li>
      <li>всегда первым делом базовый случай <code>if node == nil { return }</code>.</li>
    </ul>
    <p>Все три обхода — это один и тот же код, отличается лишь момент `append(node.Val)` относительно двух рекурсивных вызовов.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация (preorder).** Узлы подсвечиваются в порядке обхода в глубину:
> корень → левое поддерево → правое (синий — текущий, зелёные — посещённые). Справа — код с
> подсветкой строки и переменные, внизу — кликабельные шаги. Можно подставить своё дерево
> (уровни, `null` = пусто) и нажать «⟲ Запустить». (Виджет работает в собранной книге
> `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="tree-dfs" data-tree="1,2,3,4,5,null,6"></div>

## ⚡ Шаблон для собеседования

```go
var dfs func(*TreeNode)
dfs = func(node *TreeNode) {
    if node == nil { // базовый случай — всегда первым
        return
    }
    // preorder:  обработать node.Val ЗДЕСЬ
    dfs(node.Left)
    // inorder:   ... или ЗДЕСЬ
    dfs(node.Right)
    // postorder: ... или ЗДЕСЬ
}
dfs(root)
```

1. база: `node == nil → return`;
2. место `append(node.Val)` задаёт тип обхода;
3. рекурсия в левое и правое поддерево;
4. для очень глубоких деревьев — итеративный обход со стеком.

## 📖 Разбор

<details class="algo-details">
<summary>Теория, три обхода (pre/in/post-order) и сложность</summary>

**Tree DFS** (Depth-First Search) идёт вглубь по каждой ветви до конца, прежде чем
вернуться и перейти к следующей. Рекурсивная природа дерева (корень + поддеревья)
естественно ложится на рекурсию; неявный стек вызовов хранит путь от корня. Порядок
обработки корня относительно поддеревьев задаёт три варианта обхода:

- **Pre-order**: корень → левое → правое (копирование дерева, префиксные выражения);
- **In-order**: левое → корень → правое (для BST даёт **отсортированную** последовательность);
- **Post-order**: левое → правое → корень (удаление дерева, постфиксные выражения).

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
        if node == nil {
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

Для дерева выше три обхода дают:

```
Pre-order  (корень→левое→правое):  1 → 2 → 4 → 5 → 3 → 6
In-order   (левое→корень→правое):  4 → 2 → 5 → 1 → 6 → 3
Post-order (левое→правое→корень):  4 → 5 → 2 → 6 → 3 → 1
```

Для очень глубоких деревьев рекурсия рискует переполнить стек — тогда используют
итеративный обход с явным стеком `[]*TreeNode`.

#### Сложность

| Метрика | Значение                                                  |
|---------|------------------------------------------------------------|
| Время   | O(n) — каждый узел посещается один раз                     |
| Память  | O(h), где h — высота дерева (O(log n) сбалансированное, O(n) линейное) |

</details>

## 🧠 Почему это корректно

### Рекурсия — это неявный стек пути

Стек вызовов хранит путь от корня до текущего узла, глубина — `O(h)`. Как и
[дереву в BFS](tree-bfs.md), DFS **не нужен `visited`**: нет циклов, один родитель.

### Порядок обхода выбирают по зависимости данных

Три обхода отличаются лишь моментом записи — но выбор не косметический, а по тому,
**когда результат узла готов**:

- **in-order на BST даёт отсортированную последовательность** — потому что по инварианту
  BST всё левое поддерево `<` узла `<` всего правого; записав левое → узел → правое,
  получаем возрастание;
- **post-order** — когда результат узла зависит от детей (сумма/высота поддерева,
  удаление: сначала освободить детей);
- **pre-order** — когда родителя надо обработать до детей (сериализация, копирование,
  путь от корня).

Подбор обхода под зависимость — и есть инженерная часть, а не «какой попало».

## ⚙️ Цена на практике

### Стек `O(h)` — риск на вырожденном дереве

Сбалансированное дерево → `O(log n)` стека, но «бамбук» (список) → `O(n)` и **риск
переполнения**. На потенциально вырожденных деревьях — итеративный обход с явным стеком
`[]*TreeNode`. Совсем без доп. памяти (`O(1)`) обходит дерево алгоритм **Морриса**
(временное «прошивание» ссылок) — продвинутый вариант, когда память критична.

## ⚠️ Типичные ошибки

1. **Забыт базовый случай** — без проверки `node == nil` рекурсия разыменует nil-указатель.
2. **Неправильный момент записи узла** — место `append` относительно `dfs(node.Left)` и
   `dfs(node.Right)` определяет тип обхода; перепутали — получили не тот порядок.
3. **Переполнение стека на глубоком дереве** — вырожденное в список дерево даёт глубину n;
   используйте итеративный обход со стеком.
4. **Модификация дерева во время обхода** — меняет структуру под рекурсией и ломает её.
5. **Неверная инициализация для путей** — при максимальной сумме пути с отрицательными
   значениями начинайте с `math.MinInt`, а не с 0.

## 🧩 Задачи

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

**Тренажёр** — пакет `treedfs`:

```bash
cd exercises
go test ./treedfs/                 # ваши решения
go test -tags solution ./treedfs/  # эталон
```

Реализуйте `PreorderTraversal`, `InorderTraversal`, `PostorderTraversal`
(три обхода), `MaxDepth` (максимальная глубина), `HasPathSum` (путь
с заданной суммой) и `DiameterOfTree` (диаметр).

## 🔗 Связанные шаблоны

- **[Tree BFS](tree-bfs.md)** — обход по уровням; память O(w), удобен для задач на
  уровни и кратчайший путь по рёбрам.
- **[Reverse Linked List](reverse-linked-list.md)** — рекурсия и манипуляции с указателями.
- По работе с памятью и профилированию в Go см. [приложение](appendix-go-memory.md).
