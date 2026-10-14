# Алгоритмы и структуры данных: от фундамента к синтезу

[Введение](README.md)

- [Руководство по выбору шаблона](pattern-selection-guide.md)
- [Шпаргалка и прогресс](cheatsheet.md)
- [Тренажёр: распознавание шаблонов](quiz.md)
- [Повторение: что сегодня](review.md)
- [Смешанная тренировка](mixed.md)
- [Глоссарий](glossary.md)

# Шаблоны

## Группа 1: Фундамент — язык анализа и базовые контейнеры

- [📈 Big-O и амортизированный анализ](big-o.md)
- [🔁 Рекурсия и мастер-теорема](recursion.md)
- [🗂️ Хеш-таблица: устройство и операции](hash-table-structure.md)
- [🔗 Связный список: устройство и операции](linked-list-structure.md)
- [↔️ Дек (Deque): устройство и операции](deque-structure.md)
- [🔢 Алгоритмы сортировки и порядковые статистики](sorting.md)

## Группа 2: Базовые паттерны (массивы и строки)

- [🪟 Скользящее окно (Sliding Window)](sliding-window.md)
- [➕ Префиксные суммы и разностные массивы (Prefix Sums)](prefix-sums.md)
- [🎯 Два указателя (Two Pointers)](two-pointers.md)
- [🧭 Инварианты и индукция: доказываем, что код правильный](invariants.md)
- [📚 Стек и монотонный стек (Monotonic Stack)](monotonic-stack.md)
- [🐢 Быстрый и медленный указатели (Fast & Slow Pointers)](fast-slow-pointers.md)
- [↩️ Reverse Linked List (Разворот связанного списка)](reverse-linked-list.md)
- [🔀 Слияние интервалов (Merge Intervals)](merge-intervals.md)
- [🔄 Cyclic Sort (Циклическая сортировка)](cyclic-sort.md)
- [🔍 Модифицированный бинарный поиск (Modified Binary Search)](modified-binary-search.md)
- [⚙️ Bit Manipulation (Битовые операции)](bit-manipulation.md)

## Группа 3: Деревья и кучи

- [🪴 Бинарное дерево поиска (BST): устройство и операции](bst-structure.md)
- [⚖️ AVL-дерево: балансировка](avl-tree-structure.md)
- [🔴 Красно-чёрное дерево: балансировка через цвет](red-black-tree-structure.md)
- [🌳 Обход дерева в ширину (Tree BFS)](tree-bfs.md)
- [🌲 Обход дерева в глубину (Tree DFS)](tree-dfs.md)
- [⛰️ Бинарная куча (Binary Heap): устройство и операции](heap-structure.md)
- [🗻 Две кучи (Two Heaps)](two-heaps.md)
- [🏆 Топ K элементов (Top K Elements)](top-k-elements.md)
- [🧵 K-way Merge (K-way слияние)](k-way-merge.md)

## Группа 4: Комбинаторика и графы

- [🎰 Subsets (Подмножества)](subsets.md)
- [🧩 Поиск с возвратом (Backtracking)](backtracking.md)
- [🕸️ Обход графов (Graphs)](graphs.md)
- [🪢 Union-Find (DSU): устройство и операции](union-find-structure.md)
- [🪜 Топологическая сортировка (Topological Sort)](topological-sort.md)
- [🗺️ Графы: сетки и кратчайшие пути](grids-and-shortest-paths.md)
- [🛰️ Графы: продвинутые алгоритмы](advanced-graph-algorithms.md)
- [🌉 Графы: сильная связность, мосты и точки сочленения](graph-connectivity.md)
- [🌊 Потоки в сетях: максимальный поток и паросочетания](max-flow.md)

## Группа 5: Оптимизация и границы возможного

- [💰 Жадные алгоритмы (Greedy)](greedy.md)
- [🧮 Динамическое программирование (Dynamic Programming)](dynamic-programming.md)
- [🚧 Классы сложности: P, NP и что делать, когда задача трудна](complexity-classes.md)

## Группа 6: Строки и продвинутые структуры

- [🔤 Строковые алгоритмы: поиск подстроки](string-algorithms.md)
- [🌿 Trie: устройство и построение](trie-structure.md)
- [🌿 Trie: разбор задач](trie.md)
- [🧶 Ахо — Корасик: много шаблонов за один проход](aho-corasick.md)
- [🌴 Дерево отрезков: устройство и операции](segment-tree-structure.md)
- [🌴 Дерево отрезков: разбор задач](segment-tree.md)
- [📏 Дерево Фенвика (BIT): устройство и операции](fenwick-tree-structure.md)
- [📏 Дерево Фенвика: разбор задач](fenwick-tree.md)
- [🔭 Sparse Table: устройство и операции](sparse-table-structure.md)
- [🗃️ B-дерево: устройство и операции](btree-structure.md)
- [🎲 Вероятностные структуры: Bloom, HyperLogLog, count-min](probabilistic-structures.md)

## Группа 7: Дискретная математика

- [🧮 Комбинаторика счёта: посчитать, не перебирая](combinatorics.md)
- [🪙 Дискретная вероятность для инженера](probability.md)
- [🔢 Теория чисел: НОД, простые, быстрая степень](number-theory.md)
- [🔐 Криптография: модульная арифметика в деле](cryptography.md)

## Группа 8: Синтез

- [🧬 Комбинации паттернов: задачи на связки](pattern-combinations.md)
- [🌍 Карта: структуры данных в реальных системах](real-world-map.md)
- [🗂️ Как Postgres хранит данные: страница, строка, указатель](postgres-storage.md)
- [🐘 Postgres: EXPLAIN как pprof](postgres-plans.md)
- [🔀 Консистентное хеширование: шардирование без перетасовки](consistent-hashing.md)
- [🗄️ Капстоун: мини-Redis на настоящем RESP-протоколе](miniredis.md)
- [🔍 Ревью чужого кода: чинить, а не писать с нуля](code-review.md)
- [🧵 Параллельные алгоритмы: когда горутины помогают](parallel-algorithms.md)
- [🧘 Когда алгоритм не нужен: лучшая работа — несделанная](skip-the-work.md)

## Дополнительные материалы

- [🐹 Go-рантайм: планировщик, GC и аллокатор](go-runtime.md)
- [🔧 Структуры данных в экосистеме Go](go-stdlib-structures.md)
- [🔐 Криптография на практике: библиотеки Go](go-crypto-libraries.md)
- [Приложение: память, GC и профилирование в Go](appendix-go-memory.md)
- [Заключение](conclusion.md)
