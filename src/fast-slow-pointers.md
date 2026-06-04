# Fast & Slow Pointers (Быстрые и медленные указатели)

## Теория

**Fast & Slow Pointers** (алгоритм «заяц и черепаха», обнаружение циклов Флойда) —
два указателя движутся по структуре с разной скоростью: медленный на 1 шаг, быстрый
на 2. Если в списке есть цикл, быстрый рано или поздно догонит медленный внутри цикла;
если цикла нет — быстрый первым достигнет конца.

Техника даёт O(n) по времени и **O(1) по памяти** там, где наивный подход с хеш-таблицей
тратит O(n) дополнительной памяти.

**Когда применять:**

- определить наличие цикла в связанном списке;
- найти середину списка за один проход;
- найти K-й элемент с конца;
- работать с циклическими структурами за O(1) памяти.

## Алгоритм

### Обнаружение цикла

Двигаем `slow` на шаг, `fast` на два. Совпадение указателей означает цикл; выход
`fast` в `nil` — цикла нет. Условие `fast != nil && fast.Next != nil` защищает от
разыменования `nil`.

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

### Начало цикла

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

### Середина списка

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

### Сложность

| Задача             | Время | Память |
|--------------------|-------|--------|
| Обнаружение цикла  | O(n)  | O(1)   |
| Начало цикла       | O(n)  | O(1)   |
| Середина списка    | O(n)  | O(1)   |

## Визуализация

> 💡 **Интерактивная демонстрация.** Нажимайте «▶»: синяя ячейка — `slow` (шаг 1),
> жёлтая — `fast` (шаг 2). Видно, как они встречаются внутри цикла. (Виджет работает в
> собранной книге `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="list-cycle" data-list="1,2,3,4,5" data-cycle="2"></div>

Список с циклом `1 → 2 → 3 → 4 → 5 → 3` (цикл начинается с узла 3):

```
шаг 0:  slow=1  fast=1
шаг 1:  slow=2  fast=3
шаг 2:  slow=3  fast=5
шаг 3:  slow=4  fast=3   (fast прошёл цикл)
шаг 4:  slow=5  fast=5   ← slow == fast: цикл обнаружен
```

`fast` проходит вдвое больше узлов и, оказавшись в цикле, сокращает разрыв с `slow`
на 1 за шаг — поэтому встреча гарантирована.

## Типичные ошибки

1. **Условие цикла `for fast != nil`** без проверки `fast.Next` — разыменование `nil`
   при `fast.Next.Next`. Правильно: `for fast != nil && fast.Next != nil`.
2. **Сдвиг старта** — инициализируйте оба указателя `head`, а не `head.Next`.
3. **Забыли сбросить `slow` в `head`** при поиске начала цикла — иначе указатель
   остаётся внутри цикла и ответ неверный.
4. **Не обработан пустой список или один узел** — проверяйте `head == nil` и
   `head.Next == nil` (self-loop при этом нужно учитывать отдельно).
5. **Поиск K-го с конца, когда K больше длины** — двигая `fast` вперёд на K шагов,
   проверяйте `fast == nil`.

## Задачи

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

## Связанные шаблоны

- **[Two Pointers](two-pointers.md)** — базовый подход с двумя указателями для массивов.
- **[Reverse Linked List](reverse-linked-list.md)** — манипуляции с указателями списка
  (часто используется вместе для палиндромов и переупорядочивания).
- Для общей теории по памяти и GC в Go см. [приложение](appendix-go-memory.md).
