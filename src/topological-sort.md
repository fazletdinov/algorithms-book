# 🪜 Topological Sort (Топологическая сортировка)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Topological Sort <span class="algo-hero__ru">Топосортировка</span></div>
    <div class="algo-hero__tag">Линейный порядок вершин DAG: зависимость A→B ⇒ A раньше B</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Время</span><b>O(V+E)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(V+E)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>граф зависимостей между задачами (DAG)</li>
      <li>определить порядок выполнения (сборка, установка пакетов, курсы)</li>
      <li>проверить отсутствие циклов («можно ли выполнить всё»)</li>
      <li>расписание с предусловиями</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>граф неориентированный или с циклами (порядок не существует)</li>
      <li>нужен кратчайший путь / связность (BFS/DFS)</li>
      <li>зависимостей нет — обычная сортировка</li>
      <li>нужен конкретный (не любой топологический) порядок без доп. критерия</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«порядок выполнения», «зависимости / предусловия», «course schedule», «можно ли завершить все»</b> · ориентированный граф · «A до B».</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни (алгоритм Кана)</div>
    <ul>
      <li>в DAG всегда есть вершина с <b>входящей степенью 0</b> — источник;</li>
      <li>кладём все источники в очередь, убираем по одному в результат;</li>
      <li>убирая вершину, <b>уменьшаем in-degree соседей</b>; ставшие нулевыми — в очередь;</li>
      <li>если в результате меньше вершин, чем всего → в графе <b>цикл</b>.</li>
    </ul>
    <p>Считай именно <b>входящие</b> рёбра. Ребро «A зависит от B» направлено B → A.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация.** Рядом с вершиной — входящая степень (`in:`). Кан убирает
> вершину со степенью 0 (жёлтая → синяя) и уменьшает степени соседей. Справа — код с подсветкой
> строки и переменные (порядок), внизу — кликабельные шаги. (Виджет работает в собранной книге
> `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="topo-kahn" data-nodes="A,B,C,D" data-edges="A-B,A-C,B-C,B-D,C-D"></div>

## ⚡ Шаблон для собеседования

```go
// Алгоритм Кана (BFS по in-degree)
queue := []int{}
for v := 0; v < n; v++ {
    if inDegree[v] == 0 {
        queue = append(queue, v) // все источники сразу
    }
}
var order []int
for len(queue) > 0 {
    u := queue[0]; queue = queue[1:]
    order = append(order, u)
    for _, w := range adj[u] {
        inDegree[w]--
        if inDegree[w] == 0 {
            queue = append(queue, w)
        }
    }
}
if len(order) != n { /* цикл — порядок невозможен */ }
```

1. считаем in-degree всех вершин;
2. все вершины с in-degree 0 → в очередь;
3. убираем вершину, уменьшаем степени соседей, новые нули → в очередь;
4. `len(order) < n` ⇒ цикл.

## 📖 Разбор

<details class="algo-details">
<summary>Теория, алгоритм Кана, DFS-вариант и сложность</summary>

**Topological Sort** находит линейный порядок вершин ориентированного ациклического
графа (**DAG**): если ребро A → B, то A идёт перед B. Сортировка существует тогда и
только тогда, когда граф — DAG (без циклов).

Ключевое наблюдение: в DAG всегда есть вершина с **in-degree = 0** (источник). Обрабатывая
источники и «удаляя» их, открываем новые источники — это **алгоритм Кана**.

```go
func topologicalSort(numCourses int, prerequisites [][]int) []int {
    graph := make([][]int, numCourses)
    inDegree := make([]int, numCourses)
    for _, prereq := range prerequisites {
        course, prerequisite := prereq[0], prereq[1]
        graph[prerequisite] = append(graph[prerequisite], course)
        inDegree[course]++
    }
    queue := []int{}
    for i := 0; i < numCourses; i++ {
        if inDegree[i] == 0 {
            queue = append(queue, i)
        }
    }
    result := []int{}
    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]
        result = append(result, node)
        for _, neighbor := range graph[node] {
            inDegree[neighbor]--
            if inDegree[neighbor] == 0 {
                queue = append(queue, neighbor)
            }
        }
    }
    if len(result) != numCourses {
        return []int{} // цикл — сортировка невозможна
    }
    return result
}
```

**Альтернатива — DFS:** когда вершина полностью обработана, кладём её в стек; развёрнутый
стек даёт топопорядок. Цикл ловится по «серой» (обрабатываемой) вершине.

Для графа A→B, A→C, B→C, B→D, C→D порядок: **[A, B, C, D]**. Граф с циклом
`A→B→C→A` даёт in-degree всех = 1, очередь пуста с начала → `len(result) < V` → цикл.

#### Сложность

| Подход              | Время    | Память   |
|---------------------|----------|----------|
| Алгоритм Кана (BFS) | O(V + E) | O(V + E) |
| DFS                 | O(V + E) | O(V + E) |

</details>

## ⚠️ Типичные ошибки

1. **Путаница in-degree/out-degree** — считайте входящие рёбра, а не исходящие.
2. **Неправильное направление ребра** — `course` зависит от `prerequisite`, поэтому ребро `prerequisite → course`.
3. **Забыта проверка цикла** — если `len(result) != numCourses`, сортировка невозможна.
4. **In-degree обновляется не у тех вершин** — уменьшайте только у прямых соседей текущей.
5. **Несколько источников / компонент** — кладите в очередь сразу все вершины с in-degree 0.
6. **Дубликаты рёбер** завышают in-degree; при необходимости отсеивайте через множество.

## 🧩 Задачи

**LeetCode:**

- [Course Schedule](https://leetcode.com/problems/course-schedule/)
- [Course Schedule II](https://leetcode.com/problems/course-schedule-ii/)
- [Alien Dictionary](https://leetcode.com/problems/alien-dictionary/)
- [Minimum Height Trees](https://leetcode.com/problems/minimum-height-trees/)
- [Sequence Reconstruction](https://leetcode.com/problems/sequence-reconstruction/)
- [Parallel Courses](https://leetcode.com/problems/parallel-courses/) (сложная)
- [Sort Items by Groups Respecting Dependencies](https://leetcode.com/problems/sort-items-by-groups-respecting-dependencies/) (сложная)

**Тренажёр** — пакет `toposort`:

```bash
cd exercises
go test ./toposort/                 # ваши решения
go test -tags solution ./toposort/  # эталон
```

Реализуйте `TopologicalSort` (порядок по Кану), `CanFinish` (нет ли цикла),
`FindOrderLexSmallest` (лексикографически наименьший порядок) и `AlienOrder`
(порядок алфавита по словарю).

## 🔗 Связанные шаблоны

- **[Обход графов](graphs.md)** — BFS/DFS, на которых строится топосортировка.
- **[Tree BFS](./tree-bfs.md)** — тот же обход с очередью.
- **[Subsets](./subsets.md)** — комбинаторные задачи с зависимостями.
- Для общей теории по памяти и профилированию в Go см. [приложение](appendix-go-memory.md).
