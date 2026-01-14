// Примеры использования шаблона K-way Merge на Rust

use std::collections::BinaryHeap;
use std::cmp::Reverse;

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

/// Пример 1: Слияние K отсортированных списков
/// 
/// Задача: Объединить K отсортированных связанных списков в один
/// Временная сложность: O(n log k), где n - общее количество узлов
/// Пространственная сложность: O(k)
pub fn merge_k_lists(lists: Vec<Option<Box<ListNode>>>) -> Option<Box<ListNode>> {
    let mut heap = BinaryHeap::new();

    // Добавляем первые элементы всех списков в кучу
    for (idx, list) in lists.iter().enumerate() {
        if let Some(node) = list {
            heap.push(Reverse((node.val, idx)));
        }
    }

    let mut dummy = Box::new(ListNode::new(0));
    let mut current = &mut dummy;
    let mut lists = lists;

    while let Some(Reverse((val, idx))) = heap.pop() {
        // Создаем новый узел
        current.next = Some(Box::new(ListNode::new(val)));
        current = current.next.as_mut().unwrap();

        // Перемещаемся к следующему узлу в списке
        if let Some(node) = &mut lists[idx] {
            *node = node.next.take();
            if let Some(next_node) = &node {
                heap.push(Reverse((next_node.val, idx)));
            }
        }
    }

    dummy.next
}

/// Пример 2: Слияние K отсортированных массивов
/// 
/// Задача: Объединить K отсортированных массивов в один отсортированный массив
/// Временная сложность: O(n log k)
/// Пространственная сложность: O(k)
pub fn merge_k_arrays(arrays: Vec<Vec<i32>>) -> Vec<i32> {
    let mut heap = BinaryHeap::new();
    let mut indices = vec![0; arrays.len()];
    let mut result = Vec::new();

    // Добавляем первые элементы всех массивов в кучу
    for (idx, arr) in arrays.iter().enumerate() {
        if !arr.is_empty() {
            heap.push(Reverse((arr[0], idx)));
        }
    }

    while let Some(Reverse((val, arr_idx))) = heap.pop() {
        result.push(val);
        indices[arr_idx] += 1;

        // Добавляем следующий элемент из того же массива
        if indices[arr_idx] < arrays[arr_idx].len() {
            let next_val = arrays[arr_idx][indices[arr_idx]];
            heap.push(Reverse((next_val, arr_idx)));
        }
    }

    result
}

/// Пример 3: K-й наименьший элемент в отсортированной матрице
/// 
/// Задача: Найти K-й наименьший элемент в матрице, где каждая строка и столбец отсортированы
/// Временная сложность: O(k log k)
/// Пространственная сложность: O(k)
pub fn kth_smallest(matrix: Vec<Vec<i32>>, k: i32) -> i32 {
    let mut heap = BinaryHeap::new();
    let n = matrix.len();

    // Добавляем первые элементы каждой строки
    for i in 0..n.min(k as usize) {
        heap.push(Reverse((matrix[i][0], i, 0)));
    }

    let mut count = 0;
    let mut result = 0;

    while let Some(Reverse((val, row, col))) = heap.pop() {
        count += 1;
        if count == k {
            result = val;
            break;
        }

        // Добавляем следующий элемент из той же строки
        if col + 1 < n {
            heap.push(Reverse((matrix[row][col + 1], row, col + 1)));
        }
    }

    result
}

/// Пример 4: K пар с наименьшими суммами
/// 
/// Задача: Найти K пар (u, v), где u из nums1, v из nums2, с наименьшими суммами
/// Временная сложность: O(k log k)
/// Пространственная сложность: O(k)
pub fn k_smallest_pairs(nums1: Vec<i32>, nums2: Vec<i32>, k: i32) -> Vec<Vec<i32>> {
    let mut heap = BinaryHeap::new();
    let k = k as usize;

    // Добавляем первые пары
    for i in 0..nums1.len().min(k) {
        heap.push(Reverse((
            nums1[i] + nums2[0],
            i,
            0,
        )));
    }

    let mut result = Vec::new();

    while let Some(Reverse((sum, i, j))) = heap.pop() {
        result.push(vec![nums1[i], nums2[j]]);

        if result.len() == k {
            break;
        }

        // Добавляем следующую пару из того же элемента nums1
        if j + 1 < nums2.len() {
            heap.push(Reverse((
                nums1[i] + nums2[j + 1],
                i,
                j + 1,
            )));
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_k_arrays() {
        let arrays = vec![
            vec![1, 4, 7],
            vec![2, 5, 8],
            vec![3, 6, 9],
        ];
        let result = merge_k_arrays(arrays);
        assert_eq!(result, vec![1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }

    #[test]
    fn test_kth_smallest() {
        let matrix = vec![
            vec![1, 5, 9],
            vec![10, 11, 13],
            vec![12, 13, 15],
        ];
        assert_eq!(kth_smallest(matrix, 8), 13);
    }

    #[test]
    fn test_k_smallest_pairs() {
        let nums1 = vec![1, 7, 11];
        let nums2 = vec![2, 4, 6];
        let result = k_smallest_pairs(nums1, nums2, 3);
        assert_eq!(result.len(), 3);
    }
}

