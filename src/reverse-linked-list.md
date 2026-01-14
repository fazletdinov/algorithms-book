# Reverse Linked List (Разворот связанного списка)

## Описание шаблона

Шаблон **Reverse Linked List** используется для инвертирования связанного списка на месте (in-place), то есть без использования дополнительной памяти для создания нового списка. Этот подход эффективен и часто используется как основа для более сложных задач с связанными списками.

### Исторический контекст

Разворот связанного списка — одна из классических задач в информатике, часто используемая для демонстрации работы с указателями и понимания структуры данных. Алгоритм является фундаментальным для многих операций со списками.

### Основная идея

Ключевое наблюдение: для разворота списка нужно изменить направление каждого указателя `next`. Это можно сделать итеративно, сохраняя ссылки на предыдущий, текущий и следующий узлы, или рекурсивно, используя стек вызовов.

## Когда применять

Используйте этот шаблон, когда:
- Нужно развернуть связанный список полностью или частично
- Требуется обработать элементы списка в обратном порядке
- Работаете с задачами, связанными с палиндромами в списках
- Нужно развернуть подсписок или группу узлов
- Задача требует манипуляций с указателями в связанных структурах

## Алгоритм/Подход

### Итеративный подход:

1. **Инициализация**: Создайте три указателя:
   - `prev = None` (предыдущий узел)
   - `curr = head` (текущий узел)
   - `next = None` (следующий узел)
2. **Итерация**: Пока `curr != None`:
   - Сохраните следующий узел: `next = curr.next`
   - Разверните указатель: `curr.next = prev`
   - Переместите указатели: `prev = curr`, `curr = next`
3. **Возврат**: Верните `prev` как новую голову списка

### Рекурсивный подход:

1. Базовый случай: если `head == None` или `head.next == None`, верните `head`
2. Рекурсивно разверните остальную часть списка
3. Установите `head.next.next = head` и `head.next = None`
4. Верните новую голову

## Визуализация

### Итеративный разворот:

```
Исходный список: 1 -> 2 -> 3 -> 4 -> 5 -> None

Шаг 1: prev=None, curr=1, next=None
        prev    curr
        None <- 1 -> 2 -> 3 -> 4 -> 5 -> None

Шаг 2: prev=1, curr=2, next=2
              prev  curr
        None <- 1 <- 2 -> 3 -> 4 -> 5 -> None

Шаг 3: prev=2, curr=3, next=3
                    prev  curr
        None <- 1 <- 2 <- 3 -> 4 -> 5 -> None

Шаг 4: prev=3, curr=4, next=4
                          prev  curr
        None <- 1 <- 2 <- 3 <- 4 -> 5 -> None

Шаг 5: prev=4, curr=5, next=5
                                prev  curr
        None <- 1 <- 2 <- 3 <- 4 <- 5 -> None

Шаг 6: prev=5, curr=None
                                      prev
        None <- 1 <- 2 <- 3 <- 4 <- 5

Результат: 5 -> 4 -> 3 -> 2 -> 1 -> None
```

## Математическое обоснование

### Почему алгоритм работает?

**Инвариант**: После обработки k узлов, первые k узлов развернуты и образуют корректный список, указывающий в обратном направлении.

**Доказательство корректности**:
1. **Базовый случай**: После обработки 0 узлов, список пуст (корректно)
2. **Индуктивный шаг**: Предположим, первые k узлов развернуты корректно
   - Обрабатываем (k+1)-й узел
   - Меняем его указатель на предыдущий узел
   - Первые k+1 узлов теперь развернуты корректно

**Почему сложность O(n)?**

Каждый узел посещается ровно один раз, и для каждого узла выполняется константное количество операций → O(n).

## Временная и пространственная сложность

### Детальный анализ:

**Итеративный подход**:
- **Временная сложность**: O(n) - один проход по списку
- **Пространственная сложность**: O(1) - только три указателя

**Рекурсивный подход**:
- **Временная сложность**: O(n) - один проход по списку
- **Пространственная сложность**: O(n) - глубина рекурсии равна длине списка

### Сравнение подходов:

| Подход | Время | Память | Преимущества |
|--------|-------|--------|--------------|
| Итеративный | O(n) | O(1) | Эффективен по памяти |
| Рекурсивный | O(n) | O(n) | Более элегантный код |

## Типичные ошибки

1. **Потеря ссылки на следующий узел**: Всегда сохраняйте `next` перед изменением `curr.next`
2. **Неправильный возврат**: Возвращайте `prev`, а не `curr` (curr будет None)
3. **Обработка пустого списка**: Проверяйте `head == None` перед началом

## Практические советы

1. Используйте итеративный подход для больших списков (избегайте переполнения стека)
2. Рекурсивный подход более читаемый для небольших списков
3. Всегда тестируйте на пустом списке и списке из одного элемента

## Структуры данных: внутреннее устройство

### Используемые структуры данных в Reverse Linked List

В шаблоне Reverse Linked List используются следующие структуры данных:
- **LinkedList Node**: Узлы связанного списка (Box&lt;T&gt; в Rust, указатели в Go)
- **Указатели**: Для навигации по списку (prev, curr, next)

### LinkedList Node (Узел связанного списка)

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
```

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
```

#### Операции и их сложность:

| Операция | Сложность | Объяснение |
|----------|-----------|------------|
| Итеративный разворот | O(n) | Проход по всем узлам один раз |
| Рекурсивный разворот | O(n) | Рекурсивный вызов для каждого узла |
| Изменение указателя | O(1) | Простое присваивание |

**Почему Reverse эффективен**:
- In-place операция: не создаем новые узлы
- O(1) дополнительная память (только указатели)
- O(n) время: один проход по списку

## Глубокое понимание: сложные концепции

### Escape Analysis (Go)

**Для Reverse Linked List**:
- Узлы списка всегда в куче
- Указатели prev, curr, next - на стеке
- Результат может escape, если возвращается

### Borrow Checker (Rust)

**Типичный паттерн**:
```rust
fn reverse_list(head: Option&lt;Box&lt;ListNode&gt;&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    let mut prev = None;
    let mut curr = head;
    while let Some(mut node) = curr {
        let next = node.next.take();
        node.next = prev;
        prev = Some(node);
        curr = next;
    }
    prev
}
```

**Важно**: Используем `take()` для временного владения узлом.

### Garbage Collector (Go)

**Для Reverse Linked List**:
- Узлы в куче управляются GC
- In-place разворот не создает новых узлов
- Минимальное влияние на GC

### Ownership и Move Semantics (Rust)

**Концепция владения**:
- Каждый `Box&lt;ListNode&gt;` владеет следующим узлом
- При развороте передаем владение между указателями
- RAII гарантирует освобождение памяти

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: In-place разворот

В Rust для Reverse Linked List:
- **Итеративный подход**: Только указатели на стеке - O(1)
- **Рекурсивный подход**: Стек вызовов - O(n)
- **Узлы**: Уже аллоцированы, только меняем указатели

#### Go: In-place разворот

В Go:
- **Итеративный подход**: Только указатели на стеке - O(1)
- **Рекурсивный подход**: Стек вызовов - O(n)
- **Узлы**: Уже в куче, только меняем указатели

### Анализ аллокаций для Reverse Linked List

#### Итеративный подход:

**Rust**:
```rust
// Аллокации:
// - prev, curr, next: Option&lt;Box&lt;ListNode&gt;&gt; (указатели) - O(1)
// - Никаких новых узлов не создается
// Итого: O(1) памяти, только указатели
```

**Go**:
```go
// Аллокации:
// - prev, curr, next: *ListNode (указатели) - O(1)
// - Никаких новых узлов не создается
// Итого: O(1) памяти, только указатели
```

#### Рекурсивный подход:

**Rust**:
```rust
// Аллокации:
// - Стек вызовов: O(n) для глубины рекурсии
// Итого: O(n) памяти для стека
```

**Go**:
```go
// Аллокации:
// - Стек вызовов: O(n) для глубины рекурсии
// Итого: O(n) памяти для стека
```

### Оптимизация памяти

#### Rust оптимизации:

1. **Использование итеративного подхода**:
```rust
// ✅ O(1) памяти вместо O(n)
pub fn reverse_list_iterative(head: Option&lt;Box&lt;ListNode&gt;&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    let mut prev = None;
    let mut curr = head;
    
    while let Some(mut node) = curr {
        let next = node.next.take();
        node.next = prev;
        prev = Some(node);
        curr = next;
    }
    prev
}
```

2. **Избежание клонирования**:
```rust
// ✅ Используем take() вместо clone()
let next = node.next.take();
```

#### Go оптимизации:

1. **Использование итеративного подхода**:
```go
// ✅ O(1) памяти вместо O(n)
func reverseListIterative(head *ListNode) *ListNode {
    var prev *ListNode
    curr := head
    
    for curr != nil {
        next := curr.Next
        curr.Next = prev
        prev = curr
        curr = next
    }
    return prev
}
```

2. **Избежание создания новых узлов**:
```go
// ✅ Модифицируем существующие узлы
curr.Next = prev
```

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Итеративный | O(1) память | O(1) память |
| Рекурсивный | O(n) стек | O(n) стек |
| Узлы | Box в куче | Указатели в куче |
| Производительность | Предсказуемая | Предсказуемая |

## Оптимизация производительности

### Общие техники

1. **Использование итеративного подхода**:
   - Избегайте переполнения стека
   - Лучшая производительность

2. **Минимизация операций**:
   - Сохраняйте next перед изменением
   - Избегайте лишних проверок

### Специфичные оптимизации для Reverse Linked List

#### 1. Оптимизация итеративного подхода:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub fn reverse_list_optimized(head: Option&lt;Box&lt;ListNode&gt;&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    let mut prev = None;
    let mut curr = head;
    
    while let Some(mut node) = curr {
        curr = node.next.take();
        node.next = prev;
        prev = Some(node);
    }
    prev
}
```

**Go**:
```go
// ✅ Оптимизированная версия
func reverseListOptimized(head *ListNode) *ListNode {
    var prev *ListNode
    curr := head
    
    for curr != nil {
        next := curr.Next
        curr.Next = prev
        prev, curr = curr, next
    }
    return prev
}
```

### Оптимизация для Rust

1. **Использование `take()`**:
```rust
// ✅ Эффективное перемещение владения
curr = node.next.take();
```

2. **Избежание лишних проверок**:
```rust
// ✅ Pattern matching оптимизирован компилятором
while let Some(mut node) = curr {
    // ...
}
```

### Оптимизация для Go

1. **Множественное присваивание**:
```go
// ✅ Эффективный swap
prev, curr = curr, next
```

2. **Минимизация проверок**:
```go
// ✅ Простая проверка nil
for curr != nil {
    // ...
}
```

## Профилирование

### Инструменты профилирования

См. раздел "Профилирование" в [Sliding Window](./sliding-window.md#профилирование) для общих инструментов.

### Как профилировать Reverse Linked List

#### Rust пример:

```rust
// benches/reverse_list_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_reverse_list(c: &mut Criterion) {
    let list = create_list(1000);
    
    c.bench_function("reverse_1000", |b| {
        b.iter(|| reverse_list_optimized(black_box(list.clone())))
    });
}

criterion_group!(benches, bench_reverse_list);
criterion_main!(benches);
```

#### Go пример:

```go
func BenchmarkReverseList(b *testing.B) {
    list := createList(1000)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        reverseListOptimized(list)
    }
}
```

### Примеры профилирования

**Анализ производительности**:
- Итеративный: O(n) по времени, O(1) памяти
- Рекурсивный: O(n) по времени, O(n) памяти
- Минимальные аллокации (только указатели)

**Типичные узлые места**:
- Доступ к полям узлов
- Изменение указателей
- Проверки на nil/None

## Тестирование

### Стратегии тестирования

1. **Базовые тесты**: Простые случаи разворота
2. **Граничные случаи**: Пустой список, один элемент
3. **Стресс-тесты**: Большие списки

### Примеры тестов для Reverse Linked List

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reverse_basic() {
        let list = create_list(vec![1, 2, 3, 4, 5]);
        let reversed = reverse_list_optimized(list);
        assert_eq!(list_to_vec(reversed), vec![5, 4, 3, 2, 1]);
    }

    #[test]
    fn test_reverse_empty() {
        let list = None;
        let reversed = reverse_list_optimized(list);
        assert_eq!(list_to_vec(reversed), vec![]);
    }

    #[test]
    fn test_reverse_single() {
        let list = create_list(vec![1]);
        let reversed = reverse_list_optimized(list);
        assert_eq!(list_to_vec(reversed), vec![1]);
    }
}
```

#### Go тесты:

```go
func TestReverseList(t *testing.T) {
    tests := []struct {
        name string
        list *ListNode
        want []int
    }{
        {"basic", createList([]int{1, 2, 3, 4, 5}), []int{5, 4, 3, 2, 1}},
        {"empty", nil, []int{}},
        {"single", createList([]int{1}), []int{1}},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := reverseListOptimized(tt.list)
            if !reflect.DeepEqual(listToVec(result), tt.want) {
                t.Errorf("reverseListOptimized() = %v, want %v", listToVec(result), tt.want)
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

fn reverse_list_benchmark(c: &mut Criterion) {
    let sizes = vec![100, 1000, 10000, 100000];
    
    let mut group = c.benchmark_group("reverse_list");
    for size in sizes {
        let list = create_list(size);
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            &list,
            |b, list| {
                b.iter(|| reverse_list_optimized(black_box(list.clone())));
            },
        );
    }
    group.finish();
}
```

#### Go:
```go
func BenchmarkReverseListSizes(b *testing.B) {
    sizes := []int{100, 1000, 10000, 100000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            list := createList(size)
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                reverseListOptimized(list)
            }
        })
    }
}
```

## Примеры задач на LeetCode

### Легкие:
- [Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/) - Разворот связанного списка
- [Reverse String](https://leetcode.com/problems/reverse-string/) - Разворот строки (аналогичный подход)

### Средние:
- [Reverse Linked List II](https://leetcode.com/problems/reverse-linked-list-ii/) - Разворот части списка
- [Reverse Nodes in k-Group](https://leetcode.com/problems/reverse-nodes-in-k-group/) - Разворот узлов группами по K
- [Swap Nodes in Pairs](https://leetcode.com/problems/swap-nodes-in-pairs/) - Обмен узлами парами

### Сложные:
- [Reverse Nodes in Even Length Groups](https://leetcode.com/problems/reverse-nodes-in-even-length-groups/) - Разворот узлов в группах четной длины

## Примеры кода

### Rust

```rust
// Примеры использования шаблона Reverse Linked List на Rust

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

/// Пример 1: Итеративный разворот связанного списка
/// 
/// Задача: Развернуть связанный список итеративно
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn reverse_list_iterative(mut head: Option&lt;Box&lt;ListNode&gt;&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    let mut prev = None;
    let mut curr = head;

    while let Some(mut node) = curr {
        let next = node.next.take();
        node.next = prev;
        prev = Some(node);
        curr = next;
    }

    prev
}

/// Пример 2: Рекурсивный разворот связанного списка
/// 
/// Задача: Развернуть связанный список рекурсивно
/// Временная сложность: O(n)
/// Пространственная сложность: O(n) из-за стека вызовов
pub fn reverse_list_recursive(head: Option&lt;Box&lt;ListNode&gt;&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    fn reverse(
        prev: Option&lt;Box&lt;ListNode&gt;&gt;,
        curr: Option&lt;Box&lt;ListNode&gt;&gt;,
    ) -> Option&lt;Box&lt;ListNode&gt;&gt; {
        match curr {
            None => prev,
            Some(mut node) => {
                let next = node.next.take();
                node.next = prev;
                reverse(Some(node), next)
            }
        }
    }

    reverse(None, head)
}

/// Пример 3: Разворот части списка (от позиции left до right)
/// 
/// Задача: Развернуть узлы списка от позиции left до right
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn reverse_between(
    head: Option&lt;Box&lt;ListNode&gt;&gt;,
    left: i32,
    right: i32,
) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    if left == right {
        return head;
    }

    let mut dummy = Box::new(ListNode { val: 0, next: head });
    let mut prev = &mut dummy;

    // Переходим к узлу перед left
    for _ in 1..left {
        prev = prev.next.as_mut().unwrap();
    }

    // Разворачиваем часть списка
    let mut curr = prev.next.take();
    let mut next = None;

    for _ in 0..=right - left {
        if let Some(mut node) = curr {
            let temp = node.next.take();
            node.next = next;
            next = Some(node);
            curr = temp;
        }
    }

    // Соединяем части
    prev.next = next;
    while prev.next.is_some() {
        prev = prev.next.as_mut().unwrap();
    }
    prev.next = curr;

    dummy.next
}

/// Пример 4: Разворот узлов группами по K
/// 
/// Задача: Развернуть узлы списка группами по K элементов
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn reverse_k_group(head: Option&lt;Box&lt;ListNode&gt;&gt;, k: i32) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    let mut curr = head.as_ref();
    let mut count = 0;

    // Проверяем, достаточно ли узлов для группы
    while curr.is_some() && count < k {
        curr = curr.unwrap().next.as_ref();
        count += 1;
    }

    // Если достаточно узлов, разворачиваем
    if count == k {
        // Рекурсивно обрабатываем остальную часть
        curr = head.as_ref();
        for _ in 0..k {
            curr = curr.unwrap().next.as_ref();
        }

        let mut reversed_rest = reverse_k_group(
            curr.cloned(),
            k,
        );

        // Разворачиваем текущую группу
        let mut curr_head = head;
        while reversed_rest.is_some() {
            let mut next = curr_head.as_mut().unwrap().next.take();
            curr_head.as_mut().unwrap().next = reversed_rest;
            reversed_rest = next;
            curr_head = curr_head.unwrap().next;
        }

        curr_head
    } else {
        // Недостаточно узлов, возвращаем как есть
        head
    }
}

/// Пример 5: Обмен узлами парами
/// 
/// Задача: Обменять каждые два соседних узла
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn swap_pairs(head: Option&lt;Box&lt;ListNode&gt;&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    let mut dummy = Box::new(ListNode { val: 0, next: head });
    let mut prev = &mut dummy;

    while prev.next.is_some() && prev.next.as_ref().unwrap().next.is_some() {
        let mut first = prev.next.take().unwrap();
        let mut second = first.next.take().unwrap();
        let next = second.next.take();

        first.next = next;
        second.next = Some(first);
        prev.next = Some(second);

        prev = prev.next.as_mut().unwrap().next.as_mut().unwrap();
    }

    dummy.next
}

/// Пример 6: Разворот связанного списка (упрощенная версия)
/// 
/// Задача: Развернуть весь список (базовая версия)
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn reverse_list(head: Option&lt;Box&lt;ListNode&gt;&gt;) -> Option&lt;Box&lt;ListNode&gt;&gt; {
    reverse_list_iterative(head)
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

// Пример 1: Итеративный разворот связанного списка
//
// Задача: Развернуть связанный список итеративно
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func reverseListIterative(head *ListNode) *ListNode {
	var prev *ListNode
	curr := head

	for curr != nil {
		next := curr.Next
		curr.Next = prev
		prev = curr
		curr = next
	}

	return prev
}

// Пример 2: Рекурсивный разворот связанного списка
//
// Задача: Развернуть связанный список рекурсивно
// Временная сложность: O(n)
// Пространственная сложность: O(n) из-за стека вызовов
func reverseListRecursive(head *ListNode) *ListNode {
	if head == nil || head.Next == nil {
		return head
	}

	// Рекурсивно разворачиваем остальную часть
	reversed := reverseListRecursive(head.Next)

	// Разворачиваем текущий узел
	head.Next.Next = head
	head.Next = nil

	return reversed
}

// Пример 3: Разворот части списка (от позиции left до right)
//
// Задача: Развернуть узлы списка от позиции left до right
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func reverseBetween(head *ListNode, left, right int) *ListNode {
	if left == right {
		return head
	}

	dummy := &ListNode{Val: 0, Next: head}
	prev := dummy

	// Переходим к узлу перед left
	for i := 1; i < left; i++ {
		prev = prev.Next
	}

	// Разворачиваем часть списка
	curr := prev.Next
	var next *ListNode

	for i := 0; i <= right-left; i++ {
		temp := curr.Next
		curr.Next = next
		next = curr
		curr = temp
	}

	// Соединяем части
	prev.Next.Next = curr
	prev.Next = next

	return dummy.Next
}

// Пример 4: Разворот узлов группами по K
//
// Задача: Развернуть узлы списка группами по K элементов
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func reverseKGroup(head *ListNode, k int) *ListNode {
	curr := head
	count := 0

	// Проверяем, достаточно ли узлов для группы
	for curr != nil && count < k {
		curr = curr.Next
		count++
	}

	// Если достаточно узлов, разворачиваем
	if count == k {
		// Рекурсивно обрабатываем остальную часть
		curr = reverseKGroup(curr, k)

		// Разворачиваем текущую группу
		for count > 0 {
			next := head.Next
			head.Next = curr
			curr = head
			head = next
			count--
		}

		head = curr
	}

	return head
}

// Пример 5: Обмен узлами парами
//
// Задача: Обменять каждые два соседних узла
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func swapPairs(head *ListNode) *ListNode {
	dummy := &ListNode{Val: 0, Next: head}
	prev := dummy

	for prev.Next != nil && prev.Next.Next != nil {
		first := prev.Next
		second := first.Next

		first.Next = second.Next
		second.Next = first
		prev.Next = second

		prev = first
	}

	return dummy.Next
}

// Пример 6: Разворот связанного списка (упрощенная версия)
//
// Задача: Развернуть весь список (базовая версия)
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func reverseList(head *ListNode) *ListNode {
	return reverseListIterative(head)
}
```

