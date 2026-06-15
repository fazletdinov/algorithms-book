/*
 * algo-viz.js — интерактивные пошаговые визуализации алгоритмов для mdBook.
 *
 * Архитектура: единый движок buildDashboard(root, cfg) + реестр конфигов DASH.
 * Диспетчер render(el) по атрибуту data-viz находит конфиг в DASH; неизвестный
 * тип даёт предупреждение в консоль и видимую плашку (а не молчаливый пустой div).
 *
 * Каждый виджет показывает синхронно: структуру (сетка индекс/значение ИЛИ своя
 * картинка через cfg.customViz — дерево/граф/куча/trie/интервалы), подсветку
 * активной строки кода (CODE[codeKey] + step.line), таблицу переменных с
 * описаниями и подсветкой изменений, подпись «строка N: что делает»
 * (cfg.lineNotes), кликабельный таймлайн, авто-проигрывание (кнопка/пробел).
 *
 * ~28 типов data-viz заданы конфигами в DASH. Чтобы добавить виджет: запись в
 * DASH (badge/codeKey/varOrder/varDesc/lineNotes/parse/...) и, если нужна панель
 * кода, запись в CODE. Степ-билдер b*() возвращает шаги с полями vars, line
 * (индекс в CODE), found/done и индексами указателей. Согласованность проверяет
 * scripts/check-viz.js (в CI).
 *
 * Пример: <div class="algo-viz" data-viz="cyclic-sort" data-array="3,1,5,4,2"></div>
 * Без внешних зависимостей и сборщика; init() сам находит все .algo-viz.
 */
(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";

  // num() — Number() с проверкой: вместо молчаливого NaN бросает понятную ошибку,
  // которую ловит render() и показывает плашку (а не сломанный виджет).
  function num(x, what) {
    var n = Number(x);
    if (isNaN(n)) throw new Error((what || "значение") + ": ожидалось число, получено \"" + x + "\"");
    return n;
  }
  function nums(s) {
    return (s || "").split(",").map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length > 0; })
      .map(function (x) { return num(x, "элемент массива"); });
  }
  function parseTree(s) {
    return (s || "").split(",").map(function (x) {
      x = x.trim();
      return x === "" || x === "null" ? null : num(x, "узел дерева");
    });
  }
  function parseEdges(s) {
    return (s || "").split(",").map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length > 0; })
      .map(function (e) {
        var p = e.split("-");
        if (p.length !== 2) throw new Error("ребро: ожидался формат \"u-v\", получено \"" + e + "\"");
        return [num(p[0], "вершина ребра"), num(p[1], "вершина ребра")];
      });
  }

  // ===== Реестр Go-кода: строки синхронизируются с шагами (поле step.line) =====
  // Индекс строки в массиве = значение step.line, которое подсвечивается на шаге.
  var CODE = {
    "sliding-window-fixed": [
      "func maxSumSubarray(arr []int, k int) int {",
      "    windowSum := 0",
      "    for i := 0; i < k; i++ {",
      "        windowSum += arr[i]",
      "    }",
      "    maxSum := windowSum",
      "    for i := k; i < len(arr); i++ {",
      "        windowSum += arr[i] - arr[i-k]",
      "        if windowSum > maxSum {",
      "            maxSum = windowSum",
      "        }",
      "    }",
      "    return maxSum",
      "}"
    ],
    "two-pointers-sum": [
      "func pairSum(arr []int, target int) (int, int) {",
      "    lo, hi := 0, len(arr)-1",
      "    for lo < hi {",
      "        sum := arr[lo] + arr[hi]",
      "        if sum == target {",
      "            return lo, hi",
      "        } else if sum < target {",
      "            lo++",
      "        } else {",
      "            hi--",
      "        }",
      "    }",
      "    return -1, -1",
      "}"
    ],
    "dp-coins": [
      "func coinChange(coins []int, amount int) int {",
      "    dp := make([]int, amount+1) // dp[0]=0, остальное ∞",
      "    for a := 1; a <= amount; a++ {",
      "        best := math.MaxInt",
      "        for _, c := range coins {",
      "            if c <= a && dp[a-c]+1 < best {",
      "                best = dp[a-c] + 1",
      "            }",
      "        }",
      "        dp[a] = best",
      "    }",
      "    return dp[amount]",
      "}"
    ],
    "list-cycle": [
      "func hasCycle(head *ListNode) bool {",
      "    slow, fast := head, head",
      "    for fast != nil && fast.Next != nil {",
      "        slow = slow.Next",
      "        fast = fast.Next.Next",
      "        if slow == fast {",
      "            return true",
      "        }",
      "    }",
      "    return false",
      "}"
    ],
    "sliding-window-var": [
      "func longestKDistinct(s string, k int) int {",
      "    freq := make(map[byte]int)",
      "    left, maxLen := 0, 0",
      "    for right := 0; right < len(s); right++ {",
      "        freq[s[right]]++",
      "        for len(freq) > k {",
      "            freq[s[left]]--",
      "            if freq[s[left]] == 0 { delete(freq, s[left]) }",
      "            left++",
      "        }",
      "        maxLen = max(maxLen, right-left+1)",
      "    }",
      "    return maxLen",
      "}"
    ],
    "two-pointers-dedup": [
      "func removeDuplicates(nums []int) int {",
      "    if len(nums) == 0 { return 0 }",
      "    slow := 0",
      "    for fast := 1; fast < len(nums); fast++ {",
      "        if nums[slow] != nums[fast] {",
      "            slow++",
      "            nums[slow] = nums[fast]",
      "        }",
      "    }",
      "    return slow + 1",
      "}"
    ],
    "list-middle": [
      "func middleNode(head *ListNode) *ListNode {",
      "    slow, fast := head, head",
      "    for fast != nil && fast.Next != nil {",
      "        slow = slow.Next",
      "        fast = fast.Next.Next",
      "    }",
      "    return slow",
      "}"
    ],
    "binary-search": [
      "func binarySearch(arr []int, target int) int {",
      "    left, right := 0, len(arr)-1",
      "    for left <= right {",
      "        mid := left + (right-left)/2",
      "        if arr[mid] == target {",
      "            return mid",
      "        } else if arr[mid] < target {",
      "            left = mid + 1",
      "        } else {",
      "            right = mid - 1",
      "        }",
      "    }",
      "    return -1",
      "}"
    ],
    "binary-search-first": [
      "func findFirstOccurrence(arr []int, target int) int {",
      "    left, right, res := 0, len(arr)-1, -1",
      "    for left <= right {",
      "        mid := left + (right-left)/2",
      "        if arr[mid] == target {",
      "            res = mid       // запомнили и идём левее",
      "            right = mid - 1",
      "        } else if arr[mid] < target {",
      "            left = mid + 1",
      "        } else {",
      "            right = mid - 1",
      "        }",
      "    }",
      "    return res",
      "}"
    ],
    "cyclic-sort": [
      "func cyclicSort(nums []int) {",
      "    i := 0",
      "    for i < len(nums) {",
      "        correct := nums[i] - 1",
      "        if nums[i] != nums[correct] {",
      "            nums[i], nums[correct] = nums[correct], nums[i]",
      "        } else {",
      "            i++",
      "        }",
      "    }",
      "}"
    ],
    "bit-xor": [
      "func singleNumber(nums []int) int {",
      "    result := 0",
      "    for _, num := range nums {",
      "        result ^= num // пары обнуляются",
      "    }",
      "    return result",
      "}"
    ],
    "merge-intervals": [
      "func mergeIntervals(intervals [][]int) [][]int {",
      "    sort.Slice(intervals, byStart) // по началу",
      "    result := [][]int{intervals[0]}",
      "    for i := 1; i < len(intervals); i++ {",
      "        cur := intervals[i]",
      "        last := result[len(result)-1]",
      "        if cur[0] <= last[1] {",
      "            last[1] = max(last[1], cur[1])",
      "        } else {",
      "            result = append(result, cur)",
      "        }",
      "    }",
      "    return result",
      "}"
    ],
    "list-reverse": [
      "func reverseList(head *ListNode) *ListNode {",
      "    var prev *ListNode",
      "    curr := head",
      "    for curr != nil {",
      "        next := curr.Next // сохранить остаток",
      "        curr.Next = prev  // развернуть указатель",
      "        prev = curr       // сдвинуть prev",
      "        curr = next       // сдвинуть curr",
      "    }",
      "    return prev",
      "}"
    ],
    "tree-bfs": [
      "func bfs(root *TreeNode) []int {",
      "    if root == nil { return nil }",
      "    queue := []*TreeNode{root}",
      "    var order []int",
      "    for len(queue) > 0 {",
      "        node := queue[0]",
      "        queue = queue[1:]",
      "        order = append(order, node.Val)",
      "        if node.Left != nil { queue = append(queue, node.Left) }",
      "        if node.Right != nil { queue = append(queue, node.Right) }",
      "    }",
      "    return order",
      "}"
    ],
    "tree-dfs": [
      "func dfs(node *TreeNode, order *[]int) {",
      "    if node == nil { return }",
      "    *order = append(*order, node.Val) // preorder",
      "    dfs(node.Left, order)",
      "    dfs(node.Right, order)",
      "}"
    ],
    "two-heaps": [
      "func (m *MedianFinder) AddNum(num int) {",
      "    if m.lo.Empty() || num <= m.lo.Top() {",
      "        m.lo.Push(num) // max-heap (меньшая половина)",
      "    } else {",
      "        m.hi.Push(num) // min-heap (большая половина)",
      "    }",
      "    if m.lo.Len() > m.hi.Len()+1 {",
      "        m.hi.Push(m.lo.PopTop())",
      "    } else if m.hi.Len() > m.lo.Len()+1 {",
      "        m.lo.Push(m.hi.PopTop())",
      "    }",
      "}"
    ],
    "top-k": [
      "func topKLargest(nums []int, k int) []int {",
      "    h := &MinHeap{} // куча из k наибольших",
      "    for _, num := range nums {",
      "        heap.Push(h, num)",
      "        if h.Len() > k {",
      "            heap.Pop(h) // выкинуть минимум",
      "        }",
      "    }",
      "    return h.Values()",
      "}"
    ],
    "k-way-merge": [
      "func mergeKSorted(lists [][]int) []int {",
      "    h := &MinHeap{} // (значение, список, индекс)",
      "    for i := range lists {",
      "        h.Push(lists[i][0], i, 0)",
      "    }",
      "    var out []int",
      "    for h.Len() > 0 {",
      "        v, li, ci := h.Pop() // минимальная голова",
      "        out = append(out, v)",
      "        if ci+1 < len(lists[li]) {",
      "            h.Push(lists[li][ci+1], li, ci+1)",
      "        }",
      "    }",
      "    return out",
      "}"
    ],
    "subsets-bt": [
      "func subsets(nums []int) [][]int {",
      "    var res [][]int",
      "    var cur []int",
      "    var bt func(start int)",
      "    bt = func(start int) {",
      "        res = append(res, append([]int{}, cur...)) // записать",
      "        for i := start; i < len(nums); i++ {",
      "            cur = append(cur, nums[i]) // выбрать",
      "            bt(i + 1)",
      "            cur = cur[:len(cur)-1]     // откат",
      "        }",
      "    }",
      "    bt(0)",
      "    return res",
      "}"
    ],
    "jump-game": [
      "func canJump(nums []int) bool {",
      "    maxReach := 0",
      "    for i, v := range nums {",
      "        if i > maxReach {",
      "            return false // не допрыгнуть",
      "        }",
      "        if i+v > maxReach {",
      "            maxReach = i + v",
      "        }",
      "    }",
      "    return true",
      "}"
    ],
    "graph-bfs": [
      "func bfs(adj [][]int, start int) []int {",
      "    visited := make([]bool, len(adj))",
      "    queue := []int{start}",
      "    visited[start] = true",
      "    var order []int",
      "    for len(queue) > 0 {",
      "        node := queue[0]",
      "        queue = queue[1:]",
      "        order = append(order, node)",
      "        for _, nb := range adj[node] {",
      "            if !visited[nb] {",
      "                visited[nb] = true",
      "                queue = append(queue, nb)",
      "            }",
      "        }",
      "    }",
      "    return order",
      "}"
    ],
    "grid-bfs": [
      "func bfs(grid [][]int) int {",
      "    R, C := len(grid), len(grid[0])",
      "    dist := newGrid(R, C, -1) // -1 = не посещено",
      "    queue := [][2]int{{0, 0}}",
      "    dist[0][0] = 0",
      "    for len(queue) > 0 {",
      "        r, c := pop(&queue)",
      "        if r == R-1 && c == C-1 { return dist[r][c] }",
      "        for _, d := range dirs {",
      "            nr, nc := r+d[0], c+d[1]",
      "            if free(nr, nc) && dist[nr][nc] < 0 {",
      "                dist[nr][nc] = dist[r][c] + 1",
      "                queue = append(queue, [2]int{nr, nc})",
      "            }",
      "        }",
      "    }",
      "    return -1",
      "}"
    ],
    "topo-kahn": [
      "func topoSort(adj [][]int, n int) []int {",
      "    indeg := computeIndegrees(adj, n)",
      "    queue := zeroIndegreeNodes(indeg)",
      "    var order []int",
      "    for len(queue) > 0 {",
      "        u := queue[0]; queue = queue[1:]",
      "        order = append(order, u)",
      "        for _, v := range adj[u] {",
      "            indeg[v]--",
      "            if indeg[v] == 0 { queue = append(queue, v) }",
      "        }",
      "    }",
      "    return order // len(order) < n → есть цикл",
      "}"
    ],
    "trie-search": [
      "func (t *Trie) Search(word string) bool {",
      "    node := t",
      "    for i := 0; i < len(word); i++ {",
      "        c := word[i] - 'a'",
      "        if node.children[c] == nil {",
      "            return false // символа нет",
      "        }",
      "        node = node.children[c]",
      "    }",
      "    return node.isEnd // путь есть; это слово?",
      "}"
    ],
    "kmp": [
      "func kmpSearch(text, pat string) int {",
      "    lps := buildLPS(pat)",
      "    i, j := 0, 0",
      "    for i < len(text) {",
      "        if text[i] == pat[j] {",
      "            i++; j++",
      "            if j == len(pat) { return i - j }",
      "        } else if j > 0 {",
      "            j = lps[j-1] // сдвиг по префикс-функции",
      "        } else {",
      "            i++",
      "        }",
      "    }",
      "    return -1",
      "}"
    ],
    "fenwick-prefix": [
      "func (f *Fenwick) PrefixSum(i int) int {",
      "    sum := 0",
      "    for i > 0 {",
      "        sum += f.tree[i]  // зона ответственности узла i",
      "        i -= i & (-i)     // переход к родителю",
      "    }",
      "    return sum",
      "}"
    ],
    "segtree-query": [
      "func (t *Seg) Query(node, lo, hi, ql, qr int) int {",
      "    if hi < ql || qr < lo {",
      "        return 0 // вне запроса",
      "    }",
      "    if ql <= lo && hi <= qr {",
      "        return t.sum[node] // целиком внутри",
      "    }",
      "    mid := (lo + hi) / 2",
      "    return t.Query(2*node, lo, mid, ql, qr) +",
      "        t.Query(2*node+1, mid+1, hi, ql, qr)",
      "}"
    ],
    "mst-kruskal": [
      "func kruskal(n int, edges []Edge) int {",
      "    sort.Slice(edges, byWeight) // по возрастанию веса",
      "    uf := NewUnionFind(n)",
      "    total := 0",
      "    for _, e := range edges {",
      "        if uf.Union(e.u, e.v) { // разные компоненты?",
      "            total += e.w        // берём ребро в MST",
      "        }                       // иначе цикл — пропускаем",
      "    }",
      "    return total",
      "}"
    ],
    "dijkstra": [
      "func dijkstra(adj [][]Edge, src int) []int {",
      "    dist := fill(len(adj), INF); dist[src] = 0",
      "    pq := push(src, 0)            // мин-куча (вершина, оценка)",
      "    for pq.Len() > 0 {",
      "        u := pq.PopMin()          // ближайшая нефинализированная",
      "        if u.d > dist[u.node] { continue } // устаревшая запись",
      "        for _, e := range adj[u.node] {",
      "            if nd := u.d + e.w; nd < dist[e.to] { // релаксация",
      "                dist[e.to] = nd",
      "                pq.Push(e.to, nd)",
      "            }",
      "        }",
      "    }",
      "    return dist",
      "}"
    ],
    "dp-lcs": [
      "func lcs(a, b string) int {",
      "    dp := make([][]int, len(a)+1) // (m+1)×(n+1), нулевые края",
      "    for i := 1; i <= len(a); i++ {",
      "        for j := 1; j <= len(b); j++ {",
      "            if a[i-1] == b[j-1] {",
      "                dp[i][j] = dp[i-1][j-1] + 1 // совпало → диагональ +1",
      "            } else {",
      "                dp[i][j] = max(dp[i-1][j], dp[i][j-1]) // макс(↑, ←)",
      "            }",
      "        }",
      "    }",
      "    return dp[len(a)][len(b)]",
      "}"
    ],
    "bellman-ford": [
      "func bellmanFord(n int, edges []Edge, src int) ([]int, bool) {",
      "    dist := fill(n, INF); dist[src] = 0",
      "    for i := 0; i < n-1; i++ {            // V−1 проходов",
      "        for _, e := range edges {",
      "            if dist[e.u] != INF && dist[e.u]+e.w < dist[e.v] {",
      "                dist[e.v] = dist[e.u] + e.w // релаксация",
      "            }",
      "        }",
      "    }",
      "    for _, e := range edges {             // V-й проход — детектор",
      "        if dist[e.u] != INF && dist[e.u]+e.w < dist[e.v] {",
      "            return dist, true             // отрицательный цикл",
      "        }",
      "    }",
      "    return dist, false",
      "}"
    ],
    "knapsack": [
      "func knapsack(wt, val []int, W int) int {",
      "    dp := make([][]int, len(wt)+1) // dp[i][c] — лучшая ценность",
      "    for i := 1; i <= len(wt); i++ {",
      "        for c := 0; c <= W; c++ {",
      "            dp[i][c] = dp[i-1][c]               // не берём предмет i",
      "            if wt[i-1] <= c {                   // влезает?",
      "                take := dp[i-1][c-wt[i-1]] + val[i-1]",
      "                if take > dp[i][c] { dp[i][c] = take } // берём, если выгоднее",
      "            }",
      "        }",
      "    }",
      "    return dp[len(wt)][W]",
      "}"
    ],
    "astar": [
      "func aStar(grid [][]int) int {",
      "    open := pq{{cell: start, f: h(start)}} // мин-куча по f = g + h",
      "    g[start] = 0",
      "    for open.Len() > 0 {",
      "        cur := open.PopMin()          // клетка с минимальной f",
      "        if cur == goal { return g[goal] }",
      "        closed[cur] = true",
      "        for _, nb := range neighbors(cur) {",
      "            if wall(nb) || closed[nb] { continue }",
      "            if t := g[cur] + 1; t < g[nb] { // путь через cur короче?",
      "                g[nb] = t",
      "                open.Push(nb, t+h(nb))    // f = g + эвристика",
      "            }",
      "        }",
      "    }",
      "    return -1",
      "}"
    ]
  };


  // Панель кода + ряд переменных в общей раскладке «виджет | код».


  // ===== Общий степпер ========================================================
  function mkBtn(label, title) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "algo-viz__btn";
    b.textContent = label;
    b.title = title;
    // Кнопки управления подписаны глифами (⏮ ◀ ⏵ ⏭) — для скринридера это
    // бессмысленные символы, поэтому даём текстовое доступное имя.
    b.setAttribute("aria-label", title);
    return b;
  }

  // ===== Построители «оконных» шагов (значения массива фиксированы) ===========
  // шаг: { lo, hi, mid?, info, done?, found? }
  function bSlidingWindow(arr, k) {
    var steps = [];
    if (k <= 0 || k > arr.length) return [{ lo: 0, hi: -1, info: "Некорректное k = " + k, done: true }];
    var sum = 0;
    for (var i = 0; i < k; i++) sum += arr[i];
    var maxSum = sum, bestLo = 0;
    steps.push({ lo: 0, hi: k - 1, line: 5, vars: { i: k - 1, windowSum: sum, maxSum: maxSum }, info: "Первое окно: сумма = " + sum + ", максимум = " + maxSum });
    for (var r = k; r < arr.length; r++) {
      sum += arr[r] - arr[r - k];
      var lo = r - k + 1, improved = sum > maxSum;
      if (improved) { maxSum = sum; bestLo = lo; }
      steps.push({ lo: lo, hi: r, line: 7, vars: { i: r, windowSum: sum, maxSum: maxSum }, info: "Сдвиг: +" + arr[r] + " −" + arr[r - k] + " → сумма = " + sum + (improved ? ", новый максимум = " + maxSum : ", максимум = " + maxSum) });
    }
    steps.push({ lo: bestLo, hi: bestLo + k - 1, done: true, line: 12, vars: { i: arr.length, windowSum: sum, maxSum: maxSum }, info: "Готово. Максимальная сумма окна = " + maxSum });
    return steps;
  }
  function bTwoPointers(arr, target) {
    var steps = [], lo = 0, hi = arr.length - 1;
    while (lo < hi) {
      var sum = arr[lo] + arr[hi];
      var base = { lo: lo, hi: hi, "arr[lo]": arr[lo], "arr[hi]": arr[hi], sum: sum };
      if (sum === target) { steps.push({ lo: lo, hi: hi, done: true, found: true, line: 5, vars: base, info: arr[lo] + " + " + arr[hi] + " = " + target + " — пара найдена!" }); return steps; }
      if (sum < target) { steps.push({ lo: lo, hi: hi, line: 7, vars: base, info: arr[lo] + " + " + arr[hi] + " = " + sum + " < " + target + " → left++" }); lo++; }
      else { steps.push({ lo: lo, hi: hi, line: 9, vars: base, info: arr[lo] + " + " + arr[hi] + " = " + sum + " > " + target + " → right--" }); hi--; }
    }
    steps.push({ lo: lo, hi: hi, done: true, line: 12, vars: { lo: lo, hi: hi, "arr[lo]": lo < arr.length ? arr[lo] : "—", "arr[hi]": hi >= 0 ? arr[hi] : "—", sum: "—" }, info: "Пара с суммой " + target + " не найдена" });
    return steps;
  }
  // Заяц и черепаха: slow и fast как индексы в списке (vars хранит значения узлов).
  function bListCycle(list, cyc) {
    var n = list.length;
    var hasCyc = !isNaN(cyc) && cyc >= 0 && cyc < n;
    function nextIdx(i) { return i === n - 1 ? (hasCyc ? cyc : -1) : i + 1; }
    if (!n) return [{ slow: -1, fast: -1, done: true, line: 9, vars: { slow: "nil", fast: "nil" }, info: "Пустой список" }];
    var steps = [{ slow: 0, fast: 0, line: 1, vars: { slow: list[0], fast: list[0] }, info: "Старт: slow и fast на голове " + list[0] }];
    var slow = 0, fast = 0, guard = 0;
    while (guard++ < 4 * n + 4) {
      var f1 = nextIdx(fast); if (f1 < 0) { steps.push({ slow: slow, fast: -1, done: true, line: 9, vars: { slow: list[slow], fast: "nil" }, info: "fast дошёл до nil — цикла нет" }); break; }
      var f2 = nextIdx(f1); if (f2 < 0) { steps.push({ slow: slow, fast: -1, done: true, line: 9, vars: { slow: list[slow], fast: "nil" }, info: "fast дошёл до nil — цикла нет" }); break; }
      slow = nextIdx(slow); fast = f2;
      if (slow === fast) { steps.push({ slow: slow, fast: fast, meet: true, found: true, done: true, line: 6, vars: { slow: list[slow], fast: list[fast] }, info: "slow и fast встретились на " + list[slow] + " — цикл есть!" }); break; }
      steps.push({ slow: slow, fast: fast, line: 4, vars: { slow: list[slow], fast: list[fast] }, info: "slow → " + list[slow] + ", fast → " + list[fast] });
    }
    return steps;
  }
  // Переменное окно: самая длинная подстрока с ≤ k различными символами.
  function bSlidingVar(chars, k) {
    var n = chars.length, freq = {}, left = 0, maxLen = 0, bestL = 0, bestR = -1, steps = [];
    function distinct() { return Object.keys(freq).length; }
    if (k <= 0 || !n) return [{ lo: 0, hi: -1, done: true, line: 12, vars: { left: 0, right: -1, distinct: 0, maxLen: 0 }, info: "Некорректное k или пустая строка" }];
    for (var right = 0; right < n; right++) {
      freq[chars[right]] = (freq[chars[right]] || 0) + 1;
      while (distinct() > k) {
        freq[chars[left]]--;
        if (freq[chars[left]] === 0) delete freq[chars[left]];
        left++;
      }
      var curLen = right - left + 1, improved = curLen > maxLen;
      if (improved) { maxLen = curLen; bestL = left; bestR = right; }
      steps.push({ lo: left, hi: right, line: 10, improved: improved, vars: { left: left, right: right, distinct: distinct(), maxLen: maxLen }, info: "Окно «" + chars.slice(left, right + 1).join("") + "», различных " + distinct() + (improved ? " → новая макс. длина " + maxLen : "") });
    }
    steps.push({ lo: bestL, hi: bestR, done: true, line: 12, vars: { left: bestL, right: bestR, distinct: bestR - bestL + 1 > 0 ? "—" : 0, maxLen: maxLen }, info: "Самая длинная подстрока с ≤" + k + " различными: длина " + maxLen });
    return steps;
  }
  // Одно направление: удаление дубликатов из отсортированного массива на месте.
  function bDedup(arr) {
    var a = arr.slice(), n = a.length;
    if (!n) return [{ slow: 0, fast: 0, done: true, line: 9, values: [], vars: { slow: 0, fast: 0, "nums[slow]": "—", "nums[fast]": "—", len: 0 }, info: "Пустой массив" }];
    var slow = 0, steps = [];
    steps.push({ slow: 0, fast: 0, line: 2, values: a.slice(), vars: { slow: 0, fast: 0, "nums[slow]": a[0], "nums[fast]": a[0], len: 1 }, info: "slow=0 — первый элемент всегда уникален" });
    for (var fast = 1; fast < n; fast++) {
      if (a[slow] !== a[fast]) {
        slow++; a[slow] = a[fast];
        steps.push({ slow: slow, fast: fast, line: 6, values: a.slice(), vars: { slow: slow, fast: fast, "nums[slow]": a[slow], "nums[fast]": a[fast], len: slow + 1 }, info: "Новый уникальный " + a[fast] + " → пишем в nums[" + slow + "]" });
      } else {
        steps.push({ slow: slow, fast: fast, line: 4, values: a.slice(), vars: { slow: slow, fast: fast, "nums[slow]": a[slow], "nums[fast]": a[fast], len: slow + 1 }, info: "nums[" + fast + "]=" + a[fast] + " — дубликат, пропускаем" });
      }
    }
    steps.push({ slow: slow, fast: n - 1, done: true, found: true, line: 9, values: a.slice(), vars: { slow: slow, fast: n - 1, "nums[slow]": a[slow], "nums[fast]": a[n - 1], len: slow + 1 }, info: "Готово: уникальных элементов " + (slow + 1) });
    return steps;
  }
  // Середина списка: fast доходит до конца — slow в середине.
  function bListMiddle(list) {
    var n = list.length;
    if (!n) return [{ slow: -1, fast: -1, done: true, line: 6, vars: { slow: "nil", fast: "nil" }, info: "Пустой список" }];
    var steps = [{ slow: 0, fast: 0, line: 1, vars: { slow: list[0], fast: list[0] }, info: "Старт: slow и fast на голове " + list[0] }];
    var slow = 0, fast = 0, guard = 0;
    while (fast <= n - 2 && guard++ < n + 2) {
      slow++; fast += 2;
      var fv = fast <= n - 1 ? list[fast] : "nil";
      steps.push({ slow: slow, fast: fast <= n - 1 ? fast : -1, line: 4, vars: { slow: list[slow], fast: fv }, info: "slow → " + list[slow] + ", fast → " + fv });
    }
    steps.push({ slow: slow, fast: fast <= n - 1 ? fast : -1, done: true, found: true, line: 6, vars: { slow: list[slow], fast: fast <= n - 1 ? list[fast] : "nil" }, info: "fast в конце → середина = " + list[slow] });
    return steps;
  }
  function bBinarySearch(arr, target) {
    var steps = [], lo = 0, hi = arr.length - 1;
    function v(l, h, m) { return { left: l, right: h, mid: m, "arr[mid]": arr[m], target: target }; }
    while (lo <= hi) {
      var mid = lo + ((hi - lo) >> 1);
      var base = "lo=" + lo + ", hi=" + hi + ", mid=" + mid + " → arr[" + mid + "]=" + arr[mid];
      if (arr[mid] === target) { steps.push({ lo: lo, hi: hi, mid: mid, line: 4, vars: v(lo, hi, mid), info: base + " = " + target + " ✓" }); steps.push({ lo: mid, hi: mid, mid: mid, found: true, done: true, line: 5, vars: v(mid, mid, mid), info: "Найдено на индексе " + mid }); return steps; }
      if (arr[mid] < target) { steps.push({ lo: lo, hi: hi, mid: mid, line: 7, vars: v(lo, hi, mid), info: base + " < " + target + " → правее (lo = mid+1)" }); lo = mid + 1; }
      else { steps.push({ lo: lo, hi: hi, mid: mid, line: 9, vars: v(lo, hi, mid), info: base + " > " + target + " → левее (hi = mid-1)" }); hi = mid - 1; }
    }
    steps.push({ lo: 0, hi: -1, mid: -1, done: true, line: 12, vars: { left: lo, right: hi, mid: "—", "arr[mid]": "—", target: target }, info: target + " не найдено" });
    return steps;
  }
  // Бинарный поиск ПЕРВОГО вхождения: при равенстве запоминаем и идём левее.
  function bBinarySearchFirst(arr, target) {
    var steps = [], lo = 0, hi = arr.length - 1, res = -1;
    function v(l, h, m) { return { left: l, right: h, mid: m, "arr[mid]": arr[m], res: res }; }
    while (lo <= hi) {
      var mid = lo + ((hi - lo) >> 1);
      var base = "mid=" + mid + ", arr[" + mid + "]=" + arr[mid];
      if (arr[mid] === target) { res = mid; steps.push({ lo: lo, hi: hi, mid: mid, line: 6, vars: v(lo, hi, mid), info: base + " = " + target + " → запомнили res=" + mid + ", идём левее" }); hi = mid - 1; }
      else if (arr[mid] < target) { steps.push({ lo: lo, hi: hi, mid: mid, line: 8, vars: v(lo, hi, mid), info: base + " < " + target + " → правее" }); lo = mid + 1; }
      else { steps.push({ lo: lo, hi: hi, mid: mid, line: 10, vars: v(lo, hi, mid), info: base + " > " + target + " → левее" }); hi = mid - 1; }
    }
    if (res >= 0) steps.push({ lo: res, hi: res, mid: res, found: true, done: true, line: 13, vars: { left: lo, right: hi, mid: res, "arr[mid]": arr[res], res: res }, info: "Первое вхождение " + target + " — индекс " + res });
    else steps.push({ lo: 0, hi: -1, mid: -1, done: true, line: 13, vars: { left: lo, right: hi, mid: "—", "arr[mid]": "—", res: -1 }, info: target + " не найдено" });
    return steps;
  }
  // Дерево Фенвика: prefixSum(target) как сумма «зон ответственности» BIT-узлов.
  function bFenwick(arr, target) {
    var steps = [], i = target + 1, sum = 0; // 1-индексация внутри
    while (i > 0) {
      var low = i & (-i), lo0 = i - low, hi0 = i - 1, partial = 0;
      for (var k = lo0; k <= hi0; k++) partial += arr[k];
      sum += partial;
      steps.push({ lo: lo0, hi: hi0, line: 3, vars: { "BIT-узел": i, "зона": "[" + lo0 + ".." + hi0 + "]", "итог": sum }, info: "BIT-узел " + i + " покрывает [" + lo0 + ".." + hi0 + "] = " + partial + "; итог " + sum + ". Дальше i −= " + low });
      i -= low;
    }
    steps.push({ lo: 0, hi: target, done: true, found: true, line: 6, vars: { "BIT-узел": "—", "зона": "[0.." + target + "]", "итог": sum }, info: "PrefixSum(0.." + target + ") = " + sum });
    return steps;
  }
  // Дерево отрезков: запрос суммы на [ql, qr].
  function bSegQuery(arr, ql, qr) {
    var nodes = [];
    (function build(lo, hi, depth) {
      var id = nodes.length; nodes.push({ lo: lo, hi: hi, sum: 0, left: -1, right: -1, depth: depth });
      if (lo === hi) { nodes[id].sum = arr[lo]; return id; }
      var mid = (lo + hi) >> 1;
      var L = build(lo, mid, depth + 1), Rr = build(mid + 1, hi, depth + 1);
      nodes[id].left = L; nodes[id].right = Rr; nodes[id].sum = nodes[L].sum + nodes[Rr].sum;
      return id;
    })(0, arr.length - 1, 0);
    var nodeStep = new Array(nodes.length).fill(-1), nodeState = new Array(nodes.length).fill("");
    var steps = [], total = 0;
    function mark(id, state, line, info) { nodeStep[id] = steps.length; nodeState[id] = state; steps.push({ line: line, vars: { "узел": "[" + nodes[id].lo + "," + nodes[id].hi + "]", "сумма узла": nodes[id].sum, "итог": total }, info: info }); }
    (function q(id) {
      var nd = nodes[id];
      if (nd.hi < ql || qr < nd.lo) { mark(id, "skip", 2, "[" + nd.lo + "," + nd.hi + "] вне запроса → пропускаем"); return; }
      if (ql <= nd.lo && nd.hi <= qr) { total += nd.sum; mark(id, "take", 5, "[" + nd.lo + "," + nd.hi + "] целиком внутри → +" + nd.sum + " (итог " + total + ")"); return; }
      mark(id, "split", 8, "[" + nd.lo + "," + nd.hi + "] частично → спускаемся к детям");
      q(nd.left); q(nd.right);
    })(0);
    steps.push({ done: true, found: true, line: 5, vars: { "узел": "[" + ql + "," + qr + "]", "сумма узла": "—", "итог": total }, info: "Сумма на [" + ql + "," + qr + "] = " + total });
    steps.forEach(function (s, i) { s._i = i; });
    return { nodes: nodes, nodeStep: nodeStep, nodeState: nodeState, steps: steps };
  }
  function segViz(panel, ctx) {
    var nodes = ctx.nodes, nodeStep = ctx.nodeStep, nodeState = ctx.nodeState;
    var maxDepth = nodes.reduce(function (m, n) { return Math.max(m, n.depth); }, 0);
    var tree = document.createElement("div"); tree.className = "algo-tp__tree";
    var byId = {};
    for (var d = 0; d <= maxDepth; d++) {
      var row = document.createElement("div"); row.className = "algo-tp__trow";
      nodes.map(function (n, idx) { return { n: n, idx: idx }; }).filter(function (o) { return o.n.depth === d; }).sort(function (a, b) { return a.n.lo - b.n.lo; }).forEach(function (o) {
        var c = document.createElement("div"); c.className = "algo-tp__tnode algo-tp__tnode--seg"; c.textContent = o.n.sum; c.title = "[" + o.n.lo + "," + o.n.hi + "]"; row.appendChild(c); byId[o.idx] = c;
      });
      tree.appendChild(row);
    }
    panel.appendChild(tree);
    return function (s) {
      var i = s._i;
      nodes.forEach(function (_, id) {
        var c = byId[id], shown = nodeStep[id] >= 0 && nodeStep[id] <= i;
        c.classList.toggle("algo-tp__tnode--take", shown && nodeState[id] === "take");
        c.classList.toggle("algo-tp__tnode--split", shown && nodeState[id] === "split");
        c.classList.toggle("algo-tp__tnode--skip", shown && nodeState[id] === "skip");
        c.classList.toggle("algo-tp__tnode--current", nodeStep[id] === i);
      });
    };
  }
  // MST (алгоритм Краскала): рёбра add/skip + Union-Find.
  function bMstKruskal(labels, edges) {
    var n = labels.length;
    var sorted = edges.slice().sort(function (a, b) { return a.w - b.w; });
    var parent = labels.map(function (_, i) { return i; });
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    var total = 0, edgeStep = edges.map(function () { return -1; }), edgeState = edges.map(function () { return ""; });
    var steps = [{ line: 1, vars: { "ребро": "—", "вес": "—", "вес MST": 0 }, info: "Рёбра отсортированы по весу. Берём лёгкое ребро, если оно не создаёт цикл (Union-Find)." }];
    sorted.forEach(function (e) {
      var ei = edges.indexOf(e), ru = find(e.u), rv = find(e.v);
      if (ru !== rv) { parent[ru] = rv; total += e.w; edgeState[ei] = "add"; edgeStep[ei] = steps.length; steps.push({ line: 6, vars: { "ребро": labels[e.u] + "–" + labels[e.v], "вес": e.w, "вес MST": total }, info: "Ребро " + labels[e.u] + "–" + labels[e.v] + " (вес " + e.w + ") соединяет разные компоненты → берём (итог " + total + ")" }); }
      else { edgeState[ei] = "skip"; edgeStep[ei] = steps.length; steps.push({ line: 5, vars: { "ребро": labels[e.u] + "–" + labels[e.v], "вес": e.w, "вес MST": total }, info: "Ребро " + labels[e.u] + "–" + labels[e.v] + " (вес " + e.w + ") замкнуло бы цикл → пропускаем" }); }
    });
    steps.push({ done: true, found: true, line: 9, vars: { "ребро": "—", "вес": "—", "вес MST": total }, info: "Минимальное остовное дерево, суммарный вес = " + total });
    steps.forEach(function (s, i) { s._i = i; });
    return { labels: labels, edges: edges, edgeStep: edgeStep, edgeState: edgeState, steps: steps };
  }
  function mstViz(panel, ctx) {
    var labels = ctx.labels, edges = ctx.edges, edgeStep = ctx.edgeStep, edgeState = ctx.edgeState, n = labels.length;
    var W = 380, H = 300, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 34;
    var pos = labels.map(function (_, i) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
    var svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "algo-viz__graph");
    var lineEls = edges.map(function (e) {
      var a = pos[e.u], b = pos[e.v];
      var ln = document.createElementNS(SVGNS, "line"); ln.setAttribute("x1", a.x); ln.setAttribute("y1", a.y); ln.setAttribute("x2", b.x); ln.setAttribute("y2", b.y); ln.setAttribute("class", "algo-viz__gedge"); svg.appendChild(ln);
      var wt = document.createElementNS(SVGNS, "text"); wt.setAttribute("x", (a.x + b.x) / 2); wt.setAttribute("y", (a.y + b.y) / 2 - 3); wt.setAttribute("text-anchor", "middle"); wt.setAttribute("class", "algo-viz__gbadge"); wt.textContent = e.w; svg.appendChild(wt);
      return ln;
    });
    labels.forEach(function (lab, i) {
      var c = document.createElementNS(SVGNS, "circle"); c.setAttribute("cx", pos[i].x); c.setAttribute("cy", pos[i].y); c.setAttribute("r", 15); c.setAttribute("class", "algo-viz__gnode"); svg.appendChild(c);
      var t = document.createElementNS(SVGNS, "text"); t.setAttribute("x", pos[i].x); t.setAttribute("y", pos[i].y + 4); t.setAttribute("text-anchor", "middle"); t.setAttribute("class", "algo-viz__gtext"); t.textContent = lab; svg.appendChild(t);
    });
    panel.appendChild(svg);
    return function (s) {
      var i = s._i;
      lineEls.forEach(function (ln, ei) {
        var shown = edgeStep[ei] >= 0 && edgeStep[ei] <= i;
        ln.classList.toggle("algo-viz__gedge--mst", shown && edgeState[ei] === "add");
        ln.classList.toggle("algo-viz__gedge--skip", shown && edgeState[ei] === "skip");
        ln.classList.toggle("algo-viz__gedge--cur", edgeStep[ei] === i);
      });
    };
  }

  // Дейкстра: кратчайшие пути от источника (неотрицательные веса).
  // Приоритетная очередь + релаксация рёбер; «ленивое» удаление устаревших записей.
  function bDijkstra(labels, edges, start) {
    var n = labels.length;
    var adj = labels.map(function () { return []; });
    edges.forEach(function (e) { adj[e.u].push({ to: e.v, w: e.w }); });
    var INF = Infinity;
    var dist = new Array(n).fill(INF), settled = new Array(n).fill(false);
    if (isNaN(start) || start < 0 || start >= n) start = 0;
    dist[start] = 0;
    var pq = [{ node: start, d: 0 }];
    function disp(v) { return v === INF ? "∞" : v; }
    function distSnap() { return dist.map(disp); }
    function pqLabel() { return pq.length ? "[" + pq.slice().sort(function (a, b) { return a.d - b.d; }).map(function (x) { return labels[x.node] + ":" + x.d; }).join(", ") + "]" : "∅"; }
    var steps = [{
      dist: distSnap(), settled: settled.slice(), cur: -1, edge: null, line: 2,
      vars: { "u": "—", "dist[u]": "—", "очередь": pqLabel(), "ребро": "—", "dist[v]": "—" },
      info: "Старт: dist[" + labels[start] + "] = 0, остальные ∞. Источник — в очередь."
    }];
    var guard = 0, lim = 4 * (n + edges.length) + 20;
    while (pq.length && guard++ < lim) {
      var mi = 0; for (var i = 1; i < pq.length; i++) if (pq[i].d < pq[mi].d) mi = i;
      var top = pq.splice(mi, 1)[0], u = top.node;
      if (top.d > dist[u]) {
        steps.push({
          dist: distSnap(), settled: settled.slice(), cur: -1, edge: null, line: 5,
          vars: { "u": labels[u], "dist[u]": disp(dist[u]), "очередь": pqLabel(), "ребро": "—", "dist[v]": "—" },
          info: "Запись " + labels[u] + ":" + top.d + " устарела (> " + disp(dist[u]) + ") — пропускаем."
        });
        continue;
      }
      settled[u] = true;
      steps.push({
        dist: distSnap(), settled: settled.slice(), cur: u, edge: null, line: 4,
        vars: { "u": labels[u], "dist[u]": disp(dist[u]), "очередь": pqLabel(), "ребро": "—", "dist[v]": "—" },
        info: "Извлекаем ближайшую вершину " + labels[u] + " (dist = " + disp(dist[u]) + ") — её расстояние финально."
      });
      adj[u].forEach(function (e) {
        var v = e.to, old = dist[v], nd = dist[u] + e.w, improved = nd < old;
        if (improved) { dist[v] = nd; pq.push({ node: v, d: nd }); }
        steps.push({
          dist: distSnap(), settled: settled.slice(), cur: u, edge: [u, v], line: improved ? 8 : 7,
          vars: { "u": labels[u], "dist[u]": disp(dist[u]), "очередь": pqLabel(), "ребро": labels[u] + "→" + labels[v] + " (" + e.w + ")", "dist[v]": improved ? (disp(old) + " → " + nd) : (disp(old) + " (без изм.)") },
          info: improved
            ? "Релаксация " + labels[u] + "→" + labels[v] + ": " + disp(dist[u]) + " + " + e.w + " = " + nd + " < " + disp(old) + " → dist[" + labels[v] + "] = " + nd
            : "Ребро " + labels[u] + "→" + labels[v] + ": " + disp(dist[u]) + " + " + e.w + " = " + nd + " ≥ " + disp(old) + " → без изменений."
        });
      });
    }
    steps.push({
      dist: distSnap(), settled: settled.slice(), cur: -1, edge: null, done: true, found: true, line: 13,
      vars: { "u": "—", "dist[u]": "—", "очередь": "∅", "ребро": "—", "dist[v]": "—" },
      info: "Очередь пуста. Кратчайшие расстояния: " + labels.map(function (l, i) { return l + ":" + disp(dist[i]); }).join(", ")
    });
    steps.forEach(function (s, i) { s._i = i; });
    return { labels: labels, edges: edges, steps: steps };
  }
  // Граф Дейкстры: ориентированные взвешенные рёбра + подпись dist под каждой вершиной.
  function dijkstraViz(panel, ctx) {
    var labels = ctx.labels, edges = ctx.edges, n = labels.length;
    var W = 420, H = 320, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 46;
    var pos = labels.map(function (_, i) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
    var svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "algo-viz__graph");
    var defs = document.createElementNS(SVGNS, "defs");
    var marker = document.createElementNS(SVGNS, "marker");
    marker.setAttribute("id", "algoarrow-dij"); marker.setAttribute("viewBox", "0 0 10 10"); marker.setAttribute("refX", "9"); marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "7"); marker.setAttribute("markerHeight", "7"); marker.setAttribute("orient", "auto-start-reverse");
    var mp = document.createElementNS(SVGNS, "path"); mp.setAttribute("d", "M0,0 L10,5 L0,10 z"); mp.setAttribute("fill", "#888");
    marker.appendChild(mp); defs.appendChild(marker); svg.appendChild(defs);
    var edgeKey = {};
    var lineEls = edges.map(function (e, ei) {
      var a = pos[e.u], b = pos[e.v], dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len;
      var ln = document.createElementNS(SVGNS, "line");
      ln.setAttribute("x1", a.x + ux * 17); ln.setAttribute("y1", a.y + uy * 17); ln.setAttribute("x2", b.x - ux * 20); ln.setAttribute("y2", b.y - uy * 20);
      ln.setAttribute("marker-end", "url(#algoarrow-dij)"); ln.setAttribute("class", "algo-viz__gedge"); svg.appendChild(ln);
      var wt = document.createElementNS(SVGNS, "text"); wt.setAttribute("x", (a.x + b.x) / 2 + uy * 9); wt.setAttribute("y", (a.y + b.y) / 2 - ux * 9); wt.setAttribute("text-anchor", "middle"); wt.setAttribute("class", "algo-viz__gbadge"); wt.textContent = e.w; svg.appendChild(wt);
      edgeKey[e.u + "->" + e.v] = ei;
      return ln;
    });
    var circles = [], dlabels = [];
    labels.forEach(function (lab, i) {
      var c = document.createElementNS(SVGNS, "circle"); c.setAttribute("cx", pos[i].x); c.setAttribute("cy", pos[i].y); c.setAttribute("r", 16); c.setAttribute("class", "algo-viz__gnode"); svg.appendChild(c); circles.push(c);
      var t = document.createElementNS(SVGNS, "text"); t.setAttribute("x", pos[i].x); t.setAttribute("y", pos[i].y + 4); t.setAttribute("text-anchor", "middle"); t.setAttribute("class", "algo-viz__gtext"); t.textContent = lab; svg.appendChild(t);
      var dl = document.createElementNS(SVGNS, "text"); dl.setAttribute("x", pos[i].x); dl.setAttribute("y", pos[i].y + 31); dl.setAttribute("text-anchor", "middle"); dl.setAttribute("class", "algo-viz__gdist"); svg.appendChild(dl); dlabels.push(dl);
    });
    panel.appendChild(svg);
    return function (s) {
      circles.forEach(function (c, j) {
        c.classList.toggle("algo-viz__gnode--visited", !!s.settled[j]);
        c.classList.toggle("algo-viz__gnode--current", j === s.cur);
      });
      dlabels.forEach(function (dl, j) { dl.textContent = s.dist[j]; });
      lineEls.forEach(function (ln, ei) { ln.classList.toggle("algo-viz__gedge--cur", !!s.edge && edgeKey[s.edge[0] + "->" + s.edge[1]] === ei); });
    };
  }

  // Bellman–Ford: V−1 проходов релаксации по ВСЕМ рёбрам + V-й проход как детектор
  // отрицательного цикла. Переиспользует dijkstraViz (settled = «расстояние конечно»).
  function bBellmanFord(labels, edges, start) {
    var n = labels.length, INF = Infinity;
    var dist = new Array(n).fill(INF);
    if (isNaN(start) || start < 0 || start >= n) start = 0;
    dist[start] = 0;
    function disp(v) { return v === INF ? "∞" : v; }
    function distSnap() { return dist.map(disp); }
    function reached() { return dist.map(function (d) { return d < INF; }); }
    var steps = [{
      dist: distSnap(), settled: reached(), cur: start, edge: null, line: 1,
      vars: { "проход": "—", "ребро": "—", "dist[u]": "0", "dist[v]": "—", "релаксация": "—" },
      info: "Старт: dist[" + labels[start] + "] = 0, остальные ∞. Делаем V−1 = " + (n - 1) + " проходов релаксации по всем рёбрам."
    }];
    for (var pass = 1; pass <= n - 1; pass++) {
      steps.push({
        dist: distSnap(), settled: reached(), cur: -1, edge: null, line: 2,
        vars: { "проход": pass + " из " + (n - 1), "ребро": "—", "dist[u]": "—", "dist[v]": "—", "релаксация": "—" },
        info: "Проход " + pass + " из " + (n - 1) + ": перебираем все рёбра и пробуем укоротить пути."
      });
      edges.forEach(function (e) {
        var u = e.u, v = e.v, w = e.w, old = dist[v];
        var relax = dist[u] !== INF && dist[u] + w < old;
        if (relax) dist[v] = dist[u] + w;
        steps.push({
          dist: distSnap(), settled: reached(), cur: u, edge: [u, v], line: relax ? 5 : 4,
          vars: { "проход": pass + " из " + (n - 1), "ребро": labels[u] + "→" + labels[v] + " (" + w + ")", "dist[u]": disp(dist[u]), "dist[v]": relax ? (disp(old) + " → " + dist[v]) : (disp(old) + " (без изм.)"), "релаксация": relax ? "да" : "нет" },
          info: relax
            ? "Релаксация " + labels[u] + "→" + labels[v] + ": " + disp(dist[u]) + " + " + w + " = " + dist[v] + " < " + disp(old) + " → обновляем dist[" + labels[v] + "]"
            : (dist[u] === INF
              ? "Ребро " + labels[u] + "→" + labels[v] + ": из " + labels[u] + " пока не дошли (∞) → пропуск"
              : "Ребро " + labels[u] + "→" + labels[v] + ": " + disp(dist[u]) + " + " + w + " = " + (dist[u] + w) + " ≥ " + disp(old) + " → без изменений")
        });
      });
    }
    var neg = false;
    edges.forEach(function (e) { if (dist[e.u] !== INF && dist[e.u] + e.w < dist[e.v]) neg = true; });
    steps.push({
      dist: distSnap(), settled: reached(), cur: -1, edge: null, done: true, found: !neg, line: neg ? 11 : 14,
      vars: { "проход": "V-й (детектор)", "ребро": "—", "dist[u]": "—", "dist[v]": "—", "релаксация": neg ? "ещё да!" : "нет" },
      info: neg
        ? "На V-м проходе расстояние всё ещё улучшается → в графе ОТРИЦАТЕЛЬНЫЙ ЦИКЛ, кратчайших путей нет."
        : "V-й проход ничего не улучшил → отрицательного цикла нет. Кратчайшие расстояния: " + labels.map(function (l, i) { return l + ":" + disp(dist[i]); }).join(", ")
    });
    steps.forEach(function (s, i) { s._i = i; });
    return { labels: labels, edges: edges, steps: steps };
  }

  // Жадный Jump Game: ведём самую дальнюю достижимую позицию.
  function bJump(arr) {
    var n = arr.length, steps = [], maxReach = 0;
    for (var i = 0; i < n; i++) {
      if (i > maxReach) { steps.push({ lo: 0, hi: maxReach, mid: i, done: true, line: 4, vars: { i: i, "nums[i]": arr[i], maxReach: maxReach }, info: "Индекс " + i + " недостижим (maxReach=" + maxReach + ") → нельзя допрыгнуть" }); return steps; }
      if (i + arr[i] > maxReach) maxReach = i + arr[i];
      steps.push({ lo: 0, hi: Math.min(maxReach, n - 1), mid: i, line: 7, vars: { i: i, "nums[i]": arr[i], maxReach: maxReach }, info: "i=" + i + ", nums[i]=" + arr[i] + " → maxReach=" + maxReach + (maxReach >= n - 1 ? " (конец достижим)" : "") });
    }
    steps.push({ lo: 0, hi: n - 1, found: true, done: true, line: 10, vars: { i: "—", "nums[i]": "—", maxReach: maxReach }, info: "Последний индекс достижим — можно!" });
    return steps;
  }
  // Backtracking: все подмножества (выбрать → рекурсия → откат).
  function bSubsets(set) {
    var n = set.length, steps = [], result = [], current = [];
    function snap(extra) { var s = { current: current.slice(), results: result.map(function (x) { return x.slice(); }) }; for (var k in extra) s[k] = extra[k]; steps.push(s); }
    (function bt(start) {
      result.push(current.slice());
      snap({ action: "record", line: 5, vars: { "действие": "записать", "текущее": "[" + current.join(",") + "]", "найдено": result.length }, info: "Записываем подмножество [" + current.join(", ") + "]" });
      for (var i = start; i < n; i++) {
        current.push(set[i]);
        snap({ action: "choose", pick: i, line: 7, vars: { "действие": "выбрать " + set[i], "текущее": "[" + current.join(",") + "]", "найдено": result.length }, info: "Берём " + set[i] + " → рекурсия" });
        bt(i + 1);
        current.pop();
        snap({ action: "back", pick: i, line: 9, vars: { "действие": "откат " + set[i], "текущее": "[" + current.join(",") + "]", "найдено": result.length }, info: "Откат: убираем " + set[i] });
      }
    })(0);
    snap({ done: true, found: true, line: 13, vars: { "действие": "готово", "текущее": "—", "найдено": result.length }, info: "Готово: " + result.length + " подмножеств" });
    return steps;
  }
  function subsetsViz(panel, ctx) {
    var set = ctx.set;
    var wrap = document.createElement("div"); wrap.className = "algo-tp__collection";
    var setCells = vizRow(wrap, "Множество");
    var setEls = set.map(function (v) { var c = document.createElement("div"); c.className = "algo-tp__ccell"; c.textContent = v; setCells.appendChild(c); return c; });
    var curCells = vizRow(wrap, "Текущее");
    var chipCells = vizRow(wrap, "Найдено");
    panel.appendChild(wrap);
    return function (s) {
      setEls.forEach(function (c, j) {
        c.classList.toggle("algo-tp__ccell--top", s.action === "choose" && s.pick === j);
        c.classList.toggle("algo-tp__ccell--cur", s.action === "back" && s.pick === j);
      });
      curCells.innerHTML = "";
      if (!s.current.length) { var e = document.createElement("span"); e.className = "algo-tp__cempty"; e.textContent = "∅"; curCells.appendChild(e); }
      else s.current.forEach(function (v) { var c = document.createElement("div"); c.className = "algo-tp__ccell algo-tp__ccell--out"; c.textContent = v; curCells.appendChild(c); });
      chipCells.innerHTML = "";
      s.results.forEach(function (sub, k) { var ch = document.createElement("span"); ch.className = "algo-tp__chip2" + (s.action === "record" && k === s.results.length - 1 ? " algo-tp__chip2--new" : ""); ch.textContent = "{" + sub.join(",") + "}"; chipCells.appendChild(ch); });
    };
  }

  // ===== Графовые дашборды (BFS по графу/сетке, топосорт Кана) ===============
  function bGraphBfs(labels, edges, start) {
    var n = labels.length, adj = labels.map(function () { return []; });
    edges.forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
    var visited = new Array(n).fill(false), queue = [start], order = [];
    visited[start] = true;
    function qLabels() { return "[" + queue.map(function (x) { return labels[x]; }).join(",") + "]"; }
    var steps = [{ current: -1, visited: visited.slice(), line: 3, vars: { "узел": "—", "очередь": qLabels(), "порядок": "—" }, info: "Старт с вершины " + labels[start] + " (помечена, в очереди)." }];
    while (queue.length) {
      var node = queue.shift(); order.push(node);
      adj[node].forEach(function (nb) { if (!visited[nb]) { visited[nb] = true; queue.push(nb); } });
      steps.push({ current: node, visited: visited.slice(), line: 8, vars: { "узел": labels[node], "очередь": qLabels(), "порядок": order.map(function (x) { return labels[x]; }).join(" → ") }, info: "Извлекаем " + labels[node] + ". Порядок BFS: " + order.map(function (x) { return labels[x]; }).join(" → ") });
    }
    if (steps.length) { steps[steps.length - 1].done = true; steps[steps.length - 1].found = true; }
    return steps;
  }
  function graphVizFactory(directed) {
    return function (panel, ctx) {
      var labels = ctx.labels, edges = ctx.edges, n = labels.length;
      var W = 380, H = 280, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 34;
      var pos = labels.map(function (_, i) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
      var svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "algo-viz__graph");
      if (directed) {
        var defs = document.createElementNS(SVGNS, "defs");
        var marker = document.createElementNS(SVGNS, "marker");
        marker.setAttribute("id", "algoarrow"); marker.setAttribute("viewBox", "0 0 10 10"); marker.setAttribute("refX", "9"); marker.setAttribute("refY", "5");
        marker.setAttribute("markerWidth", "7"); marker.setAttribute("markerHeight", "7"); marker.setAttribute("orient", "auto-start-reverse");
        var mpath = document.createElementNS(SVGNS, "path"); mpath.setAttribute("d", "M0,0 L10,5 L0,10 z"); mpath.setAttribute("fill", "#888");
        marker.appendChild(mpath); defs.appendChild(marker); svg.appendChild(defs);
      }
      edges.forEach(function (e) {
        var a = pos[e[0]], b = pos[e[1]], ln = document.createElementNS(SVGNS, "line");
        if (directed) { var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len; ln.setAttribute("x1", a.x + ux * 17); ln.setAttribute("y1", a.y + uy * 17); ln.setAttribute("x2", b.x - ux * 20); ln.setAttribute("y2", b.y - uy * 20); ln.setAttribute("marker-end", "url(#algoarrow)"); }
        else { ln.setAttribute("x1", a.x); ln.setAttribute("y1", a.y); ln.setAttribute("x2", b.x); ln.setAttribute("y2", b.y); }
        ln.setAttribute("class", "algo-viz__gedge"); svg.appendChild(ln);
      });
      var circles = [], badges = [];
      labels.forEach(function (lab, i) {
        var c = document.createElementNS(SVGNS, "circle"); c.setAttribute("cx", pos[i].x); c.setAttribute("cy", pos[i].y); c.setAttribute("r", 16); c.setAttribute("class", "algo-viz__gnode"); svg.appendChild(c); circles.push(c);
        var t = document.createElementNS(SVGNS, "text"); t.setAttribute("x", pos[i].x); t.setAttribute("y", pos[i].y + 4); t.setAttribute("text-anchor", "middle"); t.setAttribute("class", "algo-viz__gtext"); t.textContent = lab; svg.appendChild(t);
        if (directed) { var bt = document.createElementNS(SVGNS, "text"); bt.setAttribute("x", pos[i].x + 20); bt.setAttribute("y", pos[i].y - 14); bt.setAttribute("text-anchor", "middle"); bt.setAttribute("class", "algo-viz__gbadge"); svg.appendChild(bt); badges.push(bt); }
      });
      panel.appendChild(svg);
      return function (s) {
        circles.forEach(function (c, j) {
          c.classList.toggle("algo-viz__gnode--visited", directed ? s.removed[j] : s.visited[j]);
          c.classList.toggle("algo-viz__gnode--current", j === (directed ? s.cur : s.current));
        });
        if (directed) badges.forEach(function (b, j) { b.textContent = s.removed[j] ? "" : ("in:" + s.deg[j]); });
      };
    };
  }
  var graphViz = graphVizFactory(false);

  function bGridBfs(grid) {
    var R = grid.length, C = grid[0].length, dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var dist = Array.from({ length: R }, function () { return new Array(C).fill(-1); });
    var visitStep = Array.from({ length: R }, function () { return new Array(C).fill(-1); });
    var steps = [];
    function push(s) { if (s.cur) visitStep[s.cur[0]][s.cur[1]] = steps.length; steps.push(s); }
    if (grid[0][0] === 1 || grid[R - 1][C - 1] === 1) {
      push({ cur: null, done: true, line: 16, vars: { "клетка": "—", "расстояние": "—", "посещено": 0 }, info: "Старт или цель — препятствие, пути нет." });
    } else {
      var q = [[0, 0]], visitedCount = 1; dist[0][0] = 0;
      push({ cur: [0, 0], line: 4, vars: { "клетка": "(0,0)", "расстояние": 0, "посещено": 1 }, info: "Старт (0,0), расстояние 0." });
      var reached = false;
      while (q.length) {
        var cell = q.shift(), r = cell[0], c = cell[1];
        if (r === R - 1 && c === C - 1) { push({ cur: [r, c], done: true, found: true, line: 7, vars: { "клетка": "(" + r + "," + c + ")", "расстояние": dist[r][c], "посещено": visitedCount }, info: "Цель достигнута за " + dist[r][c] + " шагов." }); reached = true; break; }
        for (var d = 0; d < dirs.length; d++) { var nr = r + dirs[d][0], nc = c + dirs[d][1]; if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 0 && dist[nr][nc] < 0) { dist[nr][nc] = dist[r][c] + 1; q.push([nr, nc]); visitedCount++; } }
        if (!(r === 0 && c === 0)) push({ cur: [r, c], line: 6, vars: { "клетка": "(" + r + "," + c + ")", "расстояние": dist[r][c], "посещено": visitedCount }, info: "Обрабатываем (" + r + "," + c + "), расстояние " + dist[r][c] + "." });
      }
      if (!reached) push({ cur: null, done: true, line: 16, vars: { "клетка": "—", "расстояние": "−1", "посещено": visitedCount }, info: "Цель недостижима." });
    }
    steps.forEach(function (s, i) { s._i = i; });
    return { steps: steps, visitStep: visitStep, grid: grid, R: R, C: C };
  }
  function gridViz(panel, ctx) {
    var grid = ctx.grid, R = ctx.R, C = ctx.C, visitStep = ctx.visitStep;
    var wrap = document.createElement("div"); wrap.className = "algo-viz__grid"; wrap.style.gridTemplateColumns = "repeat(" + C + ", 2em)";
    var cells = [];
    for (var r = 0; r < R; r++) {
      cells.push([]);
      for (var c = 0; c < C; c++) {
        var cd = document.createElement("div"); cd.className = "algo-viz__gcell" + (grid[r][c] === 1 ? " algo-viz__gcell--wall" : "");
        if (r === 0 && c === 0) cd.textContent = "S"; else if (r === R - 1 && c === C - 1) cd.textContent = "G";
        wrap.appendChild(cd); cells[r].push(cd);
      }
    }
    panel.appendChild(wrap);
    return function (s) {
      var i = s._i;
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        var vs = visitStep[r][c];
        cells[r][c].classList.toggle("algo-viz__gcell--visited", vs >= 0 && vs <= i && grid[r][c] === 0);
        cells[r][c].classList.toggle("algo-viz__gcell--current", !!s.cur && s.cur[0] === r && s.cur[1] === c);
      }
    };
  }

  // A* по сетке: f = g + h, h — манхэттенская оценка до цели. Открытый список (мин по f),
  // закрытые (раскрытые) клетки, восстановление пути по came-from.
  function bAStar(grid) {
    var R = grid.length, C = grid[0].length, dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var goal = [R - 1, C - 1], INF = Infinity;
    function h(r, c) { return Math.abs(r - goal[0]) + Math.abs(c - goal[1]); }
    function key(r, c) { return r + "," + c; }
    var g = [], f = [], came = [];
    for (var i = 0; i < R; i++) { g.push(new Array(C).fill(INF)); f.push(new Array(C).fill(INF)); came.push(new Array(C).fill(null)); }
    function snap(a) { return a.map(function (row) { return row.slice(); }); }
    var open = {}, closed = {}, steps = [];
    function openKeys() { return Object.keys(open); }
    function toArr(obj) { return Object.keys(obj).map(function (k) { var p = k.split(","); return [+p[0], +p[1]]; }); }
    if (grid[0][0] === 1 || grid[R - 1][C - 1] === 1) {
      steps.push({ cur: null, g: snap(g), f: snap(f), open: [], closed: [], done: true, found: false, path: [], line: 15, vars: { "клетка": "—", "g": "—", "h": "—", "f": "—", "открытых": 0 }, info: "Старт или цель — стена, пути нет." });
      steps.forEach(function (s, k) { s._i = k; });
      return { grid: grid, R: R, C: C, goal: goal, steps: steps };
    }
    g[0][0] = 0; f[0][0] = h(0, 0); open[key(0, 0)] = true;
    steps.push({ cur: null, g: snap(g), f: snap(f), open: toArr(open), closed: [], line: 1, vars: { "клетка": "(0,0)", "g": 0, "h": h(0, 0), "f": h(0, 0), "открытых": 1 }, info: "Старт (0,0): g=0, h=" + h(0, 0) + ", f=" + h(0, 0) + ". Кладём в открытый список." });
    var guard = 0, lim = R * C * 8 + 20, reached = false;
    while (openKeys().length && guard++ < lim) {
      var best = null, bf = INF, bh = INF;
      openKeys().forEach(function (k) { var p = k.split(","), r = +p[0], c = +p[1]; if (f[r][c] < bf || (f[r][c] === bf && h(r, c) < bh)) { bf = f[r][c]; bh = h(r, c); best = [r, c]; } });
      var r = best[0], c = best[1];
      delete open[key(r, c)]; closed[key(r, c)] = true;
      if (r === goal[0] && c === goal[1]) {
        var path = [], cr = r, cc = c;
        while (cr !== null && cc !== null) { path.unshift([cr, cc]); var pc = came[cr][cc]; if (!pc) break; cr = pc[0]; cc = pc[1]; }
        steps.push({ cur: [r, c], g: snap(g), f: snap(f), open: toArr(open), closed: toArr(closed), done: true, found: true, path: path, line: 5, vars: { "клетка": "(" + r + "," + c + ")", "g": g[r][c], "h": 0, "f": f[r][c], "открытых": openKeys().length }, info: "Цель достигнута! Длина кратчайшего пути = " + g[r][c] + "." });
        reached = true; break;
      }
      steps.push({ cur: [r, c], g: snap(g), f: snap(f), open: toArr(open), closed: toArr(closed), line: 4, vars: { "клетка": "(" + r + "," + c + ")", "g": g[r][c], "h": h(r, c), "f": f[r][c], "открытых": openKeys().length + 1 }, info: "Извлекаем минимальную f=" + f[r][c] + " → (" + r + "," + c + "). Раскрываем соседей." });
      dirs.forEach(function (d) {
        var nr = r + d[0], nc = c + d[1];
        if (nr < 0 || nr >= R || nc < 0 || nc >= C || grid[nr][nc] === 1 || closed[key(nr, nc)]) return;
        var t = g[r][c] + 1;
        if (t < g[nr][nc]) {
          came[nr][nc] = [r, c]; g[nr][nc] = t; f[nr][nc] = t + h(nr, nc); open[key(nr, nc)] = true;
          steps.push({ cur: [r, c], nb: [nr, nc], g: snap(g), f: snap(f), open: toArr(open), closed: toArr(closed), line: 11, vars: { "клетка": "(" + nr + "," + nc + ")", "g": t, "h": h(nr, nc), "f": f[nr][nc], "открытых": openKeys().length }, info: "Сосед (" + nr + "," + nc + "): g=" + t + ", h=" + h(nr, nc) + ", f=" + f[nr][nc] + " → в открытый список." });
        }
      });
    }
    if (!reached) steps.push({ cur: null, g: snap(g), f: snap(f), open: [], closed: toArr(closed), done: true, found: false, path: [], line: 15, vars: { "клетка": "—", "g": "—", "h": "—", "f": "—", "открытых": 0 }, info: "Открытый список пуст — до цели не добраться." });
    steps.forEach(function (s, k) { s._i = k; });
    return { grid: grid, R: R, C: C, goal: goal, steps: steps };
  }
  function aStarViz(panel, ctx) {
    var R = ctx.R, C = ctx.C, grid = ctx.grid;
    var wrap = document.createElement("div"); wrap.className = "algo-viz__grid"; wrap.style.gridTemplateColumns = "repeat(" + C + ", 2.2em)";
    var cells = [];
    for (var r = 0; r < R; r++) { cells.push([]); for (var c = 0; c < C; c++) { var cd = document.createElement("div"); cd.className = "algo-viz__gcell" + (grid[r][c] === 1 ? " algo-viz__gcell--wall" : ""); wrap.appendChild(cd); cells[r].push(cd); } }
    panel.appendChild(wrap);
    function has(list, r, c) { for (var i = 0; i < list.length; i++) if (list[i][0] === r && list[i][1] === c) return true; return false; }
    return function (s) {
      var path = {}; if (s.path) s.path.forEach(function (p) { path[p[0] + "," + p[1]] = true; });
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        var cd = cells[r][c], wall = grid[r][c] === 1;
        var start = r === 0 && c === 0, goal = r === R - 1 && c === C - 1;
        var onPath = !!path[r + "," + c], cur = !!s.cur && s.cur[0] === r && s.cur[1] === c;
        var closed = has(s.closed || [], r, c), open = has(s.open || [], r, c);
        var fv = s.f[r][c], showF = isFinite(fv);
        cd.textContent = wall ? "" : (start ? "S" : (goal ? "G" : (showF ? fv : "")));
        cd.classList.toggle("algo-viz__gcell--path", onPath && !cur);
        cd.classList.toggle("algo-viz__gcell--current", cur);
        cd.classList.toggle("algo-viz__gcell--visited", closed && !cur && !onPath);
        cd.classList.toggle("algo-viz__gcell--frontier", open && !cur && !onPath && !closed);
      }
    };
  }

  function bTopoKahn(labels, edges) {
    var n = labels.length, adj = labels.map(function () { return []; }), indeg = new Array(n).fill(0);
    edges.forEach(function (e) { adj[e[0]].push(e[1]); indeg[e[1]]++; });
    var deg = indeg.slice(), removed = new Array(n).fill(false), order = [];
    function zeros() { return labels.filter(function (_, v) { return !removed[v] && deg[v] === 0; }).join(",") || "—"; }
    var steps = [{ removed: removed.slice(), deg: deg.slice(), cur: -1, line: 1, vars: { "узел": "—", "входящая 0": zeros(), "порядок": "—" }, info: "Посчитали входящие степени каждой вершины." }];
    var guard = 0;
    while (order.length < n && guard++ < n + 2) {
      var pick = -1; for (var v = 0; v < n; v++) if (!removed[v] && deg[v] === 0) { pick = v; break; }
      if (pick < 0) { steps.push({ removed: removed.slice(), deg: deg.slice(), cur: -1, done: true, line: 12, vars: { "узел": "—", "входящая 0": "нет", "порядок": order.map(function (x) { return labels[x]; }).join(" → ") }, info: "Нет вершины со степенью 0 → в графе цикл!" }); break; }
      removed[pick] = true; order.push(pick);
      adj[pick].forEach(function (w) { deg[w]--; });
      steps.push({ removed: removed.slice(), deg: deg.slice(), cur: pick, line: 6, vars: { "узел": labels[pick], "входящая 0": zeros(), "порядок": order.map(function (x) { return labels[x]; }).join(" → ") }, info: "Убираем " + labels[pick] + " (входящая 0). Порядок: " + order.map(function (x) { return labels[x]; }).join(" → ") });
    }
    if (order.length === n) { steps[steps.length - 1].done = true; steps[steps.length - 1].found = true; }
    return steps;
  }
  var topoViz = graphVizFactory(true);

  // ===== Trie (префиксное дерево) ============================================
  function bTrie(words, query) {
    var nodes = [{ ch: "•", depth: 0, end: false, children: {} }];
    words.forEach(function (w) {
      var cur = 0;
      for (var k = 0; k < w.length; k++) {
        var ch = w[k];
        if (nodes[cur].children[ch] == null) { var id = nodes.length; nodes.push({ ch: ch, depth: k + 1, end: false, children: {} }); nodes[cur].children[ch] = id; }
        cur = nodes[cur].children[ch];
      }
      nodes[cur].end = true;
    });
    var path = [0], cur = 0, broke = false;
    for (var k = 0; k < query.length; k++) {
      var ch = query[k];
      if (nodes[cur].children[ch] != null) { cur = nodes[cur].children[ch]; path.push(cur); }
      else { broke = true; break; }
    }
    var steps = [{ upto: 0, line: 1, vars: { "символ": "—", "узел": "корень", "это слово?": "—" }, info: "Старт с корня. Ищем «" + query + "»." }];
    for (var p = 1; p < path.length; p++) steps.push({ upto: p, line: 7, vars: { "символ": query[p - 1], "узел": nodes[path[p]].ch, "это слово?": "—" }, info: "Идём по '" + query[p - 1] + "' → узел «" + nodes[path[p]].ch + "»" });
    if (broke) steps.push({ upto: path.length - 1, done: true, line: 5, vars: { "символ": query[path.length - 1] || "—", "узел": "нет", "это слово?": "нет" }, info: "Нужного символа нет → «" + query + "» отсутствует." });
    else { var last = path[path.length - 1]; steps.push({ upto: path.length - 1, done: true, found: nodes[last].end, line: 9, vars: { "символ": "—", "узел": nodes[last].ch, "это слово?": nodes[last].end ? "да" : "нет (префикс)" }, info: nodes[last].end ? "Путь есть и это конец слова → «" + query + "» найдено ✓" : "Путь есть, но не конец слова → «" + query + "» только префикс." }); }
    return { nodes: nodes, path: path, steps: steps };
  }
  function trieViz(panel, ctx) {
    var nodes = ctx.nodes, path = ctx.path;
    var maxDepth = nodes.reduce(function (m, n) { return Math.max(m, n.depth); }, 0);
    var tree = document.createElement("div"); tree.className = "algo-tp__tree";
    var byId = {};
    for (var d = 0; d <= maxDepth; d++) {
      var row = document.createElement("div"); row.className = "algo-tp__trow";
      nodes.map(function (n, idx) { return { n: n, idx: idx }; }).filter(function (o) { return o.n.depth === d; }).forEach(function (o) {
        var c = document.createElement("div"); c.className = "algo-tp__tnode" + (o.n.end ? " algo-tp__tnode--end" : ""); c.textContent = o.n.ch; row.appendChild(c); byId[o.idx] = c;
      });
      tree.appendChild(row);
    }
    panel.appendChild(tree);
    return function (s) {
      nodes.forEach(function (_, id) {
        var posInPath = path.indexOf(id), visited = posInPath >= 0 && posInPath <= s.upto;
        byId[id].classList.toggle("algo-tp__tnode--visited", visited);
        byId[id].classList.toggle("algo-tp__tnode--current", id === path[s.upto]);
      });
    };
  }

  // ===== KMP (поиск подстроки) ===============================================
  function bKMP(text, pat) {
    var lps = new Array(pat.length).fill(0);
    (function () { var len = 0, i = 1; while (i < pat.length) { if (pat[i] === pat[len]) { len++; lps[i] = len; i++; } else if (len > 0) { len = lps[len - 1]; } else { lps[i] = 0; i++; } } })();
    var steps = [], i = 0, j = 0, foundAt = -1;
    while (i < text.length) {
      var match = text[i] === pat[j];
      steps.push({ i: i, j: j, shift: i - j, match: match, line: match ? 5 : (j > 0 ? 8 : 10), vars: { "i (текст)": i, "j (образец)": j, "сдвиг": i - j, "символы": "'" + text[i] + "' vs '" + pat[j] + "'" }, info: "text[" + i + "]='" + text[i] + "' vs pattern[" + j + "]='" + pat[j] + "' → " + (match ? "совпало" : "не совпало" + (j > 0 ? ", сдвиг по префикс-функции" : "")) });
      if (match) { i++; j++; if (j === pat.length) { foundAt = i - j; steps.push({ i: i - 1, j: j - 1, shift: foundAt, found: true, done: true, line: 6, vars: { "i (текст)": i, "j (образец)": j, "сдвиг": foundAt, "символы": "полное совпадение" }, info: "Образец найден на позиции " + foundAt }); break; } }
      else if (j > 0) { j = lps[j - 1]; } else { i++; }
    }
    if (!steps.length || !steps[steps.length - 1].done) steps.push({ i: text.length, j: j, shift: text.length - j, done: true, line: 13, vars: { "i (текст)": text.length, "j (образец)": j, "сдвиг": "—", "символы": "—" }, info: "Образец не найден" });
    return steps;
  }
  function kmpViz(panel, ctx) {
    var text = ctx.text, pat = ctx.pattern;
    var wrap = document.createElement("div"); wrap.className = "algo-tp__kmp";
    var trow = document.createElement("div"); trow.className = "algo-tp__krow";
    var tcells = text.split("").map(function (ch) { var c = document.createElement("div"); c.className = "algo-tp__kcell"; c.textContent = ch; trow.appendChild(c); return c; });
    var prow = document.createElement("div"); prow.className = "algo-tp__krow";
    wrap.appendChild(trow); wrap.appendChild(prow);
    panel.appendChild(wrap);
    return function (s) {
      tcells.forEach(function (c, k) { c.classList.toggle("algo-tp__kcell--active", k === s.i && !s.done); c.classList.toggle("algo-tp__kcell--found", !!s.found && k >= s.shift && k < s.shift + pat.length); });
      prow.innerHTML = "";
      for (var p = 0; p < s.shift; p++) { var g = document.createElement("div"); g.className = "algo-tp__kcell algo-tp__kcell--ghost"; g.innerHTML = "&nbsp;"; prow.appendChild(g); }
      for (var q = 0; q < pat.length; q++) { var pc = document.createElement("div"); pc.className = "algo-tp__kcell"; if (q === s.j && !s.done) pc.classList.add(s.match ? "algo-tp__kcell--match" : "algo-tp__kcell--mismatch"); if (s.found) pc.classList.add("algo-tp__kcell--found"); pc.textContent = pat[q]; prow.appendChild(pc); }
    };
  }



  // ===== Построители шагов с изменяющимися значениями =========================
  // шаг: { values:[...], primary?, secondary?, info, done?, found? }
  function bCyclicSort(arr) {
    var a = arr.slice(), steps = [], i = 0;
    steps.push({ values: a.slice(), primary: 0, line: 1, vars: { i: 0, "nums[i]": a[0], correct: "—" }, info: "Старт. Значение v должно стоять на индексе v−1." });
    while (i < a.length) {
      var correct = a[i] - 1;
      if (a[i] !== a[correct]) {
        steps.push({ values: a.slice(), primary: i, secondary: correct, line: 5, vars: { i: i, "nums[i]": a[i], correct: correct }, info: "a[" + i + "]=" + a[i] + " → его место — индекс " + correct + ". Меняем местами." });
        var t = a[i]; a[i] = a[correct]; a[correct] = t;
      } else {
        steps.push({ values: a.slice(), primary: i, line: 7, vars: { i: i, "nums[i]": a[i], correct: correct }, info: "a[" + i + "]=" + a[i] + " уже на месте → i++" });
        i++;
      }
    }
    steps.push({ values: a.slice(), done: true, line: 9, vars: { i: a.length, "nums[i]": "—", correct: "—" }, info: "Отсортировано за O(n)." });
    return steps;
  }
  function bDpCoins(coins, amount) {
    var INF = Infinity, dp = new Array(amount + 1).fill(INF);
    dp[0] = 0;
    var disp = function (v) { return v === INF ? "∞" : v; };
    // Пошаговый дебаг: на каждом шаге видно a, текущую монету c, dp[a−c], best и dp[a].
    var steps = [{ values: dp.map(disp), primary: 0, line: 1, vars: { a: 0, c: "—", "dp[a−c]": "—", best: 0, "dp[a]": 0 }, info: "База: dp[0] = 0 — на сумму 0 нужно 0 монет." }];
    for (var a = 1; a <= amount; a++) {
      var best = INF, src = -1;
      steps.push({ values: dp.map(disp), primary: a, line: 3, vars: { a: a, c: "—", "dp[a−c]": "—", best: "∞", "dp[a]": disp(dp[a]) }, info: "Считаем dp[" + a + "]: best := ∞, перебираем монеты." });
      for (var ci = 0; ci < coins.length; ci++) {
        var c = coins[ci];
        if (c > a) continue; // монета крупнее суммы — не помещается
        var cand = dp[a - c] === INF ? INF : dp[a - c] + 1;
        var take = cand < best;
        if (take) { best = cand; src = a - c; dp[a] = best; }
        steps.push({
          values: dp.map(disp), primary: a, secondary: a - c, line: take ? 6 : 5,
          vars: { a: a, c: c, "dp[a−c]": disp(dp[a - c]), best: disp(best), "dp[a]": disp(dp[a]) },
          info: "Монета " + c + ": dp[" + (a - c) + "]+1 = " + disp(cand) + (take ? " < best → best = " + disp(best) : " ≥ best → оставляем best = " + disp(best))
        });
      }
      steps.push({ values: dp.map(disp), primary: a, secondary: src >= 0 ? src : undefined, line: 9, vars: { a: a, c: "—", "dp[a−c]": "—", best: disp(best), "dp[a]": disp(dp[a]) }, info: "Зафиксировали dp[" + a + "] = " + disp(dp[a]) + (dp[a] === INF ? " (недостижимо)" : "") + "." });
    }
    steps.push({ values: dp.map(disp), primary: amount, done: true, line: 11, vars: { a: amount, c: "—", "dp[a−c]": "—", best: disp(dp[amount]), "dp[a]": disp(dp[amount]) }, info: dp[amount] === INF ? "Сумму набрать нельзя (−1)." : ("Ответ: dp[" + amount + "] = минимум " + dp[amount] + " монет.") });
    return steps;
  }
  // XOR-накопление: единственное число среди пар.
  function bBitXor(arr) {
    var steps = [], x = 0;
    for (var i = 0; i < arr.length; i++) {
      x ^= arr[i];
      steps.push({ values: arr.slice(), primary: i, line: 3, vars: { i: i, num: arr[i], result: x, "bin(result)": (x >>> 0).toString(2) }, info: "result ^= " + arr[i] + " → " + x + " (bin " + (x >>> 0).toString(2) + ")" });
    }
    steps.push({ values: arr.slice(), done: true, found: true, line: 5, vars: { i: "—", num: "—", result: x, "bin(result)": (x >>> 0).toString(2) }, info: "Пары взаимно уничтожились, осталось: " + x });
    return steps;
  }
  // Слияние интервалов: сортировка по началу, затем один проход.
  function bMergeIntervals(raw) {
    var ivs = raw.slice().sort(function (a, b) { return a[0] - b[0]; });
    function cl(p) { return [p[0], p[1]]; }
    var merged = [];
    var steps = [{ cur: -1, merged: [], line: 1, vars: { i: "—", "интервал": "—", "последний": "—", "результат": 0 }, info: "Отсортировали интервалы по началу." }];
    for (var k = 0; k < ivs.length; k++) {
      var iv = ivs[k];
      if (merged.length && iv[0] <= merged[merged.length - 1][1]) {
        var last = merged[merged.length - 1]; last[1] = Math.max(last[1], iv[1]);
        steps.push({ cur: k, merged: merged.map(cl), line: 7, vars: { i: k, "интервал": "[" + iv[0] + "," + iv[1] + "]", "последний": "[" + last[0] + "," + last[1] + "]", "результат": merged.length }, info: "[" + iv[0] + "," + iv[1] + "] пересекается → расширяем конец до " + last[1] });
      } else {
        merged.push([iv[0], iv[1]]);
        steps.push({ cur: k, merged: merged.map(cl), line: 9, vars: { i: k, "интервал": "[" + iv[0] + "," + iv[1] + "]", "последний": "[" + iv[0] + "," + iv[1] + "]", "результат": merged.length }, info: "[" + iv[0] + "," + iv[1] + "] не пересекается → новый интервал" });
      }
    }
    steps.push({ cur: -1, merged: merged.map(cl), done: true, found: true, line: 12, vars: { i: "—", "интервал": "—", "последний": "—", "результат": merged.length }, info: "Готово: " + merged.length + " непересекающихся интервал(ов)." });
    return steps;
  }
  // Разворот списка: три указателя prev / curr / next (как индексы).
  function bListReverse(list) {
    var n = list.length, steps = [], prev = -1, curr = 0;
    function vv(p, c, nx) { return { prev: p < 0 ? "nil" : list[p], curr: (c >= 0 && c < n) ? list[c] : "nil", next: (nx >= 0 && nx < n) ? list[nx] : "nil" }; }
    if (!n) return [{ prev: -1, curr: -1, next: -1, done: true, line: 9, vars: { prev: "nil", curr: "nil", next: "nil" }, info: "Пустой список" }];
    steps.push({ prev: -1, curr: 0, next: (n > 1 ? 1 : -1), line: 2, vars: vv(-1, 0, (n > 1 ? 1 : -1)), info: "prev = nil, curr = " + list[0] });
    while (curr < n) {
      var nxt = (curr + 1 < n) ? curr + 1 : -1;
      steps.push({ prev: prev, curr: curr, next: nxt, line: 5, vars: vv(prev, curr, nxt), info: (prev < 0 ? list[curr] + ".Next → nil" : list[curr] + ".Next → " + list[prev]) + "; сдвигаем prev, curr вправо" });
      prev = curr; curr = curr + 1;
    }
    steps.push({ prev: prev, curr: -1, next: -1, done: true, found: true, line: 9, vars: vv(prev, -1, -1), info: "Новая голова — " + (prev >= 0 ? list[prev] : "nil") + ". Список развёрнут." });
    return steps;
  }
  // Обход дерева (BFS уровнями или DFS preorder). Возвращает ctx с present/order/steps.
  function bTree(arr, mode) {
    var present = [];
    for (var i = 0; i < arr.length; i++) if (arr[i] != null) present.push(i);
    var order;
    if (mode === "dfs") { order = []; (function dfs(k) { if (k >= arr.length || arr[k] == null) return; order.push(k); dfs(2 * k + 1); dfs(2 * k + 2); })(0); }
    else { order = present.slice(); }
    var posOf = {}; present.forEach(function (idx, k) { posOf[idx] = k; });
    var visitLine = mode === "dfs" ? 2 : 7, doneLine = mode === "dfs" ? 4 : 11;
    var steps = [], seq = [];
    order.forEach(function (idx, k) {
      seq.push(arr[idx]);
      steps.push({ nodeIdx: idx, upto: k, cur: posOf[idx], line: visitLine, vars: { "узел": arr[idx], "посещено": (k + 1) + "/" + order.length, "порядок": seq.join(" → ") }, info: "Посещаем " + arr[idx] });
    });
    steps.push({ nodeIdx: -1, upto: order.length - 1, cur: -1, done: true, found: true, line: doneLine, vars: { "узел": "—", "посещено": order.length + "/" + order.length, "порядок": seq.join(" → ") }, info: "Обход завершён: " + seq.join(" → ") });
    return { arr: arr, present: present, order: order, posOf: posOf, steps: steps };
  }
  // Общая отрисовка дерева для дашборда (customViz): узлы по уровням.
  function treeViz(panel, ctx) {
    var arr = ctx.arr, present = ctx.present, order = ctx.order;
    function depth(i) { return Math.floor(Math.log(i + 1) / Math.LN2); }
    var maxD = 0; present.forEach(function (i) { maxD = Math.max(maxD, depth(i)); });
    var tree = document.createElement("div"); tree.className = "algo-tp__tree";
    var byIdx = {};
    for (var d = 0; d <= maxD; d++) {
      var row = document.createElement("div"); row.className = "algo-tp__trow";
      present.filter(function (i) { return depth(i) === d; }).forEach(function (i) {
        var c = document.createElement("div"); c.className = "algo-tp__tnode"; c.textContent = arr[i];
        row.appendChild(c); byIdx[i] = c;
      });
      tree.appendChild(row);
    }
    panel.appendChild(tree);
    return function (s) {
      present.forEach(function (i) {
        var pos = order.indexOf(i), visited = pos >= 0 && pos <= s.upto;
        byIdx[i].classList.toggle("algo-tp__tnode--visited", visited);
        byIdx[i].classList.toggle("algo-tp__tnode--current", i === s.nodeIdx);
      });
    };
  }

  // Подписанный ряд ячеек для multi-collection visualizations.
  function vizRow(wrap, label) {
    var row = document.createElement("div"); row.className = "algo-tp__crow";
    var lab = document.createElement("div"); lab.className = "algo-tp__clabel"; lab.textContent = label;
    var cells = document.createElement("div"); cells.className = "algo-tp__cells";
    row.appendChild(lab); row.appendChild(cells); wrap.appendChild(row);
    return cells;
  }
  function fillCells(container, vals, opts) {
    container.innerHTML = "";
    if (!vals.length) { var e = document.createElement("span"); e.className = "algo-tp__cempty"; e.textContent = "∅"; container.appendChild(e); return; }
    vals.forEach(function (v, k) {
      var c = document.createElement("div"); c.className = "algo-tp__ccell"; c.textContent = v;
      if (opts && opts.topIdx === k) c.classList.add("algo-tp__ccell--top");
      if (opts && opts.out) c.classList.add("algo-tp__ccell--out");
      container.appendChild(c);
    });
  }

  // Две кучи: медиана потока.
  function bTwoHeaps(stream) {
    var lower = [], upper = []; // отсортированы по возрастанию; вершина lower = последний, вершина upper = первый
    function ins(arr, x) { var i = 0; while (i < arr.length && arr[i] < x) i++; arr.splice(i, 0, x); }
    var steps = [];
    stream.forEach(function (x) {
      var line;
      if (lower.length === 0 || x <= lower[lower.length - 1]) { ins(lower, x); line = 2; } else { ins(upper, x); line = 4; }
      if (lower.length > upper.length + 1) ins(upper, lower.pop());
      else if (upper.length > lower.length + 1) ins(lower, upper.shift());
      var med = lower.length === upper.length ? (lower[lower.length - 1] + upper[0]) / 2 : (lower.length > upper.length ? lower[lower.length - 1] : upper[0]);
      steps.push({ lower: lower.slice(), upper: upper.slice(), line: line, vars: { "добавили": x, "меньшая": lower.length, "большая": upper.length, "медиана": med }, info: "Добавили " + x + " → медиана = " + med });
    });
    if (steps.length) { steps[steps.length - 1].done = true; steps[steps.length - 1].found = true; }
    return steps;
  }
  function twoHeapsViz(panel, ctx) {
    var wrap = document.createElement("div"); wrap.className = "algo-tp__collection";
    var loCells = vizRow(wrap, "Меньшая (max-heap)");
    var hiCells = vizRow(wrap, "Большая (min-heap)");
    panel.appendChild(wrap);
    return function (s) {
      fillCells(loCells, s.lower || [], { topIdx: (s.lower || []).length - 1 });
      fillCells(hiCells, s.upper || [], { topIdx: 0 });
    };
  }

  // Top K: min-heap размера k.
  function bTopK(arr, k) {
    var heap = []; // отсортирован по возрастанию, минимум первый
    function ins(x) { var i = 0; while (i < heap.length && heap[i] < x) i++; heap.splice(i, 0, x); }
    var steps = [];
    for (var i = 0; i < arr.length; i++) {
      ins(arr[i]);
      var popped = null;
      if (heap.length > k) popped = heap.shift();
      steps.push({ i: i, heap: heap.slice(), line: popped != null ? 5 : 3, vars: { "элемент": arr[i], "куча": "[" + heap.join(",") + "]", "размер": heap.length + "/" + k, "выкинули": popped == null ? "—" : popped }, info: popped != null ? ("Добавили " + arr[i] + ", куча > " + k + " → выкинули минимум " + popped) : ("Добавили " + arr[i] + " в кучу") });
    }
    steps.push({ i: -1, heap: heap.slice(), done: true, found: true, line: 8, vars: { "элемент": "—", "куча": "[" + heap.join(",") + "]", "размер": heap.length + "/" + k, "выкинули": "—" }, info: k + " наибольших: " + heap.join(", ") });
    return steps;
  }
  function topKViz(panel, ctx) {
    var arr = ctx.arr;
    var wrap = document.createElement("div"); wrap.className = "algo-tp__collection";
    var aCells = vizRow(wrap, "Поток");
    var aEls = arr.map(function (v) { var c = document.createElement("div"); c.className = "algo-tp__ccell"; c.textContent = v; aCells.appendChild(c); return c; });
    var hCells = vizRow(wrap, "Куча (k наиб.)");
    panel.appendChild(wrap);
    return function (s) {
      aEls.forEach(function (c, j) { c.classList.toggle("algo-tp__ccell--done", s.i >= 0 && j < s.i); c.classList.toggle("algo-tp__ccell--cur", j === s.i); });
      fillCells(hCells, s.heap || [], { topIdx: 0 });
    };
  }

  // K-way merge: K отсортированных списков → один.
  function bKwayMerge(lists) {
    var K = lists.length, ptr = lists.map(function () { return 0; }), output = [];
    var steps = [{ ptr: ptr.slice(), output: [], pick: null, line: 3, vars: { "минимум": "—", "список": "—", "в результате": 0 }, info: "K отсортированных списков. Каждый раз берём минимальную голову." }];
    while (true) {
      var best = Infinity, bi = -1;
      for (var i = 0; i < K; i++) if (ptr[i] < lists[i].length && lists[i][ptr[i]] < best) { best = lists[i][ptr[i]]; bi = i; }
      if (bi < 0) break;
      output.push(best);
      steps.push({ ptr: ptr.slice(), output: output.slice(), pick: [bi, ptr[bi]], line: 8, vars: { "минимум": best, "список": (bi + 1), "в результате": output.length }, info: "Минимум среди голов = " + best + " (список " + (bi + 1) + ") → в результат" });
      ptr[bi]++;
    }
    steps.push({ ptr: ptr.slice(), output: output.slice(), pick: null, done: true, found: true, line: 13, vars: { "минимум": "—", "список": "—", "в результате": output.length }, info: "Готово: " + output.join(", ") });
    return steps;
  }
  function kwayViz(panel, ctx) {
    var lists = ctx.lists;
    var wrap = document.createElement("div"); wrap.className = "algo-tp__collection";
    var rowEls = lists.map(function (lst, li) {
      var cells = vizRow(wrap, "Список " + (li + 1));
      return lst.map(function (v) { var c = document.createElement("div"); c.className = "algo-tp__ccell"; c.textContent = v; cells.appendChild(c); return c; });
    });
    var outCells = vizRow(wrap, "Результат");
    panel.appendChild(wrap);
    return function (s) {
      rowEls.forEach(function (cs, li) { cs.forEach(function (c, ci) { c.classList.toggle("algo-tp__ccell--done", ci < s.ptr[li]); c.classList.toggle("algo-tp__ccell--cur", !!s.pick && s.pick[0] === li && s.pick[1] === ci); }); });
      fillCells(outCells, s.output || [], { out: true });
    };
  }



















  // ===== 2D-ДП: Longest Common Subsequence (заполнение таблицы) ==============
  function bDpLcs(a, b) {
    var m = a.length, nn = b.length;
    var dp = [], fillStep = [];
    for (var r = 0; r <= m; r++) { dp.push(new Array(nn + 1).fill(0)); fillStep.push(new Array(nn + 1).fill(-1)); }
    function snap() { return dp.map(function (row) { return row.slice(); }); }
    var steps = [{
      dp: snap(), i: -1, j: -1, match: null, src: null, line: 1,
      vars: { "i": "—", "j": "—", "a[i-1], b[j-1]": "—", "правило": "края = 0", "dp[i][j]": "—" },
      info: "Нулевая строка и столбец заполнены нулями (пустой префикс). Идём по строкам слева направо."
    }];
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= nn; j++) {
        var ca = a[i - 1], cb = b[j - 1], match = ca === cb, val, src, rule;
        if (match) {
          val = dp[i - 1][j - 1] + 1; dp[i][j] = val;
          src = { kind: "diag", cells: [[i - 1, j - 1]] };
          rule = "'" + ca + "' = '" + cb + "' → диагональ " + dp[i - 1][j - 1] + " + 1";
        } else {
          var up = dp[i - 1][j], left = dp[i][j - 1];
          val = Math.max(up, left); dp[i][j] = val;
          var chosen = up >= left ? [i - 1, j] : [i, j - 1];
          src = { kind: "max", cells: [[i - 1, j], [i, j - 1]], chosen: chosen };
          rule = "'" + ca + "' ≠ '" + cb + "' → max(↑" + up + ", ←" + left + ")";
        }
        fillStep[i][j] = steps.length;
        steps.push({
          dp: snap(), i: i, j: j, match: match, src: src, line: match ? 5 : 7,
          vars: { "i": i, "j": j, "a[i-1], b[j-1]": "'" + ca + "', '" + cb + "'", "правило": match ? "диагональ +1" : "max(верх, слева)", "dp[i][j]": val },
          info: rule + " ⟹ dp[" + i + "][" + j + "] = " + val
        });
      }
    }
    steps.push({
      dp: snap(), i: m, j: nn, match: null, src: null, done: true, found: true, line: 11,
      vars: { "i": m, "j": nn, "a[i-1], b[j-1]": "—", "правило": "ответ", "dp[i][j]": dp[m][nn] },
      info: "Готово. Длина наибольшей общей подпоследовательности = dp[" + m + "][" + nn + "] = " + dp[m][nn]
    });
    steps.forEach(function (s, k) { s._i = k; });
    var rowHeads = ["ε"].concat(a.split(""));
    var colHeads = ["ε"].concat(b.split(""));
    return { a: a, b: b, m: m, n: nn, fillStep: fillStep, rowHeads: rowHeads, colHeads: colHeads, steps: steps };
  }
  // 0/1 рюкзак: dp[i][c] — максимальная ценность из первых i предметов при вместимости c.
  // Выбор «взять / не взять»: dp[i][c] = max(dp[i-1][c], dp[i-1][c-wt]+val).
  function bKnapsack(items, W) {
    var nI = items.length, NEG = -Infinity;
    var dp = [], fillStep = [];
    for (var r = 0; r <= nI; r++) { dp.push(new Array(W + 1).fill(0)); fillStep.push(new Array(W + 1).fill(-1)); }
    function snap() { return dp.map(function (row) { return row.slice(); }); }
    var steps = [{
      dp: snap(), i: -1, j: -1, match: false, src: null, line: 1,
      vars: { "предмет": "—", "вместимость": "—", "правило": "края = 0", "dp[i][c]": "—" },
      info: "Нулевая строка (нет предметов) и нулевой столбец (вместимость 0) = 0. Заполняем по предметам."
    }];
    for (var i = 1; i <= nI; i++) {
      var wt = items[i - 1].w, val = items[i - 1].v;
      for (var c = 0; c <= W; c++) {
        var skip = dp[i - 1][c], fits = wt <= c, take = fits ? dp[i - 1][c - wt] + val : NEG;
        var best, src, rule, took;
        if (!fits) {
          best = skip; took = false;
          src = { kind: "diag", cells: [[i - 1, c]] };
          rule = "вес " + wt + " > " + c + " → не влезает, берём верх dp[" + (i - 1) + "][" + c + "] = " + skip;
        } else {
          took = take > skip; best = took ? take : skip;
          src = { kind: "max", cells: [[i - 1, c], [i - 1, c - wt]], chosen: took ? [i - 1, c - wt] : [i - 1, c] };
          rule = "max(пропустить " + skip + ", взять " + val + "+dp[" + (i - 1) + "][" + (c - wt) + "]=" + take + ") = " + best;
        }
        dp[i][c] = best;
        fillStep[i][c] = steps.length;
        steps.push({
          dp: snap(), i: i, j: c, match: took, src: src, line: fits ? 7 : 4,
          vars: { "предмет": "#" + i + " (w" + wt + ", v" + val + ")", "вместимость": c, "правило": fits ? (took ? "взять предмет" : "пропустить") : "не влезает", "dp[i][c]": best },
          info: rule + " ⟹ dp[" + i + "][" + c + "] = " + best
        });
      }
    }
    steps.push({
      dp: snap(), i: nI, j: W, match: false, src: null, done: true, found: true, line: 11,
      vars: { "предмет": "—", "вместимость": W, "правило": "ответ", "dp[i][c]": dp[nI][W] },
      info: "Готово. Максимальная ценность при вместимости " + W + " = dp[" + nI + "][" + W + "] = " + dp[nI][W]
    });
    steps.forEach(function (s, k) { s._i = k; });
    var rowHeads = ["∅"]; for (var t = 0; t < nI; t++) rowHeads.push("#" + (t + 1) + " w" + items[t].w + "·v" + items[t].v);
    var colHeads = []; for (var cc = 0; cc <= W; cc++) colHeads.push(cc);
    return { items: items, W: W, m: nI, n: W, fillStep: fillStep, rowHeads: rowHeads, colHeads: colHeads, rowHeadW: "5.4em", steps: steps };
  }

  // Универсальная отрисовка 2D-ДП-таблицы (LCS, рюкзак): заголовки строк/столбцов
  // берутся из ctx.rowHeads/colHeads; ширина столбца подписей строк — ctx.rowHeadW.
  function dpTableViz(panel, ctx) {
    var m = ctx.m, nn = ctx.n, fillStep = ctx.fillStep;
    var rowHeads = ctx.rowHeads, colHeads = ctx.colHeads, rowHeadW = ctx.rowHeadW || "1.7em";
    function cell(cls, txt) { var e = document.createElement("div"); e.className = cls; e.textContent = txt; return e; }
    var wrap = document.createElement("div"); wrap.className = "algo-tp__dptable";
    wrap.style.gridTemplateColumns = rowHeadW + " repeat(" + (nn + 1) + ", 1.9em)";
    wrap.appendChild(cell("algo-tp__dhead", "")); // верхний левый угол
    for (var hj = 0; hj <= nn; hj++) wrap.appendChild(cell("algo-tp__dhead", colHeads[hj]));
    var cellEls = [];
    for (var i = 0; i <= m; i++) {
      cellEls.push([]);
      wrap.appendChild(cell("algo-tp__dhead algo-tp__dhead--row", rowHeads[i]));
      for (var j = 0; j <= nn; j++) { var c = cell("algo-tp__dcell", ""); wrap.appendChild(c); cellEls[i].push(c); }
    }
    panel.appendChild(wrap);
    return function (s) {
      var step = s._i;
      for (var i = 0; i <= m; i++) for (var j = 0; j <= nn; j++) {
        var c = cellEls[i][j], edge = (i === 0 || j === 0);
        var filled = edge || (fillStep[i][j] >= 0 && fillStep[i][j] <= step);
        c.textContent = filled ? s.dp[i][j] : "";
        var isSrc = false, isCand = false;
        if (s.src && !s.done) {
          for (var k = 0; k < s.src.cells.length; k++) {
            var rc = s.src.cells[k];
            if (rc[0] === i && rc[1] === j) {
              if (s.src.kind === "diag") isSrc = true;
              else if (s.src.chosen && s.src.chosen[0] === i && s.src.chosen[1] === j) isSrc = true;
              else isCand = true;
            }
          }
        }
        c.classList.toggle("algo-tp__dcell--edge", edge);
        c.classList.toggle("algo-tp__dcell--filled", filled && !edge);
        c.classList.toggle("algo-tp__dcell--cur", i === s.i && j === s.j && !s.done);
        c.classList.toggle("algo-tp__dcell--src", isSrc);
        c.classList.toggle("algo-tp__dcell--cand", isCand);
        c.classList.toggle("algo-tp__dcell--done", !!s.done && i === m && j === nn);
      }
    };
  }

  // ===== Обобщённый «дашборд»-рендерер для пошаговых алгоритмов ==============
  function mkEl(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  // Каждая запись DASH описывает один алгоритм; общий каркас строит buildDashboard.
  var DASH = {
    "two-pointers-sum": {
      badge: "Two Pointers",
      desc: "Дан отсортированный массив. Найти пару чисел, сумма которых равна target.",
      valuesLabel: "Массив (отсортирован)", codeKey: "two-pointers-sum", fillRange: false,
      ptr1: { name: "lo", cap: "(левый)" }, ptr2: { name: "hi", cap: "(правый)" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Отсортированных массивов" },
      varOrder: ["lo", "hi", "arr[lo]", "arr[hi]", "sum", "target"],
      varDesc: { lo: "Левый указатель", hi: "Правый указатель", "arr[lo]": "Левый элемент", "arr[hi]": "Правый элемент", sum: "Текущая сумма", target: "Целевая сумма" },
      lineNotes: { 5: "Сумма равна target — пара найдена, возвращаем индексы", 7: "Сумма меньше target → двигаем левый вправо (lo++): сумма растёт", 9: "Сумма больше target → двигаем правый влево (hi--): сумма падает", 12: "Указатели сошлись — подходящей пары нет" },
      rules: [{ head: "Если сумма < target", body: "→ сдвинуть левый вправо (lo++)", cls: "lt" }, { head: "Если сумма > target", body: "→ сдвинуть правый влево (hi--)", cls: "gt" }, { head: "Если сумма = target", body: "→ пара найдена!", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var target = parseInt(root.getAttribute("data-target"), 10); return { arr: arr, target: target, steps: bTwoPointers(arr, target) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-target", label: "target", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return "Поиск пары с суммой " + ctx.target; },
      param: function (ctx) { return { label: "Target (цель)", value: ctx.target, ok: true }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Текущая сумма", "Сравнение"],
      sumValues: function (s, ctx) {
        var sum = s.vars.sum; if (typeof sum !== "number") return [{ text: "—" }, { text: "lo ≥ hi" }];
        var rel = s.found ? "=" : (sum < ctx.target ? "<" : ">"), cls = s.found ? "eq" : (sum < ctx.target ? "lt" : "gt");
        return [{ text: s.vars["arr[lo]"] + " + " + s.vars["arr[hi]"] + " = " + sum }, { text: sum + " " + rel + " " + ctx.target, cls: cls }];
      },
      status: function (s, idx, total, ctx) {
        var sum = s.vars.sum;
        if (s.found) return { kind: "ok", icon: "✓", head: "Пара найдена!", text: s.vars["arr[lo]"] + " + " + s.vars["arr[hi]"] + " = " + ctx.target };
        if (typeof sum === "number") return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.vars["arr[lo]"] + " + " + s.vars["arr[hi]"] + " = " + sum + " " + (sum < ctx.target ? "<" : ">") + " " + ctx.target + " → " + (sum < ctx.target ? "идём правее" : "идём левее") };
        return { kind: "end", icon: idx + 1, head: "Пара не найдена", text: "Указатели сошлись." };
      },
      stepCard: function (s, i, ctx) {
        var sum = s.vars.sum;
        if (s.found) return { a: "lo = " + s.lo + ", hi = " + s.hi, b: s.vars["arr[lo]"] + " + " + s.vars["arr[hi]"] + " = " + sum + " = " + ctx.target, c: "Пара найдена!", cls: "eq" };
        if (typeof sum === "number") { var lt = sum < ctx.target; return { a: "lo = " + s.lo + ", hi = " + s.hi, b: s.vars["arr[lo]"] + " + " + s.vars["arr[hi]"] + " = " + sum + " " + (lt ? "<" : ">") + " " + ctx.target, c: lt ? "lo++" : "hi--", cls: lt ? "lt" : "gt" }; }
        return { a: "lo = " + s.lo + ", hi = " + s.hi, b: "lo ≥ hi", c: "конец", cls: "" };
      },
      varsOf: function (s, ctx) { return { lo: s.lo, hi: s.hi, "arr[lo]": s.vars["arr[lo]"], "arr[hi]": s.vars["arr[hi]"], sum: (typeof s.vars.sum === "number" ? s.vars.sum : "—"), target: ctx.target }; }
    },

    "sliding-window-fixed": {
      badge: "Sliding Window",
      desc: "Максимальная сумма непрерывного окна размера k.",
      valuesLabel: "Массив", codeKey: "sliding-window-fixed", fillRange: true,
      ptr1: { name: "left", cap: "(левая граница)" }, ptr2: { name: "right", cap: "(правая граница)" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Подотрезков и подстрок" },
      varOrder: ["i", "windowSum", "maxSum"],
      varDesc: { i: "Правая граница (right)", windowSum: "Сумма текущего окна", maxSum: "Лучшая сумма" },
      lineNotes: { 5: "Первое окно из k элементов посчитано — это стартовый максимум", 7: "Сдвиг окна за O(1): + новый элемент справа, − выбывший слева (не пересчитываем сумму заново)", 8: "Сравниваем сумму окна с лучшей", 9: "Нашли окно больше — обновляем максимум", 12: "Все окна пройдены — возвращаем лучшую сумму" },
      rules: [{ head: "Добавить arr[right]", body: "+ новый элемент справа", cls: "lt" }, { head: "Убрать arr[left]", body: "− старый элемент слева", cls: "gt" }, { head: "Обновить максимум", body: "если сумма окна больше", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var k = parseInt(root.getAttribute("data-k"), 10); return { arr: arr, k: k, steps: bSlidingWindow(arr, k) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-k", label: "k", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return "Максимум окна размера " + ctx.k; },
      param: function (ctx) { return { label: "Размер окна k", value: ctx.k }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Сумма окна", "Максимум"],
      sumValues: function (s) { return [{ text: s.vars.windowSum }, { text: s.vars.maxSum, cls: (s.vars.windowSum === s.vars.maxSum ? "eq" : "") }]; },
      status: function (s, idx, total) {
        if (s.done) return { kind: "ok", icon: "✓", head: "Максимум окна = " + s.vars.maxSum, text: "Лучшее окно [" + s.lo + ".." + s.hi + "]" };
        return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: "сумма окна = " + s.vars.windowSum + ", максимум = " + s.vars.maxSum };
      },
      stepCard: function (s) {
        if (s.done) return { a: "окно [" + s.lo + ".." + s.hi + "]", b: "максимум = " + s.vars.maxSum, c: "готово", cls: "eq" };
        var imp = s.vars.windowSum === s.vars.maxSum;
        return { a: "окно [" + s.lo + ".." + s.hi + "]", b: "сумма = " + s.vars.windowSum, c: imp ? "новый максимум" : "сдвиг", cls: imp ? "eq" : "lt" };
      },
      varsOf: function (s) { return { i: s.vars.i, windowSum: s.vars.windowSum, maxSum: s.vars.maxSum }; }
    },

    "list-cycle": {
      badge: "Fast & Slow",
      desc: "Обнаружение цикла в связном списке (заяц и черепаха).",
      valuesLabel: "Связный список", codeKey: "list-cycle", fillRange: false,
      ptr1: { name: "slow", cap: "(черепаха)" }, ptr2: { name: "fast", cap: "(заяц)" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Связных списков и циклов" },
      varOrder: ["slow", "fast"],
      varDesc: { slow: "Медленный (+1 шаг)", fast: "Быстрый (+2 шага)" },
      lineNotes: { 1: "Оба указателя стартуют с головы списка", 4: "За итерацию slow проходит 1 узел, fast — 2", 6: "slow и fast встретились — в списке есть цикл", 9: "fast достиг конца (nil) — цикла нет" },
      rules: [{ head: "slow", body: "+1 шаг за итерацию", cls: "lt" }, { head: "fast", body: "+2 шага за итерацию", cls: "gt" }, { head: "slow == fast", body: "→ цикл найден", cls: "eq" }],
      parse: function (root) { var list = nums(root.getAttribute("data-list")); var cyc = parseInt(root.getAttribute("data-cycle"), 10); return { list: list, cyc: cyc, steps: bListCycle(list, cyc) }; },
      inputs: [{ attr: "data-list", label: "Список" }, { attr: "data-cycle", label: "цикл с индекса", sm: true }],
      values: function (ctx) { return ctx.list; },
      title: function () { return "Поиск цикла: заяц и черепаха"; },
      param: function (ctx) { var ok = !isNaN(ctx.cyc) && ctx.cyc >= 0 && ctx.cyc < ctx.list.length; return { label: "Цикл с узла", value: ok ? ctx.list[ctx.cyc] : "нет" }; },
      note: function (ctx) { var ok = !isNaN(ctx.cyc) && ctx.cyc >= 0 && ctx.cyc < ctx.list.length; return ok ? "🔁 цикл: " + ctx.list[ctx.list.length - 1] + " → " + ctx.list[ctx.cyc] : "Список без цикла"; },
      cycleIdx: function (ctx) { return ctx.cyc; },
      pointers: function (s) { return { lo: s.slow, hi: s.fast }; },
      sumCells: ["slow →", "fast →"],
      sumValues: function (s) { return [{ text: s.vars.slow }, { text: s.vars.fast, cls: (s.meet ? "eq" : "") }]; },
      status: function (s, idx, total) {
        if (s.meet) return { kind: "ok", icon: "✓", head: "Цикл найден!", text: "slow и fast встретились на " + s.vars.slow };
        if (s.done) return { kind: "end", icon: idx + 1, head: "Цикла нет", text: "fast дошёл до конца списка" };
        return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: "slow → " + s.vars.slow + ", fast → " + s.vars.fast };
      },
      stepCard: function (s) {
        if (s.meet) return { a: "slow=" + s.vars.slow + ", fast=" + s.vars.fast, b: "slow == fast", c: "цикл!", cls: "eq" };
        if (s.done) return { a: "slow=" + s.vars.slow, b: "fast → nil", c: "нет цикла", cls: "gt" };
        return { a: "slow=" + s.vars.slow + ", fast=" + s.vars.fast, b: "slow +1, fast +2", c: "идём дальше", cls: "lt" };
      },
      varsOf: function (s) { return { slow: s.vars.slow, fast: s.vars.fast }; }
    },

    "sliding-window-var": {
      badge: "Sliding Window",
      desc: "Самая длинная подстрока, где не более k различных символов (переменное окно).",
      valuesLabel: "Строка", codeKey: "sliding-window-var", fillRange: true,
      ptr1: { name: "left", cap: "(левая граница)" }, ptr2: { name: "right", cap: "(правая граница)" },
      complexity: { time: "O(n)", space: "O(k)", good: "★ Подстрок под условие" },
      varOrder: ["left", "right", "distinct", "maxLen"],
      varDesc: { left: "Левая граница", right: "Правая граница", distinct: "Различных символов в окне", maxLen: "Лучшая длина" },
      lineNotes: { 4: "Расширяем окно: добавляем символ справа в счётчик", 5: "Различных символов стало больше k — окно невалидно", 8: "Сжимаем слева (left++), пока различных не станет ≤ k", 10: "Окно валидно — обновляем максимальную длину", 12: "Возвращаем длину самого длинного подходящего окна" },
      rules: [{ head: "Расширяем right", body: "+ символ справа", cls: "lt" }, { head: "distinct > k", body: "→ сжимаем слева (left++)", cls: "gt" }, { head: "Обновляем maxLen", body: "если окно длиннее", cls: "eq" }],
      parse: function (root) { var chars = (root.getAttribute("data-string") || "").split(""); var k = parseInt(root.getAttribute("data-k"), 10); return { chars: chars, k: k, steps: bSlidingVar(chars, k) }; },
      inputs: [{ attr: "data-string", label: "Строка" }, { attr: "data-k", label: "k", sm: true }],
      values: function (ctx) { return ctx.chars; },
      title: function (ctx) { return "Подстрока с ≤" + ctx.k + " различными символами"; },
      param: function (ctx) { return { label: "Максимум различных k", value: ctx.k }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Различных в окне", "Макс. длина"],
      sumValues: function (s, ctx) { return [{ text: s.vars.distinct, cls: (typeof s.vars.distinct === "number" && s.vars.distinct >= ctx.k ? "gt" : "") }, { text: s.vars.maxLen, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Макс. длина = " + s.vars.maxLen, text: "≤" + ctx.k + " различных символов" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: "различных = " + s.vars.distinct + ", макс. длина = " + s.vars.maxLen }; },
      stepCard: function (s) { if (s.done) return { a: "лучшее окно [" + s.lo + ".." + s.hi + "]", b: "макс. длина = " + s.vars.maxLen, c: "готово", cls: "eq" }; return { a: "окно [" + s.lo + ".." + s.hi + "]", b: "различных = " + s.vars.distinct, c: s.improved ? "новая макс" : "сдвиг", cls: s.improved ? "eq" : "lt" }; },
      varsOf: function (s) { return { left: s.vars.left, right: s.vars.right, distinct: s.vars.distinct, maxLen: s.vars.maxLen }; }
    },

    "two-pointers-dedup": {
      badge: "Two Pointers",
      desc: "Удаление дубликатов из отсортированного массива на месте (одно направление).",
      valuesLabel: "Массив (отсортирован, с дубликатами)", codeKey: "two-pointers-dedup", fillRange: false,
      ptr1: { name: "slow", cap: "(пишем)" }, ptr2: { name: "fast", cap: "(сканируем)" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Фильтрации на месте" },
      varOrder: ["slow", "fast", "nums[slow]", "nums[fast]", "len"],
      varDesc: { slow: "Граница уникальных (куда пишем)", fast: "Сканер", "nums[slow]": "Последний уникальный", "nums[fast]": "Текущий элемент", len: "Длина уникального префикса" },
      lineNotes: { 2: "slow — граница уникального префикса (куда писать следующий уникальный)", 4: "Текущий элемент отличается от последнего уникального?", 6: "Записываем уникальный элемент на позицию slow", 9: "Длина уникального префикса = slow + 1" },
      rules: [{ head: "nums[fast] == nums[slow]", body: "→ дубликат, пропуск", cls: "gt" }, { head: "nums[fast] != nums[slow]", body: "→ slow++ и записать", cls: "lt" }, { head: "Префикс [0..slow]", body: "уникальные элементы", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); return { arr: arr, steps: bDedup(arr) }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "Удаление дубликатов на месте"; },
      cellState: function (s, j) { var done = !!s.done; return { found: j < s.slow || (done && j <= s.slow), lo: j === s.slow && !done, hi: j === s.fast && !done }; },
      pointers: function (s) { return { lo: s.slow, hi: s.fast }; },
      sumCells: ["Уникальных", "Сканер fast"],
      sumValues: function (s) { return [{ text: s.vars.len, cls: "eq" }, { text: s.vars["nums[fast]"] }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Уникальных: " + s.vars.len, text: "Префикс nums[0.." + s.slow + "] — ответ" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "уникальных " + s.vars.len, b: "префикс [0.." + s.slow + "]", c: "готово", cls: "eq" }; var dup = s.line === 4; return { a: "slow=" + s.slow + ", fast=" + s.fast, b: "nums[fast]=" + s.vars["nums[fast]"], c: dup ? "дубликат" : "запись", cls: dup ? "gt" : "lt" }; },
      varsOf: function (s) { return { slow: s.slow, fast: s.fast, "nums[slow]": s.vars["nums[slow]"], "nums[fast]": s.vars["nums[fast]"], len: s.vars.len }; }
    },

    "list-middle": {
      badge: "Fast & Slow",
      desc: "Поиск середины списка: fast идёт вдвое быстрее, slow останавливается в центре.",
      valuesLabel: "Связный список", codeKey: "list-middle", fillRange: false,
      ptr1: { name: "slow", cap: "(середина)" }, ptr2: { name: "fast", cap: "(конец)" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Связных списков" },
      varOrder: ["slow", "fast"],
      varDesc: { slow: "Медленный (+1) → середина", fast: "Быстрый (+2)" },
      lineNotes: { 1: "Оба указателя на голове", 4: "slow +1, fast +2: когда fast у конца, slow ровно посередине", 6: "fast дошёл до конца — slow указывает на середину" },
      rules: [{ head: "slow", body: "+1 шаг", cls: "lt" }, { head: "fast", body: "+2 шага", cls: "gt" }, { head: "fast в конце", body: "→ slow в середине", cls: "eq" }],
      parse: function (root) { var list = nums(root.getAttribute("data-list")); return { list: list, steps: bListMiddle(list) }; },
      inputs: [{ attr: "data-list", label: "Список" }],
      values: function (ctx) { return ctx.list; },
      title: function () { return "Середина списка (заяц и черепаха)"; },
      pointers: function (s) { return { lo: s.slow, hi: s.fast }; },
      sumCells: ["slow →", "fast →"],
      sumValues: function (s) { return [{ text: s.vars.slow, cls: s.done ? "eq" : "" }, { text: s.vars.fast }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Середина = " + s.vars.slow, text: "fast дошёл до конца списка" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: "slow → " + s.vars.slow + ", fast → " + s.vars.fast }; },
      stepCard: function (s) { if (s.done) return { a: "slow=" + s.vars.slow, b: "fast в конце", c: "середина!", cls: "eq" }; return { a: "slow=" + s.vars.slow + ", fast=" + s.vars.fast, b: "slow +1, fast +2", c: "идём", cls: "lt" }; },
      varsOf: function (s) { return { slow: s.vars.slow, fast: s.vars.fast }; }
    },

    "binary-search": {
      badge: "Binary Search",
      desc: "Поиск точного значения в отсортированном массиве делением пополам.",
      valuesLabel: "Массив (отсортирован)", codeKey: "binary-search", fillRange: false,
      ptr1: { name: "left", cap: "(левая граница)" }, ptr2: { name: "right", cap: "(правая граница)" },
      complexity: { time: "O(log n)", space: "O(1)", good: "★ Отсортированных массивов" },
      varOrder: ["left", "right", "mid", "arr[mid]", "target"],
      varDesc: { left: "Левая граница", right: "Правая граница", mid: "Середина диапазона", "arr[mid]": "Значение в середине", target: "Искомое значение" },
      lineNotes: { 4: "Сравниваем середину с target", 5: "arr[mid] == target — нашли, возвращаем индекс", 7: "target правее → отбрасываем левую половину (left = mid+1)", 9: "target левее → отбрасываем правую половину (right = mid−1)", 12: "Диапазон пуст — элемента нет" },
      rules: [{ head: "arr[mid] < target", body: "→ ищем правее (left = mid+1)", cls: "lt" }, { head: "arr[mid] > target", body: "→ ищем левее (right = mid−1)", cls: "gt" }, { head: "arr[mid] = target", body: "→ найдено!", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var target = parseInt(root.getAttribute("data-target"), 10); return { arr: arr, target: target, steps: bBinarySearch(arr, target) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-target", label: "target", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return "Бинарный поиск " + ctx.target; },
      param: function (ctx) { return { label: "Target (цель)", value: ctx.target, ok: true }; },
      cellState: function (s, j, lo, hi) { var found = !!s.found; if (found) return { found: j === s.mid, dim: j !== s.mid }; var inR = lo >= 0 && hi >= 0 && j >= lo && j <= hi; return { dim: !inR, mid: j === s.mid, lo: j === lo && j !== s.mid, hi: j === hi && j !== s.mid, span: inR && j !== s.mid && j !== lo && j !== hi }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["arr[mid]", "Сравнение"],
      sumValues: function (s, ctx) { if (typeof s.vars.mid !== "number") return [{ text: "—" }, { text: "не найдено" }]; var am = s.vars["arr[mid]"]; var rel = s.found ? "=" : (am < ctx.target ? "<" : ">"), cls = s.found ? "eq" : (am < ctx.target ? "lt" : "gt"); return [{ text: "arr[" + s.mid + "] = " + am }, { text: am + " " + rel + " " + ctx.target, cls: cls }]; },
      status: function (s, idx, total, ctx) { if (s.found) return { kind: "ok", icon: "✓", head: "Найдено на индексе " + s.mid, text: "arr[" + s.mid + "] = " + ctx.target }; if (s.done) return { kind: "end", icon: idx + 1, head: ctx.target + " не найдено", text: "диапазон пуст (left > right)" }; var am = s.vars["arr[mid]"]; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: "mid=" + s.mid + ", arr[mid]=" + am + (am < ctx.target ? " < " : " > ") + ctx.target + " → " + (am < ctx.target ? "правее" : "левее") }; },
      stepCard: function (s, i, ctx) { if (s.found) return { a: "mid = " + s.mid, b: "arr[" + s.mid + "] = " + ctx.target, c: "найдено!", cls: "eq" }; if (s.done) return { a: "left > right", b: "диапазон пуст", c: "нет", cls: "gt" }; var am = s.vars["arr[mid]"], lt = am < ctx.target; return { a: "[" + s.lo + ".." + s.hi + "] mid=" + s.mid, b: "arr[mid]=" + am + (lt ? " < " : " > ") + ctx.target, c: lt ? "вправо" : "влево", cls: lt ? "lt" : "gt" }; },
      varsOf: function (s, ctx) { return { left: s.vars.left, right: s.vars.right, mid: s.vars.mid, "arr[mid]": s.vars["arr[mid]"], target: ctx.target }; }
    },

    "binary-search-first": {
      badge: "Binary Search",
      desc: "Поиск ПЕРВОГО вхождения: при равенстве не останавливаемся, а идём левее.",
      valuesLabel: "Массив (с дубликатами)", codeKey: "binary-search-first", fillRange: false,
      ptr1: { name: "left", cap: "(левая)" }, ptr2: { name: "right", cap: "(правая)" },
      complexity: { time: "O(log n)", space: "O(1)", good: "★ Границ в отсортированном" },
      varOrder: ["left", "right", "mid", "arr[mid]", "res"],
      varDesc: { left: "Левая граница", right: "Правая граница", mid: "Середина", "arr[mid]": "Значение середины", res: "Лучший найденный индекс" },
      lineNotes: { 6: "Нашли target — запоминаем индекс и идём ЛЕВЕЕ за более ранним вхождением (right = mid−1)", 8: "arr[mid] < target → ищем правее (left = mid+1)", 10: "arr[mid] > target → ищем левее (right = mid−1)", 13: "Возвращаем самый левый найденный индекс" },
      rules: [{ head: "arr[mid] = target", body: "→ res=mid, идём левее", cls: "eq" }, { head: "arr[mid] < target", body: "→ правее", cls: "lt" }, { head: "arr[mid] > target", body: "→ левее", cls: "gt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var target = parseInt(root.getAttribute("data-target"), 10); return { arr: arr, target: target, steps: bBinarySearchFirst(arr, target) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-target", label: "target", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return "Первое вхождение " + ctx.target; },
      param: function (ctx) { return { label: "Target (цель)", value: ctx.target, ok: true }; },
      cellState: function (s, j, lo, hi) { var found = !!s.found; if (found) return { found: j === s.mid, dim: j !== s.mid }; var inR = lo >= 0 && hi >= 0 && j >= lo && j <= hi; return { dim: !inR, mid: j === s.mid, lo: j === lo && j !== s.mid, hi: j === hi && j !== s.mid, span: inR && j !== s.mid && j !== lo && j !== hi }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["arr[mid] vs target", "res (ответ)"],
      sumValues: function (s, ctx) { if (typeof s.vars.mid !== "number") return [{ text: "—" }, { text: String(s.vars.res), cls: (s.vars.res >= 0 ? "eq" : "") }]; var am = s.vars["arr[mid]"]; var rel = am === ctx.target ? "=" : (am < ctx.target ? "<" : ">"), cls = am === ctx.target ? "eq" : (am < ctx.target ? "lt" : "gt"); return [{ text: "arr[" + s.mid + "]=" + am + " " + rel + " " + ctx.target, cls: cls }, { text: String(s.vars.res), cls: (s.vars.res >= 0 ? "eq" : "") }]; },
      status: function (s, idx, total) { if (s.found) return { kind: "ok", icon: "✓", head: "Первое вхождение — индекс " + s.mid, text: "идём левее, чтобы раньше точно не было" }; if (s.done) return { kind: "end", icon: idx + 1, head: "Не найдено", text: "res = −1" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s, i, ctx) { if (s.found) return { a: "res = " + s.mid, b: "первое вхождение", c: "найдено!", cls: "eq" }; if (s.done) return { a: "не найдено", b: "res = −1", c: "нет", cls: "gt" }; var am = s.vars["arr[mid]"], eq = am === ctx.target; return { a: "mid=" + s.mid + " arr[mid]=" + am, b: eq ? "= target → res=" + s.mid : (am < ctx.target ? "< target" : "> target"), c: eq ? "влево (ищем раньше)" : (am < ctx.target ? "вправо" : "влево"), cls: eq ? "eq" : (am < ctx.target ? "lt" : "gt") }; },
      varsOf: function (s) { return { left: s.vars.left, right: s.vars.right, mid: s.vars.mid, "arr[mid]": s.vars["arr[mid]"], res: s.vars.res }; }
    },

    "cyclic-sort": {
      badge: "Cyclic Sort",
      desc: "Сортировка чисел 1..N на месте: значение v отправляется на индекс v−1.",
      valuesLabel: "Массив (числа 1..N)", codeKey: "cyclic-sort", fillRange: false,
      ptr1: { name: "i", cap: "(текущий)" }, ptr2: { name: "цель", cap: "(куда уйдёт)" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Чисел в диапазоне 1..N" },
      varOrder: ["i", "nums[i]", "correct"],
      varDesc: { i: "Текущий индекс", "nums[i]": "Текущее значение", correct: "Куда оно должно встать (v−1)" },
      lineNotes: { 1: "Начинаем с первого индекса", 5: "Число не на месте — меняем его местами с позицией v−1", 7: "Число уже на своём месте — переходим к следующему индексу", 9: "Все числа на местах — массив отсортирован за O(n)" },
      rules: [{ head: "nums[i] не на месте", body: "→ swap с nums[correct], i не растёт", cls: "lt" }, { head: "nums[i] на месте", body: "→ i++", cls: "eq" }, { head: "Готово", body: "всё на местах", cls: "gt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); return { arr: arr, steps: bCyclicSort(arr) }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "Циклическая сортировка на месте"; },
      cellState: function (s, j) { if (s.done) return { found: true }; var p = (s.primary == null ? -1 : s.primary), q = (s.secondary == null ? -1 : s.secondary); return { lo: j === p, hi: j === q }; },
      pointers: function (s) { return { lo: (s.primary == null ? -1 : s.primary), hi: (s.secondary == null ? -1 : s.secondary) }; },
      sumCells: ["nums[i]", "Целевой индекс"],
      sumValues: function (s) { return [{ text: s.vars["nums[i]"] }, { text: s.vars.correct, cls: (typeof s.vars.correct === "number" ? "" : "eq") }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Отсортировано за O(n)", text: "каждое число на индексе v−1" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "всё на местах", c: "O(n)", cls: "eq" }; var swap = s.line === 5; return { a: "i=" + (s.primary == null ? "-" : s.primary) + ", nums[i]=" + s.vars["nums[i]"], b: swap ? "→ индекс " + s.vars.correct : "уже на месте", c: swap ? "swap" : "i++", cls: swap ? "lt" : "eq" }; },
      varsOf: function (s) { return { i: s.vars.i, "nums[i]": s.vars["nums[i]"], correct: s.vars.correct }; }
    },

    "bit-xor": {
      badge: "Bit Manipulation",
      desc: "Single Number: XOR всех элементов — пары обнуляются, остаётся одиночка.",
      valuesLabel: "Массив (пары + одиночка)", codeKey: "bit-xor", fillRange: false,
      ptr1: { name: "i", cap: "(текущий)" }, ptr2: { name: "", cap: "" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Одиночного элемента, флагов" },
      varOrder: ["i", "num", "result", "bin(result)"],
      varDesc: { i: "Индекс", num: "Текущий элемент", result: "Накопленный XOR", "bin(result)": "Двоичное представление" },
      lineNotes: { 3: "XOR накапливает: одинаковые числа взаимно гасятся (a ^ a = 0)", 5: "Осталось одиночное число — все пары обнулились" },
      rules: [{ head: "a ^ a = 0", body: "одинаковые обнуляются", cls: "gt" }, { head: "a ^ 0 = a", body: "нейтральный элемент", cls: "lt" }, { head: "Итог", body: "остаётся одиночка", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); return { arr: arr, steps: bBitXor(arr) }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "Single Number (XOR)"; },
      cellState: function (s, j) { if (s.done) return {}; return { found: j < s.primary, lo: j === s.primary }; },
      pointers: function (s) { return { lo: (s.primary == null ? -1 : s.primary), hi: -1 }; },
      sumCells: ["result (XOR)", "Двоичное"],
      sumValues: function (s) { return [{ text: s.vars.result, cls: s.done ? "eq" : "" }, { text: s.vars["bin(result)"] }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Единственное число: " + s.vars.result, text: "пары взаимно уничтожились" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: "result ^= " + s.vars.num + " → " + s.vars.result }; },
      stepCard: function (s) { if (s.done) return { a: "одиночка", b: "result = " + s.vars.result, c: "готово", cls: "eq" }; return { a: "i=" + s.primary + ", num=" + s.vars.num, b: "result ^= " + s.vars.num, c: "= " + s.vars.result, cls: "lt" }; },
      varsOf: function (s) { return { i: s.vars.i, num: s.vars.num, result: s.vars.result, "bin(result)": s.vars["bin(result)"] }; }
    },

    "merge-intervals": {
      badge: "Merge Intervals",
      desc: "Слияние перекрывающихся интервалов после сортировки по началу.",
      valuesLabel: "Интервалы (по началу)", codeKey: "merge-intervals", fillRange: false,
      ptr1: { name: "i", cap: "(текущий)" }, ptr2: { name: "", cap: "" },
      complexity: { time: "O(n log n)", space: "O(n)", good: "★ Расписаний и диапазонов" },
      varOrder: ["i", "интервал", "последний", "результат"],
      varDesc: { i: "Индекс текущего интервала", "интервал": "Текущий интервал", "последний": "Последний в результате", "результат": "Интервалов в ответе" },
      lineNotes: { 1: "Сортируем интервалы по началу — перекрытия становятся соседями", 7: "Перекрытие: расширяем последний интервал до max концов", 9: "Разрыв: добавляем интервал в результат как новый", 12: "Возвращаем список непересекающихся интервалов" },
      rules: [{ head: "start ≤ конец последнего", body: "→ перекрытие, расширяем", cls: "lt" }, { head: "start > конец последнего", body: "→ разрыв, новый интервал", cls: "gt" }, { head: "Результат", body: "непересекающиеся интервалы", cls: "eq" }],
      parse: function (root) { var raw = (root.getAttribute("data-intervals") || "").split(",").map(function (s) { return s.trim().split("-").map(Number); }).filter(function (p) { return p.length === 2; }); return { ivs: raw.slice().sort(function (a, b) { return a[0] - b[0]; }), steps: bMergeIntervals(raw) }; },
      inputs: [{ attr: "data-intervals", label: "Интервалы a-b,c-d" }],
      values: function (ctx) { return ctx.ivs.map(function (p) { return p[0] + "–" + p[1]; }); },
      title: function () { return "Слияние интервалов"; },
      pointers: function (s) { return { lo: s.cur, hi: -1 }; },
      sumCells: ["Текущий интервал", "Интервалов в ответе"],
      sumValues: function (s) { return [{ text: s.vars["интервал"] }, { text: s.vars["результат"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Слито в " + s.vars["результат"] + " интервал(ов)", text: "перекрытия объединены" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars["результат"] + " интервал(ов)", c: "O(n log n)", cls: "eq" }; if (s.cur < 0) return { a: "сортировка", b: "по началу", c: "старт", cls: "lt" }; var merge = s.line === 7; return { a: "интервал " + s.vars["интервал"], b: merge ? "⊆ последний " + s.vars["последний"] : "разрыв → новый", c: merge ? "слить" : "добавить", cls: merge ? "lt" : "gt" }; },
      varsOf: function (s) { return { i: s.vars.i, "интервал": s.vars["интервал"], "последний": s.vars["последний"], "результат": s.vars["результат"] }; },
      customViz: function (panel, ctx) {
        var ivs = ctx.ivs;
        var minX = Math.min.apply(null, ivs.map(function (p) { return p[0]; }));
        var maxX = Math.max.apply(null, ivs.map(function (p) { return p[1]; }));
        var W = 480, padL = 16, padR = 16, span = (maxX - minX) || 1, rowH = 24, H = 20 + ivs.length * rowH + 46;
        function X(v) { return padL + (v - minX) / span * (W - padL - padR); }
        var svg = document.createElementNS(SVGNS, "svg");
        svg.setAttribute("viewBox", "0 0 " + W + " " + H);
        svg.setAttribute("class", "algo-tp__ivsvg");
        var capIn = document.createElementNS(SVGNS, "text"); capIn.setAttribute("x", 2); capIn.setAttribute("y", 10); capIn.setAttribute("class", "algo-tp__ivcap"); capIn.textContent = "Исходные"; svg.appendChild(capIn);
        var inputRects = ivs.map(function (iv, idx) {
          var r = document.createElementNS(SVGNS, "rect");
          r.setAttribute("x", X(iv[0])); r.setAttribute("y", 16 + idx * rowH);
          r.setAttribute("width", Math.max(3, X(iv[1]) - X(iv[0]))); r.setAttribute("height", 14);
          r.setAttribute("rx", 4); r.setAttribute("class", "algo-tp__ivbar"); svg.appendChild(r);
          var t = document.createElementNS(SVGNS, "text"); t.setAttribute("x", X(iv[0])); t.setAttribute("y", 16 + idx * rowH + 11); t.setAttribute("class", "algo-tp__ivlbl"); t.textContent = "[" + iv[0] + "," + iv[1] + "]"; svg.appendChild(t);
          return r;
        });
        var capOut = document.createElementNS(SVGNS, "text"); capOut.setAttribute("x", 2); capOut.setAttribute("y", 16 + ivs.length * rowH + 14); capOut.setAttribute("class", "algo-tp__ivcap"); capOut.textContent = "Результат"; svg.appendChild(capOut);
        var mg = document.createElementNS(SVGNS, "g"); svg.appendChild(mg);
        panel.appendChild(svg);
        var mergedY = 16 + ivs.length * rowH + 20;
        return function (s) {
          inputRects.forEach(function (r, idx) { r.classList.toggle("algo-tp__ivbar--cur", idx === s.cur); });
          while (mg.firstChild) mg.removeChild(mg.firstChild);
          (s.merged || []).forEach(function (m) {
            var r = document.createElementNS(SVGNS, "rect");
            r.setAttribute("x", X(m[0])); r.setAttribute("y", mergedY);
            r.setAttribute("width", Math.max(3, X(m[1]) - X(m[0]))); r.setAttribute("height", 16);
            r.setAttribute("rx", 4); r.setAttribute("class", "algo-tp__ivbar algo-tp__ivbar--merged"); mg.appendChild(r);
            var t = document.createElementNS(SVGNS, "text"); t.setAttribute("x", X(m[0]) + 3); t.setAttribute("y", mergedY + 12); t.setAttribute("class", "algo-tp__ivlbl algo-tp__ivlbl--m"); t.textContent = "[" + m[0] + "," + m[1] + "]"; mg.appendChild(t);
          });
        };
      }
    },

    "list-reverse": {
      badge: "Reverse Linked List",
      desc: "Разворот односвязного списка на месте тремя указателями prev / curr / next.",
      valuesLabel: "Связный список", codeKey: "list-reverse", fillRange: false,
      ptr1: { name: "curr", cap: "(текущий)" }, ptr2: { name: "prev", cap: "(развёрнутая часть)" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Связных списков" },
      varOrder: ["prev", "curr", "next"],
      varDesc: { prev: "Развёрнутая часть (новая голова)", curr: "Текущий узел", next: "Сохранённый следующий" },
      lineNotes: { 2: "curr идёт по списку, prev — уже развёрнутая часть", 5: "Разворачиваем указатель текущего узла назад: curr.Next = prev", 9: "Список кончился — prev стал новой головой" },
      rules: [{ head: "next = curr.Next", body: "сохранить остаток", cls: "lt" }, { head: "curr.Next = prev", body: "развернуть ссылку", cls: "eq" }, { head: "prev, curr = curr, next", body: "сдвинуть вперёд", cls: "gt" }],
      parse: function (root) { var list = nums(root.getAttribute("data-list")); return { list: list, steps: bListReverse(list) }; },
      inputs: [{ attr: "data-list", label: "Список" }],
      values: function (ctx) { return ctx.list; },
      title: function () { return "Разворот связного списка"; },
      cellState: function (s, j) { if (s.done) return { found: true }; return { found: s.prev >= 0 && j <= s.prev, lo: j === s.curr, mid: j === s.next && s.next >= 0 }; },
      pointers: function (s) { return { lo: s.curr, hi: s.prev }; },
      sumCells: ["curr.Next →", "next (сохранён)"],
      sumValues: function (s) { return [{ text: (s.prev < 0 ? "nil" : s.vars.prev), cls: "eq" }, { text: s.vars.next }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Список развёрнут", text: "новая голова — " + s.vars.prev }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "новая голова " + s.vars.prev, c: "развёрнут", cls: "eq" }; return { a: "curr = " + s.vars.curr, b: "curr.Next → " + (s.prev < 0 ? "nil" : s.vars.prev), c: "сдвиг →", cls: "lt" }; },
      varsOf: function (s) { return { prev: s.vars.prev, curr: s.vars.curr, next: s.vars.next }; }
    },

    "tree-bfs": {
      badge: "Tree BFS",
      desc: "Обход дерева в ширину: узлы по уровням через очередь (FIFO).",
      valuesLabel: "Узлы (по уровням)", codeKey: "tree-bfs", fillRange: false,
      ptr1: { name: "узел", cap: "(текущий)" }, ptr2: { name: "", cap: "" },
      complexity: { time: "O(n)", space: "O(w)", good: "★ Обхода по уровням" },
      varOrder: ["узел", "посещено", "порядок"],
      varDesc: { "узел": "Текущий узел", "посещено": "Сколько узлов посещено", "порядок": "Порядок обхода" },
      lineNotes: { 5: "Берём узел из начала очереди (FIFO)", 7: "Добавляем его значение в порядок обхода", 8: "Левого ребёнка — в конец очереди", 9: "Правого ребёнка — в конец очереди", 11: "Очередь пуста — обход по уровням завершён" },
      rules: [{ head: "Извлекаем из начала", body: "queue[0] (FIFO)", cls: "lt" }, { head: "Детей — в конец", body: "сначала left, потом right", cls: "gt" }, { head: "Уровень за уровнем", body: "ближние раньше дальних", cls: "eq" }],
      parse: function (root) { return bTree(parseTree(root.getAttribute("data-tree")), "bfs"); },
      inputs: [{ attr: "data-tree", label: "Дерево: уровни, null=пусто" }],
      values: function (ctx) { return ctx.present.map(function (i) { return ctx.arr[i]; }); },
      title: function () { return "Обход дерева в ширину (BFS)"; },
      pointers: function (s) { return { lo: s.cur, hi: -1 }; },
      sumCells: ["Текущий узел", "Посещено"],
      sumValues: function (s) { return [{ text: s.vars["узел"] }, { text: s.vars["посещено"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Обход завершён", text: s.vars["порядок"] }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: "Посещаем узел " + s.vars["узел"] }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars["посещено"], c: "BFS", cls: "eq" }; return { a: "узел " + s.vars["узел"], b: "в порядок обхода", c: "→", cls: "lt" }; },
      varsOf: function (s) { return { "узел": s.vars["узел"], "посещено": s.vars["посещено"], "порядок": s.vars["порядок"] }; },
      customViz: treeViz
    },

    "tree-dfs": {
      badge: "Tree DFS",
      desc: "Обход дерева в глубину (preorder): корень → левое поддерево → правое.",
      valuesLabel: "Узлы (preorder)", codeKey: "tree-dfs", fillRange: false,
      ptr1: { name: "узел", cap: "(текущий)" }, ptr2: { name: "", cap: "" },
      complexity: { time: "O(n)", space: "O(h)", good: "★ Путей и поддеревьев" },
      varOrder: ["узел", "посещено", "порядок"],
      varDesc: { "узел": "Текущий узел", "посещено": "Сколько узлов посещено", "порядок": "Порядок обхода (preorder)" },
      lineNotes: { 1: "Дошли до пустого узла — возврат из рекурсии", 2: "Preorder: записываем узел ДО спуска к потомкам", 3: "Рекурсивно обходим левое поддерево", 4: "Затем правое; возврат из всех вызовов = обход завершён" },
      rules: [{ head: "Посетить корень", body: "записать node.Val", cls: "eq" }, { head: "Затем левое", body: "dfs(node.Left)", cls: "lt" }, { head: "Затем правое", body: "dfs(node.Right)", cls: "gt" }],
      parse: function (root) { return bTree(parseTree(root.getAttribute("data-tree")), "dfs"); },
      inputs: [{ attr: "data-tree", label: "Дерево: уровни, null=пусто" }],
      values: function (ctx) { return ctx.present.map(function (i) { return ctx.arr[i]; }); },
      title: function () { return "Обход дерева в глубину (preorder)"; },
      pointers: function (s) { return { lo: s.cur, hi: -1 }; },
      sumCells: ["Текущий узел", "Посещено"],
      sumValues: function (s) { return [{ text: s.vars["узел"] }, { text: s.vars["посещено"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Обход завершён", text: s.vars["порядок"] }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: "Посещаем узел " + s.vars["узел"] }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars["посещено"], c: "DFS", cls: "eq" }; return { a: "узел " + s.vars["узел"], b: "preorder", c: "→", cls: "lt" }; },
      varsOf: function (s) { return { "узел": s.vars["узел"], "посещено": s.vars["посещено"], "порядок": s.vars["порядок"] }; },
      customViz: treeViz
    },

    "two-heaps-median": {
      badge: "Two Heaps", desc: "Медиана потока двумя кучами: max-heap (меньшая половина) и min-heap (большая).",
      valuesLabel: "Поток чисел", codeKey: "two-heaps", fillRange: false,
      complexity: { time: "O(log n) вставка", space: "O(n)", good: "★ Медианы потока" },
      varOrder: ["добавили", "меньшая", "большая", "медиана"],
      varDesc: { "добавили": "Текущее число", "меньшая": "Размер max-heap", "большая": "Размер min-heap", "медиана": "Текущая медиана" },
      lineNotes: { 2: "Число ≤ вершины меньшей половины → в max-кучу (меньшая половина)", 4: "Число больше → в min-кучу (большая половина)", 6: "Балансировка: если в меньшей половине на 2 больше — отдаём вершину в большую", 9: "Если в большей на 2 больше — отдаём вершину в меньшую" },
      rules: [{ head: "num ≤ вершины меньшей", body: "→ в max-heap", cls: "lt" }, { head: "иначе", body: "→ в min-heap", cls: "gt" }, { head: "Балансируем", body: "размеры отличаются ≤ 1", cls: "eq" }],
      parse: function (root) { var stream = nums(root.getAttribute("data-stream")); return { stream: stream, steps: bTwoHeaps(stream) }; },
      inputs: [{ attr: "data-stream", label: "Поток (через запятую)" }],
      values: function (ctx) { return ctx.stream; },
      title: function () { return "Медиана потока (две кучи)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Медиана", "Размеры (мен./бол.)"],
      sumValues: function (s) { return [{ text: s.vars["медиана"], cls: "eq" }, { text: s.vars["меньшая"] + " / " + s.vars["большая"] }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Медиана = " + s.vars["медиана"], text: "после " + total + " чисел потока" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "медиана " + s.vars["медиана"], b: "поток обработан", c: "готово", cls: "eq" }; return { a: "+ " + s.vars["добавили"], b: "медиана " + s.vars["медиана"], c: s.line === 2 ? "→ меньшая" : "→ большая", cls: s.line === 2 ? "lt" : "gt" }; },
      varsOf: function (s) { return { "добавили": s.vars["добавили"], "меньшая": s.vars["меньшая"], "большая": s.vars["большая"], "медиана": s.vars["медиана"] }; },
      customViz: twoHeapsViz
    },

    "top-k": {
      badge: "Top K Elements", desc: "K наибольших элементов через min-heap размера k.",
      valuesLabel: "Массив", codeKey: "top-k", fillRange: false,
      complexity: { time: "O(n log k)", space: "O(k)", good: "★ Топ-K из потока" },
      varOrder: ["элемент", "куча", "размер", "выкинули"],
      varDesc: { "элемент": "Текущий элемент", "куча": "Содержимое кучи", "размер": "Размер / k", "выкинули": "Выкинутый минимум" },
      lineNotes: { 3: "Кладём элемент в min-кучу", 5: "Куча переросла k — выкидываем минимум (он не входит в топ-K)", 8: "В куче остались k наибольших элементов" },
      rules: [{ head: "Push элемент", body: "в min-heap", cls: "lt" }, { head: "Размер > k", body: "→ Pop минимум", cls: "gt" }, { head: "Итог", body: "в куче k наибольших", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var k = parseInt(root.getAttribute("data-k"), 10); return { arr: arr, k: k, steps: bTopK(arr, k) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-k", label: "k", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return ctx.k + " наибольших элементов"; },
      param: function (ctx) { return { label: "K", value: ctx.k }; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Куча (k наиб.)", "Размер"],
      sumValues: function (s) { return [{ text: s.vars["куча"], cls: "eq" }, { text: s.vars["размер"] }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: ctx.k + " наибольших", text: s.vars["куча"] }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "топ-K", b: s.vars["куча"], c: "готово", cls: "eq" }; var pop = s.line === 5; return { a: "+ " + s.vars["элемент"], b: "куча " + s.vars["куча"], c: pop ? "pop " + s.vars["выкинули"] : "push", cls: pop ? "gt" : "lt" }; },
      varsOf: function (s) { return { "элемент": s.vars["элемент"], "куча": s.vars["куча"], "размер": s.vars["размер"], "выкинули": s.vars["выкинули"] }; },
      customViz: topKViz
    },

    "k-way-merge": {
      badge: "K-way Merge", desc: "Слияние K отсортированных списков в один через min-heap голов.",
      valuesLabel: "Списки", codeKey: "k-way-merge", fillRange: false,
      complexity: { time: "O(n log k)", space: "O(k)", good: "★ Слияния K списков" },
      varOrder: ["минимум", "список", "в результате"],
      varDesc: { "минимум": "Минимальная голова", "список": "Из какого списка", "в результате": "Длина результата" },
      lineNotes: { 3: "Кладём в кучу первый элемент каждого списка", 7: "Достаём минимальную из голов — это следующий элемент ответа", 8: "Добавляем минимум в результат", 10: "Подкладываем следующий элемент из того же списка", 13: "Все списки слиты в один отсортированный" },
      rules: [{ head: "Минимум среди голов", body: "из K указателей", cls: "lt" }, { head: "В результат", body: "и двигаем указатель", cls: "eq" }, { head: "Повторяем", body: "пока есть головы", cls: "gt" }],
      parse: function (root) { var lists = (root.getAttribute("data-lists") || "").split(";").map(function (s) { return s.split(",").map(Number); }); return { lists: lists, steps: bKwayMerge(lists) }; },
      inputs: [{ attr: "data-lists", label: "Списки a,b;c,d" }],
      values: function () { return []; },
      title: function () { return "Слияние K отсортированных списков"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Минимум", "В результате"],
      sumValues: function (s) { return [{ text: s.vars["минимум"], cls: "eq" }, { text: s.vars["в результате"] }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Слито в один список", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars["в результате"] + " элементов", c: "merge", cls: "eq" }; if (s.pick == null) return { a: "K списков", b: "min-heap голов", c: "старт", cls: "lt" }; return { a: "min = " + s.vars["минимум"], b: "список " + s.vars["список"], c: "→ результат", cls: "lt" }; },
      varsOf: function (s) { return { "минимум": s.vars["минимум"], "список": s.vars["список"], "в результате": s.vars["в результате"] }; },
      customViz: kwayViz
    },

    "subsets-bt": {
      badge: "Backtracking", desc: "Генерация всех подмножеств: выбрать → рекурсия → откат.",
      valuesLabel: "Множество", codeKey: "subsets-bt", fillRange: false,
      complexity: { time: "O(n·2ⁿ)", space: "O(n)", good: "★ Перебор всех вариантов" },
      varOrder: ["действие", "текущее", "найдено"],
      varDesc: { "действие": "Текущий шаг", "текущее": "Текущее частичное решение", "найдено": "Сколько подмножеств найдено" },
      lineNotes: { 5: "Записываем текущее частичное подмножество в ответ", 7: "Выбираем элемент i — добавляем в текущее", 9: "Откат: убираем элемент, чтобы попробовать другие ветки", 13: "Все подмножества (2ⁿ) собраны" },
      rules: [{ head: "Выбрать элемент", body: "append → рекурсия", cls: "lt" }, { head: "Записать", body: "current → результат", cls: "eq" }, { head: "Откат", body: "pop, пробуем дальше", cls: "gt" }],
      parse: function (root) { var set = nums(root.getAttribute("data-set")); return { set: set, steps: bSubsets(set) }; },
      inputs: [{ attr: "data-set", label: "Множество" }],
      values: function (ctx) { return ctx.set; },
      title: function () { return "Все подмножества (backtracking)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущее", "Найдено подмножеств"],
      sumValues: function (s) { return [{ text: s.vars["текущее"] }, { text: s.vars["найдено"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: s.vars["найдено"] + " подмножеств", text: "перебор завершён" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars["найдено"] + " шт.", c: "backtrack", cls: "eq" }; var cls = s.action === "choose" ? "lt" : (s.action === "back" ? "gt" : "eq"); return { a: s.vars["действие"], b: s.vars["текущее"], c: s.action === "record" ? "записать" : (s.action === "choose" ? "выбор" : "откат"), cls: cls }; },
      varsOf: function (s) { return { "действие": s.vars["действие"], "текущее": s.vars["текущее"], "найдено": s.vars["найдено"] }; },
      customViz: subsetsViz
    },

    "jump-game": {
      badge: "Greedy", desc: "Jump Game: можно ли допрыгнуть до конца, ведя самую дальнюю достижимую позицию.",
      valuesLabel: "Массив (макс. прыжок)", codeKey: "jump-game", fillRange: false,
      ptr1: { name: "i", cap: "(текущий)" }, ptr2: { name: "", cap: "" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Жадных проходов" },
      varOrder: ["i", "nums[i]", "maxReach"],
      varDesc: { i: "Текущий индекс", "nums[i]": "Сколько шагов вперёд", maxReach: "Самая дальняя достижимая позиция" },
      lineNotes: { 4: "Индекс i недостижим (i > maxReach) — допрыгнуть нельзя", 7: "Обновляем самую дальнюю достижимую позицию: i + nums[i]", 10: "Дошли до конца — последний индекс достижим" },
      rules: [{ head: "i ≤ maxReach", body: "индекс достижим", cls: "lt" }, { head: "i+nums[i] > maxReach", body: "→ обновляем maxReach", cls: "eq" }, { head: "i > maxReach", body: "→ недостижимо", cls: "gt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); return { arr: arr, steps: bJump(arr) }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "Jump Game: можно ли допрыгнуть?"; },
      cellState: function (s, j) { if (s.found) return { found: j <= s.hi }; return { dim: j > s.hi, mid: j === s.mid, span: j <= s.hi && j !== s.mid }; },
      pointers: function (s) { return { lo: s.mid, hi: -1 }; },
      sumCells: ["i / nums[i]", "maxReach"],
      sumValues: function (s) { if (typeof s.vars.maxReach !== "number") return [{ text: "—" }, { text: "—" }]; return [{ text: s.vars.i + " / " + s.vars["nums[i]"] }, { text: s.vars.maxReach, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.found) return { kind: "ok", icon: "✓", head: "Можно допрыгнуть до конца!", text: "последний индекс достижим" }; if (s.done) return { kind: "end", icon: idx + 1, head: "Недостижимо", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "конец достижим", b: "maxReach ≥ n−1", c: "можно!", cls: "eq" }; if (s.done) return { a: "тупик на i=" + s.vars.i, b: "maxReach=" + s.vars.maxReach, c: "нельзя", cls: "gt" }; return { a: "i=" + s.vars.i + " (+" + s.vars["nums[i]"] + ")", b: "maxReach=" + s.vars.maxReach, c: "→ дальше", cls: "lt" }; },
      varsOf: function (s) { return { i: s.vars.i, "nums[i]": s.vars["nums[i]"], maxReach: s.vars.maxReach }; }
    },

    "graph-bfs": {
      badge: "Graph BFS", desc: "Обход графа в ширину через очередь: ближние вершины раньше дальних.",
      valuesLabel: "Вершины", codeKey: "graph-bfs", fillRange: false,
      complexity: { time: "O(V+E)", space: "O(V)", good: "★ Кратчайший путь по рёбрам" },
      varOrder: ["узел", "очередь", "порядок"],
      varDesc: { "узел": "Извлечённая вершина", "очередь": "Очередь BFS (FIFO)", "порядок": "Порядок обхода" },
      lineNotes: { 3: "Помечаем старт посещённым ДО очереди (чтобы не добавить дважды)", 8: "Извлекаем вершину из начала очереди и фиксируем в порядке обхода", 11: "Соседа помечаем посещённым сразу при добавлении в очередь" },
      rules: [{ head: "Извлекаем из начала", body: "queue[0] (FIFO)", cls: "lt" }, { head: "Соседей — в конец", body: "если ещё не посещены", cls: "gt" }, { head: "Ближние раньше", body: "обход по слоям", cls: "eq" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = parseEdges(root.getAttribute("data-edges")); var start = parseInt(root.getAttribute("data-start") || "0", 10); return { labels: labels, edges: edges, start: start, steps: bGraphBfs(labels, edges, start) }; },
      inputs: [{ attr: "data-nodes", label: "Вершины" }, { attr: "data-edges", label: "Рёбра a-b" }, { attr: "data-start", label: "старт", sm: true }],
      values: function (ctx) { return ctx.labels; },
      title: function () { return "Обход графа в ширину (BFS)"; },
      pointers: function (s) { return { lo: s.current, hi: -1 }; },
      sumCells: ["Извлекли", "Очередь"],
      sumValues: function (s) { return [{ text: s.vars["узел"] }, { text: s.vars["очередь"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Обход завершён", text: s.vars["порядок"] }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars["порядок"], c: "BFS", cls: "eq" }; if (s.current < 0) return { a: "старт", b: "очередь " + s.vars["очередь"], c: "→", cls: "lt" }; return { a: "узел " + s.vars["узел"], b: "очередь " + s.vars["очередь"], c: "→", cls: "lt" }; },
      varsOf: function (s) { return { "узел": s.vars["узел"], "очередь": s.vars["очередь"], "порядок": s.vars["порядок"] }; },
      customViz: graphViz
    },

    "grid-bfs": {
      badge: "Grid BFS", desc: "Кратчайший путь по сетке (BFS): движемся по 4 направлениям, минуя стены.",
      valuesLabel: "", codeKey: "grid-bfs", fillRange: false,
      complexity: { time: "O(R·C)", space: "O(R·C)", good: "★ Кратчайший путь по сетке" },
      varOrder: ["клетка", "расстояние", "посещено"],
      varDesc: { "клетка": "Текущая клетка", "расстояние": "Шагов от старта", "посещено": "Сколько клеток посещено" },
      lineNotes: { 4: "Старт (0,0): расстояние 0, кладём в очередь", 6: "Достаём клетку из очереди", 7: "Дошли до правого нижнего угла — возвращаем расстояние", 11: "Сосед свободен и не посещён — расстояние +1, в очередь", 16: "Очередь пуста, до выхода не дошли — пути нет" },
      rules: [{ head: "Очередь клеток", body: "обрабатываем послойно (FIFO)", cls: "lt" }, { head: "4 направления", body: "вверх/вниз/влево/вправо, не стены", cls: "gt" }, { head: "Первая встреча цели", body: "= кратчайшее расстояние", cls: "eq" }],
      parse: function (root) { var grid = (root.getAttribute("data-grid") || "").split(";").map(function (r) { return r.split(",").map(Number); }); return bGridBfs(grid); },
      inputs: [{ attr: "data-grid", label: "Сетка строки;через; запятую (0/1)" }],
      values: function () { return []; },
      title: function () { return "Кратчайший путь по сетке (BFS)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущая клетка", "Расстояние"],
      sumValues: function (s) { return [{ text: s.vars["клетка"] }, { text: s.vars["расстояние"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.found) return { kind: "ok", icon: "✓", head: "Цель достигнута", text: "расстояние = " + s.vars["расстояние"] }; if (s.done) return { kind: "end", icon: idx + 1, head: "Путь не найден", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "цель!", b: "расстояние " + s.vars["расстояние"], c: "найдено", cls: "eq" }; if (s.done) return { a: "тупик", b: "пути нет", c: "−1", cls: "gt" }; return { a: "клетка " + s.vars["клетка"], b: "dist " + s.vars["расстояние"], c: "→", cls: "lt" }; },
      varsOf: function (s) { return { "клетка": s.vars["клетка"], "расстояние": s.vars["расстояние"], "посещено": s.vars["посещено"] }; },
      customViz: gridViz
    },

    "topo-kahn": {
      badge: "Topological Sort", desc: "Топологический порядок (алгоритм Кана): убираем вершины с нулевой входящей степенью.",
      valuesLabel: "Вершины", codeKey: "topo-kahn", fillRange: false,
      complexity: { time: "O(V+E)", space: "O(V)", good: "★ Зависимостей и порядка" },
      varOrder: ["узел", "входящая 0", "порядок"],
      varDesc: { "узел": "Убираемая вершина", "входящая 0": "Вершины с нулевой входящей", "порядок": "Топологический порядок" },
      lineNotes: { 1: "Считаем входящие степени всех вершин", 6: "Берём вершину с нулевой входящей степенью в порядок", 8: "Убираем её рёбра: уменьшаем входящую степень соседей", 12: "В порядок попали не все вершины → в графе есть цикл" },
      rules: [{ head: "Входящая степень 0", body: "→ можно убирать", cls: "lt" }, { head: "Убрали вершину", body: "уменьшаем степени соседей", cls: "eq" }, { head: "Нет степени 0", body: "→ в графе цикл", cls: "gt" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = (root.getAttribute("data-edges") || "").split(",").map(function (e) { return e.trim().split("-"); }).map(function (p) { return [labels.indexOf(p[0]), labels.indexOf(p[1])]; }).filter(function (p) { return p[0] >= 0 && p[1] >= 0; }); return { labels: labels, edges: edges, steps: bTopoKahn(labels, edges) }; },
      inputs: [{ attr: "data-nodes", label: "Вершины" }, { attr: "data-edges", label: "Рёбра a-b (ориент.)" }],
      values: function (ctx) { return ctx.labels; },
      title: function () { return "Топологическая сортировка (Кан)"; },
      pointers: function (s) { return { lo: s.cur, hi: -1 }; },
      sumCells: ["Убрали", "Степень 0"],
      sumValues: function (s) { return [{ text: s.vars["узел"] }, { text: s.vars["входящая 0"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.found) return { kind: "ok", icon: "✓", head: "Топологический порядок", text: s.vars["порядок"] }; if (s.done) return { kind: "end", icon: idx + 1, head: "Цикл в графе!", text: "топопорядок невозможен" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "готово", b: s.vars["порядок"], c: "topo", cls: "eq" }; if (s.done) return { a: "цикл!", b: "степени 0 нет", c: "стоп", cls: "gt" }; if (s.cur < 0) return { a: "старт", b: "степени посчитаны", c: "→", cls: "lt" }; return { a: "убрали " + s.vars["узел"], b: "след. 0: " + s.vars["входящая 0"], c: "→", cls: "lt" }; },
      varsOf: function (s) { return { "узел": s.vars["узел"], "входящая 0": s.vars["входящая 0"], "порядок": s.vars["порядок"] }; },
      customViz: topoViz
    },

    "dp-coins": {
      badge: "Dynamic Programming", desc: "Coin Change: dp[a] = минимум монет на сумму a, перебираем каждую монету.",
      valuesLabel: "Таблица dp[]", codeKey: "dp-coins", fillRange: false,
      ptr1: { name: "a", cap: "(сумма)" }, ptr2: { name: "a−c", cap: "(источник)" },
      complexity: { time: "O(amount·k)", space: "O(amount)", good: "★ Перекрывающихся подзадач" },
      varOrder: ["a", "c", "dp[a−c]", "best", "dp[a]"],
      varDesc: { a: "Текущая сумма", c: "Текущая монета", "dp[a−c]": "Подзадача: сумма без монеты", best: "Лучший минимум", "dp[a]": "Ответ для суммы a" },
      lineNotes: { 1: "dp[s] — минимум монет на сумму s; dp[0]=0, остальное ∞", 3: "Ищем лучший (минимальный) размен для суммы a", 6: "Берём монету c: размен = dp[a−c] + 1, если он меньше", 9: "Записываем найденный минимум в dp[a]", 11: "dp[amount] — ответ (∞, если размен невозможен)" },
      rules: [{ head: "Перебираем монеты", body: "для каждой суммы a", cls: "lt" }, { head: "dp[a−c]+1 < best", body: "→ обновляем best", cls: "eq" }, { head: "dp[a] = best", body: "минимум монет на a", cls: "gt" }],
      parse: function (root) { var coins = nums(root.getAttribute("data-coins")); var amount = parseInt(root.getAttribute("data-amount"), 10); return { coins: coins, amount: amount, steps: bDpCoins(coins, amount) }; },
      inputs: [{ attr: "data-coins", label: "Монеты" }, { attr: "data-amount", label: "сумма", sm: true }],
      values: function (ctx) { return ctx.steps[0].values; },
      title: function (ctx) { return "Coin Change: минимум монет на " + ctx.amount; },
      param: function (ctx) { return { label: "Сумма", value: ctx.amount }; },
      cellState: function (s, j) { return { lo: j === s.primary && !s.done, hi: j === s.secondary, found: s.done && j === s.primary }; },
      pointers: function (s) { return { lo: s.primary, hi: (s.secondary == null ? -1 : s.secondary) }; },
      sumCells: ["best", "dp[a]"],
      sumValues: function (s) { return [{ text: s.vars.best }, { text: s.vars["dp[a]"], cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "dp[" + ctx.amount + "] = " + s.vars["dp[a]"], text: (s.vars["dp[a]"] === "∞" ? "сумму набрать нельзя (−1)" : "минимум монет") }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "dp[amount]", b: s.vars["dp[a]"], c: "готово", cls: "eq" }; return { a: "a=" + s.vars.a + ", c=" + s.vars.c, b: "dp[a]=" + s.vars["dp[a]"], c: "best=" + s.vars.best, cls: "lt" }; },
      varsOf: function (s) { return { a: s.vars.a, c: s.vars.c, "dp[a−c]": s.vars["dp[a−c]"], best: s.vars.best, "dp[a]": s.vars["dp[a]"] }; }
    },

    "trie-search": {
      badge: "Trie", desc: "Префиксное дерево: поиск слова спускается по символам от корня.",
      valuesLabel: "", codeKey: "trie-search", fillRange: false,
      complexity: { time: "O(L)", space: "O(Σ·N·L)", good: "★ Префиксов и автодополнения" },
      varOrder: ["символ", "узел", "это слово?"],
      varDesc: { "символ": "Текущий символ запроса", "узел": "Текущий узел дерева", "это слово?": "Конец вставленного слова (isEnd)" },
      lineNotes: { 1: "Стартуем с корня дерева", 5: "Нет потомка для символа — такого слова/префикса нет", 7: "Спускаемся в потомка по текущему символу", 9: "Путь есть; isEnd говорит, было ли это слово вставлено целиком" },
      rules: [{ head: "Есть ребёнок по символу", body: "→ спускаемся", cls: "lt" }, { head: "Нет ребёнка", body: "→ слова/префикса нет", cls: "gt" }, { head: "Конец пути + isEnd", body: "→ это слово", cls: "eq" }],
      parse: function (root) { var words = (root.getAttribute("data-words") || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); var query = (root.getAttribute("data-query") || "").trim(); var r = bTrie(words, query); return { words: words, query: query, nodes: r.nodes, path: r.path, steps: r.steps }; },
      inputs: [{ attr: "data-words", label: "Слова (через запятую)" }, { attr: "data-query", label: "запрос" }],
      values: function () { return []; },
      title: function (ctx) { return "Trie: поиск «" + ctx.query + "»"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Это слово?"],
      sumValues: function (s) { return [{ text: s.vars["узел"] }, { text: s.vars["это слово?"], cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.found) return { kind: "ok", icon: "✓", head: "«" + ctx.query + "» найдено как слово", text: "путь есть и это конец слова" }; if (s.done) return { kind: "end", icon: idx + 1, head: "«" + ctx.query + "» — не слово", text: s.vars["это слово?"] === "нет (префикс)" ? "путь есть, но это только префикс" : "нужного символа нет" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "найдено", b: "это слово", c: "✓", cls: "eq" }; if (s.done) return { a: s.vars["узел"] === "нет" ? "символа нет" : "только префикс", b: "не слово", c: "✗", cls: "gt" }; return { a: "символ '" + s.vars["символ"] + "'", b: "узел «" + s.vars["узел"] + "»", c: "↓", cls: "lt" }; },
      varsOf: function (s) { return { "символ": s.vars["символ"], "узел": s.vars["узел"], "это слово?": s.vars["это слово?"] }; },
      customViz: trieViz
    },

    "kmp": {
      badge: "String Matching", desc: "KMP: образец скользит под текстом; при несовпадении сдвиг по префикс-функции.",
      valuesLabel: "", codeKey: "kmp", fillRange: false,
      complexity: { time: "O(n+m)", space: "O(m)", good: "★ Поиск подстроки" },
      varOrder: ["i (текст)", "j (образец)", "сдвиг", "символы"],
      varDesc: { "i (текст)": "Указатель в тексте (не откатывается)", "j (образец)": "Указатель в образце", "сдвиг": "Позиция образца под текстом", "символы": "Сравниваемые символы" },
      lineNotes: { 4: "Символы совпали — двигаем оба указателя вперёд", 6: "j дошёл до конца образца — нашли вхождение", 8: "Несовпадение: откатываем j по префикс-функции (i не трогаем)", 13: "Дошли до конца текста без совпадения" },
      rules: [{ head: "Символы совпали", body: "→ i++, j++", cls: "eq" }, { head: "Несовпадение, j>0", body: "→ j = lps[j−1]", cls: "gt" }, { head: "Несовпадение, j=0", body: "→ i++", cls: "lt" }],
      parse: function (root) { var text = root.getAttribute("data-text") || ""; var pattern = root.getAttribute("data-pattern") || ""; return { text: text, pattern: pattern, steps: bKMP(text, pattern) }; },
      inputs: [{ attr: "data-text", label: "Текст" }, { attr: "data-pattern", label: "Образец" }],
      values: function () { return []; },
      title: function (ctx) { return "KMP: поиск «" + ctx.pattern + "»"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Символы", "Сдвиг образца"],
      sumValues: function (s) { return [{ text: s.vars["символы"] }, { text: s.vars["сдвиг"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.found) return { kind: "ok", icon: "✓", head: "Образец найден на позиции " + s.shift, text: "указатель текста ни разу не откатился" }; if (s.done) return { kind: "end", icon: idx + 1, head: "Образец не найден", text: "дошли до конца текста" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "найдено", b: "позиция " + s.shift, c: "✓", cls: "eq" }; if (s.done) return { a: "не найдено", b: "конец текста", c: "−1", cls: "gt" }; return { a: "i=" + s.i + ", j=" + s.j, b: s.vars["символы"], c: s.match ? "совпало" : "сдвиг", cls: s.match ? "eq" : "gt" }; },
      varsOf: function (s) { return { "i (текст)": s.vars["i (текст)"], "j (образец)": s.vars["j (образец)"], "сдвиг": s.vars["сдвиг"], "символы": s.vars["символы"] }; },
      customViz: kmpViz
    },

    "fenwick-prefix": {
      badge: "Fenwick Tree", desc: "Префиксная сумма через дерево Фенвика (BIT): складываем зоны ответственности узлов.",
      valuesLabel: "Массив", codeKey: "fenwick-prefix", fillRange: true,
      ptr1: { name: "lo", cap: "(начало зоны)" }, ptr2: { name: "hi", cap: "(конец зоны)" },
      complexity: { time: "O(log n)", space: "O(n)", good: "★ Префиксных сумм с обновлением" },
      varOrder: ["BIT-узел", "зона", "итог"],
      varDesc: { "BIT-узел": "Номер узла BIT (1-индекс)", "зона": "Покрываемый диапазон", "итог": "Накопленная префиксная сумма" },
      lineNotes: { 3: "Прибавляем сумму зоны ответственности узла i", 4: "Переходим к родителю, сбрасывая младший единичный бит: i −= i & (−i)", 6: "Накоплена префиксная сумма на диапазоне [1..i]" },
      rules: [{ head: "Зона узла i", body: "[i − lowbit + 1 .. i]", cls: "lt" }, { head: "Складываем", body: "sum += tree[i]", cls: "eq" }, { head: "i −= i&(−i)", body: "переход к родителю", cls: "gt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var target = parseInt(root.getAttribute("data-index"), 10); return { arr: arr, target: target, steps: bFenwick(arr, target) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-index", label: "индекс", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return "Fenwick: префиксная сумма до индекса " + ctx.target; },
      param: function (ctx) { return { label: "Индекс", value: ctx.target }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Зона узла", "Итог суммы"],
      sumValues: function (s) { return [{ text: s.vars["зона"] }, { text: s.vars["итог"], cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "PrefixSum(0.." + ctx.target + ") = " + s.vars["итог"], text: "сумма зон BIT-узлов" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "сумма = " + s.vars["итог"], c: "O(log n)", cls: "eq" }; return { a: "узел " + s.vars["BIT-узел"], b: "зона " + s.vars["зона"], c: "итог " + s.vars["итог"], cls: "lt" }; },
      varsOf: function (s) { return { "BIT-узел": s.vars["BIT-узел"], "зона": s.vars["зона"], "итог": s.vars["итог"] }; }
    },

    "segtree-query": {
      badge: "Segment Tree", desc: "Дерево отрезков: сумма на диапазоне разбивается на готовые суммы поддеревьев.",
      valuesLabel: "", codeKey: "segtree-query", fillRange: false,
      complexity: { time: "O(log n)", space: "O(n)", good: "★ Запросов на диапазоне" },
      varOrder: ["узел", "сумма узла", "итог"],
      varDesc: { "узел": "Текущий отрезок узла", "сумма узла": "Сумма в этом узле", "итог": "Накопленный ответ" },
      lineNotes: { 2: "Отрезок узла вне запроса — его вклад 0", 5: "Отрезок узла целиком внутри запроса — берём готовую сумму", 8: "Частичное пересечение — спускаемся в обоих детей и складываем" },
      rules: [{ head: "Узел вне запроса", body: "→ пропускаем (skip)", cls: "gt" }, { head: "Узел целиком внутри", body: "→ берём его сумму (take)", cls: "eq" }, { head: "Частичное пересечение", body: "→ спускаемся к детям (split)", cls: "lt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var ql = parseInt(root.getAttribute("data-l"), 10); var qr = parseInt(root.getAttribute("data-r"), 10); var r = bSegQuery(arr, ql, qr); return { arr: arr, ql: ql, qr: qr, nodes: r.nodes, nodeStep: r.nodeStep, nodeState: r.nodeState, steps: r.steps }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-l", label: "l", sm: true }, { attr: "data-r", label: "r", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "Дерево отрезков: сумма на [" + ctx.ql + "," + ctx.qr + "]"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Итог суммы"],
      sumValues: function (s) { return [{ text: s.vars["узел"] }, { text: s.vars["итог"], cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Сумма на [" + ctx.ql + "," + ctx.qr + "] = " + s.vars["итог"], text: "сложили зелёные (take) узлы" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "сумма = " + s.vars["итог"], c: "O(log n)", cls: "eq" }; var st = s.line === 5 ? { c: "take", cls: "eq" } : (s.line === 2 ? { c: "skip", cls: "gt" } : { c: "split", cls: "lt" }); return { a: "узел " + s.vars["узел"], b: "сумма " + s.vars["сумма узла"], c: st.c, cls: st.cls }; },
      varsOf: function (s) { return { "узел": s.vars["узел"], "сумма узла": s.vars["сумма узла"], "итог": s.vars["итог"] }; },
      customViz: segViz
    },

    "mst-kruskal": {
      badge: "MST · Kruskal", desc: "Минимальное остовное дерево: берём лёгкие рёбра, если они не создают цикл (Union-Find).",
      valuesLabel: "", codeKey: "mst-kruskal", fillRange: false,
      complexity: { time: "O(E log E)", space: "O(V)", good: "★ Минимального остова" },
      varOrder: ["ребро", "вес", "вес MST"],
      varDesc: { "ребро": "Рассматриваемое ребро", "вес": "Вес ребра", "вес MST": "Суммарный вес остова" },
      lineNotes: { 1: "Сортируем рёбра по возрастанию веса — берём дешёвые первыми", 5: "Концы в разных компонентах? Union объединяет их", 6: "Ребро не создаёт цикл — берём его в остов", 9: "Все вершины связаны — суммарный вес минимального остова" },
      rules: [{ head: "Разные компоненты", body: "→ берём ребро (Union)", cls: "eq" }, { head: "Одна компонента", body: "→ цикл, пропускаем", cls: "gt" }, { head: "По возрастанию веса", body: "сначала лёгкие рёбра", cls: "lt" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = (root.getAttribute("data-edges") || "").split(",").map(function (e) { return e.trim().split("-"); }).map(function (p) { return { u: labels.indexOf(p[0]), v: labels.indexOf(p[1]), w: Number(p[2]) }; }).filter(function (e) { return e.u >= 0 && e.v >= 0; }); var r = bMstKruskal(labels, edges); return { labels: labels, edges: edges, edgeStep: r.edgeStep, edgeState: r.edgeState, steps: r.steps }; },
      inputs: [{ attr: "data-nodes", label: "Вершины" }, { attr: "data-edges", label: "Рёбра a-b-вес" }],
      values: function () { return []; },
      title: function () { return "MST: алгоритм Краскала"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Ребро (вес)", "Вес MST"],
      sumValues: function (s) { return [{ text: s.vars["ребро"] === "—" ? "—" : s.vars["ребро"] + " (" + s.vars["вес"] + ")" }, { text: s.vars["вес MST"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Остов построен", text: "суммарный вес = " + s.vars["вес MST"] }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "MST готов", b: "вес " + s.vars["вес MST"], c: "Kruskal", cls: "eq" }; if (s.line === 1) return { a: "сортировка", b: "по весу", c: "старт", cls: "lt" }; var add = s.line === 6; return { a: "ребро " + s.vars["ребро"], b: "вес " + s.vars["вес"], c: add ? "берём" : "цикл → пропуск", cls: add ? "eq" : "gt" }; },
      varsOf: function (s) { return { "ребро": s.vars["ребро"], "вес": s.vars["вес"], "вес MST": s.vars["вес MST"] }; },
      customViz: mstViz
    },

    "dijkstra": {
      badge: "Dijkstra", desc: "Кратчайшие пути от источника при неотрицательных весах: жадно финализируем ближайшую вершину и релаксируем её рёбра.",
      valuesLabel: "", codeKey: "dijkstra", fillRange: false,
      complexity: { time: "O((V+E) log V)", space: "O(V)", good: "★ Кратчайшие пути, неотриц. веса" },
      varOrder: ["u", "dist[u]", "очередь", "ребро", "dist[v]"],
      varDesc: { "u": "Извлечённая (финализированная) вершина", "dist[u]": "Её окончательное расстояние", "очередь": "Приоритетная очередь (вершина:оценка)", "ребро": "Релаксируемое ребро u→v (вес)", "dist[v]": "Расстояние до соседа: было → стало" },
      lineNotes: { 2: "Старт: dist[src]=0, кладём источник в мин-кучу", 4: "Извлекаем вершину с минимальной оценкой — её расстояние финально", 5: "Оценка больше уже известного dist — это устаревшая запись, пропускаем", 7: "Релаксация: новый путь dist[u]+w короче текущего dist[v]?", 8: "Короче → обновляем dist[v] и кладём новую запись в очередь", 13: "Очередь пуста — все кратчайшие расстояния найдены" },
      rules: [{ head: "Извлекаем минимум", body: "ближайшая вершина — финал", cls: "lt" }, { head: "dist[u]+w < dist[v]", body: "→ релаксируем dist[v]", cls: "eq" }, { head: "Оценка > dist[u]", body: "→ устаревшая запись, пропуск", cls: "gt" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = (root.getAttribute("data-edges") || "").split(",").map(function (e) { return e.trim().split("-"); }).map(function (p) { return { u: labels.indexOf(p[0]), v: labels.indexOf(p[1]), w: Number(p[2]) }; }).filter(function (e) { return e.u >= 0 && e.v >= 0; }); var start = parseInt(root.getAttribute("data-start") || "0", 10); return { labels: labels, edges: edges, start: start, steps: bDijkstra(labels, edges, start).steps }; },
      inputs: [{ attr: "data-nodes", label: "Вершины" }, { attr: "data-edges", label: "Рёбра a-b-вес (ориент.)" }, { attr: "data-start", label: "старт", sm: true }],
      values: function () { return []; },
      title: function () { return "Дейкстра: кратчайшие пути"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Извлекли u (dist)", "Релаксация dist[v]"],
      sumValues: function (s) { return [{ text: s.vars.u === "—" ? "—" : s.vars.u + " (" + s.vars["dist[u]"] + ")" }, { text: s.vars["dist[v]"], cls: (s.line === 8 ? "eq" : "") }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Кратчайшие пути найдены", text: s.info }; if (s.line === 5) return { kind: "end", icon: idx + 1, head: "Устаревшая запись", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "все dist финальны", c: "Dijkstra", cls: "eq" }; if (s.line === 2) return { a: "старт", b: "dist[src] = 0", c: "→", cls: "lt" }; if (s.line === 5) return { a: "запись " + s.vars.u, b: "устарела", c: "пропуск", cls: "gt" }; if (s.line === 4) return { a: "извлекли " + s.vars.u, b: "dist = " + s.vars["dist[u]"], c: "финал", cls: "lt" }; var imp = s.line === 8; return { a: "ребро " + s.vars["ребро"], b: s.vars["dist[v]"], c: imp ? "релакс" : "без изм.", cls: imp ? "eq" : "gt" }; },
      varsOf: function (s) { return { "u": s.vars.u, "dist[u]": s.vars["dist[u]"], "очередь": s.vars["очередь"], "ребро": s.vars["ребро"], "dist[v]": s.vars["dist[v]"] }; },
      customViz: dijkstraViz
    },

    "dp-lcs": {
      badge: "Dynamic Programming", desc: "Longest Common Subsequence: 2D-таблица dp[i][j] по префиксам. Совпали символы → диагональ +1, иначе → max(верх, слева).",
      valuesLabel: "", codeKey: "dp-lcs", fillRange: false,
      complexity: { time: "O(m·n)", space: "O(m·n)", good: "★ 2D-ДП по двум последовательностям" },
      varOrder: ["i", "j", "a[i-1], b[j-1]", "правило", "dp[i][j]"],
      varDesc: { "i": "Строка: префикс a длины i", "j": "Столбец: префикс b длины j", "a[i-1], b[j-1]": "Сравниваемые символы", "правило": "Какой переход применён", "dp[i][j]": "Длина LCS этих префиксов" },
      lineNotes: { 1: "Нулевая строка и столбец = 0: с пустым префиксом общей подпоследовательности нет", 4: "Сравниваем текущие символы a[i-1] и b[j-1]", 5: "Совпали → продлеваем диагональ dp[i-1][j-1] на +1", 7: "Не совпали → берём лучшее из накопленного: max(сверху, слева)", 11: "dp[m][n] — длина наибольшей общей подпоследовательности" },
      rules: [{ head: "a[i-1] = b[j-1]", body: "→ dp[i-1][j-1] + 1 (диагональ)", cls: "eq" }, { head: "a[i-1] ≠ b[j-1]", body: "→ max(верх, слева)", cls: "lt" }, { head: "Ответ", body: "правый нижний угол", cls: "gt" }],
      parse: function (root) { var a = (root.getAttribute("data-a") || "").trim(); var b = (root.getAttribute("data-b") || "").trim(); var r = bDpLcs(a, b); return { a: a, b: b, m: r.m, n: r.n, fillStep: r.fillStep, rowHeads: r.rowHeads, colHeads: r.colHeads, steps: r.steps }; },
      inputs: [{ attr: "data-a", label: "Строка a" }, { attr: "data-b", label: "Строка b" }],
      values: function () { return []; },
      title: function (ctx) { return "LCS: «" + ctx.a + "» и «" + ctx.b + "»"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Символы a[i-1], b[j-1]", "dp[i][j]"],
      sumValues: function (s) { return [{ text: s.vars["a[i-1], b[j-1]"] }, { text: s.vars["dp[i][j]"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Длина LCS = " + s.vars["dp[i][j]"], text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "dp[m][n]", b: "LCS = " + s.vars["dp[i][j]"], c: "готово", cls: "eq" }; if (s.i < 0) return { a: "база", b: "края = 0", c: "старт", cls: "lt" }; return { a: "dp[" + s.i + "][" + s.j + "] " + s.vars["a[i-1], b[j-1]"], b: s.match ? "совпали" : "не совпали", c: s.match ? "диаг +1" : "max(↑,←)", cls: s.match ? "eq" : "lt" }; },
      varsOf: function (s) { return { "i": s.vars.i, "j": s.vars.j, "a[i-1], b[j-1]": s.vars["a[i-1], b[j-1]"], "правило": s.vars["правило"], "dp[i][j]": s.vars["dp[i][j]"] }; },
      customViz: dpTableViz
    },

    "bellman-ford": {
      badge: "Bellman–Ford", desc: "Кратчайшие пути при любых весах: V−1 проходов релаксации по всем рёбрам; V-й проход — детектор отрицательного цикла.",
      valuesLabel: "", codeKey: "bellman-ford", fillRange: false,
      complexity: { time: "O(V·E)", space: "O(V)", good: "★ Отрицательные веса, поиск отриц. цикла" },
      varOrder: ["проход", "ребро", "dist[u]", "dist[v]", "релаксация"],
      varDesc: { "проход": "Номер прохода (всего V−1)", "ребро": "Релаксируемое ребро u→v (вес)", "dist[u]": "Расстояние до начала ребра", "dist[v]": "Расстояние до конца: было → стало", "релаксация": "Удалось ли укоротить путь" },
      lineNotes: { 1: "Старт: dist[src]=0, остальные ∞", 2: "Кратчайший путь содержит ≤ V−1 рёбер → столько проходов и нужно", 4: "Проверяем каждое ребро: путь через u короче текущего dist[v]?", 5: "Короче → релаксируем dist[v] (Bellman–Ford ничего не финализирует)", 11: "На V-м проходе всё ещё улучшается → отрицательный цикл", 14: "V-й проход без улучшений → циклов нет, расстояния верны" },
      rules: [{ head: "dist[u]+w < dist[v]", body: "→ релаксируем (любой проход)", cls: "eq" }, { head: "V−1 проходов", body: "путь ≤ V−1 рёбер", cls: "lt" }, { head: "V-й проход улучшил", body: "→ отрицательный цикл", cls: "gt" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = (root.getAttribute("data-edges") || "").split(",").map(function (e) { return e.trim().split("-"); }).map(function (p) { return { u: labels.indexOf(p[0]), v: labels.indexOf(p[1]), w: Number(p.slice(2).join("-")) }; }).filter(function (e) { return e.u >= 0 && e.v >= 0 && !isNaN(e.w); }); var start = parseInt(root.getAttribute("data-start") || "0", 10); return { labels: labels, edges: edges, start: start, steps: bBellmanFord(labels, edges, start).steps }; },
      inputs: [{ attr: "data-nodes", label: "Вершины" }, { attr: "data-edges", label: "Рёбра a-b-вес (ориент., веса любые)" }, { attr: "data-start", label: "старт", sm: true }],
      values: function () { return []; },
      title: function () { return "Bellman–Ford: кратчайшие пути"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Проход / ребро", "Релаксация dist[v]"],
      sumValues: function (s) { return [{ text: s.vars["ребро"] === "—" ? "проход " + s.vars["проход"] : s.vars["ребро"] }, { text: s.vars["dist[v]"], cls: (s.line === 5 ? "eq" : "") }]; },
      status: function (s, idx, total) { if (s.done) return { kind: s.found ? "ok" : "end", icon: s.found ? "✓" : "✗", head: s.found ? "Кратчайшие пути найдены" : "Отрицательный цикл!", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return s.found ? { a: "готово", b: "циклов нет", c: "Bellman–Ford", cls: "eq" } : { a: "V-й проход", b: "ещё улучшает", c: "отриц. цикл", cls: "gt" }; if (s.line === 1) return { a: "старт", b: "dist[src] = 0", c: "→", cls: "lt" }; if (s.line === 2) return { a: "проход " + s.vars["проход"], b: "по всем рёбрам", c: "→", cls: "lt" }; var imp = s.line === 5; return { a: "ребро " + s.vars["ребро"], b: s.vars["dist[v]"], c: imp ? "релакс" : "без изм.", cls: imp ? "eq" : "gt" }; },
      varsOf: function (s) { return { "проход": s.vars["проход"], "ребро": s.vars["ребро"], "dist[u]": s.vars["dist[u]"], "dist[v]": s.vars["dist[v]"], "релаксация": s.vars["релаксация"] }; },
      customViz: dijkstraViz
    },

    "knapsack": {
      badge: "Dynamic Programming", desc: "0/1 рюкзак: dp[i][c] — максимальная ценность из первых i предметов при вместимости c. Выбор «взять / не взять».",
      valuesLabel: "", codeKey: "knapsack", fillRange: false,
      complexity: { time: "O(n·W)", space: "O(n·W) → O(W)", good: "★ Выбор подмножества с ограничением" },
      varOrder: ["предмет", "вместимость", "правило", "dp[i][c]"],
      varDesc: { "предмет": "Текущий предмет i (вес·ценность)", "вместимость": "Столбец c — доступная вместимость", "правило": "Какой выбор сделан", "dp[i][c]": "Лучшая ценность для (i, c)" },
      lineNotes: { 1: "Нулевая строка (нет предметов) и столбец (вместимость 0) = 0", 4: "По умолчанию НЕ берём предмет: наследуем dp[i-1][c]", 5: "Предмет влезает в остаток вместимости c?", 7: "Взять выгоднее? dp[i-1][c-wt]+val против пропуска", 11: "dp[n][W] — максимальная ценность при полной вместимости" },
      rules: [{ head: "Не влезает (wt > c)", body: "→ берём верх dp[i-1][c]", cls: "gt" }, { head: "Взять выгоднее", body: "→ dp[i-1][c-wt] + val", cls: "eq" }, { head: "Пропустить выгоднее", body: "→ dp[i-1][c]", cls: "lt" }],
      parse: function (root) { var W = parseInt(root.getAttribute("data-capacity"), 10); var items = (root.getAttribute("data-items") || "").split(",").map(function (s) { return s.trim().split("-").map(Number); }).filter(function (p) { return p.length === 2; }).map(function (p) { return { w: p[0], v: p[1] }; }); var r = bKnapsack(items, W); return { items: items, W: W, m: r.m, n: r.n, fillStep: r.fillStep, rowHeads: r.rowHeads, colHeads: r.colHeads, rowHeadW: r.rowHeadW, steps: r.steps }; },
      inputs: [{ attr: "data-items", label: "Предметы вес-ценность" }, { attr: "data-capacity", label: "вместимость W", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "0/1 рюкзак: вместимость " + ctx.W; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Предмет / вместимость", "dp[i][c]"],
      sumValues: function (s) { return [{ text: s.vars["предмет"] === "—" ? "—" : s.vars["предмет"] + " · c=" + s.vars["вместимость"] }, { text: s.vars["dp[i][c]"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Максимальная ценность = " + s.vars["dp[i][c]"], text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "dp[n][W]", b: "ценность = " + s.vars["dp[i][c]"], c: "готово", cls: "eq" }; if (s.i < 0) return { a: "база", b: "края = 0", c: "старт", cls: "lt" }; var r = s.vars["правило"]; return { a: s.vars["предмет"] + " c=" + s.vars["вместимость"], b: r, c: s.match ? "взять" : (r === "не влезает" ? "верх" : "пропуск"), cls: s.match ? "eq" : (r === "не влезает" ? "gt" : "lt") }; },
      varsOf: function (s) { return { "предмет": s.vars["предмет"], "вместимость": s.vars["вместимость"], "правило": s.vars["правило"], "dp[i][c]": s.vars["dp[i][c]"] }; },
      customViz: dpTableViz
    },

    "astar": {
      badge: "A*", desc: "Поиск пути по сетке с эвристикой: из открытого списка берём клетку с минимальной f = g + h (h — манхэттенское расстояние до цели).",
      valuesLabel: "", codeKey: "astar", fillRange: false,
      complexity: { time: "O(E log V)", space: "O(V)", good: "★ Путь по сетке с хорошей эвристикой" },
      varOrder: ["клетка", "g", "h", "f", "открытых"],
      varDesc: { "клетка": "Текущая клетка", "g": "Стоимость пути от старта", "h": "Эвристика — манхэттен до цели", "f": "Оценка f = g + h", "открытых": "Размер открытого списка" },
      lineNotes: { 1: "Открытый список — мин-куча по f; старт с f = h(старт)", 4: "Извлекаем клетку с минимальной оценкой f", 5: "Это цель — путь найден, возвращаем g", 8: "Стена или уже закрытая клетка — пропускаем", 9: "Через текущую клетку путь до соседа короче?", 11: "Кладём соседа в очередь с f = g + h", 15: "Открытый список пуст — пути нет" },
      rules: [{ head: "Минимум f = g + h", body: "берём ближайшую по оценке", cls: "lt" }, { head: "Допустимая h", body: "→ путь оптимален", cls: "eq" }, { head: "h ≡ 0", body: "→ вырождается в Дейкстру", cls: "gt" }],
      parse: function (root) { var grid = (root.getAttribute("data-grid") || "").split(";").map(function (r) { return r.split(",").map(Number); }); var rr = bAStar(grid); return { grid: grid, R: rr.R, C: rr.C, goal: rr.goal, steps: rr.steps }; },
      inputs: [{ attr: "data-grid", label: "Сетка строки;через; запятую (0/1)" }],
      values: function () { return []; },
      title: function () { return "A*: поиск пути по сетке"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Клетка (f = g + h)", "Открытых"],
      sumValues: function (s) { return [{ text: s.vars["клетка"] === "—" ? "—" : s.vars["клетка"] + " · f=" + s.vars["f"] }, { text: s.vars["открытых"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.found) return { kind: "ok", icon: "✓", head: "Путь найден", text: s.info }; if (s.done) return { kind: "end", icon: "✗", head: "Пути нет", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "цель достигнута", b: "длина " + s.vars["g"], c: "путь", cls: "eq" }; if (s.done) return { a: "тупик", b: "открытых 0", c: "−1", cls: "gt" }; if (s.line === 1) return { a: "старт", b: "f = h = " + s.vars["f"], c: "→", cls: "lt" }; if (s.nb) return { a: "сосед " + s.vars["клетка"], b: "f = " + s.vars["f"], c: "в очередь", cls: "eq" }; return { a: "извлекли " + s.vars["клетка"], b: "f = " + s.vars["f"], c: "раскрыть", cls: "lt" }; },
      varsOf: function (s) { return { "клетка": s.vars["клетка"], "g": s.vars["g"], "h": s.vars["h"], "f": s.vars["f"], "открытых": s.vars["открытых"] }; },
      customViz: aStarViz
    }
  };

  function buildDashboard(root, cfg) {
    var ctx = cfg.parse(root);
    var steps = ctx.steps;
    var values = cfg.values(ctx);
    var n = values.length;

    root.classList.add("algo-viz--ready", "algo-tp");
    root.innerHTML = "";

    // --- Доступность: виджет — это группа с понятным именем и подсказкой по
    // управлению с клавиатуры. Пошаговая прокрутка озвучивается через role=status
    // ниже (карточка статуса), цветовые состояния клеток дублируются её текстом.
    root.setAttribute("role", "group");
    root.setAttribute("aria-roledescription", "интерактивная визуализация алгоритма");
    root.setAttribute("aria-label", cfg.title(ctx) + ". Шаги: стрелки ←/→, Home/End; пробел — автопроигрывание");
    root.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight Home End Space");

    // --- Заголовок ---
    var head = mkEl("div", "algo-tp__head");
    var h = mkEl("div", "algo-tp__title");
    h.appendChild(mkEl("span", null, cfg.title(ctx) + " "));
    h.appendChild(mkEl("span", "algo-tp__badge", cfg.badge));
    head.appendChild(h);
    head.appendChild(mkEl("div", "algo-tp__sub", cfg.desc));
    root.appendChild(head);

    // --- Верхние карточки ---
    var top = mkEl("div", "algo-tp__top");
    var cArr = mkEl("div", "algo-tp__card algo-tp__card--arr");
    cArr.appendChild(mkEl("div", "algo-tp__caphdr", cfg.valuesLabel));
    var miniRow = mkEl("div", "algo-tp__minirow");
    var miniCells = values.map(function (v) { var c = mkEl("div", "algo-tp__mini", v); miniRow.appendChild(c); return c; });
    cArr.appendChild(miniRow);
    var editRow = mkEl("div", "algo-tp__edit");
    var inputs = cfg.inputs.map(function (f) {
      var inp = mkEl("input", "algo-tp__input" + (f.sm ? " algo-tp__input--sm" : ""));
      inp.value = root.getAttribute(f.attr) || ""; inp.title = f.label || f.attr;
      inp.setAttribute("aria-label", f.label || f.attr);
      editRow.appendChild(inp); return { attr: f.attr, inp: inp };
    });
    var runBtn = mkEl("button", "algo-tp__run", "⟲ Запустить"); runBtn.type = "button";
    runBtn.setAttribute("aria-label", "Запустить визуализацию заново с введёнными данными");
    function rerun() { inputs.forEach(function (o) { root.setAttribute(o.attr, o.inp.value.trim()); }); root.classList.remove("algo-viz--ready"); buildDashboard(root, cfg); }
    runBtn.onclick = rerun;
    inputs.forEach(function (o) { o.inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); rerun(); } }); });
    editRow.appendChild(runBtn);
    cArr.appendChild(editRow);
    top.appendChild(cArr);

    if (cfg.param) {
      var p = cfg.param(ctx);
      var cP = mkEl("div", "algo-tp__card algo-tp__card--tgt");
      cP.appendChild(mkEl("div", "algo-tp__caphdr", p.label));
      cP.appendChild(mkEl("div", p.ok ? "algo-tp__tgt" : "algo-tp__param", p.value));
      top.appendChild(cP);
    }

    var cStat = mkEl("div", "algo-tp__card algo-tp__status");
    // Живой регион: при каждом шаге скринридер зачитывает заголовок+текст статуса —
    // это и есть текстовая альтернатива цветным состояниям клеток/указателей.
    cStat.setAttribute("role", "status");
    cStat.setAttribute("aria-live", "polite");
    cStat.setAttribute("aria-atomic", "true");
    var statIcon = mkEl("div", "algo-tp__staticon", "");
    statIcon.setAttribute("aria-hidden", "true"); // эмодзи-иконка декоративна
    var statBody = mkEl("div", "algo-tp__statbody");
    var statHead = mkEl("div", "algo-tp__stathead", "");
    var statText = mkEl("div", "algo-tp__stattext", "");
    statBody.appendChild(statHead); statBody.appendChild(statText);
    cStat.appendChild(statIcon); cStat.appendChild(statBody);
    top.appendChild(cStat);
    root.appendChild(top);

    // --- Основная область ---
    var main = mkEl("div", "algo-tp__main");
    var pViz = mkEl("div", "algo-tp__panel");
    pViz.appendChild(mkEl("div", "algo-tp__panelhdr", "Визуализация алгоритма"));
    if (cfg.note) { var noteTxt = cfg.note(ctx); if (noteTxt) pViz.appendChild(mkEl("div", "algo-tp__note", noteTxt)); }
    var bigCells = [], ptrSlots = [], updateViz = null;
    if (cfg.customViz) {
      // алгоритм рисует свою центральную визуализацию (например, интервалы на прямой)
      updateViz = cfg.customViz(pViz, ctx);
    } else {
      var grid = mkEl("div", "algo-tp__grid");
      grid.style.gridTemplateColumns = "auto repeat(" + n + ", minmax(2.6em, 1fr))";
      grid.appendChild(mkEl("div", "algo-tp__rowlab", "Индекс"));
      values.forEach(function (_, i) { grid.appendChild(mkEl("div", "algo-tp__idx", i)); });
      grid.appendChild(mkEl("div", "algo-tp__rowlab", "Значение"));
      var cyIdx = cfg.cycleIdx ? cfg.cycleIdx(ctx) : -1;
      bigCells = values.map(function (v, i) { var c = mkEl("div", "algo-tp__big", v); if (i === cyIdx) c.classList.add("algo-tp__big--cycle"); grid.appendChild(c); return c; });
      grid.appendChild(mkEl("div", "algo-tp__rowlab", ""));
      ptrSlots = values.map(function () { var c = mkEl("div", "algo-tp__ptrslot"); grid.appendChild(c); return c; });
      pViz.appendChild(grid);
    }

    var sumBox = mkEl("div", "algo-tp__sumbox");
    var sumValEls = cfg.sumCells.map(function (lab) {
      var cell = mkEl("div", "algo-tp__sumcell");
      cell.appendChild(mkEl("div", "algo-tp__sumlab", lab));
      var v = mkEl("div", "algo-tp__sumval", ""); cell.appendChild(v); sumBox.appendChild(cell); return v;
    });
    pViz.appendChild(sumBox);

    var rules = mkEl("div", "algo-tp__rules");
    cfg.rules.forEach(function (r) {
      var col = mkEl("div", "algo-tp__rule algo-tp__rule--" + r.cls);
      col.appendChild(mkEl("div", "algo-tp__rulehead", r.head));
      col.appendChild(mkEl("div", "algo-tp__rulebody", r.body));
      rules.appendChild(col);
    });
    pViz.appendChild(rules);
    main.appendChild(pViz);

    var pCode = mkEl("div", "algo-tp__panel");
    pCode.appendChild(mkEl("div", "algo-tp__panelhdr", "Код алгоритма"));
    var pre = mkEl("pre", "algo-tp__code");
    var codeLines = CODE[cfg.codeKey] || [];
    var lineEls = codeLines.map(function (ln, i) {
      var d = mkEl("div", "algo-tp__codeline");
      d.appendChild(mkEl("span", "algo-tp__lineno", i + 1));
      d.appendChild(mkEl("span", "algo-tp__linetext", ln));
      pre.appendChild(d); return d;
    });
    pCode.appendChild(pre);
    // Подпись под кодом: какая строка сейчас выполняется и что она делает.
    // Привязывает прозу («что происходит») к конкретной строке, на которую смотрит глаз.
    var codeNote = mkEl("div", "algo-tp__codenote");
    var codeNoteLn = mkEl("span", "algo-tp__codenoteln", "");
    var codeNoteTx = mkEl("span", "algo-tp__codenotetx", "");
    codeNote.appendChild(codeNoteLn); codeNote.appendChild(codeNoteTx);
    pCode.appendChild(codeNote);
    pCode.appendChild(mkEl("div", "algo-tp__panelhdr algo-tp__panelhdr--sm", "Переменные"));
    var table = mkEl("div", "algo-tp__vars");
    var thead = mkEl("div", "algo-tp__vrow algo-tp__vrow--head");
    thead.appendChild(mkEl("div", "algo-tp__vname", "Имя"));
    thead.appendChild(mkEl("div", "algo-tp__vval", "Значение"));
    thead.appendChild(mkEl("div", "algo-tp__vdesc", "Описание"));
    table.appendChild(thead);
    var varRows = {};
    cfg.varOrder.forEach(function (k) {
      var r = mkEl("div", "algo-tp__vrow");
      r.appendChild(mkEl("div", "algo-tp__vname", k));
      var vv = mkEl("div", "algo-tp__vval", ""); r.appendChild(vv);
      r.appendChild(mkEl("div", "algo-tp__vdesc", cfg.varDesc[k] || ""));
      table.appendChild(r); varRows[k] = vv;
    });
    pCode.appendChild(table);
    main.appendChild(pCode);
    root.appendChild(main);

    // --- Таймлайн ---
    var tlPanel = mkEl("div", "algo-tp__panel");
    tlPanel.appendChild(mkEl("div", "algo-tp__panelhdr", "Пошаговое выполнение"));
    var tl = mkEl("div", "algo-tp__timeline");
    var tlCards = steps.map(function (s, i) {
      if (i > 0) tl.appendChild(mkEl("div", "algo-tp__arrow", "⇢"));
      var card = mkEl("div", "algo-tp__step");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "-1");
      card.setAttribute("aria-label", "Перейти к шагу " + (i + 1) + " из " + steps.length);
      card.appendChild(mkEl("div", "algo-tp__stepno", i + 1));
      var body = mkEl("div", "algo-tp__steplines");
      var sc = cfg.stepCard(s, i, ctx);
      body.appendChild(mkEl("div", "algo-tp__stepa", sc.a));
      body.appendChild(mkEl("div", "algo-tp__stepb", sc.b));
      body.appendChild(mkEl("div", "algo-tp__stepc algo-tp__stepc--" + sc.cls, sc.c));
      card.appendChild(body);
      card.onclick = function () { show(i); };
      tl.appendChild(card);
      return card;
    });
    tlPanel.appendChild(tl);
    root.appendChild(tlPanel);

    // --- Футер ---
    var foot = mkEl("div", "algo-tp__foot");
    function footCol(lab, val, cls) { var c = mkEl("div", "algo-tp__footcol"); c.appendChild(mkEl("div", "algo-tp__footlab", lab)); c.appendChild(mkEl("div", "algo-tp__footval" + (cls ? " " + cls : ""), val)); return c; }
    foot.appendChild(footCol("Сложность по времени", cfg.complexity.time, "algo-tp__footval--ok"));
    foot.appendChild(footCol("Сложность по памяти", cfg.complexity.space, "algo-tp__footval--ok"));
    foot.appendChild(footCol("Подходит для", cfg.complexity.good));
    root.appendChild(foot);

    // --- Контролы ---
    var ctrl = mkEl("div", "algo-tp__ctrl");
    var bFirst = mkBtn("⏮", "В начало"), bPrev = mkBtn("◀", "Назад");
    var counter = mkEl("span", "algo-viz__counter", "");
    var bNext = mkBtn("⏵", "Вперёд"), bLast = mkBtn("⏭", "В конец");
    var bPlay = mkBtn("▶ Авто", "Автопроигрывание (пробел)");
    bPlay.classList.add("algo-tp__playbtn");
    [bFirst, bPrev, counter, bNext, bLast, bPlay].forEach(function (x) { ctrl.appendChild(x); });
    root.appendChild(ctrl);

    var prevVars = null, idx = 0;
    function show(i) {
      idx = Math.max(0, Math.min(steps.length - 1, i));
      var s = steps[idx], pt = cfg.pointers(s), lo = pt.lo, hi = pt.hi, found = !!s.found;
      if (updateViz) {
        updateViz(s);
      } else {
        bigCells.forEach(function (c, j) {
          if (s.values && j < s.values.length) c.textContent = s.values[j]; // мутация значений (дедуп на месте)
          var st2 = cfg.cellState
            ? cfg.cellState(s, j, lo, hi)
            : { lo: j === lo && !found, hi: j === hi && !found, span: cfg.fillRange && lo >= 0 && hi >= 0 && j > lo && j < hi && !found, found: found && (j === lo || j === hi) };
          c.classList.toggle("algo-tp__big--lo", !!st2.lo);
          c.classList.toggle("algo-tp__big--hi", !!st2.hi);
          c.classList.toggle("algo-tp__big--span", !!st2.span);
          c.classList.toggle("algo-tp__big--mid", !!st2.mid);
          c.classList.toggle("algo-tp__big--dim", !!st2.dim);
          c.classList.toggle("algo-tp__big--found", !!st2.found);
        });
        ptrSlots.forEach(function (c, j) {
          c.innerHTML = "";
          if (j === lo && lo >= 0) { c.appendChild(mkEl("div", "algo-tp__arrowup algo-tp__arrowup--lo", "↑")); c.appendChild(mkEl("div", "algo-tp__pill algo-tp__pill--lo", cfg.ptr1.name + " = " + lo)); c.appendChild(mkEl("div", "algo-tp__ptrcap", cfg.ptr1.cap)); }
          if (j === hi && hi >= 0) { c.appendChild(mkEl("div", "algo-tp__arrowup algo-tp__arrowup--hi", "↑")); c.appendChild(mkEl("div", "algo-tp__pill algo-tp__pill--hi", cfg.ptr2.name + " = " + hi)); c.appendChild(mkEl("div", "algo-tp__ptrcap", cfg.ptr2.cap)); }
        });
      }
      miniCells.forEach(function (c, j) {
        c.classList.toggle("algo-tp__mini--lo", j === lo);
        c.classList.toggle("algo-tp__mini--hi", j === hi);
      });
      var sv = cfg.sumValues(s, ctx);
      sumValEls.forEach(function (elv, k) { elv.textContent = sv[k].text; elv.className = "algo-tp__sumval" + (sv[k].cls ? " algo-tp__sumval--" + sv[k].cls : ""); });

      var st = cfg.status(s, idx, steps.length, ctx);
      cStat.classList.toggle("algo-tp__status--ok", st.kind === "ok");
      cStat.classList.toggle("algo-tp__status--info", st.kind === "info");
      cStat.classList.toggle("algo-tp__status--end", st.kind === "end");
      statIcon.textContent = st.icon;
      statHead.textContent = st.head; statText.textContent = st.text;

      lineEls.forEach(function (d, li) { d.classList.toggle("algo-tp__codeline--active", li === s.line); });

      var cur = cfg.varsOf(s, ctx);
      var anyChanged = false;
      cfg.varOrder.forEach(function (k) {
        varRows[k].textContent = cur[k];
        var ch = !!(prevVars && String(prevVars[k]) !== String(cur[k]));
        if (ch) anyChanged = true;
        varRows[k].parentNode.classList.toggle("algo-tp__vrow--changed", ch);
      });
      prevVars = cur;

      // Подпись под кодом: «▸ строка N» + что она делает. Объяснение — из
      // cfg.lineNotes (по индексу строки), иначе короткий текст статуса.
      if (typeof s.line === "number" && s.line >= 0 && codeLines[s.line]) {
        codeNoteLn.textContent = "▸ строка " + (s.line + 1);
        var note = (cfg.lineNotes && cfg.lineNotes[s.line]) || (st && st.text) || codeLines[s.line].trim();
        codeNoteTx.textContent = note;
        codeNote.style.visibility = "";
      } else {
        codeNote.style.visibility = "hidden";
      }
      // Причинность: подсвечиваем активную строку как «только что сработала»,
      // если на этом шаге изменились переменные — глаз связывает строку с эффектом.
      var activeEl = (typeof s.line === "number" && lineEls[s.line]) || null;
      lineEls.forEach(function (d) { d.classList.remove("algo-tp__codeline--justran"); });
      if (activeEl && anyChanged) activeEl.classList.add("algo-tp__codeline--justran");

      tlCards.forEach(function (card, j) {
        card.classList.toggle("algo-tp__step--active", j === idx);
        card.classList.toggle("algo-tp__step--found", !!steps[j].found);
        card.classList.toggle("algo-tp__step--done", j < idx);
      });
      counter.textContent = (idx + 1) + " / " + steps.length;
      counter.setAttribute("aria-label", "Шаг " + (idx + 1) + " из " + steps.length);
      bFirst.disabled = bPrev.disabled = idx === 0;
      bNext.disabled = bLast.disabled = idx === steps.length - 1;
    }
    // --- Автопроигрывание: алгоритм сам листает шаги, строка кода подсвечивается на лету ---
    var timer = null;
    function stopPlay() {
      if (!timer) return;
      clearInterval(timer); timer = null;
      bPlay.textContent = "▶ Авто"; bPlay.classList.remove("algo-tp__playbtn--on");
      bPlay.setAttribute("aria-label", "Автопроигрывание шагов");
    }
    function startPlay() {
      if (idx >= steps.length - 1) show(0); // с конца — начинаем заново
      bPlay.textContent = "⏸ Пауза"; bPlay.classList.add("algo-tp__playbtn--on");
      bPlay.setAttribute("aria-label", "Пауза автопроигрывания");
      timer = setInterval(function () {
        if (idx >= steps.length - 1) { stopPlay(); return; }
        show(idx + 1);
      }, 950);
    }
    bPlay.onclick = function () { timer ? stopPlay() : startPlay(); };

    bFirst.onclick = function () { stopPlay(); show(0); };
    bPrev.onclick = function () { stopPlay(); show(idx - 1); };
    bNext.onclick = function () { stopPlay(); show(idx + 1); };
    bLast.onclick = function () { stopPlay(); show(steps.length - 1); };
    root.setAttribute("tabindex", "0");
    root.addEventListener("keydown", function (e) {
      if (e.target && e.target.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") { stopPlay(); show(idx - 1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { stopPlay(); show(idx + 1); e.preventDefault(); }
      else if (e.key === "Home") { stopPlay(); show(0); e.preventDefault(); }
      else if (e.key === "End") { stopPlay(); show(steps.length - 1); e.preventDefault(); }
      else if (e.key === " " || e.key === "Spacebar") { bPlay.onclick(); e.preventDefault(); }
    });
    show(0);
  }

  // ===== Диспетчер ============================================================
  // Все типы визуализаций обслуживает один движок DASH (см. реестр DASH ниже).
  function render(el) {
    var t = el.getAttribute("data-viz") || "";
    if (DASH[t]) {
      try {
        buildDashboard(el, DASH[t]);
      } catch (err) {
        // Кривые data-атрибуты (нечисловой массив, плохое ребро и т.п.) не должны
        // давать молча сломанный виджет — показываем причину автору контента.
        if (window.console && console.error) console.error("algo-viz: не удалось построить \"" + t + "\":", err);
        el.classList.add("algo-viz--ready");
        el.appendChild(mkEl("div", "algo-tp__note", "⚠️ Ошибка визуализации \"" + t + "\": " + (err && err.message ? err.message : err)));
      }
      return;
    }
    // Неизвестный тип: не оставляем молча пустой <div>, а сигналим в консоль.
    if (window.console && console.warn) console.warn("algo-viz: неизвестный data-viz=\"" + t + "\" — нет конфига в DASH");
    el.classList.add("algo-viz--ready");
    el.appendChild(mkEl("div", "algo-tp__note", "⚠️ Неизвестный тип визуализации: " + t));
  }
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll(".algo-viz:not(.algo-viz--ready)"), render);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
