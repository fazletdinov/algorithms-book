/*
 * srs.js — интервальные повторения: что повторить сегодня и когда следующий раз.
 *
 * Контейнер: <div class="algo-today"></div> (страница «Повторение», review.md).
 * Движок работает на КАЖДОЙ странице книги: при загрузке заводит недостающие карточки
 * (sync) и ставит в верхнюю панель счётчик «🔁 Сегодня: N». Виджет очереди — только на
 * странице «Повторение».
 *
 * Зачем. Учебник фиксирует только «пройдено» — один раз и навсегда. За два-три
 * месяца пути от Big-O до дерева отрезков начало забывается быстрее, чем
 * дочитывается конец, и никакой сигнал об этом не приходит. Здесь считается
 * обратное: КОГДА пора вернуться.
 *
 * Что попадает в очередь (карточки заводятся сами, вручную ничего размечать не
 * нужно):
 *   ch:<глава>   — как только глава отмечена пройденной в трекере;
 *   expl:<глава> — как только читатель сформулировал предусловие и инвариант своими
 *                  словами в виджете «объясни сам» (explain.js);
 *   pkg:<пакет>  — как только тесты пакета позеленели в виджете «Реши прямо здесь»;
 *   task:<id>    — как только задача в тексте не далась (промах из challenge.js);
 *   quiz:<вопрос> — промах в квизе распознавания шаблонов (quiz.js);
 *   mix:<pkg>.<fn> — в смешанной тренировке шаблон выбран неверно (mixed.js).
 *                  Карточка — вопрос: условие из банка задач (без имени функции) и
 *                  «каким шаблоном это решается?»; глава-ответ и кнопки оценки —
 *                  только после «Показать ответ». Заголовок «пакет.функция» сам был
 *                  ответом, и «Помню» ничего не проверяло;
 *   cx:<pkg>.<fn>  — в режиме собеседования сложность своего решения оценена
 *                  неверно (mixed.js): шаблон мог быть узнан, а цена кода — нет.
 *   viz:<тип>    — в режиме 🎯 виджета исход развилки предсказан неверно (algo-viz.js,
 *                  algoVizMissed): механику алгоритма читатель ещё не прокручивает в голове.
 *
 * Срок новой карточки — от СОБЫТИЯ, а не от захода на страницу: глава — от метки
 * algoProgressAt[href] (её пишет трекер в progress.js; нет метки — от «сейчас») плюс день,
 * пакет — от algoPkgSolved[пакет] плюс день, «объясни сам» — от algoExplainDone[ключ].ts, причём
 * оценка виджета при заведении карточки идёт в расписание, как будто её поставили здесь (карточка
 * уже есть — sync её не трогает); промахи — «сейчас». Карточка главы, которую ни разу не оценили,
 * а отметку сняли, при sync убирается; оценённые не удаляются никогда.
 *
 * Расписание — SM-2 в упрощённом виде: у карточки есть интервал iv (дни) и «лёгкость»
 * ease. Лестница «Помню» с новой карточки: 1, 3, затем iv × ease (не меньше iv + 1 дня):
 * 1, 3, 8, 22, 61… «С трудом» растит на 20 %, но не меньше чем на день (первый интервал
 * без back — день; у карточки с back — см. ниже). «Забыл» — ШАГ НАЗАД, а не сброс: карточка приходит завтра (iv = 1),
 * а поле back хранит ступень, на которую она вернётся первым «Помню» (22 дня → завтра →
 * 8 → 21, а не 1 → 3 → 8). Ступень вниз считает одна функция, stepBack(from, ease до штрафа):
 * до 3 дней включительно 1, иначе max(3, round(from / ease)). «Забыл»: back = stepBack(back, если
 * карточка ещё не вернулась после прошлого «Забыл», иначе iv). «С трудом» у карточки с back —
 * iv = stepBack(back), back снимается (на ступень НИЖЕ прежней, как второе «Забыл», но ease падает на 0.05,
 * а не на 0.2); у карточки без back — прежние +20 %. «Помню» с back возвращает на back.
 * Разброс: от iv = 8 срок сдвигается примерно на ±12,5 % (round(iv × 0.125 × (2·rnd() − 1)) дней,
 * у 22 дней — от 19 до 25); card.iv остаётся номинальным, сдвиг живёт только в due: при ОДНОМ и
 * том же rnd срок не убывает от iv, а при независимых бросках порядок оценок по срокам не обещан.
 *
 * Карточка: { due, iv, ease, reps, meta, seen?, note?, back? }. due — мс, iv — номинальные дни
 * (0 — ещё не оценивалась), ease ∈ [1.3, 2.8] с шагом 0.05, reps — повторов после последнего «Забыл»,
 * seen — когда оценена последний раз, note — «в чём была ошибка», back — см. выше (нет — карточка
 * не падала со ступени: прежние записи без back работают как раньше). Запись в algoSRS, не
 * похожая на карточку (null, число…), пропускается и остаётся в хранилище нетронутой.
 *
 * window.ALGO_SRS:
 *   schedule(card, grade, now, rnd) → iv   — меняет карточку; grade: "again" | "hard" | "good" (иначе
 *                                            ничего); now по умолчанию Date.now(); rnd() ∈ [0, 1);
 *   sync(now) → { cards, created, removed } — заводит недостающие карточки (created — их id), убирает
 *                                            неоценённые карточки снятых глав (removed); при повреждённом
 *                                            algoSRS — { damaged: true }, при отказе записи — { unsaved: true };
 *   report(id, grade, now, opts) → { status, iv, due }
 *                                          — исход события для виджетов; status: "created" (карточку
 *                                            только что завёл этот вызов — оценивать нечего), "none"
 *                                            (карточки нет или оценка неизвестна), "graded" (оценена),
 *                                            "early" (срок не подошёл — расписание не изменилось),
 *                                            "unsaved" (хранилище повреждено, переполнено или недоступно —
 *                                            ничего не записано, события нет); opts = { note, rnd }.
 *                                            «Забыл» применяется и до срока, но один раз на падение
 *                                            (reps === 0 и срок не подошёл → early, заметка обновляется);
 *   load() → cards, due(now) → [id]        — карточки (без мусорных записей) и id тех, чей срок вышел
 *                                            (старые первыми); damaged() — algoSRS не разбирается.
 * Запись algoSRS всегда по свежему чтению и с изменением только заведённых/оцениваемых карточек,
 * поэтому две вкладки не затирают друг друга; после записи на document уходит событие
 * "algo-srs:change" ({ detail: { ids } }), а вкладки слушают и "storage". Повреждённый algoSRS
 * (не JSON, массив, число, строка, null) не перезаписывается ни sync, ни report: сырое значение
 * остаётся для ручного спасения или импорта (progress.js).
 *
 * Ограничение, которое честно назвать: оценку ставит сам читатель, и движок
 * верит ей на слово. Для главы и пакета проверка объективная есть рядом (тесты
 * в тренажёре), для теории — только самооценка.
 */
(function () {
  "use strict";

  var KEY = "algoSRS";
  var PROGRESS = "algoProgress";
  var PROGRESS_AT = "algoProgressAt"; // { "<href>": ts } — когда глава отмечена (пишет progress.js)
  var PKG_SOLVED = "algoPkgSolved";
  var MISSED = "algoChallengeMissed";
  var SOLVED = "algoChallengeSolved";
  var EXPLAINED = "algoExplainDone";
  var QUIZ_MISSED = "algoQuizMissed";
  var MIXED_MISSED = "algoMixedMissed";
  var CX_MISSED = "algoMockCxMissed";
  var VIZ_MISSED = "algoVizMissed";

  var CHANGE_EVENT = "algo-srs:change";

  var DAY = 24 * 60 * 60 * 1000;
  var EASE_START = 2.5;
  var EASE_MIN = 1.3;
  var EASE_MAX = 2.8;
  var GRADES = ["again", "hard", "good"];
  // Начиная с 3 дней интервал растёт умножением; ниже «Забыл» опускает сразу на день.
  var LADDER_LOW = 3;
  // Разброс срока: от 8 дней и примерно ±12,5 % интервала (с округлением до дня) — иначе карточки
  // одной главы, заведённые в один день, приходили бы стайкой на каждой ступени.
  var SPREAD_FROM = 8;
  var SPREAD = 0.125;

  // readMap читает ключ как карту «ключ → значение». Нет значения — пустая карта. Есть, но это не
  // карта (не JSON, массив, число, строка, null) — damaged: пустая карта вместо неё НЕЛЬЗЯ записывать
  // обратно, иначе молча теряется то, что ещё можно спасти руками или импортом.
  function readMap(key) {
    var raw;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      return { map: {}, damaged: false }; // хранилище недоступно: читать нечего, запись сама откажет
    }
    if (raw === null) return { map: {}, damaged: false };
    var v;
    try {
      v = JSON.parse(raw);
    } catch (e) {
      return { map: {}, damaged: true };
    }
    if (v === null || typeof v !== "object" || Array.isArray(v)) return { map: {}, damaged: true };
    return { map: v, damaged: false };
  }
  function loadMap(key) {
    return readMap(key).map;
  }
  // save отвечает, записалось ли: переполненное или запрещённое хранилище не должно выдаваться за успех.
  function save(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Запись в algoSRS, не похожая на карточку (null, число, строка, массив), пропускается: остальные
  // карточки работают, а сама запись остаётся в хранилище нетронутой.
  function isCard(c) {
    return c !== null && typeof c === "object" && !Array.isArray(c);
  }
  function cardsOnly(map) {
    var out = {};
    Object.keys(map).forEach(function (id) {
      if (isCard(map[id])) out[id] = map[id];
    });
    return out;
  }
  function loadCards() {
    return cardsOnly(loadMap(KEY));
  }
  function num(v, dflt) {
    return typeof v === "number" && isFinite(v) ? v : dflt;
  }
  function dueOf(card) {
    return num(card.due, 0);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function chapterTitle(href) {
    var list = window.ALGO_CHAPTERS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].h === href) return list[i].t;
    }
    return href.replace(/\.html$/, "");
  }

  // Запись, меняющая algoSRS, всегда идёт по СВЕЖЕМУ чтению и трогает только свои
  // карточки: вкладок с книгой может быть несколько, и «прочитал при загрузке, записал
  // всё при оценке» стирало бы то, что другая вкладка записала за это время.
  function notify(ids) {
    if (typeof CustomEvent !== "function") return;
    document.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { ids: ids } }));
  }

  // update читает хранилище заново, применяет fn к одной карточке и записывает. null — карточки нет;
  // { ok: false } — хранилище повреждено или запись отказала (событие не шлётся); иначе { ok: true, card }.
  function update(id, fn) {
    var store = readMap(KEY);
    if (store.damaged) return { ok: false, card: null };
    var card = store.map[id];
    if (!isCard(card)) return null;
    fn(card);
    if (!save(KEY, store.map)) return { ok: false, card: card };
    notify([id]);
    return { ok: true, card: card };
  }

  // sync заводит карточки для всего, что читатель уже прошёл или провалил. Оценённые карточки
  // не удаляет: снятая в трекере галочка — не повод забывать историю повторений этой главы
  // (убирается только карточка главы, которую ни разу не оценили — см. ниже). Зовётся на каждой
  // странице при загрузке: событие (отметка главы, зелёный пакет) происходит не там, где живёт очередь.
  //
  // Новая карточка главы/пакета получает срок «событие + день», а не «сейчас»:
  // повторять в день прохождения бессмысленно, материал ещё в голове. Отсчёт идёт
  // от метки САМОГО события; нет метки (прежние записи) — от «сейчас». Промах —
  // наоборот, сразу в очередь: он и есть сигнал, что не понято именно сейчас.
  //
  // Повреждённый algoSRS не трогается вовсе ({ damaged: true }); отказ записи — { unsaved: true }
  // без заведённых карточек: о том, чего нет в хранилище, не сообщаем.
  function sync(now) {
    now = now == null ? Date.now() : now;
    var store = readMap(KEY);
    if (store.damaged) return { cards: {}, created: [], removed: [], damaged: true };
    var cards = store.map;
    var created = [];
    var removed = [];

    // add заводит карточку, если записи с таким id ещё нет (мусорная запись — тоже запись:
    // её не перезаписываем), и отдаёт новую карточку (иначе null).
    function add(id, due, meta) {
      if (Object.prototype.hasOwnProperty.call(cards, id)) return null;
      var card = newCard(due, meta);
      cards[id] = card;
      created.push(id);
      return card;
    }
    // Метка из будущего (часы переводили) и не-число (прежние записи) — не метка.
    function stamp(ts) {
      return typeof ts === "number" && isFinite(ts) && ts > 0 && ts <= now ? ts : now;
    }

    var progressStore = readMap(PROGRESS);
    var progress = progressStore.map;
    var progressAt = loadMap(PROGRESS_AT);
    Object.keys(progress).forEach(function (href) {
      if (progress[href]) add("ch:" + href, stamp(progressAt[href]) + DAY, { href: href });
    });
    // Карточка главы, которую ни разу не оценили (нет seen), а отметку сняли: случайный щелчок в
    // трекере иначе стал бы вечной карточкой. Оценённая — уже история повторений, её не трогаем;
    // нечитаемый algoProgress не повод считать, что отмечено «ничего». Страховка: запись без seen, но с
    // iv или reps (собранный руками файл, импорт) — не «ни разу не оценённая», её не убираем.
    if (!progressStore.damaged) {
      Object.keys(cards).forEach(function (id) {
        var c = cards[id];
        if (id.indexOf("ch:") !== 0 || !isCard(c) || c.seen != null || c.iv || c.reps) return;
        if (progress[id.slice(3)]) return;
        delete cards[id];
        removed.push(id);
      });
    }

    var pkgs = loadMap(PKG_SOLVED);
    Object.keys(pkgs).forEach(function (pkg) {
      add("pkg:" + pkg, stamp(pkgs[pkg]) + DAY, { pkg: pkg });
    });

    // Оценка виджета («Не сошлось» / «Частично» / «Сошлось») — уже первое извлечение,
    // а не просто факт «ответил»: она идёт в расписание, как будто поставлена здесь.
    var explained = loadMap(EXPLAINED);
    Object.keys(explained).forEach(function (chapKey) {
      var rec = explained[chapKey] || {};
      var ts = stamp(rec.ts);
      var card = add("expl:" + chapKey, ts + DAY, { chapter: chapKey });
      if (card && GRADES.indexOf(rec.grade) >= 0) schedule(card, rec.grade, ts);
    });

    // Промахи квиза и смешанной тренировки — это «не узнал шаблон», то есть
    // ровно то, что надо возвращать; поэтому они, как и промахи задач, встают
    // в очередь СЕГОДНЯ, а не завтра.
    var quizMissed = loadMap(QUIZ_MISSED);
    Object.keys(quizMissed).forEach(function (q) {
      add("quiz:" + q, now, quizMissed[q]);
    });

    var mixMissed = loadMap(MIXED_MISSED);
    Object.keys(mixMissed).forEach(function (k) {
      add("mix:" + k, now, mixMissed[k]);
    });

    // Промах по сложности тоже встаёт СЕГОДНЯ: оценить цену своего кода — навык,
    // который на собеседовании проверяют сразу после зелёных тестов.
    var cxMissed = loadMap(CX_MISSED);
    Object.keys(cxMissed).forEach(function (k) {
      add("cx:" + k, now, cxMissed[k]);
    });

    // Промах предсказания в виджете — тоже сегодня: пока развилка свежа в памяти.
    var vizMissed = loadMap(VIZ_MISSED);
    Object.keys(vizMissed).forEach(function (k) {
      add("viz:" + k, now, vizMissed[k]);
    });

    var missed = loadMap(MISSED);
    var solved = loadMap(SOLVED);
    Object.keys(missed).forEach(function (taskId) {
      if (solved[taskId]) return;
      var m = missed[taskId] || {};
      add("task:" + taskId, now, { page: m.page, anchor: m.anchor, q: m.q });
    });

    if (created.length || removed.length) {
      if (!save(KEY, cards)) return { cards: cardsOnly(loadMap(KEY)), created: [], removed: [], unsaved: true };
      notify(created.concat(removed));
    }
    return { cards: cardsOnly(cards), created: created, removed: removed };
  }

  function newCard(due, meta) {
    return { due: due, iv: 0, ease: EASE_START, reps: 0, meta: meta };
  }

  function clampEase(v) {
    // два знака: иначе 2.5 + 0.05 + 0.05 копит хвосты вида 2.6000000000000005, и граница
    // round(iv × ease) на «ровно .5» зависит от пути, которым карточка сюда пришла
    return Math.round(Math.max(EASE_MIN, Math.min(EASE_MAX, v)) * 100) / 100;
  }

  function hasBack(card) {
    return typeof card.back === "number" && card.back >= 1;
  }

  function spread(iv, rnd) {
    if (iv < SPREAD_FROM) return 0;
    return Math.round(iv * SPREAD * (2 * rnd() - 1));
  }

  // Ступень лестницы ниже from — единственное правило «шага назад», им считают и «Забыл», и
  // «С трудом» у карточки с back: до LADDER_LOW включительно — день, выше — интервал, делённый на
  // ease (им его и растили: ease здесь — ДО штрафа оценки), но не ниже LADDER_LOW.
  function stepBack(from, ease) {
    return from <= LADDER_LOW ? 1 : Math.max(LADDER_LOW, Math.round(from / ease));
  }

  // grade: "again" | "hard" | "good". Меняет карточку и возвращает НОМИНАЛЬНЫЙ интервал
  // в днях; срок (due) отличается от него на разброс. Неизвестная оценка ничего не меняет.
  function schedule(card, grade, now, rnd) {
    if (GRADES.indexOf(grade) < 0) return card.iv || 0;
    now = now == null ? Date.now() : now;
    var iv = num(card.iv, 0);
    var reps = num(card.reps, 0);
    // карточка без ease (или с ease не числом) — как новая: NaN в расписании хуже заглушки
    var ease = num(card.ease, 0) > 0 ? card.ease : EASE_START;

    if (grade === "again") {
      // Шаг назад: ступень, с которой падаем, — back, если карточка ещё не вернулась после
      // прошлого «Забыл», иначе iv.
      card.back = stepBack(hasBack(card) ? card.back : iv, ease);
      card.ease = clampEase(ease - 0.2);
      card.iv = 1;
      card.reps = 0;
    } else if (grade === "hard") {
      card.ease = clampEase(ease - 0.05);
      // +20 %, но не меньше чем на день: round(1 × 1.2) = 1 возвращал карточку
      // каждый день без конца. Первый интервал — день, как у «Помню»: иначе сразу
      // после «Забыл» слабая оценка откладывала бы дальше сильной (2 дня против 1).
      // У карточки, упавшей и ещё не вернувшейся (back), «С трудом» — не возврат на прежнюю
      // ступень, а ступень НИЖЕ неё: иначе «С трудом» после «Забыл» шло бы заново с 1, 3, 8 — хуже,
      // чем второе «Забыл» (оно сохраняет лестницу).
      if (hasBack(card)) card.iv = stepBack(card.back, ease);
      else card.iv = reps === 0 ? 1 : Math.max(iv + 1, Math.round((iv || 1) * 1.2));
      card.reps = reps + 1;
      delete card.back;
    } else {
      card.ease = clampEase(ease + 0.05);
      if (hasBack(card)) card.iv = card.back;
      else if (reps === 0) card.iv = 1;
      else if (reps === 1 && iv < LADDER_LOW) card.iv = LADDER_LOW;
      // не меньше чем на день: у прежней формулы встречается iv = 1 при reps ≥ 2, где
      // round(1 × 1.35) = 1 держал карточку на месте
      else card.iv = Math.max(iv + 1, Math.round(iv * card.ease));
      card.reps = reps + 1;
      delete card.back;
    }
    card.due = now + (card.iv + spread(card.iv, rnd || Math.random)) * DAY;
    card.seen = now;
    return card.iv;
  }

  // report — исход события для виджетов, которые оценивают сами (задача в тексте, «объясни
  // сам», 🎯, смешанная тренировка, тесты пакета). Сначала sync: событие могло как раз
  // и завести карточку (промах → карточка «сейчас») — тогда оценивать нечего.
  // «Помню» и «С трудом» до срока ничего не меняют — иначе повтор «из любопытства» растил бы
  // интервал. «Забыл» до срока применяется, провал нельзя оставить без последствий, но ОДИН раз на
  // падение: карточка, которая уже упала или ещё ни разу не оценена (reps === 0) и ждёт срока,
  // отвечает early — две неудачи подряд в одном заходе обычное дело, и пять вызовов не должны
  // ронять её на пять ступеней (заметка при этом обновляется). Второй «Забыл» уже в срок — вторая ступень.
  // unsaved — ничего не записано (хранилище повреждено, переполнено или недоступно); события нет.
  function report(id, grade, now, opts) {
    now = now == null ? Date.now() : now;
    var none = { status: "none", iv: 0, due: 0 };
    var unsaved = { status: "unsaved", iv: 0, due: 0 };
    if (GRADES.indexOf(grade) < 0) return none;
    var synced = sync(now);
    if (synced.damaged || synced.unsaved) return unsaved;
    var card = synced.cards[id];
    if (!card) return none;
    if (synced.created.indexOf(id) >= 0) return { status: "created", iv: card.iv, due: card.due };
    var o = opts || {};
    if (dueOf(card) > now) {
      var early = { status: "early", iv: card.iv, due: card.due };
      if (grade !== "again") return early;
      if (num(card.reps, 0) === 0) {
        if (!o.note || o.note === card.note) return early;
        var noted = update(id, function (c) { c.note = o.note; });
        return noted && noted.ok ? early : noted ? unsaved : none;
      }
    }
    var res = update(id, function (c) {
      if (grade === "again" && o.note) c.note = o.note;
      schedule(c, grade, now, o.rnd);
    });
    if (!res) return none;
    if (!res.ok) return unsaved;
    return { status: "graded", iv: res.card.iv, due: res.card.due };
  }

  function kindOf(id) {
    return id.slice(0, id.indexOf(":"));
  }

  // Задача банка смешанной тренировки (assets/problems.js) — источник условия для
  // карточки-вопроса. Ищется при отрисовке, а не при заведении карточки: условие
  // в банке могло поменяться, и повторять надо текущее.
  function findProblem(pkg, fn) {
    var list = window.ALGO_PROBLEMS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].p === pkg && list[i].f === fn) return list[i];
    }
    return null;
  }

  function describe(id, card) {
    var meta = card.meta || {};
    if (kindOf(id) === "ch") {
      return { kind: "Глава", title: chapterTitle(meta.href || ""), href: meta.href || "", what: "Вспомни предусловие и инвариант, не заглядывая в текст, — потом сверься." };
    }
    if (kindOf(id) === "quiz") {
      return {
        kind: "Квиз: распознать шаблон",
        title: meta.q || id.slice(5),
        href: "quiz.html",
        what: "Назови шаблон и, главное, триггер в условии, по которому ты его узнал — правильный ответ без триггера не считается.",
      };
    }
    if (kindOf(id) === "mix") {
      var prob = findProblem(meta.pkg, meta.fn);
      var chHref = (meta.chapter || (prob && prob.c) || "") + ".html";
      return {
        kind: "Смешанная тренировка: узнай шаблон",
        title: prob ? "Каким шаблоном это решается?" : "Задача из смешанной тренировки",
        href: prob ? "" : "mixed.html",
        question: prob ? prob.s : "",
        answer: { text: chapterTitle(chHref), href: chHref },
        what: prob
          ? "Назови шаблон и примету в условии, по которой его узнал, — потом открой ответ."
          : "Её условия больше нет в банке. Вспомни, каким шаблоном она решалась, и открой ответ.",
      };
    }
    if (kindOf(id) === "viz") {
      return {
        kind: "Предсказание шага",
        title: meta.title || id.slice(4),
        href: meta.page || "",
        what: "Развилка «строка " + (meta.line || "?") + ": " + (meta.code || "") + "» пошла не так, как ты предсказал. " +
          "Открой главу, включи 🎯 в этом виджете и пройди его заново — перед каждым ответом проговори условие по значениям в чипах.",
      };
    }
    if (kindOf(id) === "cx") {
      return {
        kind: "Собеседование: сложность",
        title: (meta.pkg || "") + "." + (meta.fn || "") + " — сложность своего решения оценена неверно",
        href: "mixed.html",
        what: "Не открывая решение, выведи время и память: сколько раз выполняется каждый цикл, что растёт вместе с входом. Потом сверься с условием задачи.",
      };
    }
    if (kindOf(id) === "expl") {
      var href = (meta.chapter || "") + ".html";
      return {
        kind: "Формулировка",
        title: chapterTitle(href),
        href: href + "#explain",
        what: "Скажи вслух предусловие и инвариант этого шаблона — и только потом открывай разбор.",
      };
    }
    if (kindOf(id) === "pkg") {
      return { kind: "Пакет тренажёра", title: meta.pkg || id.slice(4), href: "", what: "Открой пакет и перереши с чистой заготовки: код забывается быстрее теории." };
    }
    return {
      kind: "Задача",
      title: meta.q || id.slice(5),
      href: meta.page ? meta.page + ".html" + (meta.anchor ? "#" + meta.anchor : "") : "",
      what: "Эта задача когда-то не далась. Ответь снова — не вспоминая ответ, а выводя его.",
    };
  }

  function dueIds(cards, now) {
    return Object.keys(cards)
      .filter(function (id) {
        return dueOf(cards[id]) <= now;
      })
      .sort(function (a, b) {
        return dueOf(cards[a]) - dueOf(cards[b]);
      });
  }

  function nextDueIn(cards, now) {
    var min = Infinity;
    Object.keys(cards).forEach(function (id) {
      var d = dueOf(cards[id]);
      if (d > now && d < min) min = d;
    });
    return min === Infinity ? null : Math.max(1, Math.ceil((min - now) / DAY));
  }

  function plural(n, one, few, many) {
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  }

  // Перерисовки, которым нужно знать об изменении algoSRS (виджеты очереди). Счётчик в
  // панели обновляется отдельно — он есть на каждой странице, виджет только на «Повторении».
  var refreshers = [];

  function build(root) {
    // форма «в чём была ошибка» открыта: событие из другой вкладки её не стирает
    var noteOpen = false;
    // что сейчас нарисовано: по этому внешнее изменение узнаёт, нужна ли перерисовка (иначе
    // каждое чужое событие закрывало бы уже открытый ответ карточки-вопроса)
    var shown = null;

    function render() {
      noteOpen = false;
      var now = Date.now();
      var store = readMap(KEY);
      var cards = cardsOnly(store.map);
      var queue = dueIds(cards, now);
      var total = Object.keys(cards).length;
      shown = { id: queue[0] || null, due: queue.length ? dueOf(cards[queue[0]]) : 0, n: queue.length, total: total, damaged: store.damaged };
      root.innerHTML = "";

      if (store.damaged) {
        root.appendChild(el("p", "algo-today__empty",
          "Сохранённые карточки повторений повреждены (ключ algoSRS не разбирается), поэтому книга их не трогает и не перезаписывает. " +
          "Вернуть их можно кнопкой «Импорт» на странице шпаргалки — из файла прогресса, который вы выгружали раньше. " +
          "Без файла удалите ключ algoSRS в хранилище браузера (DevTools → Application → Local Storage): карточки заведутся заново " +
          "из отметок глав, решённых пакетов и промахов, но интервалы и заметки прежних повторений пропадут."));
        return;
      }

      var head = el("div", "algo-today__head");
      head.appendChild(el("strong", null, queue.length
        ? "К повторению сегодня: " + queue.length
        : "На сегодня всё"));
      var sub = el("span", "algo-today__sub");
      var nd = nextDueIn(cards, now);
      sub.textContent = total
        ? "всего карточек " + total + (nd ? " · следующая через " + nd + " " + plural(nd, "день", "дня", "дней") : "")
        : "карточек пока нет";
      head.appendChild(sub);
      root.appendChild(head);

      if (!queue.length) {
        root.appendChild(el("p", "algo-today__empty", total
          ? "Ничего не просрочено — возвращайся завтра. Карточки заводятся сами: отметил главу пройденной, позеленел пакет в тренажёре, промахнулся в задаче."
          : "Отметь пройденную главу в трекере, реши пакет в тренажёре или промахнись в задаче — и здесь появится первая карточка."));
        return;
      }

      var id = queue[0];
      var card = cards[id];
      var info = describe(id, card);

      var box = el("div", "algo-today__card");
      box.appendChild(el("div", "algo-today__kind", info.kind));
      if (info.href) {
        var a = el("a", "algo-today__title", info.title);
        a.href = info.href;
        box.appendChild(a);
      } else {
        box.appendChild(el("div", "algo-today__title", info.title));
      }
      if (info.question) {
        info.question.split("\n").forEach(function (para) {
          box.appendChild(el("p", "algo-today__q", para));
        });
      }
      box.appendChild(el("p", "algo-today__what", info.what));

      if (card.note) {
        box.appendChild(el("p", "algo-today__note", "В прошлый раз: " + card.note));
      }

      var bar = el("div", "algo-today__grades");
      [
        ["again", "Забыл", "вернётся завтра, а потом на ступень ниже той, с которой упала"],
        ["hard", "С трудом", "интервал почти не растёт"],
        ["good", "Помню", "интервал растёт"],
      ].forEach(function (g) {
        var b = el("button", "algo-quiz__btn algo-today__grade", g[1]);
        b.type = "button";
        b.title = g[2];
        b.onclick = function () {
          if (g[0] === "again") {
            askNote(card, function (note) { apply(g[0], note); });
            return;
          }
          apply(g[0]);
        };
        bar.appendChild(b);
      });
      // Карточка-вопрос: сначала попытка вспомнить, потом ответ, и только потом
      // оценка. Оценить «Помню», не увидев ответа, — значит не проверить ничего.
      if (info.answer) {
        bar.style.display = "none";
        var reveal = el("button", "algo-quiz__btn algo-today__reveal", "Показать ответ");
        reveal.type = "button";
        reveal.onclick = function () {
          var ans = el("p", "algo-today__answer", "Ответ: ");
          var link = el("a", null, info.answer.text);
          link.href = info.answer.href;
          ans.appendChild(link);
          box.replaceChild(ans, reveal);
          bar.style.display = "";
        };
        box.appendChild(reveal);
      }
      box.appendChild(bar);
      root.appendChild(box);

      // Оценка идёт через report: он читает хранилище заново и меняет одну карточку, а не
      // пишет обратно всё, что виджет прочитал при отрисовке.
      function apply(grade, note) {
        var res = report(id, grade, Date.now(), { note: note });
        render();
        var text = null;
        if (res.status === "unsaved") {
          text = "Не удалось сохранить оценку: хранилище браузера недоступно или переполнено. Карточка осталась в очереди.";
        } else if (res.status === "early") {
          text = "Эту карточку уже оценили в другой вкладке — оставил как есть.";
        } else if (res.status === "graded") {
          var days = Math.max(1, Math.round((res.due - Date.now()) / DAY));
          text = "Следующее повторение через " + days + " " + plural(days, "день", "дня", "дней");
          var back = grade === "again" ? (loadMap(KEY)[id] || {}).back : 0;
          if (back > 1) text += ", потом — через " + back + " " + plural(back, "день", "дня", "дней");
        }
        if (text) root.appendChild(el("div", "algo-today__toast", text));
      }

      // Дневник ошибок: «забыл» — единственный момент, когда причина ещё в
      // голове. Формулировка своими словами и есть то, что превращает промах в
      // знание, поэтому её показываем при следующем повторе этой же карточки.
      function askNote(card, done) {
        var wrap = el("div", "algo-today__noteform");
        wrap.appendChild(el("label", "algo-today__notelabel", "В чём была ошибка? (необязательно, но полезно)"));
        var input = document.createElement("input");
        input.type = "text";
        input.className = "algo-challenge__input";
        input.placeholder = "например: перепутал границу — right включительно, а не исключительно";
        input.value = card.note || "";
        wrap.appendChild(input);
        var ok = el("button", "algo-quiz__btn", "Сохранить и отложить");
        ok.type = "button";
        ok.onclick = function () {
          noteOpen = false;
          done(input.value.trim());
        };
        wrap.appendChild(ok);
        box.appendChild(wrap);
        noteOpen = true;
        input.focus();
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); ok.click(); }
        });
      }
    }

    // Изменение algoSRS не из этого виджета (другая вкладка, report из другого скрипта):
    // перерисовываем, только если изменилось то, что на экране.
    function refresh() {
      if (noteOpen) return;
      var now = Date.now();
      var store = readMap(KEY);
      var cards = cardsOnly(store.map);
      var queue = dueIds(cards, now);
      var same = shown && shown.damaged === store.damaged && shown.n === queue.length &&
        shown.total === Object.keys(cards).length && shown.id === (queue[0] || null) &&
        (!queue.length || dueOf(cards[queue[0]]) === shown.due);
      if (!same) render();
    }

    refreshers.push(refresh);
    render();
  }

  // Счётчик «🔁 Сегодня: N» — на КАЖДОЙ странице: очередь, о которой не напоминает ни одна
  // страница, кроме собственной, не работает. Ставится в правую часть верхней панели mdBook
  // первой кнопкой (порядок остальных не меняется); нет панели — под заголовком главы.
  // Пока карточек на сегодня нет, элемента нет вовсе: страница не дёргается и не мигает.
  var badge = null;

  function makeBadge() {
    var a = el("a", "algo-srs-badge");
    a.href = "review.html";
    a.appendChild(el("span", "algo-srs-badge__icon", "🔁"));
    a.appendChild(document.createTextNode(" "));
    a.appendChild(el("span", "algo-srs-badge__label", "Сегодня: "));
    a.appendChild(el("b", "algo-srs-badge__n", ""));
    var bar = document.querySelector("#mdbook-menu-bar .right-buttons");
    if (bar) {
      bar.insertBefore(a, bar.firstChild);
      return a;
    }
    var h1 = document.querySelector("main h1");
    if (!h1) return null;
    a.className += " algo-srs-badge--inline";
    h1.parentNode.insertBefore(a, h1.nextSibling);
    return a;
  }

  function refreshBadge(cards) {
    var n = dueIds(cards || loadCards(), Date.now()).length;
    if (!badge) {
      if (!n) return;
      badge = makeBadge();
      if (!badge) return;
    }
    badge.hidden = !n;
    badge.querySelector(".algo-srs-badge__n").textContent = String(n);
    var title = "К повторению сегодня: " + n + " " + plural(n, "карточка", "карточки", "карточек");
    badge.title = title;
    badge.setAttribute("aria-label", title);
  }

  function refreshViews() {
    refreshBadge();
    refreshers.forEach(function (f) { f(); });
  }

  window.ALGO_SRS = {
    schedule: schedule,
    sync: sync,
    report: report,
    load: loadCards,
    due: function (now) { return dueIds(loadCards(), now == null ? Date.now() : now); },
    damaged: function () { return readMap(KEY).damaged; },
  };

  function init() {
    refreshBadge(sync(Date.now()).cards);
    document.addEventListener(CHANGE_EVENT, refreshViews);
    window.addEventListener("storage", function (e) {
      if (e.key === null || e.key === KEY) refreshViews();
    });
    // вкладка, открытая со вчера: сроки подошли, а событий не было. Виджет не трогаем — он
    // перерисовался бы поверх открытого ответа карточки-вопроса.
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refreshBadge();
    });
    Array.prototype.forEach.call(
      document.querySelectorAll(".algo-today:not(.algo-today--ready)"),
      function (node) {
        node.classList.add("algo-today--ready");
        build(node);
      }
    );
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
