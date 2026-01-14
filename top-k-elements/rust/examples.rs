// Примеры использования шаблона Top K Elements на Rust

use std::collections::{BinaryHeap, HashMap};
use std::cmp::Reverse;

/// Пример 1: K наибольших элементов
/// 
/// Задача: Найти K наибольших элементов в массиве
/// Временная сложность: O(n log k)
/// Пространственная сложность: O(k)
pub fn find_k_largest(nums: Vec<i32>, k: usize) -> Vec<i32> {
    let mut min_heap = BinaryHeap::new();

    for &num in &nums {
        if min_heap.len() < k {
            min_heap.push(Reverse(num));
        } else if let Some(&Reverse(min_val)) = min_heap.peek() {
            if num > min_val {
                min_heap.pop();
                min_heap.push(Reverse(num));
            }
        }
    }

    min_heap.into_iter().map(|Reverse(x)| x).collect()
}

/// Пример 2: K наименьших элементов
/// 
/// Задача: Найти K наименьших элементов в массиве
/// Временная сложность: O(n log k)
/// Пространственная сложность: O(k)
pub fn find_k_smallest(nums: Vec<i32>, k: usize) -> Vec<i32> {
    let mut max_heap = BinaryHeap::new();

    for &num in &nums {
        if max_heap.len() < k {
            max_heap.push(num);
        } else if let Some(&max_val) = max_heap.peek() {
            if num < max_val {
                max_heap.pop();
                max_heap.push(num);
            }
        }
    }

    max_heap.into_iter().collect()
}

/// Пример 3: K-й наибольший элемент
/// 
/// Задача: Найти K-й наибольший элемент в массиве
/// Временная сложность: O(n log k)
/// Пространственная сложность: O(k)
pub fn find_kth_largest(nums: Vec<i32>, k: i32) -> i32 {
    let mut min_heap = BinaryHeap::new();
    let k = k as usize;

    for &num in &nums {
        if min_heap.len() < k {
            min_heap.push(Reverse(num));
        } else if let Some(&Reverse(min_val)) = min_heap.peek() {
            if num > min_val {
                min_heap.pop();
                min_heap.push(Reverse(num));
            }
        }
    }

    min_heap.peek().unwrap().0
}

/// Пример 4: Топ K частых элементов
/// 
/// Задача: Найти K наиболее частых элементов
/// Временная сложность: O(n + k log k)
/// Пространственная сложность: O(n)
pub fn top_k_frequent(nums: Vec<i32>, k: i32) -> Vec<i32> {
    // Подсчитываем частоту
    let mut freq_map = HashMap::new();
    for &num in &nums {
        *freq_map.entry(num).or_insert(0) += 1;
    }

    // Используем min-heap для хранения топ K
    let mut min_heap = BinaryHeap::new();
    let k = k as usize;

    for (num, freq) in freq_map {
        if min_heap.len() < k {
            min_heap.push((Reverse(freq), num));
        } else if let Some(&(Reverse(min_freq), _)) = min_heap.peek() {
            if freq > min_freq {
                min_heap.pop();
                min_heap.push((Reverse(freq), num));
            }
        }
    }

    min_heap.into_iter().map(|(_, num)| num).collect()
}

/// Пример 5: K ближайших точек к началу координат
/// 
/// Задача: Найти K ближайших точек к началу координат
/// Временная сложность: O(n log k)
/// Пространственная сложность: O(k)
pub fn k_closest(points: Vec<Vec<i32>>, k: i32) -> Vec<Vec<i32>> {
    let mut max_heap = BinaryHeap::new();
    let k = k as usize;

    for point in &points {
        let distance = point[0] * point[0] + point[1] * point[1];
        
        if max_heap.len() < k {
            max_heap.push((distance, point.clone()));
        } else if let Some(&(max_dist, _)) = max_heap.peek() {
            if distance < max_dist {
                max_heap.pop();
                max_heap.push((distance, point.clone()));
            }
        }
    }

    max_heap.into_iter().map(|(_, point)| point).collect()
}

/// Пример 6: Сортировка символов по частоте
/// 
/// Задача: Отсортировать символы строки по убыванию частоты
/// Временная сложность: O(n log n)
/// Пространственная сложность: O(n)
pub fn frequency_sort(s: String) -> String {
    // Подсчитываем частоту
    let mut freq_map = HashMap::new();
    for ch in s.chars() {
        *freq_map.entry(ch).or_insert(0) += 1;
    }

    // Используем max-heap для сортировки по частоте
    let mut max_heap = BinaryHeap::new();
    for (ch, freq) in freq_map {
        max_heap.push((freq, ch));
    }

    // Строим результирующую строку
    let mut result = String::new();
    while let Some((freq, ch)) = max_heap.pop() {
        result.push_str(&ch.to_string().repeat(freq));
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_k_largest() {
        let result = find_k_largest(vec![3, 1, 5, 12, 2, 11], 3);
        assert_eq!(result.len(), 3);
    }

    #[test]
    fn test_find_kth_largest() {
        assert_eq!(find_kth_largest(vec![3, 2, 1, 5, 6, 4], 2), 5);
    }

    #[test]
    fn test_top_k_frequent() {
        let result = top_k_frequent(vec![1, 1, 1, 2, 2, 3], 2);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_k_closest() {
        let points = vec![vec![1, 3], vec![-2, 2]];
        let result = k_closest(points, 1);
        assert_eq!(result.len(), 1);
    }
}

