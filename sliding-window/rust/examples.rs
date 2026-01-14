// Примеры использования шаблона Sliding Window на Rust

/// Пример 1: Максимальная сумма подмассива фиксированного размера K
/// 
/// Задача: Найти максимальную сумму подмассива размера K
/// Временная сложность: O(n)
/// Пространственная сложность: O(1)
pub fn max_sum_subarray_fixed_k(arr: &[i32], k: usize) -> i32 {
    if arr.len() < k {
        return 0;
    }

    // Вычисляем сумму первого окна
    let mut window_sum: i32 = arr[0..k].iter().sum();
    let mut max_sum = window_sum;

    // Скользим окном по массиву
    for i in k..arr.len() {
        // Добавляем новый элемент и удаляем старый
        window_sum += arr[i] - arr[i - k];
        max_sum = max_sum.max(window_sum);
    }

    max_sum
}

/// Пример 2: Самая длинная подстрока без повторяющихся символов
/// 
/// Задача: Найти длину самой длинной подстроки без повторяющихся символов
/// Временная сложность: O(n)
/// Пространственная сложность: O(min(n, m)), где m - размер алфавита
pub fn longest_substring_no_repeats(s: &str) -> usize {
    use std::collections::HashMap;
    
    let chars: Vec<char> = s.chars().collect();
    let mut char_index = HashMap::new();
    let mut max_len = 0;
    let mut start = 0;

    for (end, &ch) in chars.iter().enumerate() {
        // Если символ уже встречался в текущем окне, сдвигаем начало
        if let Some(&prev_index) = char_index.get(&ch) {
            if prev_index >= start {
                start = prev_index + 1;
            }
        }

        char_index.insert(ch, end);
        max_len = max_len.max(end - start + 1);
    }

    max_len
}

/// Пример 3: Самая длинная подстрока с максимум K различными символами
/// 
/// Задача: Найти длину самой длинной подстроки с максимум K различными символами
/// Временная сложность: O(n)
/// Пространственная сложность: O(k)
pub fn longest_substring_k_distinct(s: &str, k: usize) -> usize {
    use std::collections::HashMap;
    
    let chars: Vec<char> = s.chars().collect();
    let mut char_count = HashMap::new();
    let mut max_len = 0;
    let mut start = 0;

    for (end, &ch) in chars.iter().enumerate() {
        // Добавляем текущий символ в окно
        *char_count.entry(ch).or_insert(0) += 1;

        // Если количество различных символов превышает K, сжимаем окно
        while char_count.len() > k {
            let start_char = chars[start];
            if let Some(count) = char_count.get_mut(&start_char) {
                *count -= 1;
                if *count == 0 {
                    char_count.remove(&start_char);
                }
            }
            start += 1;
        }

        max_len = max_len.max(end - start + 1);
    }

    max_len
}

/// Пример 4: Минимальное окно подстроки (сложная задача)
/// 
/// Задача: Найти минимальную подстроку, содержащую все символы из строки t
/// Временная сложность: O(|s| + |t|)
/// Пространственная сложность: O(|s| + |t|)
pub fn min_window_substring(s: &str, t: &str) -> String {
    use std::collections::HashMap;
    
    if s.is_empty() || t.is_empty() || s.len() < t.len() {
        return String::new();
    }

    let s_chars: Vec<char> = s.chars().collect();
    let t_chars: Vec<char> = t.chars().collect();

    // Подсчитываем частоту символов в t
    let mut required = HashMap::new();
    for &ch in &t_chars {
        *required.entry(ch).or_insert(0) += 1;
    }

    let required_len = required.len();
    let mut window_counts = HashMap::new();
    let mut formed = 0;

    let mut left = 0;
    let mut right = 0;
    let mut min_len = usize::MAX;
    let mut min_left = 0;

    while right < s_chars.len() {
        // Добавляем символ справа в окно
        let ch = s_chars[right];
        *window_counts.entry(ch).or_insert(0) += 1;

        // Проверяем, соответствует ли частота символа требуемой
        if required.contains_key(&ch) 
            && window_counts.get(&ch) == required.get(&ch) {
            formed += 1;
        }

        // Пытаемся сжать окно слева
        while left <= right && formed == required_len {
            let ch = s_chars[left];

            // Обновляем минимальное окно
            if right - left + 1 < min_len {
                min_len = right - left + 1;
                min_left = left;
            }

            // Удаляем символ слева из окна
            if let Some(count) = window_counts.get_mut(&ch) {
                *count -= 1;
            }

            if required.contains_key(&ch) 
                && window_counts.get(&ch) < required.get(&ch) {
                formed -= 1;
            }

            left += 1;
        }

        right += 1;
    }

    if min_len == usize::MAX {
        String::new()
    } else {
        s_chars[min_left..min_left + min_len].iter().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_max_sum_subarray_fixed_k() {
        assert_eq!(max_sum_subarray_fixed_k(&[2, 1, 5, 1, 3, 2], 3), 9);
        assert_eq!(max_sum_subarray_fixed_k(&[2, 3, 4, 1, 5], 2), 7);
    }

    #[test]
    fn test_longest_substring_no_repeats() {
        assert_eq!(longest_substring_no_repeats("abcabcbb"), 3);
        assert_eq!(longest_substring_no_repeats("bbbbb"), 1);
        assert_eq!(longest_substring_no_repeats("pwwkew"), 3);
    }

    #[test]
    fn test_longest_substring_k_distinct() {
        assert_eq!(longest_substring_k_distinct("araaci", 2), 4);
        assert_eq!(longest_substring_k_distinct("araaci", 1), 2);
        assert_eq!(longest_substring_k_distinct("cbbebi", 3), 5);
    }

    #[test]
    fn test_min_window_substring() {
        assert_eq!(min_window_substring("ADOBECODEBANC", "ABC"), "BANC");
        assert_eq!(min_window_substring("a", "a"), "a");
        assert_eq!(min_window_substring("a", "aa"), "");
    }
}

