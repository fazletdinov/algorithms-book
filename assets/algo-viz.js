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
  // Фиксированное окно — построчный (debugger) проход: набор первого окна, затем скольжение.
  function bSlidingWindow(arr, k) {
    var steps = [], n = arr.length;
    if (k <= 0 || k > n) return [{ lo: 0, hi: -1, line: 12, vars: { i: "—", windowSum: "—", maxSum: "—" }, info: "Некорректное k = " + k, done: true }];
    function vv(i, ws, ms) { return { i: i, windowSum: ws, maxSum: ms }; }
    var sum = 0, maxSum, bestLo = 0;
    steps.push({ lo: 0, hi: -1, line: 1, vars: vv("—", 0, "—"), info: "windowSum = 0 — копим сумму первого окна" });
    for (var i = 0; i < k; i++) {
      steps.push({ lo: 0, hi: i - 1, line: 2, vars: vv(i, sum, "—"), info: "i = " + i + ": " + i + " < " + k + " — да, добавляем arr[" + i + "] в первое окно" });
      sum += arr[i];
      steps.push({ lo: 0, hi: i, line: 3, vars: vv(i, sum, "—"), info: "windowSum += arr[" + i + "] = " + arr[i] + " → windowSum = " + sum });
    }
    steps.push({ lo: 0, hi: k - 1, line: 2, vars: vv(k, sum, "—"), info: "i = " + k + ": " + k + " < " + k + " — нет, первое окно собрано (windowSum = " + sum + ")" });
    maxSum = sum;
    steps.push({ lo: 0, hi: k - 1, line: 5, vars: vv(k - 1, sum, maxSum), info: "maxSum = windowSum = " + maxSum + " — стартовый максимум" });
    for (var r = k; r < n; r++) {
      var lo = r - k + 1;
      steps.push({ lo: lo - 1, hi: r - 1, line: 6, vars: vv(r, sum, maxSum), info: "i = " + r + ": " + r + " < " + n + " — да, двигаем окно вправо" });
      sum += arr[r] - arr[r - k];
      steps.push({ lo: lo, hi: r, line: 7, vars: vv(r, sum, maxSum), info: "windowSum += arr[" + r + "] − arr[" + (r - k) + "] = +" + arr[r] + " − " + arr[r - k] + " → " + sum + " (за O(1), без пересчёта)" });
      var improved = sum > maxSum;
      steps.push({ lo: lo, hi: r, line: 8, vars: vv(r, sum, maxSum), info: "windowSum " + sum + (improved ? " > " : " ≤ ") + "maxSum " + maxSum + (improved ? " — да" : " — нет, максимум прежний") });
      if (improved) {
        maxSum = sum; bestLo = lo;
        steps.push({ lo: lo, hi: r, improved: true, line: 9, vars: vv(r, sum, maxSum), info: "maxSum = windowSum = " + maxSum + " — новый максимум!" });
      }
    }
    steps.push({ lo: bestLo, hi: bestLo + k - 1, line: 6, vars: vv(n, sum, maxSum), info: "i = " + n + ": " + n + " < " + n + " — нет, окна кончились" });
    steps.push({ lo: bestLo, hi: bestLo + k - 1, done: true, line: 12, vars: vv(n, sum, maxSum), info: "return maxSum = " + maxSum + " — лучшее окно [" + bestLo + ".." + (bestLo + k - 1) + "]" });
    return steps;
  }
  // Два указателя — построчный (debugger) проход по сходящимся lo/hi.
  function bTwoPointers(arr, target) {
    var steps = [], n = arr.length, lo = 0, hi = n - 1;
    function av(i) { return i >= 0 && i < n ? arr[i] : "—"; }
    function vv(s) { return { lo: lo, hi: hi, "arr[lo]": av(lo), "arr[hi]": av(hi), sum: (s === undefined ? "—" : s), target: target }; }
    steps.push({ lo: lo, hi: hi, line: 1, vars: vv(), info: "lo = 0, hi = " + hi + " — концы отсортированного массива" });
    while (lo < hi) {
      steps.push({ lo: lo, hi: hi, line: 2, vars: vv(), info: "lo(" + lo + ") < hi(" + hi + ") — да, продолжаем" });
      var sum = arr[lo] + arr[hi];
      steps.push({ lo: lo, hi: hi, line: 3, vars: vv(sum), info: "sum = arr[" + lo + "] + arr[" + hi + "] = " + arr[lo] + " + " + arr[hi] + " = " + sum });
      if (sum === target) {
        steps.push({ lo: lo, hi: hi, line: 4, vars: vv(sum), info: "sum " + sum + " == target " + target + " — да!" });
        steps.push({ lo: lo, hi: hi, found: true, done: true, line: 5, vars: vv(sum), info: "return " + lo + ", " + hi + " — пара (" + arr[lo] + ", " + arr[hi] + ") даёт " + target });
        return steps;
      }
      steps.push({ lo: lo, hi: hi, line: 4, vars: vv(sum), info: "sum " + sum + " ≠ target " + target + " — нет" });
      if (sum < target) {
        steps.push({ lo: lo, hi: hi, line: 6, vars: vv(sum), info: "sum " + sum + " < target " + target + " — да, сумма мала" });
        lo++;
        steps.push({ lo: lo, hi: hi, line: 7, vars: vv(), info: "lo++ → lo = " + lo + " (берём элемент побольше слева)" });
      } else {
        steps.push({ lo: lo, hi: hi, line: 6, vars: vv(sum), info: "sum " + sum + " < target " + target + " — нет (сумма велика) → else" });
        hi--;
        steps.push({ lo: lo, hi: hi, line: 9, vars: vv(), info: "hi-- → hi = " + hi + " (берём элемент поменьше справа)" });
      }
    }
    steps.push({ lo: lo, hi: hi, line: 2, vars: vv(), info: "lo(" + lo + ") < hi(" + hi + ") — нет, указатели сошлись" });
    steps.push({ lo: lo, hi: hi, done: true, line: 12, vars: vv(), info: "return −1, −1 — пары с суммой " + target + " нет" });
    return steps;
  }
  // Заяц и черепаха: slow и fast как индексы в списке (vars хранит значения узлов).
  // Заяц и черепаха — построчный (debugger) проход. slow/fast как индексы; nil = -1.
  function bListCycle(list, cyc) {
    var n = list.length;
    var hasCyc = !isNaN(cyc) && cyc >= 0 && cyc < n;
    function nextIdx(i) { return i < 0 ? -1 : (i === n - 1 ? (hasCyc ? cyc : -1) : i + 1); }
    function val(i) { return i >= 0 ? list[i] : "nil"; }
    if (!n) return [{ slow: -1, fast: -1, done: true, line: 9, vars: { slow: "nil", fast: "nil" }, info: "Пустой список" }];
    var steps = [], slow = 0, fast = 0, guard = 0;
    steps.push({ slow: 0, fast: 0, line: 1, vars: { slow: val(0), fast: val(0) }, info: "slow и fast стартуют с головы — " + val(0) });
    while (guard++ < 4 * n + 6) {
      var fnext = nextIdx(fast);
      var cond = fast >= 0 && fnext >= 0; // fast != nil && fast.Next != nil
      steps.push({ slow: slow, fast: fast, line: 2, vars: { slow: val(slow), fast: val(fast) }, info: cond ? "fast (" + val(fast) + ") и fast.Next есть — продолжаем" : "fast или fast.Next = nil — выходим из цикла" });
      if (!cond) { steps.push({ slow: slow, fast: -1, done: true, line: 9, vars: { slow: val(slow), fast: "nil" }, info: "return false — цикла нет (fast дошёл до конца списка)" }); break; }
      slow = nextIdx(slow);
      steps.push({ slow: slow, fast: fast, line: 3, vars: { slow: val(slow), fast: val(fast) }, info: "slow = slow.Next → " + val(slow) + " (+1 шаг)" });
      fast = nextIdx(fnext);
      steps.push({ slow: slow, fast: fast, line: 4, vars: { slow: val(slow), fast: val(fast) }, info: "fast = fast.Next.Next → " + val(fast) + " (+2 шага)" });
      var meet = slow >= 0 && slow === fast;
      steps.push({ slow: slow, fast: fast, line: 5, vars: { slow: val(slow), fast: val(fast) }, info: meet ? "slow == fast на " + val(slow) + " — указатели встретились!" : "slow (" + val(slow) + ") ≠ fast (" + val(fast) + ") — пока не встретились" });
      if (meet) { steps.push({ slow: slow, fast: fast, meet: true, found: true, done: true, line: 6, vars: { slow: val(slow), fast: val(fast) }, info: "return true — в списке есть цикл!" }); break; }
    }
    return steps;
  }
  // Переменное окно: самая длинная подстрока с ≤ k различными символами.
  // ПОСТРОЧНЫЙ (debugger-style) проход: отдельный кадр на КАЖДУЮ исполняемую строку,
  // включая заголовки циклов (for right, for len(freq) > k), if-проверку delete и left++.
  // Подсветка-«стрелка» в коде идёт строка за строкой, как пошаговое выполнение в отладчике;
  // на каждом кадре виден снимок freq (map[byte]int), окно и значения переменных.
  function bSlidingVar(chars, k) {
    var n = chars.length, freq = {}, left = 0, maxLen = 0, steps = [];
    function distinct() { return Object.keys(freq).length; }
    function snap() { var o = {}; for (var key in freq) o[key] = freq[key]; return o; } // копия map для кадра
    function vv(right) { return { left: left, right: right, distinct: distinct(), maxLen: maxLen }; }
    if (k <= 0 || !n) return [{ lo: 0, hi: -1, done: true, line: 12, freq: {}, vars: { left: "—", right: "—", distinct: 0, maxLen: 0 }, info: "Некорректное k или пустая строка" }];
    // Инициализация (строки 1–2). До своего объявления переменные показываем как «—»
    // (в Go их ещё нет в области видимости): right появляется только в заголовке for.
    steps.push({ lo: 0, hi: -1, line: 1, freq: {}, vars: { left: "—", right: "—", distinct: 0, maxLen: "—" }, info: "Создаём пустой freq — map[byte]int (счётчик символов в окне)" });
    steps.push({ lo: 0, hi: -1, line: 2, freq: {}, vars: { left: 0, right: "—", distinct: 0, maxLen: 0 }, info: "left = 0, maxLen = 0 (right ещё не объявлен — он появится в заголовке for)" });
    for (var right = 0; right < n; right++) {
      var rc = chars[right];
      steps.push({ lo: left, hi: right, line: 3, freq: snap(), vars: vv(right), info: "right = " + right + ": " + right + " < " + n + " — да, входим в тело (правая граница окна сдвинулась на индекс " + right + ", символ '" + rc + "')" });
      freq[rc] = (freq[rc] || 0) + 1;
      steps.push({ lo: left, hi: right, line: 4, touched: rc, action: "add", freq: snap(), vars: vv(right), info: "freq['" + rc + "']++ → " + freq[rc] + (freq[rc] === 1 ? " — новый ключ в map, len(freq) = " + distinct() : " — счётчик символа '" + rc + "' вырос") });
      while (true) {
        var over = distinct() > k;
        steps.push({ lo: left, hi: right, line: 5, freq: snap(), vars: vv(right), info: "len(freq) = " + distinct() + (over ? " > " + k + " → окно невалидно, входим в сжатие" : " ≤ " + k + " → окно валидно, сжатие не нужно") });
        if (!over) break;
        var lc = chars[left];
        freq[lc]--;
        steps.push({ lo: left, hi: right, line: 6, touched: lc, action: "dec", freq: snap(), vars: vv(right), info: "freq['" + lc + "']-- → " + freq[lc] + " — убираем левый символ '" + lc + "' из окна" });
        var deleted = freq[lc] === 0;
        if (deleted) delete freq[lc];
        steps.push({ lo: left, hi: right, line: 7, touched: lc, action: deleted ? "del" : null, freq: snap(), vars: vv(right), info: deleted ? "freq['" + lc + "'] == 0 → delete(freq, '" + lc + "'): ключ исчез из map, len(freq) = " + distinct() : "freq['" + lc + "'] = " + freq[lc] + " ≠ 0 → ключ '" + lc + "' остаётся в map" });
        left++;
        steps.push({ lo: left, hi: right, line: 8, freq: snap(), vars: vv(right), info: "left++ → left = " + left + " (левая граница сдвинулась вправо)" });
      }
      var curLen = right - left + 1, prevMax = maxLen, improved = curLen > maxLen;
      if (improved) maxLen = curLen;
      steps.push({ lo: left, hi: right, line: 10, improved: improved, freq: snap(), vars: vv(right), info: "maxLen = max(" + prevMax + ", right−left+1=" + curLen + ") = " + maxLen + (improved ? " — новая максимальная длина!" : " (без изменений)") });
    }
    steps.push({ lo: left, hi: n - 1, line: 3, freq: snap(), vars: { left: left, right: n, distinct: distinct(), maxLen: maxLen }, info: "right = " + n + ": " + n + " < " + n + " — нет, цикл for завершён" });
    steps.push({ lo: left, hi: n - 1, done: true, line: 12, freq: snap(), vars: { left: left, right: n - 1, distinct: distinct(), maxLen: maxLen }, info: "return maxLen = " + maxLen + " — длина самой длинной подстроки с ≤ " + k + " различными символами" });
    return steps;
  }
  // Одно направление: удаление дубликатов из отсортированного массива на месте.
  // Удаление дубликатов на месте — построчный (debugger) проход.
  function bDedup(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    function vv(slow, fast) { return { slow: slow, fast: fast, "nums[slow]": (slow >= 0 && slow < n ? a[slow] : "—"), "nums[fast]": (fast >= 0 && fast < n ? a[fast] : "—"), len: (slow >= 0 ? slow + 1 : 0) }; }
    if (!n) return [{ slow: 0, fast: 0, done: true, line: 9, values: [], vars: { slow: 0, fast: 0, "nums[slow]": "—", "nums[fast]": "—", len: 0 }, info: "Пустой массив" }];
    steps.push({ slow: 0, fast: 0, line: 1, values: a.slice(), vars: vv(0, 0), info: "len(nums) = " + n + " ≠ 0 — массив не пуст, идём дальше" });
    var slow = 0;
    steps.push({ slow: 0, fast: 0, line: 2, values: a.slice(), vars: vv(0, 0), info: "slow = 0 — первый элемент всегда уникален" });
    for (var fast = 1; fast < n; fast++) {
      steps.push({ slow: slow, fast: fast, line: 3, values: a.slice(), vars: vv(slow, fast), info: "fast = " + fast + ": " + fast + " < " + n + " — сканируем nums[" + fast + "] = " + a[fast] });
      var diff = a[slow] !== a[fast];
      steps.push({ slow: slow, fast: fast, line: 4, values: a.slice(), vars: vv(slow, fast), info: "nums[slow]=" + a[slow] + (diff ? " ≠ " : " == ") + "nums[fast]=" + a[fast] + (diff ? " — новый уникальный" : " — дубликат, пропускаем") });
      if (diff) {
        slow++;
        steps.push({ slow: slow, fast: fast, line: 5, values: a.slice(), vars: vv(slow, fast), info: "slow++ → slow = " + slow + " (двигаем границу уникальных)" });
        a[slow] = a[fast];
        steps.push({ slow: slow, fast: fast, line: 6, values: a.slice(), vars: vv(slow, fast), info: "nums[" + slow + "] = nums[" + fast + "] = " + a[fast] + " — записали уникальный" });
      }
    }
    steps.push({ slow: slow, fast: n, line: 3, values: a.slice(), vars: vv(slow, -1), info: "fast = " + n + ": " + n + " < " + n + " — нет, скан завершён" });
    steps.push({ slow: slow, fast: n, done: true, found: true, line: 9, values: a.slice(), vars: vv(slow, -1), info: "return slow+1 = " + (slow + 1) + " — уникальных элементов " + (slow + 1) });
    return steps;
  }
  // Середина списка: fast доходит до конца — slow в середине.
  // Середина списка (заяц-черепаха) — построчный (debugger) проход.
  function bListMiddle(list) {
    var n = list.length;
    function val(i) { return i >= 0 && i < n ? list[i] : "nil"; }
    if (!n) return [{ slow: -1, fast: -1, done: true, line: 6, vars: { slow: "nil", fast: "nil" }, info: "Пустой список" }];
    var steps = [], slow = 0, fast = 0, guard = 0;
    steps.push({ slow: 0, fast: 0, line: 1, vars: { slow: val(0), fast: val(0) }, info: "slow и fast стартуют с головы — " + val(0) });
    while (guard++ < n + 4) {
      var fHasNext = fast >= 0 && fast < n - 1; // fast != nil && fast.Next != nil
      steps.push({ slow: slow, fast: fast < n ? fast : -1, line: 2, vars: { slow: val(slow), fast: val(fast) }, info: fHasNext ? "fast (" + val(fast) + ") и fast.Next есть — продолжаем" : "fast или fast.Next = nil — выходим" });
      if (!fHasNext) break;
      slow++;
      steps.push({ slow: slow, fast: fast, line: 3, vars: { slow: val(slow), fast: val(fast) }, info: "slow = slow.Next → " + val(slow) + " (+1 шаг)" });
      fast += 2;
      steps.push({ slow: slow, fast: fast < n ? fast : -1, line: 4, vars: { slow: val(slow), fast: (fast < n ? val(fast) : "nil") }, info: "fast = fast.Next.Next → " + (fast < n ? val(fast) : "nil") + " (+2 шага)" });
    }
    steps.push({ slow: slow, fast: fast < n ? fast : -1, done: true, found: true, line: 6, vars: { slow: val(slow), fast: (fast < n ? val(fast) : "nil") }, info: "return slow — середина списка: " + val(slow) });
    return steps;
  }
  // Бинарный поиск — построчный (debugger) проход. mid показываем как «—» там, где
  // он ещё не вычислен в этой итерации (заголовок цикла) или уже «использован» (после сдвига).
  function bBinarySearch(arr, target) {
    var steps = [], n = arr.length, lo = 0, hi = n - 1, mid = -1;
    function vv(m) { return { left: lo, right: hi, mid: (m < 0 ? "—" : m), "arr[mid]": (m < 0 ? "—" : arr[m]), target: target }; }
    steps.push({ lo: lo, hi: hi, mid: -1, line: 1, vars: vv(-1), info: "left = 0, right = " + hi + " — ищем во всём массиве" });
    while (lo <= hi) {
      steps.push({ lo: lo, hi: hi, mid: -1, line: 2, vars: vv(-1), info: "left(" + lo + ") ≤ right(" + hi + ") — да, диапазон не пуст" });
      mid = lo + ((hi - lo) >> 1);
      steps.push({ lo: lo, hi: hi, mid: mid, line: 3, vars: vv(mid), info: "mid = left + (right−left)/2 = " + mid + " → arr[" + mid + "] = " + arr[mid] });
      if (arr[mid] === target) {
        steps.push({ lo: lo, hi: hi, mid: mid, line: 4, vars: vv(mid), info: "arr[" + mid + "] = " + arr[mid] + " == target " + target + " — да!" });
        steps.push({ lo: mid, hi: mid, mid: mid, found: true, done: true, line: 5, vars: vv(mid), info: "return " + mid + " — target найден на индексе " + mid });
        return steps;
      }
      steps.push({ lo: lo, hi: hi, mid: mid, line: 4, vars: vv(mid), info: "arr[" + mid + "] = " + arr[mid] + " ≠ target " + target + " — нет" });
      if (arr[mid] < target) {
        steps.push({ lo: lo, hi: hi, mid: mid, line: 6, vars: vv(mid), info: "arr[" + mid + "] " + arr[mid] + " < target " + target + " — да, target правее" });
        lo = mid + 1;
        steps.push({ lo: lo, hi: hi, mid: -1, line: 7, vars: vv(-1), info: "left = mid+1 = " + lo + " — отбросили левую половину" });
      } else {
        steps.push({ lo: lo, hi: hi, mid: mid, line: 6, vars: vv(mid), info: "arr[" + mid + "] " + arr[mid] + " < target " + target + " — нет (больше) → else" });
        hi = mid - 1;
        steps.push({ lo: lo, hi: hi, mid: -1, line: 9, vars: vv(-1), info: "right = mid−1 = " + hi + " — отбросили правую половину" });
      }
    }
    steps.push({ lo: 0, hi: -1, mid: -1, line: 2, vars: vv(-1), info: "left(" + lo + ") ≤ right(" + hi + ") — нет, диапазон пуст" });
    steps.push({ lo: 0, hi: -1, mid: -1, done: true, line: 12, vars: vv(-1), info: "return −1 — target " + target + " в массиве нет" });
    return steps;
  }
  // Бинарный поиск ПЕРВОГО вхождения — построчный (debugger) проход:
  // при равенстве запоминаем res и продолжаем ВЛЕВО (right = mid−1).
  function bBinarySearchFirst(arr, target) {
    var steps = [], n = arr.length, lo = 0, hi = n - 1, res = -1, mid = -1;
    function vv(m) { return { left: lo, right: hi, mid: (m < 0 ? "—" : m), "arr[mid]": (m < 0 ? "—" : arr[m]), res: res }; }
    steps.push({ lo: lo, hi: hi, mid: -1, line: 1, vars: vv(-1), info: "left = 0, right = " + hi + ", res = −1 (ответа пока нет)" });
    while (lo <= hi) {
      steps.push({ lo: lo, hi: hi, mid: -1, line: 2, vars: vv(-1), info: "left(" + lo + ") ≤ right(" + hi + ") — да, диапазон не пуст" });
      mid = lo + ((hi - lo) >> 1);
      steps.push({ lo: lo, hi: hi, mid: mid, line: 3, vars: vv(mid), info: "mid = " + mid + " → arr[" + mid + "] = " + arr[mid] });
      if (arr[mid] === target) {
        steps.push({ lo: lo, hi: hi, mid: mid, line: 4, vars: vv(mid), info: "arr[" + mid + "] = " + arr[mid] + " == target " + target + " — да" });
        res = mid;
        steps.push({ lo: lo, hi: hi, mid: mid, line: 5, vars: vv(mid), info: "res = mid = " + mid + " — запомнили, но ищем ЛЕВЕЕ ранее вхождение" });
        hi = mid - 1;
        steps.push({ lo: lo, hi: hi, mid: -1, line: 6, vars: vv(-1), info: "right = mid−1 = " + hi + " — сдвигаем правую границу влево" });
      } else if (arr[mid] < target) {
        steps.push({ lo: lo, hi: hi, mid: mid, line: 7, vars: vv(mid), info: "arr[" + mid + "] " + arr[mid] + " < target " + target + " — да, target правее" });
        lo = mid + 1;
        steps.push({ lo: lo, hi: hi, mid: -1, line: 8, vars: vv(-1), info: "left = mid+1 = " + lo });
      } else {
        steps.push({ lo: lo, hi: hi, mid: mid, line: 7, vars: vv(mid), info: "arr[" + mid + "] " + arr[mid] + " < target " + target + " — нет (больше) → else" });
        hi = mid - 1;
        steps.push({ lo: lo, hi: hi, mid: -1, line: 10, vars: vv(-1), info: "right = mid−1 = " + hi });
      }
    }
    steps.push({ lo: lo, hi: hi, mid: -1, line: 2, vars: vv(-1), info: "left(" + lo + ") ≤ right(" + hi + ") — нет, диапазон пуст" });
    if (res >= 0) steps.push({ lo: res, hi: res, mid: res, found: true, done: true, line: 13, vars: { left: lo, right: hi, mid: res, "arr[mid]": arr[res], res: res }, info: "return res = " + res + " — первое вхождение " + target + " на индексе " + res });
    else steps.push({ lo: 0, hi: -1, mid: -1, done: true, line: 13, vars: vv(-1), info: "return res = −1 — target " + target + " в массиве нет" });
    return steps;
  }
  // Дерево Фенвика: prefixSum(target) как сумма «зон ответственности» BIT-узлов.
  // Fenwick (BIT) PrefixSum — построчный (debugger) проход; зона узла подсвечивается на массиве.
  function bFenwick(arr, target) {
    var steps = [], i = target + 1, sum = 0; // 1-индексация внутри
    function push(o) { steps.push({ lo: (o.lo == null ? -1 : o.lo), hi: (o.hi == null ? -1 : o.hi), line: o.line, vars: { i: (o.i == null ? "—" : o.i), range: (o.range || "—"), sum: sum }, info: o.info, done: o.done, found: o.found }); }
    push({ line: 1, info: "sum = 0; i = " + (target + 1) + " (внутри BIT 1-индексация для PrefixSum(0.." + target + "))" });
    var guard = 0;
    while (i > 0 && guard++ < 64) {
      push({ line: 2, i: i, info: "i = " + i + " > 0 — продолжаем подъём по BIT" });
      var low = i & (-i), lo0 = i - low, hi0 = i - 1, partial = 0;
      for (var k = lo0; k <= hi0; k++) partial += arr[k];
      sum += partial;
      push({ line: 3, lo: lo0, hi: hi0, i: i, range: "[" + lo0 + ".." + hi0 + "]", info: "sum += tree[" + i + "] = сумма arr[" + lo0 + ".." + hi0 + "] = " + partial + " → итог " + sum });
      var oldi = i; i -= low;
      push({ line: 4, lo: lo0, hi: hi0, i: i, range: "[" + lo0 + ".." + hi0 + "]", info: "i −= i&(−i) = " + oldi + " − " + low + " = " + i + " (переход к родителю)" });
    }
    push({ line: 2, i: 0, info: "i = 0 — цикл завершён" });
    push({ line: 6, lo: 0, hi: target, done: true, found: true, range: "[0.." + target + "]", info: "return sum = " + sum + " — PrefixSum(0.." + target + ")" });
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
    // Построчный (debugger) проход рекурсии запроса. segViz красит узлы по nodeState/nodeStep,
    // текущий узел — по s.cur.
    function push(o) { steps.push({ cur: (o.cur == null ? -1 : o.cur), line: o.line, vars: { node: (o.node || "—"), nodeSum: (o.nodeSum == null ? "—" : o.nodeSum), total: total }, info: o.info, done: o.done, found: o.found }); }
    function lbl(nd) { return "[" + nd.lo + "," + nd.hi + "]"; }
    (function q(id) {
      var nd = nodes[id], L = lbl(nd);
      push({ line: 1, cur: id, node: L, nodeSum: nd.sum, info: L + ": вне запроса? (hi<ql или qr<lo)" });
      if (nd.hi < ql || qr < nd.lo) { nodeState[id] = "skip"; nodeStep[id] = steps.length; push({ line: 2, cur: id, node: L, nodeSum: nd.sum, info: L + " вне [" + ql + "," + qr + "] → return 0 (пропуск)" }); return; }
      push({ line: 4, cur: id, node: L, nodeSum: nd.sum, info: L + ": целиком внутри запроса? (ql≤lo и hi≤qr)" });
      if (ql <= nd.lo && nd.hi <= qr) { total += nd.sum; nodeState[id] = "take"; nodeStep[id] = steps.length; push({ line: 5, cur: id, node: L, nodeSum: nd.sum, info: L + " целиком внутри → return сумма " + nd.sum + " (итог " + total + ")" }); return; }
      nodeState[id] = "split"; nodeStep[id] = steps.length;
      push({ line: 7, cur: id, node: L, nodeSum: nd.sum, info: L + " пересекает частично → mid, спускаемся к детям" });
      push({ line: 8, cur: id, node: L, nodeSum: nd.sum, info: "Query(левый ребёнок " + lbl(nodes[nd.left]) + ")" });
      q(nd.left);
      push({ line: 9, cur: id, node: L, nodeSum: nd.sum, info: "Query(правый ребёнок " + lbl(nodes[nd.right]) + ")" });
      q(nd.right);
    })(0);
    push({ line: 5, cur: -1, done: true, found: true, node: "[" + ql + "," + qr + "]", info: "Сумма на [" + ql + "," + qr + "] = " + total });
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
        c.classList.toggle("algo-tp__tnode--current", id === s.cur);
      });
    };
  }
  // MST (алгоритм Краскала): рёбра add/skip + Union-Find.
  // MST (Краскал) — построчный (debugger) проход; рисует mstViz (рёбра add/skip/cur через
  // edgeStep/edgeState/_i). Каждый кадр несёт снимок parent[] — его рисует панель Union-Find.
  function bMstKruskal(labels, edges) {
    var n = labels.length;
    var sorted = edges.slice().sort(function (a, b) { return a.w - b.w; });
    var parent = labels.map(function (_, i) { return i; });
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    var total = 0, edgeStep = edges.map(function () { return -1; }), edgeState = edges.map(function () { return ""; }), steps = [];
    function push(o) { steps.push({ line: o.line, vars: { "ребро": (o.e || "—"), "вес": (o.w == null ? "—" : o.w), "вес MST": total }, parent: parent.slice(), roots: o.roots || null, merged: !!o.merged, info: o.info, done: o.done, found: o.found }); }
    push({ line: 1, info: "Рёбра отсортированы по возрастанию веса: " + sorted.map(function (e) { return labels[e.u] + "–" + labels[e.v] + ":" + e.w; }).join(", ") });
    push({ line: 2, info: "Union-Find: каждая вершина — своя компонента (parent[i] = i)" });
    push({ line: 3, info: "total = 0 — суммарный вес остова" });
    sorted.forEach(function (e) {
      var ei = edges.indexOf(e), el = labels[e.u] + "–" + labels[e.v];
      push({ line: 4, e: el, w: e.w, info: "берём следующее лёгкое ребро " + el + " (вес " + e.w + ")" });
      var ru = find(e.u), rv = find(e.v), diff = ru !== rv;
      if (diff) {
        parent[ru] = rv; total += e.w;
        edgeState[ei] = "add"; edgeStep[ei] = steps.length;
        push({ line: 5, e: el, w: e.w, roots: [e.u, e.v], merged: true, info: "find(" + labels[e.u] + ")=" + labels[ru] + " ≠ find(" + labels[e.v] + ")=" + labels[rv] + " → разные компоненты, Union объединяет их" });
        push({ line: 6, e: el, w: e.w, info: "total += " + e.w + " = " + total + " — ребро " + el + " взято в MST" });
      } else {
        edgeState[ei] = "skip"; edgeStep[ei] = steps.length;
        push({ line: 5, e: el, w: e.w, roots: [e.u, e.v], merged: false, info: "find(" + labels[e.u] + ") = find(" + labels[e.v] + ") = " + labels[ru] + " → одна компонента: ребро замкнуло бы цикл" });
        push({ line: 7, e: el, w: e.w, info: "пропускаем " + el + " (создало бы цикл)" });
      }
    });
    push({ line: 9, done: true, found: true, info: "return total = " + total + " — вес минимального остовного дерева" });
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
  // Дейкстра — построчный (debugger) проход; граф рисует dijkstraViz (читает dist/settled/cur/edge).
  function bDijkstra(labels, edges, start) {
    var n = labels.length;
    var adj = labels.map(function () { return []; });
    edges.forEach(function (e) { adj[e.u].push({ to: e.v, w: e.w }); });
    var INF = Infinity;
    var dist = new Array(n).fill(INF), settled = new Array(n).fill(false), pq = [], steps = [];
    if (isNaN(start) || start < 0 || start >= n) start = 0;
    function disp(v) { return v === INF ? "∞" : v; }
    function distSnap() { return dist.map(disp); }
    function pqLabel() { return pq.length ? "[" + pq.slice().sort(function (a, b) { return a.d - b.d; }).map(function (x) { return labels[x.node] + ":" + x.d; }).join(", ") + "]" : "∅"; }
    function push(o) {
      steps.push({
        dist: distSnap(), settled: settled.slice(), pq: pq.map(function (x) { return { node: x.node, d: x.d }; }), cur: (o.cur == null ? -1 : o.cur), edge: (o.edge || null), line: o.line,
        vars: { "u": o.u || "—", "dist[u]": (o.du == null ? "—" : o.du), "очередь": pqLabel(), "ребро": o.el || "—", "dist[v]": o.dv || "—" },
        info: o.info, done: o.done, found: o.found
      });
    }
    dist[start] = 0;
    push({ line: 1, info: "dist[] = ∞ для всех, dist[" + labels[start] + "] = 0" });
    pq.push({ node: start, d: 0 });
    push({ line: 2, info: "pq := {" + labels[start] + ":0} — источник в мин-кучу" });
    var guard = 0, lim = 6 * (n + edges.length) + 40;
    while (pq.length && guard++ < lim) {
      push({ line: 3, info: "pq.Len() = " + pq.length + " > 0 — да, продолжаем" });
      var mi = 0; for (var i = 1; i < pq.length; i++) if (pq[i].d < pq[mi].d) mi = i;
      var top = pq.splice(mi, 1)[0], u = top.node;
      push({ line: 4, cur: u, u: labels[u], du: disp(dist[u]), info: "u = PopMin() = " + labels[u] + " (оценка " + top.d + ") — ближайшая в очереди" });
      if (top.d > dist[u]) {
        push({ line: 5, u: labels[u], du: disp(dist[u]), info: "оценка " + top.d + " > dist[" + labels[u] + "] = " + disp(dist[u]) + " → устаревшая запись, continue" });
        continue;
      }
      settled[u] = true;
      push({ line: 5, cur: u, u: labels[u], du: disp(dist[u]), info: "оценка " + top.d + " ≤ dist[" + labels[u] + "] → запись актуальна, " + labels[u] + " финализирована" });
      adj[u].forEach(function (e) {
        var v = e.to, old = dist[v], nd = dist[u] + e.w, improved = nd < old, el = labels[u] + "→" + labels[v] + " (" + e.w + ")";
        push({ line: 6, cur: u, edge: [u, v], u: labels[u], du: disp(dist[u]), el: el, info: "ребро " + labels[u] + "→" + labels[v] + " (вес " + e.w + ")" });
        push({ line: 7, cur: u, edge: [u, v], u: labels[u], du: disp(dist[u]), el: el, dv: disp(dist[u]) + "+" + e.w + "=" + nd + (improved ? " < " : " ≥ ") + disp(old), info: "nd = " + disp(dist[u]) + "+" + e.w + " = " + nd + (improved ? " < " : " ≥ ") + "dist[" + labels[v] + "] = " + disp(old) + (improved ? " — короче!" : " — не короче") });
        if (improved) {
          dist[v] = nd;
          push({ line: 8, cur: u, edge: [u, v], u: labels[u], du: disp(dist[u]), el: el, dv: disp(old) + " → " + nd, info: "dist[" + labels[v] + "] = " + nd + " — обновили расстояние" });
          pq.push({ node: v, d: nd });
          push({ line: 9, cur: u, edge: [u, v], u: labels[u], du: disp(dist[u]), el: el, dv: nd, info: "pq.Push(" + labels[v] + ", " + nd + ") → " + pqLabel() });
        }
      });
    }
    push({ line: 3, info: "pq.Len() = 0 — очередь пуста, цикл завершён" });
    push({ line: 13, done: true, found: true, info: "return dist — кратчайшие расстояния: " + labels.map(function (l, i) { return l + ":" + disp(dist[i]); }).join(", ") });
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
  // Беллман–Форд — построчный (debugger) проход; граф рисует dijkstraViz, dist[] — панель.
  function bBellmanFord(labels, edges, start) {
    var n = labels.length, INF = Infinity, dist = new Array(n).fill(INF), steps = [];
    if (isNaN(start) || start < 0 || start >= n) start = 0;
    function disp(v) { return v === INF ? "∞" : v; }
    function distSnap() { return dist.map(disp); }
    function reached() { return dist.map(function (d) { return d < INF; }); }
    function push(o) {
      steps.push({
        dist: distSnap(), settled: reached(), cur: (o.cur == null ? -1 : o.cur), edge: (o.edge || null), chg: (o.chg == null ? -1 : o.chg), line: o.line,
        vars: { "проход": o.pass || "—", "ребро": o.el || "—", "dist[u]": (o.du == null ? "—" : o.du), "dist[v]": (o.dv == null ? "—" : o.dv), "релаксация": o.rx || "—" },
        info: o.info, done: o.done, found: o.found
      });
    }
    dist[start] = 0;
    push({ line: 1, cur: start, du: "0", info: "dist[" + labels[start] + "] = 0, остальные ∞. Делаем V−1 = " + (n - 1) + " проходов по всем рёбрам" });
    for (var pass = 1; pass <= n - 1; pass++) {
      var pl = pass + " из " + (n - 1);
      push({ line: 2, pass: pl, info: "Проход " + pass + " из " + (n - 1) + ": перебираем ВСЕ рёбра и пробуем укоротить пути" });
      edges.forEach(function (e) {
        var u = e.u, v = e.v, w = e.w, old = dist[v], el = labels[u] + "→" + labels[v] + " (" + w + ")";
        push({ line: 3, pass: pl, cur: u, edge: [u, v], el: el, du: disp(dist[u]), dv: disp(old), info: "ребро " + el });
        var relax = dist[u] !== INF && dist[u] + w < old;
        push({ line: 4, pass: pl, cur: u, edge: [u, v], el: el, du: disp(dist[u]), dv: disp(old), rx: relax ? "да" : "нет", info: dist[u] === INF ? "dist[" + labels[u] + "] = ∞ — из " + labels[u] + " ещё не дошли, пропуск" : (relax ? disp(dist[u]) + "+" + w + " = " + (dist[u] + w) + " < " + disp(old) + " — короче!" : disp(dist[u]) + "+" + w + " = " + (dist[u] + w) + " ≥ " + disp(old) + " — не короче") });
        if (relax) {
          dist[v] = dist[u] + w;
          push({ line: 5, pass: pl, cur: u, edge: [u, v], chg: v, el: el, du: disp(dist[u]), dv: disp(old) + " → " + dist[v], rx: "да", info: "dist[" + labels[v] + "] = " + dist[v] + " — релаксация" });
        }
      });
    }
    push({ line: 9, pass: "V-й (детектор)", info: "V-й проход — детектор: если что-то ещё улучшается, есть отрицательный цикл" });
    var neg = false, negEdge = null;
    for (var k = 0; k < edges.length && !neg; k++) {
      var e = edges[k], el = labels[e.u] + "→" + labels[e.v] + " (" + e.w + ")";
      push({ line: 10, pass: "V-й (детектор)", cur: e.u, edge: [e.u, e.v], el: el, du: disp(dist[e.u]), dv: disp(dist[e.v]), info: "ребро " + el + ": ещё можно укоротить?" });
      if (dist[e.u] !== INF && dist[e.u] + e.w < dist[e.v]) { neg = true; negEdge = [e.u, e.v]; }
    }
    if (neg) push({ line: 11, pass: "V-й (детектор)", edge: negEdge, done: true, found: false, rx: "ещё да!", info: "Расстояние всё ещё улучшается → ОТРИЦАТЕЛЬНЫЙ ЦИКЛ, кратчайших путей нет" });
    else push({ line: 14, pass: "V-й (детектор)", done: true, found: true, rx: "нет", info: "Ничего не улучшилось → цикла нет. Кратчайшие: " + labels.map(function (l, i) { return l + ":" + disp(dist[i]); }).join(", ") });
    steps.forEach(function (s, i) { s._i = i; });
    return { labels: labels, edges: edges, steps: steps };
  }

  // Жадный Jump Game: ведём самую дальнюю достижимую позицию.
  // Jump Game — построчный (debugger) проход; maxReach — самая дальняя достижимая позиция.
  function bJump(arr) {
    var n = arr.length, steps = [], maxReach = 0;
    function H() { return Math.min(maxReach, n - 1); }
    function vv(i) { return { i: (i < 0 ? "—" : i), "nums[i]": (i >= 0 && i < n ? arr[i] : "—"), maxReach: maxReach }; }
    steps.push({ lo: 0, hi: H(), mid: -1, line: 1, vars: vv(-1), info: "maxReach = 0 — пока достижим только старт" });
    for (var i = 0; i < n; i++) {
      steps.push({ lo: 0, hi: H(), mid: i, line: 2, vars: vv(i), info: "i = " + i + ", nums[" + i + "] = " + arr[i] });
      var unreachable = i > maxReach;
      steps.push({ lo: 0, hi: H(), mid: i, line: 3, vars: vv(i), info: "i(" + i + ") " + (unreachable ? "> " : "≤ ") + "maxReach(" + maxReach + ")" + (unreachable ? " — сюда не допрыгнуть" : " — индекс достижим") });
      if (unreachable) {
        steps.push({ lo: 0, hi: H(), mid: i, done: true, line: 4, vars: vv(i), info: "return false — индекс " + i + " недостижим (maxReach=" + maxReach + ")" });
        return steps;
      }
      var better = i + arr[i] > maxReach;
      steps.push({ lo: 0, hi: H(), mid: i, line: 6, vars: vv(i), info: "i+nums[i] = " + i + "+" + arr[i] + " = " + (i + arr[i]) + (better ? " > " : " ≤ ") + "maxReach " + maxReach + (better ? " — да" : " — нет") });
      if (better) {
        maxReach = i + arr[i];
        steps.push({ lo: 0, hi: H(), mid: i, line: 7, vars: vv(i), info: "maxReach = i+nums[i] = " + maxReach + (maxReach >= n - 1 ? " — конец достижим!" : "") });
      }
    }
    steps.push({ lo: 0, hi: n - 1, found: true, done: true, line: 10, vars: vv(-1), info: "return true — последний индекс достижим, можно допрыгнуть!" });
    return steps;
  }
  // Backtracking: все подмножества (выбрать → рекурсия → откат).
  // Подмножества (backtracking) — построчный (debugger) проход; current/results рисует subsetsViz.
  // step.action (record/choose/back) использует viz; vars — английские (action/cur/count).
  function bSubsets(set) {
    var n = set.length, steps = [], result = [], current = [];
    function vv(action) { return { action: action, cur: "[" + current.join(",") + "]", count: result.length }; }
    function snap(extra) { var s = { current: current.slice(), results: result.map(function (x) { return x.slice(); }) }; for (var k in extra) s[k] = extra[k]; steps.push(s); }
    (function bt(start) {
      result.push(current.slice());
      snap({ action: "record", line: 5, vars: vv("записать [" + current.join(",") + "]"), info: "res = append(res, cur) → записали подмножество [" + current.join(", ") + "]" });
      for (var i = start; i < n; i++) {
        snap({ action: "loop", pick: i, line: 6, vars: vv("i = " + i), info: "i = " + i + ": рассматриваем элемент " + set[i] });
        current.push(set[i]);
        snap({ action: "choose", pick: i, line: 7, vars: vv("выбрать " + set[i]), info: "cur = append(cur, " + set[i] + ") → берём " + set[i] });
        snap({ action: "recurse", pick: i, line: 8, vars: vv("bt(" + (i + 1) + ")"), info: "bt(" + (i + 1) + ") — спускаемся в рекурсию" });
        bt(i + 1);
        current.pop();
        snap({ action: "back", pick: i, line: 9, vars: vv("откат " + set[i]), info: "cur = cur[:len−1] → откат, убираем " + set[i] });
      }
    })(0);
    snap({ done: true, found: true, line: 13, vars: vv("готово"), info: "Готово: собрано " + result.length + " подмножеств" });
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
  // BFS графа — построчный (debugger) проход; граф рисует graphViz (читает current/visited).
  function bGraphBfs(labels, edges, start) {
    var n = labels.length, adj = labels.map(function () { return []; });
    edges.forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
    var visited = new Array(n).fill(false), queue = [start], order = [], steps = [];
    function qLabels() { return queue.length ? "[" + queue.map(function (x) { return labels[x]; }).join(", ") + "]" : "[]"; }
    function ordLabels() { return order.length ? order.map(function (x) { return labels[x]; }).join(" → ") : "—"; }
    function push(line, cur, info) { steps.push({ current: cur, visited: visited.slice(), queue: queue.slice(), line: line, vars: { "узел": (cur < 0 ? "—" : labels[cur]), "очередь": qLabels(), "порядок": ordLabels() }, info: info }); }
    push(1, -1, "visited := make([]bool) — все вершины пока не посещены");
    push(2, start, "queue := [" + labels[start] + "] — кладём стартовую вершину в очередь");
    visited[start] = true;
    push(3, start, "visited[" + labels[start] + "] = true — помечаем старт сразу");
    push(4, start, "order — список порядка обхода (пока пуст)");
    while (queue.length) {
      push(5, -1, "len(queue) = " + queue.length + " > 0 — да, продолжаем");
      var node = queue[0];
      push(6, node, "node = queue[0] = " + labels[node] + " — берём из начала очереди");
      queue.shift();
      push(7, node, "queue = queue[1:] — убрали " + labels[node] + ", очередь " + qLabels());
      order.push(node);
      push(8, node, "order = append(order, " + labels[node] + ") → " + ordLabels());
      adj[node].forEach(function (nb) {
        push(9, node, "перебираем соседей " + labels[node] + ": сосед " + labels[nb]);
        var unseen = !visited[nb];
        push(10, node, "visited[" + labels[nb] + "] = " + (!unseen) + (unseen ? " → не посещён, добавим" : " → уже посещён, пропускаем"));
        if (unseen) {
          visited[nb] = true;
          push(11, node, "visited[" + labels[nb] + "] = true — помечаем соседа " + labels[nb]);
          queue.push(nb);
          push(12, node, "queue = append(queue, " + labels[nb] + ") → " + qLabels());
        }
      });
    }
    push(5, -1, "len(queue) = 0 — очередь пуста, цикл завершён");
    steps.push({ current: -1, visited: visited.slice(), done: true, found: true, line: 16, vars: { "узел": "—", "очередь": "[]", "порядок": ordLabels() }, info: "return order — BFS-порядок: " + ordLabels() });
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

  // BFS по сетке — построчный (debugger) проход; рисует gridViz (visitStep[][] = кадр
  // ПЕРВОГО открытия клетки, чтобы окраска «посещено» не сбивалась). Очередь — панель.
  function bGridBfs(grid) {
    var R = grid.length, C = grid[0].length, dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var dist = Array.from({ length: R }, function () { return new Array(C).fill(-1); });
    var visitStep = Array.from({ length: R }, function () { return new Array(C).fill(-1); });
    var steps = [], q = [], visitedCount = 0;
    function qSnap() { return q.map(function (c) { return [c[0], c[1], dist[c[0]][c[1]]]; }); }
    function vv(cell, d) { return { "клетка": (cell ? "(" + cell[0] + "," + cell[1] + ")" : "—"), "расстояние": (d == null ? "—" : d), "посещено": visitedCount }; }
    function push(o) { steps.push({ cur: o.cur || null, queue: qSnap(), line: o.line, vars: vv(o.cur, o.d), info: o.info, done: o.done, found: o.found }); }
    function fin() { steps.forEach(function (s, i) { s._i = i; }); return { steps: steps, visitStep: visitStep, grid: grid, R: R, C: C }; }
    if (grid[0][0] === 1 || grid[R - 1][C - 1] === 1) { push({ done: true, line: 16, info: "Старт или цель — препятствие, пути нет (return -1)" }); return fin(); }
    push({ line: 2, info: "dist[][] = -1 (не посещено) для всех клеток" });
    dist[0][0] = 0; visitedCount = 1; q.push([0, 0]); visitStep[0][0] = steps.length;
    push({ cur: [0, 0], d: 0, line: 3, info: "queue := {(0,0)} — старт в очередь" });
    push({ cur: [0, 0], d: 0, line: 4, info: "dist[0][0] = 0 — расстояние до старта" });
    var guard = 0, lim = R * C * 8 + 20;
    while (q.length && guard++ < lim) {
      push({ line: 5, info: "len(queue) = " + q.length + " > 0 — да, продолжаем" });
      var cell = q.shift(), r = cell[0], c = cell[1], cd = dist[r][c];
      push({ cur: [r, c], d: cd, line: 6, info: "(r,c) = pop() = (" + r + "," + c + "), dist = " + cd });
      if (r === R - 1 && c === C - 1) { push({ cur: [r, c], d: cd, done: true, found: true, line: 7, info: "(" + r + "," + c + ") — это цель! return dist = " + cd }); return fin(); }
      push({ cur: [r, c], d: cd, line: 7, info: "(" + r + "," + c + ") — не цель, раскрываем 4 соседей" });
      for (var di = 0; di < dirs.length; di++) {
        var nr = r + dirs[di][0], nc = c + dirs[di][1];
        push({ cur: [r, c], d: cd, line: 9, info: "сосед (" + nr + "," + nc + ")" });
        var free = nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 0 && dist[nr][nc] < 0;
        push({ cur: [r, c], d: cd, line: 10, info: free ? "(" + nr + "," + nc + ") свободна и не посещена → берём" : "(" + nr + "," + nc + ") вне поля / стена / уже посещена → пропуск" });
        if (free) {
          dist[nr][nc] = cd + 1; visitedCount++; visitStep[nr][nc] = steps.length;
          push({ cur: [r, c], d: cd, line: 11, info: "dist[" + nr + "][" + nc + "] = " + dist[nr][nc] + " — открыли клетку" });
          q.push([nr, nc]);
          push({ cur: [r, c], d: cd, line: 12, info: "queue = append((" + nr + "," + nc + ")) — в конец очереди" });
        }
      }
    }
    push({ done: true, line: 16, info: "Очередь пуста, до цели не дошли — return -1" });
    return fin();
  }
  function gridViz(panel, ctx) {
    var grid = ctx.grid, R = ctx.R, C = ctx.C, visitStep = ctx.visitStep;
    var wrap = document.createElement("div"); wrap.className = "algo-viz__grid"; wrap.style.gridTemplateColumns = "repeat(" + C + ", 2.7em)";
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
  // A* — построчный (debugger) проход; рисует aStarViz (open/closed/cur/f/path).
  // open — панель открытого списка (мин-куча по f). closed ставим на строке 6 (как в коде).
  function bAStar(grid) {
    var R = grid.length, C = grid[0].length, dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var goal = [R - 1, C - 1], INF = Infinity;
    function h(r, c) { return Math.abs(r - goal[0]) + Math.abs(c - goal[1]); }
    function key(r, c) { return r + "," + c; }
    function disp(v) { return v === INF ? "∞" : v; }
    var g = [], f = [], came = [];
    for (var i = 0; i < R; i++) { g.push(new Array(C).fill(INF)); f.push(new Array(C).fill(INF)); came.push(new Array(C).fill(null)); }
    function snap(a) { return a.map(function (row) { return row.slice(); }); }
    var open = {}, closed = {}, steps = [];
    function openKeys() { return Object.keys(open); }
    function toArr(obj) { return Object.keys(obj).map(function (k) { var p = k.split(","); return [+p[0], +p[1]]; }); }
    function push(o) { steps.push({ cur: o.cur || null, nb: o.nb || null, g: snap(g), f: snap(f), open: toArr(open), closed: toArr(closed), path: o.path || null, line: o.line, vars: { "клетка": o.cell || "—", "g": (o.g == null ? "—" : o.g), "h": (o.h == null ? "—" : o.h), "f": (o.f == null ? "—" : o.f), "открытых": openKeys().length }, info: o.info, done: o.done, found: o.found }); }
    function fin() { steps.forEach(function (s, k) { s._i = k; }); return { grid: grid, R: R, C: C, goal: goal, steps: steps }; }
    if (grid[0][0] === 1 || grid[R - 1][C - 1] === 1) { push({ line: 15, done: true, found: false, info: "Старт или цель — стена, пути нет (return -1)" }); return fin(); }
    open[key(0, 0)] = true; f[0][0] = h(0, 0);
    push({ cur: [0, 0], cell: "(0,0)", h: h(0, 0), f: h(0, 0), line: 1, info: "open := {старт (0,0)} с f = h = " + h(0, 0) + " — мин-куча по f" });
    g[0][0] = 0; f[0][0] = h(0, 0);
    push({ cur: [0, 0], cell: "(0,0)", g: 0, h: h(0, 0), f: f[0][0], line: 2, info: "g[старт] = 0" });
    var guard = 0, lim = R * C * 10 + 30;
    while (openKeys().length && guard++ < lim) {
      push({ line: 3, info: "open.Len() = " + openKeys().length + " > 0 — да, продолжаем" });
      var best = null, bf = INF, bh = INF;
      openKeys().forEach(function (k) { var p = k.split(","), r = +p[0], c = +p[1]; if (f[r][c] < bf || (f[r][c] === bf && h(r, c) < bh)) { bf = f[r][c]; bh = h(r, c); best = [r, c]; } });
      var r = best[0], c = best[1];
      delete open[key(r, c)];
      push({ cur: [r, c], cell: "(" + r + "," + c + ")", g: g[r][c], h: h(r, c), f: f[r][c], line: 4, info: "cur = PopMin() = (" + r + "," + c + ") — минимальная f = " + f[r][c] });
      if (r === goal[0] && c === goal[1]) {
        var path = [], cr = r, cc = c;
        while (cr !== null && cc !== null) { path.unshift([cr, cc]); var pc = came[cr][cc]; if (!pc) break; cr = pc[0]; cc = pc[1]; }
        closed[key(r, c)] = true;
        push({ cur: [r, c], cell: "(" + r + "," + c + ")", g: g[r][c], h: 0, f: f[r][c], path: path, done: true, found: true, line: 5, info: "cur == goal → путь найден! Длина = " + g[r][c] });
        return fin();
      }
      push({ cur: [r, c], cell: "(" + r + "," + c + ")", g: g[r][c], h: h(r, c), f: f[r][c], line: 5, info: "(" + r + "," + c + ") — не цель" });
      closed[key(r, c)] = true;
      push({ cur: [r, c], cell: "(" + r + "," + c + ")", g: g[r][c], h: h(r, c), f: f[r][c], line: 6, info: "closed[(" + r + "," + c + ")] = true — клетка раскрыта" });
      for (var di = 0; di < dirs.length; di++) {
        var nr = r + dirs[di][0], nc = c + dirs[di][1], nlbl = "(" + nr + "," + nc + ")";
        push({ cur: [r, c], nb: [nr, nc], cell: nlbl, g: g[r][c], h: h(r, c), f: f[r][c], line: 7, info: "сосед " + nlbl });
        var blocked = nr < 0 || nr >= R || nc < 0 || nc >= C || grid[nr][nc] === 1 || closed[key(nr, nc)];
        push({ cur: [r, c], nb: [nr, nc], cell: nlbl, g: g[r][c], h: h(r, c), f: f[r][c], line: 8, info: blocked ? nlbl + " — вне поля / стена / уже закрыта → continue" : nlbl + " проходима и открыта для улучшения" });
        if (blocked) continue;
        var t = g[r][c] + 1, better = t < g[nr][nc];
        push({ cur: [r, c], nb: [nr, nc], cell: nlbl, g: disp(t), h: h(nr, nc), f: disp(g[nr][nc] === INF ? INF : g[nr][nc] + h(nr, nc)), line: 9, info: "t = g[cur]+1 = " + t + (better ? " < " : " ≥ ") + "g[сосед] = " + disp(g[nr][nc]) + (better ? " — короче!" : " — не короче") });
        if (better) {
          came[nr][nc] = [r, c]; g[nr][nc] = t;
          push({ cur: [r, c], nb: [nr, nc], cell: nlbl, g: t, h: h(nr, nc), f: disp(t + h(nr, nc)), line: 10, info: "g[" + nlbl + "] = " + t });
          f[nr][nc] = t + h(nr, nc); open[key(nr, nc)] = true;
          push({ cur: [r, c], nb: [nr, nc], cell: nlbl, g: t, h: h(nr, nc), f: f[nr][nc], line: 11, info: "open.Push с f = g+h = " + t + "+" + h(nr, nc) + " = " + f[nr][nc] });
        }
      }
    }
    push({ line: 15, done: true, found: false, info: "Открытый список пуст — до цели не добраться (return -1)" });
    return fin();
  }
  function aStarViz(panel, ctx) {
    var R = ctx.R, C = ctx.C, grid = ctx.grid;
    var wrap = document.createElement("div"); wrap.className = "algo-viz__grid"; wrap.style.gridTemplateColumns = "repeat(" + C + ", 2.7em)";
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

  // Топосорт (Кан) — построчный (debugger) проход с явной очередью; рисует topoViz
  // (читает removed[]/cur/deg[]). В очереди — вершины с текущей входящей степенью 0.
  function bTopoKahn(labels, edges) {
    var n = labels.length, adj = labels.map(function () { return []; }), indeg = new Array(n).fill(0);
    edges.forEach(function (e) { adj[e[0]].push(e[1]); indeg[e[1]]++; });
    var deg = indeg.slice(), removed = new Array(n).fill(false), order = [], queue = [], steps = [];
    function qLabels() { return queue.length ? "[" + queue.map(function (x) { return labels[x]; }).join(", ") + "]" : "[]"; }
    function ordLabels() { return order.length ? order.map(function (x) { return labels[x]; }).join(" → ") : "—"; }
    function push(line, cur, info) { steps.push({ removed: removed.slice(), deg: deg.slice(), queue: queue.slice(), cur: cur, line: line, vars: { "узел": (cur < 0 ? "—" : labels[cur]), "входящая 0": qLabels(), "порядок": ordLabels() }, info: info }); }
    push(1, -1, "indeg — входящие степени всех вершин посчитаны");
    for (var v0 = 0; v0 < n; v0++) if (deg[v0] === 0) queue.push(v0);
    push(2, -1, "queue := вершины с входящей степенью 0 → " + qLabels());
    push(3, -1, "order — топологический порядок (пока пуст)");
    var guard = 0;
    while (queue.length && guard++ < n + 5) {
      push(4, -1, "len(queue) = " + queue.length + " > 0 — да, продолжаем");
      var u = queue[0]; queue.shift();
      removed[u] = true;
      push(5, u, "u = queue[0] = " + labels[u] + " — извлекли из очереди");
      order.push(u);
      push(6, u, "order = append(order, " + labels[u] + ") → " + ordLabels());
      adj[u].forEach(function (w) {
        push(7, u, "ребро " + labels[u] + " → " + labels[w] + ": сосед " + labels[w]);
        deg[w]--;
        push(8, u, "indeg[" + labels[w] + "]-- → " + deg[w] + " (убрали ребро от " + labels[u] + ")");
        var zero = deg[w] === 0;
        if (zero) { queue.push(w); push(9, u, "indeg[" + labels[w] + "] == 0 → queue = append(queue, " + labels[w] + ") → " + qLabels()); }
        else push(9, u, "indeg[" + labels[w] + "] = " + deg[w] + " ≠ 0 — пока не готова");
      });
    }
    push(4, -1, "len(queue) = 0 — очередь пуста, цикл завершён");
    if (order.length === n) steps.push({ removed: removed.slice(), deg: deg.slice(), cur: -1, done: true, found: true, line: 12, vars: { "узел": "—", "входящая 0": "[]", "порядок": ordLabels() }, info: "return order — топологический порядок: " + ordLabels() });
    else steps.push({ removed: removed.slice(), deg: deg.slice(), cur: -1, done: true, line: 12, vars: { "узел": "—", "входящая 0": "[]", "порядок": ordLabels() }, info: "len(order) = " + order.length + " < " + n + " → в графе ЦИКЛ (топопорядок невозможен)" });
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
    // Полный путь поиска (для trieViz). Затем — построчный (debugger) проход по нему.
    var path = [0], pc = 0;
    for (var k0 = 0; k0 < query.length; k0++) { var c0 = query[k0]; if (nodes[pc].children[c0] != null) { pc = nodes[pc].children[c0]; path.push(pc); } else break; }
    var steps = [], upto = 0;
    function push(o) { steps.push({ upto: upto, line: o.line, vars: { char: (o.char || "—"), node: (o.node || "—"), isWord: (o.isWord || "—") }, info: o.info, done: o.done, found: o.found }); }
    push({ line: 1, node: "корень", info: "node := корень. Ищем «" + query + "»" });
    var walkCur = 0;
    for (var k = 0; k < query.length; k++) {
      var ch = query[k];
      push({ line: 2, char: ch, node: nodes[walkCur].ch, info: "i = " + k + ": символ запроса '" + ch + "'" });
      push({ line: 3, char: ch, node: nodes[walkCur].ch, info: "c = '" + ch + "'" });
      var childId = nodes[walkCur].children[ch], has = childId != null;
      push({ line: 4, char: ch, node: nodes[walkCur].ch, info: has ? "у узла «" + nodes[walkCur].ch + "» есть потомок '" + ch + "'" : "у узла «" + nodes[walkCur].ch + "» НЕТ потомка '" + ch + "'" });
      if (!has) { push({ line: 5, done: true, char: ch, node: "нет", isWord: "нет", info: "return false — «" + query + "» отсутствует (нет символа '" + ch + "')" }); return { nodes: nodes, path: path, steps: steps }; }
      walkCur = childId; upto++;
      push({ line: 7, char: ch, node: nodes[walkCur].ch, info: "node = children['" + ch + "'] → спускаемся в «" + nodes[walkCur].ch + "»" });
    }
    push({ line: 9, done: true, found: nodes[walkCur].end, node: nodes[walkCur].ch, isWord: nodes[walkCur].end ? "да" : "нет (только префикс)", info: nodes[walkCur].end ? "node.isEnd == true → «" + query + "» найдено как слово ✓" : "node.isEnd == false → «" + query + "» есть только как префикс" });
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
  // KMP — построчный (debugger) проход; образец под текстом рисует kmpViz, lps — панель.
  function bKMP(text, pat) {
    var lps = new Array(pat.length).fill(0);
    (function () { var len = 0, i = 1; while (i < pat.length) { if (pat[i] === pat[len]) { len++; lps[i] = len; i++; } else if (len > 0) { len = lps[len - 1]; } else { lps[i] = 0; i++; } } })();
    var steps = [], i = 0, j = 0;
    function push(o) { steps.push({ i: i, j: j, shift: i - j, match: o.match, lps: lps.slice(), lpsActive: (o.lpsActive == null ? -1 : o.lpsActive), line: o.line, vars: { i: i, j: j, shift: i - j, compare: (o.cmp || "—") }, info: o.info, done: o.done, found: o.found }); }
    push({ line: 1, info: "lps := buildLPS(pat) — префикс-функция: [" + lps.join(",") + "]" });
    push({ line: 2, info: "i = 0, j = 0 — указатели в текст и в образец" });
    var guard = 0, lim = (text.length + pat.length) * 4 + 20;
    while (i < text.length && guard++ < lim) {
      push({ line: 3, info: "i = " + i + " < " + text.length + " — продолжаем" });
      var match = text[i] === pat[j];
      push({ line: 4, match: match, cmp: "'" + text[i] + "' vs '" + pat[j] + "'", info: "text[" + i + "]='" + text[i] + "' " + (match ? "==" : "≠") + " pat[" + j + "]='" + pat[j] + "'" });
      if (match) {
        i++; j++;
        push({ line: 5, match: true, cmp: "совпало", info: "i++, j++ → i=" + i + ", j=" + j });
        if (j === pat.length) { push({ line: 6, found: true, done: true, info: "j == len(pat) → образец найден на позиции " + (i - j) }); return steps; }
      } else if (j > 0) {
        var oldj = j; j = lps[j - 1];
        push({ line: 8, lpsActive: oldj - 1, cmp: "сдвиг", info: "j>0 → j = lps[" + (oldj - 1) + "] = " + j + " (сдвиг по префикс-функции, i НЕ откатываем)" });
      } else {
        i++;
        push({ line: 10, info: "j==0 → i++ = " + i + " (сравниваем заново со следующего символа)" });
      }
    }
    push({ line: 13, done: true, info: "i дошёл до конца текста — образец не найден (return -1)" });
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
  // Циклическая сортировка — построчный (debugger) проход (значение v уходит на индекс v−1).
  function bCyclicSort(arr) {
    var a = arr.slice(), n = a.length, steps = [], i = 0, guard = 0;
    function vv(ii, cor) { return { i: ii, "nums[i]": (ii >= 0 && ii < n ? a[ii] : "—"), correct: (cor === undefined ? "—" : cor) }; }
    steps.push({ values: a.slice(), primary: -1, line: 1, vars: vv(0), info: "i = 0. Значение v должно стоять на индексе v−1." });
    while (i < n && guard++ < 4 * n + 5) {
      steps.push({ values: a.slice(), primary: i, line: 2, vars: vv(i), info: "i = " + i + ": " + i + " < " + n + " — да, продолжаем" });
      var correct = a[i] - 1;
      steps.push({ values: a.slice(), primary: i, secondary: correct, line: 3, vars: vv(i, correct), info: "correct = nums[" + i + "]−1 = " + a[i] + "−1 = " + correct + " (туда должно встать " + a[i] + ")" });
      var mis = a[i] !== a[correct];
      steps.push({ values: a.slice(), primary: i, secondary: correct, line: 4, vars: vv(i, correct), info: "nums[" + i + "]=" + a[i] + (mis ? " ≠ " : " == ") + "nums[" + correct + "]=" + a[correct] + (mis ? " — не на месте" : " — уже на месте") });
      if (mis) {
        var t = a[i]; a[i] = a[correct]; a[correct] = t;
        steps.push({ values: a.slice(), primary: i, secondary: correct, line: 5, vars: vv(i, correct), info: "swap nums[" + i + "] ↔ nums[" + correct + "] → " + a[i] + " встал на место (i не растёт)" });
      } else {
        i++;
        steps.push({ values: a.slice(), primary: i < n ? i : -1, line: 7, vars: vv(i), info: "i++ → i = " + i + " (число было на месте)" });
      }
    }
    steps.push({ values: a.slice(), primary: -1, line: 2, vars: vv(n), info: "i = " + n + ": " + n + " < " + n + " — нет, цикл завершён" });
    steps.push({ values: a.slice(), done: true, line: 9, vars: vv(n), info: "Готово — отсортировано за O(n): каждое v на индексе v−1" });
    return steps;
  }
  // Coin Change — построчный (debugger) проход; dp[] рисуется дефолтной сеткой (values).
  // Важно: dp[a] присваивается ТОЛЬКО на строке 9 (в цикле меняется лишь best) — как в коде.
  function bDpCoins(coins, amount) {
    var INF = Infinity, dp = new Array(amount + 1).fill(INF), steps = [];
    dp[0] = 0;
    var disp = function (v) { return v === INF ? "∞" : v; };
    function push(o) { steps.push({ values: dp.map(disp), primary: (o.primary == null ? -1 : o.primary), secondary: o.secondary, line: o.line, vars: { a: (o.a == null ? "—" : o.a), c: (o.c == null ? "—" : o.c), "dp[a−c]": (o.dac == null ? "—" : o.dac), best: (o.best == null ? "—" : o.best), "dp[a]": (o.dpa == null ? "—" : o.dpa) }, info: o.info, done: o.done, found: o.found }); }
    push({ line: 1, primary: 0, a: 0, best: 0, dpa: 0, info: "dp := [0, ∞, ∞, …] — dp[0]=0 (на сумму 0 нужно 0 монет)" });
    for (var a = 1; a <= amount; a++) {
      push({ line: 2, primary: a, a: a, dpa: disp(dp[a]), info: "a = " + a + ": ищем минимум монет на сумму " + a });
      var best = INF, src = -1;
      push({ line: 3, primary: a, a: a, best: "∞", dpa: disp(dp[a]), info: "best := ∞ — пока размена нет" });
      for (var ci = 0; ci < coins.length; ci++) {
        var c = coins[ci];
        push({ line: 4, primary: a, a: a, c: c, best: disp(best), dpa: disp(dp[a]), info: "монета c = " + c });
        var fits = c <= a, cand = (fits && dp[a - c] !== INF) ? dp[a - c] + 1 : INF, take = fits && cand < best;
        push({ line: 5, primary: a, secondary: fits ? a - c : undefined, a: a, c: c, dac: fits ? disp(dp[a - c]) : "—", best: disp(best), dpa: disp(dp[a]), info: !fits ? ("монета " + c + " > " + a + " — не помещается") : ("dp[" + (a - c) + "]+1 = " + disp(cand) + (take ? " < " : " ≥ ") + "best " + disp(best) + (take ? " — лучше!" : " — не лучше")) });
        if (take) { best = cand; src = a - c; push({ line: 6, primary: a, secondary: a - c, a: a, c: c, dac: disp(dp[a - c]), best: disp(best), dpa: disp(dp[a]), info: "best = dp[" + (a - c) + "]+1 = " + best }); }
      }
      dp[a] = best;
      push({ line: 9, primary: a, secondary: src >= 0 ? src : undefined, a: a, best: disp(best), dpa: disp(dp[a]), info: "dp[" + a + "] = best = " + disp(dp[a]) + (dp[a] === INF ? " — сумму " + a + " набрать нельзя" : " монет") });
    }
    push({ line: 11, primary: amount, done: true, found: dp[amount] !== INF, a: amount, best: disp(dp[amount]), dpa: disp(dp[amount]), info: dp[amount] === INF ? "return -1 — сумму набрать нельзя" : ("return dp[" + amount + "] = " + dp[amount] + " — минимум монет") });
    return steps;
  }
  // XOR-накопление: единственное число среди пар.
  // Single Number (XOR) — построчный (debugger) проход; result-биты видно на панели mapViz.
  function bBitXor(arr) {
    var steps = [], x = 0, n = arr.length;
    function bin(v) { return (v >>> 0).toString(2); }
    steps.push({ values: arr.slice(), primary: -1, line: 1, vars: { i: "—", num: "—", result: 0, "bin(result)": "0" }, info: "result = 0 — нейтральный элемент XOR" });
    for (var i = 0; i < n; i++) {
      steps.push({ values: arr.slice(), primary: i, line: 2, vars: { i: i, num: arr[i], result: x, "bin(result)": bin(x) }, info: "num = nums[" + i + "] = " + arr[i] });
      x ^= arr[i];
      steps.push({ values: arr.slice(), primary: i, line: 3, vars: { i: i, num: arr[i], result: x, "bin(result)": bin(x) }, info: "result ^= " + arr[i] + " → " + x + " (биты, где у " + arr[i] + " единицы, переключились)" });
    }
    steps.push({ values: arr.slice(), done: true, found: true, line: 5, vars: { i: "—", num: "—", result: x, "bin(result)": bin(x) }, info: "return result = " + x + " — пары взаимно уничтожились, остался одиночка" });
    return steps;
  }
  // Слияние интервалов: сортировка по началу, затем один проход.
  // Слияние интервалов — построчный (debugger) проход; интервалы рисует customViz.
  function bMergeIntervals(raw) {
    var ivs = raw.slice().sort(function (a, b) { return a[0] - b[0]; });
    function cl(p) { return [p[0], p[1]]; }
    function fmt(p) { return "[" + p[0] + "," + p[1] + "]"; }
    var merged = [], steps = [];
    function push(o) { steps.push({ cur: (o.cur == null ? -1 : o.cur), merged: merged.map(cl), line: o.line, vars: { i: (o.i == null ? "—" : o.i), interval: (o.interval || "—"), last: (o.last || "—"), result: merged.length }, info: o.info, done: o.done, found: o.found }); }
    if (!ivs.length) return [{ cur: -1, merged: [], done: true, line: 12, vars: { i: "—", interval: "—", last: "—", result: 0 }, info: "Нет интервалов" }];
    push({ line: 1, info: "Сортируем по началу: " + ivs.map(fmt).join(", ") });
    merged.push(cl(ivs[0]));
    push({ line: 2, cur: 0, i: 0, interval: fmt(ivs[0]), last: fmt(merged[0]), info: "result := [" + fmt(ivs[0]) + "] — первый интервал" });
    for (var k = 1; k < ivs.length; k++) {
      var iv = ivs[k];
      push({ line: 3, cur: k, i: k, interval: fmt(iv), last: fmt(merged[merged.length - 1]), info: "i = " + k });
      push({ line: 4, cur: k, i: k, interval: fmt(iv), last: fmt(merged[merged.length - 1]), info: "cur = intervals[" + k + "] = " + fmt(iv) });
      var last = merged[merged.length - 1];
      push({ line: 5, cur: k, i: k, interval: fmt(iv), last: fmt(last), info: "last = " + fmt(last) + " — последний в result" });
      var overlap = iv[0] <= last[1];
      push({ line: 6, cur: k, i: k, interval: fmt(iv), last: fmt(last), info: "cur[0]=" + iv[0] + (overlap ? " ≤ " : " > ") + "last[1]=" + last[1] + (overlap ? " — пересекаются" : " — разрыв") });
      if (overlap) {
        last[1] = Math.max(last[1], iv[1]);
        push({ line: 7, cur: k, i: k, interval: fmt(iv), last: fmt(last), info: "last[1] = max(" + last[1] + ") → расширяем последний до " + fmt(last) });
      } else {
        merged.push([iv[0], iv[1]]);
        push({ line: 9, cur: k, i: k, interval: fmt(iv), last: fmt(merged[merged.length - 1]), info: "разрыв → добавляем " + fmt(iv) + " как новый интервал" });
      }
    }
    push({ line: 12, cur: -1, done: true, found: true, info: "return result — " + merged.length + " интервал(ов): " + merged.map(fmt).join(", ") });
    return steps;
  }
  // Разворот списка: три указателя prev / curr / next (как индексы).
  // Разворот списка — построчный (debugger) проход тремя указателями prev/curr/next.
  function bListReverse(list) {
    var n = list.length, steps = [], prev = -1, curr = -1;
    function vv(c, nx) { return { prev: prev < 0 ? "nil" : list[prev], curr: (c >= 0 && c < n) ? list[c] : "nil", next: (nx >= 0 && nx < n) ? list[nx] : "nil" }; }
    function push(o) { var c = (o.curr == null ? curr : o.curr), nx = (o.next == null ? -1 : o.next); steps.push({ prev: prev, curr: c, next: nx, line: o.line, vars: vv(c, nx), info: o.info, done: o.done, found: o.found }); }
    if (!n) return [{ prev: -1, curr: -1, next: -1, done: true, line: 9, vars: { prev: "nil", curr: "nil", next: "nil" }, info: "Пустой список" }];
    push({ line: 1, curr: -1, info: "prev = nil — развёрнутой части пока нет" });
    curr = 0;
    push({ line: 2, curr: 0, info: "curr = head = " + list[0] });
    var guard = 0;
    while (curr >= 0 && curr < n && guard++ < n + 2) {
      push({ line: 3, curr: curr, info: "curr = " + list[curr] + " ≠ nil — продолжаем" });
      var nxt = (curr + 1 < n) ? curr + 1 : -1;
      push({ line: 4, curr: curr, next: nxt, info: "next = curr.Next = " + (nxt < 0 ? "nil" : list[nxt]) + " — сохранили остаток" });
      push({ line: 5, curr: curr, next: nxt, info: "curr.Next = prev → " + list[curr] + " теперь указывает на " + (prev < 0 ? "nil" : list[prev]) });
      prev = curr;
      push({ line: 6, curr: curr, next: nxt, info: "prev = curr = " + list[curr] + " (развёрнутая часть выросла)" });
      curr = nxt;
      push({ line: 7, curr: curr, next: -1, info: "curr = next = " + (curr < 0 ? "nil" : list[curr]) });
    }
    push({ line: 3, curr: -1, info: "curr = nil — список кончился, выходим" });
    push({ line: 9, curr: -1, done: true, found: true, info: "return prev — новая голова: " + (prev >= 0 ? list[prev] : "nil") });
    return steps;
  }
  // Обход дерева (BFS уровнями или DFS preorder). Возвращает ctx с present/order/steps.
  // Обход дерева — построчный (debugger) проход. BFS — с очередью, DFS — с рекурсивным
  // стеком вызовов (обе структуры показаны панелью). treeViz красит узлы (upto/nodeIdx).
  function bTree(arr, mode) {
    var present = [];
    for (var i = 0; i < arr.length; i++) if (arr[i] != null) present.push(i);
    var posOf = {}; present.forEach(function (idx, k) { posOf[idx] = k; });
    var order;
    if (mode === "dfs") { order = []; (function d(k) { if (k >= arr.length || arr[k] == null) return; order.push(k); d(2 * k + 1); d(2 * k + 2); })(0); }
    else { order = present.slice(); } // BFS по heap-массиву = level-order = present
    var steps = [], seq = [], upto = -1;
    function vv(nodeIdx) { return { node: (nodeIdx < 0 ? "—" : arr[nodeIdx]), visited: (upto + 1) + "/" + order.length, order: seq.length ? seq.join(" → ") : "—" }; }

    if (mode === "dfs") {
      var stack = [];
      function snapStack() { return stack.map(function (k) { return arr[k]; }); }
      function push(o) { var ni = (o.nodeIdx == null ? -1 : o.nodeIdx); steps.push({ nodeIdx: ni, cur: (ni >= 0 ? posOf[ni] : -1), upto: upto, stack: snapStack(), line: o.line, vars: vv(ni), info: o.info, done: o.done, found: o.found }); }
      (function dfs(k) {
        if (k >= arr.length || arr[k] == null) { push({ line: 1, nodeIdx: -1, info: "node == nil → возврат из рекурсии (пустой потомок)" }); return; }
        stack.push(k);
        push({ line: 1, nodeIdx: k, info: "node = " + arr[k] + " ≠ nil — заходим в вызов" });
        seq.push(arr[k]); upto++;
        push({ line: 2, nodeIdx: k, info: "preorder: записываем " + arr[k] + " → " + seq.join(" → ") });
        push({ line: 3, nodeIdx: k, info: "dfs(node.Left) узла " + arr[k] });
        dfs(2 * k + 1);
        push({ line: 4, nodeIdx: k, info: "dfs(node.Right) узла " + arr[k] });
        dfs(2 * k + 2);
        stack.pop();
      })(0);
      push({ line: 5, nodeIdx: -1, done: true, found: true, info: "Все вызовы вернулись — preorder: " + seq.join(" → ") });
    } else {
      var queue = [0];
      function snapQ() { return queue.map(function (k) { return arr[k]; }); }
      function push(o) { var ni = (o.nodeIdx == null ? -1 : o.nodeIdx); steps.push({ nodeIdx: ni, cur: (ni >= 0 ? posOf[ni] : -1), upto: upto, queue: snapQ(), line: o.line, vars: vv(ni), info: o.info, done: o.done, found: o.found }); }
      push({ line: 2, info: "queue := [root] — кладём корень в очередь" });
      push({ line: 3, info: "order — порядок обхода (пока пуст)" });
      var guard = 0, lim = arr.length * 4 + 10;
      while (queue.length && guard++ < lim) {
        push({ line: 4, info: "len(queue) = " + queue.length + " > 0 — продолжаем" });
        var node = queue[0];
        push({ line: 5, nodeIdx: node, info: "node = queue[0] = " + arr[node] });
        queue.shift();
        push({ line: 6, nodeIdx: node, info: "queue = queue[1:] — убрали " + arr[node] });
        seq.push(arr[node]); upto++;
        push({ line: 7, nodeIdx: node, info: "order = append(" + arr[node] + ") → " + seq.join(" → ") });
        var L = 2 * node + 1, hasL = L < arr.length && arr[L] != null;
        if (hasL) queue.push(L);
        push({ line: 8, nodeIdx: node, info: hasL ? "node.Left = " + arr[L] + " ≠ nil → в конец очереди" : "node.Left = nil — пропускаем" });
        var R = 2 * node + 2, hasR = R < arr.length && arr[R] != null;
        if (hasR) queue.push(R);
        push({ line: 9, nodeIdx: node, info: hasR ? "node.Right = " + arr[R] + " ≠ nil → в конец очереди" : "node.Right = nil — пропускаем" });
      }
      push({ line: 11, nodeIdx: -1, done: true, found: true, info: "Очередь пуста — BFS-порядок: " + seq.join(" → ") });
    }
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
  // Две кучи (медиана потока) — построчный (debugger) проход; обе кучи рисует twoHeapsViz.
  function bTwoHeaps(stream) {
    var lower = [], upper = [], steps = []; // отсортированы по возрастанию; top(lower)=последний, top(upper)=первый
    function ins(arr, x) { var i = 0; while (i < arr.length && arr[i] < x) i++; arr.splice(i, 0, x); }
    function loTop() { return lower.length ? lower[lower.length - 1] : "—"; }
    function median() {
      if (!lower.length && !upper.length) return "—";
      return lower.length === upper.length ? (lower[lower.length - 1] + upper[0]) / 2 : (lower.length > upper.length ? lower[lower.length - 1] : upper[0]);
    }
    function push(o) { steps.push({ lower: lower.slice(), upper: upper.slice(), line: o.line, vars: { num: o.num, loSize: lower.length, hiSize: upper.length, median: median() }, info: o.info, done: o.done, found: o.found }); }
    stream.forEach(function (x) {
      var toLo = lower.length === 0 || x <= lower[lower.length - 1];
      push({ line: 1, num: x, info: "Добавляем " + x + ": " + (lower.length === 0 ? "max-heap пуст" : x + " ≤ top(lo)=" + loTop()) + " → " + (toLo ? "в МЕНЬШУЮ половину" : "в БОЛЬШУЮ половину") });
      if (toLo) { ins(lower, x); push({ line: 2, num: x, info: x + " → max-heap (меньшая половина), top = " + loTop() }); }
      else { ins(upper, x); push({ line: 4, num: x, info: x + " → min-heap (большая половина), top = " + upper[0] }); }
      var loBig = lower.length > upper.length + 1;
      push({ line: 6, num: x, info: "баланс: |lo|=" + lower.length + ", |hi|=" + upper.length + (loBig ? " → меньшая перевешивает на 2" : " → меньшая не перевешивает") });
      if (loBig) { var m = lower.pop(); ins(upper, m); push({ line: 7, num: x, info: "переносим вершину max-heap (" + m + ") в min-heap → выравниваем" }); }
      else {
        var hiBig = upper.length > lower.length + 1;
        push({ line: 8, num: x, info: "иначе: |hi|=" + upper.length + " > |lo|+1=" + (lower.length + 1) + "? " + (hiBig ? "да" : "нет") });
        if (hiBig) { var m2 = upper.shift(); ins(lower, m2); push({ line: 9, num: x, info: "переносим вершину min-heap (" + m2 + ") в max-heap → выравниваем" }); }
      }
    });
    if (steps.length) { steps[steps.length - 1].done = true; steps[steps.length - 1].found = true; }
    else steps.push({ lower: [], upper: [], done: true, found: true, line: 11, vars: { num: "—", loSize: 0, hiSize: 0, median: "—" }, info: "Пустой поток" });
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

  // Top K: min-heap размера k — построчный (debugger) проход; кучу рисует topKViz.
  function bTopK(arr, k) {
    var heap = [], steps = []; // отсортирован по возрастанию, минимум первый
    function ins(x) { var i = 0; while (i < heap.length && heap[i] < x) i++; heap.splice(i, 0, x); }
    function push(o) { steps.push({ i: o.i, heap: heap.slice(), line: o.line, vars: { num: (o.num == null ? "—" : o.num), heapSize: heap.length + "/" + k, popped: (o.popped == null ? "—" : o.popped) }, info: o.info, done: o.done, found: o.found }); }
    push({ i: -1, line: 1, info: "h := пустая min-куча (будет хранить k наибольших)" });
    for (var i = 0; i < arr.length; i++) {
      push({ i: i, num: arr[i], line: 2, info: "num = nums[" + i + "] = " + arr[i] });
      ins(arr[i]);
      push({ i: i, num: arr[i], line: 3, info: "heap.Push(" + arr[i] + ") → [" + heap.join(",") + "]" });
      var over = heap.length > k;
      push({ i: i, num: arr[i], line: 4, info: "len(heap) = " + heap.length + (over ? " > " : " ≤ ") + "k = " + k + (over ? " → выкинем минимум" : " → ничего не выкидываем") });
      if (over) { var popped = heap.shift(); push({ i: i, num: arr[i], popped: popped, line: 5, info: "heap.Pop() → выкинули минимум " + popped + " (не входит в топ-" + k + ")" }); }
    }
    push({ i: -1, line: 8, done: true, found: true, info: k + " наибольших: " + heap.join(", ") });
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

  // K-way merge — построчный (debugger) проход с ЯВНОЙ min-кучей из голов (как в коде).
  // kwayViz рисует списки+результат (ptr/pick/output), куча — отдельная панель (s.heap).
  function bKwayMerge(lists) {
    var K = lists.length, ptr = lists.map(function () { return 0; }), output = [], heap = [], steps = [];
    function heapSnap() { return heap.map(function (e) { return { v: e.v, li: e.li }; }); }
    function popMin() { var mi = 0; for (var i = 1; i < heap.length; i++) if (heap[i].v < heap[mi].v) mi = i; return heap.splice(mi, 1)[0]; }
    function push(o) { steps.push({ ptr: ptr.slice(), output: output.slice(), pick: (o.pick || null), heap: heapSnap(), line: o.line, vars: { min: (o.min == null ? "—" : o.min), list: (o.list == null ? "—" : o.list), outLen: output.length }, info: o.info, done: o.done, found: o.found }); }
    push({ line: 1, info: "h := пустая min-куча из (значение, список, индекс)" });
    for (var i = 0; i < K; i++) {
      push({ line: 2, info: "список " + (i + 1) });
      if (lists[i].length) { heap.push({ v: lists[i][0], li: i, ci: 0 }); push({ line: 3, info: "h.Push: голова списка " + (i + 1) + " = " + lists[i][0] }); }
    }
    push({ line: 5, info: "out := [] — результат" });
    var guard = 0, lim = 10; for (var g = 0; g < K; g++) lim += lists[g].length; lim = lim * 4 + 10;
    while (heap.length && guard++ < lim) {
      push({ line: 6, info: "len(h) = " + heap.length + " > 0 — продолжаем сливать" });
      var e = popMin(), li = e.li, ci = e.ci;
      ptr[li] = ci + 1;
      push({ line: 7, pick: [li, ci], min: e.v, list: li + 1, info: "Pop min = " + e.v + " (список " + (li + 1) + ") — минимальная голова" });
      output.push(e.v);
      push({ line: 8, pick: [li, ci], min: e.v, list: li + 1, info: "out = append(out, " + e.v + ") → [" + output.join(",") + "]" });
      var hasNext = ci + 1 < lists[li].length;
      push({ line: 9, pick: [li, ci], min: e.v, list: li + 1, info: "в списке " + (li + 1) + (hasNext ? " есть следующий: " + lists[li][ci + 1] : " элементы кончились") });
      if (hasNext) { heap.push({ v: lists[li][ci + 1], li: li, ci: ci + 1 }); push({ line: 10, min: e.v, list: li + 1, info: "h.Push следующий из списка " + (li + 1) + " = " + lists[li][ci + 1] }); }
    }
    push({ line: 6, info: "len(h) = 0 — куча пуста, всё слито" });
    push({ line: 13, done: true, found: true, info: "Готово: " + output.join(", ") });
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
  // LCS — построчный (debugger) проход; 2D-таблицу dp рисует dpTableViz (fillStep = кадр заполнения).
  function bDpLcs(a, b) {
    var m = a.length, nn = b.length, dp = [], fillStep = [], steps = [];
    for (var r = 0; r <= m; r++) { dp.push(new Array(nn + 1).fill(0)); fillStep.push(new Array(nn + 1).fill(-1)); }
    function snap() { return dp.map(function (row) { return row.slice(); }); }
    function push(o) { steps.push({ dp: snap(), i: (o.i == null ? -1 : o.i), j: (o.j == null ? -1 : o.j), match: (o.match == null ? null : o.match), src: (o.src || null), line: o.line, vars: { "i": (o.i == null ? "—" : o.i), "j": (o.j == null ? "—" : o.j), "a[i-1], b[j-1]": (o.chars || "—"), "rule": (o.rule || "—"), "dp[i][j]": (o.dpij == null ? "—" : o.dpij) }, info: o.info, done: o.done, found: o.found }); }
    push({ line: 1, info: "dp — таблица (m+1)×(n+1), нулевые края: с пустым префиксом LCS = 0" });
    for (var i = 1; i <= m; i++) {
      push({ line: 2, i: i, info: "строка i = " + i + " (символ a[" + (i - 1) + "] = '" + a[i - 1] + "')" });
      for (var j = 1; j <= nn; j++) {
        push({ line: 3, i: i, j: j, info: "столбец j = " + j + " (символ b[" + (j - 1) + "] = '" + b[j - 1] + "')" });
        var ca = a[i - 1], cb = b[j - 1], match = ca === cb, chars = "'" + ca + "', '" + cb + "'";
        push({ line: 4, i: i, j: j, match: match, chars: chars, info: "a[" + (i - 1) + "]='" + ca + "' " + (match ? "==" : "≠") + " b[" + (j - 1) + "]='" + cb + "'" });
        if (match) {
          var val = dp[i - 1][j - 1] + 1; dp[i][j] = val; fillStep[i][j] = steps.length;
          push({ line: 5, i: i, j: j, match: true, src: { kind: "diag", cells: [[i - 1, j - 1]] }, chars: chars, rule: "диагональ +1", dpij: val, info: "совпало → dp[" + i + "][" + j + "] = dp[" + (i - 1) + "][" + (j - 1) + "]+1 = " + dp[i - 1][j - 1] + "+1 = " + val });
        } else {
          var up = dp[i - 1][j], left = dp[i][j - 1], val2 = Math.max(up, left); dp[i][j] = val2; fillStep[i][j] = steps.length;
          var chosen = up >= left ? [i - 1, j] : [i, j - 1];
          push({ line: 7, i: i, j: j, match: false, src: { kind: "max", cells: [[i - 1, j], [i, j - 1]], chosen: chosen }, chars: chars, rule: "max(↑, ←)", dpij: val2, info: "не совпало → dp[" + i + "][" + j + "] = max(↑" + up + ", ←" + left + ") = " + val2 });
        }
      }
    }
    push({ line: 11, i: m, j: nn, done: true, found: true, rule: "ответ", dpij: dp[m][nn], info: "return dp[" + m + "][" + nn + "] = " + dp[m][nn] + " — длина наибольшей общей подпоследовательности" });
    steps.forEach(function (s, k) { s._i = k; });
    var rowHeads = ["ε"].concat(a.split(""));
    var colHeads = ["ε"].concat(b.split(""));
    return { a: a, b: b, m: m, n: nn, fillStep: fillStep, rowHeads: rowHeads, colHeads: colHeads, steps: steps };
  }
  // 0/1 рюкзак: dp[i][c] — максимальная ценность из первых i предметов при вместимости c.
  // Выбор «взять / не взять»: dp[i][c] = max(dp[i-1][c], dp[i-1][c-wt]+val).
  // 0/1 рюкзак — построчный (debugger) проход; 2D-таблицу рисует dpTableViz.
  function bKnapsack(items, W) {
    var nI = items.length, dp = [], fillStep = [], steps = [];
    for (var r = 0; r <= nI; r++) { dp.push(new Array(W + 1).fill(0)); fillStep.push(new Array(W + 1).fill(-1)); }
    function snap() { return dp.map(function (row) { return row.slice(); }); }
    function push(o) { steps.push({ dp: snap(), i: (o.i == null ? -1 : o.i), j: (o.c == null ? -1 : o.c), match: (o.took == null ? false : o.took), src: (o.src || null), line: o.line, vars: { "item": (o.item || "—"), "cap": (o.c == null ? "—" : o.c), "rule": (o.rule || "—"), "dp[i][c]": (o.dpic == null ? "—" : o.dpic) }, info: o.info, done: o.done, found: o.found }); }
    push({ line: 1, info: "dp — таблица (предметы+1)×(вместимость+1), нулевые края = 0" });
    for (var i = 1; i <= nI; i++) {
      var wt = items[i - 1].w, val = items[i - 1].v, itemLbl = "#" + i + " (w" + wt + ", v" + val + ")";
      push({ line: 2, i: i, item: itemLbl, info: "предмет " + itemLbl });
      for (var c = 0; c <= W; c++) {
        push({ line: 3, i: i, c: c, item: itemLbl, info: "вместимость c = " + c });
        var skip = dp[i - 1][c];
        dp[i][c] = skip; fillStep[i][c] = steps.length;
        push({ line: 4, i: i, c: c, item: itemLbl, src: { kind: "diag", cells: [[i - 1, c]] }, rule: "не берём", dpic: skip, info: "по умолчанию НЕ берём → dp[" + i + "][" + c + "] = dp[" + (i - 1) + "][" + c + "] = " + skip });
        var fits = wt <= c;
        push({ line: 5, i: i, c: c, item: itemLbl, dpic: dp[i][c], info: "вес " + wt + (fits ? " ≤ " : " > ") + c + (fits ? " — влезает" : " — не влезает, пропускаем") });
        if (fits) {
          var take = dp[i - 1][c - wt] + val;
          push({ line: 6, i: i, c: c, item: itemLbl, src: { kind: "max", cells: [[i - 1, c], [i - 1, c - wt]], chosen: [i - 1, c - wt] }, rule: "take?", dpic: dp[i][c], info: "take = dp[" + (i - 1) + "][" + (c - wt) + "]+" + val + " = " + take });
          var took = take > dp[i][c];
          if (took) { dp[i][c] = take; push({ line: 7, i: i, c: c, item: itemLbl, took: true, src: { kind: "max", cells: [[i - 1, c], [i - 1, c - wt]], chosen: [i - 1, c - wt] }, rule: "взять предмет", dpic: dp[i][c], info: "take " + take + " > " + skip + " → берём, dp[" + i + "][" + c + "] = " + take }); }
          else { push({ line: 7, i: i, c: c, item: itemLbl, took: false, src: { kind: "max", cells: [[i - 1, c], [i - 1, c - wt]], chosen: [i - 1, c] }, rule: "пропустить", dpic: dp[i][c], info: "take " + take + " ≤ " + dp[i][c] + " → не берём" }); }
        }
      }
    }
    push({ line: 11, i: nI, c: W, done: true, found: true, rule: "ответ", dpic: dp[nI][W], info: "return dp[" + nI + "][" + W + "] = " + dp[nI][W] + " — максимальная ценность" });
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

  // Каркас панели «содержимое структуры данных» (как freq в скользящем окне):
  // заголовок + сетка ячеек + подпись снизу. Возвращает {grid, foot} для заполнения.
  function structPanel(panel, hdr) {
    var wrap = mkEl("div", "algo-tp__map");
    wrap.appendChild(mkEl("div", "algo-tp__maphdr", hdr));
    var grid = mkEl("div", "algo-tp__mapgrid");
    wrap.appendChild(grid);
    var foot = mkEl("div", "algo-tp__mapsize", "");
    wrap.appendChild(foot);
    panel.appendChild(wrap);
    return { wrap: wrap, grid: grid, foot: foot };
  }
  // Ячейка структуры: подпись сверху, значение снизу, набор классов состояния.
  function structCell(key, val, cls) {
    var col = mkEl("div", "algo-tp__mapcell" + (cls ? " " + cls : ""));
    col.appendChild(mkEl("div", "algo-tp__mapkey", key));
    col.appendChild(mkEl("div", "algo-tp__mapcnt", val));
    return col;
  }

  // ===== Лёгкая подсветка синтаксиса Go ======================================
  // Код в CODE[] — доверенные строки (не пользовательский ввод), но спаны строим
  // через textContent/DocumentFragment, без innerHTML — безопасно по построению.
  var GO_KW = { func: 1, for: 1, if: 1, else: 1, return: 1, range: 1, var: 1, const: 1, package: 1, import: 1, switch: 1, case: 1, default: 1, break: 1, continue: 1, go: 1, defer: 1, select: 1, type: 1, struct: 1, interface: 1, map: 1, chan: 1, fallthrough: 1, nil: 1, true: 1, false: 1, iota: 1 };
  var GO_TYPE = { int: 1, int8: 1, int16: 1, int32: 1, int64: 1, uint: 1, uint8: 1, uint16: 1, uint32: 1, uint64: 1, uintptr: 1, float32: 1, float64: 1, complex64: 1, complex128: 1, string: 1, byte: 1, rune: 1, bool: 1, error: 1, any: 1 };
  var GO_FN = { make: 1, delete: 1, len: 1, cap: 1, append: 1, copy: 1, max: 1, min: 1, new: 1, panic: 1, recover: 1, print: 1, println: 1, close: 1 };
  function hlGo(text) {
    var frag = document.createDocumentFragment();
    var RE = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|(\b\d[\d_.]*\b)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z0-9_])/g;
    var m;
    while ((m = RE.exec(text)) !== null) {
      var cls = null, t = m[0];
      if (m[1]) cls = "com";
      else if (m[2]) cls = "str";
      else if (m[3]) cls = "num";
      else if (m[4]) cls = GO_KW[m[4]] ? "kw" : GO_TYPE[m[4]] ? "type" : GO_FN[m[4]] ? "fn" : null;
      else if (m[6]) cls = "punct";
      if (cls) { var sp = document.createElement("span"); sp.className = "algo-tp__tok--" + cls; sp.textContent = t; frag.appendChild(sp); }
      else frag.appendChild(document.createTextNode(t)); // пробелы и обычные идентификаторы
    }
    return frag;
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
      lineNotes: { 1: "Ставим указатели на концы массива: lo слева, hi справа", 2: "Заголовок цикла: пока указатели не сошлись (lo < hi)", 3: "Считаем сумму пары на текущих указателях", 4: "Сумма равна target — пара найдена, возвращаем индексы", 5: "Возвращаем индексы найденной пары", 6: "Сумма меньше target → двигаем левый вправо (lo++): сумма растёт", 7: "lo++: берём элемент побольше слева", 9: "hi--: берём элемент поменьше справа", 12: "Указатели сошлись — подходящей пары нет" },
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
      status: function (s, idx, total) {
        if (s.found) return { kind: "ok", icon: "✓", head: "Пара найдена!", text: s.info };
        if (s.done) return { kind: "end", icon: idx + 1, head: "Пара не найдена", text: s.info };
        return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info };
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
      lineNotes: { 1: "Заводим аккумулятор суммы окна", 2: "Заголовок цикла набора первого окна из k элементов", 3: "Прибавляем очередной элемент первого окна", 5: "Первое окно посчитано — это стартовый максимум", 6: "Заголовок цикла скольжения: двигаем окно вправо", 7: "Сдвиг окна за O(1): + новый элемент справа, − выбывший слева (не пересчитываем сумму заново)", 8: "Сравниваем сумму окна с лучшей", 9: "Нашли окно больше — обновляем максимум", 12: "Все окна пройдены — возвращаем лучшую сумму" },
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
        if (s.done) return { kind: "ok", icon: "✓", head: "Максимум окна = " + s.vars.maxSum, text: s.info };
        return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info };
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
      lineNotes: { 1: "Оба указателя стартуют с головы списка", 2: "Условие цикла: пока fast и fast.Next не nil", 3: "slow делает один шаг (slow.Next)", 4: "fast делает два шага (fast.Next.Next)", 5: "Указатели совпали?", 6: "slow и fast встретились — в списке есть цикл", 9: "fast достиг конца (nil) — цикла нет" },
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
        if (s.done) return { kind: "end", icon: idx + 1, head: "Цикла нет", text: s.info };
        return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info };
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
      lineNotes: { 1: "Создаём пустой freq (map[byte]int) — счётчик символов в окне", 2: "Левая граница left и ответ maxLen — в ноль", 3: "Заголовок цикла: продвигаем правую границу right на следующий символ", 4: "Расширяем окно: добавляем символ справа в счётчик freq", 5: "Проверка условия цикла: различных символов (len(freq)) больше k?", 6: "Уменьшаем счётчик символа на левой границе", 7: "Счётчик дошёл до 0 → delete: ключ исчезает из map, len(freq) падает", 8: "Сжимаем слева (left++), пока различных не станет ≤ k", 10: "Окно валидно — обновляем максимальную длину", 12: "Возвращаем длину самого длинного подходящего окна" },
      rules: [{ head: "Расширяем right", body: "+ символ справа", cls: "lt" }, { head: "distinct > k", body: "→ сжимаем слева (left++)", cls: "gt" }, { head: "Обновляем maxLen", body: "если окно длиннее", cls: "eq" }],
      parse: function (root) { var chars = (root.getAttribute("data-string") || "").split(""); var k = parseInt(root.getAttribute("data-k"), 10); return { chars: chars, k: k, steps: bSlidingVar(chars, k) }; },
      inputs: [{ attr: "data-string", label: "Строка" }, { attr: "data-k", label: "k", sm: true }],
      values: function (ctx) { return ctx.chars; },
      title: function (ctx) { return "Подстрока с ≤" + ctx.k + " различными символами"; },
      param: function (ctx) { return { label: "Максимум различных k", value: ctx.k }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Длина текущего окна", "Различных символов", "Макс. длина", "Состояние"],
      sumValues: function (s, ctx) {
        var len = (s.lo >= 0 && s.hi >= s.lo) ? (s.hi - s.lo + 1) : 0;
        var dist = s.vars.distinct;
        var over = (typeof dist === "number" && dist > ctx.k);
        return [
          { text: len, cls: "lo" },
          { text: dist, cls: "ok" },
          { text: s.vars.maxLen, cls: "warn" },
          { text: over ? "Лимит превышен" : "Окно валидно", cls: over ? "badge-bad" : "badge-ok" }
        ];
      },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Макс. длина = " + s.vars.maxLen, text: s.info || ("≤" + ctx.k + " различных символов") }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info || ("различных = " + s.vars.distinct + ", макс. длина = " + s.vars.maxLen) }; },
      stepCard: function (s) {
        if (s.kind === "done") return { a: "лучшее окно [" + s.lo + ".." + s.hi + "]", b: "макс. длина = " + s.vars.maxLen, c: "готово", cls: "eq" };
        if (s.kind === "expand") return { a: "+ '" + s.touched + "' справа", b: "окно [" + s.lo + ".." + s.hi + "]", c: "расширяем", cls: "lt" };
        if (s.kind === "shrink-del") return { a: "− '" + s.touched + "' слева", b: "delete из map", c: "сжимаем", cls: "gt" };
        if (s.kind === "shrink-dec") return { a: "− '" + s.touched + "' слева", b: "freq--", c: "сжимаем", cls: "gt" };
        return { a: "окно [" + s.lo + ".." + s.hi + "]", b: "длина = " + (s.hi - s.lo + 1), c: s.improved ? "новая макс" : "без изм.", cls: s.improved ? "eq" : "" };
      },
      varsOf: function (s) { return { left: s.vars.left, right: s.vars.right, distinct: s.vars.distinct, maxLen: s.vars.maxLen }; },
      // Панель внутренней структуры freq: фиксированная сетка из всех символов строки.
      // Счётчик каждого символа растёт/падает по шагам; при 0 ключ «гаснет» (= delete из map),
      // тронутый на шаге ключ подсвечивается. Снизу len(freq) с подсветкой условия len(freq) > k.
      mapViz: function (parent, ctx) {
        var alphabet = ctx.chars.slice().filter(function (c, i, a) { return a.indexOf(c) === i; }).sort();
        var wrap = mkEl("div", "algo-tp__map");
        wrap.appendChild(mkEl("div", "algo-tp__maphdr", "freq — счётчик символов в окне  (map[byte]int)"));
        var grid = mkEl("div", "algo-tp__mapgrid");
        var cells = {};
        alphabet.forEach(function (ch) {
          var col = mkEl("div", "algo-tp__mapcell");
          col.appendChild(mkEl("div", "algo-tp__mapkey", "'" + ch + "'"));
          var cnt = mkEl("div", "algo-tp__mapcnt", "·");
          col.appendChild(cnt);
          grid.appendChild(col);
          cells[ch] = { col: col, cnt: cnt };
        });
        wrap.appendChild(grid);
        var size = mkEl("div", "algo-tp__mapsize", "");
        wrap.appendChild(size);
        parent.appendChild(wrap);
        return function (s) {
          var freq = s.freq || {}, live = 0;
          alphabet.forEach(function (ch) {
            var has = freq[ch] > 0, c = cells[ch];
            if (has) live++;
            c.cnt.textContent = has ? freq[ch] : "·";
            c.col.className = "algo-tp__mapcell" + (has ? " algo-tp__mapcell--on" : " algo-tp__mapcell--off") + (s.touched === ch ? " algo-tp__mapcell--hot algo-tp__mapcell--" + (s.action || "add") : "");
          });
          var over = live > ctx.k;
          size.innerHTML = "";
          size.appendChild(mkEl("span", "algo-tp__mapsizek", "len(freq) = " + live));
          size.appendChild(mkEl("span", "algo-tp__mapsizecmp" + (over ? " algo-tp__mapsizecmp--bad" : " algo-tp__mapsizecmp--ok"), (over ? " > " : " ≤ ") + "k = " + ctx.k + (over ? "  → окно невалидно, сжимаем" : "  → окно валидно")));
        };
      }
    },

    "two-pointers-dedup": {
      badge: "Two Pointers",
      desc: "Удаление дубликатов из отсортированного массива на месте (одно направление).",
      valuesLabel: "Массив (отсортирован, с дубликатами)", codeKey: "two-pointers-dedup", fillRange: false,
      ptr1: { name: "slow", cap: "(пишем)" }, ptr2: { name: "fast", cap: "(сканируем)" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Фильтрации на месте" },
      varOrder: ["slow", "fast", "nums[slow]", "nums[fast]", "len"],
      varDesc: { slow: "Граница уникальных (куда пишем)", fast: "Сканер", "nums[slow]": "Последний уникальный", "nums[fast]": "Текущий элемент", len: "Длина уникального префикса" },
      lineNotes: { 1: "Пустой массив обрабатываем отдельно (тут он не пуст)", 2: "slow — граница уникального префикса (куда писать следующий уникальный)", 3: "Заголовок цикла: fast сканирует массив слева направо", 4: "Текущий элемент отличается от последнего уникального?", 5: "Двигаем границу уникальных вправо (slow++)", 6: "Записываем уникальный элемент на позицию slow", 9: "Длина уникального префикса = slow + 1" },
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
      lineNotes: { 1: "Оба указателя на голове", 2: "Условие цикла: пока fast и fast.Next не nil", 3: "slow делает один шаг (slow.Next)", 4: "fast делает два шага: когда fast у конца, slow ровно посередине", 6: "fast дошёл до конца — slow указывает на середину" },
      rules: [{ head: "slow", body: "+1 шаг", cls: "lt" }, { head: "fast", body: "+2 шага", cls: "gt" }, { head: "fast в конце", body: "→ slow в середине", cls: "eq" }],
      parse: function (root) { var list = nums(root.getAttribute("data-list")); return { list: list, steps: bListMiddle(list) }; },
      inputs: [{ attr: "data-list", label: "Список" }],
      values: function (ctx) { return ctx.list; },
      title: function () { return "Середина списка (заяц и черепаха)"; },
      pointers: function (s) { return { lo: s.slow, hi: s.fast }; },
      sumCells: ["slow →", "fast →"],
      sumValues: function (s) { return [{ text: s.vars.slow, cls: s.done ? "eq" : "" }, { text: s.vars.fast }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Середина = " + s.vars.slow, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
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
      lineNotes: { 1: "Границы поиска: left в начале, right в конце", 2: "Заголовок цикла: пока диапазон не пуст (left ≤ right)", 3: "Берём середину диапазона (защита от переполнения)", 4: "Сравниваем середину с target", 5: "arr[mid] == target — нашли, возвращаем индекс", 6: "Иначе сравниваем: arr[mid] меньше target?", 7: "target правее → отбрасываем левую половину (left = mid+1)", 9: "target левее → отбрасываем правую половину (right = mid−1)", 12: "Диапазон пуст — элемента нет" },
      rules: [{ head: "arr[mid] < target", body: "→ ищем правее (left = mid+1)", cls: "lt" }, { head: "arr[mid] > target", body: "→ ищем левее (right = mid−1)", cls: "gt" }, { head: "arr[mid] = target", body: "→ найдено!", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var target = parseInt(root.getAttribute("data-target"), 10); return { arr: arr, target: target, steps: bBinarySearch(arr, target) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-target", label: "target", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return "Бинарный поиск " + ctx.target; },
      param: function (ctx) { return { label: "Target (цель)", value: ctx.target, ok: true }; },
      cellState: function (s, j, lo, hi) { var found = !!s.found; if (found) return { found: j === s.mid, dim: j !== s.mid }; var inR = lo >= 0 && hi >= 0 && j >= lo && j <= hi; return { dim: !inR, mid: j === s.mid, lo: j === lo && j !== s.mid, hi: j === hi && j !== s.mid, span: inR && j !== s.mid && j !== lo && j !== hi }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["arr[mid]", "Сравнение"],
      sumValues: function (s, ctx) { if (typeof s.vars.mid !== "number") return [{ text: "—" }, { text: s.done ? "не найдено" : "—" }]; var am = s.vars["arr[mid]"]; var rel = s.found ? "=" : (am < ctx.target ? "<" : ">"), cls = s.found ? "eq" : (am < ctx.target ? "lt" : "gt"); return [{ text: "arr[" + s.mid + "] = " + am }, { text: am + " " + rel + " " + ctx.target, cls: cls }]; },
      status: function (s, idx, total, ctx) { if (s.found) return { kind: "ok", icon: "✓", head: "Найдено на индексе " + s.mid, text: s.info }; if (s.done) return { kind: "end", icon: idx + 1, head: ctx.target + " не найдено", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
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
      lineNotes: { 1: "Границы поиска + res = −1 (ответа пока нет)", 2: "Заголовок цикла: пока диапазон не пуст (left ≤ right)", 3: "Берём середину диапазона", 4: "arr[mid] равно target?", 5: "Запоминаем индекс в res — но это, возможно, не самое раннее вхождение", 6: "Нашли target — идём ЛЕВЕЕ за более ранним вхождением (right = mid−1)", 7: "Иначе сравниваем: arr[mid] меньше target?", 8: "arr[mid] < target → ищем правее (left = mid+1)", 10: "arr[mid] > target → ищем левее (right = mid−1)", 13: "Возвращаем самый левый найденный индекс" },
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
      lineNotes: { 1: "Начинаем с первого индекса", 2: "Заголовок цикла: пока не прошли весь массив (i < len)", 3: "correct = nums[i]−1 — правильный индекс для текущего значения", 4: "Текущее значение уже стоит на своём месте?", 5: "Число не на месте — меняем его местами с позицией v−1", 7: "Число уже на своём месте — переходим к следующему индексу", 9: "Все числа на местах — массив отсортирован за O(n)" },
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
      varOrder: ["i", "num", "result"],
      varDesc: { i: "Индекс", num: "Текущий элемент", result: "Накопленный XOR", "bin(result)": "Двоичное представление" },
      lineNotes: { 1: "result = 0 — нейтральный элемент для XOR (a ^ 0 = a)", 2: "Перебираем все числа массива", 3: "XOR накапливает: одинаковые числа взаимно гасятся (a ^ a = 0)", 5: "Осталось одиночное число — все пары обнулились" },
      rules: [{ head: "a ^ a = 0", body: "одинаковые обнуляются", cls: "gt" }, { head: "a ^ 0 = a", body: "нейтральный элемент", cls: "lt" }, { head: "Итог", body: "остаётся одиночка", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); return { arr: arr, steps: bBitXor(arr) }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "Single Number (XOR)"; },
      cellState: function (s, j) { if (s.done) return {}; return { found: j < s.primary, lo: j === s.primary }; },
      pointers: function (s) { return { lo: (s.primary == null ? -1 : s.primary), hi: -1 }; },
      sumCells: ["result (XOR)", "Двоичное"],
      sumValues: function (s) { return [{ text: s.vars.result, cls: s.done ? "eq" : "" }, { text: s.vars["bin(result)"] }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Единственное число: " + s.vars.result, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "одиночка", b: "result = " + s.vars.result, c: "готово", cls: "eq" }; return { a: "i=" + s.primary + ", num=" + s.vars.num, b: "result ^= " + s.vars.num, c: "= " + s.vars.result, cls: "lt" }; },
      varsOf: function (s) { return { i: s.vars.i, num: s.vars.num, result: s.vars.result, "bin(result)": s.vars["bin(result)"] }; },
      // Панель битов аккумулятора: 8 ячеек 0/1; на строке result^=num подсвечиваются
      // переключённые биты (где у операнда единицы) — видно, как пары гасят друг друга.
      mapViz: function (parent, ctx) {
        var BITS = 8;
        var wrap = mkEl("div", "algo-tp__map");
        wrap.appendChild(mkEl("div", "algo-tp__maphdr", "result — биты XOR-аккумулятора (8 бит)"));
        var grid = mkEl("div", "algo-tp__mapgrid");
        var cells = [];
        for (var b = BITS - 1; b >= 0; b--) {
          var col = mkEl("div", "algo-tp__mapcell");
          col.appendChild(mkEl("div", "algo-tp__mapkey", "2^" + b));
          var bit = mkEl("div", "algo-tp__mapcnt", "0");
          col.appendChild(bit);
          grid.appendChild(col);
          cells.push({ col: col, bit: bit, b: b });
        }
        wrap.appendChild(grid);
        var dec = mkEl("div", "algo-tp__mapsize", "");
        wrap.appendChild(dec);
        parent.appendChild(wrap);
        return function (s) {
          var r = (typeof s.vars.result === "number") ? s.vars.result : 0;
          var flipping = (s.line === 3 && typeof s.vars.num === "number") ? s.vars.num : 0; // на result^=num подсвечиваем флипнутые биты
          cells.forEach(function (c) {
            var on = (r >> c.b) & 1, flip = (flipping >> c.b) & 1;
            c.bit.textContent = on ? "1" : "0";
            c.col.className = "algo-tp__mapcell" + (on ? " algo-tp__mapcell--on" : " algo-tp__mapcell--off") + (flip ? " algo-tp__mapcell--hot algo-tp__mapcell--dec" : "");
          });
          dec.innerHTML = "";
          dec.appendChild(mkEl("span", "algo-tp__mapsizek", "result = " + r));
          dec.appendChild(mkEl("span", "algo-tp__mapsizecmp", "  (bin " + (r >>> 0).toString(2) + ")"));
        };
      }
    },

    "merge-intervals": {
      badge: "Merge Intervals",
      desc: "Слияние перекрывающихся интервалов после сортировки по началу.",
      valuesLabel: "Интервалы (по началу)", codeKey: "merge-intervals", fillRange: false,
      ptr1: { name: "i", cap: "(текущий)" }, ptr2: { name: "", cap: "" },
      complexity: { time: "O(n log n)", space: "O(n)", good: "★ Расписаний и диапазонов" },
      varOrder: ["i", "interval", "last", "result"],
      varDesc: { i: "Индекс текущего интервала", "interval": "Текущий интервал cur", "last": "Последний в result", "result": "Интервалов в ответе" },
      lineNotes: { 1: "Сортируем интервалы по началу — перекрытия становятся соседями", 2: "result начинается с первого интервала", 3: "Идём по остальным интервалам", 4: "cur — текущий интервал", 5: "last — последний добавленный в result", 6: "Начало cur ≤ конца last → пересекаются?", 7: "Перекрытие: расширяем последний интервал до max концов", 9: "Разрыв: добавляем интервал в результат как новый", 12: "Возвращаем список непересекающихся интервалов" },
      rules: [{ head: "start ≤ конец последнего", body: "→ перекрытие, расширяем", cls: "lt" }, { head: "start > конец последнего", body: "→ разрыв, новый интервал", cls: "gt" }, { head: "Результат", body: "непересекающиеся интервалы", cls: "eq" }],
      parse: function (root) { var raw = (root.getAttribute("data-intervals") || "").split(",").map(function (s) { return s.trim().split("-").map(Number); }).filter(function (p) { return p.length === 2; }); return { ivs: raw.slice().sort(function (a, b) { return a[0] - b[0]; }), steps: bMergeIntervals(raw) }; },
      inputs: [{ attr: "data-intervals", label: "Интервалы a-b,c-d" }],
      values: function (ctx) { return ctx.ivs.map(function (p) { return p[0] + "–" + p[1]; }); },
      title: function () { return "Слияние интервалов"; },
      pointers: function (s) { return { lo: s.cur, hi: -1 }; },
      sumCells: ["Текущий интервал", "Интервалов в ответе"],
      sumValues: function (s) { return [{ text: s.vars.interval }, { text: s.vars.result, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Слито в " + s.vars.result + " интервал(ов)", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars.result + " интервал(ов)", c: "O(n log n)", cls: "eq" }; if (s.cur < 0) return { a: "сортировка", b: "по началу", c: "старт", cls: "lt" }; var merge = s.line === 7; return { a: "интервал " + s.vars.interval, b: merge ? "⊆ последний " + s.vars.last : "разрыв → новый", c: merge ? "слить" : "добавить", cls: merge ? "lt" : "gt" }; },
      varsOf: function (s) { return { i: s.vars.i, "interval": s.vars.interval, "last": s.vars.last, "result": s.vars.result }; },
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
      lineNotes: { 1: "prev — уже развёрнутая часть (вначале nil)", 2: "curr идёт по списку, начинаем с головы", 3: "Пока не дошли до конца списка (curr ≠ nil)", 4: "Сохраняем остаток ДО разворота (иначе потеряем хвост)", 5: "Разворачиваем указатель текущего узла назад: curr.Next = prev", 6: "Сдвигаем prev на текущий узел", 7: "Сдвигаем curr на сохранённый next", 9: "Список кончился — prev стал новой головой" },
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
      varOrder: ["node", "visited", "order"],
      varDesc: { "node": "Текущий узел", "visited": "Сколько узлов посещено", "order": "Порядок обхода" },
      lineNotes: { 2: "Очередь стартует с корня", 3: "order — порядок обхода (накапливаем)", 4: "Пока очередь не пуста — продолжаем", 5: "Берём узел из начала очереди (FIFO)", 6: "Удаляем его из очереди", 7: "Добавляем его значение в порядок обхода", 8: "Левого ребёнка — в конец очереди", 9: "Правого ребёнка — в конец очереди", 11: "Очередь пуста — обход по уровням завершён" },
      rules: [{ head: "Извлекаем из начала", body: "queue[0] (FIFO)", cls: "lt" }, { head: "Детей — в конец", body: "сначала left, потом right", cls: "gt" }, { head: "Уровень за уровнем", body: "ближние раньше дальних", cls: "eq" }],
      parse: function (root) { return bTree(parseTree(root.getAttribute("data-tree")), "bfs"); },
      inputs: [{ attr: "data-tree", label: "Дерево: уровни, null=пусто" }],
      values: function (ctx) { return ctx.present.map(function (i) { return ctx.arr[i]; }); },
      title: function () { return "Обход дерева в ширину (BFS)"; },
      pointers: function (s) { return { lo: s.cur, hi: -1 }; },
      sumCells: ["Текущий узел", "Посещено"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.visited, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Обход завершён", text: s.vars.order }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars.visited, c: "BFS", cls: "eq" }; return { a: "узел " + s.vars.node, b: "в порядок обхода", c: "→", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "visited": s.vars.visited, "order": s.vars.order }; },
      // Панель очереди BFS (значения узлов, FIFO).
      mapViz: function (panel) {
        var p = structPanel(panel, "queue — очередь BFS (FIFO: берём из начала)");
        return function (s) {
          p.grid.innerHTML = "";
          var q = s.queue || [];
          if (!q.length) p.grid.appendChild(structCell("", "∅", "algo-tp__mapcell--off"));
          else q.forEach(function (v, k) { p.grid.appendChild(structCell(k === 0 ? "front" : (k === q.length - 1 ? "back" : ""), v, k === 0 ? "algo-tp__mapcell--on algo-tp__mapcell--hot algo-tp__mapcell--dec" : "algo-tp__mapcell--on")); });
          p.foot.textContent = "в очереди: " + q.length;
        };
      },
      customViz: treeViz
    },

    "tree-dfs": {
      badge: "Tree DFS",
      desc: "Обход дерева в глубину (preorder): корень → левое поддерево → правое.",
      valuesLabel: "Узлы (preorder)", codeKey: "tree-dfs", fillRange: false,
      ptr1: { name: "узел", cap: "(текущий)" }, ptr2: { name: "", cap: "" },
      complexity: { time: "O(n)", space: "O(h)", good: "★ Путей и поддеревьев" },
      varOrder: ["node", "visited", "order"],
      varDesc: { "node": "Текущий узел", "visited": "Сколько узлов посещено", "order": "Порядок обхода (preorder)" },
      lineNotes: { 1: "Дошли до пустого узла — возврат из рекурсии", 2: "Preorder: записываем узел ДО спуска к потомкам", 3: "Рекурсивно обходим левое поддерево", 4: "Затем правое поддерево", 5: "Возврат из всех вызовов = обход завершён" },
      rules: [{ head: "Посетить корень", body: "записать node.Val", cls: "eq" }, { head: "Затем левое", body: "dfs(node.Left)", cls: "lt" }, { head: "Затем правое", body: "dfs(node.Right)", cls: "gt" }],
      parse: function (root) { return bTree(parseTree(root.getAttribute("data-tree")), "dfs"); },
      inputs: [{ attr: "data-tree", label: "Дерево: уровни, null=пусто" }],
      values: function (ctx) { return ctx.present.map(function (i) { return ctx.arr[i]; }); },
      title: function () { return "Обход дерева в глубину (preorder)"; },
      pointers: function (s) { return { lo: s.cur, hi: -1 }; },
      sumCells: ["Текущий узел", "Посещено"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.visited, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Обход завершён", text: s.vars.order }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars.visited, c: "DFS", cls: "eq" }; return { a: "узел " + s.vars.node, b: "preorder", c: "→", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "visited": s.vars.visited, "order": s.vars.order }; },
      // Панель стека рекурсии: путь от корня до текущего вызова (верх = глубже всего).
      mapViz: function (panel) {
        var p = structPanel(panel, "стек вызовов dfs (путь от корня, верх = текущий)");
        return function (s) {
          p.grid.innerHTML = "";
          var st = s.stack || [];
          if (!st.length) p.grid.appendChild(structCell("", "∅", "algo-tp__mapcell--off"));
          else st.forEach(function (v, k) { p.grid.appendChild(structCell(k === st.length - 1 ? "top" : "", v, k === st.length - 1 ? "algo-tp__mapcell--on algo-tp__mapcell--hot algo-tp__mapcell--dec" : "algo-tp__mapcell--on")); });
          p.foot.textContent = "глубина рекурсии: " + st.length;
        };
      },
      customViz: treeViz
    },

    "two-heaps-median": {
      badge: "Two Heaps", desc: "Медиана потока двумя кучами: max-heap (меньшая половина) и min-heap (большая).",
      valuesLabel: "Поток чисел", codeKey: "two-heaps", fillRange: false,
      complexity: { time: "O(log n) вставка", space: "O(n)", good: "★ Медианы потока" },
      varOrder: ["num", "loSize", "hiSize", "median"],
      varDesc: { "num": "Текущее число", "loSize": "Размер max-heap (меньшая)", "hiSize": "Размер min-heap (большая)", "median": "Текущая медиана" },
      lineNotes: { 1: "Сравниваем число с вершиной меньшей половины", 2: "Число ≤ вершины меньшей половины → в max-кучу (меньшая половина)", 4: "Число больше → в min-кучу (большая половина)", 6: "Балансировка: если в меньшей половине на 2 больше — отдаём вершину в большую", 7: "Вершина max-heap уезжает в min-heap", 8: "Иначе: большая половина перевешивает на 2?", 9: "Если в большей на 2 больше — отдаём вершину в меньшую" },
      rules: [{ head: "num ≤ вершины меньшей", body: "→ в max-heap", cls: "lt" }, { head: "иначе", body: "→ в min-heap", cls: "gt" }, { head: "Балансируем", body: "размеры отличаются ≤ 1", cls: "eq" }],
      parse: function (root) { var stream = nums(root.getAttribute("data-stream")); return { stream: stream, steps: bTwoHeaps(stream) }; },
      inputs: [{ attr: "data-stream", label: "Поток (через запятую)" }],
      values: function (ctx) { return ctx.stream; },
      title: function () { return "Медиана потока (две кучи)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Медиана", "Размеры (мен./бол.)"],
      sumValues: function (s) { return [{ text: s.vars.median, cls: "eq" }, { text: s.vars.loSize + " / " + s.vars.hiSize }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Медиана = " + s.vars.median, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "медиана " + s.vars.median, b: "поток обработан", c: "готово", cls: "eq" }; return { a: "+ " + s.vars.num, b: "медиана " + s.vars.median, c: s.line === 2 ? "→ меньшая" : "→ большая", cls: s.line === 2 ? "lt" : "gt" }; },
      varsOf: function (s) { return { "num": s.vars.num, "loSize": s.vars.loSize, "hiSize": s.vars.hiSize, "median": s.vars.median }; },
      customViz: twoHeapsViz
    },

    "top-k": {
      badge: "Top K Elements", desc: "K наибольших элементов через min-heap размера k.",
      valuesLabel: "Массив", codeKey: "top-k", fillRange: false,
      complexity: { time: "O(n log k)", space: "O(k)", good: "★ Топ-K из потока" },
      varOrder: ["num", "heapSize", "popped"],
      varDesc: { "num": "Текущий элемент", "heapSize": "Размер кучи / k", "popped": "Выкинутый минимум" },
      lineNotes: { 1: "Заводим пустую min-кучу", 2: "Перебираем элементы потока", 3: "Кладём элемент в min-кучу", 4: "Куча переросла k?", 5: "Куча переросла k — выкидываем минимум (он не входит в топ-K)", 8: "В куче остались k наибольших элементов" },
      rules: [{ head: "Push элемент", body: "в min-heap", cls: "lt" }, { head: "Размер > k", body: "→ Pop минимум", cls: "gt" }, { head: "Итог", body: "в куче k наибольших", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var k = parseInt(root.getAttribute("data-k"), 10); return { arr: arr, k: k, steps: bTopK(arr, k) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-k", label: "k", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return ctx.k + " наибольших элементов"; },
      param: function (ctx) { return { label: "K", value: ctx.k }; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Куча (k наиб.)", "Размер"],
      sumValues: function (s) { return [{ text: "[" + (s.heap || []).join(",") + "]", cls: "eq" }, { text: s.vars.heapSize }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: ctx.k + " наибольших", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "топ-K", b: "[" + (s.heap || []).join(",") + "]", c: "готово", cls: "eq" }; var pop = s.line === 5; return { a: "+ " + s.vars.num, b: "куча [" + (s.heap || []).join(",") + "]", c: pop ? "pop " + s.vars.popped : "push", cls: pop ? "gt" : "lt" }; },
      varsOf: function (s) { return { "num": s.vars.num, "heapSize": s.vars.heapSize, "popped": s.vars.popped }; },
      customViz: topKViz
    },

    "k-way-merge": {
      badge: "K-way Merge", desc: "Слияние K отсортированных списков в один через min-heap голов.",
      valuesLabel: "Списки", codeKey: "k-way-merge", fillRange: false,
      complexity: { time: "O(n log k)", space: "O(k)", good: "★ Слияния K списков" },
      varOrder: ["min", "list", "outLen"],
      varDesc: { "min": "Минимальная голова", "list": "Из какого списка", "outLen": "Длина результата" },
      lineNotes: { 1: "Заводим min-кучу из троек (значение, список, индекс)", 2: "Перебираем списки", 3: "Кладём в кучу первый элемент каждого списка", 5: "out — итоговый отсортированный список", 6: "Пока куча не пуста — продолжаем", 7: "Достаём минимальную из голов — это следующий элемент ответа", 8: "Добавляем минимум в результат", 9: "Есть ли в этом списке следующий элемент?", 10: "Подкладываем следующий элемент из того же списка", 13: "Все списки слиты в один отсортированный" },
      rules: [{ head: "Минимум среди голов", body: "из K указателей", cls: "lt" }, { head: "В результат", body: "и двигаем указатель", cls: "eq" }, { head: "Повторяем", body: "пока есть головы", cls: "gt" }],
      parse: function (root) { var lists = (root.getAttribute("data-lists") || "").split(";").map(function (s) { return s.split(",").map(Number); }); return { lists: lists, steps: bKwayMerge(lists) }; },
      inputs: [{ attr: "data-lists", label: "Списки a,b;c,d" }],
      values: function () { return []; },
      title: function () { return "Слияние K отсортированных списков"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Минимум", "В результате"],
      sumValues: function (s) { return [{ text: s.vars.min, cls: "eq" }, { text: s.vars.outLen }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Слито в один список", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars.outLen + " элементов", c: "merge", cls: "eq" }; if (s.pick == null) return { a: "K списков", b: "min-heap голов", c: "старт", cls: "lt" }; return { a: "min = " + s.vars.min, b: "список " + s.vars.list, c: "→ результат", cls: "lt" }; },
      varsOf: function (s) { return { "min": s.vars.min, "list": s.vars.list, "outLen": s.vars.outLen }; },
      // Панель содержимого min-кучи: текущие головы списков, сверху минимум (его извлечём).
      mapViz: function (panel) {
        var p = structPanel(panel, "h — min-куча голов (значение : список), сверху min");
        return function (s) {
          p.grid.innerHTML = "";
          var h = (s.heap || []).slice().sort(function (a, b) { return a.v - b.v; });
          if (!h.length) p.grid.appendChild(structCell("", "∅", "algo-tp__mapcell--off"));
          else h.forEach(function (e, k) { p.grid.appendChild(structCell("L" + (e.li + 1), e.v, k === 0 ? "algo-tp__mapcell--on algo-tp__mapcell--hot algo-tp__mapcell--dec" : "algo-tp__mapcell--on")); });
          p.foot.textContent = "в куче голов: " + h.length;
        };
      },
      customViz: kwayViz
    },

    "subsets-bt": {
      badge: "Backtracking", desc: "Генерация всех подмножеств: выбрать → рекурсия → откат.",
      valuesLabel: "Множество", codeKey: "subsets-bt", fillRange: false,
      complexity: { time: "O(n·2ⁿ)", space: "O(n)", good: "★ Перебор всех вариантов" },
      varOrder: ["action", "cur", "count"],
      varDesc: { "action": "Текущий шаг", "cur": "Текущее частичное решение", "count": "Сколько подмножеств найдено" },
      lineNotes: { 5: "Записываем текущее частичное подмножество в ответ", 6: "Перебираем элементы начиная со start (без повторов)", 7: "Выбираем элемент i — добавляем в текущее", 8: "Рекурсивно перебираем оставшиеся элементы", 9: "Откат: убираем элемент, чтобы попробовать другие ветки", 13: "Все подмножества (2ⁿ) собраны" },
      rules: [{ head: "Выбрать элемент", body: "append → рекурсия", cls: "lt" }, { head: "Записать", body: "current → результат", cls: "eq" }, { head: "Откат", body: "pop, пробуем дальше", cls: "gt" }],
      parse: function (root) { var set = nums(root.getAttribute("data-set")); return { set: set, steps: bSubsets(set) }; },
      inputs: [{ attr: "data-set", label: "Множество" }],
      values: function (ctx) { return ctx.set; },
      title: function () { return "Все подмножества (backtracking)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущее", "Найдено подмножеств"],
      sumValues: function (s) { return [{ text: s.vars.cur }, { text: s.vars.count, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: s.vars.count + " подмножеств", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars.count + " шт.", c: "backtrack", cls: "eq" }; var cls = s.action === "choose" ? "lt" : (s.action === "back" ? "gt" : "eq"); return { a: s.vars.action, b: s.vars.cur, c: s.action === "record" ? "записать" : (s.action === "choose" ? "выбор" : (s.action === "back" ? "откат" : "→")), cls: cls }; },
      varsOf: function (s) { return { "action": s.vars.action, "cur": s.vars.cur, "count": s.vars.count }; },
      customViz: subsetsViz
    },

    "jump-game": {
      badge: "Greedy", desc: "Jump Game: можно ли допрыгнуть до конца, ведя самую дальнюю достижимую позицию.",
      valuesLabel: "Массив (макс. прыжок)", codeKey: "jump-game", fillRange: false,
      ptr1: { name: "i", cap: "(текущий)" }, ptr2: { name: "", cap: "" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Жадных проходов" },
      varOrder: ["i", "nums[i]", "maxReach"],
      varDesc: { i: "Текущий индекс", "nums[i]": "Сколько шагов вперёд", maxReach: "Самая дальняя достижимая позиция" },
      lineNotes: { 1: "maxReach = 0 — пока достижим только стартовый индекс", 2: "Идём по индексам слева направо", 3: "Текущий индекс вообще достижим (i ≤ maxReach)?", 4: "Индекс i недостижим (i > maxReach) — допрыгнуть нельзя", 6: "Можно ли прыгнуть дальше текущего maxReach?", 7: "Обновляем самую дальнюю достижимую позицию: i + nums[i]", 10: "Дошли до конца — последний индекс достижим" },
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
      varOrder: ["node", "order"],
      varDesc: { "node": "Извлечённая вершина (текущий узел)", "order": "Порядок обхода" },
      lineNotes: { 1: "visited — массив посещённости вершин (все false)", 2: "Очередь BFS стартует со стартовой вершины", 3: "Помечаем старт посещённым ДО очереди (чтобы не добавить дважды)", 4: "order — порядок обхода (накапливаем по мере извлечения)", 5: "Пока очередь не пуста — продолжаем обход", 6: "Берём вершину из НАЧАЛА очереди (FIFO)", 7: "Удаляем её из очереди", 8: "Фиксируем вершину в порядке обхода", 9: "Перебираем соседей текущей вершины", 10: "Сосед ещё не посещён?", 11: "Соседа помечаем посещённым сразу при добавлении в очередь", 12: "Кладём соседа в КОНЕЦ очереди", 16: "Очередь опустела — возвращаем порядок обхода" },
      rules: [{ head: "Извлекаем из начала", body: "queue[0] (FIFO)", cls: "lt" }, { head: "Соседей — в конец", body: "если ещё не посещены", cls: "gt" }, { head: "Ближние раньше", body: "обход по слоям", cls: "eq" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = parseEdges(root.getAttribute("data-edges")); var start = parseInt(root.getAttribute("data-start") || "0", 10); return { labels: labels, edges: edges, start: start, steps: bGraphBfs(labels, edges, start) }; },
      inputs: [{ attr: "data-nodes", label: "Вершины" }, { attr: "data-edges", label: "Рёбра a-b" }, { attr: "data-start", label: "старт", sm: true }],
      values: function (ctx) { return ctx.labels; },
      title: function () { return "Обход графа в ширину (BFS)"; },
      legend: [{ cls: "current", label: "текущая" }, { cls: "visited", label: "посещена" }, { cls: "idle", label: "не обработана" }],
      pointers: function (s) { return { lo: s.current, hi: -1 }; },
      sumCells: ["Извлекли", "Очередь"],
      sumValues: function (s) { return [{ text: s.vars["узел"] }, { text: s.vars["очередь"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Обход завершён", text: s.vars["порядок"] }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars["порядок"], c: "BFS", cls: "eq" }; if (s.current < 0) return { a: "старт", b: "очередь " + s.vars["очередь"], c: "→", cls: "lt" }; return { a: "узел " + s.vars["узел"], b: "очередь " + s.vars["очередь"], c: "→", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars["узел"], "order": s.vars["порядок"] }; },
      // Панель очереди BFS (FIFO): берём из начала (front), добавляем в конец (back).
      mapViz: function (panel, ctx) {
        var labels = ctx.labels;
        var p = structPanel(panel, "queue — очередь BFS (FIFO: берём из начала)");
        return function (s) {
          p.grid.innerHTML = "";
          var q = s.queue || [];
          if (!q.length) p.grid.appendChild(structCell("", "∅", "algo-tp__mapcell--off"));
          else q.forEach(function (nd, k) { p.grid.appendChild(structCell(k === 0 ? "front" : (k === q.length - 1 ? "back" : ""), labels[nd], k === 0 ? "algo-tp__mapcell--on algo-tp__mapcell--hot algo-tp__mapcell--dec" : "algo-tp__mapcell--on")); });
          p.foot.textContent = "в очереди: " + q.length;
        };
      },
      customViz: graphViz
    },

    "grid-bfs": {
      badge: "Grid BFS", desc: "Кратчайший путь по сетке (BFS): движемся по 4 направлениям, минуя стены.",
      valuesLabel: "", codeKey: "grid-bfs", fillRange: false,
      complexity: { time: "O(R·C)", space: "O(R·C)", good: "★ Кратчайший путь по сетке" },
      varOrder: ["cell", "dist", "visited"],
      varDesc: { "cell": "Текущая клетка (r,c)", "dist": "Шагов от старта", "visited": "Сколько клеток посещено" },
      lineNotes: { 2: "dist[][] = -1 — расстояния неизвестны (метка «не посещено»)", 3: "Очередь стартует со стартовой клетки (0,0)", 4: "Старт (0,0): расстояние 0", 5: "Пока очередь не пуста — продолжаем", 6: "Достаём клетку из НАЧАЛА очереди (FIFO)", 7: "Дошли до правого нижнего угла — возвращаем расстояние", 9: "Сосед по одному из 4 направлений", 10: "Сосед в поле, не стена и ещё не посещён?", 11: "Сосед свободен — расстояние +1 (на шаг дальше текущей)", 12: "Кладём соседа в КОНЕЦ очереди", 16: "Очередь пуста, до выхода не дошли — пути нет" },
      rules: [{ head: "Очередь клеток", body: "обрабатываем послойно (FIFO)", cls: "lt" }, { head: "4 направления", body: "вверх/вниз/влево/вправо, не стены", cls: "gt" }, { head: "Первая встреча цели", body: "= кратчайшее расстояние", cls: "eq" }],
      parse: function (root) { var grid = (root.getAttribute("data-grid") || "").split(";").map(function (r) { return r.split(",").map(Number); }); return bGridBfs(grid); },
      inputs: [{ attr: "data-grid", label: "Сетка строки;через; запятую (0/1)" }],
      values: function () { return []; },
      title: function () { return "Кратчайший путь по сетке (BFS)"; },
      legend: [{ cls: "current", label: "текущая клетка" }, { cls: "visited", label: "посещена" }, { cls: "wall", label: "стена" }, { cls: "idle", label: "не дошли" }],
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущая клетка", "Расстояние"],
      sumValues: function (s) { return [{ text: s.vars["клетка"] }, { text: s.vars["расстояние"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.found) return { kind: "ok", icon: "✓", head: "Цель достигнута", text: "расстояние = " + s.vars["расстояние"] }; if (s.done) return { kind: "end", icon: idx + 1, head: "Путь не найден", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "цель!", b: "расстояние " + s.vars["расстояние"], c: "найдено", cls: "eq" }; if (s.done) return { a: "тупик", b: "пути нет", c: "−1", cls: "gt" }; return { a: "клетка " + s.vars["клетка"], b: "dist " + s.vars["расстояние"], c: "→", cls: "lt" }; },
      varsOf: function (s) { return { "cell": s.vars["клетка"], "dist": s.vars["расстояние"], "visited": s.vars["посещено"] }; },
      // Панель очереди клеток BFS (FIFO), у каждой — её расстояние от старта.
      mapViz: function (panel) {
        var p = structPanel(panel, "queue — очередь клеток (FIFO), снизу их dist");
        return function (s) {
          p.grid.innerHTML = "";
          var q = s.queue || [];
          if (!q.length) p.grid.appendChild(structCell("", "∅", "algo-tp__mapcell--off"));
          else q.forEach(function (c, k) { p.grid.appendChild(structCell("(" + c[0] + "," + c[1] + ")", "d=" + c[2], k === 0 ? "algo-tp__mapcell--on algo-tp__mapcell--hot algo-tp__mapcell--dec" : "algo-tp__mapcell--on")); });
          p.foot.textContent = "в очереди: " + q.length;
        };
      },
      customViz: gridViz
    },

    "topo-kahn": {
      badge: "Topological Sort", desc: "Топологический порядок (алгоритм Кана): убираем вершины с нулевой входящей степенью.",
      valuesLabel: "Вершины", codeKey: "topo-kahn", fillRange: false,
      complexity: { time: "O(V+E)", space: "O(V)", good: "★ Зависимостей и порядка" },
      varOrder: ["node", "order"],
      varDesc: { "node": "Убираемая вершина", "order": "Топологический порядок" },
      lineNotes: { 1: "Считаем входящие степени всех вершин", 2: "В очередь — все вершины, в которые НЕ входит ни одного ребра", 3: "order — топологический порядок (накапливаем)", 4: "Пока очередь не пуста — продолжаем", 5: "Берём вершину из очереди (её зависимости уже сняты)", 6: "Добавляем вершину в порядок", 7: "Перебираем рёбра вершины (её соседей)", 8: "Убираем ребро: уменьшаем входящую степень соседа", 9: "Если входящая соседа стала 0 — он тоже готов, в очередь", 12: "В порядок попали не все вершины → в графе есть цикл" },
      rules: [{ head: "Входящая степень 0", body: "→ можно убирать", cls: "lt" }, { head: "Убрали вершину", body: "уменьшаем степени соседей", cls: "eq" }, { head: "Нет степени 0", body: "→ в графе цикл", cls: "gt" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = (root.getAttribute("data-edges") || "").split(",").map(function (e) { return e.trim().split("-"); }).map(function (p) { return [labels.indexOf(p[0]), labels.indexOf(p[1])]; }).filter(function (p) { return p[0] >= 0 && p[1] >= 0; }); return { labels: labels, edges: edges, steps: bTopoKahn(labels, edges) }; },
      inputs: [{ attr: "data-nodes", label: "Вершины" }, { attr: "data-edges", label: "Рёбра a-b (ориент.)" }],
      values: function (ctx) { return ctx.labels; },
      title: function () { return "Топологическая сортировка (Кан)"; },
      legend: [{ cls: "current", label: "убираем сейчас" }, { cls: "visited", label: "уже в порядке" }, { cls: "idle", label: "ждёт (indegree>0)" }],
      pointers: function (s) { return { lo: s.cur, hi: -1 }; },
      sumCells: ["Убрали", "Степень 0"],
      sumValues: function (s) { return [{ text: s.vars["узел"] }, { text: s.vars["входящая 0"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.found) return { kind: "ok", icon: "✓", head: "Топологический порядок", text: s.vars["порядок"] }; if (s.done) return { kind: "end", icon: idx + 1, head: "Цикл в графе!", text: "топопорядок невозможен" }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "готово", b: s.vars["порядок"], c: "topo", cls: "eq" }; if (s.done) return { a: "цикл!", b: "степени 0 нет", c: "стоп", cls: "gt" }; if (s.cur < 0) return { a: "старт", b: "степени посчитаны", c: "→", cls: "lt" }; return { a: "убрали " + s.vars["узел"], b: "след. 0: " + s.vars["входящая 0"], c: "→", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars["узел"], "order": s.vars["порядок"] }; },
      // Панель очереди готовых вершин (входящая степень 0) + индегри видны бейджами на графе.
      mapViz: function (panel, ctx) {
        var labels = ctx.labels;
        var p = structPanel(panel, "queue — вершины с входящей степенью 0 (готовы к выводу)");
        return function (s) {
          p.grid.innerHTML = "";
          var q = s.queue || [];
          if (!q.length) p.grid.appendChild(structCell("", "∅", "algo-tp__mapcell--off"));
          else q.forEach(function (nd, k) { p.grid.appendChild(structCell(k === 0 ? "front" : "", labels[nd], k === 0 ? "algo-tp__mapcell--on algo-tp__mapcell--hot algo-tp__mapcell--dec" : "algo-tp__mapcell--on")); });
          p.foot.textContent = "готовых вершин: " + q.length;
        };
      },
      customViz: topoViz
    },

    "dp-coins": {
      badge: "Dynamic Programming", desc: "Coin Change: dp[a] = минимум монет на сумму a, перебираем каждую монету.",
      valuesLabel: "Таблица dp[]", codeKey: "dp-coins", fillRange: false,
      ptr1: { name: "a", cap: "(сумма)" }, ptr2: { name: "a−c", cap: "(источник)" },
      complexity: { time: "O(amount·k)", space: "O(amount)", good: "★ Перекрывающихся подзадач" },
      varOrder: ["a", "c", "dp[a−c]", "best", "dp[a]"],
      varDesc: { a: "Текущая сумма", c: "Текущая монета", "dp[a−c]": "Подзадача: сумма без монеты", best: "Лучший минимум", "dp[a]": "Ответ для суммы a" },
      lineNotes: { 1: "dp[s] — минимум монет на сумму s; dp[0]=0, остальное ∞", 2: "Заполняем dp по возрастанию суммы a", 3: "Ищем лучший (минимальный) размен для суммы a", 4: "Перебираем каждую монету", 5: "Монета помещается и даёт размен короче текущего best?", 6: "Берём монету c: размен = dp[a−c] + 1, если он меньше", 9: "Записываем найденный минимум в dp[a]", 11: "dp[amount] — ответ (∞, если размен невозможен)" },
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
      varOrder: ["char", "node", "isWord"],
      varDesc: { "char": "Текущий символ запроса", "node": "Текущий узел дерева", "isWord": "Конец вставленного слова (isEnd)" },
      lineNotes: { 1: "Стартуем с корня дерева", 2: "Идём по символам слова", 3: "Берём текущий символ", 4: "Есть ли у узла потомок по этому символу?", 5: "Нет потомка для символа — такого слова/префикса нет", 7: "Спускаемся в потомка по текущему символу", 9: "Путь есть; isEnd говорит, было ли это слово вставлено целиком" },
      rules: [{ head: "Есть ребёнок по символу", body: "→ спускаемся", cls: "lt" }, { head: "Нет ребёнка", body: "→ слова/префикса нет", cls: "gt" }, { head: "Конец пути + isEnd", body: "→ это слово", cls: "eq" }],
      parse: function (root) { var words = (root.getAttribute("data-words") || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); var query = (root.getAttribute("data-query") || "").trim(); var r = bTrie(words, query); return { words: words, query: query, nodes: r.nodes, path: r.path, steps: r.steps }; },
      inputs: [{ attr: "data-words", label: "Слова (через запятую)" }, { attr: "data-query", label: "запрос" }],
      values: function () { return []; },
      title: function (ctx) { return "Trie: поиск «" + ctx.query + "»"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Это слово?"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.isWord, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.found) return { kind: "ok", icon: "✓", head: "«" + ctx.query + "» найдено как слово", text: s.info }; if (s.done) return { kind: "end", icon: idx + 1, head: "«" + ctx.query + "» — не слово", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "найдено", b: "это слово", c: "✓", cls: "eq" }; if (s.done) return { a: s.vars.node === "нет" ? "символа нет" : "только префикс", b: "не слово", c: "✗", cls: "gt" }; return { a: "символ '" + s.vars.char + "'", b: "узел «" + s.vars.node + "»", c: "↓", cls: "lt" }; },
      varsOf: function (s) { return { "char": s.vars.char, "node": s.vars.node, "isWord": s.vars.isWord }; },
      customViz: trieViz
    },

    "kmp": {
      badge: "String Matching", desc: "KMP: образец скользит под текстом; при несовпадении сдвиг по префикс-функции.",
      valuesLabel: "", codeKey: "kmp", fillRange: false,
      complexity: { time: "O(n+m)", space: "O(m)", good: "★ Поиск подстроки" },
      varOrder: ["i", "j", "shift", "compare"],
      varDesc: { "i": "Указатель в тексте (не откатывается)", "j": "Указатель в образце", "shift": "Позиция образца под текстом (i−j)", "compare": "Сравниваемые символы" },
      lineNotes: { 1: "lps — префикс-функция образца (для умного сдвига)", 2: "i — в текст, j — в образец", 3: "Пока не дошли до конца текста", 4: "Сравниваем text[i] и pat[j]", 5: "Символы совпали — двигаем оба указателя вперёд", 6: "j дошёл до конца образца — нашли вхождение", 8: "Несовпадение: откатываем j по префикс-функции (i не трогаем)", 10: "Несовпадение в начале образца (j=0) — двигаем только i", 13: "Дошли до конца текста без совпадения" },
      rules: [{ head: "Символы совпали", body: "→ i++, j++", cls: "eq" }, { head: "Несовпадение, j>0", body: "→ j = lps[j−1]", cls: "gt" }, { head: "Несовпадение, j=0", body: "→ i++", cls: "lt" }],
      parse: function (root) { var text = root.getAttribute("data-text") || ""; var pattern = root.getAttribute("data-pattern") || ""; return { text: text, pattern: pattern, steps: bKMP(text, pattern) }; },
      inputs: [{ attr: "data-text", label: "Текст" }, { attr: "data-pattern", label: "Образец" }],
      values: function () { return []; },
      title: function (ctx) { return "KMP: поиск «" + ctx.pattern + "»"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Символы", "Сдвиг образца"],
      sumValues: function (s) { return [{ text: s.vars.compare }, { text: s.vars.shift, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.found) return { kind: "ok", icon: "✓", head: "Образец найден на позиции " + s.shift, text: s.info }; if (s.done) return { kind: "end", icon: idx + 1, head: "Образец не найден", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "найдено", b: "позиция " + s.shift, c: "✓", cls: "eq" }; if (s.done) return { a: "не найдено", b: "конец текста", c: "−1", cls: "gt" }; return { a: "i=" + s.i + ", j=" + s.j, b: s.vars.compare, c: s.match ? "совпало" : "сдвиг", cls: s.match ? "eq" : "gt" }; },
      varsOf: function (s) { return { "i": s.vars.i, "j": s.vars.j, "shift": s.vars.shift, "compare": s.vars.compare }; },
      // Панель префикс-функции lps[]: на сдвиге (строка 8) подсвечивается lps[j−1].
      mapViz: function (panel, ctx) {
        var pat = ctx.pattern;
        var p = structPanel(panel, "lps — префикс-функция образца «" + pat + "»");
        var cells = [];
        for (var k = 0; k < pat.length; k++) { var c = structCell(pat[k] + " [" + k + "]", "0", "algo-tp__mapcell--on"); cells.push(c); p.grid.appendChild(c); }
        return function (s) {
          var lps = s.lps || [];
          cells.forEach(function (col, k) { col.lastChild.textContent = (lps[k] == null ? 0 : lps[k]); col.className = "algo-tp__mapcell algo-tp__mapcell--on" + (k === s.lpsActive ? " algo-tp__mapcell--hot algo-tp__mapcell--dec" : ""); });
          p.foot.textContent = "lps[k] = длина наибольшего префикса-суффикса pat[0..k]";
        };
      },
      customViz: kmpViz
    },

    "fenwick-prefix": {
      badge: "Fenwick Tree", desc: "Префиксная сумма через дерево Фенвика (BIT): складываем зоны ответственности узлов.",
      valuesLabel: "Массив", codeKey: "fenwick-prefix", fillRange: true,
      ptr1: { name: "lo", cap: "(начало зоны)" }, ptr2: { name: "hi", cap: "(конец зоны)" },
      complexity: { time: "O(log n)", space: "O(n)", good: "★ Префиксных сумм с обновлением" },
      varOrder: ["i", "range", "sum"],
      varDesc: { "i": "Номер узла BIT (1-индекс)", "range": "Покрываемый диапазон", "sum": "Накопленная префиксная сумма" },
      lineNotes: { 1: "sum = 0; i — индекс в BIT (1-индексация)", 2: "Поднимаемся по BIT, пока i > 0", 3: "Прибавляем сумму зоны ответственности узла i", 4: "Переходим к родителю, сбрасывая младший единичный бит: i −= i & (−i)", 6: "Накоплена префиксная сумма на диапазоне [1..i]" },
      rules: [{ head: "Зона узла i", body: "[i − lowbit + 1 .. i]", cls: "lt" }, { head: "Складываем", body: "sum += tree[i]", cls: "eq" }, { head: "i −= i&(−i)", body: "переход к родителю", cls: "gt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var target = parseInt(root.getAttribute("data-index"), 10); return { arr: arr, target: target, steps: bFenwick(arr, target) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-index", label: "индекс", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return "Fenwick: префиксная сумма до индекса " + ctx.target; },
      param: function (ctx) { return { label: "Индекс", value: ctx.target }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Зона узла", "Итог суммы"],
      sumValues: function (s) { return [{ text: s.vars.range }, { text: s.vars.sum, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "PrefixSum(0.." + ctx.target + ") = " + s.vars.sum, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "сумма = " + s.vars.sum, c: "O(log n)", cls: "eq" }; return { a: "узел " + s.vars.i, b: "зона " + s.vars.range, c: "итог " + s.vars.sum, cls: "lt" }; },
      varsOf: function (s) { return { "i": s.vars.i, "range": s.vars.range, "sum": s.vars.sum }; }
    },

    "segtree-query": {
      badge: "Segment Tree", desc: "Дерево отрезков: сумма на диапазоне разбивается на готовые суммы поддеревьев.",
      valuesLabel: "", codeKey: "segtree-query", fillRange: false,
      complexity: { time: "O(log n)", space: "O(n)", good: "★ Запросов на диапазоне" },
      varOrder: ["node", "nodeSum", "total"],
      varDesc: { "node": "Текущий отрезок узла", "nodeSum": "Сумма в этом узле", "total": "Накопленный ответ" },
      lineNotes: { 1: "Отрезок узла полностью вне запроса?", 2: "Отрезок узла вне запроса — его вклад 0", 4: "Отрезок узла целиком внутри запроса?", 5: "Отрезок узла целиком внутри запроса — берём готовую сумму", 7: "Частичное пересечение — берём середину mid", 8: "Спускаемся в левого ребёнка", 9: "...и в правого, складываем результаты" },
      rules: [{ head: "Узел вне запроса", body: "→ пропускаем (skip)", cls: "gt" }, { head: "Узел целиком внутри", body: "→ берём его сумму (take)", cls: "eq" }, { head: "Частичное пересечение", body: "→ спускаемся к детям (split)", cls: "lt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var ql = parseInt(root.getAttribute("data-l"), 10); var qr = parseInt(root.getAttribute("data-r"), 10); var r = bSegQuery(arr, ql, qr); return { arr: arr, ql: ql, qr: qr, nodes: r.nodes, nodeStep: r.nodeStep, nodeState: r.nodeState, steps: r.steps }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-l", label: "l", sm: true }, { attr: "data-r", label: "r", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "Дерево отрезков: сумма на [" + ctx.ql + "," + ctx.qr + "]"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Итог суммы"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.total, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Сумма на [" + ctx.ql + "," + ctx.qr + "] = " + s.vars.total, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "сумма = " + s.vars.total, c: "O(log n)", cls: "eq" }; var st = s.line === 5 ? { c: "take", cls: "eq" } : (s.line === 2 ? { c: "skip", cls: "gt" } : { c: "split", cls: "lt" }); return { a: "узел " + s.vars.node, b: "сумма " + s.vars.nodeSum, c: st.c, cls: st.cls }; },
      varsOf: function (s) { return { "node": s.vars.node, "nodeSum": s.vars.nodeSum, "total": s.vars.total }; },
      customViz: segViz
    },

    "mst-kruskal": {
      badge: "MST · Kruskal", desc: "Минимальное остовное дерево: берём лёгкие рёбра, если они не создают цикл (Union-Find).",
      valuesLabel: "", codeKey: "mst-kruskal", fillRange: false,
      complexity: { time: "O(E log E)", space: "O(V)", good: "★ Минимального остова" },
      varOrder: ["edge", "weight", "mstWeight"],
      varDesc: { "edge": "Рассматриваемое ребро", "weight": "Вес ребра", "mstWeight": "Суммарный вес остова" },
      lineNotes: { 1: "Сортируем рёбра по возрастанию веса — берём дешёвые первыми", 2: "Union-Find: вначале каждая вершина — отдельная компонента", 3: "total — суммарный вес остова (накапливаем)", 4: "Перебираем рёбра от самого лёгкого к тяжёлому", 5: "Концы в разных компонентах? Union объединяет их", 6: "Ребро не создаёт цикл — берём его в остов", 7: "Концы в одной компоненте — ребро замкнуло бы цикл, пропускаем", 9: "Все вершины связаны — суммарный вес минимального остова" },
      rules: [{ head: "Разные компоненты", body: "→ берём ребро (Union)", cls: "eq" }, { head: "Одна компонента", body: "→ цикл, пропускаем", cls: "gt" }, { head: "По возрастанию веса", body: "сначала лёгкие рёбра", cls: "lt" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = (root.getAttribute("data-edges") || "").split(",").map(function (e) { return e.trim().split("-"); }).map(function (p) { return { u: labels.indexOf(p[0]), v: labels.indexOf(p[1]), w: Number(p[2]) }; }).filter(function (e) { return e.u >= 0 && e.v >= 0; }); var r = bMstKruskal(labels, edges); return { labels: labels, edges: edges, edgeStep: r.edgeStep, edgeState: r.edgeState, steps: r.steps }; },
      inputs: [{ attr: "data-nodes", label: "Вершины" }, { attr: "data-edges", label: "Рёбра a-b-вес" }],
      values: function () { return []; },
      title: function () { return "MST: алгоритм Краскала"; },
      legend: [{ cls: "mst", label: "ребро в MST" }, { cls: "skipedge", label: "пропущено (цикл)" }, { cls: "curedge", label: "рассматриваем" }],
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Ребро (вес)", "Вес MST"],
      sumValues: function (s) { return [{ text: s.vars["ребро"] === "—" ? "—" : s.vars["ребро"] + " (" + s.vars["вес"] + ")" }, { text: s.vars["вес MST"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Остов построен", text: "суммарный вес = " + s.vars["вес MST"] }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "MST готов", b: "вес " + s.vars["вес MST"], c: "Kruskal", cls: "eq" }; if (s.line === 1) return { a: "сортировка", b: "по весу", c: "старт", cls: "lt" }; var add = s.line === 6; return { a: "ребро " + s.vars["ребро"], b: "вес " + s.vars["вес"], c: add ? "берём" : "цикл → пропуск", cls: add ? "eq" : "gt" }; },
      varsOf: function (s) { return { "edge": s.vars["ребро"], "weight": s.vars["вес"], "mstWeight": s.vars["вес MST"] }; },
      // Панель Union-Find: лес компонент. Для каждой вершины показываем parent[i];
      // корни (parent==self) подсвечены; на Union две сливающиеся компоненты вспыхивают.
      mapViz: function (panel, ctx) {
        var labels = ctx.labels, n = labels.length;
        var wrap = mkEl("div", "algo-tp__map");
        wrap.appendChild(mkEl("div", "algo-tp__maphdr", "Union-Find: parent[] (лес компонент)"));
        var grid = mkEl("div", "algo-tp__mapgrid");
        var cells = [];
        for (var i = 0; i < n; i++) {
          var col = mkEl("div", "algo-tp__mapcell");
          col.appendChild(mkEl("div", "algo-tp__mapkey", labels[i]));
          cells.push({ col: col, par: col.appendChild(mkEl("div", "algo-tp__mapcnt", labels[i])) });
          grid.appendChild(col);
        }
        wrap.appendChild(grid);
        var comp = mkEl("div", "algo-tp__mapsize", "");
        wrap.appendChild(comp);
        panel.appendChild(wrap);
        function rootOf(par, x) { var g = 0; while (par[x] !== x && g++ < par.length + 2) x = par[x]; return x; }
        return function (s) {
          var par = s.parent || labels.map(function (_, i) { return i; });
          var hot = {};
          if (s.roots) { hot[rootOf(par, s.roots[0])] = true; hot[rootOf(par, s.roots[1])] = true; }
          cells.forEach(function (c, i) {
            var isRoot = par[i] === i;
            c.par.textContent = labels[par[i]];
            c.col.className = "algo-tp__mapcell" + (isRoot ? " algo-tp__mapcell--on" : " algo-tp__mapcell--off") + (hot[i] ? " algo-tp__mapcell--hot algo-tp__mapcell--" + (s.merged ? "add" : "del") : "");
          });
          var groups = {};
          for (var i = 0; i < n; i++) { var r = rootOf(par, i); (groups[r] = groups[r] || []).push(labels[i]); }
          var sets = Object.keys(groups).map(function (r) { return "{" + groups[r].join(",") + "}"; }).join("  ");
          comp.innerHTML = "";
          comp.appendChild(mkEl("span", "algo-tp__mapsizek", "компонент: " + Object.keys(groups).length + "  "));
          comp.appendChild(mkEl("span", "algo-tp__mapsizecmp", sets));
        };
      },
      customViz: mstViz
    },

    "dijkstra": {
      badge: "Dijkstra", desc: "Кратчайшие пути от источника при неотрицательных весах: жадно финализируем ближайшую вершину и релаксируем её рёбра.",
      valuesLabel: "", codeKey: "dijkstra", fillRange: false,
      complexity: { time: "O((V+E) log V)", space: "O(V)", good: "★ Кратчайшие пути, неотриц. веса" },
      varOrder: ["u", "dist[u]", "edge", "dist[v]"],
      varDesc: { "u": "Извлечённая (финализированная) вершина", "dist[u]": "Её окончательное расстояние", "edge": "Релаксируемое ребро u→v (вес)", "dist[v]": "Расстояние до соседа: было → стало" },
      lineNotes: { 1: "dist[]: всё ∞, кроме источника (dist[src]=0)", 2: "Кладём источник в мин-кучу (приоритетную очередь)", 3: "Пока очередь не пуста — продолжаем", 4: "Извлекаем вершину с минимальной оценкой — её расстояние финально", 5: "Оценка больше уже известного dist — это устаревшая запись, пропускаем", 6: "Перебираем исходящие рёбра вершины u", 7: "Релаксация: новый путь dist[u]+w короче текущего dist[v]?", 8: "Короче → обновляем dist[v]", 9: "Кладём новую запись (v, новое расстояние) в очередь", 13: "Очередь пуста — все кратчайшие расстояния найдены" },
      rules: [{ head: "Извлекаем минимум", body: "ближайшая вершина — финал", cls: "lt" }, { head: "dist[u]+w < dist[v]", body: "→ релаксируем dist[v]", cls: "eq" }, { head: "Оценка > dist[u]", body: "→ устаревшая запись, пропуск", cls: "gt" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = (root.getAttribute("data-edges") || "").split(",").map(function (e) { return e.trim().split("-"); }).map(function (p) { return { u: labels.indexOf(p[0]), v: labels.indexOf(p[1]), w: Number(p[2]) }; }).filter(function (e) { return e.u >= 0 && e.v >= 0; }); var start = parseInt(root.getAttribute("data-start") || "0", 10); return { labels: labels, edges: edges, start: start, steps: bDijkstra(labels, edges, start).steps }; },
      inputs: [{ attr: "data-nodes", label: "Вершины" }, { attr: "data-edges", label: "Рёбра a-b-вес (ориент.)" }, { attr: "data-start", label: "старт", sm: true }],
      values: function () { return []; },
      title: function () { return "Дейкстра: кратчайшие пути"; },
      legend: [{ cls: "current", label: "извлечённая (финал)" }, { cls: "visited", label: "финализирована" }, { cls: "idle", label: "не достигнута" }, { cls: "curedge", label: "релаксируемое ребро" }],
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Извлекли u (dist)", "Релаксация dist[v]"],
      sumValues: function (s) { return [{ text: s.vars.u === "—" ? "—" : s.vars.u + " (" + s.vars["dist[u]"] + ")" }, { text: s.vars["dist[v]"], cls: (s.line === 8 ? "eq" : "") }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Кратчайшие пути найдены", text: s.info }; if (s.line === 5) return { kind: "end", icon: idx + 1, head: "Устаревшая запись", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "все dist финальны", c: "Dijkstra", cls: "eq" }; if (s.line === 2) return { a: "старт", b: "dist[src] = 0", c: "→", cls: "lt" }; if (s.line === 5) return { a: "запись " + s.vars.u, b: "устарела", c: "пропуск", cls: "gt" }; if (s.line === 4) return { a: "извлекли " + s.vars.u, b: "dist = " + s.vars["dist[u]"], c: "финал", cls: "lt" }; var imp = s.line === 8; return { a: "ребро " + s.vars["ребро"], b: s.vars["dist[v]"], c: imp ? "релакс" : "без изм.", cls: imp ? "eq" : "gt" }; },
      varsOf: function (s) { return { "u": s.vars.u, "dist[u]": s.vars["dist[u]"], "edge": s.vars["ребро"], "dist[v]": s.vars["dist[v]"] }; },
      // Две структуры: dist[] (финализированные — зелёные) и приоритетная очередь (min сверху).
      mapViz: function (panel, ctx) {
        var labels = ctx.labels, n = labels.length;
        var pd = structPanel(panel, "dist[] — оценки расстояний (зелёные финализированы)");
        var dcells = [];
        for (var i = 0; i < n; i++) { var c = structCell(labels[i], "∞", "algo-tp__mapcell--off"); dcells.push(c); pd.grid.appendChild(c); }
        var pq = structPanel(panel, "pq — приоритетная очередь (min по оценке сверху)");
        return function (s) {
          var d = s.dist || [];
          dcells.forEach(function (col, i) {
            var has = d[i] !== "∞" && d[i] != null;
            col.lastChild.textContent = (d[i] == null ? "∞" : d[i]);
            col.className = "algo-tp__mapcell" + (s.settled && s.settled[i] ? " algo-tp__mapcell--on algo-tp__mapcell--add" : (has ? " algo-tp__mapcell--on" : " algo-tp__mapcell--off"));
          });
          pq.grid.innerHTML = "";
          var q = (s.pq || []).slice().sort(function (a, b) { return a.d - b.d; });
          if (!q.length) pq.grid.appendChild(structCell("", "∅", "algo-tp__mapcell--off"));
          else q.forEach(function (x, k) { pq.grid.appendChild(structCell(k === 0 ? "min" : "", labels[x.node] + ":" + x.d, k === 0 ? "algo-tp__mapcell--on algo-tp__mapcell--hot algo-tp__mapcell--dec" : "algo-tp__mapcell--on")); });
          pq.foot.textContent = "записей в очереди: " + q.length;
        };
      },
      customViz: dijkstraViz
    },

    "dp-lcs": {
      badge: "Dynamic Programming", desc: "Longest Common Subsequence: 2D-таблица dp[i][j] по префиксам. Совпали символы → диагональ +1, иначе → max(верх, слева).",
      valuesLabel: "", codeKey: "dp-lcs", fillRange: false,
      complexity: { time: "O(m·n)", space: "O(m·n)", good: "★ 2D-ДП по двум последовательностям" },
      varOrder: ["i", "j", "a[i-1], b[j-1]", "rule", "dp[i][j]"],
      varDesc: { "i": "Строка: префикс a длины i", "j": "Столбец: префикс b длины j", "a[i-1], b[j-1]": "Сравниваемые символы", "rule": "Какой переход применён", "dp[i][j]": "Длина LCS этих префиксов" },
      lineNotes: { 1: "Нулевая строка и столбец = 0: с пустым префиксом общей подпоследовательности нет", 2: "Идём по строкам (символам a)", 3: "Внутри строки — по столбцам (символам b)", 4: "Сравниваем текущие символы a[i-1] и b[j-1]", 5: "Совпали → продлеваем диагональ dp[i-1][j-1] на +1", 7: "Не совпали → берём лучшее из накопленного: max(сверху, слева)", 11: "dp[m][n] — длина наибольшей общей подпоследовательности" },
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
      varsOf: function (s) { return { "i": s.vars.i, "j": s.vars.j, "a[i-1], b[j-1]": s.vars["a[i-1], b[j-1]"], "rule": s.vars["rule"], "dp[i][j]": s.vars["dp[i][j]"] }; },
      customViz: dpTableViz
    },

    "bellman-ford": {
      badge: "Bellman–Ford", desc: "Кратчайшие пути при любых весах: V−1 проходов релаксации по всем рёбрам; V-й проход — детектор отрицательного цикла.",
      valuesLabel: "", codeKey: "bellman-ford", fillRange: false,
      complexity: { time: "O(V·E)", space: "O(V)", good: "★ Отрицательные веса, поиск отриц. цикла" },
      varOrder: ["pass", "edge", "dist[u]", "dist[v]", "relaxed"],
      varDesc: { "pass": "Номер прохода (всего V−1)", "edge": "Релаксируемое ребро u→v (вес)", "dist[u]": "Расстояние до начала ребра", "dist[v]": "Расстояние до конца: было → стало", "relaxed": "Удалось ли укоротить путь" },
      lineNotes: { 1: "Старт: dist[src]=0, остальные ∞", 2: "Кратчайший путь содержит ≤ V−1 рёбер → столько проходов и нужно", 3: "В каждом проходе перебираем ВСЕ рёбра", 4: "Проверяем каждое ребро: путь через u короче текущего dist[v]?", 5: "Короче → релаксируем dist[v] (Bellman–Ford ничего не финализирует)", 9: "V-й проход — детектор: повторяем релаксацию ещё раз", 10: "Если хоть одно ребро ещё улучшается — есть отрицательный цикл", 11: "На V-м проходе всё ещё улучшается → отрицательный цикл", 14: "V-й проход без улучшений → циклов нет, расстояния верны" },
      rules: [{ head: "dist[u]+w < dist[v]", body: "→ релаксируем (любой проход)", cls: "eq" }, { head: "V−1 проходов", body: "путь ≤ V−1 рёбер", cls: "lt" }, { head: "V-й проход улучшил", body: "→ отрицательный цикл", cls: "gt" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = (root.getAttribute("data-edges") || "").split(",").map(function (e) { return e.trim().split("-"); }).map(function (p) { return { u: labels.indexOf(p[0]), v: labels.indexOf(p[1]), w: Number(p.slice(2).join("-")) }; }).filter(function (e) { return e.u >= 0 && e.v >= 0 && !isNaN(e.w); }); var start = parseInt(root.getAttribute("data-start") || "0", 10); return { labels: labels, edges: edges, start: start, steps: bBellmanFord(labels, edges, start).steps }; },
      inputs: [{ attr: "data-nodes", label: "Вершины" }, { attr: "data-edges", label: "Рёбра a-b-вес (ориент., веса любые)" }, { attr: "data-start", label: "старт", sm: true }],
      values: function () { return []; },
      title: function () { return "Bellman–Ford: кратчайшие пути"; },
      legend: [{ cls: "current", label: "вершина u ребра" }, { cls: "visited", label: "достигнута (dist<∞)" }, { cls: "idle", label: "ещё ∞" }, { cls: "curedge", label: "проверяемое ребро" }],
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Проход / ребро", "Релаксация dist[v]"],
      sumValues: function (s) { return [{ text: s.vars["ребро"] === "—" ? "проход " + s.vars["проход"] : s.vars["ребро"] }, { text: s.vars["dist[v]"], cls: (s.line === 5 ? "eq" : "") }]; },
      status: function (s, idx, total) { if (s.done) return { kind: s.found ? "ok" : "end", icon: s.found ? "✓" : "✗", head: s.found ? "Кратчайшие пути найдены" : "Отрицательный цикл!", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return s.found ? { a: "готово", b: "циклов нет", c: "Bellman–Ford", cls: "eq" } : { a: "V-й проход", b: "ещё улучшает", c: "отриц. цикл", cls: "gt" }; if (s.line === 1) return { a: "старт", b: "dist[src] = 0", c: "→", cls: "lt" }; if (s.line === 2) return { a: "проход " + s.vars["проход"], b: "по всем рёбрам", c: "→", cls: "lt" }; var imp = s.line === 5; return { a: "ребро " + s.vars["ребро"], b: s.vars["dist[v]"], c: imp ? "релакс" : "без изм.", cls: imp ? "eq" : "gt" }; },
      varsOf: function (s) { return { "pass": s.vars["проход"], "edge": s.vars["ребро"], "dist[u]": s.vars["dist[u]"], "dist[v]": s.vars["dist[v]"], "relaxed": s.vars["релаксация"] }; },
      // Панель dist[] — кратчайшие оценки от источника; обновлённая вершина вспыхивает.
      mapViz: function (panel, ctx) {
        var labels = ctx.labels, n = labels.length;
        var p = structPanel(panel, "dist[] — текущие оценки расстояний от источника");
        var cells = [];
        for (var i = 0; i < n; i++) { var c = structCell(labels[i], "∞", "algo-tp__mapcell--off"); cells.push(c); p.grid.appendChild(c); }
        return function (s) {
          var d = s.dist || [];
          cells.forEach(function (col, i) {
            var has = d[i] !== "∞" && d[i] != null;
            col.lastChild.textContent = (d[i] == null ? "∞" : d[i]);
            col.className = "algo-tp__mapcell" + (has ? " algo-tp__mapcell--on" : " algo-tp__mapcell--off") + (i === s.chg ? " algo-tp__mapcell--hot algo-tp__mapcell--add" : "");
          });
          var cnt = (s.settled || []).filter(Boolean).length;
          p.foot.textContent = "достигнуто вершин: " + cnt + " из " + n;
        };
      },
      customViz: dijkstraViz
    },

    "knapsack": {
      badge: "Dynamic Programming", desc: "0/1 рюкзак: dp[i][c] — максимальная ценность из первых i предметов при вместимости c. Выбор «взять / не взять».",
      valuesLabel: "", codeKey: "knapsack", fillRange: false,
      complexity: { time: "O(n·W)", space: "O(n·W) → O(W)", good: "★ Выбор подмножества с ограничением" },
      varOrder: ["item", "cap", "rule", "dp[i][c]"],
      varDesc: { "item": "Текущий предмет i (вес·ценность)", "cap": "Столбец c — доступная вместимость", "rule": "Какой выбор сделан", "dp[i][c]": "Лучшая ценность для (i, c)" },
      lineNotes: { 1: "Нулевая строка (нет предметов) и столбец (вместимость 0) = 0", 2: "Идём по предметам", 3: "Внутри предмета — по вместимостям c", 4: "По умолчанию НЕ берём предмет: наследуем dp[i-1][c]", 5: "Предмет влезает в остаток вместимости c?", 6: "Считаем ценность, если взять: dp[i-1][c-wt] + val", 7: "Взять выгоднее? сравниваем с пропуском", 11: "dp[n][W] — максимальная ценность при полной вместимости" },
      rules: [{ head: "Не влезает (wt > c)", body: "→ берём верх dp[i-1][c]", cls: "gt" }, { head: "Взять выгоднее", body: "→ dp[i-1][c-wt] + val", cls: "eq" }, { head: "Пропустить выгоднее", body: "→ dp[i-1][c]", cls: "lt" }],
      parse: function (root) { var W = parseInt(root.getAttribute("data-capacity"), 10); var items = (root.getAttribute("data-items") || "").split(",").map(function (s) { return s.trim().split("-").map(Number); }).filter(function (p) { return p.length === 2; }).map(function (p) { return { w: p[0], v: p[1] }; }); var r = bKnapsack(items, W); return { items: items, W: W, m: r.m, n: r.n, fillStep: r.fillStep, rowHeads: r.rowHeads, colHeads: r.colHeads, rowHeadW: r.rowHeadW, steps: r.steps }; },
      inputs: [{ attr: "data-items", label: "Предметы вес-ценность" }, { attr: "data-capacity", label: "вместимость W", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "0/1 рюкзак: вместимость " + ctx.W; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Предмет / вместимость", "dp[i][c]"],
      sumValues: function (s) { return [{ text: s.vars.item === "—" ? "—" : s.vars.item + " · c=" + s.vars.cap }, { text: s.vars["dp[i][c]"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Максимальная ценность = " + s.vars["dp[i][c]"], text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "dp[n][W]", b: "ценность = " + s.vars["dp[i][c]"], c: "готово", cls: "eq" }; if (s.i < 0) return { a: "база", b: "края = 0", c: "старт", cls: "lt" }; var r = s.vars.rule; return { a: s.vars.item + " c=" + s.vars.cap, b: r, c: s.match ? "взять" : "пропуск", cls: s.match ? "eq" : "lt" }; },
      varsOf: function (s) { return { "item": s.vars.item, "cap": s.vars.cap, "rule": s.vars.rule, "dp[i][c]": s.vars["dp[i][c]"] }; },
      customViz: dpTableViz
    },

    "astar": {
      badge: "A*", desc: "Поиск пути по сетке с эвристикой: из открытого списка берём клетку с минимальной f = g + h (h — манхэттенское расстояние до цели).",
      valuesLabel: "", codeKey: "astar", fillRange: false,
      complexity: { time: "O(E log V)", space: "O(V)", good: "★ Путь по сетке с хорошей эвристикой" },
      varOrder: ["cell", "g", "h", "f", "openSize"],
      varDesc: { "cell": "Текущая клетка (r,c)", "g": "Стоимость пути от старта", "h": "Эвристика — манхэттен до цели", "f": "Оценка f = g + h", "openSize": "Размер открытого списка" },
      lineNotes: { 1: "Открытый список — мин-куча по f; старт с f = h(старт)", 2: "g[старт] = 0 — стоимость пути до старта", 3: "Пока открытый список не пуст — продолжаем", 4: "Извлекаем клетку с минимальной оценкой f", 5: "Это цель — путь найден, возвращаем g", 6: "Помечаем клетку закрытой (раскрытой)", 7: "Перебираем 4 соседей текущей клетки", 8: "Стена или уже закрытая клетка — пропускаем", 9: "Через текущую клетку путь до соседа короче?", 10: "Короче → обновляем g соседа", 11: "Кладём соседа в очередь с f = g + h", 15: "Открытый список пуст — пути нет" },
      rules: [{ head: "Минимум f = g + h", body: "берём ближайшую по оценке", cls: "lt" }, { head: "Допустимая h", body: "→ путь оптимален", cls: "eq" }, { head: "h ≡ 0", body: "→ вырождается в Дейкстру", cls: "gt" }],
      parse: function (root) { var grid = (root.getAttribute("data-grid") || "").split(";").map(function (r) { return r.split(",").map(Number); }); var rr = bAStar(grid); return { grid: grid, R: rr.R, C: rr.C, goal: rr.goal, steps: rr.steps }; },
      inputs: [{ attr: "data-grid", label: "Сетка строки;через; запятую (0/1)" }],
      values: function () { return []; },
      title: function () { return "A*: поиск пути по сетке"; },
      legend: [{ cls: "current", label: "текущая" }, { cls: "frontier", label: "открытый список" }, { cls: "visited", label: "закрытая" }, { cls: "path", label: "путь" }, { cls: "wall", label: "стена" }],
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Клетка (f = g + h)", "Открытых"],
      sumValues: function (s) { return [{ text: s.vars["клетка"] === "—" ? "—" : s.vars["клетка"] + " · f=" + s.vars["f"] }, { text: s.vars["открытых"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.found) return { kind: "ok", icon: "✓", head: "Путь найден", text: s.info }; if (s.done) return { kind: "end", icon: "✗", head: "Пути нет", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "цель достигнута", b: "длина " + s.vars["g"], c: "путь", cls: "eq" }; if (s.done) return { a: "тупик", b: "открытых 0", c: "−1", cls: "gt" }; if (s.line === 1) return { a: "старт", b: "f = h = " + s.vars["f"], c: "→", cls: "lt" }; if (s.nb) return { a: "сосед " + s.vars["клетка"], b: "f = " + s.vars["f"], c: "в очередь", cls: "eq" }; return { a: "извлекли " + s.vars["клетка"], b: "f = " + s.vars["f"], c: "раскрыть", cls: "lt" }; },
      varsOf: function (s) { return { "cell": s.vars["клетка"], "g": s.vars["g"], "h": s.vars["h"], "f": s.vars["f"], "openSize": s.vars["открытых"] }; },
      // Панель открытого списка (frontier) — сортирована по f, сверху минимум (его извлечём).
      mapViz: function (panel) {
        var p = structPanel(panel, "open — открытый список (frontier), сверху min f");
        return function (s) {
          p.grid.innerHTML = "";
          var open = (s.open || []).map(function (c) { return { r: c[0], c: c[1], f: s.f[c[0]][c[1]] }; }).sort(function (a, b) { return a.f - b.f; });
          if (!open.length) p.grid.appendChild(structCell("", "∅", "algo-tp__mapcell--off"));
          else open.forEach(function (o, k) { p.grid.appendChild(structCell("(" + o.r + "," + o.c + ")", "f=" + (isFinite(o.f) ? o.f : "∞"), k === 0 ? "algo-tp__mapcell--on algo-tp__mapcell--hot algo-tp__mapcell--dec" : "algo-tp__mapcell--on")); });
          p.foot.textContent = "в открытом списке: " + open.length;
        };
      },
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
    var headMain = mkEl("div", "algo-tp__headmain");
    var h = mkEl("div", "algo-tp__title");
    h.appendChild(mkEl("span", null, cfg.title(ctx) + " "));
    h.appendChild(mkEl("span", "algo-tp__badge", cfg.badge));
    headMain.appendChild(h);
    headMain.appendChild(mkEl("div", "algo-tp__sub", cfg.desc));
    head.appendChild(headMain);
    var headActions = mkEl("div", "algo-tp__headactions"); // сюда уедет кнопка «во весь экран»
    head.appendChild(headActions);
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
    // Легенда состояний (для графов/сеток): что значит каждый цвет узла/клетки/ребра.
    if (cfg.legend) {
      var leg = mkEl("div", "algo-tp__legend");
      cfg.legend.forEach(function (it) {
        var item = mkEl("div", "algo-tp__legitem");
        item.appendChild(mkEl("span", "algo-tp__legdot algo-tp__legdot--" + it.cls));
        item.appendChild(mkEl("span", "algo-tp__leglabel", it.label));
        leg.appendChild(item);
      });
      pViz.appendChild(leg);
    }
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

    // Необязательная панель внутренней структуры данных (например, freq-map окна),
    // обновляется на каждом шаге. Размещается под строкой/массивом, до карточек-итогов.
    var updateMap = cfg.mapViz ? cfg.mapViz(pViz, ctx) : null;

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
    var codeHdr = mkEl("div", "algo-tp__panelhdr");
    codeHdr.appendChild(mkEl("span", null, "Код алгоритма"));
    codeHdr.appendChild(mkEl("span", "algo-tp__lang", "Go"));
    pCode.appendChild(codeHdr);
    var pre = mkEl("pre", "algo-tp__code");
    var codeLines = CODE[cfg.codeKey] || [];
    var lineEls = codeLines.map(function (ln, i) {
      var d = mkEl("div", "algo-tp__codeline");
      d.appendChild(mkEl("span", "algo-tp__codearrow", "▶")); // «стрелка» отладчика на текущей строке
      d.appendChild(mkEl("span", "algo-tp__lineno", i + 1));
      var lt = mkEl("span", "algo-tp__linetext"); lt.appendChild(hlGo(ln)); // подсветка синтаксиса
      d.appendChild(lt);
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
    // Переменные (скаляры) — компактная таблица под кодом. Составные структуры
    // (queue, freq, dist[], parent[]…) показаны панелями слева, сюда не дублируются.
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

    // --- Таймлайн (карточки шагов). По умолчанию СКРЫТ (debugger-раскладка): навигация
    //     идёт «стрелкой» в коде + кнопками/стрелками, без дублирующей ленты карточек.
    //     Лента дублировала статус-карточку и состояние структуры — её убрали. Можно
    //     вернуть для конкретного виджета через cfg.showTimeline: true. ---
    var tlCards = [];
    if (cfg.showTimeline) {
      var tlPanel = mkEl("div", "algo-tp__panel");
      tlPanel.appendChild(mkEl("div", "algo-tp__panelhdr", "Пошаговое выполнение"));
      var tl = mkEl("div", "algo-tp__timeline");
      tlCards = steps.map(function (s, i) {
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
    }

    // --- Футер ---
    var foot = mkEl("div", "algo-tp__foot");
    function footCol(lab, val, cls) { var c = mkEl("div", "algo-tp__footcol"); c.appendChild(mkEl("div", "algo-tp__footlab", lab)); c.appendChild(mkEl("div", "algo-tp__footval" + (cls ? " " + cls : ""), val)); return c; }
    foot.appendChild(footCol("Сложность по времени", cfg.complexity.time, "algo-tp__footval--ok"));
    foot.appendChild(footCol("Сложность по памяти", cfg.complexity.space, "algo-tp__footval--ok"));
    foot.appendChild(footCol("Подходит для", cfg.complexity.good));
    root.appendChild(foot);

    // --- Контролы: скорость | кнопки | автоповтор ---
    var ctrl = mkEl("div", "algo-tp__ctrl");

    // Зона 1: слайдер скорости автопроигрывания
    var speedWrap = mkEl("div", "algo-tp__speed");
    speedWrap.appendChild(mkEl("span", "algo-tp__speedlab", "Скорость"));
    var speedCol = mkEl("div", "algo-tp__speedcol");
    var speedInp = mkEl("input"); speedInp.type = "range"; speedInp.min = "1"; speedInp.max = "100"; speedInp.value = "50";
    speedInp.setAttribute("aria-label", "Скорость автопроигрывания");
    speedCol.appendChild(speedInp);
    var ends = mkEl("div", "algo-tp__speedends2"); ends.appendChild(mkEl("span", null, "Медленно")); ends.appendChild(mkEl("span", null, "Быстро"));
    speedCol.appendChild(ends);
    speedWrap.appendChild(speedCol);
    ctrl.appendChild(speedWrap);
    function playDelay() { return Math.round(1700 - 15 * (+speedInp.value || 50)); } // 1..100 → ~1685..200 мс

    // Зона 2: кнопки перемотки + play + счётчик
    var mid = mkEl("div", "algo-tp__ctrlmid");
    var btns = mkEl("div", "algo-tp__ctrlbtns");
    var bFirst = mkBtn("⏮", "В начало"), bPrev = mkBtn("◀", "Назад");
    var bNext = mkBtn("⏵", "Вперёд"), bLast = mkBtn("⏭", "В конец");
    var bPlay = mkBtn("▶", "Автопроигрывание (пробел)");
    bPlay.classList.add("algo-tp__playbtn");
    [bFirst, bPrev, bPlay, bNext, bLast].forEach(function (x) { btns.appendChild(x); });
    var counter = mkEl("span", "algo-viz__counter", "");
    mid.appendChild(btns); mid.appendChild(counter);
    ctrl.appendChild(mid);

    // Зона 3: тумблер «Автоповтор»
    var loopWrap = mkEl("div", "algo-tp__loop");
    loopWrap.appendChild(mkEl("span", null, "Автоповтор"));
    var sw = mkEl("label", "algo-tp__switch");
    var loopChk = mkEl("input"); loopChk.type = "checkbox"; loopChk.setAttribute("aria-label", "Автоповтор: начинать заново по достижении конца");
    sw.appendChild(loopChk); sw.appendChild(mkEl("span", "algo-tp__switchtrack"));
    loopWrap.appendChild(sw);
    ctrl.appendChild(loopWrap);
    root.appendChild(ctrl);

    // --- Полноэкранный режим: кнопка в шапке справа, оверлей на весь вьюпорт ---
    var bFs = mkBtn("⛶", "Развернуть на весь экран (F)");
    bFs.classList.add("algo-tp__fsbtn");
    headActions.appendChild(bFs);
    function setFs(on) {
      root.classList.toggle("algo-tp--fs", on);
      document.body.classList.toggle("algo-tp-fslock", on);
      bFs.textContent = on ? "✕" : "⛶";
      bFs.setAttribute("aria-label", on ? "Свернуть из полноэкранного режима (Esc)" : "Развернуть на весь экран (F)");
      if (on) root.focus();
    }
    bFs.onclick = function () { setFs(!root.classList.contains("algo-tp--fs")); };

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
      if (updateMap) updateMap(s);
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
      bPlay.textContent = "▶"; bPlay.classList.remove("algo-tp__playbtn--on");
      bPlay.setAttribute("aria-label", "Автопроигрывание шагов");
    }
    function startPlay() {
      if (idx >= steps.length - 1) show(0); // с конца — начинаем заново
      bPlay.textContent = "⏸"; bPlay.classList.add("algo-tp__playbtn--on");
      bPlay.setAttribute("aria-label", "Пауза автопроигрывания");
      timer = setInterval(function () {
        if (idx >= steps.length - 1) {
          if (loopChk.checked) { show(0); return; } // автоповтор: начинаем заново
          stopPlay(); return;
        }
        show(idx + 1);
      }, playDelay());
    }
    bPlay.onclick = function () { timer ? stopPlay() : startPlay(); };
    // смена скорости на лету — перезапускаем таймер с новым интервалом
    speedInp.addEventListener("input", function () { if (timer) { clearInterval(timer); timer = setInterval(function () { if (idx >= steps.length - 1) { if (loopChk.checked) { show(0); return; } stopPlay(); return; } show(idx + 1); }, playDelay()); } });

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
      else if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") { setFs(!root.classList.contains("algo-tp--fs")); e.preventDefault(); }
      else if (e.key === "Escape" && root.classList.contains("algo-tp--fs")) { setFs(false); e.preventDefault(); }
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
