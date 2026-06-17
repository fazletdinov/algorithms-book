# 🏋️ Go-тренажёр по алгоритмическим шаблонам

Это рабочий Go-модуль для практики. На каждый шаблон есть **заготовки функций**
с тестами — вы пишете реализацию, запускаете тесты и сразу видите, корректно ли
решение. Это отличает тренажёр от книги: здесь вы пишете код сами.

## Как пользоваться

1. Откройте пакет нужного шаблона, например `slidingwindow/slidingwindow.go`.
2. Замените `panic("TODO: ...")` своей реализацией.
3. Запустите тесты:

   ```bash
   go test ./slidingwindow/
   ```

   Пока функции не реализованы — тесты красные. Реализуйте → станут зелёными.
4. Запустите все сразу:

   ```bash
   go test ./...
   ```

## Подсмотреть эталонное решение

У каждого шаблона есть проверенное эталонное решение под build-тегом `solution`:

```bash
go test -tags solution ./slidingwindow/   # прогнать тесты на эталоне
```

Файл с эталоном называется `<пакет>_solution.go`. Подглядывайте только после
самостоятельной попытки.

## Проверить асимптотику бенчмарками

Тесты проверяют корректность, но не сложность: наивное O(n²)-решение пройдёт
их молча. Чтобы увидеть реальную асимптотику своего кода, есть бенчмарки на
двух размерах входа (пакеты `slidingwindow`, `dp`, `topk`, `segtree`):

```bash
go test -bench=. ./dp/                       # бенч ВАШЕГО решения (после реализации)
go test -tags solution -bench=LIS ./dp/      # бенч эталона для сравнения
go test -bench=MaxSlidingWindow -benchmem ./slidingwindow/
```

Смотрите, как растёт время при росте `n` в 10 раз: O(n) → ~×10, O(n log n) → ~×12,
O(n²) → ~×100, O(log n) → почти не меняется. Если ваш `LongestIncreasingSubsequence`
даёт ~×100 — он написан на O(n²), а не на заявленный O(n log n).

## Зачем build-теги?

Заготовка (`//go:build !solution`) и эталон (`//go:build solution`) объявляют
функции с одинаковыми именами, но компилируются взаимоисключающе — поэтому
конфликта нет, а тесты одни и те же служат спецификацией для обоих вариантов.

## Доступные шаблоны

Шапка каждой заготовки (`<пакет>/<пакет>.go`) ссылается на главу книги с теорией
этого паттерна (`../../src/*.md`), а в самой главе — ссылки на задачи LeetCode для
практики. Так три слоя связаны: тренажёр → теория → задачи.

| Пакет           | Функции                                      |
|-----------------|----------------------------------------------|
| `slidingwindow` | `MaxSumSubarray`, `LongestSubstringKDistinct`, `SmallestSubarrayWithSum`, `LongestSubstringNoRepeat`, `MaxSlidingWindow` |
| `twopointers`   | `PairWithTargetSum`, `RemoveDuplicates`, `SortedSquares`, `TripletsSumToZero`, `DutchFlagSort` |
| `fastslow`      | `HasCycle`, `DetectCycle`, `MiddleNode`, `IsHappyNumber`, `CycleLength` |
| `intervals`     | `MergeIntervals`, `InsertInterval`, `IntervalsIntersection`, `CanAttendAllMeetings`, `MinMeetingRooms` |
| `cyclicsort`    | `CyclicSort`, `FindMissingNumber`, `FindAllMissingNumbers`, `FindDuplicate`, `FindAllDuplicates` |
| `binarysearch`  | `Search`, `FindCeiling`, `FindFloor`, `SearchRotated`, `FindFirstLast`, `IntSqrt` |
| `bits`          | `SingleNumber`, `IsPowerOfTwo`, `HammingWeight`, `MissingNumber`, `CountBits`, `TwoSingleNumbers` |
| `linkedlist`    | `ReverseList`, `ReverseSublist`, `ReverseKGroup`, `IsPalindrome` |
| `treebfs`       | `LevelOrder`, `ZigzagLevelOrder`, `RightSideView`, `LevelAverages`, `MinDepth` |
| `treedfs`       | `PreorderTraversal`, `InorderTraversal`, `PostorderTraversal`, `MaxDepth`, `HasPathSum`, `DiameterOfTree` |
| `twoheaps`      | `MedianFinder` (`AddNum`/`FindMedian`), `SlidingWindowMedian`, `MaximizeCapital` |
| `topk`          | `FindKLargest`, `TopKFrequent`, `KthLargest`, `KClosestPoints`, `KClosestNumbers` |
| `kwaymerge`     | `MergeKSortedArrays`, `KthSmallestInSortedArrays`, `SmallestRange`, `KthSmallestInMatrix` |
| `subsets`       | `Subsets`, `SubsetsWithDup`, `Combinations`, `LetterCasePermutation` |
| `backtracking`  | `Permutations`, `GenerateParentheses`, `CombinationSum`, `SolveNQueensCount`, `LetterCombinations` |
| `graphs`        | `CountComponents`, `HasCycleUndirected`, `BFSOrder`, `DFSOrder`, `ShortestPathUnweighted`, `IsBipartite` |
| `grids`         | `NumIslands`, `MaxAreaOfIsland`, `FloodFill`, `RottingOranges`, `ShortestPathInBinaryMatrix` |
| `dijkstra`      | `ShortestPath`, `ShortestPathsFrom`, `NetworkDelayTime` |
| `bellmanford`   | `ShortestPath` (отрицательные веса), `HasNegativeCycle`, `ShortestPathWithAtMostKEdges` |
| `astar`         | `ShortestPath` (сетка с эвристикой), `ManhattanDistance`, `PathExists` |
| `mst`           | `MSTWeight` (Краскал), `MSTWeightPrim` (Прим), `MSTWeightWithEdges` |
| `toposort`      | `TopologicalSort`, `CanFinish`, `FindOrderLexSmallest`, `AlienOrder` |
| `greedy`        | `MaxNonOverlapping`, `CanJump`, `MinJumps`, `MaxProfit`, `FractionalKnapsack` |
| `dp`            | `ClimbStairs`, `CoinChange`, `LongestCommonSubsequence`, `EditDistance`, `LongestIncreasingSubsequence`, `Knapsack01`, `HouseRobber`, `UniquePaths`, `WordBreak` |
| `strmatch`      | `KMPSearch`, `RabinKarp`, `CountOccurrences`, `LongestPrefixSuffix`, `ZSearch` |
| `trie`          | `Trie.Insert` / `Search` / `StartsWith` / `Delete` / `WordsWithPrefix` |
| `segtree`       | `SegmentTree` (`Update`/`Query`, сумма), `MinSegmentTree` (`Update`/`Query`, минимум) |
| `fenwick`       | `NewFenwick`, `Update`, `PrefixSum`, `RangeSum`, `CountInversions`, `CountSmallerToRight` |
| `hashtable`     | `NewHashMap`, `HashMap.Put` / `Get` / `Delete` / `Len` (цепочки + ресайз по load factor) |
| `deque`         | `NewDeque`, `Deque.PushFront` / `PushBack` / `PopFront` / `PopBack` / `Front` / `Back` / `Len` (кольцевой буфер) |
| `binheap`       | `NewHeap`, `Heap.Push` / `Pop` / `Peek` / `Len` (бинарная min-куча, siftUp/siftDown) |
| `dsu`           | `NewUnionFind`, `UnionFind.Find` / `Union` / `Connected` / `Count` (сжатие путей + по размеру) |
| `bst`           | `NewBST`, `BST.Search` / `Insert` / `Delete` / `InOrder` (двоичное дерево поиска) |
| `avl`           | `NewAVL`, `AVL.Insert` / `Search` / `Height` / `InOrder` (самобалансировка поворотами) |
| `sparsetable`   | `NewSparse`, `Sparse.Query` (идемпотентный RMQ-минимум за O(1)) |
| `btree`         | `NewBTree`, `BTree.Search` / `Insert` / `InOrder` (split узла, степень t) |
| `parallelbfs`   | `BFSLevelsSeq` / `BFSLevelsConc` (BFS по уровням: синхронно и конкурентно; гонка на `visited`, `-race`, бенч) |

## Как добавить свой шаблон

1. Создайте папку `mypattern/`.
2. Добавьте три файла по образцу любого пакета:
   - `mypattern.go` — заготовки, тег `//go:build !solution`;
   - `mypattern_solution.go` — эталон, тег `//go:build solution`;
   - `mypattern_test.go` — табличные тесты (без build-тега).
3. Проверьте: `go test ./mypattern/` (красные) и
   `go test -tags solution ./mypattern/` (зелёные).
