# 🕸️ Graphs (Обход графов)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Graphs <span class="algo-hero__ru">Обход графов</span></div>
    <div class="algo-hero__tag">BFS / DFS, компоненты связности, Union-Find</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Время</span><b>O(V+E)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(V)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>путь / достижимость между вершинами</li>
      <li>число <b>компонент связности</b>, «островов», групп</li>
      <li>обнаружить цикл</li>
      <li>кратчайший путь по числу рёбер (BFS)</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>взвешенный кратчайший путь → Дейкстра / Bellman–Ford</li>
      <li>порядок зависимостей в DAG → топосортировка</li>
      <li>данные не образуют граф</li>
      <li>достаточно простого прохода по массиву</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«вершины и рёбра», «связаны ли», «острова», «компоненты», «можно ли дойти»</b> · сетка как граф · «граф зависимостей».</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li><b>BFS</b> (очередь) — обход по слоям, кратчайший путь по рёбрам; <b>DFS</b> (рекурсия/стек) — вглубь;</li>
      <li><code>visited</code> <b>обязателен</b> — иначе обход зациклится на графе с циклом;</li>
      <li>в BFS помечай вершину <b>при добавлении</b> в очередь, не при извлечении;</li>
      <li>компоненты связности = число запусков обхода из непосещённых вершин;</li>
      <li><b>Union-Find</b> — «в одной ли группе» почти за O(1), ловит цикл в неориентированном графе.</li>
    </ul>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация.** Жёлтая вершина — текущая (извлечённая из очереди), синие —
> посещённые. BFS расходится волной по уровням от старта. Справа — код с подсветкой строки и
> переменные (очередь, порядок), внизу — кликабельные шаги. (Виджет работает в собранной книге
> `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="graph-bfs" data-nodes="0,1,2,3,4,5" data-edges="0-1,0-2,1-3,2-3,2-4,4-5" data-start="0"></div>

## ⚡ Шаблон для собеседования

```go
// BFS по списку смежности
func bfs(adj [][]int, start int) []int {
    visited := make([]bool, len(adj))
    queue := []int{start}
    visited[start] = true
    var order []int
    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]
        order = append(order, node)
        for _, next := range adj[node] {
            if !visited[next] {
                visited[next] = true // помечаем ПРИ добавлении
                queue = append(queue, next)
            }
        }
    }
    return order
}
```

1. `visited[start] = true`, кладём старт в очередь;
2. извлекаем вершину, добавляем в порядок;
3. соседей кладём в очередь, помечая сразу;
4. DFS — то же, но рекурсией/стеком.

## 📖 Разбор

<details class="algo-details">
<summary>Представление, BFS/DFS, компоненты, Union-Find и сложность</summary>

**Граф** — набор вершин, соединённых рёбрами; может содержать циклы и несколько
компонент. Большинство задач сводятся к **обходу**: посетить вершины, не зайдя в одну
дважды.

#### Представление: список смежности

```go
func buildAdjacency(n int, edges [][]int, directed bool) [][]int {
    adj := make([][]int, n)
    for _, e := range edges {
        u, v := e[0], e[1]
        adj[u] = append(adj[u], v)
        if !directed {
            adj[v] = append(adj[v], u)
        }
    }
    return adj
}
```

| Представление        | Память   | Проверка ребра | Обход соседей |
|----------------------|----------|----------------|---------------|
| Список смежности     | O(V + E) | O(deg(u))      | O(deg(u))     |
| Матрица смежности    | O(V²)    | O(1)           | O(V)          |

#### BFS и DFS

```go
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

В BFS вершину помечают посещённой **в момент добавления в очередь**, иначе она попадёт в
очередь несколько раз.

#### Компоненты связности

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

#### Union-Find (DSU)

Отвечает на «в одной ли группе две вершины» почти за O(1) (со сжатием пути и
объединением по рангу — O(α(n))).

```go
type UnionFind struct{ parent, rank []int }

func (uf *UnionFind) Find(x int) int {
    for uf.parent[x] != x {
        uf.parent[x] = uf.parent[uf.parent[x]] // сжатие пути
        x = uf.parent[x]
    }
    return x
}

func (uf *UnionFind) Union(x, y int) bool {
    rx, ry := uf.Find(x), uf.Find(y)
    if rx == ry {
        return false // уже в одном множестве — ребро замыкает цикл
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

**Цикл в ориентированном графе** ловится DFS с тремя состояниями (белый/серый/чёрный):
встретили серую вершину → цикл. Это основа [топологической сортировки](topological-sort.md).

#### Сложность

| Операция                       | Время          | Память |
|--------------------------------|----------------|--------|
| BFS / DFS (список смежности)   | O(V + E)       | O(V)   |
| Компоненты связности           | O(V + E)       | O(V)   |
| Union-Find (на операцию)       | O(α(n)) ≈ O(1) | O(V)   |

</details>

## ⚠️ Типичные ошибки

1. **Забыли `visited`** — на графе с циклом обход уходит в бесконечность.
2. **В BFS помечают при извлечении, а не при добавлении** — вершина дублируется в очереди.
3. **Для неориентированного графа добавили ребро только в одну сторону** — половина связей теряется.
4. **Глубокая рекурсия DFS** на большом графе — переполнение стека; берите итеративный DFS со стеком.
5. **Изолированные вершины** — вершина без рёбер это отдельная компонента.

## 🧩 Задачи

**LeetCode:**

- [Number of Islands](https://leetcode.com/problems/number-of-islands/) — компоненты на сетке
- [Number of Connected Components in an Undirected Graph](https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/)
- [Graph Valid Tree](https://leetcode.com/problems/graph-valid-tree/) — связность + отсутствие цикла
- [Course Schedule](https://leetcode.com/problems/course-schedule/) — цикл в ориентированном графе
- [Rotting Oranges](https://leetcode.com/problems/rotting-oranges/) — многоисточниковый BFS
- [Word Ladder](https://leetcode.com/problems/word-ladder/) — кратчайший путь через BFS (сложная)
- [Redundant Connection](https://leetcode.com/problems/redundant-connection/) — Union-Find
- [Accounts Merge](https://leetcode.com/problems/accounts-merge/) — Union-Find

**Тренажёр** — пакет `graphs`:

```bash
cd exercises
go test ./graphs/                 # ваши решения
go test -tags solution ./graphs/  # эталон
```

Реализуйте `CountComponents` (компоненты связности), `HasCycleUndirected` (Union-Find), `BFSOrder` (обход в ширину), `DFSOrder` (обход в глубину), `ShortestPathUnweighted` (кратчайший по числу рёбер) и `IsBipartite` (двудольность).

## 🔗 Связанные шаблоны

- **[Tree BFS](tree-bfs.md)** / **[Tree DFS](tree-dfs.md)** — обход деревьев как частный
  случай графа без циклов.
- **[Topological Sort](topological-sort.md)** — линейный порядок вершин DAG.
- **[Grids & Shortest Paths](grids-and-shortest-paths.md)** — сетки и взвешенные пути (Дейкстра).
