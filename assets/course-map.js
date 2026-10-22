/*
 * course-map.js — опоры глав для карты курса: { глава: [главы, на которых она стоит] }.
 * СГЕНЕРИРОВАНО: node scripts/gen-course-map.js. Руками не редактировать: источник правды —
 * предложение «Эта глава стоит на …» в блоке «Вспомни» глав (src/*.md). CI: --check.
 */
(function () {
  var LEANS = {
    "advanced-graph-algorithms": [
      "grids-and-shortest-paths",
      "heap-structure"
    ],
    "avl-tree-structure": [
      "bst-structure"
    ],
    "backtracking": [
      "tree-dfs"
    ],
    "bst-structure": [
      "linked-list-structure",
      "recursion"
    ],
    "btree-structure": [
      "bst-structure",
      "avl-tree-structure"
    ],
    "complexity-classes": [
      "subsets",
      "backtracking"
    ],
    "cryptography": [
      "number-theory"
    ],
    "deque-structure": [
      "linked-list-structure",
      "big-o"
    ],
    "dynamic-programming": [
      "recursion"
    ],
    "fast-slow-pointers": [
      "linked-list-structure"
    ],
    "fenwick-tree-structure": [
      "bit-manipulation"
    ],
    "fenwick-tree": [
      "fenwick-tree-structure"
    ],
    "graph-connectivity": [
      "graphs",
      "topological-sort"
    ],
    "graphs": [
      "tree-bfs",
      "tree-dfs"
    ],
    "greedy": [
      "merge-intervals",
      "sorting"
    ],
    "grids-and-shortest-paths": [
      "graphs"
    ],
    "hash-table-structure": [
      "big-o"
    ],
    "heap-structure": [
      "bst-structure",
      "big-o"
    ],
    "invariants": [
      "two-pointers",
      "sliding-window"
    ],
    "k-way-merge": [
      "heap-structure"
    ],
    "linked-list-structure": [
      "big-o",
      "hash-table-structure"
    ],
    "max-flow": [
      "graphs",
      "tree-bfs"
    ],
    "merge-intervals": [
      "sorting"
    ],
    "modified-binary-search": [
      "big-o"
    ],
    "monotonic-stack": [
      "big-o"
    ],
    "prefix-sums": [
      "sliding-window",
      "hash-table-structure"
    ],
    "probabilistic-structures": [
      "hash-table-structure"
    ],
    "recursion": [
      "big-o"
    ],
    "red-black-tree-structure": [
      "avl-tree-structure"
    ],
    "reverse-linked-list": [
      "linked-list-structure"
    ],
    "segment-tree-structure": [
      "heap-structure",
      "recursion"
    ],
    "segment-tree": [
      "segment-tree-structure"
    ],
    "sliding-window": [
      "big-o"
    ],
    "sorting": [
      "recursion"
    ],
    "sparse-table-structure": [
      "bit-manipulation",
      "big-o"
    ],
    "string-algorithms": [
      "hash-table-structure",
      "two-pointers"
    ],
    "subsets": [
      "recursion"
    ],
    "top-k-elements": [
      "heap-structure"
    ],
    "topological-sort": [
      "graphs"
    ],
    "tree-bfs": [
      "bst-structure"
    ],
    "tree-dfs": [
      "recursion"
    ],
    "trie-structure": [
      "hash-table-structure",
      "tree-dfs"
    ],
    "trie": [
      "trie-structure"
    ],
    "two-heaps": [
      "heap-structure"
    ],
    "two-pointers": [
      "sorting",
      "sliding-window"
    ],
    "union-find-structure": [
      "graphs"
    ]
  };
  if (typeof module !== "undefined" && module.exports) module.exports = LEANS;
  if (typeof window !== "undefined") window.ALGO_COURSE_LEANS = LEANS;
})();
