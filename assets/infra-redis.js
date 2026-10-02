/* Инфраструктурные виджеты темы Redis. Регистрируются в движке через window.ALGO_VIZ.register.
 * Модель сверяется с настоящим кодом мини-Redis через golden (scripts/fixtures/redis-golden.json,
 * генерируется exercises/miniredis/golden_solution_test.go:
 * go test -tags solution -run TestGolden -count=1 ./miniredis/ -update). Генераторы — чистые функции. */
(function () {
  "use strict";
  var exportsForTest = {};
  if (typeof module !== "undefined" && module.exports) module.exports = exportsForTest;
  var core = (typeof module !== "undefined" && module.exports) ? require("./infra-core.js") : window.ALGO_VIZ_INFRA;

  var MAX_MULTIBULK = 1048576, MAX_BULK = 536870912;

  // Ввод в атрибуте — с видимыми escape-последовательностями. Разбор идёт по ASCII (parse() заменяет
  // остальное на «?»), а длины в ответах и в encodeCommand — БАЙТЫ UTF-8: Go считает len(string)
  // в байтах, и настоящий Dispatch(PING привет) отвечает «$12», а не «$6» (так сняло golden).
  function byteLen(s) { return unescape(encodeURIComponent(s)).length; }
  function unescapeWire(s) { return String(s == null ? "" : s).replace(/\\(r|n|t|\\)/g, function (_, c) { return c === "r" ? "\r" : c === "n" ? "\n" : c === "t" ? "\t" : "\\"; }); }
  function escapeWire(s) { return String(s).replace(/\\/g, "\\\\").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t"); }
  function encodeCommand(args) { return "*" + args.length + "\r\n" + args.map(function (a) { return "$" + byteLen(a) + "\r\n" + a + "\r\n"; }).join(""); }
  function atoi(s) { return /^[+-]?\d+$/.test(s) ? parseInt(s, 10) : NaN; } // как strconv.Atoi: знак и десятичные цифры
  function chars(n) { return n + " " + core.plural(n, "символ", "символа", "символов"); }
  function bytes(n) { return n + " " + core.plural(n, "байт", "байта", "байт"); }
  function q(s) { return "\"" + escapeWire(s) + "\""; }

  // bufio.Reader.ReadString('\n') + TrimRight(line, "\r\n"): нет \n — отдаёт остаток вместе с EOF
  function readLineAt(raw, pos) {
    var i = raw.indexOf("\n", pos);
    if (i < 0) return { eof: true, end: raw.length, line: "" };
    return { eof: false, end: i + 1, line: raw.slice(pos, i + 1).replace(/[\r\n]+$/, "") };
  }

  function bRespParse(raw) {
    var steps = [], pos = 0, args = [], mark = null;
    var V = { line: "—", n: "—", i: "—", hdr: "—", blen: "—" };
    function snap(line, info, extra) {
      var s = { line: line, vars: { line: V.line, n: V.n, i: V.i, hdr: V.hdr, blen: V.blen }, info: info, raw: raw, pos: pos, mark: mark ? mark.slice() : null, args: args.slice(), res: null };
      for (var k in extra) s[k] = extra[k];
      steps.push(s);
    }
    function finish(line, info, res, hot) {
      V = { line: "—", n: "—", i: "—", hdr: "—", blen: "—" };
      res.consumed = pos;
      snap(line, "Итог: " + info, { done: true, hot: !!hot, res: res });
      return steps;
    }
    var rl = readLineAt(raw, pos);
    mark = [pos, rl.end]; pos = rl.end;
    V.line = q(rl.line);
    snap(1, rl.eof ? "readLine: до конца ввода нет «\\n» — ReadString отдаёт всё, что было, и ошибку EOF" : "readLine: строка " + q(rl.line) + " (завершающие \\r\\n отброшены)");
    snap(2, rl.eof ? "err != nil — да" : "err != nil — нет");
    if (rl.eof) return finish(3, "поток кончился (клиент закрыл соединение или не дописал). Если клиент просто ещё не дописал, сервер ждал бы байт дальше — EOF только когда соединение закрыто.", { args: null, err: null, eof: true });
    snap(5, rl.line.length === 0 ? "len(line) == 0 — да" : "len(line) == 0 — нет");
    if (rl.line.length === 0) return finish(6, "пустая строка — не команда: ReadCommand возвращает nil, сервер ничего не отвечает", { args: null, err: null, eof: false });
    var inline = rl.line.charAt(0) !== "*";
    snap(8, inline ? "line[0] != '*' — да: это inline-формат" : "line[0] != '*' — нет: это RESP-массив");
    if (inline) {
      var fields = rl.line.split(/\s+/).filter(Boolean);
      return finish(9, "inline: аргументы по пробелам — " + (fields.length ? fields.map(q).join(", ") : "их нет"), { args: fields, err: null, eof: false });
    }
    var n = atoi(rl.line.slice(1));
    V.n = String(isNaN(n) ? 0 : n);
    snap(11, isNaN(n) ? "Atoi(" + q(rl.line.slice(1)) + ") — ошибка, n = 0" : "n = " + n + ": клиент обещает " + n + " " + core.plural(n, "аргумент", "аргумента", "аргументов"));
    var badN = isNaN(n) || n < 0 || n > MAX_MULTIBULK;
    snap(12, badN ? "ошибка или n вне допустимого — да" : "ошибка или n вне допустимого — нет");
    if (badN) return finish(13, "битый заголовок массива — протокольная ошибка, соединение закроют", { args: null, err: "header", eof: false });
    snap(15, "args := make([]string, 0, " + n + ")");
    for (var i = 0; i < n; i++) {
      // hdr и blen в Go объявлены внутри тела цикла: на заголовке for их ещё нет (прошлого круга тоже)
      V.hdr = "—"; V.blen = "—";
      V.i = String(i);
      snap(16, "i = " + i + ": читаем аргумент " + (i + 1) + " из " + n);
      var hl = readLineAt(raw, pos);
      mark = [pos, hl.end]; pos = hl.end;
      V.hdr = q(hl.line);
      snap(17, hl.eof ? "readLine: нет «\\n» — EOF" : "hdr = " + q(hl.line));
      snap(18, hl.eof ? "err != nil — да" : "err != nil — нет");
      if (hl.eof) return finish(19, "поток кончился на заголовке аргумента", { args: null, err: null, eof: true });
      var noDollar = hl.line.length === 0 || hl.line.charAt(0) !== "$";
      snap(21, noDollar ? "len(hdr) == 0 || hdr[0] != '$' — да" : "len(hdr) == 0 || hdr[0] != '$' — нет");
      if (noDollar) return finish(22, "ожидали «$длина», пришло " + q(hl.line), { args: null, err: "expect", eof: false });
      var bl = atoi(hl.line.slice(1));
      V.blen = String(isNaN(bl) ? 0 : bl);
      snap(24, isNaN(bl) ? "Atoi(" + q(hl.line.slice(1)) + ") — ошибка, blen = 0" : "blen = " + bl + ": дальше ровно " + bytes(bl) + " данных и \\r\\n");
      var badB = isNaN(bl) || bl < 0 || bl > MAX_BULK;
      snap(25, badB ? "ошибка или blen вне допустимого — да" : "ошибка или blen вне допустимого — нет");
      if (badB) return finish(26, "недопустимая длина строки " + q(hl.line), { args: null, err: "bulk", eof: false });
      snap(28, "buf := make([]byte, " + (bl + 2) + "): " + bytes(bl) + " данных + 2 на \\r\\n");
      var need = bl + 2;
      if (raw.length - pos < need) {
        mark = [pos, raw.length]; pos = raw.length;
        snap(29, "ReadFull: байт не хватило — ошибка (io.ErrUnexpectedEOF)");
        return finish(30, "поток оборвался внутри значения", { args: null, err: null, eof: true });
      }
      var value = raw.substr(pos, bl), tail = raw.substr(pos + bl, 2);
      mark = [pos, pos + need]; pos += need;
      var odd = tail !== "\r\n";
      snap(29, "ReadFull прочитал " + bytes(need) + ": данные " + q(value) + " и ещё два байта" + (odd ? " " + q(tail) + ", а не \\r\\n — Go их НЕ проверяет, просто отбрасывает" : " (\\r\\n)"), { hot: odd });
      args.push(value);
      snap(32, "args[" + i + "] = " + q(value) + " (\\r\\n внутри значения — это данные, а не конец: длину задал клиент)");
    }
    return finish(34, args.length ? "аргументы: " + args.map(q).join(", ") + (pos < raw.length ? ". Остаток (" + chars(raw.length - pos) + ") не тронут — это следующая команда конвейера" : "") : "пустой массив", { args: args.slice(), err: null, eof: false });
  }
  function respParse(raw) {
    var st = bRespParse(raw), r = st[st.length - 1].res;
    return { args: r.args, err: r.err, eof: r.eof, consumed: r.consumed };
  }

  // Ответы Dispatch для команд без часов; тексты — как у golden (реальные).
  function respReply(args, store) {
    function simple(s) { return { kind: "simple", raw: "+" + s + "\r\n" }; }
    function err(s) { return { kind: "error", raw: "-" + s + "\r\n" }; }
    function int(n) { return { kind: "integer", raw: ":" + n + "\r\n" }; }
    function bulk(s) { return { kind: "bulk", raw: "$" + byteLen(s) + "\r\n" + s + "\r\n" }; }
    if (!args || !args.length) return err("ERR empty command");
    var name = String(args[0]).toUpperCase(), a = args.slice(1);
    function arity(n) { return err("ERR wrong number of arguments for '" + n + "' command"); }
    var has = function (k) { return Object.prototype.hasOwnProperty.call(store.data, k); };
    switch (name) {
      case "PING": return a.length === 0 ? simple("PONG") : a.length === 1 ? bulk(a[0]) : arity("ping");
      case "ECHO": return a.length === 1 ? bulk(a[0]) : arity("echo");
      case "SET": if (a.length !== 2) return arity("set"); store.data[a[0]] = a[1]; return simple("OK");
      case "GET": if (a.length !== 1) return arity("get"); return has(a[0]) ? bulk(store.data[a[0]]) : { kind: "nil", raw: "$-1\r\n" };
      case "DEL": if (a.length === 0) return arity("del"); var n = 0; a.forEach(function (k) { if (has(k)) { delete store.data[k]; n++; } }); return int(n);
      case "EXPIRE": case "TTL": return null;
      default: return err("ERR unknown command '" + args[0] + "'");
    }
  }
  exportsForTest.unescapeWire = unescapeWire;
  exportsForTest.escapeWire = escapeWire;
  exportsForTest.encodeCommand = encodeCommand;
  exportsForTest.bRespParse = bRespParse;
  exportsForTest.respParse = respParse;
  exportsForTest.respReply = respReply;
  exportsForTest.chars = chars;

  if (typeof window === "undefined" || !window.ALGO_VIZ) return;

  var respLegend = [
    { cls: "iv-redis__ch--eaten", label: "уже прочитано" },
    { cls: "iv-redis__ch--cur", label: "читается этим шагом" },
    { cls: "iv-redis__ch--ctl", label: "служебные байты \\r \\n" },
    { cls: "iv-redis__ch--rest", label: "ещё не читалось" }
  ];

  function replyTypeText(kind) {
    return { simple: "простая строка (+)", error: "ошибка (−)", integer: "целое число (:)", bulk: "bulk-строка ($длина)", nil: "«пусто» ($-1)" }[kind] || kind;
  }

  function respViz(panel, ctx) {
    var H = window.ALGO_VIZ;
    var wrap = H.mkEl("div", "iv-redis");
    panel.appendChild(wrap);
    return function (s) {
      wrap.innerHTML = "";
      var w = H.mkEl("div", "iv-redis__wire");
      w.appendChild(H.mkEl("div", "iv-redis__label", "Байты запроса (клиент → сервер)"));
      var strip = H.mkEl("div", "iv-redis__strip");
      for (var i = 0; i < s.raw.length; i++) {
        var c = s.raw.charAt(i), shown = c === "\r" ? "␍" : c === "\n" ? "␊" : c === "\t" ? "⇥" : c === " " ? "·" : c;
        var cls = "iv-redis__ch" + (i < s.pos ? " iv-redis__ch--eaten" : " iv-redis__ch--rest") + (c === "\r" || c === "\n" ? " iv-redis__ch--ctl" : "") + (s.mark && i >= s.mark[0] && i < s.mark[1] ? " iv-redis__ch--cur" : "");
        strip.appendChild(H.mkEl("span", cls, shown));
        if (c === "\n") strip.appendChild(H.mkEl("span", "iv-redis__br", ""));
      }
      if (!s.raw.length) strip.appendChild(H.mkEl("span", "iv-redis__empty", "пусто"));
      w.appendChild(strip);
      wrap.appendChild(w);
      var a = H.mkEl("div", "iv-redis__args");
      a.appendChild(H.mkEl("div", "iv-redis__label", "Аргументы команды"));
      var shownArgs = s.done ? (s.res.args || []) : s.args;
      if (!shownArgs.length) a.appendChild(H.mkEl("span", "iv-redis__empty", s.done && s.res.args === null ? "нет (nil)" : "пока нет"));
      shownArgs.forEach(function (v) { a.appendChild(H.mkEl("span", "iv-redis__arg", "\"" + escapeWire(v) + "\"")); });
      wrap.appendChild(a);
      var r = H.mkEl("div", "iv-redis__reply");
      r.appendChild(H.mkEl("div", "iv-redis__label", "Ответ сервера (Dispatch → WriteTo)"));
      if (!s.done) r.appendChild(H.mkEl("span", "iv-redis__empty", "появится после разбора"));
      else if (s.res.err) r.appendChild(H.mkEl("span", "iv-redis__empty", "протокольная ошибка — ответа нет, сервер закрывает соединение"));
      else if (s.res.eof) r.appendChild(H.mkEl("span", "iv-redis__empty", "команда не дочитана — ответа нет"));
      else if (!s.res.args || !s.res.args.length) r.appendChild(H.mkEl("span", "iv-redis__empty", "пустая команда — ответа нет"));
      else {
        var rep = respReply(s.res.args, { data: Object.assign({}, ctx.store) });
        if (rep) {
          r.appendChild(H.mkEl("span", "iv-redis__rawreply", escapeWire(rep.raw)));
          r.appendChild(H.mkEl("span", "iv-redis__kind", replyTypeText(rep.kind)));
        } else r.appendChild(H.mkEl("span", "iv-redis__empty", "ответ зависит от часов — смотри виджет про TTL ниже"));
      }
      wrap.appendChild(r);
    };
  }

  var CODE = {
    "redis-resp": [
      "func ReadCommand(r *bufio.Reader) ([]string, error) {",
      "    line, err := readLine(r) // читаем до \\n, \\r\\n отбрасываем",
      "    if err != nil {",
      "        return nil, err // поток кончился: ждать больше нечего",
      "    }",
      "    if len(line) == 0 {",
      "        return nil, nil // пустая строка — не команда",
      "    }",
      "    if line[0] != '*' {",
      "        return strings.Fields(line), nil // inline: «PING», «SET foo bar»",
      "    }",
      "    n, err := strconv.Atoi(line[1:]) // «*3» — три аргумента",
      "    if err != nil || n < 0 || n > maxMultibulkLen {",
      "        return nil, errBadHeader // «*x», «*-1», слишком длинный",
      "    }",
      "    args := make([]string, 0, n)",
      "    for i := 0; i < n; i++ {",
      "        hdr, err := readLine(r) // «$3» — дальше ровно 3 байта",
      "        if err != nil {",
      "            return nil, err",
      "        }",
      "        if len(hdr) == 0 || hdr[0] != '$' {",
      "            return nil, errExpectBulk // ожидали «$…»",
      "        }",
      "        blen, err := strconv.Atoi(hdr[1:])",
      "        if err != nil || blen < 0 || blen > maxBulkLen {",
      "            return nil, errBadBulk // «$x», «$-1», слишком длинный",
      "        }",
      "        buf := make([]byte, blen+2) // +2 на завершающий \\r\\n",
      "        if _, err := io.ReadFull(r, buf); err != nil {",
      "            return nil, err // обрыв внутри строки",
      "        }",
      "        args = append(args, string(buf[:blen]))",
      "    }",
      "    return args, nil",
      "}"
    ]
  };

  var INFRA = {
    "redis-resp": {
      badge: "Redis · разбор запроса (RESP)",
      desc: "ReadCommand читает запрос байт за байтом: сначала строка-заголовок («*3» — три аргумента), потом для каждого аргумента «$длина» и ровно столько байт. Длину задаёт клиент, поэтому \\r\\n внутри значения — просто данные.",
      valuesLabel: "", codeKey: "redis-resp", fillRange: false,
      complexity: { time: "O(байт запроса)", space: "O(байт запроса)", good: "★ по длине, без поиска разделителей" },
      varOrder: ["line", "n", "i", "hdr", "blen"],
      varDesc: { line: "Первая строка запроса", n: "Сколько аргументов обещано", i: "Номер аргумента", hdr: "Заголовок аргумента", blen: "Длина данных" },
      lineNotes: { 1: "Читаем до \\n, \\r\\n отбрасываем", 5: "Пустая строка — не команда", 8: "Не «*» — значит inline: просто слова через пробел", 11: "«*3» — клиент обещает три аргумента", 17: "«$3» — дальше ровно три байта данных", 28: "+2 — завершающий \\r\\n после данных", 29: "Читаем ровно blen+2 байт; последние два Go не проверяет", 32: "Значение может содержать \\r\\n — длину знаем заранее" },
      rules: [{ head: "длина", body: "задаёт клиент", cls: "eq" }, { head: "значение", body: "любые байты, даже \\r\\n", cls: "gt" }, { head: "остаток", body: "ждёт следующего чтения", cls: "lt" }],
      legend: respLegend,
      presets: [
        { label: "GET существующего ключа", set: { "data-wire": "*2\\r\\n$3\\r\\nGET\\r\\n$3\\r\\nfoo\\r\\n", "data-store": "foo=bar" }, hint: "ответ — bulk-строка" },
        { label: "inline: просто PING", set: { "data-wire": "PING\\r\\n", "data-store": "" }, hint: "так пишет nc" },
        { label: "в значении есть \\r\\n", set: { "data-wire": "*3\\r\\n$3\\r\\nSET\\r\\n$1\\r\\nk\\r\\n$4\\r\\na\\r\\nb\\r\\n", "data-store": "" }, hint: "длина важнее разделителя" },
        { label: "две команды подряд", set: { "data-wire": "*1\\r\\n$4\\r\\nPING\\r\\n*1\\r\\n$4\\r\\nPING\\r\\n", "data-store": "" }, hint: "остаток не тронут" },
        { label: "клиент не дописал", set: { "data-wire": "*2\\r\\n$3\\r\\nGET\\r\\n$3\\r\\nfo", "data-store": "" }, hint: "ReadFull ждёт ещё байты" },
        { label: "битый заголовок", set: { "data-wire": "*x\\r\\n", "data-store": "" }, hint: "ошибка протокола" }
      ],
      parse: function (root) {
        var wAttr = root.getAttribute("data-wire"), sAttr = root.getAttribute("data-store");
        var raw = unescapeWire(wAttr == null ? "*3\\r\\n$3\\r\\nSET\\r\\n$3\\r\\nfoo\\r\\n$3\\r\\nbar\\r\\n" : wAttr).replace(/[^\x00-\x7f]/g, "?").slice(0, 300);
        var store = {};
        String(sAttr == null ? "foo=bar" : sAttr).split(",").forEach(function (p) { var i = p.indexOf("="); if (i > 0) store[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
        return { raw: raw, store: store, steps: bRespParse(raw) };
      },
      inputs: [{ attr: "data-wire", label: "Байты запроса (\\r \\n — escape-последовательностями)" }, { attr: "data-store", label: "Ключи в базе (k=v,k2=v2)" }],
      values: function () { return []; },
      title: function (ctx) { return "Разбор запроса: " + chars(ctx.raw.length) + " на проводе"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Съедено", "Всего"],
      sumValues: function (s) { return [{ text: s.pos, cls: "gt" }, { text: s.raw.length }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Готово", text: s.info }; return { kind: "info", hot: !!s.hot, icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "съедено " + s.pos, b: "аргументов " + s.args.length, c: "", cls: "gt" }; },
      varsOf: function (s) { return { line: s.vars.line, n: s.vars.n, i: s.vars.i, hdr: s.vars.hdr, blen: s.vars.blen }; },
      customViz: respViz
    }
  };
  Object.keys(INFRA).forEach(function (t) { window.ALGO_VIZ.register(t, INFRA[t], CODE[INFRA[t].codeKey]); });
})();
