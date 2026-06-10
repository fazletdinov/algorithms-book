# 🗺️ Графы: сетки и кратчайшие пути

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Grids &amp; Shortest Paths <span class="algo-hero__ru">Сетки и кратчайшие пути</span></div>
    <div class="algo-hero__tag">Сетка как граф (BFS/DFS) + взвешенные пути (Дейкстра)</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>BFS сетки</span><b>O(R·C)</b></div>
    <div class="algo-hero__metric"><span>Дейкстра</span><b>O(E log V)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>двумерное поле: острова, заливка, путь по сетке</li>
      <li>кратчайший путь по <b>числу шагов</b> (BFS) или по <b>весам</b> (Дейкстра)</li>
      <li>волна из нескольких источников (multi-source BFS)</li>
      <li>веса рёбер <b>неотрицательные</b> (для Дейкстры)</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>есть отрицательные веса → Bellman–Ford</li>
      <li>все веса равны 1 — не нужна Дейкстра, хватит BFS</li>
      <li>граф — DAG и нужен порядок → топосортировка</li>
      <li>задача не про пути/связность</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«сетка / матрица», «острова», «кратчайший путь», «минимальная стоимость/время»</b> · соседи (r±1, c±1) · веса рёбер.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li>клетка <code>(r,c)</code> — вершина, соседи — 4 (или 8) направлений; <b>проверяй границы</b>;</li>
      <li>невзвешенный путь / число шагов → <b>BFS</b> (волна по слоям);</li>
      <li>разные неотрицательные веса → <b>Дейкстра</b> (мин-куча, жадно берём ближайшую);</li>
      <li>отрицательные веса → <b>Bellman–Ford</b>;</li>
      <li>фронт из нескольких точек → загрузи все старты в очередь (multi-source BFS).</li>
    </ul>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация (BFS по сетке).** Волна BFS идёт от `S` к `G`, огибая
> препятствия (тёмные клетки). Жёлтая — текущая, синие — посещённые. Справа — код с подсветкой
> строки и переменные (клетка, расстояние), внизу — кликабельные шаги. Можно подставить свою сетку
> и нажать «⟲ Запустить». (Виджет работает в собранной книге `mdbook serve`/`mdbook build`, а не
> при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="grid-bfs" data-grid="0,0,0,0,0;0,1,1,1,0;0,0,0,1,0;1,1,0,1,0;0,0,0,0,0"></div>

## ⚡ Шаблон для собеседования

```go
var dirs = [4][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}

// BFS по сетке: кратчайшее число шагов
queue := [][2]int{{sr, sc}}
dist[sr][sc] = 0
for len(queue) > 0 {
    cell := queue[0]; queue = queue[1:]
    r, c := cell[0], cell[1]
    for _, d := range dirs {
        nr, nc := r+d[0], c+d[1]
        if inBounds(nr, nc) && grid[nr][nc] == 0 && dist[nr][nc] < 0 {
            dist[nr][nc] = dist[r][c] + 1
            queue = append(queue, [2]int{nr, nc})
        }
    }
}
```

1. 4 направления через массив смещений;
2. **проверка границ** перед доступом;
3. посещаем клетку только если она свободна и ещё не размечена;
4. для весов — замени очередь на мин-кучу (Дейкстра).

## 📖 Разбор

<details class="algo-details">
<summary>Сетки, Number of Islands, Дейкстра и сравнение алгоритмов</summary>

Двумерная сетка — это граф, где **вершина** — клетка `(r, c)`, а **рёбра** ведут к
соседним клеткам (обычно 4, иногда 8 с диагоналями).

```go
var dirs = [4][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}
```

#### Number of Islands

Подсчёт компонент связности на сетке: запускаем обход из каждой непосещённой клетки-суши,
«затапливая» весь остров.

```go
func numIslands(grid [][]int) int {
    rows := len(grid)
    if rows == 0 {
        return 0
    }
    cols := len(grid[0])
    visited := make([][]bool, rows)
    for i := range visited {
        visited[i] = make([]bool, cols)
    }
    var dfs func(r, c int)
    dfs = func(r, c int) {
        if r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] == 0 || visited[r][c] {
            return
        }
        visited[r][c] = true
        dfs(r-1, c); dfs(r+1, c); dfs(r, c-1); dfs(r, c+1)
    }
    count := 0
    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if grid[r][c] == 1 && !visited[r][c] {
                count++
                dfs(r, c)
            }
        }
    }
    return count
}
```

> 💡 **Multi-source BFS.** Если фронт распространяется из нескольких точек (гниющие
> апельсины, пожар), загрузите в очередь **сразу все** старты и обходите по уровням —
> каждый уровень это шаг времени.

#### Алгоритм Дейкстры

Для **неотрицательных** весов: жадно расширяем границу, выбирая ещё не финализированную
вершину с минимальным известным расстоянием (мин-куча, см. [Two Heaps](two-heaps.md)).

```go
func dijkstra(n int, adj [][][2]int, src int) []int {
    const INF = 1 << 62
    dist := make([]int, n)
    for i := range dist {
        dist[i] = INF
    }
    dist[src] = 0
    h := &pq{{node: src, dist: 0}}
    for h.Len() > 0 {
        cur := heap.Pop(h).(item)
        if cur.dist > dist[cur.node] {
            continue // устаревшая запись
        }
        for _, e := range adj[cur.node] {
            to, w := e[0], e[1]
            if nd := cur.dist + w; nd < dist[to] {
                dist[to] = nd
                heap.Push(h, item{node: to, dist: nd})
            }
        }
    }
    return dist
}
```

- **Только неотрицательные веса** (иначе Bellman–Ford).
- **«Ленивое» удаление**: в Go нет «уменьшить ключ», кладём новую запись, устаревшие
  отбрасываем проверкой `cur.dist > dist[cur.node]`.
- **Все рёбра веса 1?** Хватит обычного BFS за O(V+E).

#### Сравнение алгоритмов кратчайшего пути

| Алгоритм       | Веса рёбер      | Сложность        | Когда применять                    |
|----------------|-----------------|------------------|------------------------------------|
| BFS            | все равны (1)   | O(V + E)         | невзвешенный граф, сетки           |
| Дейкстра       | неотрицательные | O((V+E) log V)   | взвешенный граф без отрицат. рёбер |
| Bellman–Ford   | любые           | O(V · E)         | есть отрицательные рёбра/циклы     |

</details>

## ⚠️ Типичные ошибки

1. **Нет проверки границ сетки** перед доступом к `grid[nr][nc]` — паника index-out-of-range.
2. **Дейкстра с отрицательными весами** — даёт неверный результат; используйте Bellman–Ford.
3. **Не отбрасываются устаревшие записи** в куче — корректно, но медленнее; проверка `cur.dist > dist[cur.node]` важна.
4. **BFS вместо Дейкстры на взвешенном графе** — кратчайший по числу рёбер ≠ по сумме весов.
5. **Сетка с диагоналями** — если соседей восемь, не забудьте 4 диагональных смещения.

## 🧩 Задачи

**LeetCode:**

- [Number of Islands](https://leetcode.com/problems/number-of-islands/)
- [Max Area of Island](https://leetcode.com/problems/max-area-of-island/)
- [Rotting Oranges](https://leetcode.com/problems/rotting-oranges/) — multi-source BFS
- [Walls and Gates](https://leetcode.com/problems/walls-and-gates/)
- [Network Delay Time](https://leetcode.com/problems/network-delay-time/) — Дейкстра
- [Path with Minimum Effort](https://leetcode.com/problems/path-with-minimum-effort/)
- [Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) — Bellman–Ford / BFS

**Тренажёр** — пакеты `grids` и `dijkstra`:

```bash
cd exercises
go test ./grids/ ./dijkstra/                 # ваши решения
go test -tags solution ./grids/ ./dijkstra/  # эталон
```

Реализуйте `NumIslands` (обход сетки), `MaxAreaOfIsland` (макс. площадь), `FloodFill` (заливка), `RottingOranges` (BFS-волна) и `ShortestPathInBinaryMatrix` (8 направлений); в пакете `dijkstra` — `ShortestPath` (Дейкстра).

## 🔗 Связанные шаблоны

- **[Обход графов](graphs.md)** — BFS/DFS и Union-Find, на которых всё строится.
- **[Two Heaps](two-heaps.md)** — приоритетная очередь, сердце Дейкстры.
- **[Topological Sort](topological-sort.md)** — кратчайшие пути в DAG за O(V + E).
