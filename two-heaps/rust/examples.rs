// Примеры использования шаблона Two Heaps на Rust

use std::collections::BinaryHeap;
use std::cmp::Reverse;

/// Структура для поддержания медианы с двумя кучами
pub struct MedianFinder {
    // Max heap для меньшей половины (используем Reverse для max heap)
    max_heap: BinaryHeap<i32>,
    // Min heap для большей половины
    min_heap: BinaryHeap<Reverse<i32>>,
}

impl MedianFinder {
    pub fn new() -> Self {
        MedianFinder {
            max_heap: BinaryHeap::new(),
            min_heap: BinaryHeap::new(),
        }
    }

    /// Добавление числа в структуру
    /// Временная сложность: O(log n)
    pub fn add_num(&mut self, num: i32) {
        // Добавляем в max_heap по умолчанию
        self.max_heap.push(num);

        // Перемещаем максимум из max_heap в min_heap
        if let Some(max_val) = self.max_heap.pop() {
            self.min_heap.push(Reverse(max_val));
        }

        // Балансируем кучи: max_heap должен быть >= min_heap
        if self.max_heap.len() < self.min_heap.len() {
            if let Some(Reverse(min_val)) = self.min_heap.pop() {
                self.max_heap.push(min_val);
            }
        }
    }

    /// Получение медианы
    /// Временная сложность: O(1)
    pub fn find_median(&self) -> f64 {
        if self.max_heap.len() > self.min_heap.len() {
            *self.max_heap.peek().unwrap() as f64
        } else {
            let max_val = *self.max_heap.peek().unwrap() as f64;
            let min_val = self.min_heap.peek().unwrap().0 as f64;
            (max_val + min_val) / 2.0
        }
    }
}

/// Пример 1: Медиана из потока данных
/// 
/// Задача: Поддерживать медиану потока чисел
/// Временная сложность: O(log n) для добавления, O(1) для получения медианы
/// Пространственная сложность: O(n)
pub struct MedianOfStream {
    max_heap: BinaryHeap<i32>,
    min_heap: BinaryHeap<Reverse<i32>>,
}

impl MedianOfStream {
    pub fn new() -> Self {
        MedianOfStream {
            max_heap: BinaryHeap::new(),
            min_heap: BinaryHeap::new(),
        }
    }

    pub fn insert(&mut self, num: i32) {
        if self.max_heap.is_empty() || num <= *self.max_heap.peek().unwrap() {
            self.max_heap.push(num);
        } else {
            self.min_heap.push(Reverse(num));
        }

        // Балансируем кучи
        if self.max_heap.len() > self.min_heap.len() + 1 {
            if let Some(val) = self.max_heap.pop() {
                self.min_heap.push(Reverse(val));
            }
        } else if self.min_heap.len() > self.max_heap.len() {
            if let Some(Reverse(val)) = self.min_heap.pop() {
                self.max_heap.push(val);
            }
        }
    }

    pub fn get_median(&self) -> f64 {
        if self.max_heap.len() == self.min_heap.len() {
            let max_val = *self.max_heap.peek().unwrap() as f64;
            let min_val = self.min_heap.peek().unwrap().0 as f64;
            (max_val + min_val) / 2.0
        } else {
            *self.max_heap.peek().unwrap() as f64
        }
    }
}

/// Пример 2: Разделение массива на две части с помощью двух куч
/// 
/// Задача: Разделить массив так, чтобы разница сумм была минимальной
/// Временная сложность: O(n log n)
/// Пространственная сложность: O(n)
pub fn partition_array(nums: Vec<i32>) -> i32 {
    let mut max_heap = BinaryHeap::new();
    let mut min_heap = BinaryHeap::new();

    for &num in &nums {
        if max_heap.len() <= min_heap.len() {
            max_heap.push(num);
        } else {
            min_heap.push(Reverse(num));
        }

        // Балансируем
        if let (Some(&max_val), Some(&Reverse(min_val))) = (max_heap.peek(), min_heap.peek()) {
            if max_val > min_val {
                let max_val = max_heap.pop().unwrap();
                let Reverse(min_val) = min_heap.pop().unwrap();
                max_heap.push(min_val);
                min_heap.push(Reverse(max_val));
            }
        }
    }

    let sum1: i32 = max_heap.iter().sum();
    let sum2: i32 = min_heap.iter().map(|Reverse(x)| x).sum();

    (sum1 - sum2).abs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_median_finder() {
        let mut finder = MedianFinder::new();
        finder.add_num(1);
        finder.add_num(2);
        assert_eq!(finder.find_median(), 1.5);
        finder.add_num(3);
        assert_eq!(finder.find_median(), 2.0);
    }

    #[test]
    fn test_median_of_stream() {
        let mut stream = MedianOfStream::new();
        stream.insert(1);
        stream.insert(2);
        assert_eq!(stream.get_median(), 1.5);
        stream.insert(3);
        assert_eq!(stream.get_median(), 2.0);
    }
}

