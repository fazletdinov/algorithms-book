# 🧬 Комбинации паттернов: задачи, где работает несколько техник

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Combinations <span class="algo-hero__ru">Комбинации паттернов</span></div>
    <div class="algo-hero__tag">Реальная задача с доски редко = один паттерн. Учимся раскладывать её на знакомые части</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Разборов</span><b>7</b></div>
    <div class="algo-hero__metric"><span>Паттернов в связке</span><b>2–3</b></div>
  </div>
</div>

> 📦 **Эта глава — мостик, а не новый паттерн.** Все техники ниже уже разобраны в своих
> главах; здесь мы не вводим ничего нового, а тренируем главный навык собеседования —
> **узнать в незнакомой задаче связку из 2–3 знакомых паттернов** и собрать решение из
> готовых деталей. Пройди сначала главы-паттерны, на которые ссылается каждый разбор.

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Как раскладывать задачу на паттерны</div>
    <ul>
      <li><b>«быстрый доступ по ключу»</b> → хеш-таблица (часто как «индекс» поверх другой структуры);</li>
      <li><b>«кратчайший путь по равным шагам»</b> → BFS; <b>«порядок при зависимостях»</b> → topo-sort;</li>
      <li><b>«всё время нужен текущий минимум/максимум»</b> → куча;</li>
      <li><b>«слить K отсортированных потоков»</b> → K-way merge кучей их голов;</li>
      <li><b>«события на прямой по координате»</b> → сортировка + проход (sweep line).</li>
    </ul>
    <p>Связка возникает, когда одного паттерна мало: один даёт <i>структуру</i> данных,
    второй — <i>порядок обработки</i>.</p>
  </div>
</div>

---

## 1. LRU Cache — хеш-таблица + двусвязный список

> **Задача.** Спроектируй кэш на `capacity` элементов с операциями `Get(key)` и
> `Put(key, value)` **за O(1)**. При переполнении вытесняется *давно не используемый*
> (least recently used) элемент. Любое обращение делает элемент «свежим».

**Почему два паттерна.** Нужны одновременно два свойства, которых нет ни у одной
структуры по отдельности:

- **O(1) доступ по ключу** — это [хеш-таблица](hash-table-structure.md);
- **O(1) переупорядочивание** «подвинуть элемент в начало», «выкинуть с конца» — это
  [двусвязный список](linked-list-structure.md) (в массиве сдвиг стоил бы O(n)).

Связка: хеш-таблица хранит `key → *узел списка`, а сам порядok свежести держит список.
Map даёт «где элемент», список — «насколько он свежий».

```go
type Node struct {
    key, val   int
    prev, next *Node
}

type LRUCache struct {
    cap        int
    m          map[int]*Node
    head, tail *Node // фиктивные границы: head.next — самый свежий, tail.prev — самый старый
}

func Constructor(capacity int) LRUCache {
    head, tail := &Node{}, &Node{}
    head.next, tail.prev = tail, head
    return LRUCache{cap: capacity, m: make(map[int]*Node), head: head, tail: tail}
}

func (c *LRUCache) remove(n *Node) { n.prev.next, n.next.prev = n.next, n.prev }

func (c *LRUCache) addFront(n *Node) {
    n.prev, n.next = c.head, c.head.next
    c.head.next.prev = n
    c.head.next = n
}

func (c *LRUCache) Get(key int) int {
    n, ok := c.m[key]
    if !ok {
        return -1
    }
    c.remove(n)
    c.addFront(n) // обращение делает узел свежим
    return n.val
}

func (c *LRUCache) Put(key, value int) {
    if n, ok := c.m[key]; ok {
        n.val = value
        c.remove(n)
        c.addFront(n)
        return
    }
    if len(c.m) == c.cap {
        lru := c.tail.prev // самый старый — перед хвостом
        c.remove(lru)
        delete(c.m, lru.key)
    }
    n := &Node{key: key, val: value}
    c.m[key] = n
    c.addFront(n)
}
```

> ⚠️ Узел хранит **и `key`, и `val`**. `val` нужен для `Get`, а `key` — чтобы при
> вытеснении `tail.prev` знать, *что удалить из map*. Без `key` в узле вытеснение
> деградирует до O(n) поиска по map.

**Трассировка** (`capacity = 2`). Список показан от свежего к старому:

| операция     | map        | список (свежий→старый) | результат |
|--------------|------------|------------------------|-----------|
| `Put(1,1)`   | {1}        | `1`                    |           |
| `Put(2,2)`   | {1,2}      | `2 1`                  |           |
| `Get(1)`     | {1,2}      | `1 2`                  | `1` (1 стал свежим) |
| `Put(3,3)`   | {1,3}      | `3 1`                  | вытеснен `2` (был старейшим) |
| `Get(2)`     | {1,3}      | `3 1`                  | `-1` |

Ключевой момент — `Get(1)` переставил `1` вперёд, поэтому при `Put(3,3)` вылетел
именно `2`, а не `1`.

---

## 2. Word Ladder — BFS + хеш-множество

> **Задача.** Дано `beginWord`, `endWord` и словарь. За один шаг можно изменить **одну
> букву**, и полученное слово должно быть в словаре. Верни длину кратчайшей цепочки
> превращений (число слов в ней) или 0, если её нет.
> Пример: `hit → hot → dot → dog → cog` = 5.

**Почему два паттерна.** «Кратчайшая цепочка, где каждый шаг одинаково стоит 1» — это
буквально определение [BFS](graphs.md): слова — вершины, ребро — «отличаются одной
буквой». Граф нам никто не даёт явно — его **рёбра порождаются на лету**, а чтобы за
O(1) проверять «есть ли такое слово» и «не посещали ли уже», нужна
[хеш-таблица-множество](hash-table-structure.md).

**Наблюдение, экономящее память.** Не строим граф заранее (это O(N²) сравнений). Для
слова длины `L` перебираем `L·25` соседей-кандидатов и проверяем их по множеству за
O(L). Посещённость отмечаем **удалением из словаря** — тогда не нужен отдельный `visited`.

```go
func ladderLength(beginWord, endWord string, wordList []string) int {
    dict := make(map[string]bool, len(wordList))
    for _, w := range wordList {
        dict[w] = true
    }
    if !dict[endWord] {
        return 0
    }
    queue := []string{beginWord}
    steps := 1
    for len(queue) > 0 {
        next := []string{}
        for _, w := range queue {
            if w == endWord {
                return steps
            }
            b := []byte(w)
            for i := 0; i < len(b); i++ {
                orig := b[i]
                for ch := byte('a'); ch <= 'z'; ch++ {
                    b[i] = ch
                    if cand := string(b); dict[cand] {
                        delete(dict, cand) // помечаем посещённым, удаляя из словаря
                        next = append(next, cand)
                    }
                }
                b[i] = orig
            }
        }
        queue = next
        steps++ // перешли на следующий уровень = +1 слово в цепочке
    }
    return 0
}
```

Обход по уровням (вершины: `0=hit, 1=hot, 2=dot, 3=dog, 4=lot, 5=log, 6=cog`): BFS
расходится волной от `hit`, и `cog` достигается за 5 слоёв — это и есть длина цепочки.

<div class="algo-viz" data-viz="graph-bfs" data-nodes="0,1,2,3,4,5,6" data-edges="0-1,1-2,1-4,2-3,4-5,3-6,5-6" data-start="0"></div>

> ⚠️ Удалять кандидата из словаря нужно **сразу при добавлении в очередь**, а не при
> извлечении. Иначе одно слово попадёт в очередь несколько раз с разных вершин одного
> слоя — и сложность взорвётся.

---

## 3. Alien Dictionary — граф из строк + топологическая сортировка

> **Задача.** Дан список слов, отсортированный по правилам **неизвестного** алфавита.
> Восстанови порядок букв. Пример: `["wrt","wrf","er","ett","rftt"]` → `"wertf"`.

**Почему два паттерна.** Порядок букв — это [топологическая
сортировка](topological-sort.md): «буква A раньше буквы B» — ребро A→B. Но граф **не
дан** — его сначала надо **построить из соседних слов**: первая позиция, где соседние
слова различаются, даёт одно ребро. То есть задача = «извлечь граф из данных» + «уложить
его в порядок».

```go
func alienOrder(words []string) string {
    adj := make(map[byte]map[byte]bool)
    indeg := make(map[byte]int)
    for _, w := range words { // все буквы попадают в граф, даже изолированные
        for i := 0; i < len(w); i++ {
            if adj[w[i]] == nil {
                adj[w[i]] = make(map[byte]bool)
            }
            if _, ok := indeg[w[i]]; !ok {
                indeg[w[i]] = 0
            }
        }
    }
    for i := 0; i+1 < len(words); i++ {
        a, b := words[i], words[i+1]
        if len(a) > len(b) && a[:len(b)] == b {
            return "" // "abc" перед "ab" — невозможный словарь
        }
        for j := 0; j < len(a) && j < len(b); j++ {
            if a[j] != b[j] {
                if !adj[a[j]][b[j]] {
                    adj[a[j]][b[j]] = true
                    indeg[b[j]]++ // нашли первое различие — одно ребро, дальше выходим
                }
                break
            }
        }
    }
    // Kahn: буквы с нулевой входящей степенью идут первыми
    queue := []byte{}
    for ch, d := range indeg {
        if d == 0 {
            queue = append(queue, ch)
        }
    }
    res := []byte{}
    for len(queue) > 0 {
        ch := queue[0]
        queue = queue[1:]
        res = append(res, ch)
        for nb := range adj[ch] {
            if indeg[nb]--; indeg[nb] == 0 {
                queue = append(queue, nb)
            }
        }
    }
    if len(res) != len(indeg) {
        return "" // остались буквы со входящими рёбрами = цикл = противоречие
    }
    return string(res)
}
```

Топологический разбор графа из примера (рёбра `t→f`, `w→e`, `r→t`, `e→r`): Kahn снимает
буквы с нулевой входящей степенью слой за слоем — это и даёт алфавит:

<div class="algo-viz" data-viz="topo-kahn" data-nodes="w,e,r,t,f" data-edges="t-f,w-e,r-t,e-r"></div>

> ⚠️ Два подводных камня: (1) **префиксный конфликт** `["abc","ab"]` — невозможный
> словарь, не пропусти проверку; (2) порядок обхода `map` в Go **недетерминирован** —
> при нескольких валидных алфавитах ответ может отличаться от запуска к запуску. Если
> нужен стабильный/лексикографически минимальный — замени очередь на
> [кучу](heap-structure.md) (мини-комбинация поверх этой).

---

## 4. Serialize / Deserialize Binary Tree — DFS + парсинг

> **Задача.** Преврати произвольное бинарное дерево в строку и восстанови его обратно.
> `serialize(deserialize(s))` должно давать ту же строку.

**Почему два паттерна.** Сериализация — это [DFS-обход](tree-dfs.md) (прямой порядок:
корень → лево → право) с **явной записью пустых узлов** (`#`). А десериализация —
рекурсивный спуск по тому же порядку, потребляющий токены из потока: ту же рекурсию DFS
мы «проигрываем задом наперёд». Маркеры `null` критичны — без них по одному обходу форму
дерева не восстановить.

```go
type TreeNode struct {
    Val         int
    Left, Right *TreeNode
}

func serialize(root *TreeNode) string {
    var sb strings.Builder
    var dfs func(*TreeNode)
    dfs = func(n *TreeNode) {
        if n == nil {
            sb.WriteString("# ") // явный маркер пустоты — ключ к восстановлению формы
            return
        }
        sb.WriteString(strconv.Itoa(n.Val))
        sb.WriteByte(' ')
        dfs(n.Left)
        dfs(n.Right)
    }
    dfs(root)
    return sb.String()
}

func deserialize(data string) *TreeNode {
    tokens := strings.Fields(data)
    i := 0
    var build func() *TreeNode
    build = func() *TreeNode {
        tok := tokens[i]
        i++
        if tok == "#" {
            return nil
        }
        val, _ := strconv.Atoi(tok)
        n := &TreeNode{Val: val}
        n.Left = build()  // тот же порядок: сначала левое поддерево...
        n.Right = build() // ...затем правое — токены идут ровно как при serialize
        return n
    }
    return build()
}
```

Порядок обхода (он же порядок токенов в строке) для дерева-примера — прямой DFS:

<div class="algo-viz" data-viz="tree-dfs" data-tree="1,2,3,null,null,4,5"></div>

> ⚠️ `serialize` и `deserialize` должны ходить **в одном и том же порядке**. Если
> сериализуешь pre-order, то и восстанавливай pre-order — иначе токены «разъедутся».
> Общий индекс `i` (замыкание) играет роль курсора по потоку токенов.

---

## 5. Meeting Rooms II — сортировка + мин-куча

> **Задача.** Дан список интервалов встреч `[начало, конец]`. Сколько минимум нужно
> переговорок, чтобы ни одна встреча не пересеклась во времени? Пример:
> `[[0,30],[5,10],[15,20]]` → `2`.

**Почему два паттерна.** Обрабатывать встречи надо в порядке начала — это **сортировка**.
А чтобы решить «освободилась ли какая-то комната к моменту начала очередной встречи»,
нужен **самый ранний из текущих концов** — то есть [мин-куча](heap-structure.md) времён
освобождения. Сортировка задаёт *порядок обработки*, куча хранит *активное состояние*.

```go
func minMeetingRooms(intervals [][]int) int {
    if len(intervals) == 0 {
        return 0
    }
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i][0] < intervals[j][0] // по времени начала
    })
    h := &minHeap{} // в куче — времена окончания занятых комнат
    heap.Init(h)
    for _, iv := range intervals {
        if h.Len() > 0 && (*h)[0] <= iv[0] {
            heap.Pop(h) // самая ранняя встреча кончилась к началу текущей — переиспользуем комнату
        }
        heap.Push(h, iv[1])
    }
    return h.Len() // сколько комнат заняты одновременно в пике
}

type minHeap []int

func (h minHeap) Len() int            { return len(h) }
func (h minHeap) Less(i, j int) bool  { return h[i] < h[j] }
func (h minHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *minHeap) Push(x any)         { *h = append(*h, x.(int)) }
func (h *minHeap) Pop() any {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[:n-1]
    return x
}
```

Сердце решения — мин-куча: её вершина всегда даёт «комнату, которая освободится раньше
всех». Вот как куча отдаёт минимум при `Pop` (восстанавливая инвариант просеиванием):

<div class="algo-viz" data-viz="heap-pop" data-heap="5,10,15,30,20"></div>

> ⚠️ Сортировка **только по началу**. Сравнение `(*h)[0] <= iv[0]` — со старым (ещё не
> добавленным) концом; если поменять местами push и проверку, посчитаешь, что встреча
> освобождает комнату сама для себя.

---

## 6. Design Twitter — хеш-таблица + K-way merge

> **Задача.** Спроектируй ленту: `PostTweet`, `Follow`, `Unfollow` и `GetNewsFeed(user)`
> — 10 самых свежих твитов самого пользователя и тех, на кого он подписан.

**Почему два паттерна.** Связи «кто кого читает» и «чьи твиты» — это
[хеш-таблицы](hash-table-structure.md) (`user → []твит`, `user → множество подписок`).
Но лента — это слияние **нескольких уже отсортированных по времени** списков твитов в
один топ-10: классический [K-way merge](k-way-merge.md) кучей из «голов» списков. Хеши
дают *откуда брать потоки*, K-way merge — *как их слить по свежести*.

```go
type tweet struct{ time, id int }

type Twitter struct {
    clock   int
    tweets  map[int][]tweet      // user -> его твиты, по возрастанию времени
    follows map[int]map[int]bool // user -> на кого подписан
}

func Constructor() Twitter {
    return Twitter{tweets: map[int][]tweet{}, follows: map[int]map[int]bool{}}
}

func (t *Twitter) PostTweet(userId, tweetId int) {
    t.clock++
    t.tweets[userId] = append(t.tweets[userId], tweet{t.clock, tweetId})
}

func (t *Twitter) Follow(a, b int) {
    if t.follows[a] == nil {
        t.follows[a] = map[int]bool{}
    }
    t.follows[a][b] = true
}

func (t *Twitter) Unfollow(a, b int) { delete(t.follows[a], b) }

func (t *Twitter) GetNewsFeed(userId int) []int {
    users := []int{userId}
    for u := range t.follows[userId] {
        if u != userId {
            users = append(users, u)
        }
    }
    h := &feed{} // max-heap по времени: на вершине самый свежий твит среди голов
    for _, u := range users {
        if lst := t.tweets[u]; len(lst) > 0 {
            heap.Push(h, cursor{u, len(lst) - 1, lst[len(lst)-1]})
        }
    }
    res := []int{}
    for h.Len() > 0 && len(res) < 10 {
        c := heap.Pop(h).(cursor)
        res = append(res, c.tw.id)
        if c.i > 0 { // подтягиваем следующий по свежести твит того же автора
            lst := t.tweets[c.u]
            heap.Push(h, cursor{c.u, c.i - 1, lst[c.i-1]})
        }
    }
    return res
}

type cursor struct {
    u, i int
    tw   tweet
}
type feed []cursor

func (h feed) Len() int            { return len(h) }
func (h feed) Less(i, j int) bool  { return h[i].tw.time > h[j].tw.time } // max по времени
func (h feed) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *feed) Push(x any)         { *h = append(*h, x.(cursor)) }
func (h *feed) Pop() any {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[:n-1]
    return x
}
```

K-way merge: в куче всегда «головы» всех потоков, мы снимаем самую свежую и подтягиваем
следующую из того же потока — пока не наберём 10. Идея слияния K отсортированных списков:

<div class="algo-viz" data-viz="k-way-merge" data-lists="5,11;6,7,8;10,4"></div>

> ⚠️ В куче лежат **только головы** (по одному курсору на автора), а не все твиты сразу —
> поэтому размер кучи ≤ числа подписок, а не общего числа твитов. Это и есть выигрыш
> K-way merge над «собрать всё и отсортировать».

---

## 7. The Skyline Problem — sweep line + макс-куча (капстоун)

> **Задача.** Здания заданы как `[left, right, height]`. Верни силуэт города — список
> «ключевых точек» `[x, height]`, где высота крыши меняется. Это самая известная задача
> «на связку» и хороший финальный тест на распознавание.

**Почему два паттерна.** Силуэт меняется только в координатах краёв зданий — значит,
двигаемся по **событиям слева направо** (sweep line = сортировка + проход). А в каждой
точке нужна **максимальная высота среди зданий, накрывающих эту x** — это
[макс-куча](heap-structure.md) активных высот. Sweep задаёт *где смотреть*, куча отвечает
*какая сейчас высота*.

```go
func getSkyline(buildings [][]int) [][]int {
    type ev struct{ x, h int } // h<0 — вход здания (левый край), h>0 — выход (правый)
    var events []ev
    for _, b := range buildings {
        events = append(events, ev{b[0], -b[2]}, ev{b[1], b[2]})
    }
    sort.Slice(events, func(i, j int) bool {
        if events[i].x != events[j].x {
            return events[i].x < events[j].x
        }
        return events[i].h < events[j].h // при равном x: входы (отриц.) раньше выходов
    })

    h := &maxHeap{0} // 0 — уровень земли, всегда в куче
    toRemove := map[int]int{}
    prev := 0
    var res [][]int
    for _, e := range events {
        if e.h < 0 {
            heap.Push(h, -e.h) // здание началось — высота активна
        } else {
            toRemove[e.h]++ // здание кончилось — пометим к ленивому удалению
        }
        for h.Len() > 0 && toRemove[(*h)[0]] > 0 { // чистим вершину от «удалённых»
            toRemove[(*h)[0]]--
            heap.Pop(h)
        }
        if cur := (*h)[0]; cur != prev { // силуэт изменился — фиксируем точку
            res = append(res, []int{e.x, cur})
            prev = cur
        }
    }
    return res
}

type maxHeap []int

func (h maxHeap) Len() int            { return len(h) }
func (h maxHeap) Less(i, j int) bool  { return h[i] > h[j] }
func (h maxHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *maxHeap) Push(x any)         { *h = append(*h, x.(int)) }
func (h *maxHeap) Pop() any {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[:n-1]
    return x
}
```

**Трассировка** для `buildings = [[2,9,10],[3,7,15],[5,12,12]]`. Куча активных высот, на
вершине — текущая высота силуэта:

| событие | x | действие | куча активных | вершина | точка силуэта |
|---------|---|----------|---------------|---------|---------------|
| вход 10 | 2 | push 10  | {10,0}        | 10      | `[2,10]`      |
| вход 15 | 3 | push 15  | {15,10,0}     | 15      | `[3,15]`      |
| вход 12 | 5 | push 12  | {15,12,10,0}  | 15      | — (без изменений) |
| выход 15| 7 | удалить 15 | {12,10,0}   | 12      | `[7,12]`      |
| выход 10| 9 | удалить 10 | {12,0}      | 12      | — |
| выход 12| 12| удалить 12 | {0}         | 0       | `[12,0]`      |

Итог: `[[2,10],[3,15],[7,12],[12,0]]`. Заметь — на `x=5` и `x=9` вершина кучи не
поменялась, поэтому точек там нет: силуэт фиксируется только при смене максимума.

> ⚠️ Удалять из произвольного места `container/heap` напрямую не умеет — отсюда **ленивое
> удаление**: помечаем высоту в `toRemove` и снимаем её, лишь когда она всплывёт на
> вершину. Это типовой приём «куча + отложенное удаление», он же встречается в
> [Dijkstra](advanced-graph-algorithms.md).

---

## 🧠 Как это переносится на любую задачу

Один и тот же скелет рассуждения работал во всех семи разборах:

1. **Что спрашивают по сути?** «Кратчайший по равным шагам», «всё время нужен максимум»,
   «порядок при зависимостях» — это формулировка-триггер конкретного паттерна.
2. **Дана ли структура явно?** Часто нет — граф/потоки приходится **построить из входных
   данных** (рёбра из соседних слов, потоки из твитов автора). Это отдельный шаг.
3. **Чего не хватает основному паттерну?** Добавь второй: хеш — для O(1) доступа, куча —
   для «текущего экстремума», сортировка — для «порядка обработки».

Если на собеседовании задача «не похожа ни на что» — почти наверняка это **связка двух
знакомых**. Ищи, какой паттерн даёт *структуру*, а какой — *порядок обработки*.

## 🧩 Задачи

**LeetCode (на связки):**

- [LRU Cache](https://leetcode.com/problems/lru-cache/) — хеш + двусвязный список
- [Word Ladder](https://leetcode.com/problems/word-ladder/) — BFS + хеш-множество
- [Alien Dictionary](https://leetcode.com/problems/alien-dictionary/) — граф из строк + topo-sort
- [Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) — DFS + парсинг
- [Meeting Rooms II](https://leetcode.com/problems/meeting-rooms-ii/) — сортировка + мин-куча
- [Design Twitter](https://leetcode.com/problems/design-twitter/) — хеш + K-way merge
- [The Skyline Problem](https://leetcode.com/problems/the-skyline-problem/) — sweep line + макс-куча

**Тренажёр** — отдельного пакета у этой главы нет: каждая связка собирается из уже
реализованных. Прогони составляющие, прежде чем кодить комбинацию:

```bash
cd exercises
go test -tags solution ./linkedlist/ ./graphs/ ./toposort/ ./treedfs/ ./binheap/ ./kwaymerge/
```

## 🔗 Связанные шаблоны

- **[Хеш-таблица](hash-table-structure.md)** — «индекс» поверх любой структуры (LRU, Twitter).
- **[Графы (BFS/DFS)](graphs.md)** и **[Топологическая сортировка](topological-sort.md)** — Word Ladder, Alien Dictionary.
- **[Куча](heap-structure.md)**, **[Two Heaps](two-heaps.md)**, **[K-way Merge](k-way-merge.md)** — Meeting Rooms, Twitter, Skyline.
- **[Tree DFS](tree-dfs.md)** — сериализация дерева.
- **[Руководство по выбору шаблона](pattern-selection-guide.md)** — как распознать паттерн по формулировке.
