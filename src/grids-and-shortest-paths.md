# Графы: сетки и кратчайшие пути

Это продолжение главы [«Обход графов»](graphs.md). Здесь — два частых на собеседованиях
расширения: **сетки** (двумерные поля как графы) и **взвешенные кратчайшие пути**
(алгоритм Дейкстры).

## Сетки как графы

Двумерная сетка (матрица) — это граф, где **вершина** — клетка `(r, c)`, а **рёбра**
ведут к соседним клеткам. Чаще всего соседей четыре (вверх/вниз/влево/вправо), иногда
восемь (с диагоналями).

```go
// Четыре направления: смещения по строке и столбцу
var dirs = [4][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}

func neighbors(r, c, rows, cols int) [][2]int {
    var res [][2]int
    for _, d := range dirs {
        nr, nc := r+d[0], c+d[1]
        if nr >= 0 && nr < rows && nc >= 0 && nc < cols { // проверка границ!
            res = append(res, [2]int{nr, nc})
        }
    }
    return res
}
```

### Number of Islands («подсчёт островов»)

Классическая задача: в сетке из `1` (суша) и `0` (вода) посчитать число «островов» —
связных групп суши. Это **подсчёт компонент связности** на сетке: запускаем обход из
каждой ещё не посещённой клетки-суши, «затапливая» весь остров.

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
        // выходим, если за границей, вода или уже посещали
        if r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] == 0 || visited[r][c] {
            return
        }
        visited[r][c] = true
        dfs(r-1, c)
        dfs(r+1, c)
        dfs(r, c-1)
        dfs(r, c+1)
    }

    count := 0
    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if grid[r][c] == 1 && !visited[r][c] {
                count++
                dfs(r, c) // затапливаем весь остров
            }
        }
    }
    return count
}
```

**Сложность:** O(R · C) — каждую клетку посещаем один раз.

> 💡 **Multi-source BFS.** Если фронт распространяется одновременно из нескольких точек
> (гниющие апельсины, пожар, вода), загрузите в очередь BFS **сразу все** стартовые
> клетки и обходите по уровням — каждый уровень это «шаг времени». Так считается
> минимальное время до заполнения всей сетки.

## Взвешенные кратчайшие пути: алгоритм Дейкстры

В **невзвешенном** графе кратчайший путь по числу рёбер находит обычный BFS (все рёбра
«стоят» 1). Но если у рёбер **разные веса** (расстояния, цены, время), BFS не подходит:
путь с большим числом рёбер может оказаться дешевле.

**Алгоритм Дейкстры** находит кратчайшие пути от источника до всех вершин в графе с
**неотрицательными** весами. Идея: жадно расширяем границу, каждый раз выбирая ещё не
финализированную вершину с **минимальным** известным расстоянием — для этого нужна
**приоритетная очередь** (мин-куча, см. [Two Heaps](two-heaps.md)).

```go
import "container/heap"

// Элемент очереди: вершина и текущее расстояние до неё
type item struct{ node, dist int }
type pq []item

func (p pq) Len() int            { return len(p) }
func (p pq) Less(i, j int) bool  { return p[i].dist < p[j].dist } // мин-куча по dist
func (p pq) Swap(i, j int)       { p[i], p[j] = p[j], p[i] }
func (p *pq) Push(x any)         { *p = append(*p, x.(item)) }
func (p *pq) Pop() any {
    old := *p
    n := len(old)
    it := old[n-1]
    *p = old[:n-1]
    return it
}

// adj[u] = список соседей вида {to, weight}
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
            continue // устаревшая запись — уже нашли путь короче
        }
        for _, e := range adj[cur.node] {
            to, w := e[0], e[1]
            if nd := cur.dist + w; nd < dist[to] {
                dist[to] = nd
                heap.Push(h, item{node: to, dist: nd})
            }
        }
    }
    return dist // dist[v] == INF означает «недостижима»
}
```

**Сложность:** O((V + E) · log V) — каждое ребро может добавить запись в кучу,
а операции с кучей — логарифмические.

### Ключевые моменты

- **Только неотрицательные веса.** При отрицательных рёбрах Дейкстра ломается — нужен
  **Bellman–Ford** (O(V · E), умеет находить отрицательные циклы).
- **«Ленивое» удаление.** В Go у `container/heap` нет операции «уменьшить ключ», поэтому
  мы просто кладём новую запись, а устаревшие отбрасываем проверкой
  `cur.dist > dist[cur.node]`.
- **Все рёбра веса 1?** Не тратьте время на Дейкстру — обычный BFS даст ответ за O(V+E).

## Сравнение алгоритмов кратчайшего пути

| Алгоритм       | Веса рёбер           | Сложность        | Когда применять                    |
|----------------|----------------------|------------------|------------------------------------|
| BFS            | все равны (1)        | O(V + E)         | невзвешенный граф, сетки           |
| Дейкстра       | неотрицательные      | O((V+E) log V)   | взвешенный граф без отрицат. рёбер |
| Bellman–Ford   | любые                | O(V · E)         | есть отрицательные рёбра/циклы     |

## Визуализация

> 💡 **Интерактивная демонстрация (BFS по сетке).** Нажимайте «▶»: волна BFS
> распространяется от `S` к `G`, огибая препятствия (тёмные клетки). Жёлтая — текущая
> клетка, синие — уже посещённые. (Виджет работает в собранной книге
> `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="grid-bfs" data-grid="0,0,0,0,0;0,1,1,1,0;0,0,0,1,0;1,1,0,1,0;0,0,0,0,0"></div>

## Типичные ошибки

1. **Нет проверки границ сетки** перед доступом к `grid[nr][nc]` — паника
   index-out-of-range.
2. **Дейкстра с отрицательными весами** — даёт неверный результат; используйте
   Bellman–Ford.
3. **Не отбрасываются устаревшие записи** в куче — алгоритм всё равно корректен, но
   медленнее; проверка `cur.dist > dist[cur.node]` важна для производительности.
4. **BFS вместо Дейкстры на взвешенном графе** — кратчайший по числу рёбер ≠ кратчайший
   по сумме весов.
5. **Сетка с диагоналями.** Если соседей восемь — не забудьте 4 диагональных смещения.

## Примеры задач на LeetCode

### Сетки
- [Number of Islands](https://leetcode.com/problems/number-of-islands/)
- [Max Area of Island](https://leetcode.com/problems/max-area-of-island/)
- [Rotting Oranges](https://leetcode.com/problems/rotting-oranges/) — multi-source BFS
- [Walls and Gates](https://leetcode.com/problems/walls-and-gates/)

### Кратчайшие пути
- [Network Delay Time](https://leetcode.com/problems/network-delay-time/) — Дейкстра
- [Path with Minimum Effort](https://leetcode.com/problems/path-with-minimum-effort/)
- [Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) — Bellman–Ford / BFS

## Упражнения

В [Go-тренажёре](https://github.com/fazletdinov/algorithms-book/tree/main/exercises)
есть пакеты `grids` и `dijkstra`:

```bash
cd exercises
go test ./grids/ ./dijkstra/                 # ваши решения
go test -tags solution ./grids/ ./dijkstra/  # эталон
```

Реализуйте `NumIslands` (обход сетки), `MaxAreaOfIsland` (макс. площадь), `FloodFill` (заливка), `RottingOranges` (BFS-волна) и `ShortestPathInBinaryMatrix` (8 направлений); в пакете `dijkstra` — `ShortestPath` (кратчайший путь, Дейкстра).

## Связанные шаблоны

- **[Обход графов](graphs.md)** — BFS/DFS и Union-Find, на которых всё строится.
- **[Two Heaps](two-heaps.md)** — приоритетная очередь, сердце алгоритма Дейкстры.
- **[Topological Sort](topological-sort.md)** — кратчайшие пути в DAG можно считать в
  порядке топосортировки за O(V + E).
