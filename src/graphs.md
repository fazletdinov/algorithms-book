# Graphs (Обход графов)

## Описание шаблона

**Граф** — это набор **вершин** (узлов), соединённых **рёбрами**. В отличие от дерева,
граф может содержать циклы, несколько компонент и любое число рёбер у вершины. Деревья
([Tree BFS](tree-bfs.md), [Tree DFS](tree-dfs.md)) и [топологическая
сортировка](topological-sort.md) — частные случаи работы с графами.

Большинство «графовых» задач сводятся к **обходу**: систематически посетить вершины,
не зайдя в одну дважды. Два базовых обхода — **BFS** (в ширину, очередь) и **DFS**
(в глубину, стек/рекурсия) — плюс структура **Union-Find** для задач о связности.

### Представление графа

Чаще всего используют **список смежности** — для каждой вершины храним список соседей:

```go
// n вершин, edges — список рёбер [u, v]
func buildAdjacency(n int, edges [][]int, directed bool) [][]int {
    adj := make([][]int, n)
    for _, e := range edges {
        u, v := e[0], e[1]
        adj[u] = append(adj[u], v)
        if !directed {
            adj[v] = append(adj[v], u) // для неориентированного — ребро в обе стороны
        }
    }
    return adj
}
```

| Представление        | Память   | Проверка ребра (u,v) | Обход соседей |
|----------------------|----------|----------------------|---------------|
| Список смежности     | O(V + E) | O(deg(u))            | O(deg(u))     |
| Матрица смежности    | O(V²)    | O(1)                 | O(V)          |

Список смежности предпочтителен для **разреженных** графов (E ≪ V²) — это почти все
задачи на собеседованиях.

## Когда применять

- Найти путь / достижимость между вершинами.
- Подсчитать **компоненты связности**, «острова», группы.
- Обнаружить **цикл**.
- Кратчайший путь в **невзвешенном** графе (BFS считает расстояния по уровням).

## BFS и DFS

```go
// BFS: обход по уровням от стартовой вершины
func bfs(adj [][]int, start int) []int {
    visited := make([]bool, len(adj))
    order := []int{}
    queue := []int{start}
    visited[start] = true
    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]
        order = append(order, node)
        for _, next := range adj[node] {
            if !visited[next] {
                visited[next] = true // помечаем ПРИ добавлении в очередь
                queue = append(queue, next)
            }
        }
    }
    return order
}

// DFS: рекурсивный обход в глубину
func dfs(adj [][]int, node int, visited []bool, order *[]int) {
    visited[node] = true
    *order = append(*order, node)
    for _, next := range adj[node] {
        if !visited[next] {
            dfs(adj, next, visited, order)
        }
    }
}
```

> ⚠️ **Ключевой момент:** массив `visited` обязателен — без него обход зациклится на
> графе с циклами. В BFS вершину помечают посещённой **в момент добавления в очередь**,
> а не извлечения, иначе она попадёт в очередь несколько раз.

### Подсчёт компонент связности

Запускаем обход из каждой ещё не посещённой вершины — число запусков равно числу
компонент:

```go
func countComponents(n int, edges [][]int) int {
    adj := buildAdjacency(n, edges, false)
    visited := make([]bool, n)
    count := 0
    for i := 0; i < n; i++ {
        if !visited[i] {
            count++
            var order []int
            dfs(adj, i, visited, &order)
        }
    }
    return count
}
```

## Union-Find (система непересекающихся множеств, DSU)

**Union-Find** отвечает на вопрос «в одной ли группе две вершины» почти за O(1).
Идеален для динамической связности и обнаружения циклов в неориентированном графе.

```go
type UnionFind struct{ parent, rank []int }

func NewUnionFind(n int) *UnionFind {
    uf := &UnionFind{parent: make([]int, n), rank: make([]int, n)}
    for i := range uf.parent {
        uf.parent[i] = i // каждая вершина — свой корень
    }
    return uf
}

// Find с сжатием пути (path compression)
func (uf *UnionFind) Find(x int) int {
    for uf.parent[x] != x {
        uf.parent[x] = uf.parent[uf.parent[x]] // подвешиваем ближе к корню
        x = uf.parent[x]
    }
    return x
}

// Union по рангу; возвращает false, если x и y уже в одном множестве
func (uf *UnionFind) Union(x, y int) bool {
    rx, ry := uf.Find(x), uf.Find(y)
    if rx == ry {
        return false
    }
    if uf.rank[rx] < uf.rank[ry] {
        rx, ry = ry, rx
    }
    uf.parent[ry] = rx
    if uf.rank[rx] == uf.rank[ry] {
        uf.rank[rx]++
    }
    return true
}
```

С обеими оптимизациями (сжатие пути + объединение по рангу) амортизированная сложность
операции — O(α(n)), где α — обратная функция Аккермана, практически константа.

**Обнаружение цикла в неориентированном графе:** если оба конца ребра уже в одном
множестве — ребро замыкает цикл.

```go
func hasCycle(n int, edges [][]int) bool {
    uf := NewUnionFind(n)
    for _, e := range edges {
        if !uf.Union(e[0], e[1]) {
            return true
        }
    }
    return false
}
```

## Обнаружение цикла в ориентированном графе

Union-Find для ориентированных графов не годится. Используют DFS с тремя состояниями
(белый/серый/чёрный): если в процессе обхода встретили **серую** (ещё обрабатываемую)
вершину — есть цикл. Это та же идея, что лежит в основе
[топологической сортировки](topological-sort.md): граф топологически сортируем тогда и
только тогда, когда в нём нет циклов.

## Временная и пространственная сложность

| Операция                       | Время      | Память   |
|--------------------------------|------------|----------|
| BFS / DFS (список смежности)   | O(V + E)   | O(V)     |
| Компоненты связности           | O(V + E)   | O(V)     |
| Union-Find (на операцию)       | O(α(n)) ≈ O(1) | O(V) |

## Визуализация

> 💡 **Интерактивная демонстрация.** Нажимайте «▶»: жёлтая вершина — текущая
> (извлечённая из очереди), синие — уже посещённые. Видно, как BFS расходится волной
> по уровням от старта. (Виджет работает в собранной книге `mdbook serve`/`mdbook build`,
> а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="graph-bfs" data-nodes="0,1,2,3,4,5" data-edges="0-1,0-2,1-3,2-3,2-4,4-5" data-start="0"></div>

## Типичные ошибки

1. **Забыли `visited`** — на графе с циклом обход уходит в бесконечность.
2. **В BFS помечают при извлечении, а не при добавлении** — вершина дублируется в очереди.
3. **Для неориентированного графа добавили ребро только в одну сторону** — половина
   связей теряется.
4. **Глубокая рекурсия DFS** на большом графе — переполнение стека; для таких случаев
   используйте итеративный DFS со своим стеком.
5. **Изолированные вершины** — не забывайте, что вершина без рёбер это отдельная
   компонента.

## Примеры задач на LeetCode

### Средние
- [Number of Islands](https://leetcode.com/problems/number-of-islands/) — компоненты на сетке
- [Number of Connected Components in an Undirected Graph](https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/)
- [Graph Valid Tree](https://leetcode.com/problems/graph-valid-tree/) — связность + отсутствие цикла
- [Course Schedule](https://leetcode.com/problems/course-schedule/) — цикл в ориентированном графе
- [Rotting Oranges](https://leetcode.com/problems/rotting-oranges/) — многоисточниковый BFS

### Сложные
- [Word Ladder](https://leetcode.com/problems/word-ladder/) — кратчайший путь через BFS
- [Redundant Connection](https://leetcode.com/problems/redundant-connection/) — Union-Find
- [Accounts Merge](https://leetcode.com/problems/accounts-merge/) — Union-Find

## Упражнения

В [Go-тренажёре](https://github.com/fazletdinov/algorithms-book/tree/main/exercises)
есть пакет `graphs`:

```bash
cd exercises
go test ./graphs/                 # ваши решения
go test -tags solution ./graphs/  # эталон
```

Реализуйте `CountComponents` (обход) и `HasCycleUndirected` (Union-Find).

## Связанные шаблоны

- **[Tree BFS](tree-bfs.md)** / **[Tree DFS](tree-dfs.md)** — обход деревьев как
  частный случай графа без циклов.
- **[Topological Sort](topological-sort.md)** — линейный порядок вершин ориентированного
  ациклического графа (DAG).
