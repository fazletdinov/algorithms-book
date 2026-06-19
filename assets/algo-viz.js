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
    "race-timeline": [
      "go func(u int) {",
      "  for _, v := range adj[u] {",
      "    if !visited[v] {        // обе горутины читают",
      "      visited[v] = true     // и пишут без замка",
      "      next = append(next, v)",
      "    }",
      "  }",
      "}(u)"
    ],
    "bfs-local-timeline": [
      "go func(u int) {",
      "  for _, v := range adj[u] {",
      "    if atomic.CompareAndSwapInt32(&visited[v], 0, 1) {",
      "      local = append(local, v)   // взял только победитель CAS",
      "    }",
      "  }",
      "}(u)"
    ],
    "wordcount-race": [
      "freq := map[int]int{} // ОБЩАЯ карта",
      "go func(c []int) {",
      "  for _, x := range c {",
      "    freq[x]++   // read-modify-write без синхронизации",
      "  }",
      "}(c)"
    ],
    "wordcount-local": [
      "go func(c []int) {",
      "  local := map[int]int{} // СВОЯ карта",
      "  for _, x := range c {",
      "    local[x]++",
      "  }",
      "  partials[w] = local",
      "}(c)",
      "// потом: слить partials в общий cnt"
    ],
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
    "min-subarray-naive": [
      "func minSubArrayNaive(target int, nums []int) int {",
      "    best := len(nums) + 1",
      "    for i := 0; i < len(nums); i++ {",
      "        sum := 0",
      "        for j := i; j < len(nums); j++ {",
      "            sum += nums[j]",
      "            if sum >= target {",
      "                if j-i+1 < best { best = j - i + 1 }",
      "                break",
      "            }",
      "        }",
      "    }",
      "    if best == len(nums)+1 { return 0 }",
      "    return best",
      "}"
    ],
    "min-subarray-window": [
      "func minSubArrayLen(target int, nums []int) int {",
      "    left, sum := 0, 0",
      "    best := len(nums) + 1",
      "    for right := 0; right < len(nums); right++ {",
      "        sum += nums[right]",
      "        for sum >= target {",
      "            if right-left+1 < best { best = right - left + 1 }",
      "            sum -= nums[left]",
      "            left++",
      "        }",
      "    }",
      "    if best == len(nums)+1 { return 0 }",
      "    return best",
      "}"
    ],
    "num-provinces-naive": [
      "func numProvincesNaive(isConnected [][]int) int {",
      "    n := len(isConnected)",
      "    reach := initReach(isConnected) // reach[i][j]=i==j||связаны",
      "    for k := 0; k < n; k++ { // транзитивное замыкание (Флойд–Уоршелл)",
      "        for i := 0; i < n; i++ {",
      "            for j := 0; j < n; j++ {",
      "                if reach[i][k] && reach[k][j] {",
      "                    reach[i][j] = true",
      "                }",
      "            }",
      "        }",
      "    }",
      "    count := 0",
      "    for i := 0; i < n; i++ {",
      "        if seen[i] { continue }",
      "        count++ // новая провинция",
      "        for j := 0; j < n; j++ {",
      "            if reach[i][j] { seen[j] = true }",
      "        }",
      "    }",
      "    return count",
      "}"
    ],
    "merge-intervals-naive": [
      "func mergeNaive(intervals [][]int) [][]int {",
      "    res := append([][]int(nil), intervals...) // без сортировки",
      "    for changed := true; changed; {",
      "        changed = false",
      "        for i := 0; i < len(res); i++ {",
      "            for j := i + 1; j < len(res); j++ {",
      "                a, b := res[i], res[j]",
      "                if a[0] <= b[1] && b[0] <= a[1] { // перекрытие",
      "                    res[i] = []int{min(a[0], b[0]), max(a[1], b[1])}",
      "                    res = append(res[:j], res[j+1:]...) // удаляем j",
      "                    changed = true",
      "                    j--",
      "                }",
      "            }",
      "        }",
      "    }",
      "    return res",
      "}"
    ],
    "diameter-naive": [
      "func height(node *TreeNode) int {",
      "    if node == nil {",
      "        return 0",
      "    }",
      "    return 1 + max(height(node.Left), height(node.Right))",
      "}",
      "",
      "func diameterNaive(root *TreeNode) int {",
      "    if root == nil {",
      "        return 0",
      "    }",
      "    through := height(root.Left) + height(root.Right)",
      "    left := diameterNaive(root.Left)",
      "    right := diameterNaive(root.Right)",
      "    return max(through, max(left, right))",
      "}"
    ],
    "oranges-rotting-naive": [
      "func orangesRottingNaive(grid [][]int) int {",
      "    minutes := 0",
      "    for {",
      "        snap := copyGrid(grid) // снимок: свежезаражённые ждут",
      "        changed := false",
      "        for r := 0; r < rows; r++ {        // СКАНИРУЕМ ВСЮ СЕТКУ",
      "            for c := 0; c < cols; c++ {",
      "                if snap[r][c] != 2 { continue }",
      "                for _, d := range dirs {",
      "                    nr, nc := r+d[0], c+d[1]",
      "                    if inBounds(nr, nc) && snap[nr][nc] == 1 {",
      "                        grid[nr][nc] = 2",
      "                        changed = true",
      "                    }",
      "                }",
      "            }",
      "        }",
      "        if !changed { break }",
      "        minutes++",
      "    }",
      "    return minutes // (+ остались свежие → -1)",
      "}"
    ],
    "jump-game-dp": [
      "func canJumpDP(nums []int) bool {",
      "    n := len(nums)",
      "    reachable := make([]bool, n)",
      "    reachable[0] = true",
      "    for i := 0; i < n; i++ {",
      "        if !reachable[i] {",
      "            continue // сюда не допрыгнуть",
      "        }",
      "        for step := 1; step <= nums[i] && i+step < n; step++ {",
      "            reachable[i+step] = true // помечаем досягаемое",
      "        }",
      "    }",
      "    return reachable[n-1]",
      "}"
    ],
    "search-range-naive": [
      "func searchRangeNaive(nums []int, target int) [2]int {",
      "    res := [2]int{-1, -1}",
      "    for i, v := range nums {",
      "        if v == target {",
      "            if res[0] == -1 {",
      "                res[0] = i // первое совпадение",
      "            }",
      "            res[1] = i     // последнее перетирается",
      "        }",
      "    }",
      "    return res",
      "}"
    ],
    "string-match-naive": [
      "func findAllNaive(text, pat string) []int {",
      "    var res []int",
      "    n, m := len(text), len(pat)",
      "    for i := 0; i+m <= n; i++ {",
      "        j := 0",
      "        for j < m && text[i+j] == pat[j] {",
      "            j++",
      "        }",
      "        if j == m {",
      "            res = append(res, i) // вхождение на позиции i",
      "        }",
      "    }",
      "    return res",
      "}"
    ],
    "num-provinces": [
      "func numProvinces(isConnected [][]int) int {",
      "    n := len(isConnected)",
      "    visited := make([]bool, n)",
      "    var dfs func(v int)",
      "    dfs = func(v int) {",
      "        visited[v] = true",
      "        for u := 0; u < n; u++ {",
      "            if isConnected[v][u] == 1 && !visited[u] {",
      "                dfs(u)",
      "            }",
      "        }",
      "    }",
      "    count := 0",
      "    for i := 0; i < n; i++ {",
      "        if !visited[i] {",
      "            count++ // начали новую компоненту",
      "            dfs(i)",
      "        }",
      "    }",
      "    return count",
      "}"
    ],
    "subsets-with-dup": [
      "func subsetsWithDup(nums []int) [][]int {",
      "    sort.Ints(nums)",
      "    var result [][]int",
      "    var current []int",
      "    var backtrack func(start int)",
      "    backtrack = func(start int) {",
      "        result = append(result, append([]int{}, current...))",
      "        for i := start; i < len(nums); i++ {",
      "            if i > start && nums[i] == nums[i-1] {",
      "                continue // дубль на этом уровне — пропуск",
      "            }",
      "            current = append(current, nums[i])",
      "            backtrack(i + 1)",
      "            current = current[:len(current)-1]",
      "        }",
      "    }",
      "    backtrack(0)",
      "    return result",
      "}"
    ],
    "combination-sum": [
      "func combinationSum(candidates []int, target int) [][]int {",
      "    sort.Ints(candidates)",
      "    var result [][]int",
      "    var current []int",
      "    var backtrack func(start, remain int)",
      "    backtrack = func(start, remain int) {",
      "        if remain == 0 {",
      "            result = append(result, append([]int{}, current...))",
      "            return",
      "        }",
      "        for i := start; i < len(candidates); i++ {",
      "            if candidates[i] > remain {",
      "                break // отсортировано ⇒ дальше только больше",
      "            }",
      "            current = append(current, candidates[i])",
      "            backtrack(i, remain-candidates[i]) // i — повтор разрешён",
      "            current = current[:len(current)-1]",
      "        }",
      "    }",
      "    backtrack(0, target)",
      "    return result",
      "}"
    ],
    "oranges-rotting": [
      "func orangesRotting(grid [][]int) int {",
      "    queue, fresh := collectRotten(grid) // все 2 — старты, считаем 1",
      "    if fresh == 0 { return 0 }",
      "    minutes := 0",
      "    for len(queue) > 0 && fresh > 0 {",
      "        var next [][2]int",
      "        for _, cell := range queue { // весь текущий уровень",
      "            for _, d := range dirs {",
      "                nr, nc := cell[0]+d[0], cell[1]+d[1]",
      "                if inBounds(nr, nc) && grid[nr][nc] == 1 {",
      "                    grid[nr][nc] = 2 // сгнил",
      "                    fresh--",
      "                    next = append(next, [2]int{nr, nc})",
      "                }",
      "            }",
      "        }",
      "        queue = next",
      "        minutes++",
      "    }",
      "    if fresh > 0 { return -1 } // остались недостижимые",
      "    return minutes",
      "}"
    ],
    "first-missing-positive": [
      "func firstMissingPositive(nums []int) int {",
      "    n := len(nums)",
      "    i := 0",
      "    for i < n {",
      "        v := nums[i]",
      "        correct := v - 1",
      "        if v >= 1 && v <= n && nums[i] != nums[correct] {",
      "            nums[i], nums[correct] = nums[correct], nums[i] // на место",
      "        } else {",
      "            i++ // на месте или вне диапазона",
      "        }",
      "    }",
      "    for i := 0; i < n; i++ {",
      "        if nums[i] != i+1 {",
      "            return i + 1 // первый «не на своём месте»",
      "        }",
      "    }",
      "    return n + 1 // массив — это ровно 1..n",
      "}"
    ],
    "house-robber": [
      "func rob(nums []int) int {",
      "    prev2, prev1 := 0, 0 // dp[i-2] и dp[i-1]",
      "    for _, x := range nums {",
      "        cur := max(prev1, prev2+x) // пропустить или взять дом",
      "        prev2, prev1 = prev1, cur  // сдвигаем окно",
      "    }",
      "    return prev1",
      "}"
    ],
    "two-single": [
      "func twoSingle(nums []int) []int {",
      "    xorAll := 0",
      "    for _, x := range nums {",
      "        xorAll ^= x // пары сокращаются, остаётся a ^ b",
      "    }",
      "    diff := xorAll & (-xorAll) // бит, где a и b различаются",
      "    a, b := 0, 0",
      "    for _, x := range nums {",
      "        if x&diff != 0 {",
      "            a ^= x // группа: бит установлен",
      "        } else {",
      "            b ^= x // группа: бит сброшен",
      "        }",
      "    }",
      "    return []int{a, b}",
      "}"
    ],
    "three-sum-naive": [
      "func threeSumNaive(nums []int) [][]int {",
      "    n := len(nums)",
      "    var res [][]int",
      "    for i := 0; i < n; i++ {",
      "        for j := i + 1; j < n; j++ {",
      "            for k := j + 1; k < n; k++ {",
      "                if nums[i]+nums[j]+nums[k] == 0 {",
      "                    res = addUnique(res, i, j, k) // отсев дублей через set",
      "                }",
      "            }",
      "        }",
      "    }",
      "    return res",
      "}"
    ],
    "three-sum": [
      "func threeSum(nums []int) [][]int {",
      "    sort.Ints(nums)",
      "    var res [][]int",
      "    for i := 0; i < len(nums)-2; i++ {",
      "        if i > 0 && nums[i] == nums[i-1] { continue }",
      "        left, right := i+1, len(nums)-1",
      "        for left < right {",
      "            sum := nums[i] + nums[left] + nums[right]",
      "            switch {",
      "            case sum == 0:",
      "                res = append(res, []int{nums[i], nums[left], nums[right]})",
      "                left++; right-- // и перешагнуть дубли",
      "            case sum < 0:",
      "                left++",
      "            default:",
      "                right--",
      "            }",
      "        }",
      "    }",
      "    return res",
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
    "ll-insert": [
      "func insertAt(head *ListNode, pos, val int) *ListNode {",
      "    dummy := &ListNode{Next: head}",
      "    prev := dummy",
      "    for i := 0; i < pos && prev.Next != nil; i++ {",
      "        prev = prev.Next         // к узлу перед позицией",
      "    }",
      "    node := &ListNode{Val: val}  // создаём узел",
      "    node.Next = prev.Next        // новый → остаток",
      "    prev.Next = node             // предыдущий → новый",
      "    return dummy.Next",
      "}"
    ],
    "ll-search": [
      "func search(head *ListNode, target int) *ListNode {",
      "    for node := head; node != nil; node = node.Next {",
      "        if node.Val == target {",
      "            return node          // нашли",
      "        }",
      "    }",
      "    return nil                   // не нашли",
      "}"
    ],
    "ll-delete": [
      "func deleteVal(head *ListNode, target int) *ListNode {",
      "    dummy := &ListNode{Next: head}",
      "    prev := dummy",
      "    for prev.Next != nil {",
      "        if prev.Next.Val == target {",
      "            prev.Next = prev.Next.Next  // вырезаем узел",
      "            break",
      "        }",
      "        prev = prev.Next",
      "    }",
      "    return dummy.Next",
      "}"
    ],
    "bst-search": [
      "func (t *BST) Search(val int) bool {",
      "    node := t.root",
      "    for node != nil {",
      "        if val == node.Val {",
      "            return true          // нашли",
      "        } else if val < node.Val {",
      "            node = node.Left     // меньше — влево",
      "        } else {",
      "            node = node.Right    // больше — вправо",
      "        }",
      "    }",
      "    return false                 // дошли до nil",
      "}"
    ],
    "bst-insert": [
      "func (t *BST) Insert(val int) {",
      "    if t.root == nil { t.root = &Node{Val: val}; return }",
      "    node, parent := t.root, t.root",
      "    for node != nil {            // ищем место (лист)",
      "        parent = node",
      "        if val < node.Val {",
      "            node = node.Left",
      "        } else {",
      "            node = node.Right",
      "        }",
      "    }",
      "    leaf := &Node{Val: val}      // создаём лист",
      "    if val < parent.Val {",
      "        parent.Left = leaf",
      "    } else {",
      "        parent.Right = leaf",
      "    }",
      "}"
    ],
    "bst-delete": [
      "func (t *BST) Delete(val int) {",
      "    node, parent := t.root, (*Node)(nil)",
      "    for node != nil && node.Val != val {        // ищем узел",
      "        parent = node",
      "        if val < node.Val { node = node.Left } else { node = node.Right }",
      "    }",
      "    if node == nil { return }                   // значения нет",
      "    if node.Left != nil && node.Right != nil {  // два ребёнка",
      "        succ, sp := node.Right, node            // min правого поддерева",
      "        for succ.Left != nil { sp = succ; succ = succ.Left }",
      "        node.Val = succ.Val                     // копируем значение преемника",
      "        node, parent = succ, sp                 // теперь удаляем узел преемника",
      "    }",
      "    child := node.Left                          // у узла ≤ 1 ребёнка",
      "    if child == nil { child = node.Right }",
      "    switch {                                    // отцепляем узел",
      "    case parent == nil: t.root = child",
      "    case parent.Left == node: parent.Left = child",
      "    default: parent.Right = child",
      "    }",
      "}"
    ],
    "heap-push": [
      "func (h *Heap) Push(val int) {",
      "    h.data = append(h.data, val)   // новый лист в конец массива",
      "    i := len(h.data) - 1",
      "    for i > 0 {                    // просеивание вверх",
      "        parent := (i - 1) / 2",
      "        if h.data[parent] <= h.data[i] {",
      "            break                  // порядок восстановлен",
      "        }",
      "        h.data[i], h.data[parent] = h.data[parent], h.data[i]",
      "        i = parent",
      "    }",
      "}"
    ],
    "heap-pop": [
      "func (h *Heap) Pop() int {",
      "    min := h.data[0]               // корень — минимум",
      "    last := len(h.data) - 1",
      "    h.data[0] = h.data[last]       // последний лист → в корень",
      "    h.data = h.data[:last]         // отрезаем хвост",
      "    i, n := 0, len(h.data)",
      "    for {                          // просеивание вниз",
      "        l, r, small := 2*i+1, 2*i+2, i",
      "        if l < n && h.data[l] < h.data[small] { small = l }",
      "        if r < n && h.data[r] < h.data[small] { small = r }",
      "        if small == i { break }    // порядок восстановлен",
      "        h.data[i], h.data[small] = h.data[small], h.data[i]",
      "        i = small",
      "    }",
      "    return min",
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
    "trie-shortest-root": [
      "func (t *Trie) shortestRoot(word string) string {",
      "    node := t",
      "    for i := 0; i < len(word); i++ {",
      "        c := word[i] - 'a'",
      "        if node.children[c] == nil {",
      "            return word            // путь оборвался — корня нет",
      "        }",
      "        node = node.children[c]",
      "        if node.isEnd {",
      "            return word[:i+1]      // первый конец корня = кратчайший",
      "        }",
      "    }",
      "    return word",
      "}"
    ],
    "trie-insert": [
      "func (t *Trie) Insert(word string) {",
      "    node := t",
      "    for i := 0; i < len(word); i++ {",
      "        c := word[i] - 'a'",
      "        if node.children[c] == nil {",
      "            node.children[c] = &Trie{} // создаём узел",
      "        }",
      "        node = node.children[c]",
      "    }",
      "    node.isEnd = true // конец слова",
      "}"
    ],
    "trie-delete": [
      "func (t *Trie) Delete(word string) bool {",
      "    node := t.find(word)              // спускаемся к слову",
      "    if node == nil || !node.isEnd {",
      "        return false                  // слова нет",
      "    }",
      "    node.isEnd = false                // снимаем флаг конца",
      "    for i := len(word) - 1; i >= 0; i-- { // обрезаем хвост снизу вверх",
      "        child := path[i+1]",
      "        if child.isEnd || child.hasChildren() {",
      "            break                     // узел ещё нужен — стоп",
      "        }",
      "        path[i].children[word[i]] = nil   // удаляем висячий узел",
      "    }",
      "    return true",
      "}"
    ],
    "trie-words": [
      "func (t *Trie) WordsWithPrefix(prefix string) []string {",
      "    node := t.find(prefix)            // спускаемся к префиксу",
      "    var out []string",
      "    var dfs func(n *Trie, cur string)",
      "    dfs = func(n *Trie, cur string) {",
      "        if n.isEnd {",
      "            out = append(out, cur)    // собрали слово",
      "        }",
      "        for c := 'a'; c <= 'z'; c++ { // дети по алфавиту",
      "            if n.children[c] != nil {",
      "                dfs(n.children[c], cur+string(c))",
      "            }",
      "        }",
      "    }",
      "    dfs(node, prefix)",
      "    return out",
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
    "fenwick-add": [
      "func (f *Fenwick) Add(i, delta int) {",
      "    i++                   // в 1-индексацию",
      "    for i <= f.n {",
      "        f.tree[i] += delta // зона ответственности узла i",
      "        i += i & (-i)      // следующий ответственный узел",
      "    }",
      "}"
    ],
    "count-inversions-naive": [
      "func countInversionsNaive(nums []int) int {",
      "    cnt := 0",
      "    for i := 0; i < len(nums); i++ {",
      "        for j := i + 1; j < len(nums); j++ {",
      "            if nums[i] > nums[j] { cnt++ }",
      "        }",
      "    }",
      "    return cnt",
      "}"
    ],
    "count-inversions-bit": [
      "func countInversionsBIT(nums []int) int {",
      "    rank := compress(nums)  // значение → ранг 1..m",
      "    tree := make([]int, m+1)",
      "    add := func(i int) { for ; i <= m; i += i & -i { tree[i]++ } }",
      "    prefix := func(i int) (s int) { for ; i > 0; i -= i & -i { s += tree[i] }; return }",
      "    inv := 0",
      "    for i := len(nums) - 1; i >= 0; i-- {  // справа налево",
      "        ri := rank[nums[i]]",
      "        inv += prefix(ri - 1)              // справа уже меньших",
      "        add(ri)                            // регистрируем nums[i]",
      "    }",
      "    return inv",
      "}"
    ],
    "union-find-find": [
      "func (uf *UnionFind) Find(x int) int {",
      "    root := x",
      "    for uf.parent[root] != root {  // идём к корню",
      "        root = uf.parent[root]",
      "    }",
      "    for uf.parent[x] != root {     // сжатие пути",
      "        uf.parent[x], x = root, uf.parent[x]",
      "    }",
      "    return root",
      "}"
    ],
    "union-find-union": [
      "func (uf *UnionFind) Union(x, y int) bool {",
      "    rx, ry := uf.Find(x), uf.Find(y)",
      "    if rx == ry {",
      "        return false           // уже в одном множестве",
      "    }",
      "    if uf.size[rx] < uf.size[ry] {",
      "        rx, ry = ry, rx        // меньшее — под большее",
      "    }",
      "    uf.parent[ry] = rx         // подвешиваем",
      "    uf.size[rx] += uf.size[ry]",
      "    return true",
      "}"
    ],
    "hash-put": [
      "func (h *HashMap) Put(key, val int) {",
      "    i := hash(key) % len(h.buckets)   // в какой бакет",
      "    for _, e := range h.buckets[i] {  // уже есть такой ключ?",
      "        if e.key == key {",
      "            e.val = val               // обновляем на месте",
      "            return",
      "        }",
      "    }",
      "    h.buckets[i] = append(h.buckets[i], entry{key, val}) // коллизия → в цепочку",
      "}"
    ],
    "hash-get": [
      "func (h *HashMap) Get(key int) (int, bool) {",
      "    i := hash(key) % len(h.buckets)   // тот же бакет",
      "    for _, e := range h.buckets[i] {  // сканируем цепочку",
      "        if e.key == key {",
      "            return e.val, true        // нашли",
      "        }",
      "    }",
      "    return 0, false                   // нет в бакете",
      "}"
    ],
    "deque-ops": [
      "// двусторонняя очередь (deque): вставка/удаление с обоих концов",
      "func (d *Deque) PushBack(x int)  { d.data = append(d.data, x) }",
      "func (d *Deque) PushFront(x int) { d.data = append([]int{x}, d.data...) }",
      "func (d *Deque) PopBack() int    { n := len(d.data)-1; x := d.data[n]; d.data = d.data[:n]; return x }",
      "func (d *Deque) PopFront() int   { x := d.data[0]; d.data = d.data[1:]; return x }"
    ],
    "sparse-build": [
      "func buildSparse(arr []int) {",
      "    for i := range arr { table[0][i] = arr[i] }       // строка k=0 = массив",
      "    for k := 1; (1 << k) <= len(arr); k++ {",
      "        for i := 0; i+(1<<k) <= len(arr); i++ {",
      "            table[k][i] = min(table[k-1][i],            // левая половина",
      "                              table[k-1][i+(1<<(k-1))]) // правая половина",
      "        }",
      "    }",
      "}"
    ],
    "sparse-query": [
      "func query(l, r int) int {           // min на [l, r]",
      "    k := log2(r - l + 1)             // макс. степень, влезающая в длину",
      "    return min(table[k][l],          // отрезок [l, l+2^k-1]",
      "               table[k][r-(1<<k)+1]) // отрезок [r-2^k+1, r] — перекрывает первый",
      "}"
    ],
    "avl-insert": [
      "func insert(node *Node, val int) *Node {",
      "    if node == nil { return &Node{val: val, h: 1} }   // вставка листа",
      "    if val < node.val { node.left = insert(node.left, val) } else { node.right = insert(node.right, val) }",
      "    update(node)                                       // высота = 1 + max(детей)",
      "    b := balance(node)                                 // высота левого − правого",
      "    if b > 1 && balance(node.left) >= 0  { return rotateRight(node) }                                  // LL",
      "    if b > 1                             { node.left = rotateLeft(node.left); return rotateRight(node) } // LR",
      "    if b < -1 && balance(node.right) <= 0 { return rotateLeft(node) }                                  // RR",
      "    if b < -1                            { node.right = rotateRight(node.right); return rotateLeft(node) } // RL",
      "    return node",
      "}"
    ],
    "btree-insert": [
      "func (t *BTree) Insert(k int) {",
      "    if root.full() {                 // корень полон — растим высоту",
      "        s := &Node{children: []*Node{root}}",
      "        s.splitChild(0); root = s    // средний ключ поднимается",
      "    }",
      "    insertNonFull(root, k)",
      "}",
      "func insertNonFull(n *Node, k int) {",
      "    if n.leaf { n.insertKey(k); return }       // в лист — по порядку",
      "    i := n.childIndex(k)",
      "    if n.children[i].full() {        // делим полного ребёнка ДО спуска",
      "        n.splitChild(i)",
      "        if k > n.keys[i] { i++ }",
      "    }",
      "    insertNonFull(n.children[i], k)",
      "}"
    ],
    "btree-search": [
      "func (t *BTree) Search(k int) bool {",
      "    n := t.root",
      "    for n != nil {",
      "        i := 0",
      "        for i < len(n.keys) && k > n.keys[i] { i++ }    // позиция в узле",
      "        if i < len(n.keys) && k == n.keys[i] { return true } // нашли",
      "        if n.leaf { return false }                      // лист — больше негде",
      "        n = n.children[i]                               // спуск к ребёнку",
      "    }",
      "    return false",
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
    "segtree-build": [
      "func build(node, lo, hi int) {",
      "    if lo == hi { tree[node] = arr[lo]; return }   // лист",
      "    mid := (lo + hi) / 2",
      "    build(2*node,   lo,    mid)                     // левое поддерево",
      "    build(2*node+1, mid+1, hi)                      // правое поддерево",
      "    tree[node] = tree[2*node] + tree[2*node+1]      // узел = сумма детей",
      "}"
    ],
    "segtree-update": [
      "func update(node, lo, hi, i, val int) {",
      "    if lo == hi { tree[node] = val; return }        // дошли до листа",
      "    mid := (lo + hi) / 2",
      "    if i <= mid {",
      "        update(2*node, lo, mid, i, val)             // i в левом",
      "    } else {",
      "        update(2*node+1, mid+1, hi, i, val)         // i в правом",
      "    }",
      "    tree[node] = tree[2*node] + tree[2*node+1]      // пересчёт узла",
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
  // Наивный O(n²) для «минимального подмассива с суммой ≥ target»: для КАЖДОГО левого
  // конца i заново сканируем вправо j, копя сумму с нуля. Построчный (debugger) проход;
  // видно, как соседние i пересчитывают почти один и тот же суффикс — та самая
  // повторная работа, которую убирает скользящее окно (см. bMinSubWindow ниже).
  function bMinSubNaive(arr, target) {
    var n = arr.length, steps = [], best = n + 1, bestLo = -1, bestHi = -1;
    function bv() { return best === n + 1 ? "∞" : best; }
    function vv(i, j, sum) { return { i: i, j: j, sum: (sum === undefined ? "—" : sum), best: bv() }; }
    if (!n) return [{ lo: 0, hi: -1, done: true, line: 13, vars: vv("—", "—"), info: "Пустой массив" }];
    steps.push({ lo: 0, hi: -1, line: 1, vars: vv("—", "—"), info: "best = len(nums)+1 = " + (n + 1) + " — «бесконечность», ответа пока нет" });
    for (var i = 0; i < n; i++) {
      steps.push({ lo: i, hi: -1, line: 2, vars: vv(i, "—"), info: "i = " + i + ": берём новый левый конец — и снова сканируем вправо с нуля" });
      var sum = 0;
      steps.push({ lo: i, hi: -1, line: 3, vars: vv(i, "—", 0), info: "sum = 0 — обнуляем сумму для нового левого конца i = " + i });
      var broke = false;
      for (var j = i; j < n; j++) {
        steps.push({ lo: i, hi: j, line: 4, vars: vv(i, j, sum), info: "j = " + j + ": расширяем подмассив [" + i + ".." + j + "] вправо" });
        sum += arr[j];
        steps.push({ lo: i, hi: j, line: 5, vars: vv(i, j, sum), info: "sum += nums[" + j + "] = " + arr[j] + " → sum = " + sum + " (сумма [" + i + ".." + j + "])" });
        var ok = sum >= target;
        steps.push({ lo: i, hi: j, line: 6, vars: vv(i, j, sum), info: "sum " + sum + (ok ? " ≥ " : " < ") + "target " + target + (ok ? " — да, подмассив подходит" : " — нет, идём правее") });
        if (ok) {
          var len = j - i + 1, improved = len < best;
          if (improved) { best = len; bestLo = i; bestHi = j; }
          steps.push({ lo: i, hi: j, improved: improved, line: 7, vars: vv(i, j, sum), info: improved ? "длина " + len + " < best → best = " + len + " (новый минимум, [" + i + ".." + j + "])" : "длина " + len + " ≥ best " + bv() + " — не короче, оставляем" });
          steps.push({ lo: i, hi: j, line: 8, vars: vv(i, j, sum), info: "break — для этого i дальше только длиннее (сумма растёт), берём следующий левый конец" });
          broke = true;
          break;
        }
      }
      if (!broke) {
        steps.push({ lo: i, hi: n - 1, line: 4, vars: vv(i, n, sum), info: "j дошёл до конца массива: для i = " + i + " подходящего подмассива нет" });
      }
    }
    var found = best !== n + 1;
    steps.push({ lo: found ? bestLo : 0, hi: found ? bestHi : -1, line: 12, vars: vv("—", "—"), info: found ? "best = " + best + " ≠ ∞ — ответ найден" : "best всё ещё ∞ → вернём 0" });
    steps.push({ lo: found ? bestLo : 0, hi: found ? bestHi : -1, done: true, line: found ? 13 : 12, vars: vv("—", "—"), info: found ? "return best = " + best + " — минимальный подмассив [" + bestLo + ".." + bestHi + "]" : "return 0 — подмассива с суммой ≥ " + target + " нет" });
    return steps;
  }
  // Оптимум O(n): переменное окно для того же «минимального подмассива с суммой ≥ target».
  // Построчный (debugger) проход: right расширяет окно, внутренний for жадно сжимает слева,
  // пока сумма ≥ target. left только растёт — отсюда амортизированный O(n).
  function bMinSubWindow(arr, target) {
    var n = arr.length, steps = [], left = 0, sum = 0, best = n + 1, bestLo = -1, bestHi = -1;
    function bv() { return best === n + 1 ? "∞" : best; }
    function vv(right) { return { left: left, right: (right === undefined ? "—" : right), sum: sum, best: bv() }; }
    if (!n) return [{ lo: 0, hi: -1, done: true, line: 12, vars: { left: "—", right: "—", sum: 0, best: "∞" }, info: "Пустой массив" }];
    steps.push({ lo: 0, hi: -1, line: 1, vars: { left: 0, right: "—", sum: 0, best: "—" }, info: "left = 0, sum = 0 — окно пустое (right появится в заголовке for)" });
    steps.push({ lo: 0, hi: -1, line: 2, vars: { left: 0, right: "—", sum: 0, best: bv() }, info: "best = len(nums)+1 = " + (n + 1) + " — «бесконечность», ответа пока нет" });
    for (var right = 0; right < n; right++) {
      steps.push({ lo: left, hi: right, line: 3, vars: vv(right), info: "right = " + right + ": расширяем окно вправо на индекс " + right });
      sum += arr[right];
      steps.push({ lo: left, hi: right, line: 4, vars: vv(right), info: "sum += nums[" + right + "] = " + arr[right] + " → sum = " + sum });
      while (true) {
        var ok = sum >= target;
        steps.push({ lo: left, hi: right, line: 5, vars: vv(right), info: "sum " + sum + (ok ? " ≥ " : " < ") + "target " + target + (ok ? " — окно валидно, жадно сжимаем слева" : " — окно мало, расширяем дальше") });
        if (!ok) break;
        var len = right - left + 1, improved = len < best;
        if (improved) { best = len; bestLo = left; bestHi = right; }
        steps.push({ lo: left, hi: right, improved: improved, line: 6, vars: vv(right), info: improved ? "right−left+1 = " + len + " < best → best = " + len + " (новый минимум [" + left + ".." + right + "])" : "длина " + len + " ≥ best " + bv() + " — не короче" });
        sum -= arr[left];
        steps.push({ lo: left, hi: right, line: 7, vars: vv(right), info: "sum −= nums[" + left + "] = " + arr[left] + " → sum = " + sum + " (убрали левый элемент)" });
        left++;
        steps.push({ lo: left, hi: right, line: 8, vars: vv(right), info: "left++ → left = " + left + " (сжали окно слева; назад left не вернётся)" });
      }
    }
    var found = best !== n + 1;
    steps.push({ lo: found ? bestLo : 0, hi: found ? bestHi : -1, line: 11, vars: { left: left, right: n, sum: sum, best: bv() }, info: found ? "best = " + best + " ≠ ∞ — ответ найден" : "best всё ещё ∞ → вернём 0" });
    steps.push({ lo: found ? bestLo : 0, hi: found ? bestHi : -1, done: true, line: found ? 12 : 11, vars: { left: left, right: n - 1, sum: sum, best: bv() }, info: found ? "return best = " + best + " — минимальный подмассив [" + bestLo + ".." + bestHi + "] (сумма ≥ " + target + ")" : "return 0 — подмассива с суммой ≥ " + target + " нет" });
    return steps;
  }
  // Разбор cyclic-sort: «первое пропущенное положительное». Раскладываем число v на индекс
  // v−1 (в диапазоне [1,n] и не на месте — swap, i НЕ растёт; иначе i++), затем сканируем.
  // values на каждом шаге = снимок массива; lo=i, hi=индекс обмена. Зелёные ячейки — на месте.
  function bFirstMissingPositive(arr) {
    var a = arr.slice(), n = a.length, steps = [], i = 0, guard = 0;
    function snap() { return a.slice(); }
    function vv(ii, v, correct) { return { i: (ii == null ? "—" : ii), v: (v == null ? "—" : v), correct: (correct == null ? "—" : correct), n: n }; }
    if (!n) return [{ lo: -1, hi: -1, done: true, line: 17, values: [], vars: vv("—"), info: "Пустой массив → ответ 1" }];
    steps.push({ lo: 0, hi: -1, line: 2, values: snap(), vars: vv(0), info: "i = 0 — раскладываем: число v идёт на индекс v−1" });
    while (i < n && guard++ < 4 * n + 10) {
      steps.push({ lo: i, hi: -1, line: 3, values: snap(), vars: vv(i), info: "i = " + i + " < " + n + " — продолжаем раскладку" });
      var v = a[i], correct = v - 1, inRange = v >= 1 && v <= n, misplaced = inRange && a[i] !== a[correct];
      steps.push({ lo: i, hi: (inRange ? correct : -1), line: 4, values: snap(), vars: vv(i, v, inRange ? correct : null), info: "v = nums[" + i + "] = " + v });
      steps.push({ lo: i, hi: (inRange ? correct : -1), line: 6, values: snap(), vars: vv(i, v, inRange ? correct : null), info: !inRange ? "v = " + v + " вне [1," + n + "] → на место не ставим" : (misplaced ? "v = " + v + " в диапазоне и nums[" + i + "] ≠ nums[" + correct + "] — меняем местами" : "v = " + v + " уже на своём месте (индекс " + correct + ")") });
      if (misplaced) {
        var tmp = a[i]; a[i] = a[correct]; a[correct] = tmp;
        steps.push({ lo: i, hi: correct, line: 7, values: snap(), vars: vv(i, a[i], correct), info: "swap nums[" + i + "] ↔ nums[" + correct + "] → [" + a.join(", ") + "], i не растёт" });
      } else {
        i++;
        steps.push({ lo: i, hi: -1, line: 9, values: snap(), vars: vv(i), info: "i++ → i = " + i + " (на месте или вне диапазона)" });
      }
    }
    var ans = -1;
    for (var j = 0; j < n; j++) {
      var ok = a[j] === j + 1;
      steps.push({ lo: j, hi: -1, line: 13, values: snap(), vars: { i: j, v: a[j], correct: "—", n: n }, info: "скан: nums[" + j + "] = " + a[j] + (ok ? " == " + (j + 1) + " — на месте" : " ≠ " + (j + 1) + " — первое «не своё» место!") });
      if (!ok) { ans = j + 1; break; }
    }
    if (ans < 0) ans = n + 1;
    steps.push({ lo: (ans - 1 < n ? ans - 1 : -1), hi: -1, done: true, found: true, line: (ans === n + 1 ? 17 : 14), values: snap(), vars: { i: "—", v: "—", correct: "—", n: n }, info: "return " + ans + " — наименьшее пропущенное положительное" });
    return steps;
  }
  // Разбор DP: House Robber со свёрткой до двух переменных. dp[i]=max(пропустить prev1,
  // взять prev2+x). lo=i — текущий дом; --hot, когда выгоднее ВЗЯТЬ.
  function bHouseRobber(arr) {
    var n = arr.length, steps = [], prev2 = 0, prev1 = 0;
    function vv(i, x, cur) { return { i: (i == null ? "—" : i), x: (x == null ? "—" : x), prev2: prev2, prev1: prev1, cur: (cur == null ? "—" : cur) }; }
    if (!n) return [{ lo: -1, hi: -1, done: true, line: 6, vars: vv(), info: "Пустой массив → 0" }];
    steps.push({ lo: -1, hi: -1, line: 1, vars: vv(), info: "prev2 = prev1 = 0 — пустое окно (dp[-2], dp[-1])" });
    for (var i = 0; i < n; i++) {
      var x = arr[i];
      steps.push({ lo: i, hi: -1, line: 2, vars: vv(i, x), info: "дом i = " + i + ", деньги x = " + x });
      var take = prev2 + x, skip = prev1, cur = Math.max(skip, take), takeWins = take > skip;
      steps.push({ lo: i, hi: -1, improved: takeWins, line: 3, vars: vv(i, x, cur), info: "cur = max(пропустить " + skip + ", взять " + prev2 + "+" + x + "=" + take + ") = " + cur + (takeWins ? " — выгоднее ВЗЯТЬ дом" : " — выгоднее ПРОПУСТИТЬ") });
      prev2 = prev1; prev1 = cur;
      steps.push({ lo: i, hi: -1, line: 4, vars: vv(i, x, cur), info: "сдвигаем окно: prev2 = " + prev2 + ", prev1 = " + prev1 });
    }
    steps.push({ lo: n - 1, hi: -1, done: true, found: true, line: 6, vars: { i: "—", x: "—", prev2: prev2, prev1: prev1, cur: "—" }, info: "return prev1 = " + prev1 + " — максимум денег без двух соседних домов" });
    return steps;
  }
  // Разбор bit-manipulation: два числа-одиночки двойным XOR. Проход 1 — xorAll = a^b;
  // diff = младший различающий бит; проход 2 делит по diff и копит XOR в группах a/b.
  function bTwoSingle(arr) {
    var n = arr.length, steps = [], xorAll = 0;
    function bin(x) { return (x < 0 ? "-" : "") + "0b" + Math.abs(x).toString(2); }
    function vv(i, x, e) { e = e || {}; return { i: (i == null ? "—" : i), x: (x == null ? "—" : x), xorAll: xorAll, diff: ("diff" in e ? e.diff : "—"), a: ("a" in e ? e.a : "—"), b: ("b" in e ? e.b : "—") }; }
    if (!n) return [{ lo: -1, hi: -1, done: true, line: 14, vars: vv(), info: "Пустой массив" }];
    steps.push({ lo: -1, hi: -1, line: 1, vars: vv(), info: "xorAll = 0 — первый проход XOR-им всё" });
    for (var i = 0; i < n; i++) { xorAll ^= arr[i]; steps.push({ lo: i, hi: -1, line: 3, vars: vv(i, arr[i]), info: "xorAll ^= " + arr[i] + " → " + xorAll + " (" + bin(xorAll) + "); пары сокращаются" }); }
    var diff = xorAll & (-xorAll);
    steps.push({ lo: -1, hi: -1, improved: true, line: 5, vars: vv(null, null, { diff: diff }), info: "diff = xorAll & (−xorAll) = " + diff + " (" + bin(diff) + ") — младший бит, где a и b различаются" });
    var a = 0, b = 0;
    steps.push({ lo: -1, hi: -1, line: 6, vars: vv(null, null, { diff: diff, a: 0, b: 0 }), info: "a = b = 0 — второй проход делит числа по биту diff" });
    for (var j = 0; j < n; j++) {
      var x = arr[j], inA = (x & diff) !== 0;
      steps.push({ lo: j, hi: -1, line: 7, vars: vv(j, x, { diff: diff, a: a, b: b }), info: "x = " + x + " (" + bin(x) + "), x & diff " + (inA ? "≠ 0 → группа a (бит установлен)" : "= 0 → группа b (бит сброшен)") });
      if (inA) { a ^= x; steps.push({ lo: j, hi: -1, line: 9, vars: vv(j, x, { diff: diff, a: a, b: b }), info: "a ^= " + x + " → a = " + a }); }
      else { b ^= x; steps.push({ lo: j, hi: -1, line: 11, vars: vv(j, x, { diff: diff, a: a, b: b }), info: "b ^= " + x + " → b = " + b }); }
    }
    steps.push({ lo: -1, hi: -1, done: true, found: true, line: 14, vars: vv(null, null, { diff: diff, a: a, b: b }), info: "return [" + a + ", " + b + "] — два числа-одиночки" });
    return steps;
  }
  // Разбор задачи двух указателей: 3Sum. Наивно O(n³) — три вложенных цикла i<j<k,
  // проверяем каждую тройку на сумму 0, дубли отсекаем set. lo=i, mid=j, hi=k.
  function bThreeSumNaive(arr) {
    var n = arr.length, steps = [], seen = {}, found = 0;
    function key3(a, b, c) { var t = [a, b, c].slice().sort(function (x, y) { return x - y; }); return t.join(","); }
    function vv(i, j, k, sum) { return { i: (i == null ? "—" : i), j: (j == null ? "—" : j), k: (k == null ? "—" : k), sum: (sum == null ? "—" : sum), found: found }; }
    if (n < 3) return [{ lo: -1, hi: -1, done: true, line: 12, vars: vv(), info: "Меньше трёх элементов — троек нет" }];
    steps.push({ lo: -1, hi: -1, line: 2, vars: vv(), info: "res пуст — ищем тройки с суммой 0" });
    for (var i = 0; i < n; i++) {
      steps.push({ lo: i, hi: -1, line: 3, vars: vv(i), info: "i = " + i + ": первый элемент тройки nums[" + i + "] = " + arr[i] });
      for (var j = i + 1; j < n; j++) {
        steps.push({ lo: i, mid: j, hi: -1, line: 4, vars: vv(i, j), info: "j = " + j + ": второй элемент nums[" + j + "] = " + arr[j] });
        for (var k = j + 1; k < n; k++) {
          var sum = arr[i] + arr[j] + arr[k], zero = sum === 0, uniq = false;
          if (zero) { var kk = key3(arr[i], arr[j], arr[k]); if (!seen[kk]) { seen[kk] = true; found++; uniq = true; } }
          steps.push({ lo: i, mid: j, hi: k, improved: uniq, line: 6, vars: vv(i, j, k, sum), info: arr[i] + " + " + arr[j] + " + " + arr[k] + " = " + sum + (zero ? (uniq ? " = 0 — новая тройка [" + key3(arr[i], arr[j], arr[k]).split(",").join(", ") + "]!" : " = 0, но такая тройка уже была") : " ≠ 0") });
        }
      }
    }
    steps.push({ lo: -1, hi: -1, done: true, line: 12, vars: vv(), info: "return res — всего уникальных троек: " + found });
    return steps;
  }
  // Оптимум O(n²): сортируем, фиксируем i, остаток ищем встречными указателями left/right.
  // Массив показываем уже отсортированным (ctx.arr); i = mid (фиксирован), left = lo, right = hi.
  function bThreeSum(arr) {
    var a = arr.slice().sort(function (x, y) { return x - y; }), n = a.length, steps = [], found = 0;
    function vv(i, l, r, sum) { return { i: (i == null ? "—" : i), left: (l == null ? "—" : l), right: (r == null ? "—" : r), sum: (sum == null ? "—" : sum), found: found }; }
    steps.push({ lo: -1, mid: -1, hi: -1, line: 1, vars: vv(), info: "sort.Ints(nums) → [" + a.join(", ") + "] — появилась монотонность" });
    for (var i = 0; i < n - 2; i++) {
      if (i > 0 && a[i] === a[i - 1]) {
        steps.push({ lo: -1, mid: i, hi: -1, line: 4, vars: vv(i, null, null), info: "i = " + i + ": nums[" + i + "] = " + a[i] + " == nums[" + (i - 1) + "] — дубль первого элемента, continue" });
        continue;
      }
      var left = i + 1, right = n - 1;
      steps.push({ lo: left, mid: i, hi: right, line: 5, vars: vv(i, left, right), info: "i = " + i + " (nums[i] = " + a[i] + "): left = " + left + ", right = " + right });
      while (left < right) {
        var sum = a[i] + a[left] + a[right];
        steps.push({ lo: left, mid: i, hi: right, line: 7, vars: vv(i, left, right, sum), info: "sum = " + a[i] + " + " + a[left] + " + " + a[right] + " = " + sum });
        if (sum === 0) {
          found++;
          steps.push({ lo: left, mid: i, hi: right, improved: true, line: 10, vars: vv(i, left, right, sum), info: "sum == 0 — тройка [" + a[i] + ", " + a[left] + ", " + a[right] + "]! left++, right-- и перешагиваем дубли" });
          left++; right--;
          while (left < right && a[left] === a[left - 1]) left++;
          while (left < right && a[right] === a[right + 1]) right--;
        } else if (sum < 0) {
          steps.push({ lo: left, mid: i, hi: right, line: 12, vars: vv(i, left, right, sum), info: "sum " + sum + " < 0 — нужна большая сумма, left++" });
          left++;
        } else {
          steps.push({ lo: left, mid: i, hi: right, line: 14, vars: vv(i, left, right, sum), info: "sum " + sum + " > 0 — нужна меньшая сумма, right--" });
          right--;
        }
      }
    }
    steps.push({ lo: -1, mid: -1, hi: -1, done: true, line: 19, vars: vv(), info: "return res — всего уникальных троек: " + found });
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
  // Fenwick (BIT): точечное добавление delta — подъём i += i&(-i).
  function bFenwickAdd(arr, idx, delta) {
    var steps = [], n = arr.length, i = idx + 1;
    function push(o) { steps.push({ lo: (o.lo == null ? -1 : o.lo), hi: (o.hi == null ? -1 : o.hi), line: o.line, vars: { i: (o.i == null ? "—" : o.i), range: (o.range || "—"), delta: String(delta) }, info: o.info, done: o.done, found: o.found }); }
    push({ line: 1, i: i, info: "i = " + idx + " + 1 = " + i + " (внутри BIT 1-индексация)" });
    var guard = 0;
    while (i <= n && guard++ < 64) {
      push({ line: 2, i: i, info: "i = " + i + " ≤ " + n + " — продолжаем подъём по BIT" });
      var low = i & (-i), lo0 = i - low, hi0 = i - 1;
      push({ line: 3, lo: lo0, hi: hi0, i: i, range: "[" + lo0 + ".." + hi0 + "]", info: "tree[" + i + "] += " + delta + " — узел отвечает за arr[" + lo0 + ".." + hi0 + "]" });
      var oldi = i; i += low;
      push({ line: 4, lo: lo0, hi: hi0, i: i, range: "[" + lo0 + ".." + hi0 + "]", info: "i += i&(−i) = " + oldi + " + " + low + " = " + i + " (следующий ответственный узел)" });
    }
    push({ line: 2, i: i, done: true, found: true, info: "i = " + i + " > " + n + " — вышли за пределы, обновление завершено" });
    return steps;
  }

  // Разбор задачи Фенвика: число инверсий. Наивно O(n²) — перебираем все пары i<j и
  // считаем, где nums[i] > nums[j]. Построчный (debugger) проход; lo=i, hi=j.
  function bCountInvNaive(arr) {
    var n = arr.length, steps = [], cnt = 0;
    function av(k) { return (k != null && k >= 0 && k < n) ? arr[k] : "—"; }
    function vv(i, j) { return { i: (i == null ? "—" : i), j: (j == null ? "—" : j), "nums[i]": av(i), "nums[j]": av(j), cnt: cnt }; }
    if (!n) return [{ lo: -1, hi: -1, done: true, line: 7, vars: vv(), info: "Пустой массив" }];
    steps.push({ lo: -1, hi: -1, line: 1, vars: vv(), info: "cnt = 0 — пока инверсий не нашли" });
    for (var i = 0; i < n; i++) {
      steps.push({ lo: i, hi: -1, line: 2, vars: vv(i), info: "i = " + i + ": фиксируем левый элемент nums[" + i + "] = " + arr[i] });
      for (var j = i + 1; j < n; j++) {
        steps.push({ lo: i, hi: j, line: 3, vars: vv(i, j), info: "j = " + j + ": сравниваем с правым nums[" + j + "] = " + arr[j] });
        var inv = arr[i] > arr[j];
        if (inv) cnt++;
        steps.push({ lo: i, hi: j, improved: inv, line: 4, vars: vv(i, j), info: inv ? "nums[" + i + "]=" + arr[i] + " > nums[" + j + "]=" + arr[j] + " — инверсия! cnt → " + cnt : "nums[" + i + "]=" + arr[i] + " ≤ nums[" + j + "]=" + arr[j] + " — не инверсия" });
      }
    }
    steps.push({ lo: -1, hi: -1, done: true, line: 7, vars: vv(), info: "return cnt = " + cnt + " — всего инверсий" });
    return steps;
  }
  // Оптимум O(n log n): сжатие координат + BIT по частотам. Идём СПРАВА НАЛЕВО; вклад
  // nums[i] = prefix(rank−1) (сколько меньших уже встречено справа), затем add(rank).
  // Снимок tree[1..m] на каждом шаге рисует BIT-панель (mapViz); подсветка узлов на
  // спуске prefix (idx -= idx&−idx) и подъёме add (idx += idx&−idx).
  function bCountInvBit(arr) {
    var n = arr.length, steps = [];
    var sorted = arr.slice().sort(function (a, b) { return a - b; });
    var rank = {}, m = 0;
    sorted.forEach(function (v) { if (rank[v] == null) { m++; rank[v] = m; } });
    var tree = new Array(m + 1).fill(0);
    function snap() { return tree.slice(1); } // tree[1..m]
    function vv(i, ri, contrib, inv) { return { i: (i == null ? "—" : i), rank: (ri == null ? "—" : ri), contrib: (contrib == null ? "—" : contrib), inv: inv }; }
    if (!n) return { m: 0, steps: [{ lo: -1, hi: -1, done: true, line: 11, tree: [], vars: vv(null, null, null, 0), info: "Пустой массив" }] };
    var inv = 0;
    steps.push({ lo: n, hi: -1, line: 5, tree: snap(), vars: vv(null, null, null, 0), info: "Сжатие координат: m = " + m + " рангов. tree[1.." + m + "] = 0, inv = 0" });
    for (var i = n - 1; i >= 0; i--) {
      steps.push({ lo: i, hi: -1, line: 6, tree: snap(), vars: vv(i, null, null, inv), info: "i = " + i + ": берём nums[" + i + "] = " + arr[i] + " (идём справа налево)" });
      var ri = rank[arr[i]];
      steps.push({ lo: i, hi: -1, line: 7, tree: snap(), vars: vv(i, ri, null, inv), info: "ri = rank[" + arr[i] + "] = " + ri });
      var sum = 0, idx = ri - 1;
      if (idx <= 0) {
        steps.push({ lo: i, hi: -1, line: 8, tree: snap(), vars: vv(i, ri, 0, inv), info: "prefix(" + (ri - 1) + ") = 0 — рангов меньше " + ri + " ещё не встречали" });
      } else {
        var guard = 0;
        while (idx > 0 && guard++ < 64) {
          sum += tree[idx];
          steps.push({ lo: i, hi: -1, touched: idx, action: "query", line: 8, tree: snap(), vars: vv(i, ri, sum, inv), info: "prefix: tree[" + idx + "] = " + tree[idx] + " → sum = " + sum + ", дальше idx −= idx&(−idx) → " + (idx - (idx & -idx)) });
          idx -= idx & -idx;
        }
      }
      inv += sum;
      steps.push({ lo: i, hi: -1, improved: sum > 0, line: 8, tree: snap(), vars: vv(i, ri, sum, inv), info: "вклад nums[" + i + "] = prefix(" + (ri - 1) + ") = " + sum + " → inv = " + inv + (sum > 0 ? " (столько меньших уже справа)" : "") });
      var aidx = ri, guard2 = 0;
      while (aidx <= m && guard2++ < 64) {
        tree[aidx]++;
        steps.push({ lo: i, hi: -1, touched: aidx, action: "add", line: 9, tree: snap(), vars: vv(i, ri, sum, inv), info: "add: tree[" + aidx + "]++ → " + tree[aidx] + ", дальше idx += idx&(−idx) → " + (aidx + (aidx & -aidx)) });
        aidx += aidx & -aidx;
      }
    }
    steps.push({ lo: -1, hi: -1, done: true, line: 11, tree: snap(), vars: vv(null, null, null, inv), info: "return inv = " + inv + " — всего инверсий" });
    return { m: m, steps: steps };
  }

  // ===== Union-Find (DSU): Find (сжатие пути) / Union (по размеру) ===========
  // Лес parent-деревьев: позиции считаем DFS-обходом каждого дерева (x = столбец,
  // y = глубина), рёбра child→parent (SVG). Снимок parent[] пересобирается каждый шаг,
  // поэтому видно и подъём к корню, и сжатие пути, и подвешивание при объединении.
  function ufViz(panel) {
    var CW = 54, CH = 64, R = 16;
    var host = mkEl("div", "algo-tp__bst"); panel.appendChild(host);
    return function (s) {
      host.innerHTML = "";
      var parent = s.parent || [], marks = s.marks || {}, n = parent.length;
      if (!n) { host.appendChild(mkEl("div", "algo-tp__llnil", "∅")); return; }
      var children = {};
      for (var a = 0; a < n; a++) { if (parent[a] !== a) { (children[parent[a]] = children[parent[a]] || []).push(a); } }
      var roots = []; for (var b = 0; b < n; b++) if (parent[b] === b) roots.push(b);
      var pos = {}, colc = { c: 0 };
      function dfs(u, depth) {
        var kids = (children[u] || []).slice().sort(function (p, q) { return p - q; });
        if (!kids.length) { pos[u] = { x: colc.c++, y: depth }; return; }
        var xs = []; kids.forEach(function (k) { dfs(k, depth + 1); xs.push(pos[k].x); });
        pos[u] = { x: (xs[0] + xs[xs.length - 1]) / 2, y: depth };
      }
      roots.sort(function (p, q) { return p - q; }).forEach(function (r) { dfs(r, 0); colc.c += 1; });
      var maxX = 0, maxY = 0; for (var k in pos) { maxX = Math.max(maxX, pos[k].x); maxY = Math.max(maxY, pos[k].y); }
      var W = (maxX + 1) * CW, H = (maxY + 1) * CH;
      host.style.position = "relative"; host.style.width = W + "px"; host.style.height = H + "px";
      function cx(x) { return x * CW + CW / 2; }
      function cy(y) { return y * CH + 22; }
      var svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "algo-tp__bstsvg");
      for (var i = 0; i < n; i++) { if (parent[i] !== i) { var c1 = pos[i], c2 = pos[parent[i]]; var ln = document.createElementNS(SVGNS, "line"); ln.setAttribute("x1", cx(c1.x)); ln.setAttribute("y1", cy(c1.y)); ln.setAttribute("x2", cx(c2.x)); ln.setAttribute("y2", cy(c2.y)); ln.setAttribute("class", "algo-tp__bstedge"); svg.appendChild(ln); } }
      host.appendChild(svg);
      for (var j = 0; j < n; j++) { var p = pos[j]; var isRoot = parent[j] === j; var box = mkEl("div", "algo-tp__tnode" + (isRoot ? " algo-tp__tnode--root" : "") + (marks[j] ? " algo-tp__tnode--" + marks[j] : ""), j); box.style.position = "absolute"; box.style.left = (cx(p.x) - R) + "px"; box.style.top = (cy(p.y) - R) + "px"; host.appendChild(box); }
    };
  }
  function bUFFind(parentInit, x) {
    var parent = parentInit.slice(), steps = [];
    function push(o) { steps.push({ si: steps.length, line: o.line, parent: parent.slice(), marks: o.marks || {}, vars: { node: String(o.node == null ? "—" : o.node), root: (o.root == null ? "—" : String(o.root)) }, info: o.info, done: o.done }); }
    push({ line: 1, node: x, info: "Find(" + x + "): root := " + x + ", идём к корню по ссылкам parent" });
    var path = [], cur = x, guard = 0;
    while (parent[cur] !== cur && guard++ < 64) {
      var m = {}; m[cur] = "current";
      push({ line: 3, marks: m, node: cur, info: cur + " → parent = " + parent[cur] + " (не корень, поднимаемся)" });
      path.push(cur); cur = parent[cur];
    }
    var root = cur, mr = {}; mr[root] = "found";
    push({ line: 2, marks: mr, node: root, root: root, info: "parent[" + root + "] = " + root + " — это корень" });
    path.forEach(function (u) {
      parent[u] = root;
      var mc = {}; mc[u] = "current"; mc[root] = "found";
      push({ line: 6, marks: mc, node: u, root: root, info: "сжатие пути: parent[" + u + "] = " + root + " (подвешиваем прямо к корню)" });
    });
    var mf = {}; mf[root] = "found"; if (x !== root) mf[x] = "current";
    push({ line: 8, marks: mf, node: root, root: root, done: true, info: "Find(" + x + ") = " + root + "; путь сжат — дерево стало плоским" });
    return { steps: steps };
  }
  function bUFUnion(n, unionList) {
    var parent = [], size = [], steps = [];
    for (var i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
    function find(z) { while (parent[z] !== z) { parent[z] = parent[parent[z]]; z = parent[z]; } return z; }
    function push(o) { steps.push({ si: steps.length, line: o.line, parent: parent.slice(), marks: o.marks || {}, vars: { a: (o.a == null ? "—" : String(o.a)), b: (o.b == null ? "—" : String(o.b)), action: (o.action || "—") }, info: o.info, done: o.done }); }
    push({ line: 0, info: n + " одиночных множеств: parent[i] = i (каждый — сам себе корень)" });
    unionList.forEach(function (pair) {
      var a = pair[0], b = pair[1];
      var ra = find(a), rb = find(b);
      var mr = {}; mr[a] = "current"; mr[b] = "current"; mr[ra] = "found"; mr[rb] = "found";
      push({ line: 1, marks: mr, a: ra, b: rb, action: "union", info: "Union(" + a + ", " + b + "): корни find(" + a + ")=" + ra + ", find(" + b + ")=" + rb });
      if (ra === rb) { var ms = {}; ms[ra] = "found"; push({ line: 3, marks: ms, a: ra, b: rb, action: "уже вместе", info: ra + " == " + rb + " — уже в одном множестве, пропуск" }); return; }
      if (size[ra] < size[rb]) { var t = ra; ra = rb; rb = t; }
      parent[rb] = ra; size[ra] += size[rb];
      var mu = {}; mu[ra] = "found"; mu[rb] = "current";
      push({ line: 8, marks: mu, a: ra, b: rb, action: "подвешиваем", info: "меньшее дерево (" + rb + ") подвешиваем под большее (" + ra + "); size[" + ra + "] = " + size[ra] });
    });
    push({ line: 10, done: true, info: "объединения завершены" });
    return { steps: steps };
  }

  // ===== Хеш-таблица (разрешение коллизий цепочками): Put / Get ==============
  // Массив бакетов, каждый — цепочка записей. hash(key)=key%m. hashViz рисует ряд
  // бакетов с цепочками; снимок s.buckets пересобирается каждый шаг (видно коллизию
  // как удлинение цепочки и скан цепочки при поиске).
  function hashViz(panel) {
    var host = mkEl("div", "algo-tp__hash"); panel.appendChild(host);
    return function (s) {
      host.innerHTML = "";
      var buckets = s.buckets || [], cur = (s.curBucket == null ? -1 : s.curBucket);
      buckets.forEach(function (chain, i) {
        var col = mkEl("div", "algo-tp__hbucket" + (i === cur ? " algo-tp__hbucket--cur" : ""));
        col.appendChild(mkEl("div", "algo-tp__hidx", i));
        var chainBox = mkEl("div", "algo-tp__hchain");
        if (!chain.length) chainBox.appendChild(mkEl("div", "algo-tp__hempty", "∅"));
        else chain.forEach(function (e) { chainBox.appendChild(mkEl("div", "algo-tp__hentry" + (e.cls ? " algo-tp__tnode--" + e.cls : ""), e.key)); });
        col.appendChild(chainBox);
        host.appendChild(col);
      });
    };
  }
  function hashBuild(keys, m) {
    var buckets = []; for (var i = 0; i < m; i++) buckets.push([]);
    keys.forEach(function (k) { buckets[((k % m) + m) % m].push(k); });
    return buckets;
  }
  function bHashPut(keys, m, key) {
    var buckets = hashBuild(keys, m), steps = [];
    function snap(curB, marks) { return buckets.map(function (chain, i) { return chain.map(function (k, j) { return { key: k, cls: (marks && marks[i] != null && marks[i][j]) || "" }; }); }); }
    function push(o) { steps.push({ si: steps.length, line: o.line, buckets: o.snap, curBucket: (o.curBucket == null ? -1 : o.curBucket), vars: { i: (o.i == null ? "—" : String(o.i)), key: String(key) }, info: o.info, done: o.done, created: o.created }); }
    var i = ((key % m) + m) % m;
    push({ line: 1, snap: snap(i, {}), curBucket: i, i: i, info: "hash(" + key + ") % " + m + " = " + i + " — бакет " + i });
    var chain = buckets[i], found = -1;
    for (var j = 0; j < chain.length; j++) {
      var mk = {}; mk[i] = {}; mk[i][j] = "current";
      push({ line: 2, snap: snap(i, mk), curBucket: i, i: i, info: "сравниваем с записью " + chain[j] + " в цепочке" });
      if (chain[j] === key) { found = j; var mf = {}; mf[i] = {}; mf[i][j] = "found"; push({ line: 4, snap: snap(i, mf), curBucket: i, i: i, done: true, info: "ключ " + key + " уже есть — обновили бы значение на месте" }); return { steps: steps }; }
    }
    chain.push(key);
    var mc = {}; mc[i] = {}; mc[i][chain.length - 1] = "created";
    push({ line: 8, snap: snap(i, mc), curBucket: i, i: i, created: true, done: true, info: (chain.length > 1 ? "коллизия: " : "") + "добавили " + key + " в конец цепочки бакета " + i });
    return { steps: steps };
  }
  function bHashGet(keys, m, key) {
    var buckets = hashBuild(keys, m), steps = [];
    function snap(marks) { return buckets.map(function (chain, i) { return chain.map(function (k, j) { return { key: k, cls: (marks && marks[i] != null && marks[i][j]) || "" }; }); }); }
    function push(o) { steps.push({ si: steps.length, line: o.line, buckets: o.snap, curBucket: (o.curBucket == null ? -1 : o.curBucket), vars: { i: (o.i == null ? "—" : String(o.i)), key: String(key) }, info: o.info, done: o.done, found: o.found }); }
    var i = ((key % m) + m) % m;
    push({ line: 1, snap: snap({}), curBucket: i, i: i, info: "hash(" + key + ") % " + m + " = " + i + " — ищем в бакете " + i });
    var chain = buckets[i];
    for (var j = 0; j < chain.length; j++) {
      var mk = {}; mk[i] = {}; mk[i][j] = "current";
      push({ line: 2, snap: snap(mk), curBucket: i, i: i, info: "сравниваем с " + chain[j] + (chain[j] === key ? " — совпало!" : " — мимо") });
      if (chain[j] === key) { var mf = {}; mf[i] = {}; mf[i][j] = "found"; push({ line: 4, snap: snap(mf), curBucket: i, i: i, done: true, found: true, info: "нашли ключ " + key + " в бакете " + i }); return { steps: steps }; }
    }
    push({ line: 7, snap: snap({}), curBucket: i, i: i, done: true, info: "ключа " + key + " нет в бакете " + i + " → return false" });
    return { steps: steps };
  }

  // ===== Дек (deque): вставка/удаление с обоих концов =========================
  // Один виджет проигрывает последовательность операций; dequeViz рисует горизонтальный
  // ряд с подписями «перёд»/«зад», снимок s.seq пересобирается каждый шаг.
  function dequeViz(panel) {
    var host = mkEl("div", "algo-tp__deque"); panel.appendChild(host);
    return function (s) {
      host.innerHTML = "";
      var seq = s.seq || [];
      host.appendChild(mkEl("div", "algo-tp__dqend", "◀ перёд"));
      if (!seq.length) host.appendChild(mkEl("div", "algo-tp__llnil", "∅"));
      else seq.forEach(function (e) { host.appendChild(mkEl("div", "algo-tp__dqcell" + (e.cls ? " algo-tp__tnode--" + e.cls : ""), e.val)); });
      host.appendChild(mkEl("div", "algo-tp__dqend", "зад ▶"));
    };
  }
  function bDeque(ops) {
    var dq = [], steps = [];
    function seqOf(marks) { return dq.map(function (v, i) { return { val: v, cls: (marks && marks[i]) || "" }; }); }
    function push(o) { steps.push({ si: steps.length, line: o.line, seq: o.seq, vars: { op: (o.op || "—"), val: (o.val == null ? "—" : String(o.val)) }, info: o.info, done: o.done }); }
    push({ line: 0, seq: seqOf({}), op: "старт", info: "дек пуст — применяем операции" });
    ops.forEach(function (tok) {
      tok = tok.trim(); if (!tok) return;
      var c = tok[0];
      if (c === "b") { var v = parseInt(tok.slice(1), 10); dq.push(v); var m = {}; m[dq.length - 1] = "created"; push({ line: 1, op: "pushBack", val: v, seq: seqOf(m), info: "PushBack(" + v + ") — добавили в конец (зад)" }); }
      else if (c === "f") { var w = parseInt(tok.slice(1), 10); dq.unshift(w); var mf = {}; mf[0] = "created"; push({ line: 2, op: "pushFront", val: w, seq: seqOf(mf), info: "PushFront(" + w + ") — добавили в начало (перёд)" }); }
      else if (c === "B") { if (dq.length) { var rb = {}; rb[dq.length - 1] = "removed"; push({ line: 3, op: "popBack", val: dq[dq.length - 1], seq: seqOf(rb), info: "PopBack() → " + dq[dq.length - 1] + " (сняли с конца)" }); dq.pop(); } }
      else if (c === "F") { if (dq.length) { var rf = {}; rf[0] = "removed"; push({ line: 4, op: "popFront", val: dq[0], seq: seqOf(rf), info: "PopFront() → " + dq[0] + " (сняли с начала)" }); dq.shift(); } }
    });
    push({ line: 0, seq: seqOf({}), op: "готово", done: true, info: "итог: [" + dq.join(", ") + "]" });
    return { steps: steps };
  }

  // ===== Sparse table (разреженная таблица): Build / Query ===================
  // Статический range-min: table[k][i] = min на [i, i+2^k-1]. sparseViz рисует
  // 2D-таблицу (строки k, столбцы i), снимок s.table пересобирается каждый шаг.
  function sparseDims(n) { var K = 0; while ((1 << (K + 1)) <= n) K++; return K; }
  function sparseTable(arr) {
    var n = arr.length, K = sparseDims(n), t = [];
    for (var k = 0; k <= K; k++) { var row = []; for (var i = 0; i < n; i++) row.push({ v: null, valid: (i + (1 << k) - 1 < n) }); t.push(row); }
    return { t: t, K: K, n: n };
  }
  function sparseViz(panel) {
    var host = mkEl("div", "algo-tp__sparse"); panel.appendChild(host);
    return function (s) {
      host.innerHTML = "";
      var table = s.table || [], n = (table[0] ? table[0].length : 0);
      var grid = mkEl("div", "algo-tp__sptable");
      grid.style.gridTemplateColumns = "auto repeat(" + n + ", minmax(2.2em, 1fr))";
      grid.appendChild(mkEl("div", "algo-tp__sphead", "k\\i"));
      for (var i = 0; i < n; i++) grid.appendChild(mkEl("div", "algo-tp__sphead", i));
      table.forEach(function (row, k) {
        grid.appendChild(mkEl("div", "algo-tp__sphead", "2^" + k + "=" + (1 << k)));
        row.forEach(function (cell) {
          if (!cell.valid) { grid.appendChild(mkEl("div", "algo-tp__spvoid", "")); return; }
          grid.appendChild(mkEl("div", "algo-tp__spcell" + (cell.cls ? " algo-tp__tnode--" + cell.cls : ""), cell.val == null ? "·" : cell.val));
        });
      });
      host.appendChild(grid);
    };
  }
  function bSparseBuild(arr) {
    var S = sparseTable(arr), t = S.t, K = S.K, n = S.n, steps = [];
    function snap(marks) { return t.map(function (row, k) { return row.map(function (cell, i) { return { val: cell.v, valid: cell.valid, cls: (marks && marks[k] != null && marks[k][i]) || "" }; }); }); }
    function push(o) { steps.push({ si: steps.length, line: o.line, table: o.snap, vars: { k: (o.k == null ? "—" : String(o.k)), range: (o.range || "—") }, info: o.info, done: o.done }); }
    for (var i0 = 0; i0 < n; i0++) t[0][i0].v = arr[i0];
    var m0 = {}; m0[0] = {}; for (var i1 = 0; i1 < n; i1++) m0[0][i1] = "created";
    push({ line: 1, snap: snap(m0), k: 0, range: "длина 1", info: "строка k=0 — это сам массив (минимум одного элемента)" });
    for (var k = 1; k <= K; k++) {
      var half = 1 << (k - 1);
      for (var i = 0; i + (1 << k) <= n; i++) {
        var left = t[k - 1][i].v, right = t[k - 1][i + half].v;
        t[k][i].v = Math.min(left, right);
        var m = {}; m[k] = {}; m[k][i] = "created"; m[k - 1] = {}; m[k - 1][i] = "found"; m[k - 1][i + half] = "found";
        push({ line: 4, snap: snap(m), k: k, range: "[" + i + ".." + (i + (1 << k) - 1) + "]", info: "table[" + k + "][" + i + "] = min([" + i + ".." + (i + half - 1) + "]=" + left + ", [" + (i + half) + ".." + (i + (1 << k) - 1) + "]=" + right + ") = " + t[k][i].v });
      }
    }
    push({ line: 7, snap: snap({}), done: true, info: "таблица построена: table[k][i] = минимум на [i .. i+2^k−1]" });
    return { steps: steps };
  }
  function bSparseQuery(arr, l, r) {
    var S = sparseTable(arr), t = S.t, K = S.K, n = S.n;
    for (var i0 = 0; i0 < n; i0++) t[0][i0].v = arr[i0];
    for (var k0 = 1; k0 <= K; k0++) { var h = 1 << (k0 - 1); for (var i = 0; i + (1 << k0) <= n; i++) { t[k0][i].v = Math.min(t[k0 - 1][i].v, t[k0 - 1][i + h].v); } }
    function snap(marks) { return t.map(function (row, k) { return row.map(function (cell, i) { return { val: cell.v, valid: cell.valid, cls: (marks && marks[k] != null && marks[k][i]) || "" }; }); }); }
    var steps = [];
    function push(o) { steps.push({ si: steps.length, line: o.line, table: o.snap, vars: { k: (o.k == null ? "—" : String(o.k)), ans: (o.ans == null ? "—" : String(o.ans)) }, info: o.info, done: o.done, found: o.found }); }
    var len = r - l + 1, k = 0; while ((1 << (k + 1)) <= len) k++;
    push({ line: 1, snap: snap({}), k: k, info: "длина [" + l + "," + r + "] = " + len + " → k = ⌊log2(" + len + ")⌋ = " + k + " (2^" + k + "=" + (1 << k) + ")" });
    var i2 = r - (1 << k) + 1;
    var m = {}; m[k] = {}; m[k][l] = "found"; m[k][i2] = "found";
    var a = t[k][l].v, b = t[k][i2].v, ans = Math.min(a, b);
    push({ line: 2, snap: snap(m), k: k, ans: ans, found: true, done: true, info: "min(table[" + k + "][" + l + "]=" + a + " на [" + l + ".." + (l + (1 << k) - 1) + "], table[" + k + "][" + i2 + "]=" + b + " на [" + i2 + ".." + r + "]) = " + ans + " — два перекрывающихся отрезка длины 2^" + k + " покрывают [" + l + "," + r + "]" });
    return { steps: steps };
  }

  // ===== Гонка данных: таймлайн горутин (parallel BFS без замка) =============
  // Иллюстративное (детерминированное) чередование двух горутин, наперегонки
  // помечающих одну вершину. Шаги несут tl = { events, now, race } — отрисовка в
  // raceViz. now двигает «время»; события до now показаны, текущее подсвечено,
  // окно гонки (оба прочитали false до записи) выделено красным.
  function bRaceTimeline(n) {
    if (!(n >= 2)) n = 2;
    if (n > 4) n = 4;
    var E = [], lineOf = [], infoOf = [], t = 0, i;
    // Все n горутин читают false (одно валидное «худшее» чередование), затем все
    // добавляют 3 — вершина попадает в next n раз.
    for (i = 0; i < n; i++) {
      E.push({ lane: i, t: t++, kind: "read", label: "read 3 → false", racy: true });
      lineOf.push(2);
      infoOf.push("G" + (i + 1) + " читает visited[3] — пока false (никто ещё не записал)");
    }
    for (i = 0; i < n; i++) {
      var dup = i > 0;
      E.push({ lane: i, t: t++, kind: "append", label: dup ? "next ← 3 ✗" : "next ← 3" });
      lineOf.push(4);
      infoOf.push(dup
        ? "G" + (i + 1) + " добавляет 3 ещё раз — ДУБЛИКАТ: читал false до записи"
        : "G1 помечает visited[3]=true и добавляет 3 в next");
    }
    var steps = [];
    for (var k = 0; k < E.length; k++) {
      steps.push({
        si: k, line: lineOf[k],
        vars: { g: "G" + (E[k].lane + 1), act: E[k].label },
        info: infoOf[k],
        tl: { events: E, now: k, race: [0, n - 1] }
      });
    }
    steps.push({
      si: E.length, line: 6, done: true,
      vars: { g: "—", act: "гонка" },
      info: "3 добавлен " + n + " раз вместо одного: все горутины прочитали false до записи. Фикс — mutex или atomic CAS.",
      tl: { events: E, now: E.length - 1, race: [0, n - 1] }
    });
    return { steps: steps };
  }

  // Трасса BFSLevelsConcLocal на уровне с фронтом {1,2}, где обе вершины ведут в
  // 3. Обе горутины делают atomic CAS на visited[3]; выигрывает одна — дубля нет.
  // (Кто именно успел первым — зависит от планировщика; показано одно из течений,
  //  важен инвариант: 3 застолблён ровно один раз.)
  function bLocalTimeline(n) {
    if (!(n >= 2)) n = 2;
    if (n > 4) n = 4;
    var E = [], lineOf = [], infoOf = [], t = 0, i;
    E.push({ lane: 0, t: t++, kind: "claim", label: "CAS 3: 0→1 ✓" });
    lineOf.push(2);
    infoOf.push("G1 атомарно столбит 3: CAS переводит visited[3] 0→1 — успех");
    for (i = 1; i < n; i++) { // остальные опоздали: CAS не проходит
      E.push({ lane: i, t: t++, kind: "skip", label: "CAS 3: занято" });
      lineOf.push(2);
      infoOf.push("G" + (i + 1) + " пробует тот же CAS — там уже 1, не прошёл, 3 не берётся");
    }
    E.push({ lane: 0, t: t++, kind: "append", label: "local ← 3" });
    lineOf.push(3);
    infoOf.push("Победитель CAS (G1) кладёт 3 в свой локальный фронт");
    var steps = [];
    for (var k = 0; k < E.length; k++) {
      steps.push({
        si: k, line: lineOf[k],
        vars: { g: "G" + (E[k].lane + 1), act: E[k].label },
        info: infoOf[k],
        tl: { events: E, now: k, race: null }
      });
    }
    steps.push({
      si: E.length, line: 4, done: true,
      vars: { g: "merge", act: "next ← [3]" },
      info: "После барьера фронты сливаются: 3 добавлен РОВНО раз, кто бы из " + n + " ни выиграл CAS. Ни мьютекса, ни гонки.",
      tl: { events: E, now: E.length - 1, race: null }
    });
    return { steps: steps };
  }

  // Подсчёт частот: гонка на ОБЩЕЙ map (несколько горутин cnt[x]++ без
  // синхронизации). Все читают одно значение и пишут одно и то же — инкременты
  // теряются (а Go-map ещё и падает с fatal error: concurrent map writes).
  function bWcRace(n) {
    if (!(n >= 2)) n = 2;
    if (n > 4) n = 4;
    var E = [], lineOf = [], infoOf = [], t = 0, i;
    for (i = 0; i < n; i++) {
      E.push({ lane: i, t: t++, kind: "read", label: "read cnt[7]=0", racy: true });
      lineOf.push(3);
      infoOf.push("G" + (i + 1) + " читает cnt[7] — видит 0 (никто ещё не записал)");
    }
    for (i = 0; i < n; i++) {
      var lost = i > 0;
      E.push({ lane: i, t: t++, kind: "write", label: lost ? "cnt[7]=1 ✗" : "cnt[7]=1" });
      lineOf.push(3);
      infoOf.push(lost
        ? "G" + (i + 1) + " пишет cnt[7]=1 поверх — его инкремент ПОТЕРЯН (читал 0)"
        : "G1 пишет cnt[7]=1");
    }
    var steps = [];
    for (var k = 0; k < E.length; k++) {
      steps.push({ si: k, line: lineOf[k], vars: { g: "G" + (E[k].lane + 1), act: E[k].label }, info: infoOf[k], tl: { events: E, now: k, race: [0, n - 1] } });
    }
    steps.push({ si: E.length, line: 3, done: true, vars: { g: "—", act: "потеря" }, info: "Итог cnt[7]=1 вместо " + n + ": " + (n - 1) + " инкрементов потеряны. А Go-map при конкурентной записи ещё и роняет программу — fatal error: concurrent map writes.", tl: { events: E, now: E.length - 1, race: [0, n - 1] } });
    return { steps: steps };
  }

  // Подсчёт частот правильно: у каждой горутины СВОЯ карта (зелёный инкремент),
  // после барьера локальные карты сливаются — все инкременты на месте, без гонки.
  function bWcLocal(n) {
    if (!(n >= 2)) n = 2;
    if (n > 4) n = 4;
    var E = [], lineOf = [], infoOf = [], t = 0, i;
    for (i = 0; i < n; i++) {
      E.push({ lane: i, t: t++, kind: "claim", label: "local cnt[7]=1" });
      lineOf.push(3);
      infoOf.push("G" + (i + 1) + " считает в СВОЮ карту: local[7]=1 — общей записи нет");
    }
    E.push({ lane: 0, t: t++, kind: "append", label: "merge: cnt[7]=" + n });
    lineOf.push(7);
    infoOf.push("После барьера локальные карты сливаются: cnt[7] = сумма = " + n);
    var steps = [];
    for (var k = 0; k < E.length; k++) {
      steps.push({ si: k, line: lineOf[k], vars: { g: (E[k].kind === "append" ? "merge" : "G" + (E[k].lane + 1)), act: E[k].label }, info: infoOf[k], tl: { events: E, now: k, race: null } });
    }
    steps.push({ si: E.length, line: 7, done: true, vars: { g: "merge", act: "cnt[7]=" + n }, info: "Все " + n + " инкрементов на месте: cnt[7]=" + n + ". Ни гонки, ни потери, ни паники — синхронизация только в момент слияния.", tl: { events: E, now: E.length - 1, race: null } });
    return { steps: steps };
  }

  // raceViz — таймлайн: две дорожки-горутины по горизонтали (время слева направо),
  // события-чипы по типам (read/write/append), окно гонки — красная полоса.
  function raceViz(panel) {
    var host = mkEl("div", "algo-tp__race"); panel.appendChild(host);
    var FILL = { read: "#e6f0ff", write: "#fff0e0", append: "#e6f7ec", claim: "#e6f7ec", skip: "#f0f0f0" };
    var STROKE = { read: "#4a90d9", write: "#e08a3c", append: "#46a86b", claim: "#46a86b", skip: "#aaa" };
    return function (s) {
      host.innerHTML = "";
      var tl = s.tl; if (!tl) return;
      var evs = tl.events, now = tl.now;
      var COLW = 92, ROWH = 56, PADL = 104, PADT = 28, BOXW = 78;
      var ncol = 0, nlane = 0;
      evs.forEach(function (e) { if (e.t + 1 > ncol) ncol = e.t + 1; if (e.lane + 1 > nlane) nlane = e.lane + 1; });
      if (nlane < 1) nlane = 1;
      var W = PADL + ncol * COLW + 16, H = PADT + nlane * ROWH + 24;
      var svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.setAttribute("width", "100%"); svg.setAttribute("style", "max-width:" + W + "px");
      function el(tag, attrs) {
        var n = document.createElementNS(SVGNS, tag);
        for (var a in attrs) n.setAttribute(a, attrs[a]);
        return n;
      }
      // окно гонки
      if (tl.race && now >= tl.race[0]) {
        var rx = PADL + tl.race[0] * COLW - 14;
        var rw = (Math.min(now, tl.race[1]) - tl.race[0]) * COLW + BOXW + 28;
        svg.appendChild(el("rect", { x: rx, y: PADT - 12, width: Math.max(rw, BOXW + 28), height: nlane * ROWH + 4, rx: 8, fill: "rgba(220,40,40,0.10)", stroke: "#d33", "stroke-dasharray": "4 3" }));
      }
      // дорожки (G1..Gn)
      for (var li = 0; li < nlane; li++) {
        var ly = PADT + li * ROWH + ROWH / 2;
        svg.appendChild(el("line", { x1: PADL - 10, y1: ly, x2: W - 8, y2: ly, stroke: "#ccc", "stroke-width": 1 }));
        var lbl = el("text", { x: 8, y: ly + 4, fill: "#666", "font-size": 12, "font-weight": 600 });
        lbl.textContent = "горутина G" + (li + 1); svg.appendChild(lbl);
      }
      // события
      evs.forEach(function (e) {
        if (e.t > now) return;
        var x = PADL + e.t * COLW, y = PADT + e.lane * ROWH + ROWH / 2;
        var stroke = e.racy ? "#d33" : STROKE[e.kind];
        var sw = (e.t === now) ? 3 : (e.racy ? 2 : 1);
        svg.appendChild(el("rect", { x: x, y: y - 15, width: BOXW, height: 30, rx: 6, fill: FILL[e.kind], stroke: stroke, "stroke-width": sw }));
        var tx = el("text", { x: x + BOXW / 2, y: y + 4, "text-anchor": "middle", "font-size": 11, fill: "#222" });
        tx.textContent = e.label; svg.appendChild(tx);
      });
      host.appendChild(svg);
    };
  }

  // ===== AVL-дерево: вставка с балансировкой (повороты) ======================
  // Переиспользует bstSnap/bstViz (структурное дерево). Итеративная вставка с
  // явным стеком предков: после вставки листа поднимаемся, считаем баланс и при
  // |баланс|>1 делаем поворот (LL/RR/LR/RL), сразу перецепляя поддерево к предку —
  // поэтому снимок всего дерева на каждом шаге консистентен, и поворот виден.
  function bAVLInsert(initialVals, val) {
    var seq = { n: 0 };
    function mk(v) { return { id: seq.n++, val: v, left: null, right: null, h: 1 }; }
    function H(n) { return n ? n.h : 0; }
    function upd(n) { n.h = 1 + Math.max(H(n.left), H(n.right)); }
    function bal(n) { return n ? H(n.left) - H(n.right) : 0; }
    function rotR(y) { var x = y.left; y.left = x.right; x.right = y; upd(y); upd(x); return x; }
    function rotL(x) { var y = x.right; x.right = y.left; y.left = x; upd(x); upd(y); return y; }
    var root = null;
    (function () {
      function ins(n, v) {
        if (!n) return mk(v);
        if (v < n.val) n.left = ins(n.left, v); else n.right = ins(n.right, v);
        upd(n); var b = bal(n);
        if (b > 1 && bal(n.left) >= 0) return rotR(n);
        if (b > 1) { n.left = rotL(n.left); return rotR(n); }
        if (b < -1 && bal(n.right) <= 0) return rotL(n);
        if (b < -1) { n.right = rotR(n.right); return rotL(n); }
        return n;
      }
      initialVals.forEach(function (v) { root = ins(root, v); });
    })();
    var steps = [];
    function push(o) { steps.push({ si: steps.length, line: o.line, tree: o.tree, vars: { node: (o.node == null ? "—" : String(o.node)), action: (o.action || "—") }, info: o.info, done: o.done, created: o.created }); }
    push({ line: 0, tree: bstSnap(root, {}), node: (root ? root.val : "—"), action: "старт", info: "вставляем " + val + " как в обычное BST, затем балансируем поворотами" });
    if (!root) { root = mk(val); var m0 = {}; m0[root.id] = "created"; push({ line: 1, tree: bstSnap(root, m0), node: val, action: "корень", created: true, done: true, info: "дерево было пустым — " + val + " становится корнем" }); return { steps: steps }; }
    var stack = [], cur = root;
    while (cur) {
      stack.push(cur);
      var m = {}; m[cur.id] = "current";
      push({ line: 2, tree: bstSnap(root, m), node: cur.val, action: "спуск", info: val + " vs " + cur.val + (val < cur.val ? " — влево" : " — вправо") });
      if (val < cur.val) { if (!cur.left) break; cur = cur.left; } else { if (!cur.right) break; cur = cur.right; }
    }
    var leaf = mk(val), parent = stack[stack.length - 1];
    if (val < parent.val) parent.left = leaf; else parent.right = leaf;
    var mc = {}; mc[leaf.id] = "created";
    push({ line: 1, tree: bstSnap(root, mc), node: val, action: "лист", created: true, info: val + " вставлен листом" });
    var rotated = false;
    for (var s = stack.length - 1; s >= 0; s--) {
      var n = stack[s]; upd(n); var b = bal(n);
      var mb = {}; mb[n.id] = "current";
      push({ line: 4, tree: bstSnap(root, mb), node: n.val, action: "баланс", info: "узел " + n.val + ": высота " + n.h + ", баланс = " + b + (Math.abs(b) <= 1 ? " (ок)" : " — ДИСБАЛАНС") });
      if (Math.abs(b) <= 1) continue;
      var sub, caseName, ln;
      if (b > 1) { if (bal(n.left) < 0) { caseName = "LR"; ln = 6; n.left = rotL(n.left); } else { caseName = "LL"; ln = 5; } sub = rotR(n); }
      else { if (bal(n.right) > 0) { caseName = "RL"; ln = 8; n.right = rotR(n.right); } else { caseName = "RR"; ln = 7; } sub = rotL(n); }
      var par = stack[s - 1];
      if (!par) root = sub; else if (par.left === n) par.left = sub; else par.right = sub;
      var mr = {}; mr[sub.id] = "found";
      push({ line: ln, tree: bstSnap(root, mr), node: sub.val, action: "поворот " + caseName, info: "случай " + caseName + ": поворот вокруг " + n.val + " → новый корень поддерева " + sub.val + " (высота снова сбалансирована)" });
      rotated = true; break;
    }
    push({ line: 10, tree: bstSnap(root, {}), node: (root ? root.val : "—"), action: "готово", done: true, info: rotated ? "дерево сбалансировано поворотом, высота O(log n)" : "дерево осталось сбалансированным — поворот не понадобился" });
    return { steps: steps };
  }

  // ===== B-дерево (минимальная степень t=2, до 3 ключей в узле): Insert/Search
  // Многопутевое сбалансированное дерево. btreeSnap раскладывает узлы (x по DFS,
  // глубина), рёбра parent→child. Вставка top-down делит полные узлы заранее.
  var BT_T = 2, BT_MAX = 2 * BT_T - 1; // max 3 ключа
  function btreeSilentInsert(rootRef, k, seq) {
    function splitChild(parent, i) {
      var child = parent.children[i];
      var right = { id: seq.n++, keys: child.keys.slice(BT_T), children: child.children.length ? child.children.slice(BT_T) : [] };
      var mid = child.keys[BT_T - 1];
      child.keys = child.keys.slice(0, BT_T - 1);
      if (child.children.length) child.children = child.children.slice(0, BT_T);
      parent.keys.splice(i, 0, mid); parent.children.splice(i + 1, 0, right);
    }
    function insNonFull(n, k) {
      var i = n.keys.length - 1;
      if (!n.children.length) { while (i >= 0 && k < n.keys[i]) i--; n.keys.splice(i + 1, 0, k); return; }
      while (i >= 0 && k < n.keys[i]) i--; i++;
      if (n.children[i].keys.length === BT_MAX) { splitChild(n, i); if (k > n.keys[i]) i++; }
      insNonFull(n.children[i], k);
    }
    var root = rootRef.root;
    if (root.keys.length === BT_MAX) { var s = { id: seq.n++, keys: [], children: [root] }; splitChild(s, 0); rootRef.root = s; root = s; }
    insNonFull(root, k);
  }
  function btreeSnap(root, marks) {
    var list = [], c = { c: 0 };
    (function rec(n, d) {
      n._d = d;
      if (!n.children.length) { n._x = c.c++; }
      else { var xs = []; n.children.forEach(function (ch) { rec(ch, d + 1); xs.push(ch._x); }); n._x = (xs[0] + xs[xs.length - 1]) / 2; }
      list.push(n);
    })(root, 0);
    var nodes = list.map(function (n) { return { keys: n.keys.slice(), x: n._x, depth: n._d, cls: (marks && marks[n.id]) || "" }; });
    var edges = []; list.forEach(function (n) { n.children.forEach(function (ch) { edges.push([n._x, n._d, ch._x, ch._d]); }); });
    return { nodes: nodes, edges: edges };
  }
  function btreeViz(panel) {
    var CW = 78, CH = 76, RH = 16;
    var host = mkEl("div", "algo-tp__bst"); panel.appendChild(host);
    return function (s) {
      host.innerHTML = "";
      var tr = s.tree || { nodes: [], edges: [] };
      if (!tr.nodes.length) { host.appendChild(mkEl("div", "algo-tp__llnil", "∅")); return; }
      var maxX = 0, maxD = 0; tr.nodes.forEach(function (n) { maxX = Math.max(maxX, n.x); maxD = Math.max(maxD, n.depth); });
      var W = (maxX + 1) * CW, H = (maxD + 1) * CH;
      host.style.position = "relative"; host.style.width = W + "px"; host.style.height = H + "px";
      function cx(x) { return x * CW + CW / 2; }
      function cy(d) { return d * CH + 24; }
      var svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "algo-tp__bstsvg");
      tr.edges.forEach(function (e) { var ln = document.createElementNS(SVGNS, "line"); ln.setAttribute("x1", cx(e[0])); ln.setAttribute("y1", cy(e[1]) + RH); ln.setAttribute("x2", cx(e[2])); ln.setAttribute("y2", cy(e[3]) - RH); ln.setAttribute("class", "algo-tp__bstedge"); svg.appendChild(ln); });
      host.appendChild(svg);
      tr.nodes.forEach(function (n) {
        var box = mkEl("div", "algo-tp__btnode" + (n.cls ? " algo-tp__btnode--" + n.cls : ""));
        n.keys.forEach(function (k) { box.appendChild(mkEl("div", "algo-tp__btkey", k)); });
        box.style.position = "absolute"; box.style.left = (cx(n.x) - n.keys.length * 13) + "px"; box.style.top = (cy(n.depth) - RH) + "px";
        host.appendChild(box);
      });
    };
  }
  function bBTreeInsert(initialKeys, key) {
    var seq = { n: 0 }, rootRef = { root: { id: seq.n++, keys: [], children: [] } };
    initialKeys.forEach(function (k) { btreeSilentInsert(rootRef, k, seq); });
    var root = rootRef.root, steps = [];
    function push(o) { steps.push({ si: steps.length, line: o.line, tree: o.tree, vars: { node: (o.node || "—"), action: (o.action || "—") }, info: o.info, done: o.done }); }
    function splitChild(parent, i) {
      var child = parent.children[i];
      var right = { id: seq.n++, keys: child.keys.slice(BT_T), children: child.children.length ? child.children.slice(BT_T) : [] };
      var mid = child.keys[BT_T - 1];
      child.keys = child.keys.slice(0, BT_T - 1);
      if (child.children.length) child.children = child.children.slice(0, BT_T);
      parent.keys.splice(i, 0, mid); parent.children.splice(i + 1, 0, right); return mid;
    }
    push({ line: 0, tree: btreeSnap(root, {}), action: "старт", info: "вставляем " + key + "; полный узел (3 ключа) делим заранее, средний ключ — вверх" });
    if (root.keys.length === BT_MAX) {
      var s = { id: seq.n++, keys: [], children: [root] }; root = s;
      var mid = splitChild(s, 0); var m = {}; m[s.id] = "current";
      push({ line: 3, tree: btreeSnap(root, m), node: String(mid), action: "split корня", info: "корень был полон — новый корень, средний ключ " + mid + " поднялся; высота +1" });
    }
    var n = root;
    while (n.children.length) {
      var mn = {}; mn[n.id] = "current";
      push({ line: 9, tree: btreeSnap(root, mn), node: n.keys.join(","), action: "спуск", info: "в узле [" + n.keys.join(",") + "] ищем ребёнка для " + key });
      var i = n.keys.length - 1; while (i >= 0 && key < n.keys[i]) i--; i++;
      if (n.children[i].keys.length === BT_MAX) {
        var mid2 = splitChild(n, i); var ms = {}; ms[n.id] = "found";
        push({ line: 11, tree: btreeSnap(root, ms), node: String(mid2), action: "split", info: "ребёнок полон — делим, средний ключ " + mid2 + " поднялся в [" + n.keys.join(",") + "]" });
        if (key > n.keys[i]) i++;
      }
      n = n.children[i];
    }
    var li = n.keys.length - 1; while (li >= 0 && key < n.keys[li]) li--; n.keys.splice(li + 1, 0, key);
    var ml = {}; ml[n.id] = "created";
    push({ line: 8, tree: btreeSnap(root, ml), node: String(key), action: "в лист", info: key + " вставлен в лист [" + n.keys.join(",") + "]" });
    push({ line: 5, tree: btreeSnap(root, {}), done: true, action: "готово", info: "вставка завершена; все листья на одной глубине" });
    return { steps: steps };
  }
  function bBTreeSearch(keys, key) {
    var seq = { n: 0 }, rootRef = { root: { id: seq.n++, keys: [], children: [] } };
    keys.forEach(function (k) { btreeSilentInsert(rootRef, k, seq); });
    var root = rootRef.root, steps = [];
    function push(o) { steps.push({ si: steps.length, line: o.line, tree: o.tree, vars: { node: (o.node || "—"), key: String(key) }, info: o.info, done: o.done, found: o.found }); }
    push({ line: 1, tree: btreeSnap(root, {}), node: (root.keys.join(",") || "∅"), info: "Search(" + key + "): начинаем с корня" });
    var n = root;
    while (n) {
      var i = 0; while (i < n.keys.length && key > n.keys[i]) i++;
      var m = {}; m[n.id] = "current";
      push({ line: 4, tree: btreeSnap(root, m), node: n.keys.join(","), info: "в узле [" + n.keys.join(",") + "] ищем позицию для " + key });
      if (i < n.keys.length && key === n.keys[i]) { var mf = {}; mf[n.id] = "found"; push({ line: 5, tree: btreeSnap(root, mf), node: n.keys.join(","), found: true, done: true, info: key + " найден в узле [" + n.keys.join(",") + "]" }); return { steps: steps }; }
      if (!n.children.length) { push({ line: 6, tree: btreeSnap(root, m), node: n.keys.join(","), done: true, info: key + " нет: дошли до листа" }); return { steps: steps }; }
      push({ line: 7, tree: btreeSnap(root, m), node: n.keys.join(","), info: "спускаемся в ребёнка #" + i + " (между ключами)" });
      n = n.children[i];
    }
    return { steps: steps };
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

  // ===== Дерево отрезков: Build / Update =====================================
  // segViz фиксирует текст узла раз и навсегда (ок для запроса). Для построения и
  // обновления суммы МЕНЯЮТСЯ по шагам, поэтому segTreeViz перерисовывает дерево по
  // снимку s.tree на каждом шаге (узлы по уровням, сортировка по lo, как у segViz).
  function segTreeViz(panel) {
    var host = mkEl("div", "algo-tp__tree"); panel.appendChild(host);
    return function (s) {
      host.innerHTML = "";
      var nodes = s.tree || [];
      if (!nodes.length) { host.appendChild(mkEl("div", "algo-tp__llnil", "∅")); return; }
      var maxD = 0; nodes.forEach(function (n) { maxD = Math.max(maxD, n.depth); });
      for (var d = 0; d <= maxD; d++) {
        var row = mkEl("div", "algo-tp__trow");
        nodes.filter(function (n) { return n.depth === d; }).sort(function (a, b) { return a.lo - b.lo; }).forEach(function (n) {
          var c = mkEl("div", "algo-tp__tnode algo-tp__tnode--seg" + (n.cls ? " algo-tp__tnode--" + n.cls : ""), (n.sum == null ? "·" : n.sum));
          c.title = "[" + n.lo + "," + n.hi + "]";
          row.appendChild(c);
        });
        host.appendChild(row);
      }
    };
  }
  function bSegNodes(arr) {
    var nodes = [];
    (function build(lo, hi, depth) {
      var id = nodes.length; nodes.push({ id: id, lo: lo, hi: hi, sum: null, left: -1, right: -1, depth: depth });
      if (lo === hi) return id;
      var mid = (lo + hi) >> 1;
      nodes[id].left = build(lo, mid, depth + 1); nodes[id].right = build(mid + 1, hi, depth + 1);
      return id;
    })(0, arr.length - 1, 0);
    return nodes;
  }
  function bSegBuild(arr) {
    var nodes = bSegNodes(arr), steps = [];
    function snap(marks) { return nodes.map(function (n) { return { lo: n.lo, hi: n.hi, sum: n.sum, depth: n.depth, cls: (marks && marks[n.id]) || "" }; }); }
    function push(o) { steps.push({ si: steps.length, line: o.line, tree: snap(o.marks || {}), vars: { node: (o.node || "—"), action: (o.action || "—") }, info: o.info, done: o.done }); }
    var full = "[0," + (arr.length - 1) + "]";
    push({ line: 0, tree: snap({}), node: full, action: "строим", info: "строим дерево отрезков снизу вверх (каждый узел = сумма своего диапазона)" });
    (function fill(id) {
      var nd = nodes[id], L = "[" + nd.lo + "," + nd.hi + "]";
      if (nd.lo === nd.hi) { nd.sum = arr[nd.lo]; var m = {}; m[id] = "created"; push({ line: 1, marks: m, node: L, action: "лист", info: L + " — лист: tree = arr[" + nd.lo + "] = " + nd.sum }); return; }
      fill(nd.left); fill(nd.right);
      nd.sum = nodes[nd.left].sum + nodes[nd.right].sum;
      var m2 = {}; m2[id] = "created"; m2[nd.left] = "found"; m2[nd.right] = "found";
      push({ line: 5, marks: m2, node: L, action: "узел", info: L + " = " + nodes[nd.left].sum + " + " + nodes[nd.right].sum + " = " + nd.sum });
    })(0);
    push({ line: 5, tree: snap({}), node: full, action: "готово", done: true, info: "дерево построено; корень = сумма всего массива = " + nodes[0].sum });
    return { steps: steps };
  }
  function bSegUpdate(arr, idx, val) {
    var nodes = bSegNodes(arr), steps = [];
    (function fill(id) { var nd = nodes[id]; if (nd.lo === nd.hi) { nd.sum = arr[nd.lo]; return; } fill(nd.left); fill(nd.right); nd.sum = nodes[nd.left].sum + nodes[nd.right].sum; })(0);
    function snap(marks) { return nodes.map(function (n) { return { lo: n.lo, hi: n.hi, sum: n.sum, depth: n.depth, cls: (marks && marks[n.id]) || "" }; }); }
    function push(o) { steps.push({ si: steps.length, line: o.line, tree: snap(o.marks || {}), vars: { node: (o.node || "—"), action: (o.action || "—") }, info: o.info, done: o.done }); }
    push({ line: 0, tree: snap({}), node: "[" + idx + "]", action: "старт", info: "обновляем индекс " + idx + " на " + val + " (меняется лист и суммы по пути к корню)" });
    (function upd(id) {
      var nd = nodes[id], L = "[" + nd.lo + "," + nd.hi + "]", m = {}; m[id] = "current";
      if (nd.lo === nd.hi) { nd.sum = val; var ml = {}; ml[id] = "created"; push({ line: 1, marks: ml, node: L, action: "лист", info: L + " — лист: tree = " + val }); return; }
      var mid = (nd.lo + nd.hi) >> 1;
      if (idx <= mid) { push({ line: 4, marks: m, node: L, action: "влево", info: idx + " ≤ " + mid + " — спускаемся в левого ребёнка" }); upd(nd.left); }
      else { push({ line: 6, marks: m, node: L, action: "вправо", info: idx + " > " + mid + " — спускаемся в правого ребёнка" }); upd(nd.right); }
      nd.sum = nodes[nd.left].sum + nodes[nd.right].sum;
      var mu = {}; mu[id] = "created"; mu[nd.left] = "found"; mu[nd.right] = "found";
      push({ line: 8, marks: mu, node: L, action: "пересчёт", info: L + " = " + nodes[nd.left].sum + " + " + nodes[nd.right].sum + " = " + nd.sum });
    })(0);
    push({ line: 8, tree: snap({}), node: "[0," + (arr.length - 1) + "]", action: "готово", done: true, info: "индекс " + idx + " обновлён; суммы по пути пересчитаны, корень = " + nodes[0].sum });
    return { steps: steps };
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

  // Наив graphs: число провинций через транзитивное замыкание (Флойд–Уоршелл) O(V³).
  // Заполняем матрицу reach[i][j] тройным циклом, потом считаем компоненты. Рисует reachMatrixViz.
  function bNumProvincesNaive(labels, edges) {
    var n = labels.length, reach = [];
    for (var a = 0; a < n; a++) { reach.push([]); for (var b = 0; b < n; b++) reach[a].push(a === b); }
    edges.forEach(function (e) { reach[e[0]][e[1]] = true; reach[e[1]][e[0]] = true; });
    function snap() { return reach.map(function (r) { return r.slice(); }); }
    var steps = [];
    function vv(k, i, j, count) { return { k: (k == null ? "—" : labels[k]), i: (i == null ? "—" : labels[i]), j: (j == null ? "—" : labels[j]), "провинций": (count == null ? "—" : count) }; }
    steps.push({ reach: snap(), line: 2, vars: vv(), info: "reach[i][j] = (i==j) или прямая связь — стартовая матрица достижимости" });
    for (var k = 0; k < n; k++) for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      var via = reach[i][k] && reach[k][j], was = reach[i][j];
      if (via && !was) reach[i][j] = true;
      steps.push({ reach: snap(), ci: i, cj: j, ck: k, improved: (via && !was), line: 6, vars: vv(k, i, j), info: "через " + labels[k] + ": reach[" + labels[i] + "][" + labels[k] + "] && reach[" + labels[k] + "][" + labels[j] + "] = " + via + (via && !was ? " → reach[" + labels[i] + "][" + labels[j] + "] = true (новый путь)" : (was ? " (уже было)" : "")) });
    }
    var seen = new Array(n).fill(false), count = 0;
    for (var ii = 0; ii < n; ii++) {
      if (seen[ii]) { steps.push({ reach: snap(), ci: ii, line: 14, vars: vv(null, ii, null, count), info: labels[ii] + " уже учтён — пропуск" }); continue; }
      count++;
      steps.push({ reach: snap(), ci: ii, improved: true, line: 15, vars: vv(null, ii, null, count), info: labels[ii] + " — новая провинция #" + count + ", помечаем достижимых из него" });
      for (var jj = 0; jj < n; jj++) if (reach[ii][jj]) seen[jj] = true;
    }
    steps.push({ reach: snap(), done: true, found: true, line: 20, vars: vv(null, null, null, count), info: "return count = " + count + " — число провинций" });
    return steps;
  }
  function reachMatrixViz(panel, ctx) {
    var labels = ctx.labels, n = labels.length;
    var wrap = mkEl("div", "algo-tp__map");
    wrap.appendChild(mkEl("div", "algo-tp__maphdr", "reach[i][j] — матрица достижимости (Флойд–Уоршелл)"));
    var grid = mkEl("div", "algo-viz__grid"); grid.style.gridTemplateColumns = "repeat(" + (n + 1) + ", 2.2em)";
    grid.appendChild(mkEl("div", "algo-tp__gcell algo-tp__gcell--wall", ""));
    for (var c = 0; c < n; c++) grid.appendChild(mkEl("div", "algo-tp__gcell algo-tp__gcell--wall", labels[c]));
    var cells = [];
    for (var r = 0; r < n; r++) { cells.push([]); grid.appendChild(mkEl("div", "algo-tp__gcell algo-tp__gcell--wall", labels[r])); for (var c2 = 0; c2 < n; c2++) { var cd = mkEl("div", "algo-tp__gcell", ""); grid.appendChild(cd); cells[r].push(cd); } }
    wrap.appendChild(grid); panel.appendChild(wrap);
    return function (s) {
      var R = s.reach || [];
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
        var on = R[r] && R[r][c], cur = (s.ci === r && s.cj === c);
        cells[r][c].textContent = on ? "1" : "·";
        cells[r][c].className = "algo-tp__gcell" + (on ? " algo-tp__gcell--visited" : "") + (cur ? " algo-tp__gcell--current" : "");
      }
    };
  }

  // Наив merge-intervals: сливаем пары, пока что-то меняется, O(n²) на проход. res мутирует
  // (интервалы удаляются). Рисует intervalBarsViz — бары перерисовываются по снимку s.res.
  function bMergeNaive(raw) {
    var res = raw.map(function (p) { return [p[0], p[1]]; }), steps = [], passes = 0;
    function snap() { return res.map(function (p) { return [p[0], p[1]]; }); }
    function fmt(p) { return "[" + p[0] + "," + p[1] + "]"; }
    function vv(i, j) { return { i: (i == null ? "—" : i), j: (j == null ? "—" : j), "интервалов": res.length, "проходов": passes }; }
    if (!res.length) return [{ res: [], done: true, line: 16, vars: vv(), info: "Нет интервалов" }];
    steps.push({ res: snap(), line: 1, vars: vv(), info: "res := копия входа (без сортировки): " + res.map(fmt).join(", ") });
    var changed = true, guard = 0;
    while (changed && guard++ < raw.length * raw.length + 10) {
      changed = false; passes++;
      steps.push({ res: snap(), line: 3, vars: vv(), info: "проход #" + passes + " — заново сравниваем все пары" });
      for (var i = 0; i < res.length; i++) {
        for (var j = i + 1; j < res.length; j++) {
          var a = res[i], b = res[j], overlap = a[0] <= b[1] && b[0] <= a[1];
          steps.push({ res: snap(), ci: i, cj: j, line: 7, vars: vv(i, j), info: "пара " + fmt(a) + " и " + fmt(b) + (overlap ? " — перекрываются" : " — нет") });
          if (overlap) {
            res[i] = [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
            res.splice(j, 1); changed = true;
            steps.push({ res: snap(), ci: i, improved: true, line: 8, vars: vv(i, null), info: "слили в " + fmt(res[i]) + ", удалили " + fmt(b) + " → осталось " + res.length });
            j--;
          }
        }
      }
    }
    steps.push({ res: snap(), done: true, found: true, line: 16, vars: vv(), info: "стабилизировалось за " + passes + " проход(ов): " + res.map(fmt).join(", ") });
    return steps;
  }
  function intervalBarsViz(panel, ctx) {
    var minX = ctx.minX, maxX = ctx.maxX, span = (maxX - minX) || 1, W = 440, padL = 8;
    function X(v) { return padL + (v - minX) / span * (W - padL - 8); }
    var wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:6px;padding:10px 0;min-height:60px;"; panel.appendChild(wrap);
    return function (s) {
      wrap.innerHTML = "";
      (s.res || []).forEach(function (p, k) {
        var row = document.createElement("div"); row.style.cssText = "position:relative;height:20px;";
        var bar = document.createElement("div");
        var bg = s.ci === k ? "#f59e0b" : (s.cj === k ? "#60a5fa" : "#475569");
        bar.style.cssText = "position:absolute;left:" + X(p[0]) + "px;width:" + Math.max(16, X(p[1]) - X(p[0])) + "px;height:18px;border-radius:4px;background:" + bg + ";color:#fff;font-size:11px;line-height:18px;text-align:center;white-space:nowrap;overflow:hidden;";
        bar.textContent = "[" + p[0] + "," + p[1] + "]";
        row.appendChild(bar); wrap.appendChild(row);
      });
    };
  }

  // Наив tree-dfs: диаметр через отдельный height() для каждого узла — O(n²). На каждом узле
  // заново обходим оба поддерева (подсвечиваем их). Рисует naiveTreeViz (current + measure-сет).
  function bDiameterNaive(arr) {
    var present = []; for (var i = 0; i < arr.length; i++) if (arr[i] != null) present.push(i);
    function has(k) { return k < arr.length && arr[k] != null; }
    function height(k) { if (!has(k)) return 0; return 1 + Math.max(height(2 * k + 1), height(2 * k + 2)); }
    function subtree(k) { var out = []; (function go(x) { if (!has(x)) return; out.push(x); go(2 * x + 1); go(2 * x + 2); })(k); return out; }
    var steps = [], best = 0;
    function vv(node, through) { return { "узел": (node == null ? "—" : arr[node]), "через узел": (through == null ? "—" : through), "диаметр": best }; }
    var order = []; (function go(k) { if (!has(k)) return; order.push(k); go(2 * k + 1); go(2 * k + 2); })(0);
    order.forEach(function (k) {
      var hl = height(2 * k + 1), hr = height(2 * k + 2), through = hl + hr;
      var measure = subtree(2 * k + 1).concat(subtree(2 * k + 2));
      var improved = through > best; if (improved) best = through;
      steps.push({ cur: k, measure: measure, improved: improved, line: 11, vars: vv(k, through), info: "узел " + arr[k] + ": height(left)=" + hl + " + height(right)=" + hr + " = " + through + " — заново обошли оба поддерева" + (improved ? " → новый максимум диаметра!" : "") });
    });
    steps.push({ cur: -1, measure: [], done: true, found: true, line: 14, vars: vv(null, null), info: "return " + best + " — диаметр (самый длинный путь через какой-то узел)" });
    return { arr: arr, present: present, steps: steps };
  }
  function naiveTreeViz(panel, ctx) {
    var arr = ctx.arr, present = ctx.present;
    function depth(i) { return Math.floor(Math.log(i + 1) / Math.LN2); }
    var maxD = 0; present.forEach(function (i) { maxD = Math.max(maxD, depth(i)); });
    var tree = document.createElement("div"); tree.className = "algo-tp__tree"; var byIdx = {};
    for (var d = 0; d <= maxD; d++) { var row = document.createElement("div"); row.className = "algo-tp__trow"; present.filter(function (i) { return depth(i) === d; }).forEach(function (i) { var c = document.createElement("div"); c.className = "algo-tp__tnode"; c.textContent = arr[i]; row.appendChild(c); byIdx[i] = c; }); tree.appendChild(row); }
    panel.appendChild(tree);
    return function (s) {
      var measure = s.measure || [];
      present.forEach(function (i) { byIdx[i].classList.toggle("algo-tp__tnode--visited", measure.indexOf(i) >= 0); byIdx[i].classList.toggle("algo-tp__tnode--current", i === s.cur); });
    };
  }

  // Наив grids: Rotting Oranges поминутной симуляцией с пересканированием ВСЕЙ сетки — O((R·C)²).
  // Результат тот же (rotTime), но каждую минуту сканируем все клетки. Рисует orangesViz.
  function bOrangesNaive(grid0) {
    var R = grid0.length, C = grid0[0].length, dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var rotTime = Array.from({ length: R }, function () { return new Array(C).fill(-1); });
    var fresh = 0;
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) { if (grid0[r][c] === 2) rotTime[r][c] = 0; else if (grid0[r][c] === 1) fresh++; }
    var steps = [], minute = 0, totalFresh = fresh, RC = R * C;
    function vv(m, fr) { return { "минута": m, "свежих": fr, "сканов сетки": (m + 1) + "× по " + RC }; }
    function fin() { return { steps: steps, rotTime: rotTime, grid: grid0, R: R, C: C, totalFresh: totalFresh }; }
    steps.push({ minute: 0, line: 1, vars: vv(0, fresh), info: "Минута 0: гнилые (2) — старты, свежих " + fresh + ". Каждую минуту пересканируем все " + RC + " клеток" });
    if (fresh === 0) { steps.push({ minute: 0, done: true, found: true, line: 20, vars: vv(0, 0), info: "Свежих нет — return 0" }); return fin(); }
    var guard = 0;
    while (fresh > 0 && guard++ < RC + 5) {
      var infected = [];
      for (var rr = 0; rr < R; rr++) for (var cc = 0; cc < C; cc++) { if (rotTime[rr][cc] >= 0 && rotTime[rr][cc] <= minute) { for (var d = 0; d < 4; d++) { var nr = rr + dirs[d][0], nc = cc + dirs[d][1]; if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid0[nr][nc] === 1 && rotTime[nr][nc] < 0) { rotTime[nr][nc] = minute + 1; infected.push([nr, nc]); } } } }
      if (!infected.length) break;
      fresh -= infected.length; minute++;
      steps.push({ minute: minute, line: 5, vars: vv(minute, fresh), info: "Минута " + minute + ": просканировали все " + RC + " клеток, заразили " + infected.length + ", свежих осталось " + fresh });
    }
    var ok = fresh === 0;
    steps.push({ minute: minute, done: true, found: ok, line: ok ? 20 : 19, vars: vv(minute, fresh), info: ok ? ("Все сгнили за " + minute + " мин — return " + minute) : ("Остались " + fresh + " недостижимых → return -1") });
    return fin();
  }

  // Наив greedy: динамика достижимости O(n²). Из каждой достижимой клетки помечаем весь
  // диапазон прыжка — диапазоны жирно перекрываются (та самая повторная работа). reach[] зелёным.
  function bJumpGameDp(arr) {
    var n = arr.length, steps = [], reach = new Array(n).fill(false);
    function snap() { return reach.slice(); }
    function vv(i, step) { return { i: (i == null ? "—" : i), "nums[i]": (i != null && i < n ? arr[i] : "—"), step: (step == null ? "—" : step), reachable: (i != null && i < n ? (reach[i] ? "да" : "нет") : "—") }; }
    if (!n) return [{ lo: -1, hi: -1, done: true, line: 12, reach: [], vars: vv(), info: "Пустой массив" }];
    reach[0] = true;
    steps.push({ lo: 0, hi: -1, reach: snap(), line: 3, vars: vv(0), info: "reachable[0] = true — старт достижим" });
    for (var i = 0; i < n; i++) {
      steps.push({ lo: i, hi: -1, reach: snap(), line: 4, vars: vv(i), info: "i = " + i });
      if (!reach[i]) { steps.push({ lo: i, hi: -1, reach: snap(), line: 5, vars: vv(i), info: "reachable[" + i + "] = false → сюда не допрыгнуть, continue" }); continue; }
      for (var step = 1; step <= arr[i] && i + step < n; step++) {
        reach[i + step] = true;
        steps.push({ lo: i, hi: i + step, improved: true, reach: snap(), line: 9, vars: vv(i, step), info: "reachable[" + (i + step) + "] = true — из " + i + " допрыгиваем (+" + step + ")" });
      }
    }
    var ok = reach[n - 1];
    steps.push({ lo: n - 1, hi: -1, done: true, found: ok, reach: snap(), line: 12, vars: vv(n - 1), info: "return reachable[" + (n - 1) + "] = " + (ok ? "true — конец достижим" : "false — не допрыгнуть") });
    return steps;
  }
  // Наив modified-binary-search: линейный проход O(n). Игнорируем сортированность — трогаем
  // каждый элемент; res[0] фиксируется на первом совпадении, res[1] перетирается на каждом.
  function bSearchRangeNaive(arr, target) {
    var n = arr.length, steps = [], first = -1, last = -1;
    function vv(i) { return { i: (i == null ? "—" : i), "nums[i]": (i != null && i < n ? arr[i] : "—"), first: (first < 0 ? "-1" : first), last: (last < 0 ? "-1" : last) }; }
    steps.push({ lo: -1, hi: -1, line: 1, vars: vv(), info: "res = [-1,-1] — пока не нашли" });
    for (var i = 0; i < n; i++) {
      var hit = arr[i] === target;
      steps.push({ lo: i, hi: -1, match: hit, line: 3, vars: vv(i), info: "nums[" + i + "] = " + arr[i] + (hit ? " == target " + target + " — совпадение" : " ≠ target " + target) });
      if (hit) {
        if (first < 0) { first = i; steps.push({ lo: i, hi: -1, match: true, improved: true, line: 5, vars: vv(i), info: "первое совпадение → res[0] = " + i }); }
        last = i;
        steps.push({ lo: i, hi: -1, match: true, line: 7, vars: vv(i), info: "res[1] = " + i + " (последнее совпадение обновляется)" });
      }
    }
    steps.push({ lo: first, hi: last, done: true, found: first >= 0, line: 10, vars: vv(), info: "return [" + first + ", " + last + "]" + (first >= 0 ? " — диапазон target" : " — target не найден") });
    return steps;
  }
  // Наив string: для каждой позиции i прикладываем образец и сравниваем посимвольно O(n·m).
  // На «злом» входе (aaaa / aa) окно почти совпадает и каждый раз сравнивается заново. Образец — панель.
  function bStringMatchNaive(text, pat) {
    var n = text.length, m = pat.length, steps = [], res = [];
    function vv(i, j) { return { i: (i == null ? "—" : i), j: (j == null ? "—" : j), "сравнение": (i != null && j != null && i + j < n ? ("'" + text[i + j] + "' vs '" + pat[j] + "'") : "—"), "найдено": res.length }; }
    if (!m || m > n) return [{ lo: -1, hi: -1, done: true, line: 12, patj: 0, vars: vv(), info: "Пустой или слишком длинный образец" }];
    for (var i = 0; i + m <= n; i++) {
      var j = 0;
      steps.push({ lo: i, hi: i, patj: 0, line: 3, vars: vv(i, 0), info: "i = " + i + ": прикладываем образец к окну [" + i + ".." + (i + m - 1) + "]" });
      while (j < m && text[i + j] === pat[j]) {
        steps.push({ lo: i, hi: i + j, patj: j, match: true, line: 5, vars: vv(i, j), info: "text[" + (i + j) + "]='" + text[i + j] + "' == pat[" + j + "]='" + pat[j] + "' → j++" });
        j++;
      }
      if (j < m) { steps.push({ lo: i, hi: i + j, patj: j, line: 5, vars: vv(i, j), info: "text[" + (i + j) + "]='" + text[i + j] + "' ≠ pat[" + j + "]='" + pat[j] + "' — несовпадение, окно +1" }); }
      else { res.push(i); steps.push({ lo: i, hi: i + m - 1, patj: m, improved: true, line: 8, vars: vv(i, m - 1), info: "j == m — вхождение на позиции " + i + "!" }); }
    }
    steps.push({ lo: -1, hi: -1, done: true, found: res.length > 0, line: 12, patj: 0, vars: vv(), info: "return res = [" + res.join(", ") + "] — все вхождения" });
    return steps;
  }
  // Разбор graphs: Number of Provinces — DFS по компонентам связности. Каждый новый
  // незатронутый узел = новая провинция, запускаем DFS и красим достижимое. Рисует graphViz.
  function bNumProvinces(labels, edges) {
    var n = labels.length, adj = labels.map(function () { return []; });
    edges.forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
    var visited = new Array(n).fill(false), count = 0, steps = [];
    function vv(v, c) { return { "вершина": (v < 0 ? "—" : labels[v]), "провинций": c, "посещено": visited.filter(Boolean).length + "/" + n }; }
    function push(line, cur, c, info, done) { var s = { current: cur, visited: visited.slice(), line: line, vars: vv(cur, c), info: info }; if (done) { s.done = true; s.found = true; } steps.push(s); }
    push(2, -1, 0, "visited := make([]bool, n) — все вершины не посещены");
    for (var i = 0; i < n; i++) {
      push(13, -1, count, "i = " + i + ": вершина " + labels[i] + " — посещена?");
      if (!visited[i]) {
        count++;
        steps.push({ current: i, visited: visited.slice(), improved: true, line: 15, vars: vv(i, count), info: "вершина " + labels[i] + " не посещена → НОВАЯ провинция #" + count + ", запускаем DFS" });
        (function dfs(v) {
          visited[v] = true;
          push(5, v, count, "visited[" + labels[v] + "] = true — вошли в DFS компоненты #" + count);
          adj[v].forEach(function (u) {
            push(7, v, count, "сосед " + labels[u] + ": ребро есть и " + (visited[u] ? "уже посещён — пропуск" : "не посещён → спускаемся"));
            if (!visited[u]) { push(8, v, count, "dfs(" + labels[u] + ")"); dfs(u); }
          });
        })(i);
      } else {
        push(14, -1, count, "вершина " + labels[i] + " уже посещена — та же провинция, пропуск");
      }
    }
    push(19, -1, count, "return count = " + count + " — число компонент связности (провинций)", true);
    return steps;
  }

  // Разбор subsets: подмножества массива С ДУБЛЯМИ. sort + skip на уровне (i>start &&
  // nums[i]==nums[i-1] → continue) вместо set. Рисует subsetsViz (множество/текущее/найдено).
  function bSubsetsDup(set0) {
    var set = set0.slice().sort(function (a, b) { return a - b; }), n = set.length, steps = [], result = [], current = [];
    function vv(action) { return { action: action, cur: "[" + current.join(",") + "]", count: result.length }; }
    function snap(extra) { var s = { current: current.slice(), results: result.map(function (x) { return x.slice(); }) }; for (var k in extra) s[k] = extra[k]; steps.push(s); }
    (function bt(start) {
      result.push(current.slice());
      snap({ action: "record", line: 6, vars: vv("записать [" + current.join(",") + "]"), info: "записали подмножество [" + current.join(", ") + "]" });
      for (var i = start; i < n; i++) {
        if (i > start && set[i] === set[i - 1]) {
          snap({ action: "skip", pick: i, line: 8, vars: vv("пропуск " + set[i]), info: "i = " + i + ": " + set[i] + " == предыдущего на этом уровне → continue (дубль)" });
          continue;
        }
        snap({ action: "loop", pick: i, line: 7, vars: vv("i = " + i), info: "i = " + i + ": берём элемент " + set[i] });
        current.push(set[i]);
        snap({ action: "choose", pick: i, line: 11, vars: vv("выбрать " + set[i]), info: "current = append(current, " + set[i] + ")" });
        snap({ action: "recurse", pick: i, line: 12, vars: vv("backtrack(" + (i + 1) + ")"), info: "backtrack(" + (i + 1) + ") — глубже" });
        bt(i + 1);
        current.pop();
        snap({ action: "back", pick: i, line: 13, vars: vv("откат " + set[i]), info: "откат: убираем " + set[i] });
      }
    })(0);
    snap({ done: true, found: true, line: 17, vars: vv("готово"), info: "Готово: " + result.length + " уникальных подмножеств" });
    return steps;
  }

  // Разбор backtracking: Combination Sum. Несём остаток remain; база remain==0, отсечение
  // candidates[i] > remain (break, т.к. отсортировано); i (не i+1) — повтор кандидата. Рисует subsetsViz.
  function bCombSum(cands0, target) {
    var c = cands0.slice().sort(function (a, b) { return a - b; }), n = c.length, steps = [], result = [], current = [], guard = 0;
    function vv(action, remain) { return { action: action, cur: "[" + current.join(",") + "]", remain: (remain == null ? "—" : remain), count: result.length }; }
    function snap(extra) { var s = { current: current.slice(), results: result.map(function (x) { return x.slice(); }) }; for (var k in extra) s[k] = extra[k]; steps.push(s); }
    (function bt(start, remain) {
      if (guard++ > 4000) return;
      if (remain === 0) {
        result.push(current.slice());
        snap({ action: "record", line: 7, vars: vv("записать [" + current.join(",") + "]", 0), info: "remain == 0 → комбинация [" + current.join(", ") + "]!" });
        return;
      }
      for (var i = start; i < n; i++) {
        if (c[i] > remain) {
          snap({ action: "prune", pick: i, line: 12, vars: vv("обрыв: " + c[i] + " > " + remain, remain), info: "candidates[" + i + "] = " + c[i] + " > remain " + remain + " → break (дальше только больше)" });
          break;
        }
        snap({ action: "loop", pick: i, line: 10, vars: vv("i = " + i, remain), info: "i = " + i + ": кандидат " + c[i] + ", remain " + remain });
        current.push(c[i]);
        snap({ action: "choose", pick: i, line: 14, vars: vv("выбрать " + c[i], remain - c[i]), info: "берём " + c[i] + " → remain " + (remain - c[i]) });
        snap({ action: "recurse", pick: i, line: 15, vars: vv("backtrack(" + i + ", " + (remain - c[i]) + ")", remain - c[i]), info: "backtrack(i=" + i + " — повтор разрешён, remain=" + (remain - c[i]) + ")" });
        bt(i, remain - c[i]);
        current.pop();
        snap({ action: "back", pick: i, line: 16, vars: vv("откат " + c[i], remain), info: "откат: убираем " + c[i] });
      }
    })(0, target);
    snap({ done: true, found: true, line: 20, vars: vv("готово", "—"), info: "Готово: " + result.length + " комбинаций" });
    return steps;
  }

  // Разбор grids: Rotting Oranges — multi-source BFS, уровни = минуты. Все гнилые (2) —
  // источники на минуте 0; каждая минута заражает 4-соседей-свежих (1). Рисует orangesViz по rotTime.
  function bOrangesRotting(grid0) {
    var R = grid0.length, C = grid0[0].length, dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var rotTime = Array.from({ length: R }, function () { return new Array(C).fill(-1); });
    var q = [], fresh = 0;
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) { if (grid0[r][c] === 2) { rotTime[r][c] = 0; q.push([r, c]); } else if (grid0[r][c] === 1) fresh++; }
    var steps = [], minute = 0, totalFresh = fresh;
    function vv(m, fr) { return { "минута": m, "свежих": fr, "источников": q.length }; }
    function fin() { return { steps: steps, rotTime: rotTime, grid: grid0, R: R, C: C, totalFresh: totalFresh }; }
    steps.push({ minute: 0, line: 1, vars: { "минута": 0, "свежих": fresh, "источников": q.length }, info: "Минута 0: все гнилые (2) — источники, свежих апельсинов " + fresh });
    if (fresh === 0) { steps.push({ minute: 0, done: true, found: true, line: 2, vars: vv(0, 0), info: "fresh == 0 — гнить нечему, return 0" }); return fin(); }
    var guard = 0;
    while (q.length && fresh > 0 && guard++ < R * C + 5) {
      var next = [];
      for (var k = 0; k < q.length; k++) {
        var rr = q[k][0], cc = q[k][1];
        for (var d = 0; d < 4; d++) { var nr = rr + dirs[d][0], nc = cc + dirs[d][1]; if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid0[nr][nc] === 1 && rotTime[nr][nc] < 0) { rotTime[nr][nc] = minute + 1; fresh--; next.push([nr, nc]); } }
      }
      if (!next.length) break;
      minute++;
      q = next;
      steps.push({ minute: minute, line: 9, vars: vv(minute, fresh), info: "Минута " + minute + ": волна гниения заразила " + next.length + " апельсин(ов), свежих осталось " + fresh });
    }
    var ok = fresh === 0;
    steps.push({ minute: minute, done: true, found: ok, line: ok ? 20 : 19, vars: vv(minute, fresh), info: ok ? ("Все апельсины сгнили за " + minute + " мин — return " + minute) : ("Осталось " + fresh + " недостижимых свежих → return -1") });
    return fin();
  }
  function orangesViz(panel, ctx) {
    var grid = ctx.grid, R = ctx.R, C = ctx.C, rotTime = ctx.rotTime;
    var wrap = document.createElement("div"); wrap.className = "algo-viz__grid"; wrap.style.gridTemplateColumns = "repeat(" + C + ", 2.7em)";
    var cells = [];
    for (var r = 0; r < R; r++) { cells.push([]); for (var c = 0; c < C; c++) { var cd = document.createElement("div"); cd.className = "algo-viz__gcell" + (grid[r][c] === 0 ? " algo-viz__gcell--wall" : ""); wrap.appendChild(cd); cells[r].push(cd); } }
    panel.appendChild(wrap);
    return function (s) {
      var m = s.minute;
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        if (grid[r][c] === 0) { cells[r][c].textContent = ""; continue; }
        var rt = rotTime[r][c], rotted = rt >= 0 && rt <= m, justRotted = (rt === m) || (rt === 0 && m === 0);
        cells[r][c].classList.toggle("algo-viz__gcell--visited", rotted && !justRotted);
        cells[r][c].classList.toggle("algo-viz__gcell--current", rotted && justRotted);
        cells[r][c].textContent = rotted ? "🦠" : "🍊";
      }
    };
  }

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

  // Trie: разбор задачи Replace Words — спуск shortestRoot до ПЕРВОГО isEnd. Строим бор
  // из корней dict, ведём слово query по символам; как только узел помечен isEnd — это
  // кратчайший корень-префикс (идём от начала слова), возвращаем word[:i+1]. Путь оборвался
  // (нет ребра) → корня нет, слово остаётся как есть. Рисуется тем же trieViz по path/upto.
  function bTrieShortestRoot(words, query) {
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
    // Путь спуска для trieViz: от корня по символам query, пока есть рёбра; стоп на первом isEnd.
    var path = [0], pc = 0;
    for (var k0 = 0; k0 < query.length; k0++) { var c0 = query[k0]; if (nodes[pc].children[c0] != null) { pc = nodes[pc].children[c0]; path.push(pc); if (nodes[pc].end) break; } else break; }
    var steps = [], upto = 0;
    function push(o) { steps.push({ upto: upto, line: o.line, vars: { i: (o.i == null ? "—" : o.i), char: (o.char || "—"), node: (o.node || "—"), isEnd: (o.isEnd || "—") }, info: o.info, done: o.done, found: o.found }); }
    push({ line: 1, node: "корень", info: "node := корень. Ищем кратчайший корень-префикс для «" + query + "»" });
    var cur2 = 0;
    for (var k = 0; k < query.length; k++) {
      var ch2 = query[k];
      push({ line: 2, i: k, char: ch2, node: nodes[cur2].ch, info: "i = " + k + ": " + k + " < len(word) — берём символ '" + ch2 + "'" });
      push({ line: 3, i: k, char: ch2, node: nodes[cur2].ch, info: "c = '" + ch2 + "'" });
      var childId = nodes[cur2].children[ch2], has = childId != null;
      push({ line: 4, i: k, char: ch2, node: nodes[cur2].ch, info: has ? "у узла «" + nodes[cur2].ch + "» есть потомок '" + ch2 + "'" : "у узла «" + nodes[cur2].ch + "» НЕТ потомка '" + ch2 + "' — корня нет" });
      if (!has) {
        push({ line: 5, done: true, i: k, char: ch2, node: nodes[cur2].ch, isEnd: "—", info: "return word — путь оборвался, корня-префикса нет, слово остаётся «" + query + "»" });
        return { nodes: nodes, path: path, steps: steps };
      }
      cur2 = childId; upto++;
      push({ line: 7, i: k, char: ch2, node: nodes[cur2].ch, info: "node = children['" + ch2 + "'] → спускаемся в «" + nodes[cur2].ch + "»" });
      var isEnd = nodes[cur2].end;
      push({ line: 8, i: k, char: ch2, node: nodes[cur2].ch, isEnd: isEnd ? "да" : "нет", info: isEnd ? "node.isEnd == true — встретили конец корня!" : "node.isEnd == false — ещё не конец корня, идём глубже" });
      if (isEnd) {
        var ans = query.slice(0, k + 1);
        push({ line: 9, done: true, found: true, i: k, char: ch2, node: nodes[cur2].ch, isEnd: "да", info: "return word[:" + (k + 1) + "] = «" + ans + "» — первый (значит, кратчайший) корень-префикс" });
        return { nodes: nodes, path: path, steps: steps };
      }
    }
    push({ line: 12, done: true, node: nodes[cur2].ch, isEnd: "—", info: "return word — корень не встретился, слово остаётся «" + query + "»" });
    return { nodes: nodes, path: path, steps: steps };
  }
  // Trie: вставка слова — растим дерево, показывая создание vs переиспользование узлов.
  function bTrieInsert(words, ins) {
    // Стартовое дерево из уже вставленных слов (createdAt = -1 — существуют изначально).
    var nodes = [{ ch: "•", depth: 0, end: false, children: {}, createdAt: -1 }];
    words.forEach(function (w) {
      var cur = 0;
      for (var k = 0; k < w.length; k++) {
        var ch = w[k];
        if (nodes[cur].children[ch] == null) { var id = nodes.length; nodes.push({ ch: ch, depth: k + 1, end: false, children: {}, createdAt: -1 }); nodes[cur].children[ch] = id; }
        cur = nodes[cur].children[ch];
      }
      nodes[cur].end = true;
    });
    var path = [0], steps = [], walkCur = 0, endId = -1, endAt = -1;
    function push(o) { steps.push({ si: steps.length, upto: path.length - 1, line: o.line, vars: { char: (o.char || "—"), node: (o.node || "—"), action: (o.action || "—") }, info: o.info, created: !!o.created, done: o.done }); }
    push({ line: 1, node: "корень", action: "старт", info: "node := корень. Вставляем «" + ins + "»" });
    for (var k = 0; k < ins.length; k++) {
      var ch = ins[k];
      push({ line: 2, char: ch, node: nodes[walkCur].ch, action: "цикл", info: "i = " + k + ": символ '" + ch + "'" });
      push({ line: 3, char: ch, node: nodes[walkCur].ch, action: "символ", info: "c = '" + ch + "'" });
      var childId = nodes[walkCur].children[ch], has = childId != null;
      push({ line: 4, char: ch, node: nodes[walkCur].ch, action: has ? "есть" : "нет", info: has ? "у «" + nodes[walkCur].ch + "» уже есть потомок '" + ch + "' — переиспользуем общий префикс" : "у «" + nodes[walkCur].ch + "» нет потомка '" + ch + "'" });
      if (!has) {
        var nid = nodes.length;
        nodes.push({ ch: ch, depth: k + 1, end: false, children: {}, createdAt: steps.length });
        nodes[walkCur].children[ch] = nid; childId = nid;
        push({ line: 5, char: ch, node: ch, action: "создаём", created: true, info: "ребра не было — создаём новый узел '" + ch + "'" });
      }
      walkCur = childId; path.push(walkCur);
      push({ line: 7, char: ch, node: nodes[walkCur].ch, action: "спуск", info: "node = children['" + ch + "'] → спускаемся в «" + ch + "»" });
    }
    endId = walkCur; endAt = steps.length; nodes[walkCur].end = true;
    push({ line: 9, node: nodes[walkCur].ch, action: "конец слова", done: true, info: "node.isEnd = true — «" + ins + "» вставлено" });
    return { nodes: nodes, path: path, steps: steps, endId: endId, endAt: endAt };
  }
  function trieInsertViz(panel, ctx) {
    var nodes = ctx.nodes, path = ctx.path;
    var maxDepth = nodes.reduce(function (m, n) { return Math.max(m, n.depth); }, 0);
    var tree = document.createElement("div"); tree.className = "algo-tp__tree";
    var byId = {};
    for (var d = 0; d <= maxDepth; d++) {
      var row = document.createElement("div"); row.className = "algo-tp__trow";
      nodes.map(function (n, idx) { return { n: n, idx: idx }; }).filter(function (o) { return o.n.depth === d; }).forEach(function (o) {
        var c = document.createElement("div"); c.className = "algo-tp__tnode"; c.textContent = o.n.ch; row.appendChild(c); byId[o.idx] = c;
      });
      tree.appendChild(row);
    }
    panel.appendChild(tree);
    return function (s) {
      nodes.forEach(function (n, id) {
        var el = byId[id];
        var visible = n.createdAt < 0 || n.createdAt <= s.si;
        el.classList.toggle("algo-tp__tnode--ghost", !visible);
        var posInPath = path.indexOf(id), visited = posInPath >= 0 && posInPath <= s.upto;
        el.classList.toggle("algo-tp__tnode--visited", visited && visible);
        el.classList.toggle("algo-tp__tnode--current", id === path[s.upto]);
        el.classList.toggle("algo-tp__tnode--created", n.createdAt >= 0 && n.createdAt === s.si);
        el.classList.toggle("algo-tp__tnode--end", n.end && (id !== ctx.endId || s.si >= ctx.endAt));
      });
    };
  }

  // Trie: удаление слова — снимаем isEnd, затем обрезаем висячие узлы снизу вверх.
  function bTrieDelete(words, del) {
    var nodes = [{ ch: "•", depth: 0, end: false, children: {}, removedAt: -1, endUnsetAt: -1 }];
    words.forEach(function (w) {
      var cur = 0;
      for (var k = 0; k < w.length; k++) {
        var ch = w[k];
        if (nodes[cur].children[ch] == null) { var id = nodes.length; nodes.push({ ch: ch, depth: k + 1, end: false, children: {}, removedAt: -1, endUnsetAt: -1 }); nodes[cur].children[ch] = id; }
        cur = nodes[cur].children[ch];
      }
      nodes[cur].end = true;
    });
    function hasKids(n) { var ch = nodes[n].children; for (var c in ch) { if (ch[c] != null) return true; } return false; }
    var path = [0], steps = [];
    function push(o) { steps.push({ si: steps.length, cur: (o.cur == null ? -1 : o.cur), upto: o.upto, line: o.line, vars: { char: (o.char || "—"), node: (o.node || "—"), action: (o.action || "—") }, info: o.info, done: o.done, removed: o.removed }); }
    push({ line: 1, cur: 0, upto: 0, node: "корень", action: "find", info: "node := find(\"" + del + "\") — спускаемся к слову" });
    var cur = 0, broke = false;
    for (var k = 0; k < del.length; k++) {
      var ch = del[k], nx = nodes[cur].children[ch];
      if (nx == null) {
        push({ line: 2, cur: cur, upto: path.length - 1, char: ch, node: nodes[cur].ch, action: "нет", info: "у «" + nodes[cur].ch + "» нет потомка '" + ch + "' — слова нет" });
        push({ line: 3, cur: cur, upto: path.length - 1, action: "return false", done: true, info: "return false — «" + del + "» в боре нет" });
        broke = true; break;
      }
      cur = nx; path.push(cur);
      push({ line: 1, cur: cur, upto: path.length - 1, char: ch, node: nodes[cur].ch, action: "спуск", info: "спускаемся в «" + nodes[cur].ch + "»" });
    }
    if (broke) return { nodes: nodes, path: path, steps: steps };
    var endNode = cur;
    push({ line: 2, cur: endNode, upto: path.length - 1, node: nodes[endNode].ch, action: "проверка", info: nodes[endNode].end ? "node.isEnd == true — слово есть, удаляем" : "node.isEnd == false — это не слово" });
    if (!nodes[endNode].end) {
      push({ line: 3, cur: endNode, upto: path.length - 1, action: "return false", done: true, info: "return false — «" + del + "» не было словом" });
      return { nodes: nodes, path: path, steps: steps };
    }
    nodes[endNode].end = false; nodes[endNode].endUnsetAt = steps.length;
    push({ line: 5, cur: endNode, upto: path.length - 1, node: nodes[endNode].ch, action: "isEnd=false", info: "node.isEnd = false — сняли флаг конца у «" + nodes[endNode].ch + "»" });
    for (var i = del.length - 1; i >= 0; i--) {
      var child = path[i + 1];
      push({ line: 8, cur: child, upto: i + 1, node: nodes[child].ch, action: "проверка", info: "узел «" + nodes[child].ch + "»: isEnd=" + (nodes[child].end ? "да" : "нет") + ", дети=" + (hasKids(child) ? "есть" : "нет") });
      if (nodes[child].end || hasKids(child)) {
        push({ line: 9, cur: child, upto: i + 1, node: nodes[child].ch, action: "стоп", info: "«" + nodes[child].ch + "» ещё нужен (конец слова или есть дети) — обрезку прекращаем" });
        break;
      }
      nodes[child].removedAt = steps.length;
      nodes[path[i]].children[del[i]] = null;
      push({ line: 11, cur: path[i], upto: i, node: nodes[child].ch, action: "удаляем", removed: true, info: "удаляем висячий узел «" + nodes[child].ch + "»" });
    }
    push({ line: 13, cur: 0, upto: 0, action: "return true", done: true, info: "«" + del + "» удалено" });
    return { nodes: nodes, path: path, steps: steps };
  }
  function trieDeleteViz(panel, ctx) {
    var nodes = ctx.nodes, path = ctx.path;
    var maxDepth = nodes.reduce(function (m, n) { return Math.max(m, n.depth); }, 0);
    var tree = document.createElement("div"); tree.className = "algo-tp__tree";
    var byId = {};
    for (var d = 0; d <= maxDepth; d++) {
      var row = document.createElement("div"); row.className = "algo-tp__trow";
      nodes.map(function (n, idx) { return { n: n, idx: idx }; }).filter(function (o) { return o.n.depth === d; }).forEach(function (o) {
        var c = document.createElement("div"); c.className = "algo-tp__tnode"; c.textContent = o.n.ch; row.appendChild(c); byId[o.idx] = c;
      });
      tree.appendChild(row);
    }
    panel.appendChild(tree);
    return function (s) {
      nodes.forEach(function (n, id) {
        var el = byId[id];
        var flash = n.removedAt >= 0 && s.si === n.removedAt;
        var gone = n.removedAt >= 0 && s.si > n.removedAt;
        el.classList.toggle("algo-tp__tnode--ghost", gone);
        el.classList.toggle("algo-tp__tnode--removed", flash);
        el.classList.toggle("algo-tp__tnode--current", id === s.cur && !gone);
        var posInPath = path.indexOf(id), visited = posInPath >= 0 && posInPath <= s.upto;
        el.classList.toggle("algo-tp__tnode--visited", visited && !gone && !flash && id !== s.cur);
        var showEnd = n.endUnsetAt >= 0 ? (s.si < n.endUnsetAt) : n.end;
        el.classList.toggle("algo-tp__tnode--end", showEnd && !gone && !flash);
      });
    };
  }

  // Trie: все слова с префиксом — спускаемся к префиксу, затем DFS собирает слова (a→z).
  function bTrieWords(words, prefix) {
    var nodes = [{ ch: "•", depth: 0, end: false, children: {}, visitedAt: -1 }];
    words.forEach(function (w) {
      var cur = 0;
      for (var k = 0; k < w.length; k++) {
        var ch = w[k];
        if (nodes[cur].children[ch] == null) { var id = nodes.length; nodes.push({ ch: ch, depth: k + 1, end: false, children: {}, visitedAt: -1 }); nodes[cur].children[ch] = id; }
        cur = nodes[cur].children[ch];
      }
      nodes[cur].end = true;
    });
    var steps = [], out = [];
    function push(o) { steps.push({ si: steps.length, cur: (o.cur == null ? -1 : o.cur), upto: o.upto, line: o.line, vars: { node: (o.node || "—"), word: (o.word || "—"), found: (out.length + "") }, out: out.slice(), info: o.info, done: o.done, collected: o.collected }); }
    var cur = 0, path = [0], ok = true;
    push({ line: 1, cur: 0, upto: 0, node: "корень", info: "node := find(\"" + prefix + "\") — спускаемся к префиксу" });
    for (var k = 0; k < prefix.length; k++) {
      var ch = prefix[k], nx = nodes[cur].children[ch];
      if (nx == null) { ok = false; push({ line: 1, cur: cur, upto: path.length - 1, node: nodes[cur].ch, info: "у «" + nodes[cur].ch + "» нет потомка '" + ch + "' — слов с таким префиксом нет" }); break; }
      cur = nx; path.push(cur);
      push({ line: 1, cur: cur, upto: path.length - 1, node: nodes[cur].ch, info: "спускаемся в «" + nodes[cur].ch + "»" });
    }
    if (!ok) { push({ line: 15, cur: -1, upto: path.length - 1, done: true, info: "return [] — ничего не найдено" }); return { nodes: nodes, path: path, steps: steps }; }
    (function dfs(n, curStr) {
      if (nodes[n].visitedAt < 0) nodes[n].visitedAt = steps.length;
      push({ line: 5, cur: n, upto: path.length - 1, node: nodes[n].ch, word: curStr, info: "в узле «" + nodes[n].ch + "» (путь «" + curStr + "»): это конец слова?" });
      if (nodes[n].end) { out.push(curStr); push({ line: 6, cur: n, upto: path.length - 1, node: nodes[n].ch, word: curStr, collected: true, info: "isEnd — собрали слово «" + curStr + "»" }); }
      for (var c = 97; c <= 122; c++) {
        var chc = String.fromCharCode(c), ci = nodes[n].children[chc];
        if (ci != null) { push({ line: 10, cur: ci, upto: path.length - 1, node: chc, word: curStr + chc, info: "спускаемся в потомка '" + chc + "'" }); dfs(ci, curStr + chc); }
      }
    })(cur, prefix);
    push({ line: 15, cur: -1, upto: path.length - 1, done: true, info: "return out — найдено слов: " + out.length + " [" + out.join(", ") + "]" });
    return { nodes: nodes, path: path, steps: steps };
  }
  function trieWordsViz(panel, ctx) {
    var nodes = ctx.nodes;
    var maxDepth = nodes.reduce(function (m, n) { return Math.max(m, n.depth); }, 0);
    var tree = document.createElement("div"); tree.className = "algo-tp__tree";
    var byId = {};
    for (var d = 0; d <= maxDepth; d++) {
      var row = document.createElement("div"); row.className = "algo-tp__trow";
      nodes.map(function (n, idx) { return { n: n, idx: idx }; }).filter(function (o) { return o.n.depth === d; }).forEach(function (o) {
        var c = document.createElement("div"); c.className = "algo-tp__tnode"; c.textContent = o.n.ch; row.appendChild(c); byId[o.idx] = c;
      });
      tree.appendChild(row);
    }
    panel.appendChild(tree);
    return function (s) {
      nodes.forEach(function (n, id) {
        var el = byId[id];
        el.classList.toggle("algo-tp__tnode--visited", n.visitedAt >= 0 && n.visitedAt <= s.si && id !== s.cur);
        el.classList.toggle("algo-tp__tnode--current", id === s.cur);
        el.classList.toggle("algo-tp__tnode--created", !!s.collected && id === s.cur);
        el.classList.toggle("algo-tp__tnode--end", n.end);
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

  // ===== Связный список: CRUD (вставка / поиск / удаление) ===================
  // Рендер llViz перерисовывает цепочку узлов со стрелками по снимку s.seq на КАЖДОМ
  // шаге — поэтому вставка добавляет узел, а удаление вырезает его прямо в кадре
  // (видно перецепление .Next, чего сетка-значений не показывает).
  function llViz(panel) {
    var wrap = mkEl("div", "algo-tp__ll");
    panel.appendChild(wrap);
    return function (s) {
      wrap.innerHTML = "";
      var seq = s.seq || [];
      if (!seq.length) { wrap.appendChild(mkEl("div", "algo-tp__llnil", "∅ (пустой список)")); return; }
      seq.forEach(function (node, k) {
        wrap.appendChild(mkEl("div", "algo-tp__llnode" + (node.cls ? " algo-tp__llnode--" + node.cls : ""), node.val));
        if (k < seq.length - 1) wrap.appendChild(mkEl("div", "algo-tp__llarrow", "→"));
      });
      wrap.appendChild(mkEl("div", "algo-tp__llarrow", "→"));
      wrap.appendChild(mkEl("div", "algo-tp__llnil", "nil"));
    };
  }
  function bLLInsert(list, val, pos) {
    var steps = [];
    function seqOf(a, marks) { return a.map(function (v, i) { return { val: v, cls: (marks && marks[i]) || "" }; }); }
    function push(o) { steps.push({ si: steps.length, line: o.line, seq: o.seq, vars: { node: (o.node || "—"), action: (o.action || "—") }, info: o.info, done: o.done, created: o.created }); }
    var arr = list.slice(), p = Math.max(0, Math.min(pos, arr.length));
    push({ line: 1, seq: seqOf(arr, {}), node: "dummy", action: "старт", info: "dummy → голова; вставляем " + val + " в позицию " + p });
    push({ line: 2, seq: seqOf(arr, {}), node: "dummy", action: "prev=dummy", info: "prev = dummy" });
    for (var i = 0; i < p; i++) {
      var m = {}; m[i] = "cur";
      push({ line: 3, seq: seqOf(arr, m), node: String(arr[i]), action: "проверка", info: "i=" + i + " < " + p + " — идём к узлу перед позицией" });
      push({ line: 4, seq: seqOf(arr, m), node: String(arr[i]), action: "prev=prev.Next", info: "prev = " + arr[i] });
    }
    var ins = arr.slice(0, p).concat([val]).concat(arr.slice(p)), mc = {}; mc[p] = "created";
    push({ line: 6, seq: seqOf(ins, mc), node: String(val), action: "создаём", created: true, info: "node := &ListNode{Val: " + val + "} — создаём узел" });
    push({ line: 7, seq: seqOf(ins, mc), node: String(val), action: "node.Next=prev.Next", info: "новый узел " + val + " указывает на остаток списка" });
    push({ line: 8, seq: seqOf(ins, mc), node: String(val), action: "prev.Next=node", info: "предыдущий узел указывает на новый " + val });
    push({ line: 9, seq: seqOf(ins, {}), action: "return", done: true, info: "готово: " + ins.join("→") });
    return { steps: steps };
  }
  function bLLSearch(list, target) {
    var steps = [];
    function seqOf(marks) { return list.map(function (v, i) { return { val: v, cls: (marks && marks[i]) || "" }; }); }
    function push(o) { steps.push({ si: steps.length, line: o.line, seq: o.seq, vars: { node: (o.node || "—"), target: String(target) }, info: o.info, done: o.done, found: o.found }); }
    if (!list.length) { push({ line: 6, seq: [], done: true, info: "список пуст — return nil" }); return { steps: steps }; }
    for (var i = 0; i < list.length; i++) {
      var m = {}; m[i] = "cur";
      push({ line: 1, seq: seqOf(m), node: String(list[i]), info: "node = " + list[i] });
      push({ line: 2, seq: seqOf(m), node: String(list[i]), info: list[i] === target ? list[i] + " == " + target + " — нашли!" : list[i] + " ≠ " + target + " — идём дальше" });
      if (list[i] === target) { var mf = {}; mf[i] = "found"; push({ line: 3, seq: seqOf(mf), node: String(list[i]), done: true, found: true, info: "return node — " + target + " найден на позиции " + i }); return { steps: steps }; }
    }
    push({ line: 6, seq: seqOf({}), done: true, info: "return nil — " + target + " в списке нет" });
    return { steps: steps };
  }
  function bLLDelete(list, target) {
    var steps = [], arr = list.slice();
    function seqOf(a, marks) { return a.map(function (v, i) { return { val: v, cls: (marks && marks[i]) || "" }; }); }
    function push(o) { steps.push({ si: steps.length, line: o.line, seq: o.seq, vars: { node: (o.node || "—"), target: String(target) }, info: o.info, done: o.done, removed: o.removed }); }
    push({ line: 1, seq: seqOf(arr, {}), node: "dummy", info: "dummy → голова" });
    push({ line: 2, seq: seqOf(arr, {}), node: "dummy", info: "prev = dummy" });
    for (var i = 0; i < arr.length; i++) {
      var mc = {}; mc[i] = "cur";
      push({ line: 3, seq: seqOf(arr, mc), node: String(arr[i]), info: "prev.Next = " + arr[i] + " ≠ nil — продолжаем" });
      push({ line: 4, seq: seqOf(arr, mc), node: String(arr[i]), info: arr[i] === target ? arr[i] + " == " + target + " — это он" : arr[i] + " ≠ " + target + " — идём дальше" });
      if (arr[i] === target) {
        var mr = {}; mr[i] = "removed";
        push({ line: 5, seq: seqOf(arr, mr), node: String(arr[i]), removed: true, info: "prev.Next = prev.Next.Next — вырезаем узел " + arr[i] });
        var after = arr.slice(0, i).concat(arr.slice(i + 1));
        push({ line: 6, seq: seqOf(after, {}), node: String(arr[i]), info: "break — узел вырезан" });
        push({ line: 10, seq: seqOf(after, {}), done: true, info: "return — список: " + (after.length ? after.join("→") : "∅") });
        return { steps: steps };
      }
      push({ line: 8, seq: seqOf(arr, mc), node: String(arr[i]), info: "prev = prev.Next" });
    }
    push({ line: 10, seq: seqOf(arr, {}), done: true, info: "return — " + target + " не найден, список без изменений" });
    return { steps: steps };
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

  // ===== Бинарное дерево поиска (BST): CRUD ==================================
  // Структурный BST (узлы с left/right) + раскладка по (глубина, in-order ранг)
  // и SVG-рёбра. Снимок дерева s.tree пересобирается на каждом шаге, поэтому
  // вставка/удаление (включая случай двух детей с преемником) видны прямо в кадре.
  function bstBuild(vals) {
    var seq = { n: 0 };
    function mk(v) { return { id: seq.n++, val: v, left: null, right: null }; }
    var root = null;
    function ins(v) {
      if (!root) { root = mk(v); return; }
      var node = root;
      while (true) {
        if (v < node.val) { if (!node.left) { node.left = mk(v); return; } node = node.left; }
        else { if (!node.right) { node.right = mk(v); return; } node = node.right; }
      }
    }
    vals.forEach(ins);
    return { root: root, mk: mk };
  }
  function bstSnap(root, marks) {
    var list = [], rank = { n: 0 };
    (function rec(n, d) { if (!n) return; rec(n.left, d + 1); n._r = rank.n++; n._d = d; list.push(n); rec(n.right, d + 1); })(root, 0);
    var nodes = list.map(function (n) { return { val: n.val, rank: n._r, depth: n._d, cls: (marks && marks[n.id]) || "" }; });
    var edges = [];
    list.forEach(function (n) { if (n.left) edges.push([n._r, n._d, n.left._r, n.left._d]); if (n.right) edges.push([n._r, n._d, n.right._r, n.right._d]); });
    return { nodes: nodes, edges: edges };
  }
  function bstViz(panel) {
    var CW = 48, CH = 66, R = 15;
    var host = mkEl("div", "algo-tp__bst"); panel.appendChild(host);
    return function (s) {
      host.innerHTML = "";
      var tr = s.tree || { nodes: [], edges: [] };
      if (!tr.nodes.length) { host.appendChild(mkEl("div", "algo-tp__llnil", "∅ (пустое дерево)")); return; }
      var maxR = 0, maxD = 0;
      tr.nodes.forEach(function (n) { maxR = Math.max(maxR, n.rank); maxD = Math.max(maxD, n.depth); });
      var W = (maxR + 1) * CW, H = (maxD + 1) * CH;
      host.style.position = "relative"; host.style.width = W + "px"; host.style.height = H + "px";
      function cx(r) { return r * CW + CW / 2; }
      function cy(d) { return d * CH + 22; }
      var svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "algo-tp__bstsvg");
      tr.edges.forEach(function (e) {
        var ln = document.createElementNS(SVGNS, "line");
        ln.setAttribute("x1", cx(e[0])); ln.setAttribute("y1", cy(e[1]));
        ln.setAttribute("x2", cx(e[2])); ln.setAttribute("y2", cy(e[3]));
        ln.setAttribute("class", "algo-tp__bstedge"); svg.appendChild(ln);
      });
      host.appendChild(svg);
      tr.nodes.forEach(function (n) {
        var b = mkEl("div", "algo-tp__tnode" + (n.cls ? " algo-tp__tnode--" + n.cls : ""), n.val);
        b.style.position = "absolute"; b.style.left = (cx(n.rank) - R) + "px"; b.style.top = (cy(n.depth) - R) + "px";
        host.appendChild(b);
      });
    };
  }
  function bBSTSearch(vals, target) {
    var b = bstBuild(vals), root = b.root, steps = [];
    function push(o) { steps.push({ si: steps.length, line: o.line, tree: o.tree, vars: { node: (o.node == null ? "—" : String(o.node)), target: String(target) }, info: o.info, done: o.done, found: o.found }); }
    var node = root;
    push({ line: 1, tree: bstSnap(root, {}), node: (root ? root.val : null), info: "node := корень" });
    while (node) {
      var m = {}; m[node.id] = "current";
      push({ line: 2, tree: bstSnap(root, m), node: node.val, info: "node = " + node.val + " ≠ nil" });
      push({ line: 3, tree: bstSnap(root, m), node: node.val, info: target + " vs " + node.val });
      if (target === node.val) { var mf = {}; mf[node.id] = "found"; push({ line: 4, tree: bstSnap(root, mf), node: node.val, done: true, found: true, info: target + " == " + node.val + " — найдено ✓" }); return { steps: steps }; }
      if (target < node.val) { push({ line: 6, tree: bstSnap(root, m), node: node.val, info: target + " < " + node.val + " — идём влево" }); node = node.left; }
      else { push({ line: 8, tree: bstSnap(root, m), node: node.val, info: target + " > " + node.val + " — идём вправо" }); node = node.right; }
    }
    push({ line: 11, tree: bstSnap(root, {}), node: null, done: true, info: "node == nil — " + target + " в дереве нет" });
    return { steps: steps };
  }
  function bBSTInsert(vals, val) {
    var b = bstBuild(vals), root = b.root, steps = [];
    function push(o) { steps.push({ si: steps.length, line: o.line, tree: o.tree, vars: { node: (o.node == null ? "—" : String(o.node)), action: (o.action || "—") }, info: o.info, done: o.done, created: o.created }); }
    if (!root) { root = b.mk(val); var m0 = {}; m0[root.id] = "created"; push({ line: 1, tree: bstSnap(root, m0), node: val, action: "корень", created: true, done: true, info: "дерево было пустым — " + val + " становится корнем" }); return { steps: steps }; }
    var node = root, parent = root;
    push({ line: 2, tree: bstSnap(root, {}), node: root.val, action: "старт", info: "ищем место (лист) для " + val });
    while (node) {
      parent = node;
      var m = {}; m[node.id] = "current";
      push({ line: 5, tree: bstSnap(root, m), node: node.val, action: "сравнение", info: val + " vs " + node.val });
      if (val < node.val) { push({ line: 6, tree: bstSnap(root, m), node: node.val, action: "влево", info: val + " < " + node.val + " — влево" }); node = node.left; }
      else { push({ line: 8, tree: bstSnap(root, m), node: node.val, action: "вправо", info: val + " ≥ " + node.val + " — вправо" }); node = node.right; }
    }
    var leaf = b.mk(val), left = val < parent.val;
    if (left) parent.left = leaf; else parent.right = leaf;
    var mc = {}; mc[leaf.id] = "created";
    push({ line: 11, tree: bstSnap(root, mc), node: val, action: "создаём", created: true, info: "место найдено — создаём лист " + val });
    push({ line: (left ? 13 : 15), tree: bstSnap(root, mc), node: val, action: "подцепляем", done: true, info: val + " подцеплен " + (left ? "слева" : "справа") + " от " + parent.val });
    return { steps: steps };
  }
  function bBSTDelete(vals, target) {
    var b = bstBuild(vals), root = b.root, steps = [];
    function push(o) { steps.push({ si: steps.length, line: o.line, tree: o.tree, vars: { node: (o.node == null ? "—" : String(o.node)), action: (o.action || "—") }, info: o.info, done: o.done, removed: o.removed }); }
    var node = root, parent = null;
    push({ line: 1, tree: bstSnap(root, {}), node: (root ? root.val : null), action: "старт", info: "ищем узел " + target });
    while (node && node.val !== target) {
      parent = node;
      var m = {}; m[node.id] = "current";
      push({ line: 2, tree: bstSnap(root, m), node: node.val, action: "поиск", info: target + " vs " + node.val });
      push({ line: 4, tree: bstSnap(root, m), node: node.val, action: (target < node.val ? "влево" : "вправо"), info: target < node.val ? target + " < " + node.val + " — влево" : target + " > " + node.val + " — вправо" });
      node = target < node.val ? node.left : node.right;
    }
    if (!node) { push({ line: 6, tree: bstSnap(root, {}), node: null, done: true, info: target + " в дереве нет" }); return { steps: steps }; }
    var mfound = {}; mfound[node.id] = "current";
    push({ line: 6, tree: bstSnap(root, mfound), node: node.val, action: "нашли", info: "нашли узел " + node.val });
    if (node.left && node.right) {
      push({ line: 7, tree: bstSnap(root, mfound), node: node.val, action: "два ребёнка", info: "у " + node.val + " два ребёнка — ищем преемника (min правого поддерева)" });
      var succ = node.right, sp = node;
      var ms = {}; ms[node.id] = "current"; ms[succ.id] = "found";
      push({ line: 8, tree: bstSnap(root, ms), node: succ.val, action: "преемник", info: "преемник = правый ребёнок " + succ.val + ", дальше влево до упора" });
      while (succ.left) { sp = succ; succ = succ.left; var ml = {}; ml[node.id] = "current"; ml[succ.id] = "found"; push({ line: 9, tree: bstSnap(root, ml), node: succ.val, action: "влево", info: "идём влево к минимуму: " + succ.val }); }
      node.val = succ.val;
      var mco = {}; mco[node.id] = "created";
      push({ line: 10, tree: bstSnap(root, mco), node: node.val, action: "копируем", info: "копируем значение преемника " + succ.val + " в удаляемый узел (теперь его дубликат-преемник надо убрать)" });
      node = succ; parent = sp;
    }
    var child = node.left || node.right || null;
    var mr = {}; mr[node.id] = "removed";
    push({ line: 13, tree: bstSnap(root, mr), node: node.val, removed: true, action: "отцепляем", info: "отцепляем узел " + node.val + (child ? " — на его место встаёт " + child.val : " (лист)") });
    if (!parent) root = child;
    else if (parent.left === node) parent.left = child;
    else parent.right = child;
    push({ line: (!parent ? 16 : (parent && parent.left === child ? 17 : 18)), tree: bstSnap(root, {}), node: (root ? root.val : "—"), action: "готово", done: true, info: "узел удалён" });
    return { steps: steps };
  }

  // ===== Бинарная куча (min-heap): Push / Pop ================================
  // Куча — ПОЛНОЕ дерево, поэтому массив-индексная раскладка точна (i → дети 2i+1/2i+2).
  // heapViz рисует и дерево (с рёбрами), и строку массива — видно соответствие индексов.
  function heapPos(i) {
    var d = Math.floor(Math.log(i + 1) / Math.LN2);
    var posInLvl = i - (Math.pow(2, d) - 1), cnt = Math.pow(2, d);
    return { d: d, frac: (posInLvl + 0.5) / cnt };
  }
  function heapViz(panel) {
    var CW = 50, CH = 64, R = 15;
    var host = mkEl("div", "algo-tp__heap"); panel.appendChild(host);
    var treeBox = mkEl("div", "algo-tp__heaptree"); host.appendChild(treeBox);
    var arrBox = mkEl("div", "algo-tp__heaparr"); host.appendChild(arrBox);
    return function (s) {
      treeBox.innerHTML = ""; arrBox.innerHTML = "";
      var h = s.heap || [], marks = s.marks || {};
      if (h.length) {
        var maxD = Math.floor(Math.log(h.length) / Math.LN2);
        var W = Math.max(2, Math.pow(2, maxD)) * CW, H = (maxD + 1) * CH;
        treeBox.style.position = "relative"; treeBox.style.width = W + "px"; treeBox.style.height = H + "px";
        function xy(i) { var p = heapPos(i); return [p.frac * W, p.d * CH + 22]; }
        var svg = document.createElementNS(SVGNS, "svg");
        svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "algo-tp__bstsvg");
        for (var i = 0; i < h.length; i++) {
          [2 * i + 1, 2 * i + 2].forEach(function (c) {
            if (c < h.length) { var a = xy(i), b = xy(c); var ln = document.createElementNS(SVGNS, "line"); ln.setAttribute("x1", a[0]); ln.setAttribute("y1", a[1]); ln.setAttribute("x2", b[0]); ln.setAttribute("y2", b[1]); ln.setAttribute("class", "algo-tp__bstedge"); svg.appendChild(ln); }
          });
        }
        treeBox.appendChild(svg);
        for (var j = 0; j < h.length; j++) { var p2 = xy(j); var nb = mkEl("div", "algo-tp__tnode" + (marks[j] ? " algo-tp__tnode--" + marks[j] : ""), h[j]); nb.style.position = "absolute"; nb.style.left = (p2[0] - R) + "px"; nb.style.top = (p2[1] - R) + "px"; treeBox.appendChild(nb); }
      } else { treeBox.appendChild(mkEl("div", "algo-tp__llnil", "∅ (пустая куча)")); }
      arrBox.appendChild(mkEl("div", "algo-tp__heaparrlab", "массив:"));
      h.forEach(function (v, k) { arrBox.appendChild(mkEl("div", "algo-tp__heapcell" + (marks[k] ? " algo-tp__tnode--" + marks[k] : ""), v)); });
    };
  }
  function bHeapPush(initial, val) {
    var h = initial.slice(), steps = [];
    function push(o) { steps.push({ si: steps.length, line: o.line, heap: h.slice(), marks: o.marks || {}, vars: { i: (o.i == null ? "—" : String(o.i)), action: (o.action || "—") }, info: o.info, done: o.done, created: o.created }); }
    h.push(val);
    var i = h.length - 1, mk0 = {}; mk0[i] = "created";
    push({ line: 1, marks: mk0, i: i, action: "append", created: true, info: "добавили " + val + " новым листом в конец (индекс " + i + ")" });
    push({ line: 2, marks: (function () { var m = {}; m[i] = "current"; return m; })(), i: i, action: "i", info: "i = " + i });
    while (i > 0) {
      var parent = (i - 1) >> 1;
      var mc = {}; mc[i] = "current"; mc[parent] = "found";
      push({ line: 4, marks: mc, i: i, action: "родитель", info: "родитель i — индекс " + parent + " (значение " + h[parent] + ")" });
      push({ line: 5, marks: mc, i: i, action: "сравнение", info: h[parent] + " ≤ " + h[i] + "? " + (h[parent] <= h[i] ? "да — куча восстановлена" : "нет — нужен swap вверх") });
      if (h[parent] <= h[i]) { push({ line: 6, marks: mc, i: i, action: "стоп", info: "порядок восстановлен — выходим" }); break; }
      var t = h[i]; h[i] = h[parent]; h[parent] = t;
      var ms = {}; ms[i] = "found"; ms[parent] = "current";
      push({ line: 8, marks: ms, i: parent, action: "swap↑", info: "меняем местами с родителем: " + h[parent] + " поднимается" });
      i = parent;
    }
    push({ line: 10, marks: {}, i: i, action: "готово", done: true, info: "куча: [" + h.join(", ") + "]" });
    return { steps: steps };
  }
  function bHeapPop(initial) {
    var h = initial.slice(), steps = [];
    function push(o) { steps.push({ si: steps.length, line: o.line, heap: h.slice(), marks: o.marks || {}, vars: { i: (o.i == null ? "—" : String(o.i)), action: (o.action || "—") }, info: o.info, done: o.done, removed: o.removed }); }
    if (!h.length) { push({ line: 1, marks: {}, done: true, info: "куча пуста" }); return { steps: steps }; }
    var min = h[0], mr = {}; mr[0] = "removed";
    push({ line: 1, marks: mr, i: 0, action: "min", removed: true, info: "корень " + min + " — минимум, его и извлекаем" });
    var last = h.length - 1;
    if (last === 0) { h.pop(); push({ line: 14, marks: {}, action: "готово", done: true, info: "куча опустела, вернули " + min }); return { steps: steps }; }
    h[0] = h[last];
    var ml = {}; ml[0] = "current";
    push({ line: 3, marks: ml, i: 0, action: "последний→корень", info: "последний лист " + h[0] + " переносим в корень" });
    h.pop();
    push({ line: 4, marks: ml, i: 0, action: "отрезали хвост", info: "отрезали хвост — массив: [" + h.join(", ") + "]" });
    var i = 0, n = h.length;
    while (true) {
      var l = 2 * i + 1, r = 2 * i + 2, small = i;
      var mc = {}; mc[i] = "current"; if (l < n) mc[l] = "found"; if (r < n) mc[r] = "found";
      push({ line: 7, marks: mc, i: i, action: "дети", info: "сравниваем " + h[i] + " с детьми" + (l < n ? " " + h[l] : "") + (r < n ? ", " + h[r] : "") });
      if (l < n && h[l] < h[small]) small = l;
      if (r < n && h[r] < h[small]) small = r;
      if (small === i) { push({ line: 10, marks: mc, i: i, action: "стоп", info: "узел не больше детей — порядок восстановлен" }); break; }
      var t = h[i]; h[i] = h[small]; h[small] = t;
      var ms = {}; ms[i] = "found"; ms[small] = "current";
      push({ line: 11, marks: ms, i: small, action: "swap↓", info: "меньший ребёнок " + h[i] + " поднимается, " + h[small] + " опускается" });
      i = small;
    }
    push({ line: 14, marks: {}, i: i, action: "готово", done: true, info: "вернули " + min + "; куча: [" + h.join(", ") + "]" });
    return { steps: steps };
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
    "race-timeline": {
      badge: "Гонка данных", desc: "Конкурентный BFS без замка: две горутины наперегонки помечают одну вершину — и добавляют её дважды.",
      valuesLabel: "", codeKey: "race-timeline", fillRange: false,
      complexity: { time: "—", space: "—", good: "⚠ Демонстрация data race" },
      varOrder: ["g", "act"],
      varDesc: { "g": "Горутина", "act": "Действие" },
      lineNotes: { 2: "Обе горутины читают visited[v] — и обе видят false", 3: "Пишут true без синхронизации", 4: "Добавляют v в next — на гонке дважды" },
      rules: [{ head: "read + read", body: "оба видят false", cls: "eq" }, { head: "write + write", body: "второй уже поздно", cls: "gt" }, { head: "append ×2", body: "дубликат", cls: "lt" }],
      parse: function (root) { var n = parseInt(root.getAttribute("data-goroutines"), 10); if (!(n >= 2)) n = 2; if (n > 4) n = 4; root.setAttribute("data-goroutines", n); return bRaceTimeline(n); },
      inputs: [{ attr: "data-goroutines", label: "горутин (2–4)", sm: true }],
      values: function () { return []; },
      title: function () { return "Гонка на visited (parallel BFS)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Горутина", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.g }, { text: s.vars.act, cls: (s.vars.act && s.vars.act.indexOf("✗") >= 0) ? "gt" : "lt" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "end", icon: "✗", head: "Гонка данных", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: s.vars.g, b: s.vars.act, c: (s.vars.act && s.vars.act.indexOf("✗") >= 0) ? "✗" : "·", cls: (s.done ? "gt" : "lt") }; },
      varsOf: function (s) { return { "g": s.vars.g, "act": s.vars.act }; },
      customViz: raceViz
    },

    "bfs-local-timeline": {
      badge: "Atomic CAS", desc: "Масштабируемый конкурентный BFS: вершину столбит атомарный CAS, у каждой горутины свой локальный фронт — без мьютекса и без гонки.",
      valuesLabel: "", codeKey: "bfs-local-timeline", fillRange: false,
      complexity: { time: "O(V+E)", space: "O(V)", good: "✓ Без гонки и без замка" },
      varOrder: ["g", "act"],
      varDesc: { "g": "Горутина", "act": "Действие" },
      lineNotes: { 2: "CAS 0→1: ровно одна горутина застолбит вершину", 3: "Победитель кладёт её в свой локальный фронт" },
      rules: [{ head: "CAS ✓", body: "вершина взята", cls: "eq" }, { head: "CAS занято", body: "другой не берёт", cls: "gt" }, { head: "merge", body: "фронты сливаются", cls: "lt" }],
      parse: function (root) { var n = parseInt(root.getAttribute("data-goroutines"), 10); if (!(n >= 2)) n = 2; if (n > 4) n = 4; root.setAttribute("data-goroutines", n); return bLocalTimeline(n); },
      inputs: [{ attr: "data-goroutines", label: "горутин (2–4)", sm: true }],
      values: function () { return []; },
      title: function () { return "Atomic-захват вершины (без гонки)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Горутина", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.g }, { text: s.vars.act, cls: (s.vars.act && s.vars.act.indexOf("✓") >= 0) ? "eq" : "lt" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Без дубля", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: s.vars.g, b: s.vars.act, c: (s.vars.act && s.vars.act.indexOf("✓") >= 0) ? "✓" : "·", cls: (s.done ? "eq" : "lt") }; },
      varsOf: function (s) { return { "g": s.vars.g, "act": s.vars.act }; },
      customViz: raceViz
    },

    "wordcount-race": {
      badge: "Гонка на map", desc: "Несколько горутин делают cnt[x]++ по ОБЩЕЙ map[int]int: инкременты теряются, а рантайм Go роняет программу.",
      valuesLabel: "", codeKey: "wordcount-race", fillRange: false,
      complexity: { time: "—", space: "—", good: "⚠ Гонка + fatal error" },
      varOrder: ["g", "act"],
      varDesc: { "g": "Горутина", "act": "Действие" },
      lineNotes: { 3: "Несколько горутин читают и пишут cnt[x] без синхронизации — инкременты затираются" },
      rules: [{ head: "read + read", body: "все видят 0", cls: "eq" }, { head: "write + write", body: "затирают друг друга", cls: "gt" }, { head: "Go-map", body: "fatal error", cls: "lt" }],
      parse: function (root) { var n = parseInt(root.getAttribute("data-goroutines"), 10); if (!(n >= 2)) n = 2; if (n > 4) n = 4; root.setAttribute("data-goroutines", n); return bWcRace(n); },
      inputs: [{ attr: "data-goroutines", label: "горутин (2–4)", sm: true }],
      values: function () { return []; },
      title: function () { return "Гонка на общей map (cnt[x]++)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Горутина", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.g }, { text: s.vars.act, cls: (s.vars.act && s.vars.act.indexOf("✗") >= 0) ? "gt" : "lt" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "end", icon: "✗", head: "Потеря + паника", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: s.vars.g, b: s.vars.act, c: (s.vars.act && s.vars.act.indexOf("✗") >= 0) ? "✗" : "·", cls: (s.done ? "gt" : "lt") }; },
      varsOf: function (s) { return { "g": s.vars.g, "act": s.vars.act }; },
      customViz: raceViz
    },

    "wordcount-local": {
      badge: "Worker pool", desc: "Каждая горутина считает в свою карту, после барьера локальные карты сливаются — без гонки и без паники.",
      valuesLabel: "", codeKey: "wordcount-local", fillRange: false,
      complexity: { time: "O(n)", space: "O(уник.)", good: "✓ map-reduce без гонки" },
      varOrder: ["g", "act"],
      varDesc: { "g": "Горутина", "act": "Действие" },
      lineNotes: { 3: "Каждая горутина пишет в СВОЮ карту — общей записи нет", 7: "Слияние локальных карт в общую — синхронизация только тут" },
      rules: [{ head: "local++", body: "своя карта", cls: "eq" }, { head: "barrier", body: "ждём всех", cls: "gt" }, { head: "merge", body: "суммируем", cls: "lt" }],
      parse: function (root) { var n = parseInt(root.getAttribute("data-goroutines"), 10); if (!(n >= 2)) n = 2; if (n > 4) n = 4; root.setAttribute("data-goroutines", n); return bWcLocal(n); },
      inputs: [{ attr: "data-goroutines", label: "горутин (2–4)", sm: true }],
      values: function () { return []; },
      title: function () { return "Подсчёт частот без гонки (локальные карты)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Горутина", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.g }, { text: s.vars.act, cls: "lt" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Без потерь", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: s.vars.g, b: s.vars.act, c: (s.done ? "✓" : "·"), cls: (s.done ? "eq" : "lt") }; },
      varsOf: function (s) { return { "g": s.vars.g, "act": s.vars.act }; },
      customViz: raceViz
    },

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

    "min-subarray-naive": {
      badge: "Грубый перебор",
      desc: "Наивно O(n²): для каждого левого конца i заново сканируем вправо. Эталон для сравнения — потом тот же ответ даёт окно за O(n).",
      valuesLabel: "Массив (положительные)", codeKey: "min-subarray-naive", fillRange: false,
      ptr1: { name: "i", cap: "(левый конец)" }, ptr2: { name: "j", cap: "(скан вправо)" },
      complexity: { time: "O(n²)", space: "O(1)", good: "⚠ База для сравнения — медленно" },
      varOrder: ["i", "j", "sum", "best"],
      varDesc: { i: "Левый конец подмассива", j: "Правый конец (скан вправо)", sum: "Сумма подмассива [i..j]", best: "Лучшая (минимальная) длина" },
      lineNotes: { 1: "best = len+1 — «бесконечность»: ещё ничего не нашли", 2: "Внешний цикл: перебираем КАЖДЫЙ левый конец i", 3: "Для нового i обнуляем сумму и сканируем вправо заново — вот она, повторная работа", 4: "Внутренний цикл: правый конец j ползёт вправо от i", 5: "Накапливаем сумму подмассива [i..j] за O(1)", 6: "Сумма дошла до target — подмассив подходит?", 7: "Короче прежнего — обновляем минимальную длину best", 8: "break: дальше тот же i даёт только длиннее", 12: "Ничего не нашли (best не изменился) → ответ 0", 13: "Возвращаем минимальную длину" },
      rules: [{ head: "Новый левый конец i", body: "скан вправо с нуля", cls: "lt" }, { head: "sum ≥ target", body: "кандидат → break", cls: "eq" }, { head: "Соседние i", body: "пересчитывают тот же суффикс", cls: "gt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var target = parseInt(root.getAttribute("data-target"), 10); return { arr: arr, target: target, steps: bMinSubNaive(arr, target) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-target", label: "target", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return "Мин. подмассив с суммой ≥ " + ctx.target + " — наивно O(n²)"; },
      param: function (ctx) { return { label: "target (цель суммы)", value: ctx.target, ok: true }; },
      cellState: function (s, j, lo, hi) { if (s.done && lo >= 0 && hi >= lo) return { found: j >= lo && j <= hi }; return { lo: j === lo && lo >= 0, hi: j === hi && hi >= 0, span: lo >= 0 && hi >= lo && j > lo && j < hi }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Сумма подмассива", "Сравнение с target", "Лучшая длина"],
      sumValues: function (s, ctx) {
        var sum = s.vars.sum, best = s.vars.best;
        if (typeof sum !== "number") return [{ text: "—" }, { text: "—" }, { text: best, cls: "warn" }];
        var ok = sum >= ctx.target;
        return [{ text: sum, cls: ok ? "ok" : "lo" }, { text: sum + (ok ? " ≥ " : " < ") + ctx.target, cls: ok ? "eq" : "lt" }, { text: best, cls: "warn" }];
      },
      status: function (s, idx, total) {
        if (s.done) { if (s.lo >= 0 && s.hi >= s.lo) return { kind: "ok", icon: "✓", head: "Минимальная длина = " + (s.hi - s.lo + 1), text: s.info }; return { kind: "end", icon: "∅", head: "Подмассива нет", text: s.info }; }
        return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info };
      },
      stepCard: function (s) { return { a: "i=" + s.vars.i + ", j=" + s.vars.j, b: "sum=" + s.vars.sum, c: "best=" + s.vars.best, cls: s.improved ? "eq" : "lt" }; },
      varsOf: function (s) { return { i: s.vars.i, j: s.vars.j, sum: s.vars.sum, best: s.vars.best }; }
    },

    "min-subarray-window": {
      badge: "Sliding Window",
      desc: "Оптимум O(n): переменное окно. right расширяет окно, при sum ≥ target жадно сжимаем слева. left только вперёд — отсюда линейность.",
      valuesLabel: "Массив (положительные)", codeKey: "min-subarray-window", fillRange: true,
      ptr1: { name: "left", cap: "(левая граница)" }, ptr2: { name: "right", cap: "(правая граница)" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Подотрезок под условие суммы" },
      varOrder: ["left", "right", "sum", "best"],
      varDesc: { left: "Левая граница окна", right: "Правая граница окна", sum: "Сумма текущего окна", best: "Лучшая (минимальная) длина" },
      lineNotes: { 1: "left и sum в ноль — окно пустое", 2: "best = len+1 — «бесконечность»", 3: "Правая граница right расширяет окно вправо", 4: "Добавляем nums[right] в сумму окна за O(1)", 5: "Пока окно валидно (sum ≥ target) — жадно сжимаем слева", 6: "Окно подходит — пробуем обновить минимальную длину", 7: "Убираем левый элемент из суммы (left только вперёд)", 8: "left++ — сжали окно слева, проверяем условие снова", 11: "Ничего не нашли → ответ 0", 12: "Возвращаем минимальную длину окна" },
      rules: [{ head: "Расширяем right", body: "+ nums[right] в сумму", cls: "lt" }, { head: "sum ≥ target", body: "жадно сжимаем слева", cls: "gt" }, { head: "Обновляем best", body: "если окно короче", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var target = parseInt(root.getAttribute("data-target"), 10); return { arr: arr, target: target, steps: bMinSubWindow(arr, target) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-target", label: "target", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return "Мин. подмассив с суммой ≥ " + ctx.target + " — окно O(n)"; },
      param: function (ctx) { return { label: "target (цель суммы)", value: ctx.target, ok: true }; },
      cellState: function (s, j, lo, hi) { if (s.done && lo >= 0 && hi >= lo) return { found: j >= lo && j <= hi }; return { lo: j === lo && lo >= 0, hi: j === hi && hi >= 0, span: lo >= 0 && hi >= lo && j > lo && j < hi }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Сумма окна", "Сравнение с target", "Лучшая длина"],
      sumValues: function (s, ctx) {
        var sum = s.vars.sum, best = s.vars.best, ok = sum >= ctx.target;
        return [{ text: sum, cls: ok ? "ok" : "lo" }, { text: sum + (ok ? " ≥ " : " < ") + ctx.target, cls: ok ? "eq" : "lt" }, { text: best, cls: "warn" }];
      },
      status: function (s, idx, total) {
        if (s.done) { if (s.lo >= 0 && s.hi >= s.lo) return { kind: "ok", icon: "✓", head: "Минимальная длина = " + (s.hi - s.lo + 1), text: s.info }; return { kind: "end", icon: "∅", head: "Подмассива нет", text: s.info }; }
        return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info };
      },
      stepCard: function (s) { return { a: "left=" + s.vars.left + ", right=" + s.vars.right, b: "sum=" + s.vars.sum, c: "best=" + s.vars.best, cls: s.improved ? "eq" : "lt" }; },
      varsOf: function (s) { return { left: s.vars.left, right: s.vars.right, sum: s.vars.sum, best: s.vars.best }; }
    },

    "num-provinces-naive": {
      badge: "Грубый перебор",
      desc: "Наивно O(V³): транзитивное замыкание Флойда–Уоршелла заполняет матрицу reach[i][j] тройным циклом, потом считаем компоненты. Эталон для DFS.",
      valuesLabel: "", codeKey: "num-provinces-naive", fillRange: false,
      complexity: { time: "O(V³)", space: "O(V²)", good: "⚠ База для сравнения — кубично" },
      varOrder: ["k", "i", "j", "провинций"],
      varDesc: { k: "Промежуточная вершина", i: "Из вершины", j: "В вершину", "провинций": "Найдено компонент" },
      lineNotes: { 2: "Стартовая матрица: reach[i][j] = (i==j) или прямая связь", 6: "Если есть путь i→k и k→j — значит есть путь i→j", 7: "reach[i][j] = true (новый транзитивный путь)", 14: "Вершина уже в провинции — пропуск", 15: "Новая провинция: count++ и метим всех достижимых", 20: "Число компонент = число провинций" },
      rules: [{ head: "reach[i][k] && reach[k][j]", body: "→ reach[i][j] = true", cls: "lt" }, { head: "тройной цикл k,i,j", body: "= O(V³)", cls: "gt" }, { head: "компонента", body: "→ новая провинция", cls: "eq" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = parseEdges(root.getAttribute("data-edges")); return { labels: labels, edges: edges, steps: bNumProvincesNaive(labels, edges) }; },
      inputs: [{ attr: "data-nodes", label: "Города" }, { attr: "data-edges", label: "Связи a-b" }],
      values: function () { return []; },
      title: function () { return "Число провинций — Флойд–Уоршелл O(V³)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Через k", "Пара (i, j)", "Провинций"],
      sumValues: function (s) { return [{ text: s.vars.k }, { text: "(" + s.vars.i + ", " + s.vars.j + ")" }, { text: s.vars["провинций"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Провинций: " + s.vars["провинций"], text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "k=" + s.vars.k, b: "(" + s.vars.i + "," + s.vars.j + ")", c: s.improved ? "путь!" : "·", cls: s.improved ? "eq" : "" }; },
      varsOf: function (s) { return { k: s.vars.k, i: s.vars.i, j: s.vars.j, "провинций": s.vars["провинций"] }; },
      customViz: reachMatrixViz
    },

    "merge-intervals-naive": {
      badge: "Грубый перебор",
      desc: "Наивно O(n²): сливаем перекрывающиеся пары, пока что-то меняется. Без сортировки соседние интервалы сравниваются снова и снова. Эталон для сортировки + проход.",
      valuesLabel: "", codeKey: "merge-intervals-naive", fillRange: false,
      complexity: { time: "O(n²)", space: "O(n)", good: "⚠ Повторный перебор всех пар" },
      varOrder: ["i", "j", "интервалов", "проходов"],
      varDesc: { i: "Первый интервал пары", j: "Второй интервал пары", "интервалов": "Осталось в res", "проходов": "Проходов до стабилизации" },
      lineNotes: { 1: "res — копия входа без сортировки", 3: "Новый проход: заново сравниваем все пары", 7: "Пара (i, j) перекрывается?", 8: "Сливаем в один, удаляем j — список укоротился", 16: "Стабилизировалось — возвращаем результат" },
      rules: [{ head: "пара перекрывается", body: "→ слить, удалить j", cls: "lt" }, { head: "что-то слилось", body: "→ ещё проход", cls: "gt" }, { head: "ничего не меняется", body: "→ готово", cls: "eq" }],
      parse: function (root) { var raw = (root.getAttribute("data-intervals") || "").split(",").map(function (s) { return s.trim().split("-").map(Number); }).filter(function (p) { return p.length === 2; }); var minX = Math.min.apply(null, raw.map(function (p) { return p[0]; })); var maxX = Math.max.apply(null, raw.map(function (p) { return p[1]; })); return { minX: minX, maxX: maxX, steps: bMergeNaive(raw) }; },
      inputs: [{ attr: "data-intervals", label: "Интервалы a-b,c-d" }],
      values: function () { return []; },
      title: function () { return "Слияние интервалов — наивно O(n²)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Пара (i, j)", "Интервалов в res", "Проходов"],
      sumValues: function (s) { return [{ text: "(" + s.vars.i + ", " + s.vars.j + ")" }, { text: s.vars["интервалов"], cls: "eq" }, { text: s.vars["проходов"], cls: "warn" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Слито в " + s.vars["интервалов"] + " за " + s.vars["проходов"] + " прох.", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "(" + s.vars.i + "," + s.vars.j + ")", b: "res=" + s.vars["интервалов"], c: s.improved ? "слили" : "·", cls: s.improved ? "lt" : "" }; },
      varsOf: function (s) { return { i: s.vars.i, j: s.vars.j, "интервалов": s.vars["интервалов"], "проходов": s.vars["проходов"] }; },
      customViz: intervalBarsViz
    },

    "diameter-naive": {
      badge: "Грубый перебор",
      desc: "Наивно O(n²): для каждого узла отдельно вызываем height(), которая обходит всё поддерево. Узлы у вершины пересчитывают высоту тех же поддеревьев снова и снова. Эталон для одного DFS.",
      valuesLabel: "", codeKey: "diameter-naive", fillRange: false,
      complexity: { time: "O(n²)", space: "O(h)", good: "⚠ Повторный обход поддеревьев" },
      varOrder: ["узел", "через узел", "диаметр"],
      varDesc: { "узел": "Узел, для которого считаем путь через него", "через узел": "height(left) + height(right)", "диаметр": "Лучший диаметр пока" },
      lineNotes: { 11: "through = height(left) + height(right) — заново обходим оба поддерева", 14: "Возвращаем максимум: через узел или целиком в поддереве" },
      rules: [{ head: "height(node)", body: "обходит ВСЁ поддерево", cls: "gt" }, { head: "для каждого узла", body: "заново → O(n²)", cls: "lt" }, { head: "через узел", body: "= left + right", cls: "eq" }],
      parse: function (root) { var arr = (root.getAttribute("data-tree") || "").split(",").map(function (x) { x = x.trim(); return x === "null" || x === "" ? null : Number(x); }); var r = bDiameterNaive(arr); return { arr: arr, present: r.present, steps: r.steps }; },
      inputs: [{ attr: "data-tree", label: "Дерево (level-order, null)" }],
      values: function () { return []; },
      title: function () { return "Диаметр дерева — наивно O(n²)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Узел", "Путь через узел", "Диаметр"],
      sumValues: function (s) { return [{ text: s.vars["узел"] }, { text: s.vars["через узел"], cls: "lt" }, { text: s.vars["диаметр"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Диаметр = " + s.vars["диаметр"], text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "узел " + s.vars["узел"], b: "через=" + s.vars["через узел"], c: s.improved ? "макс!" : "·", cls: s.improved ? "eq" : "" }; },
      varsOf: function (s) { return { "узел": s.vars["узел"], "через узел": s.vars["через узел"], "диаметр": s.vars["диаметр"] }; },
      customViz: naiveTreeViz
    },

    "oranges-rotting-naive": {
      badge: "Грубый перебор",
      desc: "Наивно O((R·C)²): поминутная симуляция с пересканированием ВСЕЙ сетки каждую минуту. Результат тот же, но работы кратно больше. Эталон для multi-source BFS.",
      valuesLabel: "", codeKey: "oranges-rotting-naive", fillRange: false,
      complexity: { time: "O((R·C)²)", space: "O(R·C)", good: "⚠ Полный рескан каждую минуту" },
      varOrder: ["минута", "свежих", "сканов сетки"],
      varDesc: { "минута": "Прошло минут", "свежих": "Свежих осталось", "сканов сетки": "Сколько раз просканировали всю сетку" },
      lineNotes: { 1: "minutes = 0; гнилые — старты", 3: "snap — копия: свежезаражённые в эту минуту пока не заражают", 5: "Сканируем ВСЮ сетку (вот она, лишняя работа)", 11: "Свежий сосед гнилого → заражается", 17: "Ничего не изменилось — стоп", 19: "Остались свежие → -1", 20: "Ответ в минутах" },
      rules: [{ head: "каждую минуту", body: "→ скан всей сетки", cls: "gt" }, { head: "гнилой сосед свежего", body: "→ заражает", cls: "lt" }, { head: "нет изменений", body: "→ стоп", cls: "eq" }],
      parse: function (root) { var grid = (root.getAttribute("data-grid") || "").split(";").map(function (r) { return r.split(",").map(Number); }); var res = bOrangesNaive(grid); return { grid: res.grid, R: res.R, C: res.C, steps: res.steps, rotTime: res.rotTime }; },
      inputs: [{ attr: "data-grid", label: "Сетка (0/1/2)" }],
      values: function () { return []; },
      title: function () { return "Rotting Oranges — наивно O((R·C)²)"; },
      legend: [{ cls: "current", label: "сгнил сейчас" }, { cls: "visited", label: "уже гнилой" }, { cls: "wall", label: "пусто" }],
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Минута", "Свежих осталось", "Сканов сетки"],
      sumValues: function (s) { return [{ text: s.vars["минута"], cls: "eq" }, { text: s.vars["свежих"], cls: (s.vars["свежих"] === 0 ? "eq" : "warn") }, { text: s.vars["сканов сетки"], cls: "warn" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: s.found ? "ok" : "end", icon: s.found ? "✓" : "∅", head: s.found ? ("Сгнило за " + s.vars["минута"] + " мин") : "Остались недостижимые", text: s.info }; return { kind: "info", icon: idx + 1, head: "Минута " + s.vars["минута"], text: s.info }; },
      stepCard: function (s) { return { a: "минута " + s.vars["минута"], b: "свежих " + s.vars["свежих"], c: s.done ? "✓" : "скан", cls: s.done ? "eq" : "gt" }; },
      varsOf: function (s) { return { "минута": s.vars["минута"], "свежих": s.vars["свежих"], "сканов сетки": s.vars["сканов сетки"] }; },
      customViz: orangesViz
    },

    "jump-game-dp": {
      badge: "Грубый перебор",
      desc: "Наивно O(n²): из каждой достижимой клетки помечаем весь диапазон прыжка. Диапазоны жирно перекрываются — повторная пометка одних позиций. Эталон для жадности.",
      valuesLabel: "Массив (макс. прыжок)", codeKey: "jump-game-dp", fillRange: false,
      ptr1: { name: "i", cap: "(откуда прыгаем)" }, ptr2: { name: "i+step", cap: "(помечаем)" },
      complexity: { time: "O(n²)", space: "O(n)", good: "⚠ База для сравнения — медленно" },
      varOrder: ["i", "nums[i]", "step", "reachable"],
      varDesc: { i: "Текущая клетка", "nums[i]": "Длина прыжка", step: "Шаг внутри диапазона", reachable: "Достижима ли клетка i" },
      lineNotes: { 3: "reachable[0] = true — старт достижим", 4: "Идём по всем клеткам", 5: "Клетка недостижима → пропуск", 9: "Помечаем достижимой каждую клетку в радиусе прыжка", 12: "Ответ — достижим ли последний индекс" },
      rules: [{ head: "Клетка достижима", body: "→ метим весь диапазон", cls: "lt" }, { head: "Недостижима", body: "→ continue", cls: "gt" }, { head: "Диапазоны", body: "жирно перекрываются", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); return { arr: arr, steps: bJumpGameDp(arr) }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "Jump Game — наивная динамика O(n²)"; },
      cellState: function (s, j) { var r = s.reach && s.reach[j]; return { found: !!r && j !== s.lo, lo: j === s.lo && s.lo >= 0, hi: j === s.hi && s.hi >= 0 }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Клетка i", "nums[i] (прыжок)", "reachable[i]"],
      sumValues: function (s) { return [{ text: s.vars.i }, { text: s.vars["nums[i]"] }, { text: s.vars.reachable, cls: s.vars.reachable === "да" ? "eq" : "" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: s.found ? "ok" : "end", icon: s.found ? "✓" : "∅", head: s.found ? "Конец достижим" : "Не допрыгнуть", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "i=" + s.vars.i, b: "reach=" + s.vars.reachable, c: s.improved ? "метим" : "·", cls: s.improved ? "lt" : "" }; },
      varsOf: function (s) { return { i: s.vars.i, "nums[i]": s.vars["nums[i]"], step: s.vars.step, reachable: s.vars.reachable }; }
    },

    "search-range-naive": {
      badge: "Грубый перебор",
      desc: "Наивно O(n): линейный проход игнорирует сортированность. res[0] фиксируется на первом совпадении, res[1] перетирается на каждом. Эталон для двух бинарных поисков.",
      valuesLabel: "Массив (отсортирован)", codeKey: "search-range-naive", fillRange: false,
      ptr1: { name: "i", cap: "(сканер)" }, ptr2: { name: "", cap: "" },
      complexity: { time: "O(n)", space: "O(1)", good: "⚠ Не использует сортировку" },
      varOrder: ["i", "nums[i]", "first", "last"],
      varDesc: { i: "Текущий индекс", "nums[i]": "Значение", first: "res[0] — первое совпадение", last: "res[1] — последнее" },
      lineNotes: { 1: "res = [-1,-1] — пока не нашли", 3: "Совпадает ли с target?", 5: "Первое совпадение — фиксируем res[0]", 7: "res[1] обновляется на каждом совпадении", 10: "Возвращаем границы диапазона" },
      rules: [{ head: "v == target", body: "→ обновляем границы", cls: "eq" }, { head: "первое совпадение", body: "→ res[0]", cls: "lt" }, { head: "каждое совпадение", body: "→ res[1]", cls: "gt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var target = parseInt(root.getAttribute("data-target"), 10); return { arr: arr, target: target, steps: bSearchRangeNaive(arr, target) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-target", label: "target", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return "Поиск диапазона target = " + ctx.target + " — наивно O(n)"; },
      param: function (ctx) { return { label: "target", value: ctx.target, ok: true }; },
      cellState: function (s, j) { if (s.done && s.lo >= 0) return { found: j >= s.lo && j <= s.hi }; return { lo: j === s.lo && s.lo >= 0, found: !!s.match && j === s.lo }; },
      pointers: function (s) { return { lo: s.lo, hi: -1 }; },
      sumCells: ["nums[i] vs target", "res[0]", "res[1]"],
      sumValues: function (s, ctx) { var v = s.vars["nums[i]"]; return [{ text: (typeof v === "number" ? v + (v === ctx.target ? " = " : " ≠ ") + ctx.target : "—"), cls: (v === ctx.target ? "eq" : "") }, { text: s.vars.first, cls: "lt" }, { text: s.vars.last, cls: "gt" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: s.found ? "ok" : "end", icon: s.found ? "✓" : "∅", head: s.found ? ("Диапазон [" + s.lo + ", " + s.hi + "]") : "target не найден", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "i=" + s.vars.i, b: "first=" + s.vars.first + ", last=" + s.vars.last, c: s.match ? "✓" : "·", cls: s.match ? "eq" : "" }; },
      varsOf: function (s) { return { i: s.vars.i, "nums[i]": s.vars["nums[i]"], first: s.vars.first, last: s.vars.last }; }
    },

    "string-match-naive": {
      badge: "Грубый перебор",
      desc: "Наивно O(n·m): для каждой позиции i прикладываем образец и сравниваем посимвольно. На «злом» входе окно почти совпадает и каждый раз пересравнивается заново. Эталон для KMP.",
      valuesLabel: "Текст", codeKey: "string-match-naive", fillRange: true,
      ptr1: { name: "i", cap: "(начало окна)" }, ptr2: { name: "i+j", cap: "(сравнение)" },
      complexity: { time: "O(n·m)", space: "O(1)", good: "⚠ Откат указателя текста" },
      varOrder: ["i", "j", "сравнение", "найдено"],
      varDesc: { i: "Начало окна в тексте", j: "Позиция в образце", "сравнение": "Текущее сравнение символов", "найдено": "Найдено вхождений" },
      lineNotes: { 3: "Для каждой позиции i прикладываем образец", 5: "Сравниваем символы окна с образцом, пока совпадают", 8: "j дошёл до конца образца — нашли вхождение на позиции i", 12: "Возвращаем все позиции вхождений" },
      rules: [{ head: "Символы равны", body: "→ j++ (сравниваем дальше)", cls: "lt" }, { head: "Несовпадение", body: "→ сдвигаем окно на 1", cls: "gt" }, { head: "j == m", body: "→ вхождение на i", cls: "eq" }],
      parse: function (root) { var text = (root.getAttribute("data-text") || "").split(""); var pat = (root.getAttribute("data-pattern") || "").split(""); return { text: text, pat: pat, steps: bStringMatchNaive(text, pat) }; },
      inputs: [{ attr: "data-text", label: "Текст" }, { attr: "data-pattern", label: "Образец" }],
      values: function (ctx) { return ctx.text; },
      title: function (ctx) { return "Поиск «" + ctx.pat.join("") + "» — наивно O(n·m)"; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Окно с i", "Сравнение", "Найдено вхождений"],
      sumValues: function (s) { return [{ text: (typeof s.vars.i === "number" ? "i = " + s.vars.i : "—") }, { text: s.vars["сравнение"], cls: (s.match ? "eq" : "") }, { text: s.vars["найдено"], cls: "warn" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: s.found ? "ok" : "end", icon: s.found ? "✓" : "∅", head: "Вхождений: " + s.vars["найдено"], text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "i=" + s.vars.i + ", j=" + s.vars.j, b: s.vars["сравнение"], c: s.improved ? "вхождение!" : (s.match ? "✓" : "·"), cls: s.improved ? "eq" : (s.match ? "lt" : "gt") }; },
      varsOf: function (s) { return { i: s.vars.i, j: s.vars.j, "сравнение": s.vars["сравнение"], "найдено": s.vars["найдено"] }; },
      mapViz: function (parent, ctx) {
        var pat = ctx.pat;
        var wrap = mkEl("div", "algo-tp__map");
        wrap.appendChild(mkEl("div", "algo-tp__maphdr", "Образец pat — сравниваем по символу (зелёный = текущий j)"));
        var grid = mkEl("div", "algo-tp__mapgrid");
        var cells = pat.map(function (ch, k) { var col = mkEl("div", "algo-tp__mapcell"); col.appendChild(mkEl("div", "algo-tp__mapkey", k)); var cnt = mkEl("div", "algo-tp__mapcnt", "'" + ch + "'"); col.appendChild(cnt); grid.appendChild(col); return col; });
        wrap.appendChild(grid);
        parent.appendChild(wrap);
        return function (s) { cells.forEach(function (col, k) { var active = (typeof s.patj === "number" && k === s.patj); col.className = "algo-tp__mapcell" + (active ? " algo-tp__mapcell--on algo-tp__mapcell--hot algo-tp__mapcell--add" : " algo-tp__mapcell--off"); }); };
      }
    },

    "num-provinces": {
      badge: "Graph DFS",
      desc: "Оптимум O(V²): каждый незатронутый узел запускает DFS новой компоненты и красит всё достижимое. Число запусков = число провинций.",
      valuesLabel: "Города", codeKey: "num-provinces", fillRange: false,
      complexity: { time: "O(V²)", space: "O(V)", good: "★ Компоненты связности" },
      varOrder: ["вершина", "провинций", "посещено"],
      varDesc: { "вершина": "Текущая вершина DFS", "провинций": "Найдено компонент", "посещено": "Посещённых вершин" },
      lineNotes: { 2: "visited — массив посещённости (все false)", 5: "visited[v] = true — вошли в DFS компоненты", 7: "Сосед связан (=1) и ещё не посещён?", 8: "dfs(u) — спускаемся в соседа той же компоненты", 13: "Внешний цикл по всем вершинам", 14: "Вершина уже посещена — та же провинция", 15: "Незатронутая вершина → count++ и новый DFS", 19: "Число запусков DFS = число провинций" },
      rules: [{ head: "Незатронутая вершина", body: "→ новая провинция + DFS", cls: "eq" }, { head: "Связана и не посещена", body: "→ та же провинция", cls: "lt" }, { head: "Уже посещена", body: "→ пропуск", cls: "gt" }],
      parse: function (root) { var labels = (root.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); }); var edges = parseEdges(root.getAttribute("data-edges")); return { labels: labels, edges: edges, steps: bNumProvinces(labels, edges) }; },
      inputs: [{ attr: "data-nodes", label: "Города" }, { attr: "data-edges", label: "Связи a-b" }],
      values: function (ctx) { return ctx.labels; },
      title: function () { return "Число провинций (DFS по компонентам)"; },
      legend: [{ cls: "current", label: "текущая" }, { cls: "visited", label: "в компоненте" }, { cls: "idle", label: "не обработана" }],
      pointers: function (s) { return { lo: s.current, hi: -1 }; },
      sumCells: ["Вершина", "Провинций"],
      sumValues: function (s) { return [{ text: s.vars["вершина"] }, { text: s.vars["провинций"], cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Провинций: " + s.vars["провинций"], text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars["провинций"] + " провинций", c: "DFS", cls: "eq" }; return { a: "вершина " + s.vars["вершина"], b: "провинций " + s.vars["провинций"], c: s.improved ? "новая!" : "→", cls: s.improved ? "eq" : "lt" }; },
      varsOf: function (s) { return { "вершина": s.vars["вершина"], "провинций": s.vars["провинций"], "посещено": s.vars["посещено"] }; },
      customViz: graphViz
    },

    "subsets-with-dup": {
      badge: "Backtracking",
      desc: "Оптимум: подмножества массива с дубликатами. sort + skip на уровне (i>start && nums[i]==nums[i-1] → continue) — без set и конкатенации ключей.",
      valuesLabel: "Множество (с дублями)", codeKey: "subsets-with-dup", fillRange: false,
      complexity: { time: "O(2ⁿ·n)", space: "O(n)", good: "★ Подмножества без дублей" },
      varOrder: ["action", "cur", "count"],
      varDesc: { "action": "Текущий шаг", "cur": "Текущее частичное подмножество", "count": "Найдено уникальных подмножеств" },
      lineNotes: { 6: "Записываем текущее подмножество (копию буфера)", 7: "Перебираем элементы начиная со start", 8: "Не первая копия дубля на этом уровне → continue", 11: "Выбираем элемент i — добавляем в текущее", 12: "Рекурсия по оставшимся (i+1)", 13: "Откат: убираем элемент", 17: "Все уникальные подмножества собраны" },
      rules: [{ head: "Выбрать элемент", body: "append → рекурсия", cls: "lt" }, { head: "Дубль на уровне", body: "→ continue (пропуск)", cls: "gt" }, { head: "Записать", body: "current → результат", cls: "eq" }],
      parse: function (root) { var set = nums(root.getAttribute("data-set")); return { set: set.slice().sort(function (a, b) { return a - b; }), steps: bSubsetsDup(set) }; },
      inputs: [{ attr: "data-set", label: "Множество" }],
      values: function (ctx) { return ctx.set; },
      title: function () { return "Подмножества с дублями (sort + skip)"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущее", "Найдено подмножеств"],
      sumValues: function (s) { return [{ text: s.vars.cur }, { text: s.vars.count, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: s.vars.count + " подмножеств", text: s.info }; if (s.action === "skip") return { kind: "info", icon: idx + 1, head: "Пропуск дубля", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars.count + " шт.", c: "backtrack", cls: "eq" }; var cls = s.action === "choose" ? "lt" : (s.action === "back" || s.action === "skip" ? "gt" : "eq"); return { a: s.vars.action, b: s.vars.cur, c: s.action === "skip" ? "дубль" : "→", cls: cls }; },
      varsOf: function (s) { return { "action": s.vars.action, "cur": s.vars.cur, "count": s.vars.count }; },
      customViz: subsetsViz
    },

    "combination-sum": {
      badge: "Backtracking",
      desc: "Оптимум: все комбинации с суммой target (повтор кандидата разрешён). Несём остаток remain: база remain==0, отсечение candidates[i] > remain.",
      valuesLabel: "Кандидаты", codeKey: "combination-sum", fillRange: false,
      complexity: { time: "экспонента (с отсечением)", space: "O(target)", good: "★ Перебор с обрезкой ветвей" },
      varOrder: ["action", "cur", "remain", "count"],
      varDesc: { "action": "Текущий шаг", "cur": "Текущая комбинация", "remain": "Остаток до target", "count": "Найдено комбинаций" },
      lineNotes: { 7: "remain == 0 — комбинация набрана, записываем снимок", 10: "Перебираем кандидатов начиная со start", 12: "candidates[i] > remain → break (отсортировано, дальше только больше)", 14: "Берём кандидата — remain уменьшается", 15: "Рекурсия с i (не i+1) — кандидата можно повторять", 16: "Откат: убираем кандидата", 20: "Все комбинации найдены" },
      rules: [{ head: "remain == 0", body: "→ комбинация готова", cls: "eq" }, { head: "candidates[i] > remain", body: "→ break (отсечение)", cls: "gt" }, { head: "берём кандидата", body: "remain − candidates[i]", cls: "lt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var target = parseInt(root.getAttribute("data-target"), 10); return { set: arr.slice().sort(function (a, b) { return a - b; }), target: target, steps: bCombSum(arr, target) }; },
      inputs: [{ attr: "data-array", label: "Кандидаты" }, { attr: "data-target", label: "target", sm: true }],
      values: function (ctx) { return ctx.set; },
      title: function (ctx) { return "Combination Sum = " + ctx.target; },
      param: function (ctx) { return { label: "target", value: ctx.target, ok: true }; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущая комбинация", "Остаток", "Найдено"],
      sumValues: function (s) { return [{ text: s.vars.cur }, { text: s.vars.remain, cls: (s.vars.remain === 0 ? "eq" : "lt") }, { text: s.vars.count, cls: "warn" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: s.vars.count + " комбинаций", text: s.info }; if (s.action === "prune") return { kind: "info", icon: idx + 1, head: "Отсечение ветки", text: s.info }; if (s.action === "record") return { kind: "info", icon: idx + 1, head: "Комбинация найдена", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: s.vars.count + " шт.", c: "backtrack", cls: "eq" }; var cls = s.action === "choose" ? "lt" : (s.action === "back" || s.action === "prune" ? "gt" : "eq"); return { a: s.vars.action, b: "remain=" + s.vars.remain, c: s.action === "prune" ? "обрыв" : "→", cls: cls }; },
      varsOf: function (s) { return { "action": s.vars.action, "cur": s.vars.cur, "remain": s.vars.remain, "count": s.vars.count }; },
      customViz: subsetsViz
    },

    "oranges-rotting": {
      badge: "Multi-source BFS",
      desc: "Оптимум O(R·C): все гнилые апельсины (2) — источники на минуте 0; каждая минута заражает свежих 4-соседей. Уровни BFS = минуты.",
      valuesLabel: "", codeKey: "oranges-rotting", fillRange: false,
      complexity: { time: "O(R·C)", space: "O(R·C)", good: "★ Волны от многих источников" },
      varOrder: ["минута", "свежих", "источников"],
      varDesc: { "минута": "Прошло минут", "свежих": "Свежих апельсинов осталось", "источников": "Гнилых на текущем уровне" },
      lineNotes: { 1: "Собираем все гнилые (2) как старты, считаем свежие (1)", 2: "Свежих нет — гнить нечему, return 0", 4: "Минута за минутой, пока очередь не пуста и есть свежие", 9: "Сосед свежий → гниёт, fresh--, в следующий уровень", 19: "Остались недостижимые свежие → return -1", 20: "Все сгнили — ответ в минутах" },
      rules: [{ head: "Гнилой 2", body: "источник на минуте 0", cls: "gt" }, { head: "Свежий сосед 1", body: "→ гниёт через минуту", cls: "lt" }, { head: "Остался свежий", body: "→ −1 (недостижим)", cls: "eq" }],
      parse: function (root) { var grid = (root.getAttribute("data-grid") || "").split(";").map(function (r) { return r.split(",").map(Number); }); var res = bOrangesRotting(grid); return { grid: res.grid, R: res.R, C: res.C, steps: res.steps, rotTime: res.rotTime }; },
      inputs: [{ attr: "data-grid", label: "Сетка (0 пусто, 1 свежий, 2 гнилой)" }],
      values: function () { return []; },
      title: function () { return "Rotting Oranges (multi-source BFS)"; },
      legend: [{ cls: "current", label: "сгнил сейчас" }, { cls: "visited", label: "уже гнилой" }, { cls: "wall", label: "пусто" }],
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Минута", "Свежих осталось"],
      sumValues: function (s) { return [{ text: s.vars["минута"], cls: "eq" }, { text: s.vars["свежих"], cls: (s.vars["свежих"] === 0 ? "eq" : "warn") }]; },
      status: function (s, idx, total) { if (s.done) return { kind: s.found ? "ok" : "end", icon: s.found ? "✓" : "∅", head: s.found ? ("Сгнило за " + s.vars["минута"] + " мин") : "Остались недостижимые", text: s.info }; return { kind: "info", icon: idx + 1, head: "Минута " + s.vars["минута"], text: s.info }; },
      stepCard: function (s) { return { a: "минута " + s.vars["минута"], b: "свежих " + s.vars["свежих"], c: s.done ? "✓" : "волна", cls: s.done ? "eq" : "lt" }; },
      varsOf: function (s) { return { "минута": s.vars["минута"], "свежих": s.vars["свежих"], "источников": s.vars["источников"] }; },
      customViz: orangesViz
    },

    "first-missing-positive": {
      badge: "Cyclic Sort",
      desc: "Оптимум O(n): раскладываем число v на индекс v−1 (на месте), значения вне [1,n] пропускаем. Затем первый индекс, где nums[i] ≠ i+1, и есть ответ.",
      valuesLabel: "Массив", codeKey: "first-missing-positive", fillRange: false,
      ptr1: { name: "i", cap: "(текущий)" }, ptr2: { name: "correct", cap: "(куда ставим)" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Числа из диапазона 1..n" },
      varOrder: ["i", "v", "correct", "n"],
      varDesc: { i: "Текущий индекс", v: "nums[i] — раскладываемое число", correct: "Целевой индекс v−1", n: "Размер массива" },
      lineNotes: { 2: "i = 0 — фаза раскладки чисел по местам", 3: "Пока i < n продолжаем раскладку", 4: "v = nums[i] — какое число сейчас в руках", 5: "Его место — индекс v−1", 6: "v в диапазоне [1,n] и ещё не на месте?", 7: "Меняем местами — число уходит на свой индекс, i НЕ растёт", 9: "На месте или вне диапазона → i++", 13: "Фаза скана: первый индекс, где nums[i] ≠ i+1", 14: "Это и есть наименьшее пропущенное", 17: "Массив — ровно 1..n, ответ n+1" },
      rules: [{ head: "v ∈ [1,n], не на месте", body: "→ swap на индекс v−1", cls: "lt" }, { head: "на месте / вне диапазона", body: "→ i++", cls: "gt" }, { head: "nums[i] ≠ i+1", body: "→ ответ i+1", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); return { arr: arr, steps: bFirstMissingPositive(arr) }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "Первое пропущенное положительное — O(n)"; },
      cellState: function (s, j) { var inplace = s.values && s.values[j] === j + 1; return { lo: j === s.lo && s.lo >= 0, hi: j === s.hi && s.hi >= 0, found: !!inplace }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["v = nums[i]", "Целевой индекс v−1", "Размер n"],
      sumValues: function (s) { return [{ text: s.vars.v }, { text: s.vars.correct }, { text: s.vars.n, cls: "warn" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: s.info.replace(/^return /, "Ответ = ").replace(/ —.*/, ""), text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "i=" + s.vars.i, b: "v=" + s.vars.v, c: s.hi >= 0 ? "swap" : "·", cls: s.hi >= 0 ? "lt" : "" }; },
      varsOf: function (s) { return { i: s.vars.i, v: s.vars.v, correct: s.vars.correct, n: s.vars.n }; }
    },

    "house-robber": {
      badge: "Dynamic Programming",
      desc: "Оптимум O(n), O(1): dp[i] = max(пропустить dp[i−1], взять dp[i−2]+nums[i]). Вся таблица свёрнута в две переменные prev2, prev1.",
      valuesLabel: "Дома (деньги)", codeKey: "house-robber", fillRange: false,
      ptr1: { name: "i", cap: "(текущий дом)" }, ptr2: { name: "—", cap: "" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ ДП с зависимостью от 1–2 шагов" },
      varOrder: ["i", "x", "prev2", "prev1", "cur"],
      varDesc: { i: "Индекс дома", x: "Деньги в доме i", prev2: "dp[i−2]", prev1: "dp[i−1]", cur: "dp[i] = max(...)" },
      lineNotes: { 1: "prev2 = prev1 = 0 — пустое окно", 2: "Идём по домам слева направо", 3: "cur = max(пропустить prev1, взять prev2 + x)", 4: "Сдвигаем окно двух значений: prev2 ← prev1, prev1 ← cur", 6: "Ответ — prev1 (последнее dp)" },
      rules: [{ head: "Пропустить дом", body: "→ берём prev1", cls: "lt" }, { head: "Взять дом", body: "→ prev2 + nums[i]", cls: "gt" }, { head: "dp[i]", body: "= максимум из двух", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); return { arr: arr, steps: bHouseRobber(arr) }; },
      inputs: [{ attr: "data-array", label: "Дома (деньги)" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "House Robber — ДП O(n), память O(1)"; },
      pointers: function (s) { return { lo: s.lo, hi: -1 }; },
      sumCells: ["prev2 = dp[i−2]", "prev1 = dp[i−1]", "cur = dp[i]"],
      sumValues: function (s) { return [{ text: s.vars.prev2 }, { text: s.vars.prev1 }, { text: s.vars.cur, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Максимум = " + s.vars.prev1, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "дом " + s.vars.i, b: "x=" + s.vars.x, c: "dp=" + s.vars.cur, cls: s.improved ? "gt" : "lt" }; },
      varsOf: function (s) { return { i: s.vars.i, x: s.vars.x, prev2: s.vars.prev2, prev1: s.vars.prev1, cur: s.vars.cur }; }
    },

    "two-single": {
      badge: "Bit Manipulation",
      desc: "Оптимум O(n), O(1): xorAll = a^b (пары сокращаются); diff — младший различающий бит; второй проход делит числа по diff и копит XOR в группах a и b.",
      valuesLabel: "Массив", codeKey: "two-single", fillRange: false,
      ptr1: { name: "i", cap: "(текущий)" }, ptr2: { name: "—", cap: "" },
      complexity: { time: "O(n)", space: "O(1)", good: "★ Поиск одиночек среди пар" },
      varOrder: ["i", "x", "xorAll", "diff", "a", "b"],
      varDesc: { i: "Текущий индекс", x: "nums[i]", xorAll: "XOR всех (после прохода 1 = a^b)", diff: "Младший бит различия a и b", a: "XOR группы с битом 1", b: "XOR группы с битом 0" },
      lineNotes: { 1: "xorAll = 0 — первый проход", 3: "xorAll ^= x: пары сокращаются, остаётся a ^ b", 5: "diff = xorAll & (−xorAll) — младший бит, где a и b различаются", 6: "a = b = 0 — второй проход делит по diff", 7: "Бит diff в x установлен?", 9: "Бит установлен → копим в a", 11: "Бит сброшен → копим в b", 14: "Возвращаем [a, b]" },
      rules: [{ head: "x & diff ≠ 0", body: "→ группа a", cls: "gt" }, { head: "x & diff = 0", body: "→ группа b", cls: "lt" }, { head: "пары в группе", body: "→ XOR обнуляет", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); return { arr: arr, steps: bTwoSingle(arr) }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "Два числа-одиночки — двойной XOR O(n)"; },
      pointers: function (s) { return { lo: s.lo, hi: -1 }; },
      sumCells: ["a (бит = 1)", "b (бит = 0)", "xorAll / diff"],
      sumValues: function (s) { return [{ text: s.vars.a, cls: "gt" }, { text: s.vars.b, cls: "lt" }, { text: (s.vars.diff !== "—" ? "diff = " + s.vars.diff : "xorAll = " + s.vars.xorAll), cls: "warn" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Одиночки: " + s.vars.a + ", " + s.vars.b, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "x=" + s.vars.x, b: "a=" + s.vars.a + ", b=" + s.vars.b, c: "·", cls: "lt" }; },
      varsOf: function (s) { return { i: s.vars.i, x: s.vars.x, xorAll: s.vars.xorAll, diff: s.vars.diff, a: s.vars.a, b: s.vars.b }; }
    },

    "three-sum-naive": {
      badge: "Грубый перебор",
      desc: "Наивно O(n³): три вложенных цикла i<j<k перебирают все тройки, дубли отсекаем через set. Эталон для решения двумя указателями.",
      valuesLabel: "Массив", codeKey: "three-sum-naive", fillRange: false,
      ptr1: { name: "i", cap: "(первый)" }, ptr2: { name: "k", cap: "(третий)" },
      complexity: { time: "O(n³)", space: "O(n)", good: "⚠ База для сравнения — медленно" },
      varOrder: ["i", "j", "k", "sum", "found"],
      varDesc: { i: "Первый индекс тройки", j: "Второй индекс", k: "Третий индекс", sum: "nums[i]+nums[j]+nums[k]", found: "Найдено уникальных троек" },
      lineNotes: { 2: "res пуст — собираем тройки с суммой 0", 3: "Внешний цикл: первый элемент i", 4: "Средний цикл: второй элемент j > i", 5: "Внутренний цикл: третий элемент k > j", 6: "Сумма тройки равна 0?", 7: "Тройка найдена — добавляем, set отсекает дубли", 12: "Возвращаем все уникальные тройки" },
      rules: [{ head: "sum == 0", body: "→ тройка-кандидат", cls: "eq" }, { head: "три цикла i<j<k", body: "все сочетания = O(n³)", cls: "gt" }, { head: "set", body: "отсев дублей разных порядков", cls: "lt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); return { arr: arr, steps: bThreeSumNaive(arr) }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "3Sum — наивно O(n³)"; },
      cellState: function (s, j) { return { lo: j === s.lo && s.lo >= 0, mid: j === s.mid && s.mid >= 0, hi: j === s.hi && s.hi >= 0 }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Тройка (i, j, k)", "Сумма", "Найдено троек"],
      sumValues: function (s, ctx) {
        var i = s.vars.i, j = s.vars.j, k = s.vars.k, sum = s.vars.sum;
        if (typeof sum !== "number") return [{ text: "—" }, { text: "—" }, { text: s.vars.found, cls: "warn" }];
        var z = sum === 0;
        return [{ text: "(" + ctx.arr[i] + ", " + ctx.arr[j] + ", " + ctx.arr[k] + ")" }, { text: sum + (z ? " = 0" : " ≠ 0"), cls: z ? "eq" : "lt" }, { text: s.vars.found, cls: "warn" }];
      },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Уникальных троек: " + s.vars.found, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "i=" + s.vars.i + ", j=" + s.vars.j + ", k=" + s.vars.k, b: "sum=" + s.vars.sum, c: "троек=" + s.vars.found, cls: s.improved ? "eq" : "lt" }; },
      varsOf: function (s) { return { i: s.vars.i, j: s.vars.j, k: s.vars.k, sum: s.vars.sum, found: s.vars.found }; }
    },

    "three-sum": {
      badge: "Two Pointers",
      desc: "Оптимум O(n²): сортируем, фиксируем nums[i], а пару с суммой −nums[i] ищем встречными указателями. Дедуп даётся отсортированным массивом даром.",
      valuesLabel: "Массив (отсортирован)", codeKey: "three-sum", fillRange: false,
      ptr1: { name: "left", cap: "(левый)" }, ptr2: { name: "right", cap: "(правый)" },
      complexity: { time: "O(n²)", space: "O(1)", good: "★ Тройки/пары в отсортированном массиве" },
      varOrder: ["i", "left", "right", "sum", "found"],
      varDesc: { i: "Фиксированный первый элемент", left: "Левый указатель пары", right: "Правый указатель пары", sum: "nums[i]+nums[left]+nums[right]", found: "Найдено уникальных троек" },
      lineNotes: { 1: "Сортируем — появляется монотонность для встречных указателей", 3: "Фиксируем первый элемент тройки i", 4: "Пропускаем дубль первого элемента (continue)", 5: "Ставим left=i+1, right=n−1 — пара для остатка −nums[i]", 6: "Сводим пару, пока left < right", 7: "Сумма тройки на текущих указателях", 10: "sum == 0 — записали тройку, сдвигаем обе границы и перешагиваем дубли", 12: "sum < 0 — нужна больше, left++", 14: "sum > 0 — нужна меньше, right--", 19: "Возвращаем все уникальные тройки" },
      rules: [{ head: "sum < 0", body: "→ left++ (больше)", cls: "lt" }, { head: "sum > 0", body: "→ right-- (меньше)", cls: "gt" }, { head: "sum == 0", body: "→ тройка найдена", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var a = arr.slice().sort(function (x, y) { return x - y; }); return { arr: a, steps: bThreeSum(arr) }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "3Sum — сортировка + два указателя O(n²)"; },
      cellState: function (s, j) { var r = { lo: j === s.lo && s.lo >= 0, mid: j === s.mid && s.mid >= 0, hi: j === s.hi && s.hi >= 0 }; if (s.lo >= 0 && s.hi >= 0 && j > s.lo && j < s.hi) r.span = true; return r; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Тройка (i, left, right)", "Сумма", "Найдено троек"],
      sumValues: function (s, ctx) {
        var i = s.vars.i, l = s.vars.left, r = s.vars.right, sum = s.vars.sum;
        if (typeof sum !== "number") return [{ text: "—" }, { text: "—" }, { text: s.vars.found, cls: "warn" }];
        var z = sum === 0;
        return [{ text: "(" + ctx.arr[i] + ", " + ctx.arr[l] + ", " + ctx.arr[r] + ")" }, { text: sum + (z ? " = 0" : (sum < 0 ? " < 0" : " > 0")), cls: z ? "eq" : (sum < 0 ? "lt" : "gt") }, { text: s.vars.found, cls: "warn" }];
      },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Уникальных троек: " + s.vars.found, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "i=" + s.vars.i + ", L=" + s.vars.left + ", R=" + s.vars.right, b: "sum=" + s.vars.sum, c: "троек=" + s.vars.found, cls: s.improved ? "eq" : "lt" }; },
      varsOf: function (s) { return { i: s.vars.i, left: s.vars.left, right: s.vars.right, sum: s.vars.sum, found: s.vars.found }; }
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

    "ll-insert": {
      badge: "Linked List", desc: "Вставка узла: доходим до позиции, создаём узел и перецепляем два указателя.",
      valuesLabel: "", codeKey: "ll-insert", fillRange: false,
      complexity: { time: "O(n)", space: "O(1)", good: "★ Вставки по ссылке" },
      varOrder: ["node", "action"],
      varDesc: { "node": "Узел перед позицией / новый", "action": "Что делаем на шаге" },
      lineNotes: { 1: "Фиктивная голова (dummy) — чтобы вставка в начало не была спецслучаем", 2: "prev стартует с dummy", 3: "Идём до узла перед нужной позицией", 4: "Сдвигаем prev вперёд", 6: "Создаём новый узел", 7: "Новый узел указывает на остаток (сначала сохрани то, что перезапишешь)", 8: "Предыдущий узел указывает на новый — узел вставлен", 9: "Возвращаем голову (dummy.Next)" },
      rules: [{ head: "Дошли до позиции", body: "→ создаём узел", cls: "lt" }, { head: "node.Next = prev.Next", body: "новый → остаток", cls: "eq" }, { head: "prev.Next = node", body: "предыдущий → новый", cls: "gt" }],
      parse: function (root) { var list = nums(root.getAttribute("data-list")); var val = parseInt(root.getAttribute("data-val"), 10); var pos = parseInt(root.getAttribute("data-pos") || "0", 10); var r = bLLInsert(list, val, pos); return { list: list, val: val, pos: pos, steps: r.steps }; },
      inputs: [{ attr: "data-list", label: "Список" }, { attr: "data-val", label: "значение" }, { attr: "data-pos", label: "позиция" }],
      values: function () { return []; },
      title: function (ctx) { return "Список: вставка " + ctx.val + " в позицию " + ctx.pos; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Узел", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.action, cls: s.created ? "gt" : "lt" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Узел " + ctx.val + " вставлен", text: s.info }; if (s.created) return { kind: "info", icon: idx + 1, head: "Узел создан", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "", c: "✓", cls: "eq" }; if (s.created) return { a: "узел «" + s.vars.node + "»", b: "создан", c: "+", cls: "gt" }; return { a: "узел «" + s.vars.node + "»", b: s.vars.action, c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "action": s.vars.action }; },
      customViz: llViz
    },

    "ll-search": {
      badge: "Linked List", desc: "Поиск значения: идём по ссылкам от головы, сравнивая Val с целью.",
      valuesLabel: "", codeKey: "ll-search", fillRange: false,
      complexity: { time: "O(n)", space: "O(1)", good: "★ Линейный поиск" },
      varOrder: ["node", "target"],
      varDesc: { "node": "Текущий узел", "target": "Искомое значение" },
      lineNotes: { 1: "Идём по списку от головы, пока узел не nil", 2: "Сравниваем значение узла с целью", 3: "Совпало — возвращаем узел", 6: "Дошли до конца — значения нет" },
      rules: [{ head: "node.Val == target", body: "→ нашли", cls: "eq" }, { head: "node.Val ≠ target", body: "→ node = node.Next", cls: "lt" }, { head: "node == nil", body: "→ нет в списке", cls: "gt" }],
      parse: function (root) { var list = nums(root.getAttribute("data-list")); var target = parseInt(root.getAttribute("data-target"), 10); var r = bLLSearch(list, target); return { list: list, target: target, steps: r.steps }; },
      inputs: [{ attr: "data-list", label: "Список" }, { attr: "data-target", label: "искомое" }],
      values: function () { return []; },
      title: function (ctx) { return "Список: поиск " + ctx.target; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Цель"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.target, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.found) return { kind: "ok", icon: "✓", head: ctx.target + " найден", text: s.info }; if (s.done) return { kind: "end", icon: idx + 1, head: ctx.target + " не найден", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "найдено", b: s.vars.node, c: "✓", cls: "eq" }; if (s.done) return { a: "не найдено", b: "", c: "✗", cls: "gt" }; return { a: "узел «" + s.vars.node + "»", b: "vs " + s.vars.target, c: "↓", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "target": s.vars.target }; },
      customViz: llViz
    },

    "ll-delete": {
      badge: "Linked List", desc: "Удаление по значению: доходим до узла перед целью и перецепляем prev.Next через него.",
      valuesLabel: "", codeKey: "ll-delete", fillRange: false,
      complexity: { time: "O(n)", space: "O(1)", good: "★ Удаления по ссылке" },
      varOrder: ["node", "target"],
      varDesc: { "node": "Проверяемый узел (prev.Next)", "target": "Удаляемое значение" },
      lineNotes: { 1: "Фиктивная голова — чтобы удаление головы не было спецслучаем", 2: "prev стартует с dummy", 3: "Пока есть следующий узел", 4: "Это удаляемое значение?", 5: "Да — перецепляем prev.Next через узел (узел выпадает из цепочки)", 6: "Выходим из цикла", 8: "Нет — сдвигаем prev вперёд", 10: "Возвращаем голову (dummy.Next)" },
      rules: [{ head: "prev.Next.Val == target", body: "→ вырезаем", cls: "gt" }, { head: "prev.Next.Val ≠ target", body: "→ prev = prev.Next", cls: "lt" }, { head: "prev.Next = prev.Next.Next", body: "узел выпал", cls: "eq" }],
      parse: function (root) { var list = nums(root.getAttribute("data-list")); var target = parseInt(root.getAttribute("data-target"), 10); var r = bLLDelete(list, target); return { list: list, target: target, steps: r.steps }; },
      inputs: [{ attr: "data-list", label: "Список" }, { attr: "data-target", label: "удаляем" }],
      values: function () { return []; },
      title: function (ctx) { return "Список: удаление " + ctx.target; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Цель"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.target, cls: s.removed ? "gt" : "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Удаление " + ctx.target + " завершено", text: s.info }; if (s.removed) return { kind: "info", icon: idx + 1, head: "Узел вырезан", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "", c: "✓", cls: "eq" }; if (s.removed) return { a: "узел «" + s.vars.node + "»", b: "вырезан", c: "–", cls: "gt" }; return { a: "узел «" + s.vars.node + "»", b: "vs " + s.vars.target, c: "↓", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "target": s.vars.target }; },
      customViz: llViz
    },

    "bst-search": {
      badge: "BST", desc: "Поиск в дереве поиска: на каждом узле идём влево (меньше) или вправо (больше).",
      valuesLabel: "", codeKey: "bst-search", fillRange: false,
      complexity: { time: "O(h)", space: "O(1)", good: "★ Поиск по упорядоченному дереву" },
      varOrder: ["node", "target"],
      varDesc: { "node": "Текущий узел", "target": "Искомое значение" },
      lineNotes: { 1: "Стартуем с корня", 2: "Пока не дошли до nil", 3: "Сравниваем цель со значением узла", 4: "Равно — нашли", 6: "Меньше — идём в левое поддерево", 8: "Больше — идём в правое поддерево", 11: "Дошли до nil — значения нет" },
      rules: [{ head: "val == node.Val", body: "→ нашли", cls: "eq" }, { head: "val < node.Val", body: "→ влево", cls: "lt" }, { head: "val > node.Val", body: "→ вправо", cls: "gt" }],
      parse: function (root) { var vals = nums(root.getAttribute("data-tree")); var target = parseInt(root.getAttribute("data-target"), 10); var r = bBSTSearch(vals, target); return { vals: vals, target: target, steps: r.steps }; },
      inputs: [{ attr: "data-tree", label: "Вставить (порядок)" }, { attr: "data-target", label: "искомое" }],
      values: function () { return []; },
      title: function (ctx) { return "BST: поиск " + ctx.target; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Цель"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.target, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.found) return { kind: "ok", icon: "✓", head: ctx.target + " найден", text: s.info }; if (s.done) return { kind: "end", icon: idx + 1, head: ctx.target + " не найден", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "найдено", b: s.vars.node, c: "✓", cls: "eq" }; if (s.done) return { a: "не найдено", b: "", c: "✗", cls: "gt" }; return { a: "узел «" + s.vars.node + "»", b: "vs " + s.vars.target, c: "↓", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "target": s.vars.target }; },
      customViz: bstViz
    },

    "bst-insert": {
      badge: "BST", desc: "Вставка в дерево поиска: спускаемся по сравнениям до пустого места и подцепляем лист.",
      valuesLabel: "", codeKey: "bst-insert", fillRange: false,
      complexity: { time: "O(h)", space: "O(1)", good: "★ Вставки с сохранением порядка" },
      varOrder: ["node", "action"],
      varDesc: { "node": "Текущий узел", "action": "Что делаем на шаге" },
      lineNotes: { 1: "Пустое дерево — новый узел становится корнем", 2: "Идём от корня, помня родителя", 5: "Сравниваем вставляемое значение с узлом", 6: "Меньше — в левое поддерево", 8: "Больше-равно — в правое поддерево", 11: "Дошли до пустого места — создаём лист", 13: "Подцепляем слева", 15: "Подцепляем справа" },
      rules: [{ head: "val < node.Val", body: "→ влево", cls: "lt" }, { head: "val ≥ node.Val", body: "→ вправо", cls: "gt" }, { head: "Пустое место", body: "→ новый лист", cls: "eq" }],
      parse: function (root) { var vals = nums(root.getAttribute("data-tree")); var val = parseInt(root.getAttribute("data-val"), 10); var r = bBSTInsert(vals, val); return { vals: vals, val: val, steps: r.steps }; },
      inputs: [{ attr: "data-tree", label: "Вставить (порядок)" }, { attr: "data-val", label: "новое значение" }],
      values: function () { return []; },
      title: function (ctx) { return "BST: вставка " + ctx.val; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.action, cls: s.created ? "gt" : "lt" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: ctx.val + " вставлен", text: s.info }; if (s.created) return { kind: "info", icon: idx + 1, head: "Лист создан", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.created) return { a: "лист «" + s.vars.node + "»", b: "создан", c: "+", cls: "gt" }; return { a: "узел «" + s.vars.node + "»", b: s.vars.action, c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "action": s.vars.action }; },
      customViz: bstViz
    },

    "bst-delete": {
      badge: "BST", desc: "Удаление из дерева поиска: лист, один ребёнок или два ребёнка (замена на преемника).",
      valuesLabel: "", codeKey: "bst-delete", fillRange: false,
      complexity: { time: "O(h)", space: "O(1)", good: "★ Удаления с сохранением порядка" },
      varOrder: ["node", "action"],
      varDesc: { "node": "Текущий / удаляемый узел", "action": "Что делаем на шаге" },
      lineNotes: { 1: "Ищем узел, помня родителя", 2: "Пока не нашли значение", 4: "Влево или вправо по сравнению", 6: "Значения нет — выходим", 7: "Два ребёнка — особый случай", 8: "Преемник: минимум правого поддерева", 9: "Идём влево до упора", 10: "Копируем значение преемника в узел", 13: "У узла теперь ≤ 1 ребёнка — берём его", 16: "Отцепляем: узел заменяется ребёнком (или nil)", 17: "Перецепляем левую ссылку родителя", 18: "Перецепляем правую ссылку родителя" },
      rules: [{ head: "0–1 ребёнок", body: "→ заменяем ребёнком/nil", cls: "lt" }, { head: "2 ребёнка", body: "→ значение преемника", cls: "gt" }, { head: "Преемник", body: "min правого поддерева", cls: "eq" }],
      parse: function (root) { var vals = nums(root.getAttribute("data-tree")); var target = parseInt(root.getAttribute("data-delete"), 10); var r = bBSTDelete(vals, target); return { vals: vals, target: target, steps: r.steps }; },
      inputs: [{ attr: "data-tree", label: "Вставить (порядок)" }, { attr: "data-delete", label: "удаляем" }],
      values: function () { return []; },
      title: function (ctx) { return "BST: удаление " + ctx.target; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.action, cls: s.removed ? "gt" : "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Удаление " + ctx.target + " завершено", text: s.info }; if (s.removed) return { kind: "info", icon: idx + 1, head: "Узел отцеплен", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.removed) return { a: "узел «" + s.vars.node + "»", b: "отцеплен", c: "–", cls: "gt" }; return { a: "узел «" + s.vars.node + "»", b: s.vars.action, c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "action": s.vars.action }; },
      customViz: bstViz
    },

    "heap-push": {
      badge: "Binary Heap", desc: "Вставка в min-кучу: новый лист в конец массива, затем просеивание вверх до родителя.",
      valuesLabel: "", codeKey: "heap-push", fillRange: false,
      complexity: { time: "O(log n)", space: "O(1)", good: "★ Вставка в кучу" },
      varOrder: ["i", "action"],
      varDesc: { "i": "Индекс просеиваемого узла", "action": "Что делаем на шаге" },
      lineNotes: { 1: "Кладём новый элемент листом в конец массива", 2: "i — индекс нового элемента", 3: "Просеивание вверх, пока не корень", 4: "Индекс родителя: (i-1)/2", 5: "Родитель не больше — куча восстановлена", 6: "Стоп", 8: "Меняем узел с родителем местами (поднимаем вверх)", 9: "Поднимаемся: i = parent" },
      rules: [{ head: "Новый элемент", body: "→ лист в конец", cls: "lt" }, { head: "Меньше родителя", body: "→ swap вверх", cls: "gt" }, { head: "Не меньше родителя", body: "→ стоп", cls: "eq" }],
      parse: function (root) { var initial = nums(root.getAttribute("data-heap")); var val = parseInt(root.getAttribute("data-val"), 10); var r = bHeapPush(initial, val); return { initial: initial, val: val, steps: r.steps }; },
      inputs: [{ attr: "data-heap", label: "Куча (массив)" }, { attr: "data-val", label: "вставить" }],
      values: function () { return []; },
      title: function (ctx) { return "Куча: вставка " + ctx.val; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Индекс i", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.i }, { text: s.vars.action, cls: s.created ? "gt" : "lt" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: ctx.val + " вставлен", text: s.info }; if (s.created) return { kind: "info", icon: idx + 1, head: "Новый лист", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.created) return { a: "лист", b: "в конец", c: "+", cls: "gt" }; return { a: "i = " + s.vars.i, b: s.vars.action, c: "↑", cls: "lt" }; },
      varsOf: function (s) { return { "i": s.vars.i, "action": s.vars.action }; },
      customViz: heapViz
    },

    "heap-pop": {
      badge: "Binary Heap", desc: "Извлечение минимума: корень забираем, последний лист → в корень, затем просеивание вниз.",
      valuesLabel: "", codeKey: "heap-pop", fillRange: false,
      complexity: { time: "O(log n)", space: "O(1)", good: "★ Извлечение минимума" },
      varOrder: ["i", "action"],
      varDesc: { "i": "Индекс просеиваемого узла", "action": "Что делаем на шаге" },
      lineNotes: { 1: "Корень — минимум, его возвращаем", 3: "Последний лист переносим в корень", 4: "Отрезаем хвост массива", 6: "Просеивание вниз", 7: "Меньший из узла и двух детей", 8: "Левый ребёнок меньше?", 9: "Правый ребёнок меньше?", 10: "Меньший — сам узел: порядок восстановлен", 11: "Меняем с меньшим ребёнком местами (опускаем вниз)", 14: "Возвращаем минимум" },
      rules: [{ head: "Корень", body: "→ это минимум", cls: "eq" }, { head: "Последний лист", body: "→ в корень", cls: "lt" }, { head: "Больше ребёнка", body: "→ swap вниз", cls: "gt" }],
      parse: function (root) { var initial = nums(root.getAttribute("data-heap")); var r = bHeapPop(initial); return { initial: initial, steps: r.steps }; },
      inputs: [{ attr: "data-heap", label: "Куча (массив)" }],
      values: function () { return []; },
      title: function () { return "Куча: извлечение минимума"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Индекс i", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.i }, { text: s.vars.action, cls: s.removed ? "gt" : "lt" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Минимум извлечён", text: s.info }; if (s.removed) return { kind: "info", icon: idx + 1, head: "Извлекаем корень", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.removed) return { a: "корень", b: "минимум", c: "–", cls: "gt" }; return { a: "i = " + s.vars.i, b: s.vars.action, c: "↓", cls: "lt" }; },
      varsOf: function (s) { return { "i": s.vars.i, "action": s.vars.action }; },
      customViz: heapViz
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

    "trie-shortest-root": {
      badge: "Trie", desc: "Replace Words: спускаемся по слову и возвращаем первый встреченный корень-префикс (узел с isEnd) — он же кратчайший.",
      valuesLabel: "", codeKey: "trie-shortest-root", fillRange: false,
      complexity: { time: "O(L)", space: "O(Σ·N·L)", good: "★ Замена по словарю префиксов" },
      varOrder: ["i", "char", "node", "isEnd"],
      varDesc: { "i": "Индекс символа в слове", "char": "Текущий символ слова", "node": "Текущий узел бора", "isEnd": "Конец корня (isEnd)?" },
      lineNotes: { 1: "node := корень — стартуем спуск по слову", 2: "Идём по символам слова по одному", 3: "Берём текущий символ c", 4: "Есть ли у узла потомок по символу c?", 5: "Ребра нет — путь оборвался, корня-префикса нет", 7: "Спускаемся в потомка по символу c", 8: "Узел помечен isEnd — это конец корня из словаря?", 9: "Первый встреченный конец = кратчайший корень, возвращаем префикс word[:i+1]", 12: "Дошли до конца слова, корень не встретился — слово без изменений" },
      rules: [{ head: "Есть ребёнок", body: "→ спускаемся глубже", cls: "lt" }, { head: "Узел isEnd", body: "→ кратчайший корень найден", cls: "eq" }, { head: "Ребра нет", body: "→ корня нет, слово как есть", cls: "gt" }],
      parse: function (root) { var words = (root.getAttribute("data-words") || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); var query = (root.getAttribute("data-query") || "").trim(); var r = bTrieShortestRoot(words, query); return { words: words, query: query, nodes: r.nodes, path: r.path, steps: r.steps }; },
      inputs: [{ attr: "data-words", label: "Корни словаря (через запятую)" }, { attr: "data-query", label: "слово" }],
      values: function () { return []; },
      title: function (ctx) { return "Trie: кратчайший корень для «" + ctx.query + "»"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "isEnd?"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.isEnd, cls: s.vars.isEnd === "да" ? "eq" : "" }]; },
      status: function (s, idx, total, ctx) { if (s.found) return { kind: "ok", icon: "✓", head: "Корень найден: «" + ctx.query.slice(0, (typeof s.vars.i === "number" ? s.vars.i : 0) + 1) + "»", text: s.info }; if (s.done) return { kind: "end", icon: idx + 1, head: "Корня нет — слово без изменений", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "корень найден", b: "node.isEnd", c: "✓", cls: "eq" }; if (s.done) return { a: "корня нет", b: "слово как есть", c: "—", cls: "gt" }; return { a: "символ '" + s.vars.char + "'", b: "узел «" + s.vars.node + "»", c: "↓", cls: "lt" }; },
      varsOf: function (s) { return { "i": s.vars.i, "char": s.vars.char, "node": s.vars.node, "isEnd": s.vars.isEnd }; },
      customViz: trieViz
    },

    "trie-insert": {
      badge: "Trie", desc: "Вставка слова: спускаемся по символам, создавая узел только там, где ребра ещё нет.",
      valuesLabel: "", codeKey: "trie-insert", fillRange: false,
      complexity: { time: "O(L)", space: "O(Σ·N·L)", good: "★ Построение бора" },
      varOrder: ["char", "node", "action"],
      varDesc: { "char": "Текущий символ слова", "node": "Текущий узел дерева", "action": "Что делаем на шаге" },
      lineNotes: { 1: "Стартуем с корня дерева", 2: "Идём по символам слова", 3: "Берём текущий символ", 4: "Есть ли у узла потомок по этому символу?", 5: "Ребра нет — создаём новый узел (вот она, точка роста)", 7: "Спускаемся в потомка (созданного или уже бывшего)", 9: "Дошли до конца слова — помечаем узел isEnd" },
      rules: [{ head: "Потомок есть", body: "→ переиспользуем (общий префикс)", cls: "lt" }, { head: "Потомка нет", body: "→ создаём узел", cls: "gt" }, { head: "Конец слова", body: "→ isEnd = true", cls: "eq" }],
      parse: function (root) { var words = (root.getAttribute("data-words") || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); var ins = (root.getAttribute("data-insert") || "").trim(); var r = bTrieInsert(words, ins); return { words: words, ins: ins, nodes: r.nodes, path: r.path, steps: r.steps, endId: r.endId, endAt: r.endAt }; },
      inputs: [{ attr: "data-words", label: "Уже в боре (через запятую)" }, { attr: "data-insert", label: "вставляем" }],
      values: function () { return []; },
      title: function (ctx) { return "Trie: вставка «" + ctx.ins + "»"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.action, cls: s.created ? "gt" : "lt" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "«" + ctx.ins + "» вставлено", text: s.info }; if (s.created) return { kind: "info", icon: idx + 1, head: "Создан узел", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "конец слова", b: "isEnd = true", c: "✓", cls: "eq" }; if (s.created) return { a: "узел '" + s.vars.char + "'", b: "создан", c: "+", cls: "gt" }; if (s.vars.action === "есть") return { a: "символ '" + s.vars.char + "'", b: "уже есть", c: "↺", cls: "lt" }; return { a: "символ '" + s.vars.char + "'", b: "узел «" + s.vars.node + "»", c: "↓", cls: "lt" }; },
      varsOf: function (s) { return { "char": s.vars.char, "node": s.vars.node, "action": s.vars.action }; },
      customViz: trieInsertViz
    },

    "trie-delete": {
      badge: "Trie", desc: "Удаление слова: снимаем isEnd, затем обрезаем висячие узлы снизу вверх.",
      valuesLabel: "", codeKey: "trie-delete", fillRange: false,
      complexity: { time: "O(L)", space: "O(L)", good: "★ Удаление с обрезкой" },
      varOrder: ["char", "node", "action"],
      varDesc: { "char": "Символ слова", "node": "Текущий узел", "action": "Что делаем на шаге" },
      lineNotes: { 1: "Спускаемся к узлу слова (find)", 2: "Слова нет или это не конец слова?", 3: "Удалять нечего — return false", 5: "Снимаем флаг конца слова", 6: "Идём от конца слова к началу, обрезая хвост", 8: "Узел ещё нужен? (конец другого слова или есть дети)", 9: "Нужен — прекращаем обрезку", 11: "Висячий — удаляем ссылку на узел", 13: "Готово — return true" },
      rules: [{ head: "Узел висячий (не конец, без детей)", body: "→ удаляем", cls: "gt" }, { head: "Узел ещё нужен", body: "→ стоп", cls: "lt" }, { head: "Конец слова", body: "→ isEnd = false", cls: "eq" }],
      parse: function (root) { var words = (root.getAttribute("data-words") || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); var del = (root.getAttribute("data-delete") || "").trim(); var r = bTrieDelete(words, del); return { words: words, del: del, nodes: r.nodes, path: r.path, steps: r.steps }; },
      inputs: [{ attr: "data-words", label: "В боре (через запятую)" }, { attr: "data-delete", label: "удаляем" }],
      values: function () { return []; },
      title: function (ctx) { return "Trie: удаление «" + ctx.del + "»"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.action, cls: s.removed ? "gt" : "lt" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Удаление «" + ctx.del + "» завершено", text: s.info }; if (s.removed) return { kind: "info", icon: idx + 1, head: "Узел удалён", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "", c: "✓", cls: "eq" }; if (s.removed) return { a: "узел «" + s.vars.node + "»", b: "удалён", c: "–", cls: "gt" }; return { a: "узел «" + s.vars.node + "»", b: s.vars.action, c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "char": s.vars.char, "node": s.vars.node, "action": s.vars.action }; },
      customViz: trieDeleteViz
    },

    "trie-words": {
      badge: "Trie", desc: "Все слова с префиксом: спускаемся к префиксу, затем DFS собирает слова (a→z).",
      valuesLabel: "", codeKey: "trie-words", fillRange: false,
      complexity: { time: "O(узлов поддерева)", space: "O(L)", good: "★ Автодополнение" },
      varOrder: ["node", "word", "found"],
      varDesc: { "node": "Текущий узел", "word": "Накопленный путь от корня", "found": "Собрано слов" },
      lineNotes: { 1: "Спускаемся к узлу префикса (find)", 5: "В узле: это конец слова?", 6: "Да — добавляем накопленный путь в результат", 8: "Перебираем детей по алфавиту a..z", 10: "Рекурсивно спускаемся в потомка", 15: "Возвращаем собранные слова" },
      rules: [{ head: "Узел — конец слова", body: "→ в результат", cls: "eq" }, { head: "Есть дети", body: "→ DFS вглубь", cls: "lt" }],
      parse: function (root) { var words = (root.getAttribute("data-words") || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); var prefix = (root.getAttribute("data-prefix") || "").trim(); var r = bTrieWords(words, prefix); return { words: words, prefix: prefix, nodes: r.nodes, path: r.path, steps: r.steps }; },
      inputs: [{ attr: "data-words", label: "В боре (через запятую)" }, { attr: "data-prefix", label: "префикс" }],
      values: function () { return []; },
      title: function (ctx) { return "Trie: слова с префиксом «" + ctx.prefix + "»"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Собрано слов"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: (s.out ? s.out.length : 0) + "", cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Найдено слов: " + (s.out ? s.out.length : 0), text: s.info }; if (s.collected) return { kind: "info", icon: idx + 1, head: "Собрано слово", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: (s.out ? s.out.length : 0) + " слов", c: "✓", cls: "eq" }; if (s.collected) return { a: "слово «" + s.vars.word + "»", b: "собрано", c: "+", cls: "eq" }; return { a: "узел «" + s.vars.node + "»", b: "обход", c: "↓", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "word": s.vars.word, "found": s.vars.found }; },
      mapViz: function (panel) { var p = structPanel(panel, "out — собранные слова (DFS, порядок a→z)"); return function (s) { p.grid.innerHTML = ""; var o = s.out || []; if (!o.length) p.grid.appendChild(structCell("", "∅", "algo-tp__mapcell--off")); else o.forEach(function (w, k) { p.grid.appendChild(structCell("#" + (k + 1), w, "algo-tp__mapcell--on" + (s.collected && k === o.length - 1 ? " algo-tp__mapcell--hot" : ""))); }); p.foot.textContent = "слов: " + o.length; }; },
      customViz: trieWordsViz
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

    "fenwick-add": {
      badge: "Fenwick Tree", desc: "Точечное добавление в дерево Фенвика (BIT): обновляем узлы, поднимаясь i += i & (−i).",
      valuesLabel: "Массив", codeKey: "fenwick-add", fillRange: true,
      ptr1: { name: "lo", cap: "(начало зоны)" }, ptr2: { name: "hi", cap: "(конец зоны)" },
      complexity: { time: "O(log n)", space: "O(n)", good: "★ Точечное обновление" },
      varOrder: ["i", "range", "delta"],
      varDesc: { "i": "Номер узла BIT (1-индекс)", "range": "Зона ответственности узла", "delta": "Прибавляемая величина" },
      lineNotes: { 1: "Переходим в 1-индексацию: i++", 2: "Поднимаемся по BIT, пока i ≤ n", 3: "Прибавляем delta к зоне ответственности узла i", 4: "К следующему ответственному узлу: i += i & (−i)" },
      rules: [{ head: "Зона узла i", body: "[i − lowbit + 1 .. i]", cls: "lt" }, { head: "Прибавляем", body: "tree[i] += delta", cls: "eq" }, { head: "i += i&(−i)", body: "следующий узел", cls: "gt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var idx = parseInt(root.getAttribute("data-index"), 10); var delta = parseInt(root.getAttribute("data-delta"), 10); return { arr: arr, idx: idx, delta: delta, steps: bFenwickAdd(arr, idx, delta) }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-index", label: "индекс", sm: true }, { attr: "data-delta", label: "delta", sm: true }],
      values: function (ctx) { return ctx.arr; },
      title: function (ctx) { return "Fenwick: добавить " + ctx.delta + " в индекс " + ctx.idx; },
      param: function (ctx) { return { label: "Индекс", value: ctx.idx }; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Зона узла", "delta"],
      sumValues: function (s) { return [{ text: s.vars.range }, { text: s.vars.delta, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Добавили " + ctx.delta + " в индекс " + ctx.idx, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "O(log n) узлов", c: "✓", cls: "eq" }; return { a: "узел " + s.vars.i, b: "зона " + s.vars.range, c: "+= " + s.vars.delta, cls: "lt" }; },
      varsOf: function (s) { return { "i": s.vars.i, "range": s.vars.range, "delta": s.vars.delta }; }
    },

    "count-inversions-naive": {
      badge: "Грубый перебор",
      desc: "Наивно O(n²): перебираем все пары i<j и считаем, где левый элемент больше правого. Эталон для BIT-решения ниже.",
      valuesLabel: "Массив", codeKey: "count-inversions-naive", fillRange: false,
      ptr1: { name: "i", cap: "(левый)" }, ptr2: { name: "j", cap: "(правый)" },
      complexity: { time: "O(n²)", space: "O(1)", good: "⚠ База для сравнения — медленно" },
      varOrder: ["i", "j", "nums[i]", "nums[j]", "cnt"],
      varDesc: { i: "Левый индекс пары", j: "Правый индекс пары", "nums[i]": "Левый элемент", "nums[j]": "Правый элемент", cnt: "Найдено инверсий" },
      lineNotes: { 1: "cnt = 0 — пока инверсий не нашли", 2: "Внешний цикл: левый индекс пары i", 3: "Внутренний цикл: правый индекс j > i", 4: "Левый больше правого — это инверсия, cnt++", 7: "Возвращаем общее число инверсий" },
      rules: [{ head: "nums[i] > nums[j]", body: "→ инверсия, cnt++", cls: "eq" }, { head: "nums[i] ≤ nums[j]", body: "→ не инверсия", cls: "lt" }, { head: "Каждая пара i<j", body: "проверяется отдельно", cls: "gt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); return { arr: arr, steps: bCountInvNaive(arr) }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "Число инверсий — наивно O(n²)"; },
      pointers: function (s) { return { lo: s.lo, hi: s.hi }; },
      sumCells: ["Пара (i, j)", "Сравнение", "Инверсий cnt"],
      sumValues: function (s) {
        var i = s.vars.i, j = s.vars.j;
        if (typeof i !== "number" || typeof j !== "number") return [{ text: "—" }, { text: "—" }, { text: s.vars.cnt, cls: "warn" }];
        var inv = s.vars["nums[i]"] > s.vars["nums[j]"];
        return [{ text: "(" + i + ", " + j + ")" }, { text: s.vars["nums[i]"] + (inv ? " > " : " ≤ ") + s.vars["nums[j]"], cls: inv ? "eq" : "lt" }, { text: s.vars.cnt, cls: "warn" }];
      },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Инверсий: " + s.vars.cnt, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "i=" + s.vars.i + ", j=" + s.vars.j, b: s.vars["nums[i]"] + " ? " + s.vars["nums[j]"], c: "cnt=" + s.vars.cnt, cls: s.improved ? "eq" : "lt" }; },
      varsOf: function (s) { return { i: s.vars.i, j: s.vars.j, "nums[i]": s.vars["nums[i]"], "nums[j]": s.vars["nums[j]"], cnt: s.vars.cnt }; }
    },

    "count-inversions-bit": {
      badge: "Fenwick Tree",
      desc: "Оптимум O(n log n): идём справа налево, вклад nums[i] = prefix(rank−1) (меньших уже справа), затем add(rank). Снизу — BIT частот рангов.",
      valuesLabel: "Массив", codeKey: "count-inversions-bit", fillRange: false,
      ptr1: { name: "i", cap: "(текущий, справа налево)" }, ptr2: { name: "—", cap: "" },
      complexity: { time: "O(n log n)", space: "O(n)", good: "★ Инверсии / меньших справа" },
      varOrder: ["i", "rank", "contrib", "inv"],
      varDesc: { i: "Текущий индекс (идём справа налево)", rank: "Ранг nums[i] после сжатия координат", contrib: "Вклад = prefix(rank−1)", inv: "Накопленное число инверсий" },
      lineNotes: { 5: "inv = 0 — старт; BIT частот пуст", 6: "Идём справа налево: элементы правее i уже учтены в BIT", 7: "ri — ранг текущего значения после сжатия координат", 8: "prefix(ri−1): сколько уже встреченных (справа) рангов строго меньше — спуск idx −= idx&(−idx)", 9: "add(ri): регистрируем текущий ранг — подъём idx += idx&(−idx)", 11: "Возвращаем общее число инверсий" },
      rules: [{ head: "prefix(rank−1)", body: "меньших уже справа → вклад", cls: "eq" }, { head: "add(rank)", body: "регистрируем элемент", cls: "gt" }, { head: "Справа налево", body: "правое уже в BIT", cls: "lt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var r = bCountInvBit(arr); return { arr: arr, m: r.m, steps: r.steps }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function (ctx) { return ctx.arr; },
      title: function () { return "Число инверсий через BIT — O(n log n)"; },
      cellState: function (s, j) { var i = s.lo; if (i < 0) return { found: true }; return { lo: j === i, found: j > i, dim: j < i }; },
      pointers: function (s) { return { lo: s.lo, hi: -1 }; },
      sumCells: ["Ранг nums[i]", "Вклад = prefix(rank−1)", "Инверсий inv"],
      sumValues: function (s) {
        var c = s.vars.contrib;
        return [{ text: s.vars.rank }, { text: (typeof c === "number" ? c : "—"), cls: (typeof c === "number" && c > 0) ? "eq" : "" }, { text: s.vars.inv, cls: "warn" }];
      },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Инверсий: " + s.vars.inv, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "i=" + s.vars.i + ", rank=" + s.vars.rank, b: "вклад=" + s.vars.contrib, c: "inv=" + s.vars.inv, cls: s.improved ? "eq" : "lt" }; },
      varsOf: function (s) { return { i: s.vars.i, rank: s.vars.rank, contrib: s.vars.contrib, inv: s.vars.inv }; },
      mapViz: function (parent, ctx) {
        var m = ctx.m;
        var wrap = mkEl("div", "algo-tp__map");
        wrap.appendChild(mkEl("div", "algo-tp__maphdr", "tree[1.." + m + "] — BIT частот рангов (узел i отвечает за i&(−i) рангов)"));
        var grid = mkEl("div", "algo-tp__mapgrid");
        var cells = [];
        for (var r = 1; r <= m; r++) {
          var col = mkEl("div", "algo-tp__mapcell");
          col.appendChild(mkEl("div", "algo-tp__mapkey", r));
          var cnt = mkEl("div", "algo-tp__mapcnt", "0");
          col.appendChild(cnt);
          grid.appendChild(col);
          cells.push({ col: col, cnt: cnt });
        }
        wrap.appendChild(grid);
        var info = mkEl("div", "algo-tp__mapsize", "");
        wrap.appendChild(info);
        parent.appendChild(wrap);
        return function (s) {
          var tree = s.tree || [];
          cells.forEach(function (c, k) {
            var val = tree[k] || 0;
            c.cnt.textContent = val;
            var touched = s.touched === (k + 1);
            c.col.className = "algo-tp__mapcell" + (val > 0 ? " algo-tp__mapcell--on" : " algo-tp__mapcell--off") + (touched ? " algo-tp__mapcell--hot algo-tp__mapcell--" + (s.action === "add" ? "add" : "dec") : "");
          });
          info.innerHTML = "";
          info.appendChild(mkEl("span", "algo-tp__mapsizek", "inv = " + s.vars.inv));
          if (typeof s.vars.contrib === "number") info.appendChild(mkEl("span", "algo-tp__mapsizecmp algo-tp__mapsizecmp--ok", "  вклад текущего = " + s.vars.contrib));
        };
      }
    },

    "union-find-find": {
      badge: "Union-Find", desc: "Find со сжатием пути: поднимаемся к корню, затем подвешиваем все узлы пути прямо к нему.",
      valuesLabel: "", codeKey: "union-find-find", fillRange: false,
      complexity: { time: "O(α(n)) ≈ O(1)", space: "O(1)", good: "★ Проверка «в одной группе»" },
      varOrder: ["node", "root"],
      varDesc: { "node": "Текущий узел на пути", "root": "Найденный корень" },
      lineNotes: { 1: "root стартует с x", 2: "Дошли до корня (parent[root] == root)", 3: "Поднимаемся к родителю", 6: "Сжатие пути: каждый узел пути подвешиваем прямо к корню", 8: "Возвращаем корень — дерево теперь плоское" },
      rules: [{ head: "parent[x] ≠ x", body: "→ поднимаемся", cls: "lt" }, { head: "parent[x] == x", body: "→ это корень", cls: "eq" }, { head: "Сжатие", body: "parent[узла] = root", cls: "gt" }],
      parse: function (root) { var parentInit = nums(root.getAttribute("data-parent")); var x = parseInt(root.getAttribute("data-find"), 10); var r = bUFFind(parentInit, x); return { parentInit: parentInit, x: x, steps: r.steps }; },
      inputs: [{ attr: "data-parent", label: "parent[] (через запятую)" }, { attr: "data-find", label: "Find(x)", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "Union-Find: Find(" + ctx.x + ") со сжатием пути"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Корень"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.root, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Find(" + ctx.x + ") = " + s.vars.root, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "корень", b: s.vars.root, c: "✓", cls: "eq" }; return { a: "узел " + s.vars.node, b: "к корню", c: "↑", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "root": s.vars.root }; },
      customViz: ufViz
    },

    "union-find-union": {
      badge: "Union-Find", desc: "Union по размеру: находим корни двух элементов и подвешиваем меньшее дерево под большее.",
      valuesLabel: "", codeKey: "union-find-union", fillRange: false,
      complexity: { time: "O(α(n)) ≈ O(1)", space: "O(n)", good: "★ Объединение групп" },
      varOrder: ["a", "b", "action"],
      varDesc: { "a": "Корень первого", "b": "Корень второго", "action": "Что делаем на шаге" },
      lineNotes: { 0: "Изначально каждый элемент — своё множество", 1: "Находим корни обоих элементов", 3: "Корни совпали — уже в одном множестве", 6: "Меньшее дерево пойдёт под большее (балансировка)", 8: "Подвешиваем корень меньшего под корень большего" },
      rules: [{ head: "Разные корни", body: "→ объединяем", cls: "gt" }, { head: "Один корень", body: "→ уже вместе", cls: "eq" }, { head: "По размеру", body: "меньшее под большее", cls: "lt" }],
      parse: function (root) { var n = parseInt(root.getAttribute("data-n"), 10); var unions = (root.getAttribute("data-unions") || "").split(",").map(function (s) { return s.trim().split("-").map(Number); }).filter(function (p) { return p.length === 2; }); var r = bUFUnion(n, unions); return { n: n, unions: unions, steps: r.steps }; },
      inputs: [{ attr: "data-n", label: "Элементов", sm: true }, { attr: "data-unions", label: "Union'ы (a-b,...)" }],
      values: function () { return []; },
      title: function () { return "Union-Find: объединение по размеру"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Корни", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.a + " / " + s.vars.b }, { text: s.vars.action, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Объединения завершены", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "корни " + s.vars.a + "," + s.vars.b, b: s.vars.action, c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "a": s.vars.a, "b": s.vars.b, "action": s.vars.action }; },
      customViz: ufViz
    },

    "hash-put": {
      badge: "Hash Map", desc: "Вставка в хеш-таблицу (цепочки): hash(key) даёт бакет, запись уходит в его цепочку.",
      valuesLabel: "", codeKey: "hash-put", fillRange: false,
      complexity: { time: "O(1) сред.", space: "O(n)", good: "★ Доступ по ключу" },
      varOrder: ["i", "key"],
      varDesc: { "i": "Индекс бакета", "key": "Вставляемый ключ" },
      lineNotes: { 1: "hash(key) % m — в какой бакет кладём", 2: "Сканируем цепочку: нет ли уже такого ключа", 3: "Ключ найден — обновляем значение на месте", 8: "Новый ключ — добавляем в конец цепочки (коллизия = непустая цепочка)" },
      rules: [{ head: "hash(key) % m", body: "→ номер бакета", cls: "lt" }, { head: "Ключ уже есть", body: "→ обновить", cls: "eq" }, { head: "Нет — в цепочку", body: "коллизия = длиннее 1", cls: "gt" }],
      parse: function (root) { var keys = nums(root.getAttribute("data-keys")); var m = parseInt(root.getAttribute("data-buckets"), 10); var key = parseInt(root.getAttribute("data-key"), 10); var r = bHashPut(keys, m, key); return { keys: keys, m: m, key: key, steps: r.steps }; },
      inputs: [{ attr: "data-keys", label: "Ключи в таблице" }, { attr: "data-buckets", label: "бакетов", sm: true }, { attr: "data-key", label: "вставить", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "Хеш-таблица: вставка ключа " + ctx.key; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Бакет", "Ключ"],
      sumValues: function (s) { return [{ text: s.vars.i }, { text: s.vars.key, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Ключ " + ctx.key + " в бакете " + s.vars.i, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.created) return { a: "ключ " + s.vars.key, b: "в бакет " + s.vars.i, c: "+", cls: "gt" }; return { a: "бакет " + s.vars.i, b: "скан цепочки", c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "i": s.vars.i, "key": s.vars.key }; },
      customViz: hashViz
    },

    "hash-get": {
      badge: "Hash Map", desc: "Поиск в хеш-таблице (цепочки): hash(key) даёт бакет, сканируем его цепочку.",
      valuesLabel: "", codeKey: "hash-get", fillRange: false,
      complexity: { time: "O(1) сред.", space: "O(1)", good: "★ Доступ по ключу" },
      varOrder: ["i", "key"],
      varDesc: { "i": "Индекс бакета", "key": "Искомый ключ" },
      lineNotes: { 1: "hash(key) % m — тот же бакет, что при вставке", 2: "Сканируем цепочку бакета", 3: "Ключ совпал — возвращаем значение", 7: "Прошли всю цепочку — ключа нет" },
      rules: [{ head: "hash(key) % m", body: "→ номер бакета", cls: "lt" }, { head: "Ключ в цепочке", body: "→ нашли", cls: "eq" }, { head: "Конец цепочки", body: "→ нет ключа", cls: "gt" }],
      parse: function (root) { var keys = nums(root.getAttribute("data-keys")); var m = parseInt(root.getAttribute("data-buckets"), 10); var key = parseInt(root.getAttribute("data-key"), 10); var r = bHashGet(keys, m, key); return { keys: keys, m: m, key: key, steps: r.steps }; },
      inputs: [{ attr: "data-keys", label: "Ключи в таблице" }, { attr: "data-buckets", label: "бакетов", sm: true }, { attr: "data-key", label: "искать", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "Хеш-таблица: поиск ключа " + ctx.key; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Бакет", "Ключ"],
      sumValues: function (s) { return [{ text: s.vars.i }, { text: s.vars.key, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.found) return { kind: "ok", icon: "✓", head: "Ключ " + ctx.key + " найден", text: s.info }; if (s.done) return { kind: "end", icon: idx + 1, head: "Ключ " + ctx.key + " не найден", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "найдено", b: "ключ " + s.vars.key, c: "✓", cls: "eq" }; if (s.done) return { a: "не найдено", b: "", c: "✗", cls: "gt" }; return { a: "бакет " + s.vars.i, b: "скан", c: "↓", cls: "lt" }; },
      varsOf: function (s) { return { "i": s.vars.i, "key": s.vars.key }; },
      customViz: hashViz
    },

    "deque-ops": {
      badge: "Deque", desc: "Двусторонняя очередь: вставка и удаление с обоих концов за O(1).",
      valuesLabel: "", codeKey: "deque-ops", fillRange: false,
      complexity: { time: "O(1)", space: "O(n)", good: "★ Очередь/стек с двух концов" },
      varOrder: ["op", "val"],
      varDesc: { "op": "Операция", "val": "Значение" },
      lineNotes: { 0: "Операции над двусторонней очередью", 1: "PushBack — добавить в конец", 2: "PushFront — добавить в начало", 3: "PopBack — снять с конца", 4: "PopFront — снять с начала" },
      rules: [{ head: "Push", body: "→ в начало или конец", cls: "gt" }, { head: "Pop", body: "→ с начала или конца", cls: "lt" }, { head: "Оба конца", body: "за O(1)", cls: "eq" }],
      parse: function (root) { var ops = (root.getAttribute("data-ops") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean); var r = bDeque(ops); return { ops: ops, steps: r.steps }; },
      inputs: [{ attr: "data-ops", label: "Операции (b/f/B/F)" }],
      values: function () { return []; },
      title: function () { return "Дек: операции с обоих концов"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Операция", "Значение"],
      sumValues: function (s) { return [{ text: s.vars.op }, { text: s.vars.val, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Операции применены", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "готово", b: "", c: "✓", cls: "eq" }; return { a: s.vars.op, b: s.vars.val, c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "op": s.vars.op, "val": s.vars.val }; },
      customViz: dequeViz
    },

    "sparse-build": {
      badge: "Sparse Table", desc: "Построение разреженной таблицы: table[k][i] = минимум на отрезке длины 2^k, снизу вверх.",
      valuesLabel: "", codeKey: "sparse-build", fillRange: false,
      complexity: { time: "O(n log n)", space: "O(n log n)", good: "★ Препроцессинг для O(1) запросов" },
      varOrder: ["k", "range"],
      varDesc: { "k": "Уровень (длина отрезка 2^k)", "range": "Покрываемый отрезок" },
      lineNotes: { 1: "Строка k=0 — сам массив (минимумы одиночных элементов)", 2: "Удваиваем длину отрезка: 2^k", 3: "Идём по всем стартам i", 4: "Минимум двух половин длины 2^(k-1)", 7: "Таблица готова" },
      rules: [{ head: "k=0", body: "→ сам массив", cls: "lt" }, { head: "table[k][i]", body: "= min двух половин", cls: "eq" }, { head: "Удвоение", body: "длина 2^k", cls: "gt" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var r = bSparseBuild(arr); return { arr: arr, steps: r.steps }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function () { return []; },
      title: function () { return "Sparse table: построение"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Уровень k", "Отрезок"],
      sumValues: function (s) { return [{ text: s.vars.k }, { text: s.vars.range, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Таблица построена", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "k=" + s.vars.k, b: s.vars.range, c: "min", cls: "eq" }; },
      varsOf: function (s) { return { "k": s.vars.k, "range": s.vars.range }; },
      customViz: sparseViz
    },

    "sparse-query": {
      badge: "Sparse Table", desc: "Запрос min на [l, r] за O(1): два перекрывающихся отрезка длины 2^k покрывают диапазон.",
      valuesLabel: "", codeKey: "sparse-query", fillRange: false,
      complexity: { time: "O(1)", space: "O(n log n)", good: "★ Статический range-min/max" },
      varOrder: ["k", "ans"],
      varDesc: { "k": "Степень: 2^k ≤ длины", "ans": "Минимум на [l, r]" },
      lineNotes: { 1: "k — наибольшая степень двойки, влезающая в длину диапазона", 2: "Два отрезка длины 2^k (от l и от r назад) перекрываются и покрывают [l, r]", 3: "Берём минимум этих двух готовых значений" },
      rules: [{ head: "k = ⌊log2(len)⌋", body: "→ длина 2^k", cls: "lt" }, { head: "Два отрезка", body: "от l и от r назад", cls: "gt" }, { head: "min из двух", body: "= ответ за O(1)", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var l = parseInt(root.getAttribute("data-l"), 10); var r = parseInt(root.getAttribute("data-r"), 10); var res = bSparseQuery(arr, l, r); return { arr: arr, l: l, r: r, steps: res.steps }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-l", label: "l", sm: true }, { attr: "data-r", label: "r", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "Sparse table: min на [" + ctx.l + ", " + ctx.r + "]"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Степень k", "Ответ (min)"],
      sumValues: function (s) { return [{ text: s.vars.k }, { text: s.vars.ans, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "min на [" + ctx.l + ", " + ctx.r + "] = " + s.vars.ans, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.done) return { a: "ответ", b: "min = " + s.vars.ans, c: "O(1)", cls: "eq" }; return { a: "k = " + s.vars.k, b: "длина 2^k", c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "k": s.vars.k, "ans": s.vars.ans }; },
      customViz: sparseViz
    },

    "avl-insert": {
      badge: "AVL Tree", desc: "Вставка в АВЛ-дерево: как в BST, затем балансировка поворотом (LL/RR/LR/RL).",
      valuesLabel: "", codeKey: "avl-insert", fillRange: false,
      complexity: { time: "O(log n)", space: "O(log n)", good: "★ Сбалансированное BST" },
      varOrder: ["node", "action"],
      varDesc: { "node": "Текущий узел", "action": "Что делаем на шаге" },
      lineNotes: { 1: "Дошли до пустого места — создаём лист", 2: "Спускаемся как в обычном BST", 3: "Пересчитываем высоту узла", 4: "Баланс = высота левого − правого", 5: "LL: левый перевес, вставка слева-слева → правый поворот", 6: "LR: левый перевес, вставка слева-справа → левый, затем правый поворот", 7: "RR: правый перевес, вставка справа-справа → левый поворот", 8: "RL: правый перевес, вставка справа-слева → правый, затем левый поворот", 10: "Дерево сбалансировано" },
      rules: [{ head: "|баланс| ≤ 1", body: "→ ничего не делаем", cls: "lt" }, { head: "|баланс| > 1", body: "→ поворот", cls: "gt" }, { head: "LL/RR/LR/RL", body: "4 случая балансировки", cls: "eq" }],
      parse: function (root) { var initial = nums(root.getAttribute("data-tree")); var val = parseInt(root.getAttribute("data-insert"), 10); var r = bAVLInsert(initial, val); return { initial: initial, val: val, steps: r.steps }; },
      inputs: [{ attr: "data-tree", label: "Вставить (порядок)" }, { attr: "data-insert", label: "новое значение", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "AVL: вставка " + ctx.val; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Узел", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.action, cls: (s.vars.action && s.vars.action.indexOf("поворот") === 0) ? "gt" : "lt" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: ctx.val + " вставлен", text: s.info }; if (s.vars.action && s.vars.action.indexOf("поворот") === 0) return { kind: "info", icon: idx + 1, head: s.vars.action, text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.created) return { a: "узел " + s.vars.node, b: "лист", c: "+", cls: "gt" }; return { a: "узел " + s.vars.node, b: s.vars.action, c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "action": s.vars.action }; },
      customViz: bstViz
    },

    "btree-insert": {
      badge: "B-Tree", desc: "Вставка в B-дерево: спускаемся, деля полные узлы заранее; средний ключ поднимается в родителя.",
      valuesLabel: "", codeKey: "btree-insert", fillRange: false,
      complexity: { time: "O(log n)", space: "O(n)", good: "★ Многопутевое дерево (БД, ФС)" },
      varOrder: ["node", "action"],
      varDesc: { "node": "Узел / поднятый ключ", "action": "Что делаем на шаге" },
      lineNotes: { 1: "Корень полон — растим высоту новым корнем", 3: "splitChild: средний ключ поднимается, узел делится надвое", 5: "Спуск с гарантией: на пути нет полных узлов", 8: "В лист ключ вставляется по порядку", 9: "Выбираем ребёнка между ключами", 11: "Полного ребёнка делим ДО спуска (top-down)" },
      rules: [{ head: "Узел полон (3 ключа)", body: "→ split, средний вверх", cls: "gt" }, { head: "Лист", body: "→ вставка по порядку", cls: "lt" }, { head: "Все листья", body: "на одной глубине", cls: "eq" }],
      parse: function (root) { var keys = nums(root.getAttribute("data-keys")); var key = parseInt(root.getAttribute("data-insert"), 10); var r = bBTreeInsert(keys, key); return { keys: keys, key: key, steps: r.steps }; },
      inputs: [{ attr: "data-keys", label: "Ключи (порядок)" }, { attr: "data-insert", label: "вставить", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "B-дерево: вставка " + ctx.key; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Узел", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.action, cls: (s.vars.action && s.vars.action.indexOf("split") === 0) ? "gt" : "lt" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: ctx.key + " вставлен", text: s.info }; if (s.vars.action && s.vars.action.indexOf("split") === 0) return { kind: "info", icon: idx + 1, head: "Разделение узла", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "узел " + s.vars.node, b: s.vars.action, c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "action": s.vars.action }; },
      customViz: btreeViz
    },

    "btree-search": {
      badge: "B-Tree", desc: "Поиск в B-дереве: в каждом узле ищем позицию ключа и спускаемся к нужному ребёнку.",
      valuesLabel: "", codeKey: "btree-search", fillRange: false,
      complexity: { time: "O(log n)", space: "O(1)", good: "★ Поиск по ключу" },
      varOrder: ["node", "key"],
      varDesc: { "node": "Текущий узел", "key": "Искомый ключ" },
      lineNotes: { 1: "Начинаем с корня", 4: "Линейно/бинарно ищем позицию ключа в узле", 5: "Ключ совпал — нашли", 6: "Лист и не совпало — ключа нет", 7: "Спускаемся к ребёнку между ключами" },
      rules: [{ head: "k == keys[i]", body: "→ нашли", cls: "eq" }, { head: "Лист", body: "→ нет ключа", cls: "gt" }, { head: "Иначе", body: "→ ребёнок между ключами", cls: "lt" }],
      parse: function (root) { var keys = nums(root.getAttribute("data-keys")); var key = parseInt(root.getAttribute("data-search"), 10); var r = bBTreeSearch(keys, key); return { keys: keys, key: key, steps: r.steps }; },
      inputs: [{ attr: "data-keys", label: "Ключи (порядок)" }, { attr: "data-search", label: "искать", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "B-дерево: поиск " + ctx.key; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Узел", "Ключ"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.key, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.found) return { kind: "ok", icon: "✓", head: ctx.key + " найден", text: s.info }; if (s.done) return { kind: "end", icon: idx + 1, head: ctx.key + " не найден", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { if (s.found) return { a: "найдено", b: s.vars.key, c: "✓", cls: "eq" }; if (s.done) return { a: "не найдено", b: "", c: "✗", cls: "gt" }; return { a: "узел " + s.vars.node, b: "поиск", c: "↓", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "key": s.vars.key }; },
      customViz: btreeViz
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

    "segtree-build": {
      badge: "Segment Tree", desc: "Построение дерева отрезков снизу вверх: лист = элемент, узел = сумма детей.",
      valuesLabel: "", codeKey: "segtree-build", fillRange: false,
      complexity: { time: "O(n)", space: "O(n)", good: "★ Построение за O(n)" },
      varOrder: ["node", "action"],
      varDesc: { "node": "Текущий отрезок узла", "action": "Что делаем на шаге" },
      lineNotes: { 1: "Лист — это один элемент массива", 3: "Строим левое поддерево", 4: "Строим правое поддерево", 5: "Узел = сумма левого и правого детей" },
      rules: [{ head: "lo == hi", body: "→ лист = arr[lo]", cls: "lt" }, { head: "Иначе", body: "→ строим детей", cls: "gt" }, { head: "Узел", body: "= сумма детей", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var r = bSegBuild(arr); return { arr: arr, steps: r.steps }; },
      inputs: [{ attr: "data-array", label: "Массив" }],
      values: function () { return []; },
      title: function () { return "Дерево отрезков: построение"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.action, cls: "eq" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Дерево построено", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "узел " + s.vars.node, b: s.vars.action, c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "action": s.vars.action }; },
      customViz: segTreeViz
    },

    "segtree-update": {
      badge: "Segment Tree", desc: "Точечное обновление: меняем лист и пересчитываем суммы по пути к корню.",
      valuesLabel: "", codeKey: "segtree-update", fillRange: false,
      complexity: { time: "O(log n)", space: "O(1)", good: "★ Обновление элемента" },
      varOrder: ["node", "action"],
      varDesc: { "node": "Текущий отрезок узла", "action": "Что делаем на шаге" },
      lineNotes: { 1: "Дошли до листа — пишем новое значение", 3: "Индекс в левой половине?", 4: "Спускаемся в левого ребёнка", 6: "Спускаемся в правого ребёнка", 8: "На обратном пути пересчитываем узел = сумма детей" },
      rules: [{ head: "lo == hi", body: "→ лист = val", cls: "lt" }, { head: "i ≤ mid / i > mid", body: "→ влево / вправо", cls: "gt" }, { head: "Обратный путь", body: "→ пересчёт суммы", cls: "eq" }],
      parse: function (root) { var arr = nums(root.getAttribute("data-array")); var idx = parseInt(root.getAttribute("data-index"), 10); var val = parseInt(root.getAttribute("data-val"), 10); var r = bSegUpdate(arr, idx, val); return { arr: arr, idx: idx, val: val, steps: r.steps }; },
      inputs: [{ attr: "data-array", label: "Массив" }, { attr: "data-index", label: "индекс", sm: true }, { attr: "data-val", label: "значение", sm: true }],
      values: function () { return []; },
      title: function (ctx) { return "Дерево отрезков: обновление [" + ctx.idx + "] = " + ctx.val; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Текущий узел", "Действие"],
      sumValues: function (s) { return [{ text: s.vars.node }, { text: s.vars.action, cls: "eq" }]; },
      status: function (s, idx, total, ctx) { if (s.done) return { kind: "ok", icon: "✓", head: "Индекс " + ctx.idx + " обновлён", text: s.info }; return { kind: "info", icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "узел " + s.vars.node, b: s.vars.action, c: "·", cls: "lt" }; },
      varsOf: function (s) { return { "node": s.vars.node, "action": s.vars.action }; },
      customViz: segTreeViz
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
      // «Горячий» шаг — значимое событие посреди прогона (новый максимум/ответ,
      // создан/удалён узел): обычно это kind "info" и легко проскочить глазом,
      // поэтому подсвечиваем карточку акцентом. Сигнал берём из флагов шага —
      // едино для всех виджетов, без правки конфигов. st.hot — явное переопределение.
      var hot = (st.hot != null) ? st.hot : !!(s && (s.improved || s.created || s.removed));
      cStat.classList.toggle("algo-tp__status--hot", !!hot);
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
