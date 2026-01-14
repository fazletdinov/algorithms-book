// Примеры использования шаблона Modified Binary Search на Rust

/// Пример 1: Классический бинарный поиск
/// 
/// Задача: Найти индекс элемента target в отсортированном массиве
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn binary_search(nums: Vec<i32>, target: i32) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];

        if mid_val == target {
            return mid;
        } else if mid_val < target {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    -1
}

/// Пример 2: Поиск первого вхождения элемента
/// 
/// Задача: Найти индекс первого вхождения target в отсортированном массиве
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn search_first(nums: Vec<i32>, target: i32) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;
    let mut result = -1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];

        if mid_val == target {
            result = mid;
            right = mid - 1; // Продолжаем искать влево
        } else if mid_val < target {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    result
}

/// Пример 3: Поиск последнего вхождения элемента
/// 
/// Задача: Найти индекс последнего вхождения target в отсортированном массиве
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn search_last(nums: Vec<i32>, target: i32) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;
    let mut result = -1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];

        if mid_val == target {
            result = mid;
            left = mid + 1; // Продолжаем искать вправо
        } else if mid_val < target {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    result
}

/// Пример 4: Поиск в повернутом отсортированном массиве
/// 
/// Задача: Найти target в массиве, который был повернут
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn search_rotated(nums: Vec<i32>, target: i32) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];

        if mid_val == target {
            return mid;
        }

        // Определяем, какая часть отсортирована
        if nums[left as usize] <= mid_val {
            // Левая часть отсортирована
            if nums[left as usize] <= target && target < mid_val {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        } else {
            // Правая часть отсортирована
            if mid_val < target && target <= nums[right as usize] {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
    }

    -1
}

/// Пример 5: Поиск минимума в повернутом массиве
/// 
/// Задача: Найти минимальный элемент в повернутом отсортированном массиве
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn find_min_rotated(nums: Vec<i32>) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;

    while left < right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];
        let right_val = nums[right as usize];

        if mid_val > right_val {
            // Минимум в правой части
            left = mid + 1;
        } else {
            // Минимум в левой части (включая mid)
            right = mid;
        }
    }

    nums[left as usize]
}

/// Пример 6: Поиск в 2D матрице
/// 
/// Задача: Найти target в отсортированной 2D матрице
/// Временная сложность: O(log(m×n))
/// Пространственная сложность: O(1)
pub fn search_matrix(matrix: Vec<Vec<i32>>, target: i32) -> bool {
    if matrix.is_empty() || matrix[0].is_empty() {
        return false;
    }

    let rows = matrix.len();
    let cols = matrix[0].len();
    let mut left = 0;
    let mut right = (rows * cols) as i32 - 1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let row = (mid / cols as i32) as usize;
        let col = (mid % cols as i32) as usize;
        let mid_val = matrix[row][col];

        if mid_val == target {
            return true;
        } else if mid_val < target {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    false
}

/// Пример 7: Поиск вставки элемента
/// 
/// Задача: Найти индекс, куда нужно вставить target в отсортированном массиве
/// Временная сложность: O(log n)
/// Пространственная сложность: O(1)
pub fn search_insert(nums: Vec<i32>, target: i32) -> i32 {
    let mut left = 0;
    let mut right = nums.len() as i32 - 1;

    while left <= right {
        let mid = left + (right - left) / 2;
        let mid_val = nums[mid as usize];

        if mid_val == target {
            return mid;
        } else if mid_val < target {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    left
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_binary_search() {
        assert_eq!(binary_search(vec![1, 2, 3, 4, 5], 3), 2);
        assert_eq!(binary_search(vec![1, 2, 3, 4, 5], 6), -1);
    }

    #[test]
    fn test_search_first() {
        assert_eq!(search_first(vec![1, 2, 2, 2, 3], 2), 1);
    }

    #[test]
    fn test_search_last() {
        assert_eq!(search_last(vec![1, 2, 2, 2, 3], 2), 3);
    }

    #[test]
    fn test_search_rotated() {
        assert_eq!(search_rotated(vec![4, 5, 6, 7, 0, 1, 2], 0), 4);
    }

    #[test]
    fn test_find_min_rotated() {
        assert_eq!(find_min_rotated(vec![3, 4, 5, 1, 2]), 1);
    }

    #[test]
    fn test_search_matrix() {
        let matrix = vec![
            vec![1, 3, 5, 7],
            vec![10, 11, 16, 20],
            vec![23, 30, 34, 60],
        ];
        assert!(search_matrix(matrix, 3));
    }

    #[test]
    fn test_search_insert() {
        assert_eq!(search_insert(vec![1, 3, 5, 6], 5), 2);
        assert_eq!(search_insert(vec![1, 3, 5, 6], 2), 1);
    }
}

