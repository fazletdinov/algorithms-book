# Fast & Slow Pointers (Быстрые и медленные указатели)

## Описание шаблона

Шаблон **Fast & Slow Pointers** (также известный как "алгоритм зайца и черепахи" или "Floyd's Cycle Detection") использует два указателя, которые движутся по структуре данных с разной скоростью. Обычно один указатель (медленный) движется на один шаг за раз, а другой (быстрый) - на два шага.

### Исторический контекст

Алгоритм был предложен Робертом Флойдом в 1967 году и является одним из самых элегантных алгоритмов в информатике. Название "заяц и черепаха" происходит из басни Эзопа, где медленная черепаха в итоге догоняет быстрого зайца благодаря настойчивости.

### Основная идея

Ключевое наблюдение: если в структуре данных есть цикл, то быстрый указатель рано или поздно "догонит" медленный, встретившись с ним внутри цикла. Если цикла нет, быстрый указатель достигнет конца структуры раньше, чем произойдет встреча.

### Преимущества

- **Временная сложность**: O(n) вместо O(n²) для наивного подхода
- **Пространственная сложность**: O(1) вместо O(n) для подхода с хеш-таблицей
- **Элегантность**: Простое и понятное решение

## Когда применять

Используйте этот шаблон, когда:
- Нужно определить, есть ли цикл в связанном списке
- Требуется найти середину связанного списка
- Нужно найти K-й элемент с конца списка
- Работаете с циклическими структурами данных
- Хотите решить задачу за O(n) времени и O(1) пространства

## Алгоритм/Подход

### Базовый алгоритм обнаружения цикла:

1. **Инициализация**: Установите `slow = head` и `fast = head`
2. **Движение**: Пока `fast` и `fast.next` не равны `null`:
   - Переместите `slow` на один шаг: `slow = slow.next`
   - Переместите `fast` на два шага: `fast = fast.next.next`
   - Если `slow == fast`, обнаружен цикл
3. **Поиск начала цикла**: После обнаружения цикла:
   - Верните `slow` в начало: `slow = head`
   - Двигайте оба указателя по одному шагу
   - Место встречи - начало цикла

### Поиск середины списка:

1. Используйте два указателя: `slow` и `fast`
2. Когда `fast` достигнет конца, `slow` будет в середине

## Визуализация

### Обнаружение цикла:

```
Список с циклом: 1 -> 2 -> 3 -> 4 -> 5 -> 3 (цикл)

Шаг 1: slow=1, fast=1
        S,F
        1 -> 2 -> 3 -> 4 -> 5
                    ↑________|

Шаг 2: slow=2, fast=3
           S     F
        1 -> 2 -> 3 -> 4 -> 5
                    ↑________|

Шаг 3: slow=3, fast=5
              S         F
        1 -> 2 -> 3 -> 4 -> 5
                    ↑________|

Шаг 4: slow=4, fast=3
                 S  F
        1 -> 2 -> 3 -> 4 -> 5
                    ↑________|

Шаг 5: slow=5, fast=5 (встретились - цикл обнаружен!)
                    S,F
        1 -> 2 -> 3 -> 4 -> 5
                    ↑________|
```

### Поиск середины списка:

```
Список: 1 -> 2 -> 3 -> 4 -> 5

Шаг 1: slow=1, fast=1
        S,F
        1 -> 2 -> 3 -> 4 -> 5

Шаг 2: slow=2, fast=3
           S     F
        1 -> 2 -> 3 -> 4 -> 5

Шаг 3: slow=3, fast=5 (fast достиг конца, slow в середине)
              S         F
        1 -> 2 -> 3 -> 4 -> 5
```

## Математическое обоснование

### Почему алгоритм обнаружения цикла работает?

**Теорема Флойда**: Если в связанном списке есть цикл длины L, и мы начинаем с двух указателей в одной точке, где медленный указатель движется на 1 шаг, а быстрый на 2 шага, то они встретятся через максимум L шагов после входа в цикл.

**Доказательство**:
1. Пусть расстояние от начала до начала цикла = m узлов
2. Пусть длина цикла = L узлов
3. После m шагов: slow в начале цикла, fast прошел 2m шагов
4. Положение fast в цикле: (2m - m) mod L = m mod L
5. Расстояние между slow и fast: (L - m mod L) mod L
6. На каждом шаге это расстояние уменьшается на 1 (fast догоняет slow)
7. Максимальное расстояние = L-1, значит встреча произойдет максимум через L-1 шаг

**Почему место встречи с началом цикла работает?**

После встречи в цикле:
- Пусть расстояние от начала списка до начала цикла = x
- Пусть расстояние от начала цикла до точки встречи = y
- Пусть оставшаяся часть цикла = z (y + z = L)

Когда slow прошел x + y шагов, fast прошел 2(x + y) шагов.
В точке встречи: fast = x + y + kL для некоторого k
Значит: 2(x + y) = x + y + kL → x + y = kL → x = kL - y = (k-1)L + z

Если мы переместим slow в начало и будем двигать оба указателя по 1 шагу:
- slow пройдет x шагов до начала цикла
- fast пройдет x шагов от точки встречи, что равно (k-1)L + z шагов
- Это приведет fast точно в начало цикла!

## Временная и пространственная сложность

### Детальный анализ:

**Обнаружение цикла**:
- **Временная сложность**: O(n)
  - В худшем случае (цикл начинается в конце): slow проходит n узлов до входа в цикл
  - После входа: максимум L шагов до встречи, где L ≤ n
  - Итого: O(n)
- **Пространственная сложность**: O(1)
  - Только два указателя

**Поиск начала цикла**:
- **Временная сложность**: O(n)
  - После обнаружения цикла: максимум L шагов до начала цикла
  - Итого: O(n)
- **Пространственная сложность**: O(1)

**Поиск середины списка**:
- **Временная сложность**: O(n)
  - fast проходит n узлов (или n-1 для четного количества)
  - slow проходит n/2 узлов
  - Итого: O(n)
- **Пространственная сложность**: O(1)

### Сравнение с альтернативными подходами:

| Подход | Время | Память | Примечания |
|--------|-------|--------|------------|
| Хеш-таблица | O(n) | O(n) | Простой, но требует памяти |
| Fast & Slow | O(n) | O(1) | Элегантный, константная память |
| Наивный (два цикла) | O(n²) | O(1) | Неэффективный |

## Примеры задач на LeetCode

### Легкие:
- [Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/) - Цикл в связанном списке
- [Middle of the Linked List](https://leetcode.com/problems/middle-of-the-linked-list/) - Середина связанного списка
- [Palindrome Linked List](https://leetcode.com/problems/palindrome-linked-list/) - Палиндромный связанный список

### Средние:
- [Linked List Cycle II](https://leetcode.com/problems/linked-list-cycle-ii/) - Начало цикла в связанном списке
- [Remove Nth Node From End of List](https://leetcode.com/problems/remove-nth-node-from-end-of-list/) - Удаление N-го узла с конца
- [Reorder List](https://leetcode.com/problems/reorder-list/) - Переупорядочивание списка

### Сложные:
- [Find the Duplicate Number](https://leetcode.com/problems/find-the-duplicate-number/) - Поиск дубликата числа
- [Sort List](https://leetcode.com/problems/sort-list/) - Сортировка списка

## Типичные ошибки и подводные камни

### 1. Неправильная проверка условий цикла

❌ **Неправильно**:

**Go**:
```go
for fast != nil {  // Может вызвать ошибку при fast.Next
    slow = slow.Next
    fast = fast.Next.Next
}
```

**Rust**:
```rust
while fast.is_some() {  // Может вызвать ошибку при fast.next
    slow = slow.next;
    fast = fast.next.next;
}
```

✅ **Правильно**:

**Go**:
```go
for fast != nil && fast.Next != nil {
    slow = slow.Next
    fast = fast.Next.Next
    if slow == fast {
        return true
    }
}
```

**Rust**:
```rust
while fast.is_some() && fast.as_ref().unwrap().next.is_some() {
    slow = slow.next;
    fast = fast.as_ref().unwrap().next.as_ref().map(|n| n.next.clone()).flatten();
    if slow == fast {
        return true;
    }
}
```

### 2. Неправильная инициализация указателей

❌ **Неправильно**:

**Go**:
```go
slow := head.Next  // Пропускаем первый элемент
fast := head.Next.Next
```

**Rust**:
```rust
let mut slow = head.next.clone();  // Пропускаем первый элемент
let mut fast = head.next.as_ref().unwrap().next.clone();
```

✅ **Правильно**:

**Go**:
```go
slow := head
fast := head
```

**Rust**:
```rust
let mut slow = head.clone();
let mut fast = head.clone();
```

### 3. Забывание сброса slow при поиске начала цикла

❌ **Неправильно**:

**Go**:
```go
// После обнаружения цикла
for slow != fast {  // slow уже в цикле!
    slow = slow.Next
    fast = fast.Next
}
```

**Rust**:
```rust
// После обнаружения цикла
while slow != fast {  // slow уже в цикле!
    slow = slow.next;
    fast = fast.next;
}
```

✅ **Правильно**:

**Go**:
```go
// После обнаружения цикла
slow = head  // Сбрасываем в начало
for slow != fast {
    slow = slow.Next
    fast = fast.Next
}
```

**Rust**:
```rust
// После обнаружения цикла
slow = head.clone();  // Сбрасываем в начало
while slow != fast {
    slow = slow.next;
    fast = fast.next;
}
```

### 4. Неправильная обработка пустого списка

❌ **Неправильно**:

**Go**:
```go
slow := head
fast := head
for fast != nil && fast.Next != nil {
    // Не проверили head == nil
}
```

**Rust**:
```rust
let mut slow = head.clone();
let mut fast = head.clone();
while fast.is_some() && fast.as_ref().unwrap().next.is_some() {
    // Не проверили head == None
}
```

✅ **Правильно**:

**Go**:
```go
if head == nil || head.Next == nil {
    return false
}
slow := head
fast := head
```

**Rust**:
```rust
if head.is_none() || head.as_ref().unwrap().next.is_none() {
    return false;
}
let mut slow = head.clone();
let mut fast = head.clone();
```

## Практические советы

1. **Всегда проверяйте граничные случаи**:
   - Пустой список
   - Список из одного элемента
   - Список без цикла
   - Цикл начинается с головы

2. **Используйте правильные скорости**:
   - Для обнаружения цикла: 1 и 2 шага
   - Для поиска K-го элемента: можно использовать другие соотношения

3. **Отладка**:
   - Визуализируйте движение указателей на бумаге
   - Добавьте счетчик итераций для предотвращения бесконечных циклов
   - Проверьте инвариант: fast всегда впереди slow (если нет цикла)

## Вариации

### Поиск K-го элемента с конца:

Используйте два указателя с расстоянием K между ними:

**Go**:
```go
fast := head
for i := 0; i < k; i++ {
    fast = fast.Next
}
slow := head
for fast != nil {
    slow = slow.Next
    fast = fast.Next
}
return slow  // K-й элемент с конца
```

**Rust**:
```rust
let mut fast = head.clone();
for _ in 0..k {
    fast = fast.as_ref().unwrap().next.clone();
}
let mut slow = head.clone();
while fast.is_some() {
    slow = slow.as_ref().unwrap().next.clone();
    fast = fast.as_ref().unwrap().next.clone();
}
slow  // K-й элемент с конца
```

### Определение длины цикла:

После обнаружения встречи, зафиксируйте slow и двигайте fast до следующей встречи:

**Go**:
```go
// После первой встречи
cycleLength := 1
temp := slow.Next
for temp != slow {
    cycleLength++
    temp = temp.Next
}
```

**Rust**:
```rust
// После первой встречи
let mut cycle_length = 1;
let mut temp = slow.as_ref().unwrap().next.clone();
while temp != slow {
    cycle_length += 1;
    temp = temp.as_ref().unwrap().next.clone();
}
```

## Структуры данных: внутреннее устройство

### Используемые структуры данных в Fast & Slow Pointers

В шаблоне Fast & Slow Pointers используются следующие структуры данных:
- **LinkedList Node**: Узлы связанного списка (Box&lt;T&gt; в Rust, указатели в Go)
- **Указатели**: Для навигации по списку (fast и slow указатели)

### LinkedList Node (Узел связанного списка)

**Что такое связанный список (Linked List)?**

**Связанный список** — это линейная структура данных, где каждый элемент (узел) содержит данные и указатель на следующий узел. В отличие от массива, элементы не хранятся в непрерывной памяти.

**Основные характеристики**:
- **Динамический размер**: Можно добавлять/удалять элементы без перераспределения памяти
- **Непрерывная память**: Узлы могут быть разбросаны в памяти (нет cache locality)
- **Вставка/удаление**: O(1) если известен указатель на узел
- **Доступ по индексу**: O(n) - нужно пройти от начала до нужного узла

**Структура узла (ListNode)**:
- **val**: Значение узла (данные)
- **next**: Указатель на следующий узел (или None/nil для конца списка)

#### Как хранится в памяти:

**Rust (Box&lt;T&gt;)**:
```
Узел списка:
┌─────────────────────────────────────────┐
│ Box&lt;ListNode&gt;                            │
│ ┌─────────────┐                         │
│ │ val: i32    │ Значение                │
│ │ next: Option│ Указатель на следующий  │
│ │   <Box&lt;...&gt;>│                         │
│ └─────────────┘                         │
└─────────────────────────────────────────┘
         │
         ▼
    [данные в куче]
    Каждый узел - отдельная аллокация
```

**Важные детали**:
- `Box&lt;T&gt;` - умный указатель, владеет данными в куче
- Каждый узел аллоцируется отдельно (не непрерывная память)
- `Option&lt;Box&lt;T&gt;&gt;` - либо Some(узел), либо None (конец списка)
- Нет cache locality (узлы могут быть разбросаны в памяти)

**Go (указатели)**:
```
Узел списка:
┌─────────────────────────────────────────┐
│ &ListNode                                │
│ ┌─────────────┐                         │
│ │ Val: int    │ Значение                │
│ │ Next: *ListNode│ Указатель            │
│ └─────────────┘                         │
└─────────────────────────────────────────┘
         │
         ▼
    [данные в куче]
    Каждый узел - отдельная аллокация
```

**Важные детали**:
- Указатель `*ListNode` - ссылается на узел в куче
- GC управляет памятью узлов
- `nil` означает конец списка
- Нет cache locality

#### Операции и их сложность:

| Операция | LinkedList | Объяснение |
|----------|------------|------------|
| Доступ по индексу | O(n) | Нужно пройти от начала до индекса |
| Вставка в начало | O(1) | Просто изменение указателя |
| Вставка в конец | O(n) | Нужно найти последний узел |
| Удаление | O(1) если есть указатель | Изменение указателей |
| Поиск цикла (Floyd) | O(n) | Fast pointer проходит максимум 2n узлов |

**Почему Fast & Slow Pointers эффективны**:
- Не требуют дополнительной памяти (только два указателя)
- O(n) время для обнаружения цикла
- O(1) дополнительная память

#### Когда использовать LinkedList:

**Используйте LinkedList когда**:
- Нужны частые вставки/удаления в середине
- Размер неизвестен заранее
- Не нужен произвольный доступ

**Не используйте когда**:
- Нужен произвольный доступ (используйте Vec/Array)
- Важна cache locality (используйте Vec/Array)
- Нужна производительность (Vec обычно быстрее)

### Указатели в связанных списках

#### Rust: Box&lt;T&gt; и Option&lt;Box&lt;T&gt;&gt;

**Что такое Box&lt;T&gt;?**

**`Box<T>`** — это умный указатель в Rust, который:
- **Владеет данными в куче**: Перемещает данные из стека в кучу
- **Автоматически освобождает память**: При выходе из области видимости вызывается `Drop`, который освобождает память
- **Zero-cost абстракция**: Нет runtime overhead, компилятор оптимизирует код
- **Размер**: На стеке хранится только указатель (8 байт на 64-bit), сами данные в куче

**Зачем нужен Box?**
- Когда размер типа неизвестен во время компиляции (например, рекурсивные структуры)
- Когда нужно переместить большие данные в кучу, чтобы не переполнить стек
- Для создания умных указателей с владением

**Box&lt;T&gt;**:
- Умный указатель, владеет данными в куче
- Автоматически освобождает память при выходе из области видимости
- Zero-cost абстракция (нет runtime overhead)

**Option&lt;Box&lt;T&gt;&gt;**:
- `Some(box)` - есть узел
- `None` - конец списка
- Размер: 8 байт (на 64-bit) для Some, 8 байт для None (discriminant)

**Пример**:
```rust
struct ListNode {
    val: i32,
    next: Option&lt;Box&lt;ListNode&gt;&gt;,  // Option для nullable указателя
}
```

#### Go: *ListNode и nil

***ListNode**:
- Обычный указатель на узел
- `nil` означает отсутствие узла
- GC управляет памятью

**Пример**:
```go
type ListNode struct {
    Val  int
    Next *ListNode  // nil означает конец
}
```

## Глубокое понимание: сложные концепции

### Escape Analysis (Go)

#### Что это такое:

**Escape Analysis** определяет, должны ли узлы списка быть в куче.

**Для Fast & Slow Pointers**:
- Узлы списка всегда в куче (динамическое выделение)
- Указатели fast/slow - на стеке
- Результаты могут escape, если возвращаются

#### Как проверить:

```bash
go build -gcflags=-m main.go
```

**Пример**:
```go
func createList() *ListNode {
    node := &ListNode{Val: 1}  // escape в кучу
    return node
}
```

**Вывод**:
```
./main.go:5:6: moved to heap: node
```

### Borrow Checker (Rust)

#### Что это такое:

**Borrow Checker** проверяет заимствования для безопасной работы с указателями.

**Для Fast & Slow Pointers**:
- Обычно используем `&Box&lt;ListNode&gt;` для чтения
- `&mut Box&lt;ListNode&gt;` для изменения
- Проблемы могут возникнуть при изменении во время итерации

#### Примеры:

**Типичный паттерн**:
```rust
fn has_cycle(head: &Option&lt;Box&lt;ListNode&gt;&gt;) -> bool {
    let mut slow = head;
    let mut fast = head;
    
    // Используем as_ref() для получения &Option&lt;&Box&lt;ListNode&gt;&gt;
    while let (Some(s), Some(f)) = (slow, fast) {
        // ...
    }
    false
}
```

**Проблема: изменение во время итерации**:
```rust
// ❌ Не компилируется
fn bad(head: &mut Option&lt;Box&lt;ListNode&gt;&gt;) {
    let mut current = head;
    while let Some(node) = current {
        node.next = None;  // ERROR: нельзя изменять во время borrow
        current = &mut node.next;
    }
}
```

**Решение**:
```rust
// ✅ Используем take() для временного владения
fn good(head: &mut Option&lt;Box&lt;ListNode&gt;&gt;) {
    let mut current = head.take();
    while let Some(mut node) = current {
        current = node.next.take();
        // работаем с node
    }
}
```

### Garbage Collector (Go)

#### Как работает GC:

**Для Fast & Slow Pointers**:
- Узлы списка в куче - управляются GC
- Указатели fast/slow на стеке - не влияют на GC
- Циклические ссылки могут привести к утечкам памяти (если не разорвать цикл)

#### Оптимизация:

**Избежание утечек памяти**:
```go
// ✅ Разрываем цикл перед удалением
func cleanup(head *ListNode) {
    current := head
    for current != nil {
        next := current.Next
        current.Next = nil  // разрываем ссылку
        current = next
    }
}
```

### Ownership и Move Semantics (Rust)

#### Концепция владения:

**Для Fast & Slow Pointers**:
- Каждый `Box&lt;ListNode&gt;` владеет следующим узлом
- При удалении узла, все дочерние узлы также удаляются (RAII)
- `Option&lt;Box&lt;T&gt;&gt;` позволяет иметь nullable указатель безопасно

**Пример**:
```rust
fn create_list() -> Option&lt;Box&lt;ListNode&gt;&gt; {
    Some(Box::new(ListNode {
        val: 1,
        next: Some(Box::new(ListNode {
            val: 2,
            next: None,
        })),
    }))
}

// При выходе из области видимости, все узлы автоматически освобождаются
```

**Почему это важно**:
- Нет утечек памяти
- Нет необходимости вручную освобождать память
- Безопасность гарантируется компилятором

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Владение и указатели

В Rust для Fast & Slow Pointers:
- **Указатели**: `&ListNode` или `Option&lt;Box&lt;ListNode&gt;&gt;` - ссылки не аллоцируют память
- **Box**: Аллоцирует узел в куче, но указатели на узлы - это просто адреса
- **Option**: Enum, размером с указателем + discriminant

#### Go: Указатели и GC

В Go:
- **Указатели**: `*ListNode` - просто адреса, не аллоцируют память
- **Структуры**: Узлы списка аллоцируются в куче
- **GC**: Автоматически управляет памятью узлов

### Анализ аллокаций для Fast & Slow Pointers

#### Обнаружение цикла:

**Rust**:
```rust
// Аллокации:
// - slow, fast: &ListNode (ссылки, не аллоцируют) - O(1)
// - Никаких дополнительных структур данных
// Итого: O(1) памяти, только указатели
```

**Go**:
```go
// Аллокации:
// - slow, fast: *ListNode (указатели, не аллоцируют) - O(1)
// - Никаких дополнительных структур данных
// Итого: O(1) памяти, только указатели
```

#### Поиск середины списка:

**Аналогично**: Только два указателя, O(1) памяти.

### Оптимизация памяти

#### Rust оптимизации:

1. **Использование ссылок вместо копирования**:
```rust
// ✅ Хорошо: использование ссылок
fn has_cycle(head: &Option&lt;Box&lt;ListNode&gt;&gt;) -> bool {
    let mut slow = head;
    let mut fast = head;
    // ...
}
```

2. **Избежание клонирования**:
```rust
// ❌ Плохо: клонирование узлов
let slow_clone = slow.clone();

// ✅ Хорошо: использование ссылок
let slow_ref = slow;
```

#### Go оптимизации:

1. **Использование указателей**:
```go
// ✅ Указатели не аллоцируют память
func hasCycle(head *ListNode) bool {
    slow, fast := head, head
    // ...
}
```

2. **Избежание создания новых структур**:
```go
// ❌ Плохо: создание новых узлов
newNode := &ListNode{Val: 0}

// ✅ Хорошо: работа с существующими узлами
current := head
```

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Указатели | `&T` или `Box&lt;T&gt;` | `*T` |
| Память | Контролируемая | GC управляет |
| Производительность | Предсказуемая | Может быть паузы GC |
| Безопасность | Проверяется компилятором | Runtime проверки |

## Оптимизация производительности

### Общие техники

1. **Минимизация проверок**:
   - Проверяйте `fast.next` только когда необходимо
   - Используйте ранние выходы

2. **Оптимизация условий**:
   - Порядок проверок важен
   - Используйте короткие замыкания

### Специфичные оптимизации для Fast & Slow Pointers

#### 1. Оптимизация обнаружения цикла:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub fn has_cycle_optimized(head: &Option&lt;Box&lt;ListNode&gt;&gt;) -> bool {
    let mut slow = head;
    let mut fast = head;
    
    while let (Some(s), Some(f)) = (slow, fast) {
        slow = &s.next;
        fast = &f.next;
        if let Some(f_next) = fast {
            fast = &f_next.next;
        } else {
            return false; // Нет цикла
        }
        if slow == fast {
            return true; // Цикл обнаружен
        }
    }
    false
}
```

**Go**:
```go
// ✅ Оптимизированная версия
func hasCycleOptimized(head *ListNode) bool {
    if head == nil || head.Next == nil {
        return false
    }
    
    slow, fast := head, head.Next
    
    for fast != nil && fast.Next != nil {
        if slow == fast {
            return true
        }
        slow = slow.Next
        fast = fast.Next.Next
    }
    return false
}
```

### Оптимизация для Rust

1. **Использование pattern matching**:
```rust
// ✅ Эффективный pattern matching
match (slow, fast) {
    (Some(s), Some(f)) => { /* ... */ },
    _ => return false,
}
```

2. **Избежание лишних разыменований**:
```rust
// Компилятор Rust оптимизирует разыменования
```

### Оптимизация для Go

1. **Ранние проверки**:
```go
// ✅ Проверка граничных случаев заранее
if head == nil || head.Next == nil {
    return false
}
```

2. **Минимизация проверок в цикле**:
```go
// ✅ Проверяем fast.Next один раз
for fast != nil && fast.Next != nil {
    // ...
}
```

## Профилирование

### Инструменты профилирования

См. раздел "Профилирование" в [Sliding Window](./sliding-window.md#профилирование) для общих инструментов.

### Как профилировать Fast & Slow Pointers

#### Rust пример:

```rust
// benches/fast_slow_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_has_cycle(c: &mut Criterion) {
    let list = create_cyclic_list(1000);
    
    c.bench_function("has_cycle_1000", |b| {
        b.iter(|| has_cycle_optimized(black_box(&list)))
    });
}

criterion_group!(benches, bench_has_cycle);
criterion_main!(benches);
```

#### Go пример:

```go
func BenchmarkHasCycle(b *testing.B) {
    list := createCyclicList(1000)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        hasCycleOptimized(list)
    }
}
```

### Примеры профилирования

**Анализ производительности**:
- Fast & Slow Pointers: O(n) по времени
- O(1) дополнительной памяти
- Минимальные аллокации (только указатели)

**Типичные узкие места**:
- Проверки указателей на nil/null
- Доступ к полям узлов
- Условные операторы

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые случаи с циклом и без
2. **Граничные случаи**: Пустой список, один элемент, цикл с головы
3. **Стресс-тесты**: Большие списки с циклами разной длины

### Примеры тестов для Fast & Slow Pointers

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_has_cycle_no_cycle() {
        let list = create_list(vec![1, 2, 3, 4, 5]);
        assert_eq!(has_cycle_optimized(&list), false);
    }

    #[test]
    fn test_has_cycle_with_cycle() {
        let mut list = create_list(vec![1, 2, 3, 4, 5]);
        // Создаем цикл
        make_cyclic(&mut list, 2);
        assert_eq!(has_cycle_optimized(&list), true);
    }

    #[test]
    fn test_has_cycle_empty() {
        let list = None;
        assert_eq!(has_cycle_optimized(&list), false);
    }

    #[test]
    fn test_find_middle() {
        let list = create_list(vec![1, 2, 3, 4, 5]);
        assert_eq!(find_middle(&list), Some(3));
    }
}
```

#### Go тесты:

```go
func TestHasCycle(t *testing.T) {
    tests := []struct {
        name string
        list *ListNode
        want bool
    }{
        {"no_cycle", createList([]int{1, 2, 3, 4, 5}), false},
        {"with_cycle", createCyclicList([]int{1, 2, 3, 4, 5}, 2), true},
        {"empty", nil, false},
        {"single", &ListNode{Val: 1}, false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := hasCycleOptimized(tt.list); got != tt.want {
                t.Errorf("hasCycleOptimized() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### Запуск тестов

#### Rust:
```bash
cargo test
cargo test -- --nocapture
cargo bench
```

#### Go:
```bash
go test -v
go test -bench=. -benchmem
```

### Бенчмарки

#### Rust:
```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};

fn fast_slow_benchmark(c: &mut Criterion) {
    let sizes = vec![100, 1000, 10000, 100000];
    
    let mut group = c.benchmark_group("fast_slow");
    for size in sizes {
        let list = create_cyclic_list(size);
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            &list,
            |b, list| {
                b.iter(|| has_cycle_optimized(black_box(list)));
            },
        );
    }
    group.finish();
}
```

#### Go:
```go
func BenchmarkFastSlowSizes(b *testing.B) {
    sizes := []int{100, 1000, 10000, 100000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            list := createCyclicList(size)
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                hasCycleOptimized(list)
            }
        })
    }
}
```

## Примеры кода

### Rust

```rust
// Примеры использования шаблона Fast & Slow Pointers на Rust

// Определение узла связанного списка
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option&lt;Box&lt;ListNode&gt;&gt;,
}

impl ListNode {
    #[inline]
    pub fn new(val: i32) -> Self {
        ListNode { next: None, val }
    }
}

/// Пример 1: Обнаружение цикла в связанном списке
/// 
/// Задача: Определить, содержит ли связанный список цикл
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn has_cycle(head: Option&lt;Box&lt;ListNode&gt;&gt;) -> bool {
    let mut slow = head.as_ref();
    let mut fast = head.as_ref();

    while let (Some(s), Some(f)) = (slow, fast) {
        slow = s.next.as_ref();
        
        // Быстрый указатель движется на два шага
        fast = f.next.as_ref().and_then(|n| n.next.as_ref());

        // Если указатели встретились, есть цикл
        if slow.is_some() && slow == fast {
            return true;
        }
    }

    false
}

/// Пример 2: Поиск начала цикла в связанном списке
/// 
/// Задача: Найти узел, где начинается цикл
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn detect_cycle(head: Option&lt;Box&lt;ListNode&gt;&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    let mut slow = head.as_ref();
    let mut fast = head.as_ref();

    // Шаг 1: Обнаружить цикл
    while let (Some(s), Some(f)) = (slow, fast) {
        slow = s.next.as_ref();
        fast = f.next.as_ref().and_then(|n| n.next.as_ref());

        if slow.is_some() && slow == fast {
            break;
        }
    }

    // Если цикла нет
    if slow.is_none() || fast.is_none() {
        return None;
    }

    // Шаг 2: Найти начало цикла
    // Возвращаем slow в начало и двигаем оба указателя по одному шагу
    let mut slow2 = head.as_ref();
    while slow != slow2 {
        slow = slow.and_then(|n| n.next.as_ref());
        slow2 = slow2.and_then(|n| n.next.as_ref());
    }

    // Клонируем узел для возврата (в реальности обычно возвращают указатель)
    slow.cloned()
}

/// Пример 3: Поиск середины связанного списка
/// 
/// Задача: Найти средний узел связанного списка
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn middle_node(head: Option&lt;Box&lt;ListNode&gt;&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    let mut slow = head.as_ref();
    let mut fast = head.as_ref();

    while let (Some(s), Some(f)) = (slow, fast) {
        slow = s.next.as_ref();
        fast = f.next.as_ref().and_then(|n| n.next.as_ref());

        // Если fast достиг конца, slow в середине
        if fast.is_none() {
            break;
        }
    }

    slow.cloned()
}

/// Пример 4: Удаление N-го узла с конца списка
/// 
/// Задача: Удалить N-й узел с конца списка
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn remove_nth_from_end(head: Option&lt;Box&lt;ListNode&gt;&gt;, n: i32) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    // Создаем фиктивный узел для упрощения удаления головы
    let mut dummy = Box::new(ListNode { val: 0, next: head });
    let mut slow = dummy.as_mut() as *mut ListNode;
    let mut fast = dummy.as_mut() as *mut ListNode;

    // Двигаем fast на n+1 шагов вперед
    for _ in 0..=n {
        unsafe {
            if let Some(ref mut f) = (*fast).next {
                fast = f.as_mut() as *mut ListNode;
            } else {
                return dummy.next;
            }
        }
    }

    // Двигаем оба указателя до конца
    unsafe {
        while (*fast).next.is_some() {
            slow = (*slow).next.as_mut().unwrap().as_mut() as *mut ListNode;
            fast = (*fast).next.as_mut().unwrap().as_mut() as *mut ListNode;
        }

        // Удаляем узел
        let next = (*slow).next.as_mut().unwrap().next.take();
        (*slow).next = next;
    }

    dummy.next
}

/// Пример 5: Проверка, является ли список палиндромом
/// 
/// Задача: Определить, является ли связанный список палиндромом
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn is_palindrome(head: Option&lt;Box&lt;ListNode&gt;&gt;) -> bool {
    // Находим середину списка
    let mut slow = head.as_ref();
    let mut fast = head.as_ref();

    while let (Some(s), Some(f)) = (slow, fast) {
        slow = s.next.as_ref();
        fast = f.next.as_ref().and_then(|n| n.next.as_ref());
        if fast.is_none() {
            break;
        }
    }

    // Разворачиваем вторую половину списка
    let mut prev: Option&lt;Box&lt;ListNode&gt;&gt; = None;
    let mut curr = slow.cloned();

    while let Some(mut node) = curr {
        let next = node.next.take();
        node.next = prev;
        prev = Some(node);
        curr = next;
    }

    // Сравниваем первую и вторую половины
    let mut first = head.as_ref();
    let mut second = prev.as_ref();

    while let (Some(f), Some(s)) = (first, second) {
        if f.val != s.val {
            return false;
        }
        first = f.next.as_ref();
        second = s.next.as_ref();
    }

    true
}

/// Пример 6: Поиск дубликата числа (Floyd's Cycle Detection для массива)
/// 
/// Задача: Найти дубликат числа в массиве, где числа от 1 до n, и есть один дубликат
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn find_duplicate(nums: Vec&lt;i32&gt;) -> i32 {
    // Используем алгоритм Floyd для обнаружения цикла
    // Массив можно рассматривать как связанный список, где nums[i] указывает на nums[nums[i]]
    let mut slow = nums[0] as usize;
    let mut fast = nums[0] as usize;

    // Обнаруживаем цикл
    loop {
        slow = nums[slow] as usize;
        fast = nums[nums[fast] as usize] as usize;
        if slow == fast {
            break;
        }
    }

    // Находим начало цикла (дубликат)
    slow = nums[0] as usize;
    while slow != fast {
        slow = nums[slow] as usize;
        fast = nums[fast] as usize;
    }

    slow as i32
}
```

### Go

```go
package main

import (
	"fmt"
)

// Определение узла связанного списка
type ListNode struct {
	Val  int
	Next *ListNode
}

// Пример 1: Обнаружение цикла в связанном списке
//
// Задача: Определить, содержит ли связанный список цикл
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func hasCycle(head *ListNode) bool {
	if head == nil || head.Next == nil {
		return false
	}

	slow := head
	fast := head

	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next

		// Если указатели встретились, есть цикл
		if slow == fast {
			return true
		}
	}

	return false
}

// Пример 2: Поиск начала цикла в связанном списке
//
// Задача: Найти узел, где начинается цикл
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func detectCycle(head *ListNode) *ListNode {
	if head == nil || head.Next == nil {
		return nil
	}

	slow := head
	fast := head

	// Шаг 1: Обнаружить цикл
	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next

		if slow == fast {
			break
		}
	}

	// Если цикла нет
	if fast == nil || fast.Next == nil {
		return nil
	}

	// Шаг 2: Найти начало цикла
	// Возвращаем slow в начало и двигаем оба указателя по одному шагу
	slow = head
	for slow != fast {
		slow = slow.Next
		fast = fast.Next
	}

	return slow
}

// Пример 3: Поиск середины связанного списка
//
// Задача: Найти средний узел связанного списка
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func middleNode(head *ListNode) *ListNode {
	slow := head
	fast := head

	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next
	}

	return slow
}

// Пример 4: Удаление N-го узла с конца списка
//
// Задача: Удалить N-й узел с конца списка
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func removeNthFromEnd(head *ListNode, n int) *ListNode {
	// Создаем фиктивный узел для упрощения удаления головы
	dummy := &ListNode{Val: 0, Next: head}
	slow := dummy
	fast := dummy

	// Двигаем fast на n+1 шагов вперед
	for i := 0; i <= n; i++ {
		fast = fast.Next
	}

	// Двигаем оба указателя до конца
	for fast != nil {
		slow = slow.Next
		fast = fast.Next
	}

	// Удаляем узел
	slow.Next = slow.Next.Next

	return dummy.Next
}

// Пример 5: Проверка, является ли список палиндромом
//
// Задача: Определить, является ли связанный список палиндромом
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func isPalindrome(head *ListNode) bool {
	if head == nil || head.Next == nil {
		return true
	}

	// Находим середину списка
	slow := head
	fast := head

	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next
	}

	// Разворачиваем вторую половину списка
	var prev *ListNode
	curr := slow

	for curr != nil {
		next := curr.Next
		curr.Next = prev
		prev = curr
		curr = next
	}

	// Сравниваем первую и вторую половины
	first := head
	second := prev

	for second != nil {
		if first.Val != second.Val {
			return false
		}
		first = first.Next
		second = second.Next
	}

	return true
}

// Пример 6: Поиск дубликата числа (Floyd's Cycle Detection для массива)
//
// Задача: Найти дубликат числа в массиве, где числа от 1 до n, и есть один дубликат
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func findDuplicate(nums []int) int {
	// Используем алгоритм Floyd для обнаружения цикла
	// Массив можно рассматривать как связанный список, где nums[i] указывает на nums[nums[i]]
	slow := nums[0]
	fast := nums[0]

	// Обнаруживаем цикл
	for {
		slow = nums[slow]
		fast = nums[nums[fast]]
		if slow == fast {
			break
		}
	}

	// Находим начало цикла (дубликат)
	slow = nums[0]
	for slow != fast {
		slow = nums[slow]
		fast = nums[fast]
	}

	return slow
}
```

## Дополнительные ресурсы

- [Floyd's Cycle Detection Algorithm - Wikipedia](https://en.wikipedia.org/wiki/Cycle_detection) - Математическое обоснование
- [LeetCode Linked List Problems](https://leetcode.com/tag/linked-list/) - Практика
- [Introduction to Algorithms - CLRS](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) - Теоретическая база

