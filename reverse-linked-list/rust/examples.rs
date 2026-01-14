// Примеры использования шаблона Reverse Linked List на Rust

// Определение узла связанного списка
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
    pub val: i32,
    pub next: Option<Box<ListNode>>,
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
pub fn reverse_list_iterative(mut head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
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
pub fn reverse_list_recursive(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    fn reverse(
        prev: Option<Box<ListNode>>,
        curr: Option<Box<ListNode>>,
    ) -> Option<Box<ListNode>> {
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
    head: Option<Box<ListNode>>,
    left: i32,
    right: i32,
) -> Option<Box<ListNode>> {
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
pub fn reverse_k_group(head: Option<Box<ListNode>>, k: i32) -> Option<Box<ListNode>> {
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
pub fn swap_pairs(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
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
pub fn reverse_list(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    reverse_list_iterative(head)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_list(values: &[i32]) -> Option<Box<ListNode>> {
        let mut head = None;
        for &val in values.iter().rev() {
            let mut node = ListNode::new(val);
            node.next = head;
            head = Some(Box::new(node));
        }
        head
    }

    fn list_to_vec(head: Option<Box<ListNode>>) -> Vec<i32> {
        let mut result = Vec::new();
        let mut curr = head;
        while let Some(node) = curr {
            result.push(node.val);
            curr = node.next;
        }
        result
    }

    #[test]
    fn test_reverse_list_iterative() {
        let list = create_list(&[1, 2, 3, 4, 5]);
        let reversed = reverse_list_iterative(list);
        assert_eq!(list_to_vec(reversed), vec![5, 4, 3, 2, 1]);
    }

    #[test]
    fn test_reverse_list_recursive() {
        let list = create_list(&[1, 2, 3, 4]);
        let reversed = reverse_list_recursive(list);
        assert_eq!(list_to_vec(reversed), vec![4, 3, 2, 1]);
    }

    #[test]
    fn test_swap_pairs() {
        let list = create_list(&[1, 2, 3, 4]);
        let swapped = swap_pairs(list);
        assert_eq!(list_to_vec(swapped), vec![2, 1, 4, 3]);
    }
}

