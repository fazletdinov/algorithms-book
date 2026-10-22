# 🏋️ Go-тренажёр по алгоритмическим шаблонам

Это рабочий Go-модуль для практики. На каждый шаблон есть **заготовки функций**
с тестами — вы пишете реализацию, запускаете тесты и сразу видите, корректно ли
решение. Это отличает тренажёр от книги: здесь вы пишете код сами.

## Как пользоваться

**Основной путь — виджет «💻 Реши прямо здесь» в главе** (раздел ниже): он гоняет те же тесты,
засчитывает прогресс и не трогает файлы. Файлы заготовок держите нетронутыми: виджет берёт
стартовый код с диска и считает упражнением только функцию с `panic("TODO")`, так что решённая
в файле функция откроется в повторении и собеседовании готовым решением и не засчитается, а CI
падает на шаге «Заготовки ещё не решены». Решать в редакторе — в отдельной ветке или копии
репозитория:

1. Откройте пакет нужного шаблона, например `slidingwindow/slidingwindow.go`.
2. Замените `panic("TODO: ...")` своей реализацией.
3. Запустите тесты из корня репозитория под пределом памяти и времени — непроверенный код
   (например, обход графа без `visited`) однажды занял 28 ГБ и уронил редактор:

   ```bash
   scripts/safe-run.sh go -C exercises test ./slidingwindow/
   ```

   Пока функции не реализованы — тесты красные. Реализуйте → станут зелёными.

## Решать прямо в книге (in-book runner)

Не хочется переключаться между книгой и редактором? Подними локальный helper-сервер —
и решай задачи прямо на страницах книги, как на LeetCode:

```bash
go run ./cmd/runner        # http://localhost:8080, Ctrl+C чтобы остановить
```

Рядом с `mdbook serve` открой главу: виджет «💻 Реши прямо здесь» даёт редактор с
заготовкой пакета. Пишешь реализацию, жмёшь «Прогнать тесты» — сервер прогоняет
**настоящий `go test`** и показывает, какие тесты прошли/упали: справился — зелёное, ошибся —
видно, какой тест упал и на каком случае (в «подробностях» — имя случая и сообщение теста: что
получено и что ожидалось). У concurrency-пакетов виджет помечен `🏁 -race` и ловит гонки данных.

Гоняются тесты одного упражнения из списка в шапке — по умолчанию первого нерешённого, чьи
соседи уже решены: у функции со своими тестами — её тесты, у метода и конструктора — тесты
типа, у упражнения без тех и других — весь пакет (что именно, написано у кнопки). Так
`panic("TODO")` в соседней функции не роняет прогон раньше нужного теста. Зелёное упражнение
получает «✓»; пакет засчитывается решённым, только когда зелёным прошёл целиком («весь пакет»).
Заготовка открывается без подсказок (`plain`), твой сохранённый код не трогается. Подсказки —
за кнопками под редактором: «Признак и сложность», потом «Рецепт», заметки о полях типа и о
пакете; эталон функции — за «Сдаюсь — показать эталон», она появляется после первого прогона
её тестов, а эталон показывается рядом (без строк `import` — нужные пакеты допиши сам), твой код не меняется.

Зависшее решение сервер останавливает сам: у теста 20 секунд (45 с `-race`), и по их
истечении виджет называет тест, который не уложился, — «похоже на бесконечный цикл», а не
просто «есть падения». Печать в бесконечном цикле останавливается ещё раньше — как только
поток вывода тестов дорос до 4 МиБ (это печать вместе со служебной обёрткой событий
`go test -json`). Прогоны идут по одному: второй ждёт, пока закончится первый. Ctrl+C
останавливает сервер вместе с идущим прогоном.

Если до тестов дело не дошло, виджет называет настоящую причину, а не «Ошибку компиляции»:
«ни один тест не запустился» (в пакете нет тестов с запрошенными именами), «прогон не
запустился: …» (не сработал ограничитель памяти или сам `go` — дальше идёт его первая строка),
«сборка упёрлась в предел памяти» (слишком маленький `-mem-mb`), «не успела закончиться сборка»
(первый запуск на пустом кэше компилятора, особенно с `-race`, — просто запусти ещё раз),
«тестовый бинарник упал до первого теста» (решение паникует при инициализации).

Бесконечный рост памяти (классика — обход графа без `visited`) срок не остановит: память
кончится раньше. Поэтому у прогона есть и предел памяти — 2 ГиБ (`-mem-mb 4096` поднимет,
`-mem-mb 0` выключит): упёрся — виджет пишет «упёрлось в предел памяти 2 ГиБ — похоже на
бесконечный рост» и называет тест. На Linux с пользовательским systemd это настоящий предел
(cgroup), иначе — предел адресного пространства через `prlimit`. Нет ни того, ни другого
(macOS, Windows) — runner предупреждает об этом при старте, а виджет — в шапке; тогда
безопаснее `make docker-runner` из корня репозитория: там память держит сам контейнер. Какой
предел действует, видно в шапке виджета («предел 2 ГиБ · 20 с»).

`make docker-runner` проверен вживую на linux/amd64 (2026-10-07): `/api/health` отвечает
`"memory":"rlimit"`, `"memoryText":"2 ГиБ"`, эталон `wordcount` с `-race` проходит за 6,3 с на
холодной сборке, `graphs` — за 0,7 с. На arm64 (Docker Desktop на Apple Silicon) не проверялось:
если виджет с гонками (`data-race`) на верном решении отвечает «упёрлось в предел памяти», скорее
всего детектору гонок не хватило адресов под `-race` — запусти `docker run` из `Makefile` вручную
и добавь `-mem-mb 4096` после `-listen-all`.

Сервис локальный и однопользовательский (твой код на твоей машине), песочницы нет: пределы
времени и памяти только не дают решению подвесить машину. Код реализации — `cmd/runner/`.

### Что runner отдаёт виджету, кроме прогона

- `GET /api/stub?pkg=X` — `{pkg, code, plain, funcs, notes[, warning]}`. `code` — файл заготовки как в
  репозитории; отдаётся всегда, даже если читатель оставил его недописанным: тогда ответ 200,
  `plain` = `code`, `funcs` и `notes` пусты, а в `warning` — почему не удалось разобрать. `plain` — он же
  без подсказок (абзацы «Подсказка», «Ожидаемая сложность», «Не забудьте» и им подобные из
  док-комментариев, служебные абзацы ниже, блоки `// TODO…`; в теле структуры блок заменён
  меткой `// TODO: поля`; остальное — байт в байт). `funcs` — упражнения в порядке файла: любая функция
  с `panic("TODO…")` (экспорт не важен); если в файле нет ни одного `panic("TODO…")` — экспортированные
  функции, объявленные и в заготовке, и в эталоне. В репозитории так устроены только `codereview` и
  `profiling`; но для файла, который читатель правит, это любой пакет, решённый целиком, — тогда
  список упражнений меняется. Поля: `name` (`Тип.Метод` у метода), `tests` — тесты,
  которыми владеет сама функция (`[]` у метода и конструктора), `needs` — другие упражнения пакета
  (`Sum`, `Тип.Метод`), без которых единица прогона не пройдёт: их зовут её тесты или её эталон, транзитивно, `group` и `groupTests` — тип метода или конструктора и тесты типа
  (единица прогона для них — тип), `hint` — признак и подсказки через `\n`, `recipe` — блок
  `// TODO:` одной строкой. `notes` — `[{at, text}]` — то, что убрано из `plain` и не попало в
  `hint`/`recipe`: подсказка пакета, подсказки к типам и поля структур; `at` — `package`, `type Имя`
  или `func Имя`.
- `GET /api/solution?pkg=X&func=Имя` — `{pkg, func, code}`: эталон ОДНОЙ функции из `X_solution.go`
  — она сама и то, без чего не читается (вспомогательные функции, типы, константы файла; у
  неэкспортированного типа — все его методы). 404 `{error}` — функция не объявлена в заготовке или в эталоне
  либо у пакета нет эталона; 400 — имя пакета или функции не по шаблону.
- Три служебных префикса абзацев в док-комментарии функции, которые читает банк задач
  `assets/problems.js`: «Шаблон: <слаг>» — глава-ответ вместо главы пакета; «Также решается:
  <слаг>[, <слаг>]» — главы, чей приём тоже подходит (в смешанной тренировке их выбор засчитывается);
  «Признак: <текст>» — по чему приём виден в условии и когда берут альтернативу. Абзацы не
  показываются как есть: альтернативы называет вердикт смешанной тренировки после ответа (и ответ её
  карточки повторения), признак — там же после ответа и первой строкой подсказок виджета (за
  кнопкой). Слаги — имена файлов `src/<слаг>.md`, опечатка — ошибка генератора. Размечено 14
  функций: `bigo.NextGreaterElement` и `DailyTemperatures` отвечают главой монотонного стека
  (альтернатива — `big-o`), альтернатива есть у 11, признак — у всех 14; список и сверку держит
  `TestCollectRealBankMarks` (`cmd/problembank`). Поля записи банка: `x` — «Ожидаемая сложность» без
  префикса и точки, `a` — слаги из «Также решается», `g` — «Признак» без префикса, `n` —
  упражнения-соседи, без которых тесты задачи не пройдут (такую задачу собеседование не выдаёт).
  Разбор — пакет `cmd/internal/stubdoc`.
- Тест принадлежит функции по имени: `TestF`, `TestFRandom`, `TestF_Edge` — функции `F` (при
  споре — самому длинному имени), тесты метода — типу (`TestLRUCacheSequence` — `LRUCache`). Назови
  новый тест по функции или типу, который он проверяет, — иначе «прогнать только её тесты» его
  пропустит. `stubdoc/module_test.go` ловит тест, который зовёт ровно одно упражнение верхнего уровня,
  но не входит в его `tests` и `groupTests`; тест, зовущий сразу несколько упражнений, или тест метода без
  имени типа она не видит.

## Подсмотреть эталонное решение

У каждого шаблона есть проверенное эталонное решение под build-тегом `solution`:

```bash
go test -tags solution ./slidingwindow/   # прогнать тесты на эталоне
```

Файл с эталоном называется `<пакет>_solution.go`. Подглядывайте только после
самостоятельной попытки.

## Проверить асимптотику бенчмарками

**Тест масштаба** — `<пакет>_zscale_test.go` в двенадцати пакетах ядра (`slidingwindow`,
`prefixsum`, `twopointers`, `stack`, `binarysearch`, `intervals`, `hashtable`, `binheap`,
`treedfs`, `graphs`, `greedy`, `dp`) и в `codereview`. Он проверяет не ответ, а сложность:
функция гоняется на большом худшем входе и обязана уложиться в 2 с (эталон — миллисекунды,
перебор — секунды или вечность), иначе тест падает с причиной вроде «не уложилось в 2s:
MaxSlidingWindow(n=400000, k=200000, убывающий ряд) — похоже на O(n·k) там, где нужен O(n)».
Ловится разрыв класса, а не лишний логарифм: куча вместо дека — тоже честное решение. Размеры
входа функция называет в условии абзацем «Ограничения:». Общий помощник —
`internal/scaletest` (это не пакет тренажёра). Файл идёт последним, потому что зависший
перебор после срока работает до конца прогона; `go test -short` тесты масштаба пропускает.

В остальных пакетах табличные тесты проверяют корректность, но не сложность: наивное
O(n²)-решение пройдёт их молча. Чтобы увидеть реальную асимптотику своего кода, есть бенчмарки на
двух размерах входа (пакеты `slidingwindow`, `dp`, `topk`, `segtree`, а в
конкурентных `parallelbfs`, `parallelsort`, `parallelnqueens` — ещё и
сравнение последовательной и параллельной версий):

```bash
go test -run='^$' -bench=. ./dp/              # бенч ВАШЕГО решения (после реализации)
go test -tags solution -run='^$' -bench=LIS ./dp/      # бенч эталона для сравнения
go test -run='^$' -bench=MaxSlidingWindow -benchmem ./slidingwindow/
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

Помимо табличных тестов, у пакетов есть рандомизированные (`<пакет>_zrand_test.go`):
тысячи случайных входов на фиксированном сиде сверяются с наивной моделью-эталоном —
они ловят ошибки на границах, которые маленькие ручные кейсы пропускают. Есть они и
у боевых мини-проектов (`ratelimiter`, `cache`, `leaderboard`, `streamstats`): там
модель — «наивная, но очевидно корректная» версия той же структуры (полный лог
запросов, пересортировка на каждый запрос и т.п.).

Буква `z` в имени нужна для порядка: `go test` исполняет тесты в порядке файлов, и
случайные должны идти после табличных — тогда первое падение на нетронутой заготовке
приходится на именованный случай первой функции, а не на чужой случайный тест.

| Пакет           | Функции                                      |
|-----------------|----------------------------------------------|
| `slidingwindow` | `MaxSumSubarray`, `LongestSubstringKDistinct`, `SmallestSubarrayWithSum`, `LongestSubstringNoRepeat`, `MaxSlidingWindow` |
| `prefixsum`     | `RangeSums`, `CountSubarraysWithSum`, `LongestBalanced`, `CountDivisibleSubarrays`, `MaxSubarraySum`, `ProductExceptSelf`, `ApplyRangeAdds`, `MatrixRegionSums` |
| `twopointers`   | `PairWithTargetSum`, `RemoveDuplicates`, `SortedSquares`, `TripletsSumToZero`, `DutchFlagSort` |
| `stack`         | `IsValidBrackets`, `DecodeString`, `NextGreaterCircular`, `StockSpans`, `LargestRectangle`, `SumSubarrayMins`, `RemoveKDigits` |
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
| `graphs`        | `CountComponents`, `HasCycleUndirected`, `BFSOrder`, `DFSOrder`, `ShortestPathUnweighted`, `IsBipartite`, `ShortestPathRoute`, `Dijkstra` |
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
| `fenwick`       | `NewFenwick`, `Add`, `PrefixSum`, `RangeSum`, `CountInversions`, `CountSmallerToRight` |
| `hashtable`     | `NewHashMap`, `HashMap.Put` / `Get` / `Delete` / `Len` (цепочки + ресайз по load factor); приём: `TwoSum`, `GroupAnagrams`, `LongestConsecutive`, `FirstUniqueChar` |
| `deque`         | `NewDeque`, `Deque.PushFront` / `PushBack` / `PopFront` / `PopBack` / `Front` / `Back` / `Len` (кольцевой буфер) |
| `binheap`       | `NewHeap`, `BuildHeap` (heapify O(n)), `Heap.Push` / `Pop` / `Peek` / `Len` (бинарная min-куча, siftUp/siftDown) |
| `dsu`           | `NewUnionFind`, `UnionFind.Find` / `Union` / `Connected` / `Count` (сжатие путей + по размеру) |
| `bst`           | `NewBST`, `BST.Search` / `Insert` / `Delete` / `InOrder` (двоичное дерево поиска), `IsValidBST`, `KthSmallest`, `LowestCommonAncestor` |
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
| `listcrud`      | `InsertAt`, `Search`, `DeleteVal` (базовые операции односвязного списка через dummy-голову), `RemoveNthFromEnd`, `MergeTwoSorted` |
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
| `ahocorasick`   | `NewAutomaton`, `Automaton.FindAll` / `ContainsAny`, `Censor` (Trie + ссылки неудачи KMP: все шаблоны за один проход) |
| `consistenthash` | `NewRing`, `Ring.Add` / `Remove` / `Get`, `MovedFraction`, `JumpHash` (шардирование: кольцо с виртуальными узлами и jump hash против `hash % N`) |
| `fresh`         | задачи без разбора в книге — только условие, ограничения и тесты; какой приём, решаешь сам (их выдаёт [смешанная тренировка](../src/mixed.md)): `MaxSatisfiedCustomers`, `MinBoats`, `BestClosingHour`, `CountSteadyPairs`, `LongestWarmingSpan`, `MinTimeForTrips`, `TotalBusyTime`, `HIndex`, `MaxTwinSum`, `HeaviestLevel`, `TimeToNotifyAll`, `ClosestPrices`, `FurthestStop`, `CableMovesToConnect`, `FastestRoutesCount`, `MinBuildTime`, `SplitBetweenOffices`, `MinTicketCost`, `CanMergeLogs`, `MaxOrdersInVan`, `MaxUniqueParts`, `CountMagnetWords`, `LastInCircle` |
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
