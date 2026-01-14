// Примеры использования шаблона Merge Intervals на Rust

/// Пример 1: Слияние перекрывающихся интервалов
/// 
/// Задача: Объединить все перекрывающиеся интервалы
/// Временная сложность: O(n log n)
/// Пространственная сложность: O(n)
pub fn merge_intervals(mut intervals: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    if intervals.is_empty() {
        return vec![];
    }

    // Сортируем интервалы по начальной точке
    intervals.sort_by_key(|interval| interval[0]);

    let mut merged = vec![intervals[0].clone()];

    for current in intervals.into_iter().skip(1) {
        let last = merged.last_mut().unwrap();

        // Если текущий интервал перекрывается с последним, объединяем
        if current[0] <= last[1] {
            last[1] = last[1].max(current[1]);
        } else {
            // Иначе добавляем новый интервал
            merged.push(current);
        }
    }

    merged
}

/// Пример 2: Вставка нового интервала
/// 
/// Задача: Вставить новый интервал в отсортированный список неперекрывающихся интервалов
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn insert_interval(mut intervals: Vec<Vec<i32>>, new_interval: Vec<i32>) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    let mut i = 0;
    let n = intervals.len();

    // Добавляем все интервалы, которые заканчиваются до начала нового интервала
    while i < n && intervals[i][1] < new_interval[0] {
        result.push(intervals[i].clone());
        i += 1;
    }

    // Объединяем все перекрывающиеся интервалы
    let mut merged_interval = new_interval.clone();
    while i < n && intervals[i][0] <= merged_interval[1] {
        merged_interval[0] = merged_interval[0].min(intervals[i][0]);
        merged_interval[1] = merged_interval[1].max(intervals[i][1]);
        i += 1;
    }
    result.push(merged_interval);

    // Добавляем оставшиеся интервалы
    while i < n {
        result.push(intervals[i].clone());
        i += 1;
    }

    result
}

/// Пример 3: Поиск неперекрывающихся интервалов
/// 
/// Задача: Найти минимальное количество интервалов для удаления,
/// чтобы сделать остальные неперекрывающимися
/// Временная сложность: O(n log n)
/// Пространственная сложность: O(1)
pub fn erase_overlap_intervals(mut intervals: Vec<Vec<i32>>) -> i32 {
    if intervals.is_empty() {
        return 0;
    }

    // Сортируем по конечной точке
    intervals.sort_by_key(|interval| interval[1]);

    let mut count = 0;
    let mut end = intervals[0][1];

    for i in 1..intervals.len() {
        // Если интервал перекрывается с предыдущим, удаляем его
        if intervals[i][0] < end {
            count += 1;
        } else {
            end = intervals[i][1];
        }
    }

    count
}

/// Пример 4: Пересечения двух списков интервалов
/// 
/// Задача: Найти пересечения интервалов из двух списков
/// Временная сложность: O(n + m)
/// Пространственная сложность: O(k), где k - количество пересечений
pub fn interval_intersection(
    first_list: Vec<Vec<i32>>,
    second_list: Vec<Vec<i32>>,
) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    let mut i = 0;
    let mut j = 0;

    while i < first_list.len() && j < second_list.len() {
        let first = &first_list[i];
        let second = &second_list[j];

        // Находим пересечение
        let start = first[0].max(second[0]);
        let end = first[1].min(second[1]);

        if start <= end {
            result.push(vec![start, end]);
        }

        // Перемещаем указатель с меньшей конечной точкой
        if first[1] < second[1] {
            i += 1;
        } else {
            j += 1;
        }
    }

    result
}

/// Пример 5: Комнаты для встреч II (Meeting Rooms II)
/// 
/// Задача: Найти минимальное количество комнат, необходимое для всех встреч
/// Временная сложность: O(n log n)
/// Пространственная сложность: O(n)
pub fn min_meeting_rooms(intervals: Vec<Vec<i32>>) -> i32 {
    if intervals.is_empty() {
        return 0;
    }

    // Извлекаем времена начала и конца
    let mut starts: Vec<i32> = intervals.iter().map(|i| i[0]).collect();
    let mut ends: Vec<i32> = intervals.iter().map(|i| i[1]).collect();

    starts.sort();
    ends.sort();

    let mut rooms = 0;
    let mut end_ptr = 0;

    // Проходим по временам начала
    for start in starts {
        // Если текущее время начала >= времени окончания,
        // освобождаем комнату
        if start >= ends[end_ptr] {
            end_ptr += 1;
        } else {
            // Иначе нужна новая комната
            rooms += 1;
        }
    }

    rooms
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_intervals() {
        let intervals = vec![
            vec![1, 3],
            vec![2, 6],
            vec![8, 10],
            vec![15, 18],
        ];
        let result = merge_intervals(intervals);
        assert_eq!(result, vec![vec![1, 6], vec![8, 10], vec![15, 18]]);
    }

    #[test]
    fn test_insert_interval() {
        let intervals = vec![vec![1, 3], vec![6, 9]];
        let new_interval = vec![2, 5];
        let result = insert_interval(intervals, new_interval);
        assert_eq!(result, vec![vec![1, 5], vec![6, 9]]);
    }

    #[test]
    fn test_erase_overlap_intervals() {
        let intervals = vec![vec![1, 2], vec![2, 3], vec![3, 4], vec![1, 3]];
        assert_eq!(erase_overlap_intervals(intervals), 1);
    }

    #[test]
    fn test_interval_intersection() {
        let first = vec![vec![0, 2], vec![5, 10], vec![13, 23], vec![24, 25]];
        let second = vec![vec![1, 5], vec![8, 12], vec![15, 24], vec![25, 26]];
        let result = interval_intersection(first, second);
        assert_eq!(result, vec![vec![1, 2], vec![5, 5], vec![8, 10], vec![15, 23], vec![24, 24], vec![25, 25]]);
    }

    #[test]
    fn test_min_meeting_rooms() {
        let intervals = vec![vec![0, 30], vec![5, 10], vec![15, 20]];
        assert_eq!(min_meeting_rooms(intervals), 2);
    }
}

