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
        // io.ReadFull: ни одного байта — io.EOF, часть — io.ErrUnexpectedEOF
        var got = raw.length - pos;
        mark = [pos, raw.length]; pos = raw.length;
        snap(29, got === 0 ? "ReadFull: до конца ввода не пришло ни байта значения — ошибка io.EOF" : "ReadFull: пришло " + bytes(got) + " из " + need + " — ошибка io.ErrUnexpectedEOF");
        return finish(30, got === 0 ? "поток кончился перед значением" : "поток оборвался внутри значения", { args: null, err: null, eof: true });
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

  // Ответы Dispatch для команд без часов; тексты — как у golden (реальные). null — команду Dispatch
  // знает, но виджет её ответ не моделирует: EXPIRE/TTL зависят от часов, ZSET-команды и SAVE — вне
  // модели (без null неизвестной показалась бы команда, которую настоящий мини-Redis выполняет).
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
      case "EXPIRE": case "TTL": case "ZADD": case "ZSCORE": case "ZRANGE": case "ZRANK": case "SAVE": return null;
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

  // ===== TTL: ленивое удаление ================================================
  // Часы — целые миллисекунды: дробные секунды сценария («+0.5») округляются один раз при разборе.
  function fmtT(ms) { return (ms / 1000).toString().replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") + " с"; }

  // Больше — Duration·Second переполняет int64 у настоящего кода, и ответы расходятся; такой ввод — «не понял»
  var MAX_EXPIRE_SEC = 1000000;

  function parseScript(str) {
    var tokens = [], bad = [], capped = false;
    String(str == null ? "" : str).split(";").forEach(function (raw) {
      var t = raw.trim();
      if (!t) return;
      // лишнее не выбрасываем молча: первое отброшенное действие попадает в «не понял» с причиной
      if (tokens.length >= 14) { if (!capped) { bad.push(t + " и дальше — не больше 14 действий"); capped = true; } return; }
      // не больше трёх знаков: часы — целые миллисекунды, а у настоящего кода наносекунды, и «+0.9995» разошлось бы
      var m = /^\+(\d+(?:\.\d{1,3})?)$/.exec(t);
      if (m) { var ms = Math.round(parseFloat(m[1]) * 1000); if (ms > 0 && ms <= 3600000) tokens.push({ op: "advance", ms: ms }); else bad.push(t); return; }
      var w = t.split(/\s+/), name = w[0].toUpperCase(), a = w.slice(1);
      var ok = (name === "SET" && a.length === 2) || ((name === "GET" || name === "DEL" || name === "TTL") && a.length === 1) || (name === "EXPIRE" && a.length === 2 && /^[+-]?\d{1,7}$/.test(a[1]) && Math.abs(parseInt(a[1], 10)) <= MAX_EXPIRE_SEC);
      if (ok) tokens.push({ op: "cmd", name: name, args: a }); else bad.push(t);
    });
    return { tokens: tokens, bad: bad };
  }

  // Карты без прототипа: ключ «__proto__» или «constructor» в сценарии — обычный ключ, как в Go-map.
  function newMap() { return Object.create(null); }
  function copy(o) { var r = newMap(); for (var k in o) r[k] = o[k]; return r; }

  // Одна функция и считает, и (если передан frame) выпускает кадры: так модель и рисунок не разойдутся.
  function ttlExec(tokens, frame) {
    var st = { t: 0, data: newMap(), expire: newMap() }, results = [], log = [], pendingAdv = 0, lastLine = 0;
    function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
    // чипы — строки; «—» = переменной в этой области видимости Go нет
    function chips(o) { var r = { key: "—", v: "—", exists: "—", exp: "—", hasTTL: "—", ok: "—", sec: "—", value: "—" }; for (var k in o) r[k] = String(o[k]); return r; }
    function qv(s) { return "\"" + s + "\""; }
    function rows() {
      return Object.keys(st.data).map(function (k) {
        var e = has(st.expire, k) ? st.expire[k] : null;
        return { key: k, value: st.data[k], expireAt: e, state: e === null ? "nottl" : st.t >= e ? "stale" : "live" };
      });
    }
    var cur = { cmd: "", rep: "" }; // журнал пополняется на ПОСЛЕДНЕМ кадре команды
    function emit(line, vars, info, extra) {
      if (extra && extra.last) log.push({ cmd: cur.cmd, reply: cur.rep });
      lastLine = line;
      if (!frame) return;
      var rs = rows();
      var adv = pendingAdv ? "Прошло " + fmtT(pendingAdv) + ", часы: " + fmtT(st.t) + ". " : "";
      pendingAdv = 0;
      var s = { line: line, vars: chips(vars), info: adv + info, t: st.t, rows: rs, log: log.slice(), mem: { keys: rs.length, stale: rs.filter(function (r) { return r.state === "stale"; }).length }, bad: [] };
      if (extra && extra.hot) s.hot = true;
      frame(s);
    }
    // live: кадры по строкам листинга 2..12; чипы — только переменные live (у вызывающей функции свои, они тут вне области)
    function live(key) {
      var ex = has(st.data, key), v = ex ? st.data[key] : "";
      emit(2, { key: key, v: qv(v), exists: ex }, ex ? "v, exists := s.data[" + key + "] — ключ в data есть" : "v, exists := s.data[" + key + "] — ключа в data нет");
      emit(3, { key: key, v: qv(v), exists: ex }, ex ? "!exists — нет" : "!exists — да");
      if (!ex) { emit(4, { key: key, v: qv(v), exists: ex }, "ключа нет — вернули «нет»"); return { ok: false, v: "" }; }
      var hasT = has(st.expire, key), exp = hasT ? st.expire[key] : null, expS = exp === null ? "—" : fmtT(exp);
      emit(6, { key: key, v: qv(v), exists: ex, exp: expS, hasTTL: hasT }, hasT ? "срок: " + fmtT(exp) + ", часы: " + fmtT(st.t) : "срока у ключа нет");
      var expired = hasT && st.t >= exp;
      emit(7, { key: key, v: qv(v), exists: ex, exp: expS, hasTTL: hasT }, hasT ? (expired ? "hasTTL && !Before(exp) — да: часы " + fmtT(st.t) + " ≥ срок " + fmtT(exp) : "hasTTL && !Before(exp) — нет: срок ещё не вышел") : "hasTTL && !Before(exp) — нет: срока нет");
      if (!expired) { emit(12, { key: key, v: qv(v), exists: ex, exp: expS, hasTTL: hasT }, "ключ жив — вернули значение"); return { ok: true, v: v }; }
      delete st.data[key];
      emit(8, { key: key, v: qv(v), exists: ex, exp: expS, hasTTL: true }, "ленивое удаление: ключ убирается из data ТОЛЬКО сейчас, потому что к нему обратились", { hot: true });
      delete st.expire[key];
      emit(9, { key: key, v: qv(v), exists: ex, exp: expS, hasTTL: true }, "и из expire");
      emit(10, { key: key, v: qv(v), exists: ex, exp: expS, hasTTL: true }, "для вызывающего ключа больше нет");
      return { ok: false, v: "" };
    }
    function reply(kind, text) { return kind === "int" ? ":" + text + "\r\n" : kind === "simple" ? "+" + text + "\r\n" : kind === "nil" ? "$-1\r\n" : "$" + byteLen(text) + "\r\n" + text + "\r\n"; }

    tokens.forEach(function (tk) {
      if (tk.op === "advance") { st.t += tk.ms; pendingAdv += tk.ms; results.push({ reply: "", data: copy(st.data), expire: copy(st.expire) }); return; }
      var a = tk.args, key = a[0];
      cur.cmd = tk.name + " " + a.join(" "); cur.rep = "";
      if (tk.name === "SET") {
        st.data[key] = a[1];
        emit(16, { key: key, value: qv(a[1]) }, "s.data[" + key + "] = " + qv(a[1]));
        delete st.expire[key];
        cur.rep = reply("simple", "OK");
        emit(17, { key: key, value: qv(a[1]) }, "срок (если был) снимается: новый SET — это новое значение без TTL. Ответ: +OK", { last: true });
      } else if (tk.name === "GET") {
        emit(21, { key: key }, "GET " + key + ": вызываем live(" + key + ")");
        var g = live(key);
        cur.rep = g.ok ? reply("bulk", g.v) : reply("nil");
        emit(22, { key: key, v: qv(g.v), ok: g.ok }, g.ok ? "GET отвечает значением " + qv(g.v) : "GET отвечает «пусто» ($-1)", { last: true });
      } else if (tk.name === "EXPIRE") {
        var sec = parseInt(a[1], 10), S = String(sec);
        emit(26, { key: key, sec: S }, "EXPIRE " + key + " " + sec + ": вызываем live(" + key + ")");
        var e = live(key);
        emit(27, { key: key, sec: S, ok: e.ok }, e.ok ? "!ok — нет" : "!ok — да");
        if (!e.ok) { cur.rep = reply("int", "0"); emit(28, { key: key, sec: S, ok: false }, "ключа нет — EXPIRE отвечает 0", { last: true }); }
        else {
          emit(30, { key: key, sec: S, ok: true }, sec <= 0 ? "sec <= 0 — да" : "sec <= 0 — нет");
          cur.rep = reply("int", "1");
          if (sec <= 0) {
            delete st.data[key];
            emit(31, { key: key, sec: S, ok: true }, "ключ удаляется сразу");
            delete st.expire[key];
            emit(32, { key: key, sec: S, ok: true }, "и срок тоже");
            emit(33, { key: key, sec: S, ok: true }, "EXPIRE отвечает 1", { last: true });
          } else {
            st.expire[key] = st.t + sec * 1000;
            emit(35, { key: key, sec: S, ok: true }, "срок: часы " + fmtT(st.t) + " + " + sec + " с = " + fmtT(st.expire[key]));
            emit(36, { key: key, sec: S, ok: true }, "EXPIRE отвечает 1", { last: true });
          }
        }
      } else if (tk.name === "TTL") {
        emit(40, { key: key }, "TTL " + key + ": вызываем live(" + key + ")");
        var tl = live(key);
        emit(41, { key: key, ok: tl.ok }, tl.ok ? "!ok — нет" : "!ok — да");
        if (!tl.ok) { cur.rep = reply("int", "-2"); emit(42, { key: key, ok: false }, "ключа нет — TTL отвечает -2", { last: true }); }
        else {
          var h = has(st.expire, key), ex2 = h ? st.expire[key] : null, ex2S = h ? fmtT(ex2) : "—";
          emit(44, { key: key, ok: true, exp: ex2S, hasTTL: h }, h ? "срок: " + fmtT(ex2) : "срока нет");
          emit(45, { key: key, ok: true, exp: ex2S, hasTTL: h }, h ? "!hasTTL — нет" : "!hasTTL — да");
          if (!h) { cur.rep = reply("int", "-1"); emit(46, { key: key, ok: true, exp: ex2S, hasTTL: false }, "срока нет — TTL отвечает -1", { last: true }); }
          else { var left = Math.trunc((ex2 - st.t) / 1000); cur.rep = reply("int", String(left)); emit(48, { key: key, ok: true, exp: ex2S, hasTTL: true }, "осталось " + ((ex2 - st.t) / 1000) + " с, а мини-Redis отвечает целым: " + left + " (дробная часть отбрасывается)", { last: true }); }
        }
      } else if (tk.name === "DEL") {
        emit(52, { key: key }, "DEL " + key + ": вызываем live(" + key + ")");
        var d = live(key);
        emit(53, { key: key, ok: d.ok }, d.ok ? "!ok — нет" : "!ok — да");
        if (!d.ok) { cur.rep = reply("int", "0"); emit(54, { key: key, ok: false }, "ключа нет (или он уже просрочен) — DEL отвечает 0", { last: true }); }
        else {
          delete st.data[key];
          emit(56, { key: key, ok: true }, "delete(s.data, " + key + ")");
          delete st.expire[key];
          emit(57, { key: key, ok: true }, "delete(s.expire, " + key + ")");
          cur.rep = reply("int", "1");
          emit(58, { key: key, ok: true }, "DEL отвечает 1", { last: true });
        }
      }
      results.push({ reply: cur.rep, data: copy(st.data), expire: copy(st.expire) });
    });
    // итоговый кадр: чипы обнулены; строка — последняя выполненная (0, если команд не было)
    if (frame) {
      var rsF = rows(), stale = rsF.filter(function (r) { return r.state === "stale"; }).length;
      var advF = pendingAdv ? "Прошло " + fmtT(pendingAdv) + ", часы: " + fmtT(st.t) + ". " : "";
      frame({ line: lastLine, vars: chips({}), info: advF + "Итог: ключей в памяти: " + rsF.length + ", просрочено: " + stale + (stale === 1 ? " — он лежит, пока к нему не обратятся" : stale ? " — они лежат, пока к ним не обратятся" : ""), t: st.t, rows: rsF, log: log.slice(), mem: { keys: rsF.length, stale: stale }, bad: [], done: true });
    }
    return results;
  }
  function ttlSim(tokens) { return ttlExec(tokens, null); }

  function bTtl(tokens) {
    var steps = [];
    ttlExec(tokens, function (s) { steps.push(s); });
    return steps;
  }
  exportsForTest.parseScript = parseScript;
  exportsForTest.ttlSim = ttlSim;
  exportsForTest.bTtl = bTtl;

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
        var rep = respReply(s.res.args, { data: copy(ctx.store) }); // копия без прототипа: «__proto__» — обычный ключ, как в Go-map
        if (rep) {
          r.appendChild(H.mkEl("span", "iv-redis__rawreply", escapeWire(rep.raw)));
          r.appendChild(H.mkEl("span", "iv-redis__kind", replyTypeText(rep.kind)));
        } else r.appendChild(H.mkEl("span", "iv-redis__empty", /^(EXPIRE|TTL)$/i.test(s.res.args[0]) ? "ответ зависит от часов — смотри виджет про TTL ниже" : "ответ этой команды виджет не моделирует"));
      }
      wrap.appendChild(r);
    };
  }

  var ttlLegend = [
    { cls: "iv-redis__row--live", label: "жив, у него есть срок" },
    { cls: "iv-redis__row--nottl", label: "жив, срока нет" },
    { cls: "iv-redis__row--stale", label: "срок вышел, но лежит в памяти" }
  ];

  var TTL_STATE_WORD = { live: "жив", nottl: "жив, без срока", stale: "просрочен" };

  function ttlViz(panel) {
    var H = window.ALGO_VIZ;
    var wrap = H.mkEl("div", "iv-redis");
    panel.appendChild(wrap);
    return function (s) {
      wrap.innerHTML = "";
      // состав памяти — главное, ради чего виджет: просроченный ключ тут ещё есть
      wrap.appendChild(H.mkEl("div", "iv-redis__clock", "Часы: " + fmtT(s.t) + " · ключей в памяти: " + s.mem.keys + ", просрочено: " + s.mem.stale));
      var tbl = H.mkEl("div", "iv-redis__rows");
      tbl.appendChild(H.mkEl("div", "iv-redis__label", "Ключи в памяти (s.data и s.expire)"));
      if (!s.rows.length) tbl.appendChild(H.mkEl("span", "iv-redis__empty", "пусто"));
      s.rows.forEach(function (r) {
        var row = H.mkEl("div", "iv-redis__row iv-redis__row--" + r.state);
        row.appendChild(H.mkEl("span", "iv-redis__rkey", r.key));
        row.appendChild(H.mkEl("span", "iv-redis__rval", "\"" + r.value + "\""));
        row.appendChild(H.mkEl("span", "iv-redis__rexp", r.expireAt === null ? "срока нет" : "срок " + fmtT(r.expireAt)));
        row.appendChild(H.mkEl("span", "iv-redis__rstate", TTL_STATE_WORD[r.state]));
        tbl.appendChild(row);
      });
      wrap.appendChild(tbl);
      var lg = H.mkEl("div", "iv-redis__log");
      lg.appendChild(H.mkEl("div", "iv-redis__label", "Журнал: команда → ответ"));
      if (!s.log.length) lg.appendChild(H.mkEl("span", "iv-redis__empty", "команд ещё не было"));
      s.log.forEach(function (e) {
        var lr = H.mkEl("div", "iv-redis__logrow");
        lr.appendChild(H.mkEl("span", "iv-redis__arg", e.cmd));
        lr.appendChild(H.mkEl("span", "iv-redis__kind", "→"));
        lr.appendChild(H.mkEl("span", "iv-redis__rawreply", escapeWire(e.reply)));
        lg.appendChild(lr);
      });
      wrap.appendChild(lg);
      if (s.bad && s.bad.length) wrap.appendChild(H.mkEl("div", "iv-redis__note", "не понял: " + s.bad.join("; ")));
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
    ],
    "redis-ttl": [
      "// сокращено: без проверки числа аргументов и без блокировки mu",
      "func (s *Store) live(key string) (string, bool) {",
      "    v, exists := s.data[key]",
      "    if !exists {",
      "        return \"\", false",
      "    }",
      "    exp, hasTTL := s.expire[key]",
      "    if hasTTL && !s.now().Before(exp) {",
      "        delete(s.data, key) // ленивое удаление: только при обращении",
      "        delete(s.expire, key)",
      "        return \"\", false",
      "    }",
      "    return v, true",
      "}",
      "// SET key value",
      "func set(s *Store, key, value string) {",
      "    s.data[key] = value",
      "    delete(s.expire, key) // новый SET снимает TTL",
      "}",
      "// GET key",
      "func get(s *Store, key string) (string, bool) {",
      "    v, ok := s.live(key)",
      "    return v, ok",
      "}",
      "// EXPIRE key seconds",
      "func expire(s *Store, key string, sec int) int {",
      "    _, ok := s.live(key)",
      "    if !ok {",
      "        return 0",
      "    }",
      "    if sec <= 0 {",
      "        delete(s.data, key)",
      "        delete(s.expire, key)",
      "        return 1",
      "    }",
      "    s.expire[key] = s.now().Add(time.Duration(sec) * time.Second)",
      "    return 1",
      "}",
      "// TTL key",
      "func ttl(s *Store, key string) int64 {",
      "    _, ok := s.live(key)",
      "    if !ok {",
      "        return -2",
      "    }",
      "    exp, hasTTL := s.expire[key]",
      "    if !hasTTL {",
      "        return -1",
      "    }",
      "    return int64(exp.Sub(s.now()).Seconds()) // дробная часть отбрасывается",
      "}",
      "// DEL key",
      "func del(s *Store, key string) int {",
      "    _, ok := s.live(key)",
      "    if !ok {",
      "        return 0",
      "    }",
      "    delete(s.data, key)",
      "    delete(s.expire, key)",
      "    return 1",
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
        var store = newMap(); // без прототипа: data-store="__proto__=x" — обычный ключ
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
    },
    "redis-ttl": {
      badge: "Redis · TTL и ленивое удаление",
      desc: "Ключ с TTL не исчезает сам: мини-Redis проверяет срок только когда к ключу обращаются (GET, TTL, EXPIRE, DEL) и тогда же удаляет его. До этого просроченный ключ лежит в памяти.",
      valuesLabel: "", codeKey: "redis-ttl", fillRange: false,
      complexity: { time: "O(1) на команду", space: "O(ключей), включая просроченные", good: "★ без фонового обхода, но память занята до обращения" },
      varOrder: ["key", "v", "exists", "exp", "hasTTL", "ok", "sec", "value"],
      varDesc: { key: "Ключ", v: "Значение из data", exists: "Есть ли ключ в data", exp: "Срок ключа (часы мини-Redis)", hasTTL: "Есть ли у ключа срок", ok: "Жив ли ключ по live", sec: "Секунды для EXPIRE", value: "Новое значение SET" },
      lineNotes: { 3: "Ключа нет в data — жив быть не может", 7: "Срок вышел, когда часы ≥ срока", 8: "Ленивое удаление: только сейчас, при обращении", 17: "Новый SET снимает TTL", 22: "GET отдаёт то, что решил live", 30: "EXPIRE с нулём или минусом удаляет ключ", 35: "Срок = часы + секунды", 48: "Дробная часть секунд отбрасывается" },
      rules: [{ head: "обратились", body: "live проверяет срок и удаляет", cls: "eq" }, { head: "не трогали", body: "просроченный лежит в памяти", cls: "gt" }, { head: "TTL", body: "целые секунды, дробная часть отброшена", cls: "lt" }],
      legend: ttlLegend,
      presets: [
        { label: "просрочен, но лежит в памяти", set: { "data-script": "SET a 1; EXPIRE a 1; +5; SET b 2; DEL b" }, hint: "a просрочен, но никто не спросил" },
        { label: "SET снимает TTL", set: { "data-script": "SET a 1; EXPIRE a 2; SET a 2; +5; TTL a; GET a" }, hint: "срок пропал — ключ вечен" },
        { label: "TTL отбрасывает дробную часть", set: { "data-script": "SET a 1; EXPIRE a 3; +0.5; TTL a" }, hint: "осталось 2.5 с, ответ 2" },
        { label: "EXPIRE 0 удаляет", set: { "data-script": "SET a 1; EXPIRE a 0; GET a" }, hint: "ключ исчез сразу" },
        { label: "DEL считает только живые", set: { "data-script": "SET a 1; EXPIRE a 1; +2; DEL a; DEL a" }, hint: "первый DEL тоже 0: ключ уже просрочен" }
      ],
      parse: function (root) {
        var attr = root.getAttribute("data-script");
        var ps = parseScript(attr == null ? "SET session abc; EXPIRE session 3; +2; TTL session; +2; GET session; TTL session" : attr);
        var steps = bTtl(ps.tokens);
        steps.forEach(function (s) { s.bad = ps.bad; });
        return { tokens: ps.tokens, bad: ps.bad, steps: steps };
      },
      inputs: [{ attr: "data-script", label: "Сценарий (команды и +секунды через «;»)" }],
      values: function () { return []; },
      title: function (ctx) { var n = ctx.tokens.length; return "Сценарий: " + n + " " + core.plural(n, "действие", "действия", "действий"); },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Часы", "В памяти"],
      sumValues: function (s) { return [{ text: fmtT(s.t) }, { text: s.mem.keys, cls: s.mem.stale ? "lt" : "gt" }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Готово", text: s.info }; return { kind: "info", hot: !!s.hot, icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "часы: " + fmtT(s.t), b: "просрочено: " + s.mem.stale, c: "", cls: s.mem.stale ? "lt" : "gt" }; },
      varsOf: function (s) { var r = {}; for (var k in s.vars) r[k] = s.vars[k]; return r; },
      customViz: ttlViz
    }
  };
  Object.keys(INFRA).forEach(function (t) { window.ALGO_VIZ.register(t, INFRA[t], CODE[INFRA[t].codeKey]); });
})();
