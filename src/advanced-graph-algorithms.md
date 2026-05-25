# Графы: продвинутые алгоритмы

Продолжение глав [«Обход графов»](graphs.md) и [«Сетки и кратчайшие
пути»](grids-and-shortest-paths.md). Здесь — три алгоритма, которые часто отличают
сильного кандидата: **Bellman–Ford** (кратчайшие пути с отрицательными весами), **A\***
(направленный поиск с эвристикой) и **минимальное остовное дерево** (Kruskal/Prim).

## Bellman–Ford: кратчайшие пути с отрицательными весами

[Дейкстра](grids-and-shortest-paths.md) требует неотрицательных весов. **Bellman–Ford**
работает при **любых** весах и умеет обнаруживать **отрицательные циклы** (по которым
расстояние можно уменьшать бесконечно).

Идея — **релаксация**: проходим по всем рёбрам и пытаемся улучшить расстояние
`dist[v] = min(dist[v], dist[u] + w)`. Кратчайший путь содержит не более `V−1` рёбер,
поэтому `V−1` полных проходов гарантируют сходимость. Если на `V`-м проходе расстояние
всё ещё уменьшается — в графе есть отрицательный цикл.

```go
// edges — ориентированные рёбра [u, v, w]; w может быть отрицательным
func bellmanFord(n int, edges [][]int, src int) (dist []int, hasNegCycle bool) {
    const INF = 1 << 62
    dist = make([]int, n)
    for i := range dist {
        dist[i] = INF
    }
    dist[src] = 0

    // V-1 проходов релаксации
    for i := 0; i < n-1; i++ {
        for _, e := range edges {
            u, v, w := e[0], e[1], e[2]
            if dist[u] != INF && dist[u]+w < dist[v] {
                dist[v] = dist[u] + w
            }
        }
    }

    // V-й проход: если что-то ещё улучшается — есть отрицательный цикл
    for _, e := range edges {
        u, v, w := e[0], e[1], e[2]
        if dist[u] != INF && dist[u]+w < dist[v] {
            return dist, true
        }
    }
    return dist, false
}
```

**Сложность:** O(V · E). Медленнее Дейкстры, но единственный простой выбор при
отрицательных весах. (Для графа без отрицательных рёбер используйте Дейкстру.)

## A\*: направленный поиск с эвристикой

**A\*** — это Дейкстра, которому «подсказывают» направление. Кроме фактической стоимости
пути `g(n)` от старта, используется **эвристика** `h(n)` — оценка оставшегося расстояния
до цели. Из очереди выбираем вершину с минимальным `f(n) = g(n) + h(n)`.

Если эвристика **допустима** (`admissible` — никогда не переоценивает реальное
расстояние), A\* находит оптимальный путь, но исследует **меньше** вершин, чем Дейкстра.
На сетке с движением по 4 направлениям допустима **манхэттенская** эвристика
`|Δr| + |Δc|`.

```go
import "container/heap"

// grid: 0 — свободно, 1 — препятствие. Шаг по 4 направлениям стоит 1.
// Возвращает минимальное число шагов из (0,0) в (R-1,C-1) или -1.
func aStar(grid [][]int) int {
    rows := len(grid)
    if rows == 0 {
        return -1
    }
    cols := len(grid[0])
    gr, gc := rows-1, cols-1
    if grid[0][0] == 1 || grid[gr][gc] == 1 {
        return -1
    }
    h := func(r, c int) int { return abs(gr-r) + abs(gc-c) } // манхэттен

    g := make([][]int, rows)
    for i := range g {
        g[i] = make([]int, cols)
        for j := range g[i] {
            g[i][j] = 1 << 30
        }
    }
    g[0][0] = 0

    open := &nodePQ{{r: 0, c: 0, f: h(0, 0)}}
    dirs := [4][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}
    for open.Len() > 0 {
        cur := heap.Pop(open).(node)
        if cur.r == gr && cur.c == gc {
            return g[gr][gc]
        }
        for _, d := range dirs {
            nr, nc := cur.r+d[0], cur.c+d[1]
            if nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] == 1 {
                continue
            }
            if tentative := g[cur.r][cur.c] + 1; tentative < g[nr][nc] {
                g[nr][nc] = tentative
                heap.Push(open, node{r: nr, c: nc, f: tentative + h(nr, nc)})
            }
        }
    }
    return -1
}
```

При `h(n) = 0` A\* вырождается в Дейкстру. Чем точнее (но всё ещё допустимая) эвристика,
тем меньше вершин просматривается.

## Минимальное остовное дерево (MST)

**Остовное дерево** связного неориентированного графа — это поддерево, соединяющее все
`V` вершин ровно `V−1` ребром. **Минимальное** остовное дерево (MST) — то, у которого
суммарный вес рёбер наименьший. Применения: прокладка сетей, кластеризация.

### Алгоритм Краскала (Kruskal)

Сортируем рёбра по весу и жадно добавляем самое лёгкое, **если оно не образует цикл**
(проверка через [Union-Find](graphs.md)).

```go
func kruskalMST(n int, edges [][]int) int {
    sort.Slice(edges, func(i, j int) bool { return edges[i][2] < edges[j][2] })
    uf := NewUnionFind(n) // см. главу «Обход графов»
    total, used := 0, 0
    for _, e := range edges {
        if uf.Union(e[0], e[1]) { // ребро соединяет две разные компоненты
            total += e[2]
            used++
        }
    }
    if used != n-1 {
        return -1 // граф несвязный — остовного дерева нет
    }
    return total
}
```

**Сложность:** O(E · log E) — доминирует сортировка рёбер.

### Алгоритм Прима (Prim)

Выращиваем дерево из одной вершины, каждый раз добавляя **самое лёгкое ребро**, ведущее
наружу из уже построенного дерева. Для выбора такого ребра используется мин-куча.

```go
func primMST(n int, adj [][][2]int) int { // adj[u] = {сосед, вес}
    visited := make([]bool, n)
    h := &edgePQ{{node: 0, weight: 0}}
    total := 0
    for h.Len() > 0 {
        e := heap.Pop(h).(edge)
        if visited[e.node] {
            continue
        }
        visited[e.node] = true
        total += e.weight
        for _, nb := range adj[e.node] {
            if !visited[nb[0]] {
                heap.Push(h, edge{node: nb[0], weight: nb[1]})
            }
        }
    }
    return total
}
```

**Сложность:** O(E · log V). Прим выгоднее на **плотных** графах, Краскал — на
**разреженных** и когда рёбра уже отсортированы.

| Алгоритм | Подход                     | Сложность     | Когда выбирать          |
|----------|----------------------------|---------------|-------------------------|
| Kruskal  | сортировка рёбер + Union-Find | O(E log E) | разреженный граф        |
| Prim     | растущее дерево + мин-куча  | O(E log V)   | плотный граф            |

## Типичные ошибки

1. **Дейкстра при отрицательных весах** — берите Bellman–Ford.
2. **Bellman–Ford: забыли проверку `dist[u] != INF`** перед релаксацией — переполнение
   при сложении с «бесконечностью».
3. **A\* с недопустимой (переоценивающей) эвристикой** — путь может оказаться
   неоптимальным.
4. **Kruskal без проверки `used == n-1`** — на несвязном графе вернёте вес остовного
   леса, а не дерева.
5. **Prim: не пропускаете уже посещённые вершины** при извлечении из кучи — лишняя
   работа или неверный результат.

## Примеры задач на LeetCode

- [Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) — Bellman–Ford с ограничением на число рёбер
- [Min Cost to Connect All Points](https://leetcode.com/problems/min-cost-to-connect-all-points/) — MST (Prim/Kruskal)
- [Connecting Cities With Minimum Cost](https://leetcode.com/problems/connecting-cities-with-minimum-cost/) — MST
- [Sliding Puzzle](https://leetcode.com/problems/sliding-puzzle/) — A\*/BFS по пространству состояний

## Упражнения

В [Go-тренажёре](https://github.com/fazletdinov/algorithms-book/tree/main/exercises)
есть пакеты `bellmanford`, `astar` и `mst`:

```bash
cd exercises
go test ./bellmanford/ ./astar/ ./mst/                 # ваши решения
go test -tags solution ./bellmanford/ ./astar/ ./mst/  # эталон
```

Реализуйте `ShortestPath` (Bellman–Ford), `ShortestPath` на сетке (A\*) и `MSTWeight`
(Kruskal).

## Связанные шаблоны

- **[Обход графов](graphs.md)** — BFS/DFS и Union-Find (нужен для Kruskal).
- **[Сетки и кратчайшие пути](grids-and-shortest-paths.md)** — Дейкстра, частный случай
  A\* при нулевой эвристике.
- **[Two Heaps](two-heaps.md)** — приоритетная очередь для A\* и Прима.
