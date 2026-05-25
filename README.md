# Алгоритмические шаблоны для решения задач на собеседованиях

Этот репозиторий содержит подробное изучение 15 основных алгоритмических шаблонов, которые помогут решить большинство задач на технических собеседованиях.

## Книга

Книга собрана с помощью [mdBook](https://rust-lang.github.io/mdBook/). Запустите `mdbook serve` для просмотра в браузере или `mdbook build` для сборки.

- **Собранная книга**: [book/](book/) — откройте `book/index.html` в браузере
- **Исходники**: [src/](src/)

## Содержание

1. [Sliding Window (Скользящее окно)](book/sliding-window.html) - Операции с подмассивами фиксированного размера
2. [Two Pointers (Два указателя)](book/two-pointers.html) - Поиск пар элементов в отсортированных массивах
3. [Fast & Slow Pointers (Быстрые и медленные указатели)](book/fast-slow-pointers.html) - Обнаружение циклов и поиск середины списка
4. [Merge Intervals (Слияние интервалов)](book/merge-intervals.html) - Работа с перекрывающимися интервалами
5. [Cyclic Sort (Циклическая сортировка)](book/cyclic-sort.html) - Сортировка массивов с числами от 1 до N
6. [Reverse Linked List (Разворот связанного списка)](book/reverse-linked-list.html) - Инвертирование списков на месте
7. [Tree BFS (Обход дерева в ширину)](book/tree-bfs.html) - Поуровневый обход деревьев
8. [Tree DFS (Обход дерева в глубину)](book/tree-dfs.html) - Рекурсивный обход деревьев
9. [Two Heaps (Две кучи)](book/two-heaps.html) - Поддержание медианы и разделение данных
10. [Subsets (Подмножества)](book/subsets.html) - Генерация всех подмножеств множества
11. [Modified Binary Search (Модифицированный бинарный поиск)](book/modified-binary-search.html) - Вариации бинарного поиска
12. [Bit Manipulation (Битовые операции)](book/bit-manipulation.html) - Побитовые операции, XOR, маски
13. [Top K Elements (Топ K элементов)](book/top-k-elements.html) - Поиск K наибольших/наименьших элементов
14. [K-way Merge (K-way слияние)](book/k-way-merge.html) - Слияние K отсортированных массивов
15. [Topological Sort (Топологическая сортировка)](book/topological-sort.html) - Линейный порядок зависимых элементов
16. [Backtracking (Поиск с возвратом)](book/backtracking.html) - Систематический перебор с откатом
17. [Graphs (Обход графов)](book/graphs.html) - BFS/DFS, компоненты связности, Union-Find
18. [Графы: сетки и кратчайшие пути](book/grids-and-shortest-paths.html) - Острова, Дейкстра
19. [Графы: продвинутые алгоритмы](book/advanced-graph-algorithms.html) - Bellman–Ford, A*, MST
20. [Dynamic Programming (Динамическое программирование)](book/dynamic-programming.html) - Мемоизация, табуляция, рюкзак, LCS
21. [Greedy (Жадные алгоритмы)](book/greedy.html) - Локально оптимальный выбор, выбор заявок
22. [Строковые алгоритмы](book/string-algorithms.html) - KMP, Rabin–Karp
23. [Trie (Префиксное дерево)](book/trie.html) - Поиск по префиксу
24. [Segment Tree (Дерево отрезков)](book/segment-tree.html) - Диапазонные запросы с обновлением

Дополнительно: [Приложение: память, GC и профилирование в Go](book/appendix-go-memory.html).

## Структура книги

Каждая глава содержит:
- Теоретическое объяснение с визуализацией (включая интерактивные пошаговые демонстрации)
- Примеры кода на Go (встроены в текст; запускаются локально через `go run`/`go test`)
- Ссылки на задачи LeetCode для практики

## 🏋️ Go-тренажёр (практика)

В каталоге [`exercises/`](exercises/) — рабочий Go-модуль с заготовками функций и
тестами на каждый шаблон. Вы пишете решение сами и сразу проверяете его:

```bash
cd exercises
go test ./slidingwindow/                 # ваши решения (красные, пока не реализованы)
go test -tags solution ./slidingwindow/  # эталонное решение
go test ./...                            # все шаблоны сразу
```

Подробности и список доступных пакетов — в [`exercises/README.md`](exercises/README.md).

## Как использовать

1. Соберите книгу: `mdbook build`
2. Или запустите сервер для разработки: `mdbook serve`
3. Изучайте главы, копируйте примеры кода и запускайте их локально (`go run`)
4. Решите задачи на LeetCode, указанные в каждой главе

## Источники

- [14 шаблонов для решения задач на собеседовании (Tproger)](https://tproger.ru/translations/14-templates-to-answer-interview-questions)
- [14 Patterns to Ace Any Coding Interview Question (HackerNoon)](https://hackernoon.com/14-patterns-to-ace-any-coding-interview-question-c5bb3357f6ed)

## Советы по изучению

- Начните с простых шаблонов (Sliding Window, Two Pointers)
- Практикуйтесь на задачах разной сложности
- Понимайте временную и пространственную сложность каждого шаблона
- Учитесь определять, какой шаблон применить к задаче
