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

## Зачем build-теги?

Заготовка (`//go:build !solution`) и эталон (`//go:build solution`) объявляют
функции с одинаковыми именами, но компилируются взаимоисключающе — поэтому
конфликта нет, а тесты одни и те же служат спецификацией для обоих вариантов.

## Доступные шаблоны

| Пакет           | Функции                                      |
|-----------------|----------------------------------------------|
| `slidingwindow` | `MaxSumSubarray`, `LongestSubstringKDistinct`|
| `twopointers`   | `PairWithTargetSum`, `RemoveDuplicates`      |
| `binarysearch`  | `Search`, `FindCeiling`                      |
| `cyclicsort`    | `CyclicSort`, `FindMissingNumber`            |
| `backtracking`  | `Permutations`, `GenerateParentheses`        |
| `treebfs`       | `LevelOrder`                                 |
| `linkedlist`    | `ReverseList`                                |
| `graphs`        | `CountComponents`, `HasCycleUndirected`      |
| `grids`         | `NumIslands`                                 |
| `dijkstra`      | `ShortestPath`                               |
| `bellmanford`   | `ShortestPath` (отрицательные веса)          |
| `astar`         | `ShortestPath` (поиск на сетке с эвристикой) |
| `mst`           | `MSTWeight` (Краскал)                        |
| `dp`            | `ClimbStairs`, `CoinChange`, `LongestCommonSubsequence` |

## Как добавить свой шаблон

1. Создайте папку `mypattern/`.
2. Добавьте три файла по образцу любого пакета:
   - `mypattern.go` — заготовки, тег `//go:build !solution`;
   - `mypattern_solution.go` — эталон, тег `//go:build solution`;
   - `mypattern_test.go` — табличные тесты (без build-тега).
3. Проверьте: `go test ./mypattern/` (красные) и
   `go test -tags solution ./mypattern/` (зелёные).
