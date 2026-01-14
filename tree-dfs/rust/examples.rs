// Примеры использования шаблона Tree DFS на Rust

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

/// Пример 1: Pre-order обход (Корень -> Левое -> Правое)
/// 
/// Задача: Вернуть значения узлов в порядке pre-order
/// Временная сложность: O(n)
/// Пространственная сложность: O(h), где h - высота дерева
pub fn preorder_traversal(root: Option<Rc<RefCell<TreeNode>>>) -> Vec<i32> {
    let mut result = Vec::new();
    
    fn dfs(node: Option<Rc<RefCell<TreeNode>>>, result: &mut Vec<i32>) {
        if let Some(n) = node {
            let node_ref = n.borrow();
            result.push(node_ref.val);
            dfs(node_ref.left.clone(), result);
            dfs(node_ref.right.clone(), result);
        }
    }
    
    dfs(root, &mut result);
    result
}

/// Пример 2: In-order обход (Левое -> Корень -> Правое)
/// 
/// Задача: Вернуть значения узлов в порядке in-order
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn inorder_traversal(root: Option<Rc<RefCell<TreeNode>>>) -> Vec<i32> {
    let mut result = Vec::new();
    
    fn dfs(node: Option<Rc<RefCell<TreeNode>>>, result: &mut Vec<i32>) {
        if let Some(n) = node {
            let node_ref = n.borrow();
            dfs(node_ref.left.clone(), result);
            result.push(node_ref.val);
            dfs(node_ref.right.clone(), result);
        }
    }
    
    dfs(root, &mut result);
    result
}

/// Пример 3: Post-order обход (Левое -> Правое -> Корень)
/// 
/// Задача: Вернуть значения узлов в порядке post-order
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn postorder_traversal(root: Option<Rc<RefCell<TreeNode>>>) -> Vec<i32> {
    let mut result = Vec::new();
    
    fn dfs(node: Option<Rc<RefCell<TreeNode>>>, result: &mut Vec<i32>) {
        if let Some(n) = node {
            let node_ref = n.borrow();
            dfs(node_ref.left.clone(), result);
            dfs(node_ref.right.clone(), result);
            result.push(node_ref.val);
        }
    }
    
    dfs(root, &mut result);
    result
}

/// Пример 4: Максимальная глубина дерева (DFS)
/// 
/// Задача: Найти максимальную глубину бинарного дерева
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn max_depth_dfs(root: Option<Rc<RefCell<TreeNode>>>) -> i32 {
    match root {
        None => 0,
        Some(node) => {
            let node_ref = node.borrow();
            let left_depth = max_depth_dfs(node_ref.left.clone());
            let right_depth = max_depth_dfs(node_ref.right.clone());
            1 + left_depth.max(right_depth)
        }
    }
}

/// Пример 5: Проверка симметричности дерева
/// 
/// Задача: Определить, является ли дерево симметричным
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn is_symmetric(root: Option<Rc<RefCell<TreeNode>>>) -> bool {
    fn is_mirror(
        left: Option<Rc<RefCell<TreeNode>>>,
        right: Option<Rc<RefCell<TreeNode>>>,
    ) -> bool {
        match (left, right) {
            (None, None) => true,
            (Some(l), Some(r)) => {
                let l_ref = l.borrow();
                let r_ref = r.borrow();
                l_ref.val == r_ref.val
                    && is_mirror(l_ref.left.clone(), r_ref.right.clone())
                    && is_mirror(l_ref.right.clone(), r_ref.left.clone())
            }
            _ => false,
        }
    }

    match root {
        None => true,
        Some(node) => {
            let node_ref = node.borrow();
            is_mirror(node_ref.left.clone(), node_ref.right.clone())
        }
    }
}

/// Пример 6: Проверка валидности BST
/// 
/// Задача: Определить, является ли дерево валидным бинарным деревом поиска
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn is_valid_bst(root: Option<Rc<RefCell<TreeNode>>>) -> bool {
    fn validate(
        node: Option<Rc<RefCell<TreeNode>>>,
        min: Option<i32>,
        max: Option<i32>,
    ) -> bool {
        match node {
            None => true,
            Some(n) => {
                let node_ref = n.borrow();
                let val = node_ref.val;

                // Проверяем границы
                if let Some(min_val) = min {
                    if val <= min_val {
                        return false;
                    }
                }
                if let Some(max_val) = max {
                    if val >= max_val {
                        return false;
                    }
                }

                // Рекурсивно проверяем поддеревья
                validate(node_ref.left.clone(), min, Some(val))
                    && validate(node_ref.right.clone(), Some(val), max)
            }
        }
    }

    validate(root, None, None)
}

/// Пример 7: Сумма пути
/// 
/// Задача: Проверить, существует ли путь от корня до листа с заданной суммой
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn has_path_sum(root: Option<Rc<RefCell<TreeNode>>>, target_sum: i32) -> bool {
    match root {
        None => false,
        Some(node) => {
            let node_ref = node.borrow();
            let remaining = target_sum - node_ref.val;

            // Если это лист и сумма равна цели
            if node_ref.left.is_none() && node_ref.right.is_none() {
                return remaining == 0;
            }

            // Рекурсивно проверяем левое и правое поддеревья
            has_path_sum(node_ref.left.clone(), remaining)
                || has_path_sum(node_ref.right.clone(), remaining)
        }
    }
}

/// Пример 8: Максимальная сумма пути
/// 
/// Задача: Найти максимальную сумму пути в дереве (путь может начинаться и заканчиваться где угодно)
/// Временная сложность: O(n)
/// Пространственная сложность: O(h)
pub fn max_path_sum(root: Option<Rc<RefCell<TreeNode>>>) -> i32 {
    let mut max_sum = i32::MIN;

    fn dfs(node: Option<Rc<RefCell<TreeNode>>>, max_sum: &mut i32) -> i32 {
        match node {
            None => 0,
            Some(n) => {
                let node_ref = n.borrow();
                let left_sum = dfs(node_ref.left.clone(), max_sum).max(0);
                let right_sum = dfs(node_ref.right.clone(), max_sum).max(0);

                // Текущая максимальная сумма с текущим узлом как корнем
                let current_sum = node_ref.val + left_sum + right_sum;
                *max_sum = (*max_sum).max(current_sum);

                // Возвращаем максимальную сумму пути через текущий узел
                node_ref.val + left_sum.max(right_sum)
            }
        }
    }

    dfs(root, &mut max_sum);
    max_sum
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_node(val: i32) -> Rc<RefCell<TreeNode>> {
        Rc::new(RefCell::new(TreeNode::new(val)))
    }

    #[test]
    fn test_max_depth_dfs() {
        let root = create_node(3);
        root.borrow_mut().left = Some(create_node(9));
        root.borrow_mut().right = Some(create_node(20));
        root.borrow().right.as_ref().unwrap().borrow_mut().left = Some(create_node(15));
        root.borrow().right.as_ref().unwrap().borrow_mut().right = Some(create_node(7));

        assert_eq!(max_depth_dfs(Some(root)), 3);
    }

    #[test]
    fn test_is_symmetric() {
        let root = create_node(1);
        root.borrow_mut().left = Some(create_node(2));
        root.borrow_mut().right = Some(create_node(2));
        root.borrow().left.as_ref().unwrap().borrow_mut().left = Some(create_node(3));
        root.borrow().right.as_ref().unwrap().borrow_mut().right = Some(create_node(3));

        assert!(is_symmetric(Some(root)));
    }
}

