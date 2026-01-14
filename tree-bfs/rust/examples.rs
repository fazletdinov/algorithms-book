// Примеры использования шаблона Tree BFS на Rust

use std::collections::VecDeque;
use std::rc::Rc;
use std::cell::RefCell;

// Определение узла бинарного дерева
#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Rc<RefCell<TreeNode>>>,
    pub right: Option<Rc<RefCell<TreeNode>>>,
}

impl TreeNode {
    #[inline]
    pub fn new(val: i32) -> Self {
        TreeNode {
            val,
            left: None,
            right: None,
        }
    }
}

/// Пример 1: Обход дерева по уровням
/// 
/// Задача: Вернуть значения узлов, сгруппированные по уровням
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn level_order(root: Option<Rc<RefCell<TreeNode>>>) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    
    if root.is_none() {
        return result;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());

    while !queue.is_empty() {
        let level_size = queue.len();
        let mut current_level = Vec::new();

        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();
            
            current_level.push(node_ref.val);

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }

        result.push(current_level);
    }

    result
}

/// Пример 2: Среднее значение каждого уровня
/// 
/// Задача: Вычислить среднее значение узлов на каждом уровне
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn average_of_levels(root: Option<Rc<RefCell<TreeNode>>>) -> Vec<f64> {
    let mut result = Vec::new();
    
    if root.is_none() {
        return result;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());

    while !queue.is_empty() {
        let level_size = queue.len();
        let mut sum = 0i64;

        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();
            
            sum += node_ref.val as i64;

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }

        result.push(sum as f64 / level_size as f64);
    }

    result
}

/// Пример 3: Вид дерева справа
/// 
/// Задача: Вернуть значения узлов, видимых справа на каждом уровне
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn right_side_view(root: Option<Rc<RefCell<TreeNode>>>) -> Vec<i32> {
    let mut result = Vec::new();
    
    if root.is_none() {
        return result;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());

    while !queue.is_empty() {
        let level_size = queue.len();
        let mut rightmost = 0;

        for i in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();
            
            rightmost = node_ref.val;

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }

        result.push(rightmost);
    }

    result
}

/// Пример 4: Зигзагообразный обход дерева
/// 
/// Задача: Обойти дерево зигзагообразно (слева направо, затем справа налево)
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn zigzag_level_order(root: Option<Rc<RefCell<TreeNode>>>) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    
    if root.is_none() {
        return result;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());
    let mut left_to_right = true;

    while !queue.is_empty() {
        let level_size = queue.len();
        let mut current_level = Vec::new();

        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();
            
            current_level.push(node_ref.val);

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }

        if !left_to_right {
            current_level.reverse();
        }

        result.push(current_level);
        left_to_right = !left_to_right;
    }

    result
}

/// Пример 5: Максимальная глубина дерева (BFS подход)
/// 
/// Задача: Найти максимальную глубину бинарного дерева
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn max_depth_bfs(root: Option<Rc<RefCell<TreeNode>>>) -> i32 {
    if root.is_none() {
        return 0;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());
    let mut depth = 0;

    while !queue.is_empty() {
        let level_size = queue.len();
        depth += 1;

        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }
    }

    depth
}

/// Пример 6: Минимальная глубина дерева
/// 
/// Задача: Найти минимальную глубину дерева (до ближайшего листа)
/// Временная сложность: O(n)
/// Пространственная сложность: O(n)
pub fn min_depth(root: Option<Rc<RefCell<TreeNode>>>) -> i32 {
    if root.is_none() {
        return 0;
    }

    let mut queue = VecDeque::new();
    queue.push_back(root.unwrap());
    let mut depth = 0;

    while !queue.is_empty() {
        let level_size = queue.len();
        depth += 1;

        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            let node_ref = node.borrow();

            // Если это лист, возвращаем текущую глубину
            if node_ref.left.is_none() && node_ref.right.is_none() {
                return depth;
            }

            if let Some(left) = &node_ref.left {
                queue.push_back(left.clone());
            }
            if let Some(right) = &node_ref.right {
                queue.push_back(right.clone());
            }
        }
    }

    depth
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_node(val: i32) -> Rc<RefCell<TreeNode>> {
        Rc::new(RefCell::new(TreeNode::new(val)))
    }

    #[test]
    fn test_level_order() {
        let root = create_node(3);
        root.borrow_mut().left = Some(create_node(9));
        root.borrow_mut().right = Some(create_node(20));
        root.borrow().right.as_ref().unwrap().borrow_mut().left = Some(create_node(15));
        root.borrow().right.as_ref().unwrap().borrow_mut().right = Some(create_node(7));

        let result = level_order(Some(root));
        assert_eq!(result, vec![vec![3], vec![9, 20], vec![15, 7]]);
    }

    #[test]
    fn test_max_depth_bfs() {
        let root = create_node(3);
        root.borrow_mut().left = Some(create_node(9));
        root.borrow_mut().right = Some(create_node(20));
        root.borrow().right.as_ref().unwrap().borrow_mut().left = Some(create_node(15));
        root.borrow().right.as_ref().unwrap().borrow_mut().right = Some(create_node(7));

        assert_eq!(max_depth_bfs(Some(root)), 3);
    }
}

