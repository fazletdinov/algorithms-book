// Примеры использования шаблона Topological Sort на Rust

use std::collections::{VecDeque, HashMap};

/// Пример 1: Топологическая сортировка (алгоритм Кана)
/// 
/// Задача: Найти топологический порядок вершин в графе
/// Временная сложность: O(V + E)
/// Пространственная сложность: O(V + E)
pub fn topological_sort(num_courses: i32, prerequisites: Vec<Vec<i32>>) -> Vec<i32> {
    let n = num_courses as usize;
    let mut graph: Vec<Vec<usize>> = vec![Vec::new(); n];
    let mut in_degree = vec![0; n];

    // Строим граф и подсчитываем входящие степени
    for prereq in prerequisites {
        let from = prereq[1] as usize;
        let to = prereq[0] as usize;
        graph[from].push(to);
        in_degree[to] += 1;
    }

    // Находим все вершины с in-degree = 0
    let mut queue = VecDeque::new();
    for i in 0..n {
        if in_degree[i] == 0 {
            queue.push_back(i);
        }
    }

    let mut result = Vec::new();

    // Обрабатываем вершины
    while let Some(node) = queue.pop_front() {
        result.push(node as i32);

        // Уменьшаем in-degree соседних вершин
        for &neighbor in &graph[node] {
            in_degree[neighbor] -= 1;
            if in_degree[neighbor] == 0 {
                queue.push_back(neighbor);
            }
        }
    }

    // Если не все вершины обработаны, есть цикл
    if result.len() == n {
        result
    } else {
        Vec::new()
    }
}

/// Пример 2: Проверка возможности завершения курсов
/// 
/// Задача: Определить, можно ли завершить все курсы (нет циклов)
/// Временная сложность: O(V + E)
/// Пространственная сложность: O(V + E)
pub fn can_finish(num_courses: i32, prerequisites: Vec<Vec<i32>>) -> bool {
    let n = num_courses as usize;
    let mut graph: Vec<Vec<usize>> = vec![Vec::new(); n];
    let mut in_degree = vec![0; n];

    for prereq in prerequisites {
        let from = prereq[1] as usize;
        let to = prereq[0] as usize;
        graph[from].push(to);
        in_degree[to] += 1;
    }

    let mut queue = VecDeque::new();
    for i in 0..n {
        if in_degree[i] == 0 {
            queue.push_back(i);
        }
    }

    let mut count = 0;

    while let Some(node) = queue.pop_front() {
        count += 1;

        for &neighbor in &graph[node] {
            in_degree[neighbor] -= 1;
            if in_degree[neighbor] == 0 {
                queue.push_back(neighbor);
            }
        }
    }

    count == n
}

/// Пример 3: Топологическая сортировка с DFS
/// 
/// Задача: Найти топологический порядок используя DFS
/// Временная сложность: O(V + E)
/// Пространственная сложность: O(V + E)
pub fn topological_sort_dfs(num_courses: i32, prerequisites: Vec<Vec<i32>>) -> Vec<i32> {
    let n = num_courses as usize;
    let mut graph: Vec<Vec<usize>> = vec![Vec::new(); n];
    
    for prereq in prerequisites {
        let from = prereq[1] as usize;
        let to = prereq[0] as usize;
        graph[from].push(to);
    }

    let mut visited = vec![0; n]; // 0: не посещено, 1: посещено, 2: обработано
    let mut result = Vec::new();

    fn dfs(
        node: usize,
        graph: &[Vec<usize>],
        visited: &mut [i32],
        result: &mut Vec<i32>,
    ) -> bool {
        if visited[node] == 1 {
            // Обнаружен цикл
            return false;
        }
        if visited[node] == 2 {
            return true;
        }

        visited[node] = 1;
        for &neighbor in &graph[node] {
            if !dfs(neighbor, graph, visited, result) {
                return false;
            }
        }
        visited[node] = 2;
        result.push(node as i32);
        true
    }

    for i in 0..n {
        if visited[i] == 0 {
            if !dfs(i, &graph, &mut visited, &mut result) {
                return Vec::new();
            }
        }
    }

    result.reverse();
    result
}

/// Пример 4: Минимальная высота деревьев
/// 
/// Задача: Найти корни деревьев минимальной высоты в неориентированном графе
/// Временная сложность: O(V + E)
/// Пространственная сложность: O(V + E)
pub fn find_min_height_trees(n: i32, edges: Vec<Vec<i32>>) -> Vec<i32> {
    if n == 1 {
        return vec![0];
    }

    let n = n as usize;
    let mut graph: Vec<Vec<usize>> = vec![Vec::new(); n];
    let mut degree = vec![0; n];

    for edge in edges {
        let u = edge[0] as usize;
        let v = edge[1] as usize;
        graph[u].push(v);
        graph[v].push(u);
        degree[u] += 1;
        degree[v] += 1;
    }

    // Начинаем с листьев (степень = 1)
    let mut queue = VecDeque::new();
    for i in 0..n {
        if degree[i] == 1 {
            queue.push_back(i);
        }
    }

    let mut remaining = n;

    // Удаляем листья слой за слоем
    while remaining > 2 {
        let size = queue.len();
        remaining -= size;

        for _ in 0..size {
            let leaf = queue.pop_front().unwrap();
            for &neighbor in &graph[leaf] {
                degree[neighbor] -= 1;
                if degree[neighbor] == 1 {
                    queue.push_back(neighbor);
                }
            }
        }
    }

    queue.into_iter().map(|x| x as i32).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_finish() {
        let prerequisites = vec![vec![1, 0], vec![0, 1]];
        assert!(!can_finish(2, prerequisites));
    }

    #[test]
    fn test_topological_sort() {
        let prerequisites = vec![vec![1, 0], vec![2, 0], vec![3, 1], vec![3, 2]];
        let result = topological_sort(4, prerequisites);
        assert_eq!(result.len(), 4);
    }

    #[test]
    fn test_find_min_height_trees() {
        let edges = vec![vec![1, 0], vec![1, 2], vec![1, 3]];
        let result = find_min_height_trees(4, edges);
        assert_eq!(result, vec![1]);
    }
}

