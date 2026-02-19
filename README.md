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

## Структура книги

Каждая глава содержит:
- Теоретическое объяснение с визуализацией
- Примеры кода на Go (встроены в текст, можно запускать в Playground)
- Ссылки на задачи LeetCode для практики

## Как использовать

1. Соберите книгу: `mdbook build`
2. Или запустите сервер для разработки: `mdbook serve`
3. Изучайте главы, запускайте примеры кода в браузере
4. Решите задачи на LeetCode, указанные в каждой главе

## Источники

- [14 шаблонов для решения задач на собеседовании (Tproger)](https://tproger.ru/translations/14-templates-to-answer-interview-questions)
- [14 Patterns to Ace Any Coding Interview Question (HackerNoon)](https://hackernoon.com/14-patterns-to-ace-any-coding-interview-question-c5bb3357f6ed)

## Советы по изучению

- Начните с простых шаблонов (Sliding Window, Two Pointers)
- Практикуйтесь на задачах разной сложности
- Понимайте временную и пространственную сложность каждого шаблона
- Учитесь определять, какой шаблон применить к задаче
