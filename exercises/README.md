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

## Решать прямо в книге (in-book runner)

Не хочется переключаться между книгой и редактором? Подними локальный helper-сервер —
и решай задачи прямо на страницах книги, как на LeetCode:

```bash
go run ./cmd/runner        # http://localhost:8080, Ctrl+C чтобы остановить
```

Рядом с `mdbook serve` открой главу: виджет «💻 Реши прямо здесь» даёт редактор с
заготовкой пакета. Пишешь реализацию, жмёшь «Прогнать тесты» — сервер прогоняет
**настоящий `go test`** и показывает, какие тесты прошли/упали. Готовое решение не
показывается: справился — зелёное, ошибся — видно, какой тест упал. У concurrency-
пакетов виджет помечен `🏁 -race` и ловит гонки данных.

Сервис локальный и однопользовательский (твой код на твоей машине), поэтому без
песочницы. Код реализации — `cmd/runner/`.

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
двух размерах входа (пакеты `slidingwindow`, `dp`, `topk`, `segtree`, а в
конкурентных `parallelbfs`, `parallelsort`, `parallelnqueens` — ещё и
сравнение последовательной и параллельной версий):

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

Помимо табличных тестов, у пакетов есть рандомизированные (`<пакет>_rand_test.go`):
тысячи случайных входов на фиксированном сиде сверяются с наивной моделью-эталоном —
они ловят ошибки на границах, которые маленькие ручные кейсы пропускают. Есть они и
у боевых мини-проектов (`ratelimiter`, `cache`, `leaderboard`, `streamstats`): там
модель — «наивная, но очевидно корректная» версия той же структуры (полный лог
запросов, пересортировка на каждый запрос и т.п.).

| Пакет           | Функции                                      |
|-----------------|----------------------------------------------|
| `slidingwindow` | `MaxSumSubarray`, `LongestSubstringKDistinct`, `SmallestSubarrayWithSum`, `LongestSubstringNoRepeat`, `MaxSlidingWindow` |
| `twopointers`   | `PairWithTargetSum`, `RemoveDuplicates`, `SortedSquares`, `TripletsSumToZero`, `DutchFlagSort` |
| `fastslow`      | `HasCycle`, `DetectCycle`, `MiddleNode`, `IsHappyNumber`, `CycleLength` |
| `intervals`     | `MergeIntervals`, `InsertInterval`, `IntervalsIntersection`, `CanAttendAllMeetings`, `MinMeetingRooms` |
| `cyclicsort`    | `CyclicSort`, `FindMissingNumber`, `FindAllMissingNumbers`, `FindDuplicate`, `FindAllDuplicates` |
| `sorting`       | `MergeSort`, `QuickSort`, `HeapSort`, `CountingSort`, `QuickSelect` |
| `numbertheory`  | `GCD`, `LCM`, `IsPrime`, `SieveOfEratosthenes`, `PowMod` |
| `cryptography`  | `ExtendedGCD`, `ModInverse`, `ModExp`, `IsProbablePrime`, `RSAPrivateExponent`, `RSAEncrypt`, `RSADecrypt` |
| `combinatorics` | `Binomial`, `Permutations`, `CountDivisibleByAny`, `Derangements` |
| `sampling`      | `Shuffle`, `ReservoirSample`, `ExpectedCollisions`, `BirthdayThreshold` |
| `recursion`     | `Factorial`, `Fib`, `Power`, `HanoiMoves`, `SumDigits` |
| `bigo`          | `MinStack`, `NextGreaterElement`, `DailyTemperatures`, `CountCopies` |
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
| `scc`           | `SCC` (Косарайю), `Bridges`, `ArticulationPoints` (low-link) |
| `maxflow`       | `MaxFlow` (Эдмондс—Карп), `MaxBipartiteMatching` (Кун) |
| `toposort`      | `TopologicalSort`, `CanFinish`, `FindOrderLexSmallest`, `AlienOrder` |
| `greedy`        | `MaxNonOverlapping`, `CanJump`, `MinJumps`, `MaxProfit`, `FractionalKnapsack` |
| `dp`            | `ClimbStairs`, `CoinChange`, `LongestCommonSubsequence`, `EditDistance`, `LongestIncreasingSubsequence`, `Knapsack01`, `HouseRobber`, `UniquePaths`, `WordBreak` |
| `npcomplete`    | `VerifySubsetSum` (сертификат за полином — почему задача в NP), `SubsetSumExact` (перебор — стена), `FirstFitDecreasing` (приближение для Bin Packing), `VertexCoverGreedy2Approx` (2-приближение для Vertex Cover) |
| `strmatch`      | `KMPSearch`, `RabinKarp`, `CountOccurrences`, `LongestPrefixSuffix`, `ZSearch` |
| `trie`          | `Trie.Insert` / `Search` / `StartsWith` / `Delete` / `WordsWithPrefix` |
| `segtree`       | `SegmentTree` (`Update`/`Query`, сумма), `MinSegmentTree` (`Update`/`Query`, минимум), `LazySegmentTree` (`NewLazySegmentTree`/`RangeUpdate`/`RangeQuery`, отложенное распространение) |
| `fenwick`       | `NewFenwick`, `Update`, `PrefixSum`, `RangeSum`, `CountInversions`, `CountSmallerToRight` |
| `hashtable`     | `NewHashMap`, `HashMap.Put` / `Get` / `Delete` / `Len` (цепочки + ресайз по load factor) |
| `deque`         | `NewDeque`, `Deque.PushFront` / `PushBack` / `PopFront` / `PopBack` / `Front` / `Back` / `Len` (кольцевой буфер) |
| `binheap`       | `NewHeap`, `BuildHeap` (heapify O(n)), `Heap.Push` / `Pop` / `Peek` / `Len` (бинарная min-куча, siftUp/siftDown) |
| `dsu`           | `NewUnionFind`, `UnionFind.Find` / `Union` / `Connected` / `Count` (сжатие путей + по размеру) |
| `bst`           | `NewBST`, `BST.Search` / `Insert` / `Delete` / `InOrder` (двоичное дерево поиска) |
| `avl`           | `NewAVL`, `AVL.Insert` / `Delete` / `Search` / `Height` / `InOrder` (самобалансировка поворотами вверх по пути) |
| `sparsetable`   | `NewSparse`, `Sparse.Query` (идемпотентный RMQ-минимум за O(1)) |
| `btree`         | `NewBTree`, `BTree.Search` / `Insert` / `Delete` / `InOrder` (split, заимствование/слияние, степень t) |
| `rbtree`        | `NewRBTree`, `RBTree.Insert` / `Search` / `Delete` / `InOrder` (красно-чёрное: перекраска/повороты, «двойной чёрный») |
| `probabilistic` | `NewBloom`, `Bloom.Add` / `MightContain` (Bloom-фильтр: 0 ложноотрицательных, приём двух хешей) |
| `parallelbfs`   | `BFSLevelsSeq` / `BFSLevelsConc` (мьютекс) / `BFSLevelsConcLocal` (atomic+локальные фронты); гонка на `visited`, `-race`, бенч |
| `parallelsort`  | `MergeSortSeq` / `MergeSortConc` (сортировка слиянием: fan-out + cutoff; здесь конкурентность ускоряет) |
| `wordcount`     | `FreqSeq` / `FreqConc` (подсчёт частот: worker pool + fan-in; урок «concurrent map writes») |
| `parallelnqueens` | `CountNQueensSeq` / `CountNQueensConc` (N ферзей: fan-out по веткам, своя доска у горутины) |
| `parallelsearch` | `CountOccurrencesSeq` / `CountOccurrencesConc` (поиск подстроки по чанкам; деление по началам, не по байтам) |
| `listcrud`      | `InsertAt`, `Search`, `DeleteVal` (базовые операции односвязного списка через dummy-голову) |
| `lru`           | `Constructor`, `LRUCache.Get` / `Put` (комбинация: хеш-таблица + двусвязный список, O(1)) |
| `wordladder`    | `LadderLength` (комбинация: BFS по уровням + хеш-множество) |
| `alienorder`    | `AlienOrder` (комбинация: граф из соседних слов + топологическая сортировка) |
| `meetingrooms`  | `MinMeetingRooms` (комбинация: сортировка по началу + мин-куча концов) |
| `serializetree` | `Serialize`, `Deserialize` (комбинация: DFS прямого обхода + парсинг токенов) |
| `skyline`       | `GetSkyline` (комбинация: sweep line по событиям + макс-куча с ленивым удалением) |
| `designtwitter` | `Twitter.PostTweet` / `Follow` / `Unfollow` / `GetNewsFeed` (комбинация: хеш-таблицы + K-way merge кучей) |
| `ratelimiter`   | `RateLimiter.Allow` / `RetryAfter` (sliding window log) + `TokenBucket.Allow` (модель `x/time/rate`) + `SafeTokenBucket.Allow` (сделай ведро потокобезопасным: mutex против гонки check-then-act, конкурентный тест под `-race`) — боевой мини-проект: два лимитера, паттерн главы и то, что в проде |
| `streamstats`   | `MedianFinder.Add` / `Median` (две кучи) + `Histogram.Observe` / `Quantile` / `Merge` (боевой мини-проект: перцентили p50/p99, модель Prometheus/HdrHistogram) |
| `leaderboard`   | `TopK.Add` / `Top` (min-куча размера K) + `Leaderboard.Set` / `Incr` / `Score` / `TopN` / `Rank` (боевой мини-проект: лидерборд, модель Redis Sorted Set) |
| `cache`         | `TTLCache.Get` / `Put` (боевой мини-проект: LRU-кэш с TTL — прод-версия LRU, модель hashicorp/golang-lru expirable) |
| `miniredis`     | `dispatchSet` / `dispatchGet` / `dispatchDel` / `dispatchExpire` / `dispatchTTL` / `dispatchZAdd` / `dispatchZScore` / `dispatchZRange` / `dispatchZRank` / `RateLimitReply` / `SaveSnapshot` / `LoadSnapshot` / `dispatchSave` (этапы 2-7: строки+TTL+sorted set+лимит запросов — `ratelimiter.TokenBucket` на соединение, без мьютекса — и снапшот на диск: атомарная запись через временный файл + `os.Rename`, проверенная гонкой SAVE/чтение, а не описанием) — капстоун книги, маршрут пройден (см. [главу](../src/miniredis.md)); протокол (`resp.go`), маршрутизация и `PING`/`ECHO` (`dispatch.go`), `Store`/`live()`/`zsetOrdered()` (`store.go`), сервер с созданием ведра на соединение (`cmd/miniredis`), тест конкурентной безопасности на 8 горутин под `-race` (`miniredis_concurrent_test.go`, этап 6), автозагрузка снапшота при старте и сохранение по SIGINT/SIGTERM (`cmd/miniredis`, этап 7) даны готовыми; бонус — `FuzzReadCommand` (`resp_fuzz_test.go`, coverage-guided `go test -fuzz`) нашёл реальный overflow в `resp.go`, исправленный `maxBulkLen`/`maxMultibulkLen` |
| `codereview`    | `SumSquaresConcurrent` (усечение при делении на `workers` + гонка на разделяемом `total` — чинится каналом с локальными суммами, без мьютекса), `HasDuplicate` (корректен, но O(n²) — ловится дедлайном по времени, не сравнением ответа), `ParseAndSum` (проглоченная ошибка `strconv.Atoi`) — **другой тип задачи**: не пишешь с нуля, а находишь и чинишь изъян в уже работающем коде (см. [главу](../src/code-review.md)) |
| `profiling`     | `FormatScores` — отвечает верно, но на порядки медленнее нужного, и по коду это не видно; **другой тип задачи**: не читаешь код, а профилируешь (`go tool pprof`), находишь реальный источник (копирование строки при `+=`, не `fmt.Sprintf`, как подсказывает интуиция) и чинишь; проверка фикса — бюджет аллокаций через `testing.AllocsPerRun`, не сравнение ответа (см. [раздел приложения](../src/appendix-go-memory.md#-практика-найди-узкое-место-сам)) |

## Как добавить свой шаблон

1. Создайте папку `mypattern/`.
2. Добавьте три файла по образцу любого пакета:
   - `mypattern.go` — заготовки, тег `//go:build !solution`;
   - `mypattern_solution.go` — эталон, тег `//go:build solution`;
   - `mypattern_test.go` — табличные тесты (без build-тега).
3. Проверьте: `go test ./mypattern/` (красные) и
   `go test -tags solution ./mypattern/` (зелёные).
