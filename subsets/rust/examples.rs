// Примеры использования шаблона Subsets на Rust

/// Пример 1: Генерация всех подмножеств (рекурсивный подход)
/// 
/// Задача: Вернуть все возможные подмножества массива
/// Временная сложность: O(2^n × n)
/// Пространственная сложность: O(2^n × n)
pub fn subsets(nums: Vec<i32>) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    let mut current = Vec::new();

    fn backtrack(
        nums: &[i32],
        start: usize,
        current: &mut Vec<i32>,
        result: &mut Vec<Vec<i32>>,
    ) {
        // Добавляем текущее подмножество
        result.push(current.clone());

        // Генерируем подмножества для оставшихся элементов
        for i in start..nums.len() {
            current.push(nums[i]);
            backtrack(nums, i + 1, current, result);
            current.pop(); // Backtrack
        }
    }

    backtrack(&nums, 0, &mut current, &mut result);
    result
}

/// Пример 2: Генерация всех подмножеств (итеративный подход)
/// 
/// Задача: Вернуть все возможные подмножества массива итеративно
/// Временная сложность: O(2^n × n)
/// Пространственная сложность: O(2^n × n)
pub fn subsets_iterative(nums: Vec<i32>) -> Vec<Vec<i32>> {
    let mut result: Vec<Vec<i32>> = vec![vec![]];

    for &num in &nums {
        let mut new_subsets = Vec::new();
        for subset in &result {
            let mut new_subset = subset.clone();
            new_subset.push(num);
            new_subsets.push(new_subset);
        }
        result.extend(new_subsets);
    }

    result
}

/// Пример 3: Подмножества с дубликатами
/// 
/// Задача: Вернуть все подмножества массива с дубликатами
/// Временная сложность: O(2^n × n)
/// Пространственная сложность: O(2^n × n)
pub fn subsets_with_dup(mut nums: Vec<i32>) -> Vec<Vec<i32>> {
    nums.sort();
    let mut result = Vec::new();
    let mut current = Vec::new();

    fn backtrack(
        nums: &[i32],
        start: usize,
        current: &mut Vec<i32>,
        result: &mut Vec<Vec<i32>>,
    ) {
        result.push(current.clone());

        for i in start..nums.len() {
            // Пропускаем дубликаты
            if i > start && nums[i] == nums[i - 1] {
                continue;
            }
            current.push(nums[i]);
            backtrack(nums, i + 1, current, result);
            current.pop();
        }
    }

    backtrack(&nums, 0, &mut current, &mut result);
    result
}

/// Пример 4: Комбинации заданной длины
/// 
/// Задача: Вернуть все комбинации длины k из массива
/// Временная сложность: O(C(n,k) × k)
/// Пространственная сложность: O(C(n,k) × k)
pub fn combine(n: i32, k: i32) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    let mut current = Vec::new();

    fn backtrack(
        start: i32,
        n: i32,
        k: i32,
        current: &mut Vec<i32>,
        result: &mut Vec<Vec<i32>>,
    ) {
        if current.len() == k as usize {
            result.push(current.clone());
            return;
        }

        for i in start..=n {
            current.push(i);
            backtrack(i + 1, n, k, current, result);
            current.pop();
        }
    }

    backtrack(1, n, k, &mut current, &mut result);
    result
}

/// Пример 5: Комбинации с суммой
/// 
/// Задача: Найти все уникальные комбинации, сумма которых равна target
/// Временная сложность: O(2^n)
/// Пространственная сложность: O(target)
pub fn combination_sum(candidates: Vec<i32>, target: i32) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    let mut current = Vec::new();
    let mut candidates = candidates;
    candidates.sort();

    fn backtrack(
        candidates: &[i32],
        target: i32,
        start: usize,
        current: &mut Vec<i32>,
        result: &mut Vec<Vec<i32>>,
    ) {
        if target == 0 {
            result.push(current.clone());
            return;
        }

        if target < 0 {
            return;
        }

        for i in start..candidates.len() {
            current.push(candidates[i]);
            backtrack(candidates, target - candidates[i], i, current, result);
            current.pop();
        }
    }

    backtrack(&candidates, target, 0, &mut current, &mut result);
    result
}

/// Пример 6: Перестановки
/// 
/// Задача: Вернуть все возможные перестановки массива
/// Временная сложность: O(n! × n)
/// Пространственная сложность: O(n! × n)
pub fn permute(nums: Vec<i32>) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    let mut current = Vec::new();
    let mut used = vec![false; nums.len()];

    fn backtrack(
        nums: &[i32],
        used: &mut [bool],
        current: &mut Vec<i32>,
        result: &mut Vec<Vec<i32>>,
    ) {
        if current.len() == nums.len() {
            result.push(current.clone());
            return;
        }

        for i in 0..nums.len() {
            if !used[i] {
                used[i] = true;
                current.push(nums[i]);
                backtrack(nums, used, current, result);
                current.pop();
                used[i] = false;
            }
        }
    }

    backtrack(&nums, &mut used, &mut current, &mut result);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subsets() {
        let result = subsets(vec![1, 2, 3]);
        assert_eq!(result.len(), 8);
    }

    #[test]
    fn test_subsets_iterative() {
        let result = subsets_iterative(vec![1, 2]);
        assert_eq!(result.len(), 4);
    }

    #[test]
    fn test_subsets_with_dup() {
        let result = subsets_with_dup(vec![1, 2, 2]);
        assert_eq!(result.len(), 6);
    }

    #[test]
    fn test_combine() {
        let result = combine(4, 2);
        assert_eq!(result.len(), 6);
    }

    #[test]
    fn test_combination_sum() {
        let result = combination_sum(vec![2, 3, 6, 7], 7);
        assert!(!result.is_empty());
    }
}

