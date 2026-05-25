/*
 * quiz.js — тренажёр распознавания алгоритмических шаблонов по условию задачи.
 *
 * На странице ставится контейнер: <div class="algo-quiz"></div>
 * Скрипт находит его, перемешивает вопросы и варианты, ведёт счёт и в конце
 * показывает разбор слабых мест со ссылками на главы. Без зависимостей.
 */
(function () {
  "use strict";

  // Банк вопросов. correct — строка, обязана присутствовать в options.
  var QUESTIONS = [
    {
      q: "Дан отсортированный массив. Нужно найти две позиции, сумма значений в которых равна target.",
      options: ["Two Pointers", "Sliding Window", "Binary Search", "Dynamic Programming"],
      correct: "Two Pointers",
      explain: "Триггеры: «отсортированный массив» + «найти пару». Указатели с двух концов за O(n): сумма мала — двигаем левый, велика — правый. Sliding Window — для подотрезков, Binary Search — для одного значения.",
      href: "two-pointers.html"
    },
    {
      q: "Найти длину самой длинной подстроки без повторяющихся символов.",
      options: ["Sliding Window", "Two Pointers", "Trie", "Dynamic Programming"],
      correct: "Sliding Window",
      explain: "Триггеры: «подстрока» + «самая длинная при условии». Окно расширяется вправо и сжимается слева при нарушении условия — O(n). Частоты символов держим в map.",
      href: "sliding-window.html"
    },
    {
      q: "Определить, содержит ли односвязный список цикл, не используя доп. память.",
      options: ["Fast & Slow Pointers", "Sliding Window", "Tree BFS", "Binary Search"],
      correct: "Fast & Slow Pointers",
      explain: "Триггеры: «связный список» + «цикл» + «O(1) памяти». Медленный (×1) и быстрый (×2) указатели обязательно встретятся внутри цикла (алгоритм Флойда).",
      href: "fast-slow-pointers.html"
    },
    {
      q: "Дан список интервалов [start, end]; нужно объединить все перекрывающиеся.",
      options: ["Merge Intervals", "Greedy", "Two Pointers", "Dynamic Programming"],
      correct: "Merge Intervals",
      explain: "Триггеры: «интервалы» + «перекрытие». Сортируем по началу и сливаем соседние, если current.start <= last.end.",
      href: "merge-intervals.html"
    },
    {
      q: "Массив содержит числа от 1 до n не на своих местах. Найти все пропавшие — за O(1) доп. памяти.",
      options: ["Cyclic Sort", "Bit Manipulation", "Binary Search", "Two Pointers"],
      correct: "Cyclic Sort",
      explain: "Триггеры: «числа в диапазоне 1..n» + «O(1) памяти». Раскладываем каждое число на индекс v−1 обменами, затем индексы не на месте указывают на пропавшие.",
      href: "cyclic-sort.html"
    },
    {
      q: "Найти индекс элемента в повёрнутом отсортированном массиве за O(log n).",
      options: ["Modified Binary Search", "Two Pointers", "Sliding Window", "Tree DFS"],
      correct: "Modified Binary Search",
      explain: "Триггеры: «отсортированный (пусть и повёрнутый)» + «O(log n)». Одна из половин всегда отсортирована — определяем какая и сужаем диапазон.",
      href: "modified-binary-search.html"
    },
    {
      q: "Вывести значения узлов бинарного дерева по уровням (сверху вниз, по строкам).",
      options: ["Tree BFS", "Tree DFS", "Two Heaps", "Backtracking"],
      correct: "Tree BFS",
      explain: "Триггеры: «по уровням / по строкам». Обход в ширину через очередь; на каждой итерации обрабатываем ровно один уровень, фиксируя его размер.",
      href: "tree-bfs.html"
    },
    {
      q: "Проверить, является ли бинарное дерево корректным деревом поиска (BST).",
      options: ["Tree DFS", "Tree BFS", "Two Heaps", "Sliding Window"],
      correct: "Tree DFS",
      explain: "Триггеры: «свойство поддерева / валидация». Рекурсивный обход в глубину с передачей допустимого диапазона (min, max) для каждого узла.",
      href: "tree-dfs.html"
    },
    {
      q: "Поддерживать медиану потока чисел, который поступает в реальном времени.",
      options: ["Two Heaps", "Top-K Elements", "Modified Binary Search", "Merge Intervals"],
      correct: "Two Heaps",
      explain: "Триггеры: «медиана» + «поток». Max-heap для меньшей половины и min-heap для большей; вершины дают медиану, размеры балансируем.",
      href: "two-heaps.html"
    },
    {
      q: "Найти K наибольших элементов в большом массиве (полная сортировка не нужна).",
      options: ["Top-K Elements", "Two Heaps", "Dynamic Programming", "Two Pointers"],
      correct: "Top-K Elements",
      explain: "Триггеры: «K наибольших/наименьших». Min-heap размера K даёт O(n log k) — лучше полной сортировки O(n log n), когда нужны только K элементов.",
      href: "top-k-elements.html"
    },
    {
      q: "Слить K уже отсортированных списков в один отсортированный.",
      options: ["K-way Merge", "Merge Intervals", "Two Pointers", "Dynamic Programming"],
      correct: "K-way Merge",
      explain: "Триггеры: «K отсортированных источников». Min-heap из голов всех списков: извлекаем минимум, добавляем следующий из того же списка.",
      href: "k-way-merge.html"
    },
    {
      q: "Сгенерировать все возможные подмножества (или перестановки) набора.",
      options: ["Backtracking", "Dynamic Programming", "Tree BFS", "Greedy"],
      correct: "Backtracking",
      explain: "Триггеры: «все возможные комбинации/перестановки». Перебор с возвратом: выбор → рекурсия → отмена выбора. DP — когда нужно посчитать количество/оптимум, а не перечислить всё.",
      href: "backtracking.html"
    },
    {
      q: "Есть задачи с зависимостями (A нужно сделать до B). Найти корректный порядок выполнения.",
      options: ["Topological Sort", "Tree DFS", "Greedy", "Two Pointers"],
      correct: "Topological Sort",
      explain: "Триггеры: «зависимости / порядок / prerequisites» на ориентированном графе. Алгоритм Кана: убираем вершины с нулевой входящей степенью. Заодно ловит цикл.",
      href: "topological-sort.html"
    },
    {
      q: "Минимальное число монет заданных номиналов, чтобы набрать сумму (монеты можно брать многократно).",
      options: ["Dynamic Programming", "Greedy", "Backtracking", "Tree BFS"],
      correct: "Dynamic Programming",
      explain: "Триггеры: «минимум/максимум» + перекрывающиеся подзадачи. dp[a] = min(dp[a−c]+1). Жадность здесь НЕ работает (контрпример: монеты {1,3,4}, сумма 6).",
      href: "dynamic-programming.html"
    },
    {
      q: "Выбрать максимальное число взаимно непересекающихся встреч из заданного набора интервалов.",
      options: ["Greedy", "Dynamic Programming", "Merge Intervals", "Two Pointers"],
      correct: "Greedy",
      explain: "Триггеры: «максимум непересекающихся» с доказуемым жадным критерием. Сортируем по времени ОКОНЧАНИЯ и берём каждую следующую совместимую встречу.",
      href: "greedy.html"
    },
    {
      q: "Реализовать автодополнение слов по префиксу из большого словаря.",
      options: ["Trie", "Hashing", "Binary Search", "Sliding Window"],
      correct: "Trie",
      explain: "Триггеры: «префикс / автодополнение / словарь». Префиксное дерево даёт поиск по префиксу за O(длины запроса) независимо от размера словаря.",
      href: "trie.html"
    },
    {
      q: "Динамически объединять группы элементов и быстро проверять, в одной ли группе два элемента.",
      options: ["Union-Find (DSU)", "Tree BFS", "Dynamic Programming", "Merge Intervals"],
      correct: "Union-Find (DSU)",
      explain: "Триггеры: «динамическая связность / группы / компоненты». Система непересекающихся множеств со сжатием пути — почти O(1) на операцию.",
      href: "graphs.html"
    },
    {
      q: "В массиве каждое число встречается дважды, кроме одного. Найти его за O(1) памяти.",
      options: ["Bit Manipulation", "Hashing", "Sorting", "Two Pointers"],
      correct: "Bit Manipulation",
      explain: "Триггеры: «все парами, кроме одного» + «O(1) памяти». XOR всех чисел: пары взаимно уничтожаются (a^a=0), остаётся уникальное.",
      href: "bit-manipulation.html"
    },
    {
      q: "Часто запрашивать сумму на диапазоне [l, r], при этом элементы массива часто меняются.",
      options: ["Segment Tree / Fenwick", "Prefix Sum", "Sliding Window", "Binary Search"],
      correct: "Segment Tree / Fenwick",
      explain: "Триггеры: «сумма на диапазоне» + «частые обновления». Дерево отрезков/Фенвика дают и запрос, и обновление за O(log n). Префиксные суммы плохи при обновлениях (O(n)).",
      href: "segment-tree.html"
    },
    {
      q: "Найти кратчайший путь во ВЗВЕШЕННОМ графе с неотрицательными весами рёбер.",
      options: ["Dijkstra", "BFS", "Bellman–Ford", "Tree DFS"],
      correct: "Dijkstra",
      explain: "Триггеры: «кратчайший путь» + «веса неотрицательны». Дейкстра с приоритетной очередью. Обычный BFS подошёл бы только при единичных весах, Bellman–Ford нужен при отрицательных.",
      href: "grids-and-shortest-paths.html"
    },
    {
      q: "Найти кратчайший путь в НЕвзвешенном графе (все рёбра равнозначны).",
      options: ["BFS по графу", "Dijkstra", "Tree DFS", "Dynamic Programming"],
      correct: "BFS по графу",
      explain: "Триггеры: «кратчайший путь» + «невзвешенный». При единичных весах обычный BFS даёт ответ за O(V+E) — Дейкстра здесь избыточна.",
      href: "graphs.html"
    },
    {
      q: "Определить, образует ли набор рёбер цикл в НЕориентированном графе.",
      options: ["Union-Find (DSU)", "Topological Sort", "Tree DFS", "Binary Search"],
      correct: "Union-Find (DSU)",
      explain: "Триггеры: «цикл» + «неориентированный» + «динамически». Если оба конца ребра уже в одном множестве — ребро замыкает цикл. Топосортировка — для ориентированных графов.",
      href: "graphs.html"
    },
    {
      q: "Найти K-й по величине элемент в неотсортированном массиве.",
      options: ["Top-K Elements", "Two Heaps", "Sorting", "Binary Search"],
      correct: "Top-K Elements",
      explain: "Триггеры: «K-й по величине». Min-heap размера K за O(n log k); сортировка O(n log n) избыточна, когда нужен лишь один порядковый элемент.",
      href: "top-k-elements.html"
    },
    {
      q: "Развернуть участок связного списка между позициями m и n (остальное не трогать).",
      options: ["Reverse Linked List", "Two Pointers", "Fast & Slow Pointers", "Cyclic Sort"],
      correct: "Reverse Linked List",
      explain: "Триггеры: «развернуть (под)список на месте». Перенаправляем указатели внутри окна [m, n], держа три указателя prev/curr/next.",
      href: "reverse-linked-list.html"
    },
    {
      q: "Найти максимальную сумму подмассива ровно из k подряд идущих элементов.",
      options: ["Sliding Window", "Two Pointers", "Prefix Sum", "Dynamic Programming"],
      correct: "Sliding Window",
      explain: "Триггеры: «подмассив фиксированного размера k». Окно размера k со сдвигом: +новый −старый за O(1), всего O(n).",
      href: "sliding-window.html"
    },
    {
      q: "Проверить, можно ли разбить массив на два подмножества с равной суммой.",
      options: ["Dynamic Programming", "Greedy", "Backtracking", "Two Pointers"],
      correct: "Dynamic Programming",
      explain: "Триггеры: «можно ли набрать сумму S/2 подмножеством» — это 0/1 рюкзак (subset sum). Жадность не работает, чистый перебор экспоненциален.",
      href: "dynamic-programming.html"
    },
    {
      q: "Найти все начальные индексы анаграмм образца p внутри строки s.",
      options: ["Sliding Window", "Trie", "Two Pointers", "Hashing"],
      correct: "Sliding Window",
      explain: "Триггеры: «подстроки фиксированной длины |p|» + «совпадение по составу символов». Окно длины |p| со счётчиком частот, сравниваем с частотами p.",
      href: "sliding-window.html"
    },
    {
      q: "Найти наименьшего общего предка (LCA) двух узлов в бинарном дереве.",
      options: ["Tree DFS", "Tree BFS", "Two Heaps", "Binary Search"],
      correct: "Tree DFS",
      explain: "Триггеры: «предок / структура поддерева». Рекурсивный обход в глубину: узел, из чьих разных поддеревьев приходят оба искомых, и есть LCA.",
      href: "tree-dfs.html"
    }
  ];

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildQuiz(el) {
    var qs = shuffle(QUESTIONS.slice());
    var idx = 0, score = 0, missed = [], selected = null, answered = false;

    var head = document.createElement("div"); head.className = "algo-quiz__head"; el.appendChild(head);
    var qText = document.createElement("div"); qText.className = "algo-quiz__q"; el.appendChild(qText);
    var optsBox = document.createElement("div"); optsBox.className = "algo-quiz__opts"; el.appendChild(optsBox);
    var explain = document.createElement("div"); explain.className = "algo-quiz__explain"; el.appendChild(explain);
    var actions = document.createElement("div"); actions.className = "algo-quiz__actions"; el.appendChild(actions);
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "algo-quiz__btn"; actions.appendChild(btn);

    function renderQuestion() {
      var item = qs[idx];
      selected = null; answered = false;
      head.textContent = "Вопрос " + (idx + 1) + " / " + qs.length + "      Счёт: " + score;
      qText.textContent = item.q;
      explain.className = "algo-quiz__explain";
      explain.textContent = "";
      optsBox.innerHTML = "";
      var shuffled = shuffle(item.options.slice());
      shuffled.forEach(function (opt) {
        var o = document.createElement("button");
        o.type = "button"; o.className = "algo-quiz__opt"; o.textContent = opt;
        o.onclick = function () {
          if (answered) return;
          selected = opt;
          Array.prototype.forEach.call(optsBox.children, function (c) { c.classList.toggle("algo-quiz__opt--sel", c === o); });
          btn.disabled = false;
        };
        optsBox.appendChild(o);
      });
      btn.textContent = "Проверить";
      btn.disabled = true;
      btn.onclick = check;
    }

    function check() {
      if (answered) return;
      answered = true;
      var item = qs[idx];
      var ok = selected === item.correct;
      if (ok) score++; else missed.push(item);
      Array.prototype.forEach.call(optsBox.children, function (c) {
        c.disabled = true;
        if (c.textContent === item.correct) c.classList.add("algo-quiz__opt--correct");
        else if (c.textContent === selected) c.classList.add("algo-quiz__opt--wrong");
      });
      explain.className = "algo-quiz__explain algo-quiz__explain--show " + (ok ? "algo-quiz__explain--ok" : "algo-quiz__explain--bad");
      explain.innerHTML = (ok ? "✅ Верно — " : "❌ Правильный ответ: ") + "<b>" + item.correct + "</b><br>" +
        item.explain + " <a href=\"" + item.href + "\">📖 Глава</a>";
      head.textContent = "Вопрос " + (idx + 1) + " / " + qs.length + "      Счёт: " + score;
      btn.textContent = idx + 1 < qs.length ? "Следующий ▶" : "Результат";
      btn.disabled = false;
      btn.onclick = next;
    }

    function next() {
      idx++;
      if (idx < qs.length) renderQuestion();
      else renderSummary();
    }

    function renderSummary() {
      head.textContent = "Результат";
      qText.textContent = "Вы набрали " + score + " из " + qs.length + ".";
      optsBox.innerHTML = "";
      explain.className = "algo-quiz__explain";
      explain.textContent = "";
      if (missed.length) {
        var seen = {};
        var html = "<div class='algo-quiz__weak'>Стоит повторить:</div><ul>";
        missed.forEach(function (m) {
          if (seen[m.correct]) return;
          seen[m.correct] = true;
          html += "<li><a href=\"" + m.href + "\">" + m.correct + "</a></li>";
        });
        html += "</ul>";
        explain.className = "algo-quiz__explain algo-quiz__explain--show";
        explain.innerHTML = html;
      } else {
        explain.className = "algo-quiz__explain algo-quiz__explain--show algo-quiz__explain--ok";
        explain.textContent = "Идеально! Все шаблоны распознаны верно. 🎉";
      }
      btn.textContent = "Пройти заново";
      btn.disabled = false;
      btn.onclick = function () { qs = shuffle(QUESTIONS.slice()); idx = 0; score = 0; missed = []; renderQuestion(); };
    }

    renderQuestion();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll(".algo-quiz:not(.algo-quiz--ready)"), function (el) {
      el.classList.add("algo-quiz--ready");
      buildQuiz(el);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
