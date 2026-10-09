/*
 * quiz.js — тренажёр распознавания алгоритмических шаблонов по условию задачи.
 *
 * На странице ставится контейнер: <div class="algo-quiz"></div>
 * Скрипт находит его, даёт порцию вопросов, перемешивает варианты, ведёт счёт и в конце
 * показывает разбор слабых мест со ссылками на главы. Без зависимостей.
 *
 * Порция — до PORTION вопросов, по умолчанию только из пройденных глав (отметки трекера,
 * window.ALGO_DONE из progress.js; галочка «по всем главам» — ключ algoPracticeScope, общий со
 * смешанной тренировкой). Шестьдесят с лишним вопросов подряд по главам, до которых ещё не
 * дошёл, — это экзамен на незнакомое, а не тренировка распознавания. Порядок порции: сначала
 * вопросы, на которых ошибался (algoQuizMissed), затем ни разу не показанные, затем давно
 * показанные (algoQuizSeen — { "<вопрос>": ts }). Рекорд (algoQuizBestPortion) пишется и
 * показывается только для полной порции: «7 из 7» по двум главам и «7 из 10» — разные результаты.
 * Прежний рекорд algoQuizBest («40/64» — весь банк подряд) не читается и не перезаписывается.
 */
(function () {
  "use strict";

  // Банк вопросов. correct — строка, обязана присутствовать в options.
  // level: "easy" | "medium" | "hard" — метка сложности (показывается у вопроса).
  var QUESTIONS = [
    {
      level: "easy",
      q: "Дан отсортированный массив. Нужно найти две позиции, сумма значений в которых равна target.",
      options: ["Two Pointers", "Sliding Window", "Binary Search", "Dynamic Programming"],
      correct: "Two Pointers",
      explain: "Триггеры: «отсортированный массив» + «найти пару». Указатели с двух концов за O(n): сумма мала — двигаем левый, велика — правый. Sliding Window — для подотрезков, Binary Search — для одного значения.",
      href: "two-pointers.html"
    },
    {
      level: "medium",
      q: "Найти длину самой длинной подстроки без повторяющихся символов.",
      options: ["Sliding Window", "Two Pointers", "Trie", "Dynamic Programming"],
      correct: "Sliding Window",
      explain: "Триггеры: «подстрока» + «самая длинная при условии». Окно расширяется вправо и сжимается слева при нарушении условия — O(n). Частоты символов держим в map.",
      href: "sliding-window.html"
    },
    {
      level: "easy",
      q: "Определить, содержит ли односвязный список цикл, не используя доп. память.",
      options: ["Fast & Slow Pointers", "Sliding Window", "Tree BFS", "Binary Search"],
      correct: "Fast & Slow Pointers",
      explain: "Триггеры: «связный список» + «цикл» + «O(1) памяти». Медленный (×1) и быстрый (×2) указатели обязательно встретятся внутри цикла (алгоритм Флойда).",
      href: "fast-slow-pointers.html"
    },
    {
      level: "easy",
      q: "Дан список интервалов [start, end]; нужно объединить все перекрывающиеся.",
      options: ["Merge Intervals", "Greedy", "Two Pointers", "Dynamic Programming"],
      correct: "Merge Intervals",
      explain: "Триггеры: «интервалы» + «перекрытие». Сортируем по началу и сливаем соседние, если current.start <= last.end.",
      href: "merge-intervals.html"
    },
    {
      level: "medium",
      q: "Массив содержит числа от 1 до n не на своих местах. Найти все пропавшие — за O(1) доп. памяти.",
      options: ["Cyclic Sort", "Bit Manipulation", "Binary Search", "Two Pointers"],
      correct: "Cyclic Sort",
      explain: "Триггеры: «числа в диапазоне 1..n» + «O(1) памяти». Раскладываем каждое число на индекс v−1 обменами, затем индексы не на месте указывают на пропавшие.",
      href: "cyclic-sort.html"
    },
    {
      level: "medium",
      q: "Найти индекс элемента в повёрнутом отсортированном массиве за O(log n).",
      options: ["Modified Binary Search", "Two Pointers", "Sliding Window", "Tree DFS"],
      correct: "Modified Binary Search",
      explain: "Триггеры: «отсортированный (пусть и повёрнутый)» + «O(log n)». Одна из половин всегда отсортирована — определяем какая и сужаем диапазон.",
      href: "modified-binary-search.html"
    },
    {
      level: "easy",
      q: "Вывести значения узлов бинарного дерева по уровням (сверху вниз, по строкам).",
      options: ["Tree BFS", "Tree DFS", "Two Heaps", "Backtracking"],
      correct: "Tree BFS",
      explain: "Триггеры: «по уровням / по строкам». Обход в ширину через очередь; на каждой итерации обрабатываем ровно один уровень, фиксируя его размер.",
      href: "tree-bfs.html"
    },
    {
      level: "medium",
      q: "Проверить, является ли бинарное дерево корректным деревом поиска (BST).",
      options: ["Tree DFS", "Tree BFS", "Two Heaps", "Sliding Window"],
      correct: "Tree DFS",
      explain: "Триггеры: «свойство поддерева / валидация». Рекурсивный обход в глубину с передачей допустимого диапазона (min, max) для каждого узла.",
      href: "tree-dfs.html"
    },
    {
      level: "medium",
      q: "Поддерживать медиану потока чисел, который поступает в реальном времени.",
      options: ["Two Heaps", "Top-K Elements", "Modified Binary Search", "Merge Intervals"],
      correct: "Two Heaps",
      explain: "Триггеры: «медиана» + «поток». Max-heap для меньшей половины и min-heap для большей; вершины дают медиану, размеры балансируем.",
      href: "two-heaps.html"
    },
    {
      level: "easy",
      q: "Найти K наибольших элементов в большом массиве (полная сортировка не нужна).",
      options: ["Top-K Elements", "Two Heaps", "Dynamic Programming", "Two Pointers"],
      correct: "Top-K Elements",
      explain: "Триггеры: «K наибольших/наименьших». Min-heap размера K даёт O(n log k) — лучше полной сортировки O(n log n), когда нужны только K элементов.",
      href: "top-k-elements.html"
    },
    {
      level: "medium",
      q: "Слить K уже отсортированных списков в один отсортированный.",
      options: ["K-way Merge", "Merge Intervals", "Two Pointers", "Dynamic Programming"],
      correct: "K-way Merge",
      explain: "Триггеры: «K отсортированных источников». Min-heap из голов всех списков: извлекаем минимум, добавляем следующий из того же списка.",
      href: "k-way-merge.html"
    },
    {
      level: "medium",
      q: "Сгенерировать все возможные перестановки набора (либо комбинации длины k).",
      options: ["Backtracking", "Dynamic Programming", "Tree BFS", "Greedy"],
      correct: "Backtracking",
      explain: "Триггеры: «все возможные перестановки/комбинации с ограничением». Перебор с возвратом: выбор → рекурсия → отмена выбора. DP — когда нужно посчитать количество/оптимум, а не перечислить всё.",
      href: "backtracking.html"
    },
    {
      level: "medium",
      q: "Есть задачи с зависимостями (A нужно сделать до B). Найти корректный порядок выполнения.",
      options: ["Topological Sort", "Tree DFS", "Greedy", "Two Pointers"],
      correct: "Topological Sort",
      explain: "Триггеры: «зависимости / порядок / prerequisites» на ориентированном графе. Алгоритм Кана: убираем вершины с нулевой входящей степенью. Заодно ловит цикл.",
      href: "topological-sort.html"
    },
    {
      level: "medium",
      q: "Минимальное число монет заданных номиналов, чтобы набрать сумму (монеты можно брать многократно).",
      options: ["Dynamic Programming", "Greedy", "Backtracking", "Tree BFS"],
      correct: "Dynamic Programming",
      explain: "Триггеры: «минимум/максимум» + перекрывающиеся подзадачи. dp[a] = min(dp[a−c]+1). Жадность здесь НЕ работает (контрпример: монеты {1,3,4}, сумма 6).",
      href: "dynamic-programming.html"
    },
    {
      level: "medium",
      q: "Выбрать максимальное число взаимно непересекающихся встреч из заданного набора интервалов.",
      options: ["Greedy", "Dynamic Programming", "Merge Intervals", "Two Pointers"],
      correct: "Greedy",
      explain: "Триггеры: «максимум непересекающихся» с доказуемым жадным критерием. Сортируем по времени ОКОНЧАНИЯ и берём каждую следующую совместимую встречу.",
      href: "greedy.html"
    },
    {
      level: "easy",
      q: "Реализовать автодополнение слов по префиксу из большого словаря.",
      options: ["Trie", "Hashing", "Binary Search", "Sliding Window"],
      correct: "Trie",
      explain: "Триггеры: «префикс / автодополнение / словарь». Префиксное дерево даёт поиск по префиксу за O(длины запроса) независимо от размера словаря.",
      href: "trie.html"
    },
    {
      level: "medium",
      q: "Динамически объединять группы элементов и быстро проверять, в одной ли группе два элемента.",
      options: ["Union-Find (DSU)", "Tree BFS", "Dynamic Programming", "Merge Intervals"],
      correct: "Union-Find (DSU)",
      explain: "Триггеры: «динамическая связность / группы / компоненты». Система непересекающихся множеств со сжатием пути — почти O(1) на операцию.",
      href: "graphs.html"
    },
    {
      level: "easy",
      q: "В массиве каждое число встречается дважды, кроме одного. Найти его за O(1) памяти.",
      options: ["Bit Manipulation", "Hashing", "Sorting", "Two Pointers"],
      correct: "Bit Manipulation",
      explain: "Триггеры: «все парами, кроме одного» + «O(1) памяти». XOR всех чисел: пары взаимно уничтожаются (a^a=0), остаётся уникальное.",
      href: "bit-manipulation.html"
    },
    {
      level: "medium",
      q: "Часто запрашивать сумму на диапазоне [l, r], при этом элементы массива часто меняются.",
      options: ["Segment Tree / Fenwick", "Prefix Sum", "Sliding Window", "Binary Search"],
      correct: "Segment Tree / Fenwick",
      explain: "Триггеры: «сумма на диапазоне» + «частые обновления». Дерево отрезков/Фенвика дают и запрос, и обновление за O(log n). Префиксные суммы плохи при обновлениях (O(n)).",
      href: "segment-tree.html"
    },
    {
      level: "medium",
      q: "Найти кратчайший путь во ВЗВЕШЕННОМ графе с неотрицательными весами рёбер.",
      options: ["Dijkstra", "BFS", "Bellman–Ford", "Tree DFS"],
      correct: "Dijkstra",
      explain: "Триггеры: «кратчайший путь» + «веса неотрицательны». Дейкстра с приоритетной очередью. Обычный BFS подошёл бы только при единичных весах, Bellman–Ford нужен при отрицательных.",
      href: "grids-and-shortest-paths.html"
    },
    {
      level: "easy",
      q: "Найти кратчайший путь в НЕвзвешенном графе (все рёбра равнозначны).",
      options: ["BFS по графу", "Dijkstra", "Tree DFS", "Dynamic Programming"],
      correct: "BFS по графу",
      explain: "Триггеры: «кратчайший путь» + «невзвешенный». При единичных весах обычный BFS даёт ответ за O(V+E) — Дейкстра здесь избыточна.",
      href: "graphs.html"
    },
    {
      level: "medium",
      q: "Определить, образует ли набор рёбер цикл в НЕориентированном графе.",
      options: ["Union-Find (DSU)", "Topological Sort", "Tree DFS", "Binary Search"],
      correct: "Union-Find (DSU)",
      explain: "Триггеры: «цикл» + «неориентированный» + «динамически». Если оба конца ребра уже в одном множестве — ребро замыкает цикл. Топосортировка — для ориентированных графов.",
      href: "graphs.html"
    },
    {
      level: "medium",
      q: "Найти K-й по величине элемент в неотсортированном массиве.",
      options: ["Top-K Elements", "Two Heaps", "Sorting", "Binary Search"],
      correct: "Top-K Elements",
      explain: "Триггеры: «K-й по величине». Min-heap размера K за O(n log k); сортировка O(n log n) избыточна, когда нужен лишь один порядковый элемент.",
      href: "top-k-elements.html"
    },
    {
      level: "medium",
      q: "Развернуть участок связного списка между позициями m и n (остальное не трогать).",
      options: ["Reverse Linked List", "Two Pointers", "Fast & Slow Pointers", "Cyclic Sort"],
      correct: "Reverse Linked List",
      explain: "Триггеры: «развернуть (под)список на месте». Перенаправляем указатели внутри окна [m, n], держа три указателя prev/curr/next.",
      href: "reverse-linked-list.html"
    },
    {
      level: "easy",
      q: "Найти максимальную сумму подмассива ровно из k подряд идущих элементов.",
      options: ["Sliding Window", "Two Pointers", "Prefix Sum", "Dynamic Programming"],
      correct: "Sliding Window",
      explain: "Триггеры: «подмассив фиксированного размера k». Окно размера k со сдвигом: +новый −старый за O(1), всего O(n).",
      href: "sliding-window.html"
    },
    {
      level: "hard",
      q: "Проверить, можно ли разбить массив на два подмножества с равной суммой.",
      options: ["Dynamic Programming", "Greedy", "Backtracking", "Two Pointers"],
      correct: "Dynamic Programming",
      explain: "Триггеры: «можно ли набрать сумму S/2 подмножеством» — это 0/1 рюкзак (subset sum). Жадность не работает, чистый перебор экспоненциален.",
      href: "dynamic-programming.html"
    },
    {
      level: "medium",
      q: "Найти все начальные индексы анаграмм образца p внутри строки s.",
      options: ["Sliding Window", "Trie", "Two Pointers", "Hashing"],
      correct: "Sliding Window",
      explain: "Триггеры: «подстроки фиксированной длины |p|» + «совпадение по составу символов». Окно длины |p| со счётчиком частот, сравниваем с частотами p.",
      href: "sliding-window.html"
    },
    {
      level: "medium",
      q: "Найти наименьшего общего предка (LCA) двух узлов в бинарном дереве.",
      options: ["Tree DFS", "Tree BFS", "Two Heaps", "Binary Search"],
      correct: "Tree DFS",
      explain: "Триггеры: «предок / структура поддерева». Рекурсивный обход в глубину: узел, из чьих разных поддеревьев приходят оба искомых, и есть LCA.",
      href: "tree-dfs.html"
    },
    {
      level: "medium",
      q: "Найти все вхождения образца p в текст s за O(n+m), без хеширования.",
      options: ["KMP (префикс-функция)", "Trie", "Sliding Window", "Binary Search"],
      correct: "KMP (префикс-функция)",
      explain: "Триггеры: «поиск подстроки» + «линейно, гарантированно». Префикс-функция (failure-функция) позволяет не откатывать указатель в тексте — O(n+m) против наивного O(n·m).",
      href: "string-algorithms.html"
    },
    {
      level: "medium",
      q: "Нужны префиксные суммы с точечными обновлениями; важны минимум кода и память.",
      options: ["Fenwick Tree (BIT)", "Segment Tree", "Prefix Sum", "Sliding Window"],
      correct: "Fenwick Tree (BIT)",
      explain: "Триггеры: «префиксная сумма» + «точечные обновления» + «компактно». Дерево Фенвика — это один массив и пара строк с трюком i & (-i); и запрос, и обновление за O(log n).",
      href: "fenwick-tree.html"
    },
    {
      level: "hard",
      q: "Прибавлять значение ко ВСЕМ элементам отрезка [l, r] и спрашивать сумму на отрезке — много раз.",
      options: ["Segment Tree (lazy propagation)", "Fenwick Tree", "Prefix Sum", "Merge Intervals"],
      correct: "Segment Tree (lazy propagation)",
      explain: "Триггеры: «обновление НА ОТРЕЗКЕ» + «запрос на отрезке». Дерево отрезков с отложенным проталкиванием (lazy) делает оба за O(log n); обычный BIT умеет только точечные обновления (без трюков).",
      href: "segment-tree.html"
    },
    {
      level: "medium",
      q: "Найти кратчайшие пути из вершины, если в графе есть рёбра с ОТРИЦАТЕЛЬНЫМ весом.",
      options: ["Bellman–Ford", "Dijkstra", "BFS", "Topological Sort"],
      correct: "Bellman–Ford",
      explain: "Триггеры: «кратчайший путь» + «отрицательные веса». Дейкстра ломается на отрицательных рёбрах. Bellman–Ford делает V−1 релаксаций всех рёбер за O(V·E) и заодно ловит отрицательный цикл.",
      href: "advanced-graph-algorithms.html"
    },
    {
      level: "medium",
      q: "Найти путь на сетке к цели, используя оценку оставшегося расстояния (эвристику), чтобы не перебирать лишнее.",
      options: ["A*", "Dijkstra", "BFS", "Dynamic Programming"],
      correct: "A*",
      explain: "Триггеры: «кратчайший путь» + «есть эвристика до цели». A* = Дейкстра + допустимая эвристика h(n): приоритет f = g + h направляет поиск к цели, сокращая просмотренные узлы.",
      href: "grids-and-shortest-paths.html"
    },
    {
      level: "medium",
      q: "Соединить все узлы сети так, чтобы суммарная длина кабеля была минимальной.",
      options: ["MST (Kruskal/Prim)", "Dijkstra", "Topological Sort", "Greedy"],
      correct: "MST (Kruskal/Prim)",
      explain: "Триггеры: «соединить все вершины» + «минимальная суммарная стоимость». Это минимальное остовное дерево: Краскал (сортировка рёбер + DSU) или Прим (приоритетная очередь). Дейкстра решает другую задачу — пути от источника.",
      href: "advanced-graph-algorithms.html"
    },
    {
      level: "easy",
      q: "Посчитать число «островов» (связных групп из 1) в матрице из 0 и 1.",
      options: ["Обход сетки (BFS/DFS)", "Union-Find", "Dynamic Programming", "Backtracking"],
      correct: "Обход сетки (BFS/DFS)",
      explain: "Триггеры: «сетка» + «связные области». Обходим каждую непосещённую клетку-1, заливкой (flood fill) помечаем весь остров; число запусков обхода = число островов. (Union-Find тоже подойдёт, но обход проще.)",
      href: "grids-and-shortest-paths.html"
    },
    {
      level: "easy",
      q: "Найти середину односвязного списка за один проход, не зная заранее его длины.",
      options: ["Fast & Slow Pointers", "Two Pointers", "Reverse Linked List", "Sliding Window"],
      correct: "Fast & Slow Pointers",
      explain: "Триггеры: «связный список» + «середина за один проход». Быстрый указатель идёт ×2, медленный ×1; когда быстрый достигнет конца, медленный будет ровно в середине.",
      href: "fast-slow-pointers.html"
    },
    {
      level: "easy",
      q: "Удалить дубликаты из ОТСОРТИРОВАННОГО массива на месте, вернув новую длину.",
      options: ["Two Pointers", "Sliding Window", "Cyclic Sort", "Hashing"],
      correct: "Two Pointers",
      explain: "Триггеры: «отсортирован» + «на месте». Медленный указатель — конец уникального префикса, быстрый бежит вперёд; при новом значении пишем его за медленным. O(n), O(1) памяти.",
      href: "two-pointers.html"
    },
    {
      level: "hard",
      q: "Найти длину наибольшей строго возрастающей подпоследовательности (не обязательно подряд).",
      options: ["Dynamic Programming", "Greedy", "Sliding Window", "Two Pointers"],
      correct: "Dynamic Programming",
      explain: "Триггеры: «подпоследовательность» (не подряд!) + «оптимум». LIS: классическое O(n²) ДП, либо O(n log n) через массив tails и бинарный поиск. Скользящее окно неприменимо — элементы не идут подряд.",
      href: "dynamic-programming.html"
    },
    {
      level: "medium",
      q: "Построить ВСЕ подмножества множества (power set), наращивая их добавлением каждого нового элемента.",
      options: ["Subsets (каскадное построение)", "Backtracking", "Dynamic Programming", "Two Heaps"],
      correct: "Subsets (каскадное построение)",
      explain: "Триггеры: «все подмножества» + «итеративно». Паттерн Subsets: для каждого нового элемента дублируем все имеющиеся подмножества, добавляя в копии этот элемент. 2ⁿ подмножеств. Backtracking даёт тот же результат рекурсией.",
      href: "subsets.html"
    },
    {
      level: "hard",
      q: "Для каждого окна размера k в массиве найти максимум (sliding window maximum).",
      options: ["Sliding Window + монотонный дек", "Two Heaps", "Top-K Elements", "Segment Tree"],
      correct: "Sliding Window + монотонный дек",
      explain: "Триггеры: «максимум в каждом окне». Монотонно убывающий дек хранит индексы кандидатов: голова — текущий максимум, при сдвиге выкидываем вышедшие за окно и меньшие новых. Амортизированно O(n).",
      href: "sliding-window.html"
    },
    {
      level: "hard",
      q: "Спроектировать кэш на capacity элементов: Get и Put за O(1), при переполнении вытесняется давно не используемый (LRU) элемент.",
      options: ["Хеш-таблица + двусвязный список", "Только хеш-таблица", "Куча (priority queue)", "Дерево поиска (BST)"],
      correct: "Хеш-таблица + двусвязный список",
      explain: "Связка двух паттернов: «O(1) доступ по ключу» даёт хеш-таблица, «O(1) переупорядочивание свежести» — двусвязный список (узел в голову, вытеснение с хвоста). Поодиночке ни одна структура обоих свойств не даёт.",
      href: "pattern-combinations.html"
    },
    {
      level: "hard",
      q: "Кратчайшая цепочка превращений одного слова в другое, меняя по одной букве; каждое промежуточное слово должно быть в словаре.",
      options: ["BFS + хеш-множество", "DFS + backtracking", "Dynamic Programming", "Trie"],
      correct: "BFS + хеш-множество",
      explain: "Триггеры: «кратчайшая цепочка» + «шаги равной стоимости» → BFS по неявному графу (слова — вершины, ребро = отличие в одну букву). Хеш-множество словаря даёт O(1) проверку соседа и отметку посещённых.",
      href: "pattern-combinations.html"
    },
    {
      level: "hard",
      q: "По списку слов, отсортированному по правилам неизвестного алфавита, восстановить порядок букв.",
      options: ["Граф из строк + топологическая сортировка", "Trie + DFS", "Сортировка подсчётом", "Жадный выбор"],
      correct: "Граф из строк + топологическая сортировка",
      explain: "Триггеры: «порядок при зависимостях». Из каждой пары соседних слов первая различающаяся буква даёт ребро a→b; топосортировка укладывает буквы. Граф не дан — его сначала строят из данных.",
      href: "pattern-combinations.html"
    },
    {
      level: "hard",
      q: "По зданиям [left, right, height] построить силуэт города — точки, где меняется высота крыши.",
      options: ["Sweep line + макс-куча", "Merge Intervals", "Сегментное дерево", "Two Pointers"],
      correct: "Sweep line + макс-куча",
      explain: "Триггеры: «события на прямой по координате» + «всё время нужен текущий максимум». Идём по краям зданий слева направо (sweep), макс-куча активных высот даёт текущую высоту силуэта; точку фиксируем при смене вершины.",
      href: "pattern-combinations.html"
    },
    {
      level: "hard",
      q: "Лента: вернуть 10 самых свежих твитов пользователя и тех, на кого он подписан (у каждого свой список твитов по времени).",
      options: ["Хеш-таблицы + K-way merge", "Two Heaps", "Сегментное дерево", "Sliding Window"],
      correct: "Хеш-таблицы + K-way merge",
      explain: "Триггеры: «слить несколько отсортированных потоков» → K-way merge кучей их голов. Хеш-таблицы хранят твиты автора и подписки; куча берёт самый свежий твит среди голов, пока не наберём 10.",
      href: "pattern-combinations.html"
    },

    // ── Боевые формулировки: как задачи выглядят в проде, а не на LeetCode ──
    {
      level: "medium",
      q: "БОЕВАЯ. API-шлюз: клиент не может делать больше 100 запросов за последние 60 секунд; на отказ надо вернуть Retry-After.",
      options: ["Sliding Window (лог меток времени)", "Two Heaps", "Hash Table + счётчик", "Merge Intervals"],
      correct: "Sliding Window (лог меток времени)",
      explain: "Триггеры: «за последние N секунд» — скользящее окно по времени. Дек/срез меток на клиента: устаревшие выкидываем слева, длина окна = число запросов; Retry-After — когда выйдет из окна нужная метка. Голый счётчик — это fixed window, он врёт на стыке окон (всплеск ×2).",
      href: "sliding-window.html"
    },
    {
      level: "medium",
      q: "БОЕВАЯ. Пайплайн аналитики принимает миллиард событий в сутки; надо дёшево отсекать дубликаты event_id, изредка ошибаться можно.",
      options: ["Bloom-фильтр перед точной проверкой", "Hash Table на все ключи", "Отсортированный лог + бинарный поиск", "Trie"],
      correct: "Bloom-фильтр перед точной проверкой",
      explain: "Триггеры: «миллиард», «не влезает в память», «изредка ошибаться можно». Bloom отвечает «точно нет» из ~гигабайта памяти и отсекает 99% проверок; редкие «возможно да» перепроверяются в точном сторе. Точная хеш-таблица на 10⁹ ключей — сотни ГБ.",
      href: "probabilistic-structures.html"
    },
    {
      level: "medium",
      q: "БОЕВАЯ. Дашборд мониторинга должен показывать p50/p99 latency сервиса в реальном времени по потоку измерений.",
      options: ["Two Heaps / гистограмма", "Сортировка каждого окна", "Sliding Window Maximum", "Top K Elements"],
      correct: "Two Heaps / гистограмма",
      explain: "Триггеры: «медиана/перцентиль» + «поток». Точная бегущая медиана — две кучи (max-куча низа + min-куча верха). В проде чаще гистограмма с фикс. бакетами (Prometheus): любой квантиль за O(бакетов) и мержится между серверами — перцентили не аддитивны, а гистограммы да.",
      href: "two-heaps.html"
    },
    {
      level: "easy",
      q: "БОЕВАЯ. CI-система должна запустить джобы с учётом depends_on так, чтобы зависимости шли раньше, а циклы зависимостей — падали с ошибкой.",
      options: ["Topological Sort", "Greedy", "Tree DFS", "Union-Find"],
      correct: "Topological Sort",
      explain: "Триггеры: «зависимости», «порядок выполнения», «обнаружить цикл». Kahn: считаем входящие степени, снимаем вершины с нулевой; если сняли не все — есть цикл. Так работают go build, BuildKit, миграции БД.",
      href: "topological-sort.html"
    },
    {
      level: "medium",
      q: "БОЕВАЯ. Сервис доставки: k курьеров шлют отсортированные по времени логи; нужно слить их в один общий поток по порядку.",
      options: ["K-way Merge", "Merge Intervals", "Quick Sort всех логов", "Two Pointers"],
      correct: "K-way Merge",
      explain: "Триггеры: «k отсортированных потоков» + «слить». Min-куча по головам потоков: снимаем самый ранний, продвигаем его поток — O(N log k). Пересортировка всего — O(N log N) и требует собрать всё в память; two pointers — только для k=2.",
      href: "k-way-merge.html"
    },
    {
      level: "medium",
      q: "БОЕВАЯ. Биллинг: раз в час приходит список сессий [start, end]; нужно найти суммарное время, когда была активна хотя бы одна сессия.",
      options: ["Merge Intervals", "Sliding Window", "Two Heaps", "Fenwick Tree"],
      correct: "Merge Intervals",
      explain: "Триггеры: «интервалы» + «перекрытия» + «суммарное покрытие». Сортируем по началу, сливаем перекрывающиеся, складываем длины слитых. Дерево Фенвика здесь избыточно: запрос один, обновлений нет.",
      href: "merge-intervals.html"
    },
    {
      level: "hard",
      q: "БОЕВАЯ. Инцидент-менеджмент: алерты приходят парами «A связан с B»; на каждый новый алерт надо мгновенно сказать, к какому из существующих кластеров инцидентов он относится.",
      options: ["Union-Find (DSU)", "Graphs (BFS от каждого алерта)", "Hash Table", "Tree DFS"],
      correct: "Union-Find (DSU)",
      explain: "Триггеры: «динамически объединять группы» + «быстро спрашивать „в одной ли группе“». DSU с path compression отвечает почти за O(1) амортизированно. BFS от каждого алерта — пересчёт компонент на каждый запрос, O(V+E) каждый раз.",
      href: "graphs.html"
    },
    {
      level: "medium",
      q: "БОЕВАЯ. Автодополнение в поисковой строке: по набранному префиксу мгновенно предложить топ подсказок из словаря в миллион запросов.",
      options: ["Trie", "Hash Table", "Binary Search по отсортированному словарю", "String Matching (KMP)"],
      correct: "Trie",
      explain: "Триггеры: «префикс» + «по мере набора». Спуск по Trie стоит O(длина префикса) — не зависит от размера словаря; из узла достаём заготовленный топ. Бинарный поиск по срезу тоже работает (O(log n)), но на живых вставках и топ-К у узлов Trie удобнее; хеш префиксы не умеет вовсе.",
      href: "trie.html"
    },
    {
      level: "hard",
      q: "БОЕВАЯ. Раскатка конфигурации: узлы сети образуют граф каналов с пропускными способностями; спрашивают, сколько трафика реально протянуть из ДЦ A в ДЦ B.",
      options: ["Max Flow (Эдмондс—Карп)", "Дейкстра по самым толстым рёбрам", "MST", "Greedy по каналам"],
      correct: "Max Flow (Эдмондс—Карп)",
      explain: "Триггеры: «сколько суммарно протянуть» + «ограничения на рёбрах». Это максимальный поток; заодно min-cut покажет, какой канал апгрейдить. Дейкстра ищет один путь, а поток складывается из многих; жадный без обратных рёбер запирает сам себя.",
      href: "max-flow.html"
    },
    {
      level: "medium",
      q: "БОЕВАЯ. Фича-флаги: у каждой сущности до 64 булевых прав; нужно дёшево хранить, проверять и пересекать наборы прав.",
      options: ["Bit Manipulation (битовая маска)", "map[string]bool", "Срез булевых", "Trie"],
      correct: "Bit Manipulation (битовая маска)",
      explain: "Триггеры: «до 64 булевых» + «пересекать наборы». Один uint64: проверка mask&(1<<i), объединение a|b, пересечение a&b — по одной инструкции, 8 байт памяти. Это rwx-биты Unix и флаги во всех системных API.",
      href: "bit-manipulation.html"
    },
    {
      level: "hard",
      q: "БОЕВАЯ. Планировщик кластера: разложить 500 сервисов по минимальному числу серверов фиксированной ёмкости. Команда неделю ищет точный быстрый алгоритм.",
      options: ["Распознать NP-трудность и взять эвристику (FFD)", "Dynamic Programming по подмножествам", "Greedy докажет оптимум", "Backtracking с отсечениями до конца"],
      correct: "Распознать NP-трудность и взять эвристику (FFD)",
      explain: "Триггеры: «оптимально упаковать» без структуры — это bin packing, NP-трудная задача: быстрого точного алгоритма не знает никто, и неделя поисков — не слабость команды. Инженерный ход — First-Fit-Decreasing с гарантией ≤ 11/9·OPT. ДП по подмножествам — 2ⁿ состояний, на 500 сервисах мимо.",
      href: "complexity-classes.html"
    },
    {
      level: "medium",
      q: "БОЕВАЯ. Kill switch для крипто-майнера: процесс должен найти в своей памяти подстроку-сигнатуру в потоке данных, не буферизуя весь поток.",
      options: ["KMP (префикс-функция)", "Наивный поиск с откатами", "Rabin-Karp с пересчётом хеша с нуля", "Sliding Window по частотам"],
      correct: "KMP (префикс-функция)",
      explain: "Триггеры: «поток» + «нельзя откатываться по тексту». KMP никогда не двигает указатель текста назад — идеален для стриминга: состояние — одна позиция в паттерне. Наивный поиск требует отката текста; частотное окно ловит анаграммы, а не точную подстроку.",
      href: "string-algorithms.html"
    },
    {
      level: "easy",
      q: "Массив не меняется, а запросов «сумма элементов с l по r» — миллион.",
      options: ["Prefix Sum", "Segment Tree / Fenwick", "Sliding Window", "Two Pointers"],
      correct: "Prefix Sum",
      explain: "Триггеры: «много запросов суммы» + «данные не меняются». prefix длиной n+1 строится за O(n), каждый запрос — prefix[r+1] − prefix[l] за O(1). Дерево отрезков и Фенвик дают O(log n) и нужны, только когда массив меняется: на неизменных данных они в десятки раз медленнее (замер в главе «Когда алгоритм не нужен»).",
      href: "prefix-sums.html"
    },
    {
      level: "medium",
      q: "Посчитать, сколько непрерывных подмассивов имеют сумму ровно k. Числа бывают отрицательными.",
      options: ["Prefix Sum", "Sliding Window", "Two Pointers", "Dynamic Programming"],
      correct: "Prefix Sum",
      explain: "Триггеры: «сколько подмассивов с суммой» + «отрицательные числа». Окно ломается: сумма перестаёт расти при расширении. Сумма [i..j] = prefix(j+1) − prefix(i), поэтому для каждого конца ищем в хеш-таблице, сколько прошлых префиксов равны sum − k. Таблицу заводят с {0: 1} — пустым префиксом.",
      href: "prefix-sums.html"
    },
    {
      level: "medium",
      q: "Для каждого дня по списку температур узнать, через сколько дней станет теплее.",
      options: ["Monotonic Stack", "Two Heaps", "Sliding Window", "Binary Search"],
      correct: "Monotonic Stack",
      explain: "Триггеры: «для каждого элемента» + «ближайший больший справа». Стек индексов с убывающими температурами: новый день снимает все более холодные — для них он и есть ответ, расстояние = разность индексов. Каждый индекс кладётся и снимается ≤ 1 раза — O(n).",
      href: "monotonic-stack.html"
    },
    {
      level: "hard",
      q: "Найти площадь наибольшего прямоугольника, целиком лежащего под гистограммой.",
      options: ["Monotonic Stack", "Two Pointers", "Greedy", "Sliding Window"],
      correct: "Monotonic Stack",
      explain: "Триггеры: прямоугольник ограничен сверху одним столбиком, а в стороны — ближайшими меньшими слева и справа. Оба находит монотонный стек за один проход: снявший столбик — меньший справа, сосед под ним в стеке — меньший слева. Площадь = высота × (i − left − 1).",
      href: "monotonic-stack.html"
    },
    {
      level: "easy",
      q: "Проверить, правильно ли расставлены скобки трёх видов — (), [], {} — в выражении.",
      options: ["Stack", "Two Pointers", "Hashing", "Greedy"],
      correct: "Stack",
      explain: "Триггеры: «вложенность» — закрывается всегда последнее открытое, это LIFO. Открывающую кладём на стек, закрывающая обязана совпасть с вершиной. Счётчики не отличат «([)]» от «([])».",
      href: "monotonic-stack.html"
    },
    {
      level: "medium",
      q: "БОЕВАЯ. Биллинг: за месяц пришло 10⁵ правок тарифа вида «с дня l по день r цена +d», а посуточный итог нужен один раз в конце месяца.",
      options: ["Prefix Sum", "Segment Tree / Fenwick", "Merge Intervals", "Two Pointers"],
      correct: "Prefix Sum",
      explain: "Триггеры: «прибавка к диапазону» много раз + «прочитать один раз». Разностный массив: каждая правка — две записи (diff[l] += d, diff[r+1] −= d), итог — одна префиксная сумма. O(u + n). Дерево отрезков с ленивым проталкиванием тоже справится, но нужно, только если читать итог надо между правками.",
      href: "prefix-sums.html"
    },
    {
      level: "hard",
      q: "БОЕВАЯ. Мониторинг: для каждой новой точки p99-задержки сразу показать, сколько минут подряд (включая текущую) задержка была не выше текущей.",
      options: ["Monotonic Stack", "Two Heaps", "Sliding Window", "Top K Elements"],
      correct: "Monotonic Stack",
      explain: "Триггеры: «сколько подряд не выше меня» = расстояние до ближайшего строго большего слева (задача Online Stock Span). Стек (индекс, значение) со строго убывающими значениями: новая точка снимает всех не выше себя, ответ — расстояние до вершины. Амортизированно O(1) на точку, работает на потоке.",
      href: "monotonic-stack.html"
    }
  ];

  // Подписи и стили для меток сложности (level → читаемое имя + CSS-модификатор).
  var LEVELS = {
    easy:   { label: "Лёгкий",  cls: "easy" },
    medium: { label: "Средний", cls: "medium" },
    hard:   { label: "Сложный", cls: "hard" }
  };

  // Порция — столько вопросов за заход. Рекорд имеет смысл только для полной порции.
  var PORTION = 10;

  // Рекорд полной порции — "score/total" под своим ключом. Прежний рекорд за весь банк подряд
  // (algoQuizBest, «40/64») квиз больше не читает и не пишет: это история читателя, а не результат порции.
  var BEST_KEY = "algoQuizBestPortion";

  // Промахи по вопросам копятся отдельно от рекорда: до сих пор ошибка исчезала
  // вместе с прохождением («40/57» не говорит, ЧТО именно не далось). Теперь
  // промах живёт до тех пор, пока на этот вопрос не ответят верно, и питает
  // три вещи: порцию (промахи идут первыми), карточки повторений (srs.js) и
  // диагностику слабых мест по шаблонам (review.js).
  var QUIZ_MISSED = "algoQuizMissed"; // {"<вопрос>": {n, pattern, href, q}}
  // Когда вопрос показан последний раз: порция берёт давно виденные раньше недавних.
  var QUIZ_SEEN = "algoQuizSeen"; // {"<вопрос>": ts}
  function loadMap(key) {
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (e) { return {}; }
  }
  function saveMap(key, m) {
    try { localStorage.setItem(key, JSON.stringify(m)); } catch (e) {}
  }
  // Ключ — сам текст вопроса: он стабилен при перестановке банка, в отличие от
  // индекса (вопросы каждый раз перемешиваются, а банк дополняется).
  // Обе записи — по свежему чтению: вкладок с книгой бывает несколько.
  function recordAnswer(item, ok) {
    var seen = loadMap(QUIZ_SEEN);
    seen[item.q] = Date.now();
    saveMap(QUIZ_SEEN, seen);

    var m = loadMap(QUIZ_MISSED);
    var id = item.q;
    if (ok) {
      if (m[id]) { delete m[id]; saveMap(QUIZ_MISSED, m); }
      return;
    }
    var prev = m[id] || { n: 0 };
    m[id] = { n: prev.n + 1, pattern: item.correct, href: item.href, q: item.q };
    saveMap(QUIZ_MISSED, m);
    // карточка промаха встаёт в очередь сразу: счётчик «Сегодня» обновляется без перехода на другую страницу
    if (window.ALGO_SRS) window.ALGO_SRS.sync();
  }
  function loadBest() {
    try {
      var raw = localStorage.getItem(BEST_KEY);
      if (!raw) return null;
      var p = raw.split("/");
      return { score: parseInt(p[0], 10), total: parseInt(p[1], 10) };
    } catch (e) { return null; }
  }
  function saveBest(score, total) {
    try { localStorage.setItem(BEST_KEY, score + "/" + total); } catch (e) {}
  }

  function shuffle(a, rnd) {
    rnd = rnd || Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function slugOf(item) {
    return item.href.replace(/\.html$/, "");
  }

  // portion собирает порцию: вопросы глав из done (null — все главы), до PORTION штук — сначала
  // промахи, затем ни разу не показанные (каждая группа перемешана), затем показанные: в порцию
  // попадают самые давние, но внутри порции они перемешаны — иначе на маленьком пуле повторная порция
  // шла бы в том же порядке, и запоминалась бы очередь, а не признак. Метка показа не числом
  // (испорченная запись) — как самая давняя.
  function portion(opts) {
    var rnd = opts.rnd || Math.random;
    var missed = opts.missed || {}, seen = opts.seen || {}, done = opts.done;
    var pool = QUESTIONS.filter(function (item) { return !done || done[slugOf(item)]; });
    var wrong = [], fresh = [], old = [];
    pool.forEach(function (item) {
      if (missed[item.q]) wrong.push(item);
      else if (seen[item.q] == null) fresh.push(item);
      else old.push(item);
    });
    function ts(item) {
      var v = seen[item.q];
      return typeof v === "number" && isFinite(v) ? v : 0;
    }
    // в порцию — самые давние (при равных метках — случайные: перемешаны до сортировки)
    old = shuffle(old, rnd).sort(function (a, b) { return ts(a) - ts(b); });
    var head = shuffle(wrong, rnd).concat(shuffle(fresh, rnd)).slice(0, PORTION);
    return head.concat(shuffle(old.slice(0, PORTION - head.length), rnd));
  }

  // practice — пройденные главы и режим выдачи (progress.js). Без progress.js — все главы, без выбора.
  function practice() {
    return typeof window.ALGO_DONE === "function" ? window.ALGO_DONE : null;
  }

  function buildQuiz(el) {
    var api = practice();
    var qs = [], idx = 0, score = 0, missed = [], selected = null, answered = false;
    var best = loadBest();

    function full() {
      return qs.length === PORTION;
    }
    function bestText() {
      return best && best.total === PORTION && full() ? "      🏆 Рекорд: " + best.score + " / " + best.total : "";
    }
    function renderHead() {
      var lv = LEVELS[qs[idx].level] || LEVELS.medium;
      head.innerHTML = "";
      head.appendChild(document.createTextNode("Вопрос " + (idx + 1) + " / " + qs.length + "   "));
      var badge = document.createElement("span");
      badge.className = "algo-quiz__level algo-quiz__level--" + lv.cls;
      badge.textContent = lv.label;
      head.appendChild(badge);
      head.appendChild(document.createTextNode("   Счёт: " + score + bestText()));
    }

    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Тренажёр распознавания шаблонов");
    // Режим выдачи: «только пройденные главы» (по умолчанию) или «по всем главам» — общий ключ со
    // смешанной тренировкой. Без progress.js выбора нет: квиз берёт все главы.
    var scope = document.createElement("div"); scope.className = "algo-scope";
    var scopeText = document.createElement("span"); scopeText.className = "algo-scope__text";
    var scopeLabel = document.createElement("label"); scopeLabel.className = "algo-scope__label";
    var scopeBox = document.createElement("input"); scopeBox.type = "checkbox"; scopeBox.className = "algo-scope__box";
    scopeLabel.appendChild(scopeBox);
    scopeLabel.appendChild(document.createTextNode(" по всем главам"));
    scope.appendChild(scopeText); scope.appendChild(scopeLabel);
    if (api) el.appendChild(scope);
    var head = document.createElement("div"); head.className = "algo-quiz__head"; el.appendChild(head);
    var qText = document.createElement("div"); qText.className = "algo-quiz__q"; el.appendChild(qText);
    var optsBox = document.createElement("div"); optsBox.className = "algo-quiz__opts";
    optsBox.setAttribute("role", "group"); optsBox.setAttribute("aria-label", "Варианты ответа"); el.appendChild(optsBox);
    var explain = document.createElement("div"); explain.className = "algo-quiz__explain";
    // Живой регион: вердикт «верно/неверно» и правильный ответ озвучиваются скринридером.
    explain.setAttribute("role", "status"); explain.setAttribute("aria-live", "polite"); explain.setAttribute("aria-atomic", "true");
    el.appendChild(explain);
    var actions = document.createElement("div"); actions.className = "algo-quiz__actions"; el.appendChild(actions);
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "algo-quiz__btn"; actions.appendChild(btn);

    scopeBox.onchange = function () {
      api.setScope(scopeBox.checked ? "all" : "done");
      start();
    };

    // start — новая порция по СВЕЖИМ отметкам, промахам и показам: глава могла быть отмечена в
    // другой вкладке, пока эта была открыта.
    function start() {
      var all = !api || api.scope() === "all";
      var done = all ? null : api();
      scopeBox.checked = all;
      if (api) {
        var n = done ? Object.keys(done).length : 0;
        scopeText.textContent = all ? "Вопросы по всем главам." : "Вопросы только по пройденным главам (отмечено: " + n + ").";
      }
      qs = portion({ done: done, missed: loadMap(QUIZ_MISSED), seen: loadMap(QUIZ_SEEN) });
      idx = 0; score = 0; missed = [];
      if (!qs.length) return renderEmpty(api.readable());
      renderQuestion();
    }

    // renderEmpty — режим «только пройденные», а вопросов нет: объяснение и тот же переключатель.
    function renderEmpty(readable) {
      head.textContent = "";
      qText.textContent = readable
        ? "Квиз берёт вопросы только из глав, отмеченных пройденными, а среди отмеченных пока нет глав с вопросами квиза."
        : "Хранилище браузера недоступно, поэтому отметки пройденных глав не прочитать.";
      optsBox.innerHTML = "";
      explain.className = "algo-quiz__explain algo-quiz__explain--show";
      explain.textContent = readable
        ? "Отметь главу галочкой «Глава пройдена» в её конце (или в трекере на странице шпаргалки) — или поставь «по всем главам» выше."
        : "Поставь «по всем главам» выше: выбор продержится, пока открыта эта страница.";
      btn.hidden = true;
    }

    function renderQuestion() {
      var item = qs[idx];
      selected = null; answered = false;
      btn.hidden = false;
      renderHead();
      qText.textContent = item.q;
      explain.className = "algo-quiz__explain";
      explain.textContent = "";
      optsBox.innerHTML = "";
      var shuffled = shuffle(item.options.slice());
      shuffled.forEach(function (opt) {
        var o = document.createElement("button");
        o.type = "button"; o.className = "algo-quiz__opt"; o.textContent = opt;
        o.setAttribute("aria-pressed", "false");
        o.onclick = function () {
          if (answered) return;
          selected = opt;
          Array.prototype.forEach.call(optsBox.children, function (c) {
            var on = c === o;
            c.classList.toggle("algo-quiz__opt--sel", on);
            c.setAttribute("aria-pressed", on ? "true" : "false");
          });
          btn.disabled = false;
        };
        optsBox.appendChild(o);
      });
      btn.textContent = "Проверить";
      btn.disabled = true;
      btn.onclick = check;
    }

    function check() {
      if (answered) return;
      answered = true;
      var item = qs[idx];
      var ok = selected === item.correct;
      if (ok) score++; else missed.push(item);
      recordAnswer(item, ok);
      Array.prototype.forEach.call(optsBox.children, function (c) {
        c.disabled = true;
        if (c.textContent === item.correct) { c.classList.add("algo-quiz__opt--correct"); c.setAttribute("aria-label", c.textContent + " — верный ответ"); }
        else if (c.textContent === selected) { c.classList.add("algo-quiz__opt--wrong"); c.setAttribute("aria-label", c.textContent + " — ваш неверный ответ"); }
      });
      explain.className = "algo-quiz__explain algo-quiz__explain--show " + (ok ? "algo-quiz__explain--ok" : "algo-quiz__explain--bad");
      explain.innerHTML = (ok ? "✅ Верно — " : "❌ Правильный ответ: ") + "<b>" + item.correct + "</b><br>" +
        item.explain + " <a href=\"" + item.href + "\">📖 Глава</a>";
      renderHead();
      btn.textContent = idx + 1 < qs.length ? "Следующий ▶" : "Результат";
      btn.disabled = false;
      btn.onclick = next;
    }

    function next() {
      idx++;
      if (idx < qs.length) renderQuestion();
      else renderSummary();
    }

    function renderSummary() {
      // Рекорд — только у полной порции: «7 из 7» по двум отмеченным главам не сравнить с «7 из 10».
      var isRecord = full() && (!best || best.total !== PORTION || score > best.score);
      if (isRecord) { saveBest(score, PORTION); best = { score: score, total: PORTION }; }
      head.textContent = "Результат" + (full() && best && best.total === PORTION ? "   🏆 Рекорд: " + best.score + " / " + best.total : "");
      qText.textContent = "Вы набрали " + score + " из " + qs.length + "." +
        (isRecord && score > 0 ? " 🎉 Новый рекорд!" : "") +
        (full() ? "" : " Рекорд считается только по полной порции из " + PORTION + " вопросов.");
      optsBox.innerHTML = "";
      explain.className = "algo-quiz__explain";
      explain.textContent = "";
      if (missed.length) {
        var seen = {};
        var html = "<div class='algo-quiz__weak'>Стоит повторить:</div><ul>";
        missed.forEach(function (m) {
          if (seen[m.correct]) return;
          seen[m.correct] = true;
          html += "<li><a href=\"" + m.href + "\">" + m.correct + "</a></li>";
        });
        html += "</ul>";
        explain.className = "algo-quiz__explain algo-quiz__explain--show";
        explain.innerHTML = html;
      } else {
        explain.className = "algo-quiz__explain algo-quiz__explain--show algo-quiz__explain--ok";
        explain.textContent = "Идеально! Все шаблоны распознаны верно. 🎉";
      }
      btn.textContent = "Следующая порция";
      btn.disabled = false;
      btn.onclick = start;
    }

    start();
  }

  // Для проверок (scripts/quiz-check.js): банк вопросов и сборка порции.
  window.ALGO_QUIZ = { questions: QUESTIONS, portion: portion, size: PORTION };

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll(".algo-quiz:not(.algo-quiz--ready)"), function (el) {
      el.classList.add("algo-quiz--ready");
      buildQuiz(el);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
