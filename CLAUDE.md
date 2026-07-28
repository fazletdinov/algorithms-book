# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Учебник по **алгоритмическим шаблонам для собеседований** (на русском), собранный как
mdBook, с тремя слоями обучения:

1. **Книга** (`src/*.md`) — теория 25 паттернов: когда применять, алгоритм, сложность, код на Go.
2. **Интерактив** (`assets/*.js` + `*.css`) — встроенные в HTML визуализации, квиз-тренажёр
   распознавания паттернов и трекер прогресса.
3. **Go-тренажёр** (`exercises/`) — рабочий Go-модуль с заготовками функций и тестами:
   читатель пишет реализацию сам и проверяет её тестами.

Проект деплоится на GitHub Pages через CI. Репозиторий: `github.com/fazletdinov/algorithms-book`.

## Команды

### Книга (запускать из корня репозитория)
```bash
mdbook serve        # dev-сервер с авто-пересборкой на http://localhost:3000
mdbook build        # компиляция src/ -> book/ (артефакт для GitHub Pages)
```
mdBook читает из `src/`, пишет в `book/`. `book/` — генерируемый вывод, не редактировать вручную.

### Go-тренажёр (запускать из `exercises/`)
```bash
cd exercises
go test ./slidingwindow/                  # прогнать ТЕСТЫ ПОЛЬЗОВАТЕЛЬСКОЙ заготовки (красные, пока не реализовано)
go test -tags solution ./slidingwindow/   # прогнать те же тесты на ЭТАЛОННОМ решении (должны быть зелёные)
go test -tags solution -count=1 ./...      # все эталоны разом — это то, что проверяет CI
go vet  -tags solution ./...               # линт эталонов — тоже в CI
```
Запуск одного пакета — указать его путь (`./trie/`); один тест — `-run TestName`.

### In-book runner — «решай прямо в книге» (запускать из `exercises/`)
```bash
cd exercises
go run ./cmd/runner          # локальный helper-сервер на http://localhost:8080
```
Книга обращается сюда по fetch: виджет `<div class="algo-runner" data-pkg="X">` отдаёт
заготовку пакета как стартовый код, принимает код читателя и прогоняет НАСТОЯЩИЙ `go test`
(копирует модуль во временную папку, подменяет заготовку, `GOWORK=off`), возвращая
pass/fail. Эталон НЕ показывается — читатель решает сам, как на LeetCode. Виджеты с
`data-race="true"` (concurrency-пакеты) гоняются с `-race` и подсвечивают гонки данных.
Сервис локальный/однопользовательский, поэтому без песочницы. Реализация — `cmd/runner/`,
фронт — `assets/runner.js`+`runner.css` (подключены в `book.toml`).

## Архитектура Go-тренажёра (ключевой паттерн)

Каждый пакет шаблона состоит из **трёх файлов** с одинаковыми именами функций,
но взаимоисключающей компиляцией через build-теги:

- `<pkg>.go` — заготовки с `panic("TODO: ...")`, тег `//go:build !solution`
- `<pkg>_solution.go` — эталонная реализация, тег `//go:build solution`
- `<pkg>_test.go` — табличные тесты **без** build-тега (общая спецификация для обоих вариантов)

Без флага `-tags solution` компилируется заготовка (тесты падают), с флагом — эталон
(тесты проходят). Один и тот же тест-файл служит спецификацией обеих версий, поэтому
**сигнатуры функций в заготовке и эталоне должны совпадать дословно**, иначе сломается
компиляция теста. При добавлении/правке функции меняй заготовку, эталон и тест согласованно.

Чтобы добавить шаблон: создай папку `mypattern/` с этими тремя файлами по образцу
любого существующего пакета (см. `exercises/README.md`). Модуль — Go 1.24,
`module github.com/fazletdinov/algorithms-book/exercises`.

## Архитектура интерактива

Визуализации, квиз и трекер прогресса — это vanilla-JS/SVG без зависимостей и сборщика.
Файлы из `assets/` подключаются в HTML через `additional-css`/`additional-js` в `book.toml`,
поэтому **новый JS/CSS работает только после `mdbook build`/`serve`**, а не в сыром Markdown.

Встраивание в главы — через `<div>` с data-атрибутами:
- `<div class="algo-viz" data-viz="ТИП" data-array="..." data-k="..."></div>` — визуализация
  (`algo-viz.js`; типы: `sliding-window-fixed`, `two-pointers-sum`, `binary-search`,
  `cyclic-sort`, `dp-coins`, `tree-bfs`/`tree-dfs`, `graph-bfs` и др.)
- `<div class="algo-quiz"></div>` — квиз распознавания паттернов (`quiz.js`, см. `src/quiz.md`)
- `<div class="algo-progress"></div>` — трекер прогресса в localStorage (`progress.js`, см. `src/cheatsheet.md`)

Виджеты поддерживают пошаговую навигацию стрелками (←/→, Home/End).

## Структура книги

`src/SUMMARY.md` — оглавление (его правка добавляет/убирает главы). 25 паттернов сгруппированы
от базовых (скользящее окно, два указателя) до продвинутых структур (дерево отрезков, Фенвик),
плюс вспомогательные страницы: `pattern-selection-guide.md`, `cheatsheet.md`, `quiz.md`,
`glossary.md`, `appendix-go-memory.md`. Язык контента — русский; код примеров — Go.

## CI/CD

`.github/workflows/ci.yml`: job `go-tests`, `assets-check` и `build-book` (`mdbook build`
+ `check-links.js`) должны пройти; затем job `deploy` публикует `book/` на GitHub Pages
**только из ветки main**. Job `build-book` после сборки прогоняет `node scripts/check-links.js`
— целостность внутренних ссылок/якорей по собранному `book/`.

Job `go-tests` (working-directory `exercises/`) проверяет четыре инварианта:
1. `gofmt -l .` — всё отформатировано;
2. `go vet -tags solution ./...` и `go test -tags solution -count=1 ./...` — эталоны корректны;
3. `go vet ./...` (без тега) — заготовки компилируются (ловит рассинхрон сигнатур заготовка/эталон/тест);
4. шаг «Заготовки ещё не решены» — untagged-тесты каждого пакета ДОЛЖНЫ падать (ловит решение, протёкшее в файл-заготовку).

Перед коммитом локально прогоняй `gofmt -l exercises`, `go test -tags solution -count=1 ./...`
(из `exercises/`), `mdbook build` и `node scripts/check-links.js` (из корня) — это ровно то,
что проверит CI.

В корне есть `go.work` (`use ./exercises`) — он нужен только для IDE/gopls, чтобы при открытии
корня репозитория модуль из `exercises/` был виден (иначе gopls ругается «module not in workspace»).

## Покрытие тренажёра

Тренажёр покрывает все паттерны книги (**64 пакета** — продвинутые графы разбиты на
`dijkstra`/`bellmanford`/`astar`/`mst`, связность — `scc`; конкурентность —
`parallel*`/`wordcount`; потоки — `maxflow`; дискретная математика —
`combinatorics`/`sampling`). Пакеты главы «Комбинации паттернов» (все 7 связок): `lru`, `wordladder`,
`alienorder`, `meetingrooms`, `serializetree`, `skyline`, `designtwitter` + `listcrud` (CRUD
односвязного списка). «Боевые мини-проекты» (флагманы, паттерн- + прод-версия в одном пакете):
`ratelimiter`, `streamstats`, `leaderboard`, `cache`. Список функций каждого пакета — в
`exercises/README.md`. При добавлении/удалении пакета обнови это число (проверка:
`ls -d exercises/*/ | grep -v cmd | wc -l`).
