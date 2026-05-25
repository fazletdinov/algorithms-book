# Trie (Префиксное дерево)

## Описание шаблона

**Trie** (префиксное дерево, бор) — это древовидная структура для хранения набора строк,
где **каждый узел соответствует символу**, а путь от корня до узла образует префикс.
Строки с общим префиксом разделяют общий путь, поэтому Trie особенно эффективен для
операций «по префиксу».

В отличие от хеш-таблицы, Trie даёт не только проверку «есть ли слово», но и
«есть ли слова с таким префиксом» — за время, пропорциональное длине запроса, **не**
зависящее от числа хранимых строк.

## Когда применять

- **Автодополнение** и подсказки по префиксу.
- **Проверка словаря**: быстро узнать, есть ли слово/префикс.
- **Поиск множества образцов** в тексте одновременно.
- Задачи на сетках со словарём (Word Search II) и на XOR-максимум (бинарный Trie).

## Структура и операции

Для строчных латинских букв узел хранит до 26 ссылок на детей и флаг «здесь кончается
слово».

```go
type Trie struct {
    children [26]*Trie
    isEnd    bool // в этом узле заканчивается какое-то вставленное слово
}

func NewTrie() *Trie { return &Trie{} }

// Insert добавляет слово, создавая недостающие узлы по пути.
func (t *Trie) Insert(word string) {
    node := t
    for i := 0; i < len(word); i++ {
        c := word[i] - 'a'
        if node.children[c] == nil {
            node.children[c] = &Trie{}
        }
        node = node.children[c]
    }
    node.isEnd = true
}

// find возвращает узел, соответствующий строке s, или nil.
func (t *Trie) find(s string) *Trie {
    node := t
    for i := 0; i < len(s); i++ {
        c := s[i] - 'a'
        if node.children[c] == nil {
            return nil
        }
        node = node.children[c]
    }
    return node
}

// Search: слово есть, если путь существует И в конце стоит флаг isEnd.
func (t *Trie) Search(word string) bool {
    node := t.find(word)
    return node != nil && node.isEnd
}

// StartsWith: достаточно, чтобы существовал путь префикса.
func (t *Trie) StartsWith(prefix string) bool {
    return t.find(prefix) != nil
}
```

> ⚠️ Разница между `Search` и `StartsWith` — только в проверке `isEnd`. Без флага вы не
> отличите вставленное слово `"app"` от просто префикса слова `"apple"`.

## Временная и пространственная сложность

| Операция            | Время | Память                              |
|---------------------|-------|-------------------------------------|
| Insert / Search / StartsWith | O(L) | —                          |
| Хранение N слов     | —     | O(ALPHABET · N · L) в худшем случае |

`L` — длина строки запроса. Время **не зависит** от числа хранимых слов — это главное
преимущество перед перебором словаря. Платим памятью: каждый узел держит массив ссылок
(для разреженных алфавитов используют `map[byte]*Trie` вместо массива).

## Типичные ошибки

1. **Забыли флаг `isEnd`** — тогда `Search` неотличим от `StartsWith`.
2. **Массив фиксированного размера для большого алфавита** — для Unicode/смешанных
   символов берите `map[rune]*Trie`.
3. **Не проверяют `nil`-ребёнка** перед переходом — паника.
4. **Удаление узлов** реализуют небрежно: нельзя удалять узел, у которого остались дети
   или который является концом другого слова.

## Примеры задач на LeetCode

- [Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/)
- [Design Add and Search Words Data Structure](https://leetcode.com/problems/design-add-and-search-words-data-structure/) — Trie с `.` (wildcard)
- [Word Search II](https://leetcode.com/problems/word-search-ii/) — Trie + DFS по сетке
- [Maximum XOR of Two Numbers in an Array](https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/) — бинарный Trie

## Упражнения

В [Go-тренажёре](https://github.com/fazletdinov/algorithms-book/tree/main/exercises)
есть пакет `trie`:

```bash
cd exercises
go test ./trie/                 # ваши решения
go test -tags solution ./trie/  # эталон
```

Реализуйте методы `Insert`, `Search` и `StartsWith` структуры `Trie`.

## Связанные шаблоны

- **[Tree DFS](tree-dfs.md)** — Trie это дерево; обход по нему — тот же DFS.
- **[Строковые алгоритмы](string-algorithms.md)** — Trie позволяет искать сразу
  множество образцов.
- **[Backtracking](backtracking.md)** — Word Search II = backtracking по сетке с
  отсечением через Trie.
