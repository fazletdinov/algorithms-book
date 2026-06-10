# 🐢 Fast & Slow Pointers (Быстрые и медленные указатели)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Fast &amp; Slow Pointers <span class="algo-hero__ru">Заяц и черепаха</span></div>
    <div class="algo-hero__tag">Циклы, середина и K-й с конца в связном списке за O(1) памяти</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Время</span><b>O(n)</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(1)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>связный список или переход «значение → следующее»</li>
      <li>определить наличие цикла или найти его начало</li>
      <li>найти середину списка / K-й узел с конца за один проход</li>
      <li>нужна <b>O(1)</b> памяти вместо хеш-множества посещённых</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>есть прямой доступ по индексу — проще обычные два указателя</li>
      <li>структура ветвится: дерево или граф</li>
      <li>важно хранить все посещённые узлы (логичнее хеш-множество)</li>
      <li>данные не образуют единую «цепочку переходов»</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«связный список»</b> + «цикл», «середина», «K-й с конца» · «заяц и черепаха» · «повторение в последовательности» (happy number) · просят <b>O(1) памяти</b>.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни</div>
    <ul>
      <li><b>fast</b> идёт вдвое быстрее <b>slow</b> (2 шага против 1);</li>
      <li>цикла нет → <b>fast упрётся в nil</b>;</li>
      <li>цикл есть → fast внутри кольца сокращает разрыв на 1 за шаг → <b>встреча гарантирована</b>;</li>
      <li>начало цикла: после встречи верни <b>slow в head</b>, двигай оба по 1 шагу — сойдутся на входе в цикл.</li>
    </ul>
    <p>Тот же приём ловит цикл в любой «функции перехода»: число → сумма квадратов цифр (happy number), индекс → <code>nums[индекс]</code> (поиск дубликата).</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация.** Нажимайте «▶»: синяя ячейка — `slow` (шаг 1),
> жёлтая — `fast` (шаг 2). Видно, как они встречаются внутри цикла. (Виджет работает в
> собранной книге `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<b>Обнаружение цикла</b> — `fast` (2 шага) догоняет `slow` (1 шаг) внутри кольца:

<div class="algo-viz" data-viz="list-cycle" data-list="1,2,3,4,5" data-cycle="2"></div>

<b>Середина списка</b> — тот же приём без цикла: когда `fast` дошёл до конца, `slow` ровно в центре:

<div class="algo-viz" data-viz="list-middle" data-list="1,2,3,4,5,6,7"></div>

## ⚡ Шаблон для собеседования

Канонический каркас «заяц и черепаха» — обнаружение цикла:

```go
slow, fast := head, head
for fast != nil && fast.Next != nil {
    slow = slow.Next      // на 1 шаг
    fast = fast.Next.Next // на 2 шага
    if slow == fast {     // встретились — цикл есть
        break
    }
}
// fast == nil || fast.Next == nil → цикла нет
```

1. оба стартуют из `head`;
2. `slow` на 1 шаг, `fast` на 2;
3. условие `fast != nil && fast.Next != nil` бережёт от разыменования `nil`;
4. встреча → цикл; выход из цикла по `nil` → цикла нет.

## 📖 Разбор

<details class="algo-details">
<summary>Теория, обнаружение/начало цикла, середина и сложность</summary>

**Fast & Slow Pointers** (алгоритм «заяц и черепаха», обнаружение циклов Флойда) —
два указателя движутся по структуре с разной скоростью: медленный на 1 шаг, быстрый
на 2. Если в списке есть цикл, быстрый рано или поздно догонит медленный внутри цикла;
если цикла нет — быстрый первым достигнет конца.

Техника даёт O(n) по времени и **O(1) по памяти** там, где наивный подход с хеш-таблицей
тратит O(n) дополнительной памяти.

#### Обнаружение цикла

Двигаем `slow` на шаг, `fast` на два. Совпадение указателей означает цикл; выход
`fast` в `nil` — цикла нет.

```go
type ListNode struct {
    Val  int
    Next *ListNode
}

func hasCycle(head *ListNode) bool {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
        if slow == fast {
            return true
        }
    }
    return false
}
```

#### Начало цикла

После встречи возвращаем `slow` в `head` и двигаем оба указателя по одному шагу:
точка их новой встречи — начало цикла. Это работает потому, что расстояние от головы
до начала цикла равно расстоянию от точки встречи до начала цикла.

```go
func detectCycle(head *ListNode) *ListNode {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
        if slow == fast {
            break
        }
    }
    if fast == nil || fast.Next == nil {
        return nil // цикла нет
    }
    slow = head
    for slow != fast {
        slow = slow.Next
        fast = fast.Next
    }
    return slow
}
```

#### Середина списка

Когда `fast` дойдёт до конца, `slow` окажется в середине.

```go
func middleNode(head *ListNode) *ListNode {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
    }
    return slow
}
```

#### Сложность

| Задача             | Время | Память |
|--------------------|-------|--------|
| Обнаружение цикла  | O(n)  | O(1)   |
| Начало цикла       | O(n)  | O(1)   |
| Середина списка    | O(n)  | O(1)   |

</details>

## 🧠 Почему это корректно

Три вопроса: почему указатели **обязательно встретятся**, почему быстрый не
«перепрыгивает» медленный, и почему формула начала цикла работает.

### Почему встреча гарантирована и без перепрыгивания

Когда оба внутри цикла, смотрим на **зазор** — на сколько `fast` впереди `slow` вдоль
цикла. За один шаг `fast` проходит +2, `slow` +1, значит зазор **меняется ровно на −1**
каждый шаг (по модулю длины цикла `L`). Величина, убывающая на 1 по модулю `L`,
обязательно станет `0` за ≤ `L` шагов → встреча. И ровно потому, что относительная
скорость **+1**, `fast` проходит через каждое значение зазора и **не может перескочить**
`slow` (перескок был бы при шаге ≥ +2 относительно).

Если цикла нет — `fast` первым упрётся в `nil` (он же быстрее), цикл `for` завершится.

### Вывод формулы начала цикла

Обозначим: `a` — расстояние от головы до начала цикла, `b` — от начала цикла до точки
встречи, `L` — длина цикла. К моменту встречи:

- `slow` прошёл `a + b`;
- `fast` прошёл `a + b + kL` (сделал `k` лишних кругов);
- и `fast` прошёл вдвое больше: `2(a + b) = a + b + kL`.

Отсюда `a + b = kL`, то есть **`a = (k−1)L + (L − b)`**. Значит, если пустить один
указатель из головы, а другой — из точки встречи, и двигать оба по шагу: за `a` шагов
первый дойдёт до начала цикла, а второй пройдёт `b + a = b + (k−1)L + (L−b) = kL ≡ 0`
вдоль цикла — то есть окажется **ровно в начале цикла**. Поэтому они встречаются именно
там. ∎

Попутно: `slow` до встречи делает **меньше одного круга** (зазор ≤ `L` убывает по
1/шаг), поэтому всё это `O(n)`.

## ⚙️ Цена на практике

### `O(1)` памяти — в этом весь смысл

Цикл легко найти и хеш-множеством посещённых узлов, но это `O(n)` памяти. Заяц и
черепаха дают тот же `O(n)` по времени при `O(1)` памяти — на собеседовании «а можешь
без доп. памяти?» это **ожидаемый** ответ, а не хеш-сет.

### Порядок проверки `fast != nil && fast.Next != nil`

Сначала `fast`, потом `fast.Next` — благодаря короткому замыканию `&&` не будет
разыменования `nil`. Переставишь местами — паника на списке чётной длины.

### Техника шире литерального списка

«Следующий узел» — это любая функция `i → f(i)` (функциональный граф). Поэтому Floyd
ловит цикл и там, где списка нет: **Find the Duplicate Number** (индекс → значение как
указатель), **Happy Number** (число → сумма квадратов цифр). Увидел «неявную ссылку
next» — вспомни про зайца и черепаху.

### Какая «середина» при чётной длине

При `slow, fast := head, head` и цикле `fast != nil && fast.Next != nil` для чётной
длины `slow` останавливается на **втором** среднем узле (соглашение LeetCode). Нужен
первый — стартуй `fast` с `head.Next`.

## ⚠️ Типичные ошибки

1. **Условие цикла `for fast != nil`** без проверки `fast.Next` — разыменование `nil`
   при `fast.Next.Next`. Правильно: `for fast != nil && fast.Next != nil`.
2. **Сдвиг старта** — инициализируйте оба указателя `head`, а не `head.Next`.
3. **Забыли сбросить `slow` в `head`** при поиске начала цикла — иначе указатель
   остаётся внутри цикла и ответ неверный.
4. **Не обработан пустой список или один узел** — проверяйте `head == nil` и
   `head.Next == nil` (self-loop при этом нужно учитывать отдельно).
5. **Поиск K-го с конца, когда K больше длины** — двигая `fast` вперёд на K шагов,
   проверяйте `fast == nil`.

## 🧩 Задачи

**LeetCode:**

- [Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/)
- [Middle of the Linked List](https://leetcode.com/problems/middle-of-the-linked-list/)
- [Palindrome Linked List](https://leetcode.com/problems/palindrome-linked-list/)
- [Linked List Cycle II](https://leetcode.com/problems/linked-list-cycle-ii/)
- [Remove Nth Node From End of List](https://leetcode.com/problems/remove-nth-node-from-end-of-list/)
- [Reorder List](https://leetcode.com/problems/reorder-list/)
- [Find the Duplicate Number](https://leetcode.com/problems/find-the-duplicate-number/) (сложная)
- [Sort List](https://leetcode.com/problems/sort-list/) (сложная)

**Тренажёр** — пакет `fastslow`:

```bash
cd exercises
go test ./fastslow/                 # ваши решения
go test -tags solution ./fastslow/  # эталон
```

Реализуйте `HasCycle` (есть ли цикл), `DetectCycle` (начало цикла),
`MiddleNode` (середина списка), `IsHappyNumber` (счастливое число)
и `CycleLength` (длина цикла).

## 🔗 Связанные шаблоны

- **[Two Pointers](two-pointers.md)** — базовый подход с двумя указателями для массивов.
- **[Reverse Linked List](reverse-linked-list.md)** — манипуляции с указателями списка
  (часто используется вместе для палиндромов и переупорядочивания).
- Для общей теории по памяти и GC в Go см. [приложение](appendix-go-memory.md).
