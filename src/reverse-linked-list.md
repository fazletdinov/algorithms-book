# Reverse Linked List (Разворот связанного списка)

## Теория

**Reverse Linked List** — разворот связанного списка на месте (in-place): мы меняем
направление каждого указателя `next`, не создавая новых узлов. Итеративный вариант
хранит три ссылки (предыдущий, текущий, следующий) и стоит O(1) памяти; рекурсивный
короче, но тратит O(n) на стек вызовов.

**Когда применять:**

- нужно развернуть весь список или его часть;
- требуется обработать элементы в обратном порядке;
- задача про палиндром, переупорядочивание или развороты группами;
- основа для более сложных манипуляций с указателями списка.

## Алгоритм

### Итеративный подход

Идём по списку, на каждом узле сохраняем `next`, переключаем `curr.Next` на `prev` и
сдвигаем оба указателя. По завершении `prev` — новая голова.

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

### Рекурсивный подход

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

### Сложность

| Подход      | Время | Память        |
|-------------|-------|---------------|
| Итеративный | O(n)  | O(1)          |
| Рекурсивный | O(n)  | O(n) (стек)   |

Каждый узел посещается ровно один раз. Для длинных списков предпочтительнее
итеративный вариант — он не рискует переполнением стека.

## Визуализация

Разворот `1 → 2 → 3 → 4 → 5` итеративно:

```
старт:  prev=nil   1 → 2 → 3 → 4 → 5
шаг 1:  nil ← 1     2 → 3 → 4 → 5       prev=1, curr=2
шаг 2:  nil ← 1 ← 2     3 → 4 → 5       prev=2, curr=3
шаг 3:  nil ← 1 ← 2 ← 3     4 → 5       prev=3, curr=4
шаг 4:  nil ← 1 ← 2 ← 3 ← 4     5       prev=4, curr=5
шаг 5:  nil ← 1 ← 2 ← 3 ← 4 ← 5         prev=5, curr=nil → конец
```

Результат: `5 → 4 → 3 → 2 → 1 → nil`, новая голова — `prev` (узел 5).

## Типичные ошибки

1. **Потеря хвоста** — обязательно сохраняйте `next := curr.Next` *до* присваивания
   `curr.Next = prev`, иначе остаток списка теряется.
2. **Возврат не того узла** — возвращайте `prev`; `curr` в конце равен `nil`.
3. **Не обработан пустой список** — проверка `head == nil` (в рекурсии это часть
   базового случая).
4. **Рекурсия на длинном списке** — глубина равна длине списка, возможно переполнение
   стека; для больших данных берите итеративный вариант.
5. **Разворот списка с циклом** — приведёт к бесконечному циклу; при необходимости
   сначала проверьте отсутствие цикла.

## Задачи

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

Реализуйте `ReverseList` (итеративный разворот с тремя указателями).

## Связанные шаблоны

- **[Fast & Slow Pointers](fast-slow-pointers.md)** — другие операции со связанными
  списками (середина, циклы), часто комбинируются с разворотом.
- **[Tree BFS](tree-bfs.md)** и **[Tree DFS](tree-dfs.md)** — следующий шаг к обходам
  деревьев.
- Для общей теории по памяти и GC в Go см. [приложение](appendix-go-memory.md).
