# Алгоритмические шаблоны для решения задач на собеседованиях

Этот репозиторий содержит подробное изучение 25 основных алгоритмических шаблонов, которые помогут решить большинство задач на технических собеседованиях.

## Требования

- **Go 1.24+** — для Go-тренажёра (`exercises/`).
- **[mdBook](https://rust-lang.github.io/mdBook/)** (последняя версия, ставится через Rust/Cargo: `cargo install mdbook`) — для сборки книги.

## Книга

Книга собрана с помощью [mdBook](https://rust-lang.github.io/mdBook/). Запустите `mdbook serve` для просмотра в браузере или `mdbook build` для сборки.

- **Читать онлайн**: <https://fazletdinov.github.io/algorithms-book/> (деплоится из ветки `main` через CI)
- **Исходники**: [src/](src/) — Markdown открывается прямо на GitHub
- **Локально**: `mdbook serve` и откройте <http://localhost:3000>

> Каталог `book/` — это сгенерированный вывод mdBook; он не хранится в репозитории,
> а собирается в CI и публикуется на GitHub Pages.

## Содержание

1. [Sliding Window (Скользящее окно)](src/sliding-window.md) - Операции с подмассивами фиксированного размера
2. [Two Pointers (Два указателя)](src/two-pointers.md) - Поиск пар элементов в отсортированных массивах
3. [Fast & Slow Pointers (Быстрые и медленные указатели)](src/fast-slow-pointers.md) - Обнаружение циклов и поиск середины списка
4. [Merge Intervals (Слияние интервалов)](src/merge-intervals.md) - Работа с перекрывающимися интервалами
5. [Cyclic Sort (Циклическая сортировка)](src/cyclic-sort.md) - Сортировка массивов с числами от 1 до N
6. [Reverse Linked List (Разворот связанного списка)](src/reverse-linked-list.md) - Инвертирование списков на месте
7. [Tree BFS (Обход дерева в ширину)](src/tree-bfs.md) - Поуровневый обход деревьев
8. [Tree DFS (Обход дерева в глубину)](src/tree-dfs.md) - Рекурсивный обход деревьев
9. [Two Heaps (Две кучи)](src/two-heaps.md) - Поддержание медианы и разделение данных
10. [Subsets (Подмножества)](src/subsets.md) - Генерация всех подмножеств множества
11. [Modified Binary Search (Модифицированный бинарный поиск)](src/modified-binary-search.md) - Вариации бинарного поиска
12. [Bit Manipulation (Битовые операции)](src/bit-manipulation.md) - Побитовые операции, XOR, маски
13. [Top K Elements (Топ K элементов)](src/top-k-elements.md) - Поиск K наибольших/наименьших элементов
14. [K-way Merge (K-way слияние)](src/k-way-merge.md) - Слияние K отсортированных массивов
15. [Topological Sort (Топологическая сортировка)](src/topological-sort.md) - Линейный порядок зависимых элементов
16. [Backtracking (Поиск с возвратом)](src/backtracking.md) - Систематический перебор с откатом
17. [Graphs (Обход графов)](src/graphs.md) - BFS/DFS, компоненты связности, Union-Find
18. [Графы: сетки и кратчайшие пути](src/grids-and-shortest-paths.md) - Острова, Дейкстра
19. [Графы: продвинутые алгоритмы](src/advanced-graph-algorithms.md) - Bellman–Ford, A*, MST
20. [Dynamic Programming (Динамическое программирование)](src/dynamic-programming.md) - Мемоизация, табуляция, рюкзак, LCS
21. [Greedy (Жадные алгоритмы)](src/greedy.md) - Локально оптимальный выбор, выбор заявок
22. [Строковые алгоритмы](src/string-algorithms.md) - KMP, Rabin–Karp
23. [Trie (Префиксное дерево)](src/trie.md) - Поиск по префиксу
24. [Segment Tree (Дерево отрезков)](src/segment-tree.md) - Диапазонные запросы с обновлением
25. [Fenwick Tree (Дерево Фенвика, BIT)](src/fenwick-tree.md) - Префиксные суммы за O(log n)

Дополнительно: [Приложение: память, GC и профилирование в Go](src/appendix-go-memory.md) ·
[🎯 Тренажёр распознавания шаблонов](src/quiz.md) (интерактивный квиз).

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
