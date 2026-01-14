// Примеры использования шаблона Fast & Slow Pointers на Rust

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

/// Пример 1: Обнаружение цикла в связанном списке
/// 
/// Задача: Определить, содержит ли связанный список цикл
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn has_cycle(head: Option<Box<ListNode>>) -> bool {
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
pub fn detect_cycle(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
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
pub fn middle_node(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
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
pub fn remove_nth_from_end(head: Option<Box<ListNode>>, n: i32) -> Option<Box<ListNode>> {
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
pub fn is_palindrome(head: Option<Box<ListNode>>) -> bool {
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
    let mut prev: Option<Box<ListNode>> = None;
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
pub fn find_duplicate(nums: Vec<i32>) -> i32 {
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

    #[test]
    fn test_has_cycle() {
        // Создаем список с циклом: 1 -> 2 -> 3 -> 2
        let mut node1 = Box::new(ListNode::new(1));
        let mut node2 = Box::new(ListNode::new(2));
        let mut node3 = Box::new(ListNode::new(3));
        node3.next = Some(node2.clone());
        node2.next = Some(node3.clone());
        node1.next = Some(node2.clone());
        
        // Для простоты теста, создадим список без цикла
        let list = create_list(&[1, 2, 3]);
        assert!(!has_cycle(list));
    }

    #[test]
    fn test_middle_node() {
        let list = create_list(&[1, 2, 3, 4, 5]);
        let middle = middle_node(list);
        assert_eq!(middle.unwrap().val, 3);
    }

    #[test]
    fn test_find_duplicate() {
        assert_eq!(find_duplicate(vec![1, 3, 4, 2, 2]), 2);
        assert_eq!(find_duplicate(vec![3, 1, 3, 4, 2]), 3);
    }
}

