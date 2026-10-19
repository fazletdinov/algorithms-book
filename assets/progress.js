/*
 * progress.js — личный трекер прогресса по главам (сохраняется в localStorage).
 * Контейнер: <div class="algo-progress"></div>
 * Ту же отметку ставит галочка «Глава пройдена», которую этот файл сам добавляет в конец каждой
 * главы из реестра (chapterDone): отмечать главу там, где она дочитана, а не на шпаргалке.
 */
(function () {
  "use strict";

  // Список глав ведётся вручную, но НЕ на честном слове: scripts/check-registries.js
  // (запускается в CI) сверяет его с src/SUMMARY.md и падает, если в книге появилась
  // глава, которой тут нет. Иначе «100%» в трекере переставало бы значить
  // «прочитал всю книгу» — а именно это с ним однажды и случилось.
  // Порядок и разбивка по группам повторяют оглавление книги. Порядок — это маршрут:
  // check-registries.js сверяет его с оглавлением, check-ladder.js по нему решает,
  // что «Вспомни» главы ядра опирается только на главы раньше неё.
  //
  // Поле lvl — МАРШРУТ, а не оценка важности главы:
  //   core — ядро: 23 главы, скелет курса, читается подряд. Только оно идёт в процент;
  //   ext  — расширение: широко полезно, но после ядра;
  //   ref  — справочник: открыть, когда встретишь в жизни или захочешь полноты
  //          (AVL/RB-деревья, потоки, теория чисел — их не пишут руками на работе);
  //   tool — не глава, а инструмент (квиз, шпаргалка): нигде не считается.
  // Смысл в том, что 60 глав в оглавлении выглядят одинаково обязательными, и от
  // этого курс бросают. Ядра — двадцать три главы, и это видно.
  var GROUPS = [
    { g: "Ориентиры", items: [
      { t: "Руководство по выбору шаблона", h: "pattern-selection-guide.html", lvl: "tool" },
      { t: "Шпаргалка", h: "cheatsheet.html", lvl: "tool" },
      { t: "Тренажёр распознавания (квиз)", h: "quiz.html", lvl: "tool" }
    ] },
    { g: "Группа 1: Фундамент", items: [
      { t: "Big-O и амортизированный анализ", h: "big-o.html", lvl: "core" },
      { t: "Рекурсия и мастер-теорема", h: "recursion.html", lvl: "core" },
      { t: "Хеш-таблица: устройство", h: "hash-table-structure.html", lvl: "core" },
      { t: "Связный список: устройство", h: "linked-list-structure.html", lvl: "core" },
      { t: "Дек: устройство", h: "deque-structure.html", lvl: "ext" },
      { t: "Сортировки и порядковые статистики", h: "sorting.html", lvl: "core" }
    ] },
    { g: "Группа 2: Базовые паттерны", items: [
      { t: "Скользящее окно", h: "sliding-window.html", lvl: "core" },
      { t: "Префиксные суммы", h: "prefix-sums.html", lvl: "core" },
      { t: "Два указателя", h: "two-pointers.html", lvl: "core" },
      { t: "Инварианты и индукция", h: "invariants.html", lvl: "core" },
      { t: "Монотонный стек", h: "monotonic-stack.html", lvl: "core" },
      { t: "Быстрый и медленный указатели", h: "fast-slow-pointers.html", lvl: "core" },
      { t: "Разворот связанного списка", h: "reverse-linked-list.html", lvl: "ext" },
      { t: "Слияние интервалов", h: "merge-intervals.html", lvl: "core" },
      { t: "Циклическая сортировка", h: "cyclic-sort.html", lvl: "ext" },
      { t: "Бинарный поиск", h: "modified-binary-search.html", lvl: "core" },
      { t: "Битовые операции", h: "bit-manipulation.html", lvl: "ext" }
    ] },
    { g: "Группа 3: Деревья и кучи", items: [
      { t: "BST: устройство", h: "bst-structure.html", lvl: "core" },
      { t: "AVL-дерево: балансировка", h: "avl-tree-structure.html", lvl: "ref" },
      { t: "Красно-чёрное дерево", h: "red-black-tree-structure.html", lvl: "ref" },
      { t: "Обход дерева в ширину", h: "tree-bfs.html", lvl: "core" },
      { t: "Обход дерева в глубину", h: "tree-dfs.html", lvl: "core" },
      { t: "Куча: устройство", h: "heap-structure.html", lvl: "core" },
      { t: "Две кучи", h: "two-heaps.html", lvl: "ext" },
      { t: "Топ K элементов", h: "top-k-elements.html", lvl: "core" },
      { t: "Слияние K списков", h: "k-way-merge.html", lvl: "ext" }
    ] },
    { g: "Группа 4: Комбинаторика и графы", items: [
      { t: "Подмножества", h: "subsets.html", lvl: "ext" },
      { t: "Поиск с возвратом", h: "backtracking.html", lvl: "core" },
      { t: "Обход графов", h: "graphs.html", lvl: "core" },
      { t: "Система непересекающихся множеств: устройство", h: "union-find-structure.html", lvl: "ext" },
      { t: "Топологическая сортировка", h: "topological-sort.html", lvl: "core" },
      { t: "Сетки и кратчайшие пути", h: "grids-and-shortest-paths.html", lvl: "ext" },
      { t: "Графы: продвинутые", h: "advanced-graph-algorithms.html", lvl: "ref" },
      { t: "Графы: связность (SCC, мосты)", h: "graph-connectivity.html", lvl: "ref" },
      { t: "Потоки в сетях", h: "max-flow.html", lvl: "ref" }
    ] },
    { g: "Группа 5: Оптимизация и границы", items: [
      { t: "Жадные алгоритмы", h: "greedy.html", lvl: "core" },
      { t: "Динамическое программирование", h: "dynamic-programming.html", lvl: "core" },
      { t: "Классы сложности: P и NP", h: "complexity-classes.html", lvl: "ref" }
    ] },
    { g: "Группа 6: Строки и продвинутые структуры", items: [
      { t: "Строковые алгоритмы", h: "string-algorithms.html", lvl: "ext" },
      { t: "Префиксное дерево: устройство", h: "trie-structure.html", lvl: "ext" },
      { t: "Префиксное дерево: разбор задач", h: "trie.html", lvl: "ext" },
      { t: "Ахо — Корасик", h: "aho-corasick.html", lvl: "ext" },
      { t: "Дерево отрезков: устройство", h: "segment-tree-structure.html", lvl: "ref" },
      { t: "Дерево отрезков: задачи", h: "segment-tree.html", lvl: "ref" },
      { t: "Дерево Фенвика: устройство", h: "fenwick-tree-structure.html", lvl: "ref" },
      { t: "Дерево Фенвика: задачи", h: "fenwick-tree.html", lvl: "ref" },
      { t: "Разреженная таблица: устройство", h: "sparse-table-structure.html", lvl: "ref" },
      { t: "B-дерево: устройство", h: "btree-structure.html", lvl: "ref" },
      { t: "Вероятностные структуры", h: "probabilistic-structures.html", lvl: "ref" }
    ] },
    { g: "Группа 7: Дискретная математика", items: [
      { t: "Комбинаторика счёта", h: "combinatorics.html", lvl: "ref" },
      { t: "Дискретная вероятность", h: "probability.html", lvl: "ref" },
      { t: "Теория чисел", h: "number-theory.html", lvl: "ref" },
      { t: "Криптография: модульная арифметика", h: "cryptography.html", lvl: "ref" }
    ] },
    { g: "Группа 8: Синтез", items: [
      { t: "Комбинации паттернов", h: "pattern-combinations.html", lvl: "ext" },
      { t: "Карта: структуры в реальных системах", h: "real-world-map.html", lvl: "ext" },
      { t: "Как Postgres хранит данные", h: "postgres-storage.html", lvl: "ext" },
      { t: "Postgres: EXPLAIN как pprof", h: "postgres-plans.html", lvl: "ext" },
      { t: "Консистентное хеширование", h: "consistent-hashing.html", lvl: "ext" },
      { t: "Капстоун: мини-Redis", h: "miniredis.html", lvl: "ext" },
      { t: "Ревью чужого кода", h: "code-review.html", lvl: "ext" },
      { t: "Параллельные алгоритмы", h: "parallel-algorithms.html", lvl: "ext" },
      { t: "Когда алгоритм не нужен", h: "skip-the-work.html", lvl: "ext" }
    ] },
    { g: "Дополнительные материалы", items: [
      { t: "Go-рантайм: планировщик, GC", h: "go-runtime.html", lvl: "ext" },
      { t: "Структуры в экосистеме Go", h: "go-stdlib-structures.html", lvl: "ext" },
      { t: "Криптография: библиотеки Go", h: "go-crypto-libraries.html", lvl: "ref" },
      { t: "Приложение: память, GC, профилирование", h: "appendix-go-memory.html", lvl: "ext" },
      { t: "Заключение", h: "conclusion.html", lvl: "ext" }
    ] }
  ];

  // Подписи уровней — используются и в трекере, и в плашке на самой странице главы.
  var LEVELS = {
    core: { badge: "Ядро", hint: "Скелет курса: эти главы читаются подряд." },
    ext: { badge: "Расширение", hint: "Не на основном пути: читается после ядра, ядро на неё не опирается." },
    ref: { badge: "Справочник", hint: "Не на пути: открой, когда встретишь в работе или захочешь полноты. Пропустить сейчас — нормально." },
    tool: { badge: "Инструмент", hint: "Не глава, а инструмент: сюда возвращаются, а не «проходят»." }
  };

  // Плоский список — для процента и для остального кода: состояние в localStorage
  // ключуется по href главы, поэтому перегруппировка не сбрасывает отметки.
  var CHAPTERS = GROUPS.reduce(function (acc, grp) { return acc.concat(grp.items); }, []);
  function ofLevel(lvl) {
    return CHAPTERS.filter(function (c) { return c.lvl === lvl; });
  }

  var KEY = "algoProgress";
  // Когда глава отмечена: по этой метке srs.js считает срок карточки «глава + день» от самой
  // отметки, а не от первого захода на страницу «Повторение». Отдельный ключ, потому что формат
  // algoProgress ({href: true|false}) читают трекер, повторение и экспорт — менять его нельзя.
  var MARKED_AT_KEY = "algoProgressAt";

  function load() {
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return null; } // null — хранилище недоступно: вызывающий оставляет то, что держит в памяти вкладки
    try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
  }
  // save отвечает, записалось ли: недоступное хранилище — отметки живут в памяти вкладки до перезагрузки
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }

  // Метки пишутся по свежему чтению: трекер держит state, прочитанный при загрузке, а метки
  // принадлежат и другим вкладкам.
  function markAt(href, on) {
    try {
      var marks = JSON.parse(localStorage.getItem(MARKED_AT_KEY)) || {};
      if (on) marks[href] = Date.now(); else delete marks[href];
      localStorage.setItem(MARKED_AT_KEY, JSON.stringify(marks));
    } catch (e) { /* недоступно — карточка главы встанет от «сейчас» */ }
  }

  // Отметки изменились — движок повторений (srs.js, подключён позже) сверяется сразу: карточка
  // отмеченной главы заводится, ни разу не оценённая карточка снятой — уходит, счётчик «Сегодня»
  // обновляется без перехода на другую страницу.
  function syncSRS() {
    if (window.ALGO_SRS) window.ALGO_SRS.sync();
  }

  // setDone — единственное место, где пишется отметка главы: им пользуются и трекер, и галочка в
  // конце главы. Запись по СВЕЖЕМУ чтению (отметки принадлежат и другим вкладкам); held — то, что
  // вызывающий держит в памяти вкладки, на случай недоступного хранилища. saved — записалось ли.
  function setDone(href, on, held) {
    var state = load() || held || {};
    state[href] = on;
    var saved = save(state);
    markAt(href, on);
    syncSRS();
    return { state: state, saved: saved };
  }

  function build(el) {
    var state = load() || {};

    var barWrap = document.createElement("div"); barWrap.className = "algo-prog__barwrap";
    // Полоса прогресса передаёт долю и шириной, и ARIA-значением (для скринридеров).
    barWrap.setAttribute("role", "progressbar");
    barWrap.setAttribute("aria-label", "Прогресс прохождения глав");
    barWrap.setAttribute("aria-valuemin", "0");
    barWrap.setAttribute("aria-valuemax", "100");
    var bar = document.createElement("div"); bar.className = "algo-prog__bar"; barWrap.appendChild(bar);
    var label = document.createElement("div"); label.className = "algo-prog__label";
    el.appendChild(label); el.appendChild(barWrap);

    // Вторая строка — расширение и справочник отдельным счётом. Намеренно НЕ в
    // проценте: смешать их с ядром значит снова получить «пройдено 12 из 60» и
    // ощущение, что конца не видно.
    var aside = document.createElement("div"); aside.className = "algo-prog__aside";
    el.appendChild(aside);

    var list = document.createElement("div"); list.className = "algo-prog__list"; el.appendChild(list);

    var CORE = ofLevel("core"), EXT = ofLevel("ext"), REF = ofLevel("ref");
    var boxes = [];
    var groupCounters = [];
    function countDone(items) {
      return items.reduce(function (a, c) { return a + (state[c.h] ? 1 : 0); }, 0);
    }
    // Галочки и подсветка строк — по state. После чтения хранилища заново (клик, импорт) там могут быть
    // отметки, сделанные в другой вкладке, и без этого процент считал бы одно, а список показывал другое.
    function showState() {
      boxes.forEach(function (cb) {
        var href = cb.parentNode.querySelector(".algo-prog__link").getAttribute("href");
        cb.checked = !!state[href];
        cb.parentNode.classList.toggle("algo-prog__item--done", cb.checked);
      });
    }
    function refresh() {
      var done = countDone(CORE);
      var pct = Math.round(done / CORE.length * 100);
      bar.style.width = pct + "%";
      label.textContent = "Ядро пройдено: " + done + " / " + CORE.length + " (" + pct + "%)";
      barWrap.setAttribute("aria-valuenow", String(pct));
      barWrap.setAttribute("aria-valuetext", done + " из " + CORE.length + " глав ядра (" + pct + "%)");
      aside.textContent =
        "Расширение: " + countDone(EXT) + " / " + EXT.length +
        " · Справочник: " + countDone(REF) + " / " + REF.length +
        " — идут сверх ядра и в процент не входят";
      groupCounters.forEach(function (gc) {
        gc.el.textContent = countDone(gc.items) + " / " + gc.items.length;
      });
    }

    GROUPS.forEach(function (grp) {
      var head = document.createElement("div"); head.className = "algo-prog__group";
      var title = document.createElement("span"); title.textContent = grp.g; head.appendChild(title);
      var counter = document.createElement("span"); counter.className = "algo-prog__groupcount"; head.appendChild(counter);
      list.appendChild(head);
      groupCounters.push({ items: grp.items, el: counter });

      grp.items.forEach(function (ch) {
        var row = document.createElement("label"); row.className = "algo-prog__item";
        var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!state[ch.h];
        cb.setAttribute("aria-label", "Отметить главу пройденной: " + ch.t);
        cb.onchange = function () { state = setDone(ch.h, cb.checked, state).state; showState(); refresh(); };
        var a = document.createElement("a"); a.href = ch.h; a.textContent = ch.t; a.className = "algo-prog__link";
        row.appendChild(cb); row.appendChild(a);
        // Ядро не помечаем: метка на четырёх пятых списка — это шум. Значок
        // стоит там, где он что-то сообщает: «эту можно отложить».
        if (ch.lvl !== "core") {
          var tag = document.createElement("span");
          tag.className = "algo-lvl algo-lvl--" + ch.lvl;
          tag.textContent = LEVELS[ch.lvl].badge;
          tag.title = LEVELS[ch.lvl].hint;
          row.appendChild(tag);
        }
        if (cb.checked) row.classList.add("algo-prog__item--done");
        list.appendChild(row); boxes.push(cb);
      });
    });

    // Экспорт/импорт: весь прогресс живёт в localStorage одного браузера —
    // чистка кэша или переход на другую машину стирали два-три месяца работы
    // без единого способа это перенести. Забираем ВСЕ ключи книги (главы,
    // решённые задачи, промахи, рекорд квиза и код, написанный в виджетах),
    // а не только этот трекер.
    // algoProgressAt (метки отметок для srs.js) отдельной записью не нужен: его покрывает префикс
    // "algoProgress" (isOurs сравнивает по префиксу) — это держит review-render-check (экспорт и импорт).
    // algoFnSolved — решённые упражнения виджета runner'а ({ "<пакет>.<имя>": ts }): сливается общим правилом.
    // algoQuizSeen — когда вопрос квиза показан последний раз ({ "<вопрос>": ts }), algoPracticeScope —
    // «только пройденные главы» или «по всем» у квиза и смешанной; правила их слияния — MERGE_BY_KEY ниже.
    // Рекорд полной порции квиза algoQuizBestPortion покрывает префикс "algoQuizBest" (isOurs).
    var PREFIXES = ["algoProgress", "algoChallengeSolved", "algoChallengeMissed", "algoQuizBest", "algoRunnerCode:", "algoPkgSolved", "algoFnSolved", "algoSRS",
      "algoExplain", "algoExplainDone", "algoQuizMissed", "algoQuizSeen", "algoMixedMissed", "algoMixedSeen",
      "algoMockLog", "algoMockCxMissed", "algoVizMissed", "algoVizPredict", "algoPracticeScope"];
    function isOurs(key) {
      return PREFIXES.some(function (p) { return key === p || key.indexOf(p) === 0; });
    }

    var exportBtn = document.createElement("button"); exportBtn.type = "button"; exportBtn.className = "algo-quiz__btn"; exportBtn.textContent = "Экспорт прогресса";
    exportBtn.onclick = function () {
      var dump = { kind: "algorithms-book-progress", version: 1, data: {} };
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (isOurs(k)) dump.data[k] = localStorage.getItem(k);
      }
      var blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "algorithms-book-progress.json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };

    var importInput = document.createElement("input");
    importInput.type = "file"; importInput.accept = "application/json,.json"; importInput.style.display = "none";
    importInput.onchange = function () {
      var file = importInput.files && importInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var dump;
        try { dump = JSON.parse(String(reader.result)); } catch (e) { dump = null; }
        if (!dump || dump.kind !== "algorithms-book-progress" || !dump.data) {
          alert("Это не файл прогресса книги.");
          return;
        }
        // Слияние, а не замена: импорт с другой машины не должен стирать то,
        // что уже пройдено здесь. Для карт-объектов объединяем ключи.
        Object.keys(dump.data).forEach(function (k) {
          if (!isOurs(k)) return;
          var out = importValue(k, localStorage.getItem(k), dump.data[k]);
          if (out === null) return;
          try { localStorage.setItem(k, out); } catch (e) { /* приватный режим */ }
        });
        state = load() || state;
        showState();
        refresh();
        importInput.value = "";
        // карточки повторений и метки могли измениться: движок заводит карточки для пришедших отметок и
        // промахов, а счётчик «Сегодня» и порция (srs.js) перестраиваются без перехода на другую страницу
        syncSRS();
        document.dispatchEvent(new CustomEvent("algo-srs:change", { detail: { ids: [] } }));
      };
      reader.readAsText(file);
    };
    var importBtn = document.createElement("button"); importBtn.type = "button"; importBtn.className = "algo-quiz__btn"; importBtn.textContent = "Импорт";
    importBtn.onclick = function () { importInput.click(); };

    var reset = document.createElement("button"); reset.type = "button"; reset.className = "algo-quiz__btn"; reset.textContent = "Сбросить прогресс";
    reset.onclick = function () {
      state = {}; save(state);
      try { localStorage.removeItem(MARKED_AT_KEY); } catch (e) { /* недоступно */ }
      boxes.forEach(function (cb) { cb.checked = false; cb.parentNode.classList.remove("algo-prog__item--done"); });
      refresh();
      syncSRS();
    };
    // Отметка из другой вкладки (галочка в конце главы, сброс) — трекер показывает её без перезагрузки.
    window.addEventListener("storage", function (e) {
      if (e.key !== null && e.key !== KEY) return;
      state = load() || state;
      showState();
      refresh();
    });
    // Имя не bar: так уже названа сама полоса прогресса выше, и повторный var
    // в той же функции молча перетирал бы её — refresh() тогда красит ширину
    // не тому элементу.
    var actions = document.createElement("div"); actions.className = "algo-prog__bar-actions";
    actions.appendChild(exportBtn); actions.appendChild(importBtn); actions.appendChild(reset);
    actions.appendChild(importInput);
    el.appendChild(actions);

    refresh();
  }

  // mergeStored сливает сохранённое здесь с импортированным. Карты-объекты —
  // объединением ключей (пришедшее побеждает). Массивы — объединением записей
  // без дублей: история собеседований (algoMockLog) — список, и слияние «по
  // ключам» перезаписало бы его по индексу — [a,b,c] + [x,y] дало бы [x,y,c],
  // и два собеседования пропали бы молча.
  function mergeStored(current, add) {
    if (Array.isArray(current) && Array.isArray(add)) {
      var seen = {};
      var out = [];
      current.concat(add).forEach(function (item) {
        var id = JSON.stringify(item);
        if (seen[id]) return;
        seen[id] = true;
        out.push(item);
      });
      return out.sort(function (a, b) { return ((a && a.ts) || 0) - ((b && b.ts) || 0); });
    }
    Object.keys(add).forEach(function (id) { current[id] = add[id]; });
    return current;
  }

  function isMap(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }
  function tryParse(raw) {
    try { return JSON.parse(raw); } catch (e) { return undefined; }
  }

  // Общее правило mergeStored — «пришедшее побеждает» — для четырёх ключей делает обратное тому, что
  // обещает импорт («не стирать пройденное здесь»), поэтому у них свои правила, по имени ключа
  // (у скаляра algoPracticeScope — своё в importValue).
  // Каждое принимает здешнюю и пришедшую КАРТЫ и возвращает слитую.
  //
  // algoSRS: файл старше текущего состояния откатывал бы свежие оценки. По каждой карточке побеждает
  // та, у которой больше seen; карточка без seen проигрывает оценённой; при равенстве — здешняя.
  function mergeSRS(current, add) {
    Object.keys(add).forEach(function (id) {
      if (!isMap(add[id])) return; // мусор из файла не заводим
      var here = current[id];
      var seenHere = isMap(here) && typeof here.seen === "number" ? here.seen : -Infinity;
      var seenThere = typeof add[id].seen === "number" ? add[id].seen : -Infinity;
      if (!isMap(here) || seenThere > seenHere) current[id] = add[id];
    });
    return current;
  }
  // algoProgress: «false» из файла снимал здешнюю отметку. Отметка побеждает, с любой стороны.
  function mergeProgress(current, add) {
    Object.keys(add).forEach(function (href) { current[href] = !!(current[href] || add[href]); });
    return current;
  }
  // algoProgressAt: для главы, отмеченной с обеих сторон, — более ранняя метка: событие случилось тогда.
  function mergeProgressAt(current, add) {
    Object.keys(add).forEach(function (href) {
      var here = current[href], there = add[href];
      if (typeof there !== "number") return;
      current[href] = typeof here === "number" ? Math.min(here, there) : there;
    });
    return current;
  }
  // algoQuizSeen: метка «вопрос показан» — более поздняя: давно виденные квиз даёт раньше, и ранняя метка
  // из файла вернула бы в порцию то, что здесь только что прошли.
  function mergeQuizSeen(current, add) {
    Object.keys(add).forEach(function (q) {
      var here = current[q], there = add[q];
      if (typeof there !== "number") return;
      current[q] = typeof here === "number" ? Math.max(here, there) : there;
    });
    return current;
  }
  var MERGE_BY_KEY = { algoSRS: mergeSRS, algoProgress: mergeProgress, algoProgressAt: mergeProgressAt, algoQuizSeen: mergeQuizSeen };

  // betterBest — из двух рекордов «счёт/всего» тот, у кого счёт больше; неразборчивый пришедший не
  // затирает здешний, неразборчивый здешний заменяется пришедшим (null — оставить здешнее).
  function betterBest(currentRaw, incomingRaw) {
    function score(raw) {
      var m = /^(\d+)\/(\d+)$/.exec(String(raw || ""));
      return m ? Number(m[1]) : -1;
    }
    return score(incomingRaw) > score(currentRaw) ? incomingRaw : null;
  }

  // importValue решает, что записать в ключ k при импорте: сырой текст (null — оставить здешнее).
  // Ключи со своим правилом принимают только карту, а здешнее не-карту (повреждённое) лечат пришедшей
  // картой. Для остальных общее правило прежнее, но значение из файла, которое не разбирается как
  // JSON (или другого вида, чем здешнее: карта против массива), не затирает здешний объект или массив — это был
  // единственный найденный путь к повреждённому algoSRS. Ключи с сырым текстом (код читателя, рекорд
  // квиза) ведут себя как раньше.
  function importValue(k, currentRaw, incomingRaw) {
    var merge = MERGE_BY_KEY[k];
    // algoPracticeScope — выбор читателя на ЭТОЙ машине: заданный здесь файл не перебивает
    if (k === "algoPracticeScope") return currentRaw ? null : incomingRaw;
    // algoQuizBestPortion — рекорд полной порции квиза «k/10»: остаётся лучший из двух
    if (k === "algoQuizBestPortion") return betterBest(currentRaw, incomingRaw);
    var incoming = tryParse(incomingRaw);
    if (merge) {
      if (!isMap(incoming)) return null;
      var current = tryParse(currentRaw);
      return JSON.stringify(merge(isMap(current) ? current : {}, incoming));
    }
    if (!currentRaw || k === "algoQuizBest" || k.indexOf("algoRunnerCode:") === 0) return incomingRaw;
    var cur = tryParse(currentRaw);
    if (cur !== null && typeof cur === "object" && !(incoming !== null && typeof incoming === "object" && Array.isArray(cur) === Array.isArray(incoming))) return null;
    try {
      return JSON.stringify(mergeStored(cur, incoming));
    } catch (e) {
      return incomingRaw; // здешнее не разбирается — берём пришедшее как есть
    }
  }

  // Список глав нужен и движку повторений (srs.js) — чтобы показывать название
  // главы, а не слаг из адреса. Отдельного модуля ради одной константы не
  // заводим: оглавление и так живёт здесь.
  window.ALGO_CHAPTERS = CHAPTERS;

  // Пройденные главы для квиза (quiz.js) и смешанной тренировки (mixed.js): они по умолчанию берут
  // только отмеченное. algoProgress ключуется по href главы, а банк задач и квиз — по слагу; перевод
  // одного в другое — только здесь, из реестра. Чтение свежее: главу могли отметить в другой вкладке.
  // Хранилище недоступно — {} (ALGO_DONE.readable() скажет почему); главы вне реестра и инструменты
  // (квиз, шпаргалка) не считаются.
  function practiceDone() {
    var state = load() || {};
    var out = {};
    CHAPTERS.forEach(function (c) {
      if (c.lvl !== "tool" && state[c.h]) out[c.h.replace(/\.html$/, "")] = true;
    });
    return out;
  }
  practiceDone.readable = function () {
    return load() !== null;
  };
  // Режим выдачи — общий у квиза и смешанной: "done" (по умолчанию: только пройденные главы) или
  // "all". Хранилище недоступно — выбор живёт в памяти вкладки.
  var SCOPE_KEY = "algoPracticeScope";
  var scopeMem = null;
  practiceDone.scope = function () {
    var v = scopeMem;
    try { v = localStorage.getItem(SCOPE_KEY) || scopeMem; } catch (e) { /* недоступно — память вкладки */ }
    return v === "all" ? "all" : "done";
  };
  practiceDone.setScope = function (v) {
    scopeMem = v === "all" ? "all" : "done";
    try { localStorage.setItem(SCOPE_KEY, scopeMem); } catch (e) { /* недоступно — память вкладки */ }
  };
  window.ALGO_DONE = practiceDone;

  // Плашка уровня на самой странице главы. Ставится ИЗ ЭТОГО ЖЕ реестра, а не
  // руками в сорока файлах: разметка в двух местах гарантированно разъедется,
  // и тогда трекер будет считать одно, а глава утверждать другое.
  // Ядро и инструменты не помечаем — молчание и означает «ты на пути».
  // Глава реестра, чья страница открыта; null — страница не из реестра (введение, глоссарий,
  // «Повторение», print.html — вся книга одной страницей).
  function chapterByFile(file) {
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].h === file) return CHAPTERS[i];
    }
    return null;
  }
  function currentChapter() {
    return chapterByFile((location.pathname.split("/").pop() || "index.html").split("#")[0]);
  }

  function markPage() {
    var ch = currentChapter();
    if (!ch || ch.lvl === "core" || ch.lvl === "tool") return;
    var main = document.querySelector("main");
    if (!main || main.querySelector(".algo-lvlnote")) return;
    var h1 = main.querySelector("h1");
    if (!h1) return;
    var note = document.createElement("div");
    note.className = "algo-lvlnote algo-lvlnote--" + ch.lvl;
    var badge = document.createElement("b");
    badge.className = "algo-lvl algo-lvl--" + ch.lvl;
    badge.textContent = LEVELS[ch.lvl].badge;
    note.appendChild(badge);
    note.appendChild(document.createTextNode(" " + LEVELS[ch.lvl].hint));
    h1.parentNode.insertBefore(note, h1.nextSibling);
  }

  // Боковое оглавление: ссылки на главы расширения и справочника приглушены классом уровня и
  // подсказкой — шестьдесят глав в списке иначе выглядят одинаково обязательными. Уровень берётся
  // из того же GROUPS; ядро и инструменты не помечаем (молчание = «ты на пути»), ссылки остаются
  // обычными и кликабельными. Оглавление mdBook (custom element, connectedCallback) обычно уже
  // заполнено к этому моменту; если нет — один MutationObserver ждёт ссылок и отключается.
  var tocWatch = null;
  function markToc() {
    var links = document.querySelectorAll(".sidebar-scrollbox .chapter a[href]");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var ch = chapterByFile((a.getAttribute("href") || "").split("#")[0].split("/").pop());
      if (!ch || (ch.lvl !== "ext" && ch.lvl !== "ref")) continue;
      a.classList.add("algo-toc--" + ch.lvl);
      a.title = LEVELS[ch.lvl].hint;
    }
    return links.length > 0;
  }
  // Наблюдатель смотрит на коробку оглавления mdBook, если она уже в документе: на body его будил бы
  // каждый шаг любого виджета. После разметки или срока он отключается и забывается (tocWatch = null),
  // чтобы повторный initToc мог завести новый, а запоздалый срок не трогал уже чужой.
  function initToc() {
    if (markToc() || tocWatch || typeof MutationObserver === "undefined") return;
    var watch = new MutationObserver(function () {
      if (markToc()) stop();
    });
    function stop() {
      watch.disconnect();
      if (tocWatch === watch) tocWatch = null;
    }
    tocWatch = watch;
    watch.observe(document.querySelector("mdbook-sidebar-scrollbox") || document.body, { childList: true, subtree: true });
    setTimeout(stop, 5000);
  }
  window.ALGO_MARK_TOC = markToc;
  window.ALGO_INIT_TOC = initToc;

  // Галочка «Глава пройдена» в конце главы. Раньше отметить главу можно было только в трекере на
  // шпаргалке — на другой странице, до которой ещё надо дойти; отметку забывали, и карточка главы
  // не заводилась. Тот же реестр и та же запись, что у трекера (setDone). Нет на страницах-
  // инструментах, на страницах вне реестра и на print.html; блок один на страницу.
  function chapterDone() {
    var ch = currentChapter();
    if (!ch || ch.lvl === "tool") return;
    var main = document.querySelector("main");
    if (!main || main.querySelector(".algo-chapdone")) return;

    var box = document.createElement("div"); box.className = "algo-chapdone";
    var label = document.createElement("label"); label.className = "algo-chapdone__label";
    var cb = document.createElement("input"); cb.type = "checkbox";
    label.appendChild(cb);
    label.appendChild(document.createTextNode("Глава пройдена"));
    var hint = document.createElement("span"); hint.className = "algo-chapdone__hint";
    box.appendChild(label); box.appendChild(hint);

    // Подсказка — строки и ссылки [текст, адрес].
    function say(parts) {
      hint.textContent = "";
      parts.forEach(function (p) {
        if (typeof p === "string") { hint.appendChild(document.createTextNode(p)); return; }
        var a = document.createElement("a"); a.textContent = p[0]; a.href = p[1];
        hint.appendChild(a);
      });
    }
    var TRACKER = "cheatsheet.html#мой-прогресс", REVIEW = "review.html";
    function show(on, saved) {
      cb.checked = on;
      box.classList.toggle("algo-chapdone--done", on);
      if (!saved) {
        say(["Отметка не сохранилась: хранилище браузера недоступно или переполнено — она действует, пока открыта эта страница."]);
      } else if (on) {
        say(["Глава в ", ["трекере прогресса", TRACKER], "; её карточка придёт на ", ["повторение", REVIEW], " по расписанию."]);
      } else {
        say(["Отметка попадёт в ", ["трекер прогресса", TRACKER], ", а карточка главы — в очередь на ", ["повторение", REVIEW],
          " (новая карточка приходит через сутки)."]);
      }
    }

    show(!!(load() || {})[ch.h], true);
    // хранилище недоступно — галочка держится на самом поле, пока открыта страница, и говорит об этом
    cb.onchange = function () {
      show(cb.checked, setDone(ch.h, cb.checked).saved);
    };
    // трекер в другой вкладке отметил или снял главу (или прогресс сбросили) — галочка это показывает
    window.addEventListener("storage", function (e) {
      if (e.key !== null && e.key !== KEY) return;
      var fresh = load();
      if (fresh) show(!!fresh[ch.h], true);
    });
    main.appendChild(box);
  }

  function init() {
    markPage();
    initToc();
    chapterDone();
    Array.prototype.forEach.call(document.querySelectorAll(".algo-progress:not(.algo-progress--ready)"), function (el) {
      el.classList.add("algo-progress--ready"); build(el);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
