// Примеры использования шаблона Two Pointers на Rust

/// Пример 1: Поиск двух чисел с заданной суммой в отсортированном массиве
/// 
/// Задача: Найти два числа в отсортированном массиве, сумма которых равна target
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn two_sum_sorted(arr: &[i32], target: i32) -> Option<(usize, usize)> {
    let mut left = 0;
    let mut right = arr.len().saturating_sub(1);

    while left < right {
        let sum = arr[left] + arr[right];
        
        if sum == target {
            return Some((left, right));
        } else if sum < target {
            left += 1;
        } else {
            right -= 1;
        }
    }

    None
}

/// Пример 2: Удаление дубликатов из отсортированного массива
/// 
/// Задача: Удалить дубликаты из отсортированного массива на месте
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn remove_duplicates(nums: &mut [i32]) -> usize {
    if nums.is_empty() {
        return 0;
    }

    let mut slow = 0;

    for fast in 1..nums.len() {
        if nums[slow] != nums[fast] {
            slow += 1;
            nums[slow] = nums[fast];
        }
    }

    slow + 1
}

/// Пример 3: Три числа с нулевой суммой (3Sum)
/// 
/// Задача: Найти все уникальные тройки чисел, сумма которых равна нулю
/// Временная сложность: O(n²)
/// Пространственная сложность: O(1) без учета результата
pub fn three_sum(mut nums: Vec<i32>) -> Vec<Vec<i32>> {
    nums.sort();
    let mut result = Vec::new();
    let n = nums.len();

    for i in 0..n.saturating_sub(2) {
        // Пропускаем дубликаты для первого числа
        if i > 0 && nums[i] == nums[i - 1] {
            continue;
        }

        let mut left = i + 1;
        let mut right = n - 1;
        let target = -nums[i];

        while left < right {
            let sum = nums[left] + nums[right];

            if sum == target {
                result.push(vec![nums[i], nums[left], nums[right]]);

                // Пропускаем дубликаты
                while left < right && nums[left] == nums[left + 1] {
                    left += 1;
                }
                while left < right && nums[right] == nums[right - 1] {
                    right -= 1;
                }

                left += 1;
                right -= 1;
            } else if sum < target {
                left += 1;
            } else {
                right -= 1;
            }
        }
    }

    result
}

/// Пример 4: Контейнер с наибольшим количеством воды
/// 
/// Задача: Найти два столбца, которые вместе с осью X образуют контейнер,
/// содержащий наибольшее количество воды
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn max_area(height: Vec<i32>) -> i32 {
    let mut left = 0;
    let mut right = height.len() - 1;
    let mut max_area = 0;

    while left < right {
        let width = (right - left) as i32;
        let current_area = width * height[left].min(height[right]);
        max_area = max_area.max(current_area);

        // Перемещаем указатель с меньшей высотой
        if height[left] < height[right] {
            left += 1;
        } else {
            right -= 1;
        }
    }

    max_area
}

/// Пример 5: Захват дождевой воды (Trapping Rain Water)
/// 
/// Задача: Вычислить, сколько воды можно захватить между столбцами
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn trap_rain_water(height: Vec<i32>) -> i32 {
    if height.is_empty() {
        return 0;
    }

    let mut left = 0;
    let mut right = height.len() - 1;
    let mut left_max = 0;
    let mut right_max = 0;
    let mut water = 0;

    while left < right {
        if height[left] < height[right] {
            if height[left] >= left_max {
                left_max = height[left];
            } else {
                water += left_max - height[left];
            }
            left += 1;
        } else {
            if height[right] >= right_max {
                right_max = height[right];
            } else {
                water += right_max - height[right];
            }
            right -= 1;
        }
    }

    water
}

/// Пример 6: Квадраты отсортированного массива
/// 
/// Задача: Вернуть массив квадратов каждого числа в отсортированном порядке
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn sorted_squares(nums: Vec<i32>) -> Vec<i32> {
    let n = nums.len();
    let mut result = vec![0; n];
    let mut left = 0;
    let mut right = n - 1;
    let mut pos = n - 1;

    while left <= right {
        let left_sq = nums[left] * nums[left];
        let right_sq = nums[right] * nums[right];

        if left_sq > right_sq {
            result[pos] = left_sq;
            left += 1;
        } else {
            result[pos] = right_sq;
            right -= 1;
        }
        pos -= 1;
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_two_sum_sorted() {
        assert_eq!(two_sum_sorted(&[2, 7, 11, 15], 9), Some((0, 1)));
        assert_eq!(two_sum_sorted(&[2, 3, 4], 6), Some((0, 2)));
    }

    #[test]
    fn test_remove_duplicates() {
        let mut nums = vec![1, 1, 2];
        assert_eq!(remove_duplicates(&mut nums), 2);
        assert_eq!(&nums[..2], &[1, 2]);
    }

    #[test]
    fn test_three_sum() {
        let nums = vec![-1, 0, 1, 2, -1, -4];
        let result = three_sum(nums);
        assert!(result.contains(&vec![-1, -1, 2]));
        assert!(result.contains(&vec![-1, 0, 1]));
    }

    #[test]
    fn test_max_area() {
        assert_eq!(max_area(vec![1, 8, 6, 2, 5, 4, 8, 3, 7]), 49);
    }

    #[test]
    fn test_trap_rain_water() {
        assert_eq!(trap_rain_water(vec![0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]), 6);
    }

    #[test]
    fn test_sorted_squares() {
        assert_eq!(sorted_squares(vec![-4, -1, 0, 3, 10]), vec![0, 1, 9, 16, 100]);
    }
}

