/*
 * race.js — «гонка на большом входе»: <div class="algo-race" data-race="КЛЮЧ"></div>.
 *
 * Пошаговый виджет показывает 6 элементов, и на них перебор отстаёт от оптимума в разы, а не в сотни
 * раз. Гонка берёт тот же код, что листинги пары виджетов главы, и гоняет обе версии на одном
 * случайном входе из сотен и тысяч элементов, считая их операции: полосы в общем масштабе, счётчики,
 * таблица по размерам — видно, что разрыв растёт с n. Шагов нет: смысл в числах, а не в кадрах.
 *
 * Вход — от зерна (номер размера), поэтому у всех читателей и в проверке те же числа. Ответы обеих
 * версий сверяются: гонка, в которой «быстрый» ответил иначе, — ошибка, а не победа.
 * RACES отдаётся в node (scripts/race-check.js).
 */
(function () {
  // mulberry32: маленький генератор с зерном, вход повторяется от запуска к запуску
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randInt(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }

  var RACES = {
    // sliding-window: minSubArrayNaive против minSubArrayLen; операция — сложение или вычитание в sum
    "min-subarray": {
      title: "Самый короткий подмассив с суммой ≥ target",
      unit: "сложения и вычитания",
      sizes: [100, 1000, 10000],
      naive: "minSubArrayNaive — от каждого i заново", fast: "minSubArrayLen — окно",
      gen: function (n, r) {
        var nums = [];
        for (var i = 0; i < n; i++) nums.push(randInt(r, 1, 10));
        return { nums: nums, target: Math.round(5.5 * n / 4) }; // окно-ответ ≈ четверть входа
      },
      describe: function (inp) { return inp.nums.length + " чисел от 1 до 10, target = " + inp.target; },
      runNaive: function (inp) {
        var nums = inp.nums, n = nums.length, best = n + 1, ops = 0;
        for (var i = 0; i < n; i++) {
          var sum = 0;
          for (var j = i; j < n; j++) {
            sum += nums[j]; ops++;
            if (sum >= inp.target) { if (j - i + 1 < best) best = j - i + 1; break; }
          }
        }
        return { answer: best === n + 1 ? 0 : best, ops: ops };
      },
      runFast: function (inp) {
        var nums = inp.nums, n = nums.length, left = 0, sum = 0, best = n + 1, ops = 0;
        for (var right = 0; right < n; right++) {
          sum += nums[right]; ops++;
          while (sum >= inp.target) {
            if (right - left + 1 < best) best = right - left + 1;
            sum -= nums[left]; ops++;
            left++;
          }
        }
        return { answer: best === n + 1 ? 0 : best, ops: ops };
      },
      show: function (a) { return "длина " + num(a); }
    },

    // two-pointers: threeSumNaive против threeSum; операция — проверка суммы тройки (у оптимума ещё
    // сравнения сортировки — sort.Ints тоже работа)
    "three-sum": {
      title: "Все тройки с нулевой суммой (3Sum)",
      unit: "проверки сумм и сравнения сортировки",
      sizes: [50, 200, 800],
      naive: "threeSumNaive — все тройки", fast: "threeSum — сортировка и два указателя",
      gen: function (n, r) {
        var nums = [];
        for (var i = 0; i < n; i++) nums.push(randInt(r, -n, n));
        return { nums: nums };
      },
      describe: function (inp) { var n = inp.nums.length; return n + " чисел от −" + n + " до " + n; },
      runNaive: function (inp) {
        var nums = inp.nums, n = nums.length, seen = {}, count = 0, ops = 0;
        for (var i = 0; i < n; i++) {
          for (var j = i + 1; j < n; j++) {
            for (var k = j + 1; k < n; k++) {
              ops++;
              if (nums[i] + nums[j] + nums[k] === 0) {
                var key = [nums[i], nums[j], nums[k]].sort(function (x, y) { return x - y; }).join(",");
                if (!seen[key]) { seen[key] = true; count++; } // отсев дублей через set
              }
            }
          }
        }
        return { answer: count, ops: ops };
      },
      runFast: function (inp) {
        var ops = 0;
        var nums = inp.nums.slice().sort(function (x, y) { ops++; return x - y; });
        var count = 0;
        for (var i = 0; i < nums.length - 2; i++) {
          if (i > 0 && nums[i] === nums[i - 1]) continue;
          var left = i + 1, right = nums.length - 1;
          while (left < right) {
            var sum = nums[i] + nums[left] + nums[right]; ops++;
            if (sum === 0) {
              count++; left++; right--;
              while (left < right && nums[left] === nums[left - 1]) left++;
              while (left < right && nums[right] === nums[right + 1]) right--;
            } else if (sum < 0) left++;
            else right--;
          }
        }
        return { answer: count, ops: ops };
      },
      show: function (a) { return num(a) + " " + plural(a, "тройка", "тройки", "троек"); }
    },

    // greedy: canJumpDP против canJump; операция — шаг внутреннего цикла пометок / шаг прохода
    "jump-game": {
      title: "Jump Game: допрыгнем до конца?",
      unit: "шаги циклов",
      sizes: [100, 1000, 10000],
      naive: "canJumpDP — флаги достижимости", fast: "canJump — один проход с maxReach",
      gen: function (n, r) {
        var nums = [];
        for (var i = 0; i < n; i++) nums.push(randInt(r, Math.ceil(n / 8), Math.ceil(n / 3))); // длинные прыжки
        return { nums: nums };
      },
      describe: function (inp) { var n = inp.nums.length; return n + " клеток, прыжки от " + Math.ceil(n / 8) + " до " + Math.ceil(n / 3); },
      runNaive: function (inp) {
        var nums = inp.nums, n = nums.length, reachable = new Array(n).fill(false), ops = 0;
        reachable[0] = true;
        for (var i = 0; i < n; i++) {
          ops++;
          if (!reachable[i]) continue;
          for (var step = 1; step <= nums[i] && i + step < n; step++) { reachable[i + step] = true; ops++; }
        }
        return { answer: reachable[n - 1], ops: ops };
      },
      runFast: function (inp) {
        var nums = inp.nums, maxReach = 0, ops = 0;
        for (var i = 0; i < nums.length; i++) {
          ops++;
          if (i > maxReach) return { answer: false, ops: ops };
          if (i + nums[i] > maxReach) maxReach = i + nums[i];
        }
        return { answer: true, ops: ops };
      },
      show: function (a) { return a ? "да" : "нет"; }
    },

    // tree-dfs: diameterNaive против diameterOfTree; операция — вызов height на узле (nil не в счёт)
    "diameter": {
      title: "Диаметр двоичного дерева",
      unit: "посещения узлов",
      sizes: [100, 1000, 3000],
      naive: "diameterNaive — высоты заново у каждого узла", fast: "diameterOfTree — высота и ответ за один обход",
      // длинная «ветка» с короткими отростками: так выглядит худший случай перебора
      gen: function (n, r) {
        var nodes = [{ l: null, r: null }], spine = 0;
        while (nodes.length < n) {
          var id = nodes.length;
          nodes.push({ l: null, r: null });
          if (r() < 0.8 || nodes[spine].l) { // продолжаем ветку
            if (nodes[spine].l) nodes[spine].r = id; else nodes[spine].l = id;
            spine = id;
          } else {
            nodes[spine].l = id; // отросток-лист; ветка пойдёт вправо
          }
        }
        return { nodes: nodes };
      },
      describe: function (inp) {
        var nodes = inp.nodes, depth = 0;
        (function walk(i, d) { if (i === null) return; if (d > depth) depth = d; walk(nodes[i].l, d + 1); walk(nodes[i].r, d + 1); })(0, 1);
        return nodes.length + " узлов, высота " + depth + " — почти цепочка";
      },
      runNaive: function (inp) {
        var nodes = inp.nodes, ops = 0;
        function height(i) { if (i === null) return 0; ops++; return 1 + Math.max(height(nodes[i].l), height(nodes[i].r)); }
        function diameter(i) {
          if (i === null) return 0;
          var through = height(nodes[i].l) + height(nodes[i].r);
          return Math.max(through, Math.max(diameter(nodes[i].l), diameter(nodes[i].r)));
        }
        return { answer: diameter(0), ops: ops };
      },
      runFast: function (inp) {
        var nodes = inp.nodes, best = 0, ops = 0;
        function height(i) {
          if (i === null) return 0;
          ops++;
          var l = height(nodes[i].l), r = height(nodes[i].r);
          if (l + r > best) best = l + r;
          return 1 + Math.max(l, r);
        }
        height(0);
        return { answer: best, ops: ops };
      },
      show: function (a) { return num(a) + " " + plural(a, "ребро", "ребра", "рёбер"); }
    }
  };

  function num(x) { return Math.round(x).toLocaleString("ru-RU"); }
  function plural(n, one, few, many) {
    var d = n % 10, h = n % 100;
    return d === 1 && h !== 11 ? one : d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
  }

  // один прогон пары: вход от зерна размера, обе версии, сверка ответов
  function runRace(key, n) {
    var race = RACES[key];
    var inp = race.gen(n, rng(0x5eed + n));
    var a = race.runNaive(inp), b = race.runFast(inp);
    return { n: n, input: race.describe(inp), naive: a, fast: b, same: a.answer === b.answer };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { RACES: RACES, runRace: runRace };
  if (typeof window === "undefined" || typeof document === "undefined") return;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var fmt = num;
  function times(a, b) {
    var k = a / Math.max(1, b);
    return k >= 10 ? fmt(k) : k.toFixed(1).replace(".", ",");
  }
  function timesWord(a, b) {
    var t = times(a, b), k = Math.round(a / Math.max(1, b));
    return t + " " + (/,/.test(t) ? "раза" : plural(k, "раз", "раза", "раз"));
  }
  // «как долго в Go»: порядок величины, перебор в Go делает около миллиарда простых операций в секунду
  function goTime(ops) {
    var s = ops / 1e9;
    if (s >= 1) return s.toFixed(1).replace(".", ",") + " с";
    if (s >= 1e-3) return (s * 1e3).toFixed(1).replace(".", ",") + " мс";
    return (s * 1e6).toFixed(1).replace(".", ",") + " мкс";
  }

  function build(host) {
    var key = host.getAttribute("data-race");
    var race = RACES[key];
    if (host.classList.contains("rc")) return; // второй init (повторный DOMContentLoaded) стёр бы итог
    host.innerHTML = "";
    host.classList.add("rc");
    if (!race) { host.appendChild(el("p", "rc-err", "Гонка «" + key + "» не найдена.")); return; }

    var head = el("div", "rc-head");
    head.appendChild(el("span", "rc-badge", "🏁 На большом входе"));
    head.appendChild(el("span", "rc-title", race.title));
    host.appendChild(head);

    var bar = el("div", "rc-bar");
    bar.appendChild(el("span", "rc-bar__l", "n ="));
    var size = race.sizes[1];
    var sizeBtns = race.sizes.map(function (n) {
      var b = el("button", "rc-size", fmt(n));
      b.type = "button";
      b.setAttribute("aria-pressed", String(n === size));
      b.onclick = function () {
        size = n;
        sizeBtns.forEach(function (x, i) { x.setAttribute("aria-pressed", String(race.sizes[i] === n)); });
      };
      bar.appendChild(b);
      return b;
    });
    var go = el("button", "rc-go", "▶ Запустить");
    go.type = "button";
    bar.appendChild(go);
    host.appendChild(bar);

    var input = el("div", "rc-input", "Выбери n и запусти: обе версии получат один и тот же случайный вход.");
    host.appendChild(input);

    function lane(cls, name) {
      var row = el("div", "rc-lane rc-lane--" + cls);
      row.appendChild(el("div", "rc-lane__name", name));
      var track = el("div", "rc-track");
      var fill = el("div", "rc-fill");
      track.appendChild(fill);
      row.appendChild(track);
      var num = el("div", "rc-num", "—");
      row.appendChild(num);
      host.appendChild(row);
      return { fill: fill, num: num, row: row };
    }
    var ln = lane("naive", "Перебор: " + race.naive);
    var lf = lane("fast", "Оптимум: " + race.fast);
    host.appendChild(el("div", "rc-unit", "Полосы в одном масштабе: длина — сделанная работа, считаем " + race.unit + "."));
    var verdict = el("div", "rc-verdict");
    verdict.setAttribute("aria-live", "polite");
    host.appendChild(verdict);

    var table = el("table", "rc-table");
    table.innerHTML = "<thead><tr><th>n</th><th>перебор</th><th>оптимум</th><th>разница</th></tr></thead>";
    var tbody = el("tbody");
    table.appendChild(tbody);
    table.hidden = true;
    host.appendChild(table);
    var history = {};

    var anim = 0;
    function paint(res, t) {
      var max = Math.max(res.naive.ops, res.fast.ops);
      // одна скорость у обеих: за время t сделано t·max операций, но не больше своих
      var dn = Math.min(res.naive.ops, t * max), df = Math.min(res.fast.ops, t * max);
      ln.fill.style.width = (100 * dn / max) + "%";
      lf.fill.style.width = (100 * df / max) + "%";
      ln.num.textContent = fmt(dn);
      lf.num.textContent = fmt(df);
      lf.row.classList.toggle("rc-lane--done", df >= res.fast.ops);
      ln.row.classList.toggle("rc-lane--done", dn >= res.naive.ops);
    }
    function finish(res) {
      paint(res, 1);
      go.disabled = false;
      verdict.innerHTML = "";
      if (!res.same) {
        verdict.appendChild(el("b", "rc-bad", "Ответы разошлись: " + race.show(res.naive.answer) + " против " + race.show(res.fast.answer) + "."));
        return;
      }
      verdict.appendChild(el("b", null, "Перебор сделал в " + timesWord(res.naive.ops, res.fast.ops) + " больше работы."));
      verdict.appendChild(document.createTextNode(" Ответ у обоих один: " + race.show(res.fast.answer) + ". "));
      verdict.appendChild(el("span", "rc-muted", "В Go (около миллиарда простых операций в секунду): " + goTime(res.naive.ops) + " против " + goTime(res.fast.ops) + "."));
      history[res.n] = res;
      tbody.innerHTML = "";
      Object.keys(history).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
        var h = history[n], tr = el("tr");
        [fmt(n), fmt(h.naive.ops), fmt(h.fast.ops), "×" + times(h.naive.ops, h.fast.ops)].forEach(function (c) { tr.appendChild(el("td", null, c)); });
        tbody.appendChild(tr);
      });
      table.hidden = false;
      host.__race = { last: res, history: history };
    }

    go.onclick = function () {
      if (anim) cancelAnimationFrame(anim);
      go.disabled = true;
      verdict.textContent = "Считаю…";
      // сам счёт синхронный (до долей секунды на больших n) — сначала даём отрисовать «Считаю…»
      setTimeout(function () {
        var res = runRace(key, size);
        input.textContent = "Вход: " + res.input + ".";
        var still = !window.requestAnimationFrame || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        if (still) return finish(res);
        verdict.textContent = "";
        var start = 0, DUR = 2600; // перебор доезжает за 2,6 с, оптимум — во столько раз быстрее, во сколько меньше работы
        anim = requestAnimationFrame(function step(ts) {
          if (!start) start = ts;
          var t = Math.min(1, (ts - start) / DUR);
          paint(res, t);
          if (t < 1) anim = requestAnimationFrame(step); else { anim = 0; finish(res); }
        });
      }, 30);
    };
  }

  function init() { Array.prototype.forEach.call(document.querySelectorAll(".algo-race"), build); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
