// Примеры использования шаблона Cyclic Sort на Rust

/// Пример 1: Циклическая сортировка массива от 1 до N
/// 
/// Задача: Отсортировать массив, содержащий числа от 1 до N
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn cyclic_sort(nums: &mut [i32]) {
    let mut i = 0;
    while i < nums.len() {
        // Правильная позиция для числа nums[i] - это nums[i] - 1
        let correct_pos = (nums[i] - 1) as usize;
        
        // Если число не на правильной позиции, меняем местами
        if nums[i] > 0 && nums[i] <= nums.len() as i32 && nums[i] != nums[correct_pos] {
            nums.swap(i, correct_pos);
        } else {
            i += 1;
        }
    }
}

/// Пример 2: Поиск отсутствующего числа
/// 
/// Задача: Найти отсутствующее число в массиве от 0 до n
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn missing_number(mut nums: Vec<i32>) -> i32 {
    let n = nums.len();
    let mut i = 0;

    // Используем циклическую сортировку
    while i < n {
        let correct_pos = nums[i] as usize;
        
        // Для диапазона 0..n правильная позиция - это само значение
        if nums[i] < n as i32 && nums[i] != nums[correct_pos] {
            nums.swap(i, correct_pos);
        } else {
            i += 1;
        }
    }

    // Ищем отсутствующее число
    for (i, &num) in nums.iter().enumerate() {
        if num != i as i32 {
            return i as i32;
        }
    }

    n as i32
}

/// Пример 3: Поиск всех исчезнувших чисел
/// 
/// Задача: Найти все числа от 1 до n, которых нет в массиве
/// Временная сложность: O(n)
/// Пространственная сложность: O(1) без учета результата
pub fn find_disappeared_numbers(mut nums: Vec<i32>) -> Vec<i32> {
    let mut i = 0;
    let n = nums.len();

    // Используем циклическую сортировку
    while i < n {
        let correct_pos = (nums[i] - 1) as usize;
        
        if nums[i] > 0 && nums[i] <= n as i32 && nums[i] != nums[correct_pos] {
            nums.swap(i, correct_pos);
        } else {
            i += 1;
        }
    }

    // Находим все числа, которых нет на правильных позициях
    let mut result = Vec::new();
    for (i, &num) in nums.iter().enumerate() {
        if num != (i + 1) as i32 {
            result.push((i + 1) as i32);
        }
    }

    result
}

/// Пример 4: Поиск дубликата числа
/// 
/// Задача: Найти дубликат числа в массиве от 1 до n (один дубликат)
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn find_duplicate(mut nums: Vec<i32>) -> i32 {
    let mut i = 0;
    let n = nums.len();

    // Используем циклическую сортировку
    while i < n {
        let correct_pos = (nums[i] - 1) as usize;
        
        if nums[i] != nums[correct_pos] {
            nums.swap(i, correct_pos);
        } else {
            i += 1;
        }
    }

    // Ищем дубликат (число не на правильной позиции)
    for (i, &num) in nums.iter().enumerate() {
        if num != (i + 1) as i32 {
            return num;
        }
    }

    -1
}

/// Пример 5: Поиск всех дубликатов
/// 
/// Задача: Найти все дубликаты в массиве от 1 до n
/// Временная сложность: O(n)
/// Пространственная сложность: O(1) без учета результата
pub fn find_all_duplicates(mut nums: Vec<i32>) -> Vec<i32> {
    let mut i = 0;
    let n = nums.len();

    // Используем циклическую сортировку
    while i < n {
        let correct_pos = (nums[i] - 1) as usize;
        
        if nums[i] != nums[correct_pos] {
            nums.swap(i, correct_pos);
        } else {
            i += 1;
        }
    }

    // Находим все дубликаты
    let mut result = Vec::new();
    for (i, &num) in nums.iter().enumerate() {
        if num != (i + 1) as i32 {
            result.push(num);
        }
    }

    result
}

/// Пример 6: Первое отсутствующее положительное число
/// 
/// Задача: Найти первое отсутствующее положительное число
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn first_missing_positive(mut nums: Vec<i32>) -> i32 {
    let n = nums.len();
    let mut i = 0;

    // Используем циклическую сортировку
    // Правильная позиция для числа x - это x - 1
    while i < n {
        let correct_pos = (nums[i] - 1) as usize;
        
        // Игнорируем числа вне диапазона [1, n]
        if nums[i] > 0 && nums[i] <= n as i32 && nums[i] != nums[correct_pos] {
            nums.swap(i, correct_pos);
        } else {
            i += 1;
        }
    }

    // Находим первое отсутствующее положительное число
    for (i, &num) in nums.iter().enumerate() {
        if num != (i + 1) as i32 {
            return (i + 1) as i32;
        }
    }

    (n + 1) as i32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cyclic_sort() {
        let mut nums = vec![3, 1, 5, 4, 2];
        cyclic_sort(&mut nums);
        assert_eq!(nums, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_missing_number() {
        assert_eq!(missing_number(vec![3, 0, 1]), 2);
        assert_eq!(missing_number(vec![0, 1]), 2);
        assert_eq!(missing_number(vec![9, 6, 4, 2, 3, 5, 7, 0, 1]), 8);
    }

    #[test]
    fn test_find_disappeared_numbers() {
        let result = find_disappeared_numbers(vec![4, 3, 2, 7, 8, 2, 3, 1]);
        assert_eq!(result, vec![5, 6]);
    }

    #[test]
    fn test_find_duplicate() {
        assert_eq!(find_duplicate(vec![1, 3, 4, 2, 2]), 2);
        assert_eq!(find_duplicate(vec![3, 1, 3, 4, 2]), 3);
    }

    #[test]
    fn test_find_all_duplicates() {
        let result = find_all_duplicates(vec![4, 3, 2, 7, 8, 2, 3, 1]);
        assert_eq!(result, vec![2, 3]);
    }

    #[test]
    fn test_first_missing_positive() {
        assert_eq!(first_missing_positive(vec![1, 2, 0]), 3);
        assert_eq!(first_missing_positive(vec![3, 4, -1, 1]), 2);
        assert_eq!(first_missing_positive(vec![7, 8, 9, 11, 12]), 1);
    }
}

