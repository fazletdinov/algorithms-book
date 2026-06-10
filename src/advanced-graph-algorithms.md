# 🛰️ Графы: продвинутые алгоритмы

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Advanced Graphs <span class="algo-hero__ru">Продвинутые графы</span></div>
    <div class="algo-hero__tag">Bellman–Ford (отрицательные веса) · A* (эвристика) · MST (Kruskal/Prim)</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Bellman–Ford</span><b>O(V·E)</b></div>
    <div class="algo-hero__metric"><span>MST</span><b>O(E log E)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li><b>Bellman–Ford</b>: кратчайшие пути при <b>отрицательных</b> весах, поиск отрицательных циклов</li>
      <li><b>A*</b>: кратчайший путь с хорошей эвристикой (меньше вершин, чем Дейкстра)</li>
      <li><b>MST</b>: соединить все вершины минимальным суммарным весом (сети, кластеризация)</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>веса неотрицательные → Дейкстра быстрее Bellman–Ford</li>
      <li>нет хорошей допустимой эвристики → A* вырождается в Дейкстру</li>
      <li>нужен не остов, а кратчайшие пути → не MST</li>
      <li>граф невзвешенный → обычный BFS</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> «отрицательные веса / цикл» → Bellman–Ford · «кратчайший путь по сетке с целью» → A* · <b>«соединить все точки минимальной стоимостью»</b> → MST (Kruskal/Prim).</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li><b>Bellman–Ford</b>: V−1 проходов <b>релаксации</b> по всем рёбрам; V-й проход улучшил → отрицательный цикл;</li>
      <li><b>A*</b> = Дейкстра + эвристика: берём минимум <code>f = g + h</code>; при допустимой <code>h</code> путь оптимален;</li>
      <li><b>Kruskal</b>: сортируем рёбра, берём лёгкое, если не создаёт цикл (Union-Find);</li>
      <li><b>Prim</b>: растим дерево, добавляя лёгкое ребро наружу (мин-куча).</li>
    </ul>
    <p>Kruskal выгоден на разреженных графах, Prim — на плотных.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация (MST, Краскал).** Рёбра рассматриваются по возрастанию веса:
> зелёные добавлены в остов, пунктир/тусклые — отброшены (замкнули бы цикл, Union-Find). Справа —
> код с подсветкой строки и переменные (ребро, вес, вес MST), внизу — кликабельные шаги. Можно
> подставить свой граф. (Виджет работает в собранной книге `mdbook serve`/`mdbook build`, а не при
> просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="mst-kruskal" data-nodes="A,B,C,D,E" data-edges="A-B-2,A-D-6,B-C-3,B-D-8,B-E-5,C-E-7,D-E-9"></div>

## ⚡ Шаблон для собеседования

```go
// MST через Краскала
func kruskalMST(n int, edges [][]int) int {
    sort.Slice(edges, func(i, j int) bool { return edges[i][2] < edges[j][2] })
    uf := NewUnionFind(n)
    total, used := 0, 0
    for _, e := range edges {
        if uf.Union(e[0], e[1]) { // соединяет разные компоненты?
            total += e[2]
            used++
        }
    }
    if used != n-1 {
        return -1 // граф несвязный — остова нет
    }
    return total
}
```

1. сортируем рёбра по весу;
2. берём ребро, если `Union` соединил две разные компоненты;
3. иначе ребро замкнуло бы цикл — пропускаем;
4. остов = `n−1` рёбер.

## 📖 Разбор

<details class="algo-details">
<summary>Bellman–Ford, A*, MST (Kruskal и Prim), сложности</summary>

#### Bellman–Ford (отрицательные веса)

Релаксация: проходим по всем рёбрам, улучшая `dist[v] = min(dist[v], dist[u] + w)`.
Кратчайший путь ≤ V−1 рёбер, поэтому V−1 проходов достаточно. Если на V-м проходе ещё
улучшается — есть отрицательный цикл.

```go
func bellmanFord(n int, edges [][]int, src int) (dist []int, hasNegCycle bool) {
    const INF = 1 << 62
    dist = make([]int, n)
    for i := range dist {
        dist[i] = INF
    }
    dist[src] = 0
    for i := 0; i < n-1; i++ {
        for _, e := range edges {
            u, v, w := e[0], e[1], e[2]
            if dist[u] != INF && dist[u]+w < dist[v] {
                dist[v] = dist[u] + w
            }
        }
    }
    for _, e := range edges { // V-й проход — детектор цикла
        u, v, w := e[0], e[1], e[2]
        if dist[u] != INF && dist[u]+w < dist[v] {
            return dist, true
        }
    }
    return dist, false
}
```

Сложность O(V·E). Для неотрицательных весов используйте Дейкстру.

#### A* (направленный поиск)

A* = Дейкстра + эвристика `h(n)` (оценка оставшегося пути). Из очереди берём минимум
`f(n) = g(n) + h(n)`. При **допустимой** (не переоценивающей) эвристике путь оптимален, но
вершин просматривается меньше. На сетке (4 направления) допустима манхэттенская
`|Δr| + |Δc|`. При `h ≡ 0` A* вырождается в Дейкстру.

#### MST: Краскал

```go
func kruskalMST(n int, edges [][]int) int {
    sort.Slice(edges, func(i, j int) bool { return edges[i][2] < edges[j][2] })
    uf := NewUnionFind(n)
    total, used := 0, 0
    for _, e := range edges {
        if uf.Union(e[0], e[1]) {
            total += e[2]
            used++
        }
    }
    if used != n-1 {
        return -1
    }
    return total
}
```

#### MST: Прим

Выращиваем дерево из одной вершины, каждый раз добавляя лёгкое ребро наружу (мин-куча).

```go
func primMST(n int, adj [][][2]int) int {
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

| Алгоритм | Подход                         | Сложность   | Когда выбирать    |
|----------|--------------------------------|-------------|-------------------|
| Kruskal  | сортировка рёбер + Union-Find  | O(E log E)  | разреженный граф  |
| Prim     | растущее дерево + мин-куча      | O(E log V)  | плотный граф      |

</details>

## ⚠️ Типичные ошибки

1. **Дейкстра при отрицательных весах** — берите Bellman–Ford.
2. **Bellman–Ford: забыли проверку `dist[u] != INF`** перед релаксацией — переполнение.
3. **A\* с недопустимой (переоценивающей) эвристикой** — путь может оказаться неоптимальным.
4. **Kruskal без проверки `used == n-1`** — на несвязном графе вернёте вес леса, а не дерева.
5. **Prim: не пропускаете уже посещённые вершины** при извлечении из кучи.

## 🧩 Задачи

**LeetCode:**

- [Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) — Bellman–Ford с ограничением на рёбра
- [Min Cost to Connect All Points](https://leetcode.com/problems/min-cost-to-connect-all-points/) — MST (Prim/Kruskal)
- [Connecting Cities With Minimum Cost](https://leetcode.com/problems/connecting-cities-with-minimum-cost/) — MST
- [Sliding Puzzle](https://leetcode.com/problems/sliding-puzzle/) — A*/BFS по пространству состояний

**Тренажёр** — пакеты `bellmanford`, `astar`, `mst`:

```bash
cd exercises
go test ./bellmanford/ ./astar/ ./mst/                 # ваши решения
go test -tags solution ./bellmanford/ ./astar/ ./mst/  # эталон
```

- `dijkstra`: `ShortestPath`, `ShortestPathsFrom`, `NetworkDelayTime`.
- `bellmanford`: `ShortestPath` (отриц. веса), `HasNegativeCycle`, `ShortestPathWithAtMostKEdges`.
- `astar`: `ShortestPath` (сетка с эвристикой), `ManhattanDistance`, `PathExists`.
- `mst`: `MSTWeight` (Краскал), `MSTWeightPrim` (Прим), `MSTWeightWithEdges`.

## 🔗 Связанные шаблоны

- **[Обход графов](graphs.md)** — BFS/DFS и Union-Find (нужен для Kruskal).
- **[Сетки и кратчайшие пути](grids-and-shortest-paths.md)** — Дейкстра, частный случай A* при нулевой эвристике.
- **[Two Heaps](two-heaps.md)** — приоритетная очередь для A* и Прима.
