# 🌿 Trie (Префиксное дерево)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Trie <span class="algo-hero__ru">Префиксное дерево</span></div>
    <div class="algo-hero__tag">Хранение строк по символам: поиск слова/префикса за O(L)</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Поиск</span><b>O(L)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(Σ·N·L)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>автодополнение и подсказки по <b>префиксу</b></li>
      <li>проверка словаря: есть ли слово / префикс</li>
      <li>поиск множества образцов в тексте одновременно</li>
      <li>сетки со словарём (Word Search II), XOR-максимум (бинарный Trie)</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>нужна только проверка «есть ли слово» без префиксов → хеш-множество</li>
      <li>строк мало и они короткие — оверхед не оправдан</li>
      <li>огромный алфавит и массив на 26 — берите <code>map</code></li>
      <li>данные не строковые</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«префикс», «автодополнение», «словарь слов», «начинается с»</b> · много строк с общими началами · поиск нескольких образцов сразу.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li>каждый <b>узел = символ</b>, путь от корня = префикс; общие префиксы делят путь;</li>
      <li>флаг <b>isEnd</b> отмечает конец вставленного слова;</li>
      <li><code>Search</code> = путь существует <b>И</b> <code>isEnd</code>; <code>StartsWith</code> = путь существует;</li>
      <li>время поиска зависит от длины запроса <b>L</b>, а не от числа слов.</li>
    </ul>
    <p>Без <code>isEnd</code> не отличишь слово <code>"app"</code> от префикса слова <code>"apple"</code>.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация.** В дерево вставлены слова cat, car, card, dog, do (узлы с
> двойной рамкой — концы слов). Поиск «car» спускается по дереву символ за символом. Справа — код
> с подсветкой строки и переменные, внизу — кликабельные шаги. Можно подставить свои слова и запрос.
> (Виджет работает в собранной книге `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="trie-search" data-words="cat,car,card,dog,do" data-query="car"></div>

## ⚡ Шаблон для собеседования

```go
type Trie struct {
    children [26]*Trie
    isEnd    bool
}

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

func (t *Trie) Search(word string) bool {
    node := t
    for i := 0; i < len(word); i++ {
        c := word[i] - 'a'
        if node.children[c] == nil {
            return false
        }
        node = node.children[c]
    }
    return node.isEnd // путь есть; это слово?
}
```

1. для каждого символа — переход к ребёнку (создаём при вставке);
2. конец слова помечаем `isEnd = true`;
3. `Search` требует и путь, и `isEnd`; `StartsWith` — только путь.

## 📖 Разбор

<details class="algo-details">
<summary>Структура, операции и сложность</summary>

**Trie** (бор) — дерево для хранения строк, где каждый узел соответствует символу, а путь
от корня образует префикс. Строки с общим префиксом разделяют путь. В отличие от
хеш-таблицы, Trie отвечает не только «есть ли слово», но и «есть ли слова с таким
префиксом» — за время длины запроса, **не** зависящее от числа строк.

```go
func NewTrie() *Trie { return &Trie{} }

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

func (t *Trie) Search(word string) bool   { node := t.find(word); return node != nil && node.isEnd }
func (t *Trie) StartsWith(prefix string) bool { return t.find(prefix) != nil }
```

> ⚠️ Разница между `Search` и `StartsWith` — только в проверке `isEnd`. Без флага вы не
> отличите вставленное слово `"app"` от префикса слова `"apple"`.

#### Сложность

| Операция            | Время | Память                              |
|---------------------|-------|-------------------------------------|
| Insert / Search / StartsWith | O(L) | —                          |
| Хранение N слов     | —     | O(ALPHABET · N · L) в худшем случае |

`L` — длина запроса. Время **не зависит** от числа хранимых слов. Для разреженных
алфавитов используют `map[byte]*Trie` вместо массива.

</details>

## 🧠 Почему это корректно

### Два независимых условия «слово хранится»

Инвариант бора: строка `w` **хранится** тогда и только тогда, когда выполнены *оба*
условия —

1. **путь** из символов `w` существует от корня (значит `w` — префикс какого-то
   вставленного слова);
2. **финальный узел помечен** `isEnd` (значит вставлено именно `w`, а не только его
   продолжение).

Отсюда и разница операций: `Search(w)` требует `node != nil && node.isEnd` (оба
условия), `StartsWith(p)` — только существование пути (условие 1). Без флага `isEnd`
нельзя отличить «вставили `app`» от «`app` — лишь префикс `apple`»: `Search("app")`
ошибочно вернул бы `true`. Это не деталь реализации, а часть определения корректности.

### Почему `O(L)` не зависит от числа слов

Поиск проходит ровно `L` рёбер (по одному на символ запроса), каждый шаг — `O(1)`
(индексация массива детей). Сколько слов уже в боре — неважно: общие префиксы лишь
делят узлы, но не удлиняют путь. Число слов влияет на **память**, а не на время поиска.

## ⚙️ Цена на практике

### Массив `[26]` против `map` детей

- `children [26]*Trie` — доступ за `O(1)`, плотная память, дружелюбно к кэшу, но
  **ALPHABET указателей на каждый узел** (расточительно для разреженного или большого
  алфавита, например Unicode);
- `map[byte]*Trie` — память пропорциональна реальному числу детей, но хеширование на
  каждом шаге медленнее.

Выбор — по размеру и плотности алфавита. Для ASCII-задач LeetCode массив почти всегда
лучше.

### Trie или хеш-множество?

Для **точного членства** хеш-сет проще и тоже `O(L)` (хеш строки и так считается за
`O(L)`). Бор берут, когда нужны **префиксные** операции: автодополнение, `startsWith`,
поиск самого длинного префикса, поиск слов на доске. Доставать trie ради обычного
«есть/нет» — лишняя сложность.

### Память и погоня за указателями

Главная цена бора — **память**: `O(ALPHABET · N · L)` в худшем случае. Плюс обход
прыгает по указателям (промахи кэша) в отличие от непрерывной структуры. Для огромных
словарей помогает **сжатый (radix) бор** — слить цепочки узлов с единственным ребёнком,
это режет и узлы, и прыжки.

## ⚠️ Типичные ошибки

1. **Забыли флаг `isEnd`** — тогда `Search` неотличим от `StartsWith`.
2. **Массив фиксированного размера для большого алфавита** — для Unicode берите `map[rune]*Trie`.
3. **Не проверяют `nil`-ребёнка** перед переходом — паника.
4. **Удаление узлов** реализуют небрежно: нельзя удалять узел, у которого остались дети или который конец другого слова.

## 🧩 Задачи

**LeetCode:**

- [Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/)
- [Design Add and Search Words Data Structure](https://leetcode.com/problems/design-add-and-search-words-data-structure/) — Trie с `.` (wildcard)
- [Word Search II](https://leetcode.com/problems/word-search-ii/) — Trie + DFS по сетке
- [Maximum XOR of Two Numbers in an Array](https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/) — бинарный Trie

**Тренажёр** — пакет `trie`:

```bash
cd exercises
go test ./trie/                 # ваши решения
go test -tags solution ./trie/  # эталон
```

Реализуйте методы структуры `Trie`: `Insert`, `Search`, `StartsWith`, `Delete` (удаление с обрезкой) и `WordsWithPrefix` (слова по префиксу).

## 🔗 Связанные шаблоны

- **[Tree DFS](tree-dfs.md)** — Trie это дерево; обход по нему — тот же DFS.
- **[Строковые алгоритмы](string-algorithms.md)** — Trie ищет сразу множество образцов.
- **[Backtracking](backtracking.md)** — Word Search II = backtracking по сетке с отсечением через Trie.
