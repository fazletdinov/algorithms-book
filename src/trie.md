# 🌿 Trie: разбор задач

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Trie <span class="algo-hero__ru">Префиксное дерево</span></div>
    <div class="algo-hero__tag">Применяем готовый бор к задачам: поиск по префиксу, словари, XOR</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Поиск</span><b>O(L)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(Σ·N·L)</b></div>
  </div>
</div>

> 📦 **Эта глава опирается на структуру.** Устройство бора, `Insert`/`Search`/`StartsWith`,
> инвариант `isEnd` и цена на практике разобраны в главе
> [«Trie: устройство и построение»](trie-structure.md) — пройди её и реализуй пакет `trie` в
> тренажёре прежде, чем браться за задачи ниже. Здесь мы считаем бор уже знакомым инструментом
> и сосредоточимся на том, *что на нём решают*.

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Что держим в голове из прошлой главы</div>
    <ul>
      <li>узел = символ (позиция в массиве детей), путь от корня = префикс;</li>
      <li><code>Search</code> = путь существует <b>И</b> <code>isEnd</code>; <code>StartsWith</code> = только путь;</li>
      <li>спуск идёт по символам слова по одному разу — время <code>O(L)</code>, не зависит от числа слов.</li>
    </ul>
  </div>
</div>

## 📝 Разбор задачи

Пройдём путь от наивного решения к оптимальному так, как стоит рассуждать на
собеседовании: сначала рабочий перебор, затем понимание, *почему* он медленный, и
только потом бор.

> **Задача (Replace Words).** Дан словарь **корней** `dict` и предложение `sentence`.
> Если слово предложения начинается с корня из словаря — замени его на этот корень;
> если подходит несколько корней, бери **самый короткий**. Слова без корня оставь как есть.
> Пример: `dict = ["cat","bat","rat"]`, `sentence = "the cattle was rattled by the battery"` →
> `"the cat was rat by the bat"`.

**Шаг 1. Наивно: для каждого слова проверять все префиксы против множества — O(W · L²).**

```go
func replaceWordsNaive(dict []string, sentence string) string {
    set := make(map[string]bool, len(dict))
    for _, r := range dict {
        set[r] = true
    }
    words := strings.Split(sentence, " ")
    for i, w := range words {
        for j := 1; j <= len(w); j++ {
            if set[w[:j]] {       // первый найденный префикс — он же кратчайший
                words[i] = w[:j]
                break
            }
        }
    }
    return strings.Join(words, " ")
}
```

Это **работает и проходит тесты**, но для слова длины `L` строит и хеширует `L`
префиксов (`w[:j]` — это срез, хеш строки считается за O(длины), отсюда `L²` на слово).
Каждое слово стартует с нуля, хотя корни словаря многократно делят общие начала — вот
эта повторная работа и есть то, что убирает бор.

**Шаг 2. Ключевое наблюдение.** «Начинается с корня» — это в точности запрос по
**префиксу**, а спуск по бору проходит символы слова **по одному разу**: на каждом
шаге одно обращение по индексу, без построения подстрок и без хеширования. Как только
на пути встретился узел с `isEnd` — это и есть **кратчайший** корень-префикс (мы идём
от начала слова, поэтому первый встреченный конец корня — самый короткий). Время не
зависит от размера словаря — см. [«Почему `O(L)` не зависит от числа
слов»](trie-structure.md#почему-ol-не-зависит-от-числа-слов).

**Шаг 3. Оптимум: бор из корней + спуск до первого `isEnd` — O(суммарной длины).**

Бор строим методом `Insert` из [главы про устройство](trie-structure.md#-строим-бор-insert-символ-за-символом);
добавляем лишь поиск кратчайшего корня (переиспользуя инвариант «путь существует **И** `isEnd`»):

```go
// shortestRoot спускается по символам word и возвращает первый корень-префикс
// (узел с isEnd); если корня нет — само слово без изменений.
func (t *Trie) shortestRoot(word string) string {
    node := t
    for i := 0; i < len(word); i++ {
        c := word[i] - 'a'
        if node.children[c] == nil {
            return word            // путь оборвался — корня нет
        }
        node = node.children[c]
        if node.isEnd {
            return word[:i+1]      // первый конец корня = кратчайший
        }
    }
    return word
}

func replaceWords(dict []string, sentence string) string {
    root := &Trie{}
    for _, r := range dict {
        root.Insert(r)
    }
    words := strings.Split(sentence, " ")
    for i, w := range words {
        words[i] = root.shortestRoot(w)
    }
    return strings.Join(words, " ")
}
```

Прогоните спуск `shortestRoot("cattle")` по бору с корнями `cat`, `bat`, `rat`: подсветка
идёт по символам, и на узле `t` (конец корня `cat`) спуск останавливается — это первый, а
значит кратчайший корень-префикс, до конца слова идти не пришлось:

<div class="algo-viz" data-viz="trie-shortest-root" data-words="cat,bat,rat" data-query="cattle"></div>

**Шаг 4. Трассировка** спуска `shortestRoot("cattle")` по бору с корнями
`cat`, `bat`, `rat` (показана только ветка `c→a→t`):

| `i` | символ | перешли в узел | `isEnd`? | действие |
|-----|--------|----------------|----------|----------|
| 0   | `c`    | `c`            | нет      | идём глубже |
| 1   | `a`    | `c→a`          | нет      | идём глубже |
| 2   | `t`    | `c→a→t`        | **да**   | вернуть `word[:3]` = `"cat"` |

Спуск остановился на 3-м символе из 6 — до конца слова идти не пришлось. Аналогично
`"rattled"`→`"rat"`, `"battery"`→`"bat"`; слова без корня (`the`, `was`, `by`)
возвращаются как есть. Итог — `"the cat was rat by the bat"`. Если бы в словарь
добавили и `catt`, и `cat`, спуск всё равно остановился бы раньше — на `cat`, потому
что его `isEnd` встречается первым.

## 🧩 Задачи

**LeetCode:**

- [Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/)
- [Design Add and Search Words Data Structure](https://leetcode.com/problems/design-add-and-search-words-data-structure/) — Trie с `.` (wildcard)
- [Word Search II](https://leetcode.com/problems/word-search-ii/) — Trie + DFS по сетке
- [Maximum XOR of Two Numbers in an Array](https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/) — бинарный Trie

**Тренажёр** — пакет `trie` (реализуется в [главе про устройство](trie-structure.md#-тренажёр-собери-структуру-сам)):

```bash
cd exercises
go test ./trie/                 # ваши решения
go test -tags solution ./trie/  # эталон
```

## 🔗 Связанные шаблоны

- **[Trie: устройство и построение](trie-structure.md)** — как устроен и строится сам бор.
- **[Tree DFS](tree-dfs.md)** — Trie это дерево; обход по нему — тот же DFS.
- **[Строковые алгоритмы](string-algorithms.md)** — Trie ищет сразу множество образцов.
- **[Backtracking](backtracking.md)** — Word Search II = backtracking по сетке с отсечением через Trie.
