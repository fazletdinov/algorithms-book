# ↩️ Reverse Linked List (Разворот связанного списка)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Reverse Linked List <span class="algo-hero__ru">Разворот списка</span></div>
    <div class="algo-hero__tag">Меняем направление указателей на месте, не создавая узлов</div>
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
      <li>нужно развернуть весь список или его участок</li>
      <li>обработать элементы в обратном порядке</li>
      <li>палиндром, переупорядочивание, развороты группами по k</li>
      <li>как кирпич для сложных манипуляций с указателями</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>структура — массив (там разворот тривиален по индексам)</li>
      <li>нужен доступ по индексу за O(1)</li>
      <li>в списке есть цикл (зациклит разворот)</li>
      <li>порядок менять нельзя</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«связный список» + «развернуть / обратный порядок»</b> · «k-Group», «palindrome linked list», «reorder list» · просят <b>O(1) памяти</b>.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни (три указателя)</div>
    <ul>
      <li><b>next = curr.Next</b> — сначала сохрани остаток, иначе потеряешь хвост;</li>
      <li><b>curr.Next = prev</b> — разверни единственную ссылку;</li>
      <li><b>prev, curr = curr, next</b> — сдвинь оба вперёд;</li>
      <li>в конце <code>curr == nil</code>, а <b>prev</b> — новая голова.</li>
    </ul>
    <p>Порядок строго такой: потеряешь <code>next</code> до сохранения — оторвёшь весь хвост списка.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация.** Синяя ячейка — `curr`, жёлтая — `next` (сохранённый следующий),
> зелёные — уже развёрнутая часть (её голова — `prev`). Справа — код с подсветкой строки и переменные,
> внизу — кликабельные шаги. Можно подставить свой список и нажать «⟲ Запустить». (Виджет работает
> в собранной книге `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="list-reverse" data-list="1,2,3,4,5"></div>

## ⚡ Шаблон для собеседования

```go
var prev *ListNode
curr := head
for curr != nil {
    next := curr.Next // 1. сохранить остаток
    curr.Next = prev  // 2. развернуть указатель
    prev = curr       // 3. сдвинуть prev
    curr = next       // 4. сдвинуть curr
}
return prev           // новая голова
```

1. сохраняем `next`;
2. разворачиваем `curr.Next = prev`;
3. двигаем `prev` на `curr`;
4. двигаем `curr` на `next`. В конце возвращаем `prev`.

## 📖 Разбор

<details class="algo-details">
<summary>Итеративный и рекурсивный подходы, сложность</summary>

**Reverse Linked List** — разворот связанного списка на месте (in-place): мы меняем
направление каждого указателя `next`, не создавая новых узлов. Итеративный вариант
хранит три ссылки (предыдущий, текущий, следующий) и стоит O(1) памяти; рекурсивный
короче, но тратит O(n) на стек вызовов.

#### Итеративный подход

```go
type ListNode struct {
    Val  int
    Next *ListNode
}

func reverseListIterative(head *ListNode) *ListNode {
    var prev *ListNode
    curr := head
    for curr != nil {
        next := curr.Next // сохраняем остаток списка
        curr.Next = prev  // разворачиваем указатель
        prev = curr       // двигаемся вперёд
        curr = next
    }
    return prev
}
```

#### Рекурсивный подход

Базовый случай — пустой список или один узел. Иначе разворачиваем хвост, затем
переключаем единственный указатель: `head.Next.Next = head`, `head.Next = nil`.

```go
func reverseListRecursive(head *ListNode) *ListNode {
    if head == nil || head.Next == nil {
        return head
    }
    newHead := reverseListRecursive(head.Next)
    head.Next.Next = head
    head.Next = nil
    return newHead
}
```

#### Сложность

| Подход      | Время | Память        |
|-------------|-------|---------------|
| Итеративный | O(n)  | O(1)          |
| Рекурсивный | O(n)  | O(n) (стек)   |

Каждый узел посещается ровно один раз. Для длинных списков предпочтительнее
итеративный вариант — он не рискует переполнением стека.

</details>

## ⚠️ Типичные ошибки

1. **Потеря хвоста** — обязательно сохраняйте `next := curr.Next` *до* присваивания
   `curr.Next = prev`, иначе остаток списка теряется.
2. **Возврат не того узла** — возвращайте `prev`; `curr` в конце равен `nil`.
3. **Не обработан пустой список** — проверка `head == nil` (в рекурсии это часть
   базового случая).
4. **Рекурсия на длинном списке** — глубина равна длине списка, возможно переполнение
   стека; для больших данных берите итеративный вариант.
5. **Разворот списка с циклом** — приведёт к бесконечному циклу; при необходимости
   сначала проверьте отсутствие цикла.

## 🧩 Задачи

**LeetCode:**

- [Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/)
- [Reverse String](https://leetcode.com/problems/reverse-string/)
- [Reverse Linked List II](https://leetcode.com/problems/reverse-linked-list-ii/)
- [Reverse Nodes in k-Group](https://leetcode.com/problems/reverse-nodes-in-k-group/)
- [Swap Nodes in Pairs](https://leetcode.com/problems/swap-nodes-in-pairs/)
- [Reverse Nodes in Even Length Groups](https://leetcode.com/problems/reverse-nodes-in-even-length-groups/) (сложная)

**Тренажёр** — пакет `linkedlist`:

```bash
cd exercises
go test ./linkedlist/                 # ваши решения
go test -tags solution ./linkedlist/  # эталон
```

Реализуйте `ReverseList` (итеративный разворот), `ReverseSublist` (разворот участка [p, q]),
`ReverseKGroup` (разворот группами по k) и `IsPalindrome` (проверка палиндрома за O(1) памяти).

## 🔗 Связанные шаблоны

- **[Fast & Slow Pointers](fast-slow-pointers.md)** — другие операции со связанными
  списками (середина, циклы), часто комбинируются с разворотом.
- **[Tree BFS](tree-bfs.md)** и **[Tree DFS](tree-dfs.md)** — следующий шаг к обходам
  деревьев.
- Для общей теории по памяти и GC в Go см. [приложение](appendix-go-memory.md).
