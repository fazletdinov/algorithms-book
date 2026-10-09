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
 *   pkg:<пакет>  — как только тесты пакета позеленели в виджете «Реши прямо здесь» или читатель
 *                  нажал там «Сдаюсь» (тогда — на завтра). Карточка — ОДНА функция с чистого листа:
 *                  условие из банка задач и виджет runner'а с data-func; функции берутся по кругу (см.
 *                  cardFns). Кнопок оценки нет — оценку ставят события виджета: зелёный прогон без
 *                  подсказок — «Помню», с подсказкой — «С трудом», «Сдаюсь» — «Забыл» (где угодно);
 *   task:<id>    — как только задача в тексте не далась (промах из challenge.js);
 *   quiz:<вопрос> — промах в квизе распознавания шаблонов (quiz.js). Карточка — вопрос:
 *                  условие и «каким шаблоном это решается?»; шаблон ссылкой на главу и кнопки
 *                  оценки — только после «Показать ответ». Шаблон и глава — из банка квиза
 *                  (ALGO_QUIZ) по тексту вопроса, meta.pattern/href — только если вопроса больше нет;
 *   mix:<pkg>.<fn> — в смешанной тренировке шаблон выбран неверно (mixed.js).
 *                  Карточка — вопрос: условие ДРУГОЙ задачи банка с той же главой-ответом
 *                  (без имени функции; по кругу после meta.last, сначала — после задачи
 *                  промаха; задача у шаблона одна — она сама) и «каким шаблоном это
 *                  решается?»; глава-ответ с альтернативами показанной задачи и кнопки
 *                  оценки — только после «Показать ответ»; оценка пишет meta.last. Глава —
 *                  из банка по pkg/fn, meta.chapter — только у задачи вне банка (как у cx:).
 *                  Заголовок «пакет.функция» сам был ответом, и «Помню» ничего не проверяло;
 *   cx:<pkg>.<fn>  — в режиме собеседования сложность своего решения оценена
 *                  неверно (mixed.js): шаблон мог быть узнан, а цена кода — нет. Карточка —
 *                  вопрос: условие из банка и «какая сложность у решения?»; ответ — эталон из
 *                  поля x банка и глава. Задачи в банке больше нет или x пуст — карточка так и
 *                  говорит и оценивается без «Показать ответ»: сверять не с чем.
 *   viz:<тип>    — в режиме 🎯 виджета исход развилки предсказан неверно (algo-viz.js,
 *                  algoVizMissed): механику алгоритма читатель ещё не прокручивает в голове.
 *                  Ссылка карточки — «страница?viz=<тип>#якорь» (meta.anchor; у прежних записей
 *                  якоря нет — тогда первый виджет типа); проход с 🎯 оценивает карточку сам.
 *
 * Порция дня. Очередь показывает не всё просроченное, а не больше 12 карточек в день и двух
 * «тяжёлых» (с кодом — вид pkg:); остальное ждёт следующих дней. Порядок: лёгкие — по возрастанию iv,
 * затем срока; из карточек с кодом — самые просроченные (их iv на порядок не влияет); тяжёлые
 * показываются последними, самая просроченная первой; отложенные кнопкой «Позже» — в конце, в порядке откладывания
 * (карточка при этом не меняется). Счётчик дня — ключ algoToday = { day: "ГГГГ-ММ-ДД" (местная дата),
 * done, heavy, later: [id] }: done и heavy растут, когда оценена карточка с вышедшим сроком (кнопкой
 * здесь или через report из виджета); в новый день, как и при мусоре в ключе, счёт идёт с нуля.
 * В экспорт прогресса algoToday не входит: он про сегодня в этом браузере.
 *
 * Срок новой карточки — от СОБЫТИЯ, а не от захода на страницу: глава — от метки
 * algoProgressAt[href] (её пишет трекер в progress.js; нет метки — от «сейчас») плюс день,
 * пакет — от algoPkgSolved[пакет] плюс день, «объясни сам» — от algoExplainDone[ключ].ts, причём
 * оценка виджета при заведении карточки идёт в расписание, как будто её поставили здесь (карточка
 * уже есть — sync её не трогает); промахи (task:, quiz:, mix:, cx:, viz:) — начало завтрашних местных
 * суток: повтор в той же сессии через секунды проверял бы кратковременную память, а не извлечение
 * («Сдаюсь» без карточки — тоже завтра, now + день; «Не сошлось» в «объясни сам» — «Забыл» с отметки,
 * то есть через сутки). Карточки, заведённые прежде со сроком «сейчас», не переносятся. Карточка главы, которую ни разу не оценили,
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
 *                                            (старые первыми); damaged() — algoSRS не разбирается;
 *   today(now) → { ids, held }             — порция дня: ids — что показать сегодня, по порядку; held —
 *                                            сколько просроченных в неё не вошло. Ничего не пишет;
 *   later(id, now) → boolean               — «Позже»: карточка из порции уходит в её конец; false — её
 *                                            в сегодняшней порции нет. Событий не шлёт: вид перерисовывает
 *                                            тот, кто вызвал;
 *   giveup(pkg, fn, now) → { status, iv, due } — «Сдаюсь» в виджете runner'а: карточка pkg:<pkg> получает
 *                                            «Забыл» (статусы как у report), а если её нет — заводится
 *                                            на завтра (status "created"); fn — функция, на которой
 *                                            сдались: годная для карточки придёт на ней первой (meta.fn).
 *                                            Его же зовёт слушатель algo-runner:giveup на каждой странице;
 *   limits = { cards, heavy }              — пределы порции (их же называют тексты книги);
 *   racePkgs → [пакет]                     — пакеты, чьи тесты гоняются с -race (виджет: data-race="true").
 * Запись algoSRS всегда по свежему чтению и с изменением только заведённых/оцениваемых карточек,
 * поэтому две вкладки не затирают друг друга; после записи на document уходит событие
 * "algo-srs:change" ({ detail: { ids } }), а вкладки слушают и "storage". algoToday пишется так же —
 * по свежему чтению, и при оценке раньше события: слушатель строит порцию уже по новому счёту дня.
 * Повреждённый algoSRS (не JSON, массив, число, строка, null) не перезаписывается ни sync, ни report:
 * сырое значение остаётся для ручного спасения или импорта (progress.js); порция при нём пуста.
 *
 * Кто ставит оценку. Карточку пакета — тесты: кнопок оценки у неё нет. Задачу в тексте, 🎯 и
 * смешанную тренировку их виджеты оценивают сами, через report, — ответ там проверяет машина.
 * «Объясни сам» тоже зовёт report, но оценку в нём ставит читатель. У остальных карточек на этой
 * странице — кнопки: оценку ставит читатель, и движок верит ему на слово.
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
  // Виджеты, переехавшие на другую страницу: тип → { from, to }. Карточка viz: хранит страницу,
  // на которой был промах, и без этой карты вела бы туда, где виджета уже нет.
  var VIZ_MOVED = {
    "heap-sort": { from: "sorting.html", to: "heap-structure.html" }, // этап 3a: пирамидальная — в главу о куче
  };
  var TODAY = "algoToday"; // счётчик дня: { day, done, heavy, later } — в экспорт прогресса не входит
  // Черновик виджета на карточке пакета (data-draft="review", ключ пишет runner.js). Владелец — карточка:
  // стирается после оценки, а не при перестройке виджета, — иначе полчаса работы терялись бы на «Позже».
  var REVIEW_DRAFT = "algoRunnerCode:review:";
  // Пакеты, чьи тесты в главах гоняются с -race (data-race="true" у виджета): гонка данных там — ошибка
  // решения, и без детектора гоночный код зеленеет. Виджеты вне глав (карточка пакета здесь, смешанная
  // тренировка — ALGO_SRS.racePkgs) ставят тот же флаг; совпадение с главами держит check-registries.js.
  var RACE_PKGS = ["codereview", "parallelbfs", "parallelnqueens", "parallelsearch", "parallelsort", "ratelimiter", "wordcount"];

  var CHANGE_EVENT = "algo-srs:change";

  // Дневная порция: не больше DAY_LIMIT карточек в день, из них не больше HEAVY_LIMIT «тяжёлых»
  // (с кодом — вид pkg:). После перерыва долг в сорок карточек иначе встречал бы читателя стеной,
  // и повторение бросали бы целиком. Тяжёлая карточка — функция с чистого листа; при одной в день
  // очередь из 18 пакетов расходилась месяцами, поэтому их две (решение автора книги, 2026-10-09).
  var DAY_LIMIT = 12;
  var HEAVY_LIMIT = 2;

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
  // saved зовётся после удавшейся записи и ДО события: то, что слушатели прочитают вместе с
  // карточкой (счётчик дня), к этому моменту уже записано.
  function update(id, fn, saved) {
    var store = readMap(KEY);
    if (store.damaged) return { ok: false, card: null };
    var card = store.map[id];
    if (!isCard(card)) return null;
    fn(card);
    if (!save(KEY, store.map)) return { ok: false, card: card };
    if (saved) saved();
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
  // от метки САМОГО события; нет метки (прежние записи) — от «сейчас». Промах — с начала
  // завтрашних суток (missDue): в очередь он встаёт сразу, но приходит уже не из кратковременной памяти.
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

    // Промахи — квиза и смешанной тренировки («не узнал шаблон»), сложности, предсказания 🎯 и
    // задачи в тексте — встают в очередь с началом ЗАВТРАШНИХ местных суток (missDue), как «Позже»
    // без runner'а. Срок «сейчас» давал повтор в той же сессии через секунды: ответ ещё перед глазами,
    // «Помню» ничего не проверяло. Карточки, заведённые раньше со сроком «сейчас», не переносятся.
    var missAt = missDue(now);
    var quizMissed = loadMap(QUIZ_MISSED);
    Object.keys(quizMissed).forEach(function (q) {
      add("quiz:" + q, missAt, quizMissed[q]);
    });

    var mixMissed = loadMap(MIXED_MISSED);
    Object.keys(mixMissed).forEach(function (k) {
      add("mix:" + k, missAt, mixMissed[k]);
    });

    var cxMissed = loadMap(CX_MISSED);
    Object.keys(cxMissed).forEach(function (k) {
      add("cx:" + k, missAt, cxMissed[k]);
    });

    var vizMissed = loadMap(VIZ_MISSED);
    Object.keys(vizMissed).forEach(function (k) {
      add("viz:" + k, missAt, vizMissed[k]);
    });

    var missed = loadMap(MISSED);
    var solved = loadMap(SOLVED);
    Object.keys(missed).forEach(function (taskId) {
      if (solved[taskId]) return;
      var m = missed[taskId] || {};
      add("task:" + taskId, missAt, { page: m.page, anchor: m.anchor, q: m.q });
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

  // tomorrowStart — начало завтрашних местных суток. Локальный конструктор Date сам учитывает перевод часов.
  function tomorrowStart(now) {
    var d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  }
  // missDue — срок карточки, заведённой промахом: не раньше завтра (решение автора книги, 2026-10-09).
  function missDue(now) {
    return tomorrowStart(now);
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
  // и завести карточку (промах → карточка на завтра) — тогда оценивать нечего, а повтор той же задачи
  // в тот же день получит early: срок не вышел.
  // «Помню» и «С трудом» до срока ничего не меняют — иначе повтор «из любопытства» растил бы
  // интервал. «Забыл» до срока применяется, провал нельзя оставить без последствий, но ОДИН раз на
  // падение: карточка, которая уже упала или ещё ни разу не оценена (reps === 0) и ждёт срока,
  // отвечает early — две неудачи подряд в одном заходе обычное дело, и пять вызовов не должны
  // ронять её на пять ступеней (заметка при этом обновляется). Второй «Забыл» уже в срок — вторая ступень.
  // unsaved — ничего не записано (хранилище повреждено, переполнено или недоступно); события нет.
  // Оценка карточки с вышедшим сроком занимает место в порции дня (countDone) — кто бы её ни поставил,
  // кнопка на «Повторении» или виджет в главе; «Забыл» до срока место не занимает.
  var NONE = { status: "none", iv: 0, due: 0 };
  var UNSAVED = { status: "unsaved", iv: 0, due: 0 };

  function report(id, grade, now, opts) {
    return gradeCard(id, grade, now, opts);
  }

  // gradeCard — report с двумя добавками для карточки пакета: change(card) правит карточку в той же
  // записи, что и оценка (meta.last / meta.fn), saved() — после удавшейся записи, до события (стереть
  // черновик). Ни то ни другое не зовётся при none, early и unsaved: там ничего не оценено.
  function gradeCard(id, grade, now, opts, change, saved) {
    now = now == null ? Date.now() : now;
    if (GRADES.indexOf(grade) < 0) return NONE;
    var synced = sync(now);
    if (synced.damaged || synced.unsaved) return UNSAVED;
    var card = synced.cards[id];
    if (!card) return NONE;
    if (synced.created.indexOf(id) >= 0) return { status: "created", iv: card.iv, due: card.due };
    var o = opts || {};
    if (dueOf(card) > now) {
      var early = { status: "early", iv: card.iv, due: card.due };
      if (grade !== "again") return early;
      if (num(card.reps, 0) === 0) {
        if (!o.note || o.note === card.note) return early;
        var noted = update(id, function (c) { c.note = o.note; });
        return noted && noted.ok ? early : noted ? UNSAVED : NONE;
      }
    }
    var wasDue = false;
    var res = update(id, function (c) {
      wasDue = dueOf(c) <= now;
      if (grade === "again" && o.note) c.note = o.note;
      schedule(c, grade, now, o.rnd);
      if (change) change(c);
    }, function () {
      if (wasDue) countDone(id, now);
      if (saved) saved();
    });
    if (!res) return NONE;
    if (!res.ok) return UNSAVED;
    return { status: "graded", iv: res.card.iv, due: res.card.due };
  }

  // --- Карточка пакета: одна функция с чистого листа ---

  // cardFns — функции пакета, годные для карточки, в порядке банка задач (assets/problems.js): у записи
  // есть свои тесты (t) и нет соседних упражнений (n), без которых они не проходят. Запись с n на чистой
  // заготовке неразрешима — тесты падают на panic("TODO") соседа. Пусто (пакета нет в банке, у всех его
  // задач n, банк не загрузился) — карточка гоняет пакет целиком.
  function cardFns(pkg) {
    var list = window.ALGO_PROBLEMS || [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p && p.p === pkg && Array.isArray(p.t) && p.t.length && !(Array.isArray(p.n) && p.n.length)) out.push(p);
    }
    return out;
  }
  function names(list) {
    return list.map(function (p) { return p.f; });
  }
  // nextInTurn — функция после last по кругу; last нет в списке (новая карточка, банк поменялся) — первая.
  function nextInTurn(fns, last) {
    return fns[(fns.indexOf(last) + 1) % fns.length];
  }
  function metaOf(card) {
    return isCard(card.meta) ? card.meta : {};
  }
  // cardFn — функция на сегодняшний показ: meta.fn (вне очереди, один раз — её ставит «Сдаюсь»), иначе
  // следующая по кругу за meta.last. Выбор — от карточки и банка, без случайности: открытая карточка
  // после перезагрузки возвращается к той же функции и тому же черновику.
  function cardFn(pkg, meta) {
    var list = cardFns(pkg);
    if (!list.length) return null;
    var fns = names(list);
    var f = fns.indexOf(meta.fn) >= 0 ? meta.fn : nextInTurn(fns, meta.last);
    return list[fns.indexOf(f)];
  }
  // advance — что запоминает оценка функции fn: meta.last — последняя пройденная ПО ОЧЕРЕДИ (от неё
  // считается следующая); «Забыл» ставит fn вне очереди — завтра она придёт первой, а любая другая
  // оценка fn её оттуда снимает. Функция, не годная для карточки, в meta не попадает.
  function advance(card, pkg, fn, grade) {
    var fns = names(cardFns(pkg));
    if (!fn || fns.indexOf(fn) < 0) return;
    if (!isCard(card.meta)) card.meta = { pkg: pkg };
    var m = card.meta;
    if (fn === nextInTurn(fns, m.last)) m.last = fn;
    if (grade === "again") m.fn = fn;
    else if (m.fn === fn) delete m.fn;
  }
  function dropDraft(pkg) {
    try {
      localStorage.removeItem(REVIEW_DRAFT + pkg);
    } catch (e) {
      /* хранилище недоступно — и черновика в нём нет */
    }
  }

  // gradePkg — оценка карточки пакета исходом виджета: та же report, плюс meta и стёртый черновик.
  function gradePkg(pkg, fn, grade, now) {
    return gradeCard("pkg:" + pkg, grade, now, null,
      function (c) { advance(c, pkg, fn, grade); },
      function () { dropDraft(pkg); });
  }

  // giveup — «Сдаюсь» (показан эталон) в любом виджете «Реши прямо здесь»: для карточки пакета это
  // «Забыл». Карточки нет — заводится со сроком «завтра»: сдался — значит, пакет пора повторить; функция,
  // на которой сдались, придёт на ней первой. Карточку только что завёл sync (пакет решён на этой же
  // странице) — оценивать нечего, запоминается только функция.
  function giveup(pkg, fn, now) {
    now = now == null ? Date.now() : now;
    if (typeof pkg !== "string" || !pkg) return NONE;
    var id = "pkg:" + pkg;
    var fit = names(cardFns(pkg)).indexOf(fn) >= 0;
    var synced = sync(now);
    if (synced.damaged || synced.unsaved) return UNSAVED;
    var card = synced.cards[id];
    if (card && synced.created.indexOf(id) < 0) return gradePkg(pkg, fn, "again", now);
    if (card) {
      if (fit) update(id, function (c) { advance(c, pkg, fn, "again"); });
      return { status: "created", iv: card.iv, due: card.due };
    }
    var meta = { pkg: pkg };
    if (fit) meta.fn = fn;
    var fresh = newCard(now + DAY, meta);
    var store = readMap(KEY);
    if (store.damaged) return UNSAVED;
    // другая вкладка успела завести её между sync и этой записью — значит, карточка есть: «Забыл»
    if (Object.prototype.hasOwnProperty.call(store.map, id)) return gradePkg(pkg, fn, "again", now);
    store.map[id] = fresh;
    if (!save(KEY, store.map)) return UNSAVED;
    notify([id]);
    return { status: "created", iv: fresh.iv, due: fresh.due };
  }

  // postpone — «Позже» у карточки с кодом, когда runner не отвечает: решать её сегодня нечем, и место
  // для кода в порции держать незачем. Срок — начало завтрашних местных суток; интервал, ease, повторы и
  // back не меняются, счёт дня не растёт (later() тут не годится: он оставляет карточку в сегодняшней
  // порции). Запись — по свежему чтению, одна карточка. Отдаёт новый срок, 0 — не записано.
  function postpone(id, now) {
    var due = tomorrowStart(now);
    var res = update(id, function (c) { c.due = due; });
    return res && res.ok ? due : 0;
  }

  function kindOf(id) {
    return id.slice(0, id.indexOf(":"));
  }

  // --- Порция дня ---

  function isHeavy(id) {
    return kindOf(id) === "pkg";
  }

  // День — местная дата: «сегодня» читателя кончается в его полночь, а не в полночь UTC.
  function dayKey(now) {
    var d = new Date(now);
    function two(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
  }

  // Счётчик дня, который не удалось записать (хранилище переполнено или запрещено): день продолжается
  // в памяти вкладки — иначе «Позже» не сдвигало бы очередь. Сбрасывается первой удавшейся записью.
  var todayMem = null;

  function wholeCount(v) {
    return typeof v === "number" && isFinite(v) && v >= 0 ? Math.floor(v) : -1;
  }

  // loadToday — счётчик дня по свежему чтению. Запись другого дня (вчерашняя, из будущего) и мусор
  // (не JSON, не карта, счётчики не числами, later не списком) — новый день с нуля. Хранилище при
  // этом не трогается: день начинает первая оценка или первое «Позже».
  function loadToday(now) {
    var day = dayKey(now);
    var v = todayMem && todayMem.day === day ? todayMem : readMap(TODAY).map;
    var done = wholeCount(v.done), heavy = wholeCount(v.heavy);
    if (v.day !== day || done < 0 || heavy < 0 || !Array.isArray(v.later)) return { day: day, done: 0, heavy: 0, later: [] };
    return { day: day, done: done, heavy: heavy, later: v.later.filter(function (id) { return typeof id === "string"; }) };
  }

  function saveToday(state) {
    todayMem = save(TODAY, state) ? null : state;
  }

  // countDone — оценена карточка с вышедшим сроком: место в порции занято, из отложенных она уходит.
  function countDone(id, now) {
    var state = loadToday(now);
    state.done++;
    if (isHeavy(id)) state.heavy++;
    state.later = state.later.filter(function (x) { return x !== id; });
    saveToday(state);
  }

  // portion — что из просроченного входит в порцию при таком счётчике дня. Мест — DAY_LIMIT − done,
  // тяжёлых — HEAVY_LIMIT − heavy (done бывает и больше предела: виджеты в главах оценивают карточки
  // сверх порции). Первыми место занимают отложенные: карточка, которую читатель отодвинул, остаётся в
  // сегодняшней порции, а не уступает место следующей из долга. Лёгкие идут по возрастанию iv, затем
  // срока — сначала то, что держится хуже всего. Карточки с кодом — только по сроку, самая просроченная
  // первой: мест для них мало, и при порядке по iv пакет с длинным интервалом ждал бы, пока не кончатся
  // пакеты с коротким (при одном месте в день, 18 пакетах и 25 % «Забыл» — до 44 дней сверх срока).
  // В общем проходе тяжёлая стоит как карточка с iv 0.
  // На выходе: лёгкие, тяжёлые по сроку (код — когда уже разогрелся), отложенные в порядке later.
  function portion(cards, state, now) {
    var due = dueIds(cards, now);
    var isDue = Object.create(null), taken = Object.create(null);
    due.forEach(function (id) { isDue[id] = true; });
    var room = Math.max(0, DAY_LIMIT - state.done);
    var heavyRoom = Math.max(0, HEAVY_LIMIT - state.heavy);
    function take(id, into) {
      if (!room || taken[id]) return;
      if (isHeavy(id)) {
        if (!heavyRoom) return;
        heavyRoom--;
      }
      room--;
      taken[id] = true;
      into.push(id);
    }
    var later = [], light = [], heavy = [];
    state.later.forEach(function (id) {
      if (isDue[id]) take(id, later);
    });
    function rank(id) {
      return isHeavy(id) ? 0 : num(cards[id].iv, 0);
    }
    due
      .slice()
      .sort(function (a, b) {
        // При равных ранге и сроке лёгкие — в прежнем порядке (dueIds; сортировка устойчива) и раньше
        // тяжёлых, тяжёлые между собой — по id: порядок не зависит от того, в каком порядке их завели.
        var ha = isHeavy(a), hb = isHeavy(b);
        return rank(a) - rank(b) || dueOf(cards[a]) - dueOf(cards[b]) || (ha - hb) ||
          (ha && hb ? (a < b ? -1 : a > b ? 1 : 0) : 0);
      })
      .forEach(function (id) {
        take(id, isHeavy(id) ? heavy : light);
      });
    var ids = light.concat(heavy, later);
    return { ids: ids, held: due.length - ids.length };
  }

  // queue — очередь на сейчас целиком: карточки, порция и сколько просроченных в неё не вошло.
  // При повреждённом algoSRS карточек нет (readMap отдаёт пустую карту) — пуста и порция.
  function queue(now) {
    var store = readMap(KEY);
    var cards = cardsOnly(store.map);
    var p = portion(cards, loadToday(now), now);
    return { damaged: store.damaged, cards: cards, ids: p.ids, held: p.held };
  }

  function today(now) {
    var q = queue(now == null ? Date.now() : now);
    return { ids: q.ids, held: q.held };
  }

  // later — «Позже»: карточка из сегодняшней порции уходит в её конец. Сама карточка (algoSRS) не
  // меняется, место в порции остаётся за ней, done не растёт. Запись — по свежему чтению; заодно из
  // списка уходят те, кого в порции уже нет (оценены, пропали). false — карточки в порции нет,
  // ничего не записано.
  function later(id, now) {
    now = now == null ? Date.now() : now;
    var ids = queue(now).ids;
    if (ids.indexOf(id) < 0) return false;
    var state = loadToday(now);
    state.later = state.later.filter(function (x, i, all) {
      return x !== id && ids.indexOf(x) >= 0 && all.indexOf(x) === i;
    });
    state.later.push(id);
    saveToday(state);
    return true;
  }

  function limitText() {
    return "в день не больше " + DAY_LIMIT + " " + plural(DAY_LIMIT, "карточки", "карточек", "карточек") +
      " и " + (HEAVY_LIMIT === 1 ? "одной" : HEAVY_LIMIT === 2 ? "двух" : HEAVY_LIMIT) + " с кодом";
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

  // quizQuestion — вопрос банка квиза (quiz.js грузится на каждой странице раньше srs.js) по его тексту.
  function quizQuestion(q) {
    var list = (window.ALGO_QUIZ && window.ALGO_QUIZ.questions) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].q === q) return list[i];
    }
    return null;
  }

  // mixShown — задача для карточки mix:: следующая по порядку банка после meta.last среди задач с главой-
  // ответом chapter, по кругу. meta.last ещё нет — после задачи промаха (miss), так что первый показ — уже
  // другая задача. Задача у шаблона одна — она сама. Выбор без случайности: перезагрузка показывает ту же.
  function mixShown(chapter, meta, miss) {
    var list = (window.ALGO_PROBLEMS || []).filter(function (p) { return p.c === chapter; });
    if (!list.length) return null;
    var keys = list.map(function (p) { return p.p + "." + p.f; });
    var last = typeof meta.last === "string" && keys.indexOf(meta.last) >= 0 ? meta.last : miss;
    return list[(keys.indexOf(last) + 1) % list.length];
  }

  function describe(id, card) {
    var meta = card.meta || {};
    if (kindOf(id) === "ch") {
      return { kind: "Глава", title: chapterTitle(meta.href || ""), href: meta.href || "", what: "Вспомни предусловие и инвариант, не заглядывая в текст, — потом сверься." };
    }
    // Карточка-вопрос несёт answer = { text, link: { text, href } }: то и другое показывается только
    // после «Показать ответ», и кнопки оценки — вместе с ним.
    if (kindOf(id) === "quiz") {
      // Ответ и глава — из банка квиза по тексту вопроса (как у mix: — из банка задач): у вопроса мог смениться
      // верный ответ или глава, а meta — снимок на момент промаха. Вопроса в банке больше нет — снимок.
      var qText = meta.q || id.slice(5);
      var cur = quizQuestion(qText);
      var pattern = (cur ? cur.correct : meta.pattern) || "";
      var qHref = cur ? cur.href : meta.href;
      return {
        kind: "Квиз: распознать шаблон",
        title: "Каким шаблоном это решается?",
        href: "",
        question: qText,
        // запись промаха без шаблона (собранный руками файл) — оценка без ответа, как раньше
        answer: !pattern ? null : qHref ? { link: { text: pattern, href: qHref } } : { text: pattern },
        what: "Назови шаблон и, главное, триггер в условии, по которому ты его узнал, — потом открой ответ: правильный ответ без триггера не считается.",
      };
    }
    if (kindOf(id) === "mix") {
      // Глава — из банка (ответ задачи мог смениться: у bigo.* в прежних карточках записано big-o), из
      // meta — только у задачи, которой в банке нет. Условие — другой задачи с той же главой-ответом.
      var prob = findProblem(meta.pkg, meta.fn);
      var mixChapter = prob ? prob.c : meta.chapter || "";
      var shownProb = prob ? mixShown(mixChapter, meta, (meta.pkg || "") + "." + (meta.fn || "")) : null;
      var chHref = mixChapter + ".html";
      var also = shownProb && Array.isArray(shownProb.a) ? shownProb.a.map(function (c) { return chapterTitle(c + ".html"); }) : [];
      return {
        kind: "Смешанная тренировка: узнай шаблон",
        title: shownProb ? "Каким шаблоном это решается?" : "Задача из смешанной тренировки",
        href: shownProb ? "" : "mixed.html",
        question: shownProb ? shownProb.s : "",
        answer: { link: { text: chapterTitle(chHref), href: chHref }, also: also },
        shown: shownProb ? shownProb.p + "." + shownProb.f : "",
        what: shownProb
          ? "Назови шаблон и примету в условии, по которой его узнал, — потом открой ответ."
          : "Её условия больше нет в банке. Вспомни, каким шаблоном она решалась, и открой ответ.",
      };
    }
    if (kindOf(id) === "viz") {
      // Ссылка ведёт прямо к виджету: «страница?viz=<тип>#якорь» (якорь пишет algo-viz.js с промахом).
      // Тип страхует позиционный якорь: разошёлся тип — algo-viz.js ведёт к первому виджету этого типа; у
      // прежних записей якоря нет — тоже к нему. Виджет переехал на другую страницу (VIZ_MOVED) —
      // старая запись ведёт на новую, без якоря: номер viz-N позиционный и на новой странице чужой.
      var vizType = id.slice(4), vizPage = meta.page || "", vizAnchor = meta.anchor || "";
      var moved = VIZ_MOVED[vizType];
      if (moved && vizPage === moved.from) { vizPage = moved.to; vizAnchor = ""; }
      return {
        kind: "Предсказание шага",
        title: meta.title || vizType,
        href: vizPage ? vizPage + "?viz=" + encodeURIComponent(vizType) + (vizAnchor ? "#" + vizAnchor : "") : "",
        what: "Развилка «строка " + (meta.line || "?") + ": " + (meta.code || "") + "» пошла не так, как ты предсказал. " +
          "Открой виджет по ссылке, включи 🎯 и пройди его заново от первого шага до последнего — перед каждым ответом проговори " +
          "условие по значениям в чипах. Проход без промахов и пропусков сам поставит карточке «Помню», промах — «Забыл».",
      };
    }
    if (kindOf(id) === "cx") {
      // Эталон — поле x банка (абзац «Ожидаемая сложность» заготовки). Глава здесь не ответ, а место
      // сверки: шаблон читатель узнал, промах был в цене кода.
      var task = findProblem(meta.pkg, meta.fn);
      var slug = (task && task.c) || meta.chapter || ""; // как у mix: — из банка, из meta только вне банка
      var chapter = slug ? { text: chapterTitle(slug + ".html"), href: slug + ".html" } : null;
      var derive = "Не открывая решение, выведи время и память: сколько раз выполняется каждый цикл, что растёт вместе с входом";
      if (task && task.x) {
        return {
          kind: "Собеседование: сложность",
          title: "Какая сложность у решения — по времени и по памяти?",
          href: "",
          question: task.s,
          answer: { text: task.x, link: chapter },
          what: derive + ", — потом открой ответ.",
        };
      }
      return {
        kind: "Собеседование: сложность",
        title: task
          ? "Какая сложность у решения — по времени и по памяти?"
          : (meta.pkg || "") + "." + (meta.fn || "") + ": какая сложность у решения — по времени и по памяти?",
        href: "",
        question: task ? task.s : "",
        see: chapter,
        what: (task
          ? "Эталонной оценки у этой задачи в банке нет. "
          : "Условия этой задачи больше нет в банке, эталонной оценки тоже. ") +
          derive + " — и сверься с главой.",
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
      // Карточка с кодом: условие функции из банка (уже без её имени — имя и подсказки покажет виджет за
      // кнопками) и виджет runner'а. code — что гонять: функция или, если годной нет, пакет целиком.
      var pkg = typeof meta.pkg === "string" && meta.pkg ? meta.pkg : id.slice(4);
      var fnRec = cardFn(pkg, metaOf(card));
      return {
        kind: "Пакет тренажёра",
        title: pkg,
        href: "",
        question: fnRec ? fnRec.s : "",
        code: { pkg: pkg, fn: fnRec ? fnRec.f : "" },
        what: fnRec
          ? "Напиши эту функцию с чистого листа — без подглядывания в главу. Оценку ставят тесты: зелёные без подсказок — «Помню», " +
            "с открытой подсказкой — «С трудом», «Сдаюсь» (показать эталон) — «Забыл»; красный прогон ничего не меняет."
          : "Реши пакет целиком с чистой заготовки: в банке задач нет его функции, которую можно решить отдельно с чистого листа. Оценку ставит зелёный " +
            "прогон «весь пакет» (с открытой подсказкой — «С трудом»), «Сдаюсь» на любом упражнении — «Забыл».",
      };
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

  // Перерисовки, которым нужно знать об изменении очереди (виджеты на «Повторении»). Счётчик в
  // панели обновляется отдельно — он есть на каждой странице, виджет только на «Повторении».
  var refreshers = [];

  var LATER_TITLE = "в конец сегодняшней порции; карточка и её срок не меняются";
  // С запасом больше задержки, с которой runner.js пишет черновик после ввода (400 мс).
  var DRAFT_SETTLE_MS = 1000;

  function build(root) {
    // Карточка на экране: { id, due }. Пока она в порции и её срок прежний, чужое событие (другая
    // вкладка, возврат на вкладку, новый день) меняет только шапку: полная перерисовка закрывала бы
    // раскрытый ответ карточки-вопроса и уводила бы карточку из-под рук.
    var current = null;
    // поле «в чём была ошибка», пока форма открыта: чужое событие её не стирает
    var noteInput = null;
    var top = null;
    // после действия читателя фокус клавиатуры остаётся в виджете: кнопка, которую он нажал, уже стёрта
    root.tabIndex = -1;

    function focusCard() {
      (root.querySelector(".algo-today__card") || root).focus();
    }

    function toast(text) {
      root.appendChild(el("div", "algo-today__toast", text));
    }

    function fillTop(q, now) {
      var total = Object.keys(q.cards).length;
      top.innerHTML = "";
      var head = el("div", "algo-today__head");
      head.appendChild(el("strong", null, q.ids.length ? "К повторению сегодня: " + q.ids.length : "На сегодня всё"));
      // «следующая через N дней» — о карточках, чей срок ещё не вышел; при остатке на завтра она путала бы
      var nd = q.held ? null : nextDueIn(q.cards, now);
      head.appendChild(el("span", "algo-today__sub", total
        ? "всего карточек " + total + (nd ? " · следующая через " + nd + " " + plural(nd, "день", "дня", "дней") : "")
        : "карточек пока нет"));
      top.appendChild(head);
      if (q.ids.length && q.held) {
        top.appendChild(el("p", "algo-today__held", "ещё " + q.held + " — не раньше завтра: " + limitText()));
      }
    }

    function emptyText(q) {
      if (q.held) {
        return "Ещё " + q.held + " " + plural(q.held, "придёт", "придут", "придут") + " не раньше завтра: " + limitText() + ".";
      }
      return Object.keys(q.cards).length
        ? "Ничего не просрочено — возвращайся завтра. Карточки заводятся сами: отметил главу пройденной, позеленел пакет в тренажёре, промахнулся в задаче."
        : "Отметь пройденную главу галочкой в её конце, реши пакет в тренажёре или промахнись в задаче — и здесь появится первая карточка.";
    }

    function render() {
      // Карточка пакета, оценённая на экране, уходит: её черновик стёрт при оценке, но читатель мог
      // печатать и после неё (виджет пишет черновик, пока он в документе) — стираем ещё раз.
      if (current && current.graded) dropDraft(current.pkg);
      noteInput = null;
      current = null;
      var now = Date.now();
      var q = queue(now);
      root.innerHTML = "";

      if (q.damaged) {
        root.appendChild(el("p", "algo-today__empty",
          "Сохранённые карточки повторений повреждены (ключ algoSRS не разбирается), поэтому книга их не трогает и не перезаписывает. " +
          "Вернуть их можно кнопкой «Импорт» на странице шпаргалки — из файла прогресса, который вы выгружали раньше. " +
          "Без файла удалите ключ algoSRS в хранилище браузера (DevTools → Application → Local Storage): карточки заведутся заново " +
          "из отметок глав, решённых пакетов и промахов, но интервалы и заметки прежних повторений пропадут."));
        return;
      }

      top = el("div", "algo-today__top");
      root.appendChild(top);
      fillTop(q, now);

      if (!q.ids.length) {
        root.appendChild(el("p", "algo-today__empty", emptyText(q)));
        return;
      }

      var id = q.ids[0];
      var card = q.cards[id];
      var info = describe(id, card);
      // hold — карточку на экране не перерисовывать чужими событиями (её оценил виджет на ней, читатель
      // смотрит итог или эталон); settled — оценка этого показа уже поставлена; up — ответил ли runner
      // (null — ещё неизвестно); graded — записана оценка, черновик пакета стирается при уходе.
      var cur = current = { id: id, due: dueOf(card), hold: false, settled: false, graded: false, up: null, pkg: "" };

      var box = el("div", "algo-today__card");
      box.tabIndex = -1;
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
      if (info.see) {
        var see = el("p", "algo-today__see", "Глава: ");
        var seeLink = el("a", null, info.see.text);
        seeLink.href = info.see.href;
        see.appendChild(seeLink);
        box.appendChild(see);
      }

      if (card.note) {
        box.appendChild(el("p", "algo-today__note", "В прошлый раз: " + card.note));
      }

      var actions = el("div", "algo-today__actions");
      // «Позже» — на каждой карточке и до ответа тоже: карточка уходит в конец сегодняшней порции,
      // её расписание не меняется. Единственная в порции остаётся на месте — очередь не запирается.
      // Карточку с кодом без runner'а сегодня не решить: «Позже» переносит её на завтра (tomorrow).
      var laterBtn = el("button", "algo-quiz__btn algo-today__later", "Позже");
      laterBtn.type = "button";
      laterBtn.title = LATER_TITLE;
      laterBtn.onclick = function () {
        if (cur.up === false) {
          tomorrow();
          return;
        }
        later(id, Date.now());
        render();
        if (current && current.id === id) toast("Других карточек в сегодняшней порции нет — эта осталась на месте.");
        focusCard();
      };

      var mount = null;
      if (info.code) {
        mount = codeCard(info.code);
      } else {
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
              askNote(function (note) { apply(g[0], note); });
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
            var ans = el("p", "algo-today__answer", "Ответ: " + (info.answer.text || ""));
            if (info.answer.link) {
              if (info.answer.text) ans.appendChild(document.createTextNode(". Глава: "));
              var link = el("a", null, info.answer.link.text);
              link.href = info.answer.link.href;
              ans.appendChild(link);
            }
            // альтернативы показанной задачи (поле a банка): их выбор в смешанной тоже засчитывается
            if (info.answer.also && info.answer.also.length) {
              ans.appendChild(document.createTextNode("; также решается: " + info.answer.also.join(", ")));
            }
            ans.tabIndex = -1;
            box.insertBefore(ans, actions);
            actions.removeChild(reveal);
            bar.style.display = "";
            ans.focus(); // кнопка, на которой стоял фокус, только что убрана
          };
          actions.appendChild(reveal);
        }
        actions.appendChild(bar);
      }
      actions.appendChild(laterBtn);
      box.appendChild(actions);
      root.appendChild(box);
      // runner.js ищет виджеты в документе — поднимать его можно только после вставки карточки
      if (mount) mount();

      function tomorrow() {
        var due = postpone(id, Date.now());
        render();
        toast(due
          ? "Без runner'а карточку с кодом не решить — перенёс её на завтра; интервал не изменился."
          : "Не удалось перенести карточку: хранилище браузера недоступно или переполнено.");
        focusCard();
      }

      // codeCard — карточка пакета: виджет «Реши прямо здесь» (runner.js) с функцией карточки и своим
      // черновиком. Оценку ставят его события: зелёный прогон — здесь, по событию СВОЕГО узла; «Сдаюсь» —
      // общий слушатель страницы (onGiveup), он зовёт view на узле. Оценённая карточка остаётся на
      // экране до «Дальше»: читатель смотрит итог прогона или эталон, а не следующую карточку.
      function codeCard(code) {
        cur.pkg = code.pkg;
        var node = el("div", "algo-runner");
        node.setAttribute("data-pkg", code.pkg);
        if (code.fn) node.setAttribute("data-func", code.fn);
        node.setAttribute("data-draft", "review");
        if (RACE_PKGS.indexOf(code.pkg) >= 0) node.setAttribute("data-race", "true");
        box.appendChild(node);
        var down = el("p", "algo-today__down");
        down.hidden = true;
        box.appendChild(down);
        var partial = el("p", "algo-today__partial");
        partial.hidden = true;
        box.appendChild(partial);

        function runnerDown(text) {
          cur.up = false;
          down.textContent = text;
          down.hidden = false;
          laterBtn.title = "на завтра: без runner'а карточку не решить; интервал и срок повторений не меняются";
        }
        node.addEventListener("algo-runner:state", function (e) {
          var d = e.detail || {};
          if (d.up === false) {
            runnerDown("Этой карточке нужен runner, а он не отвечает: подними его (как — написано в виджете) или нажми «Позже» — " +
              "карточка перенесётся на завтра, её интервал не изменится.");
          } else if (d.up === true) {
            cur.up = true;
            down.hidden = true;
            laterBtn.title = LATER_TITLE;
          }
        });

        var view = node.__algoTodayCard = {
          settled: function () { return cur.settled; },
          hold: function () { cur.hold = true; },
          graded: function (res, grade) {
            if (res.status === "graded") {
              cur.graded = true;
              // Виджет пишет черновик через 400 мс после ввода, а прогон, нажатый сразу после правки,
              // оценивается раньше: та запись придёт уже после стирания. Стираем ещё раз, когда она прошла.
              setTimeout(function () { dropDraft(cur.pkg); }, DRAFT_SETTLE_MS);
              settle(verdict(res, grade));
            } else if (res.status === "early") {
              settle("Эту карточку уже оценили в другой вкладке — оставил как есть.");
            } else {
              cur.hold = false;
              if (res.status === "unsaved") toast("Не удалось сохранить оценку: хранилище браузера недоступно или переполнено. Карточка осталась в очереди.");
            }
          },
        };
        node.addEventListener("algo-runner:result", function (e) {
          var d = e.detail || {};
          // только зелёный прогон своего листа: виджет на экране, черновик карточки, тот же пакет, не
          // списанный с эталона (после «Сдаюсь» оценка уже стоит), та же функция — или пакет целиком
          if (cur.settled || !node.isConnected || d.draft !== "review" || d.pkg !== code.pkg || !d.ok || d.gaveUp) return;
          if (!code.fn && d.unit !== "pkg") {
            // Карточка пакета целиком: зелёное упражнение её не оценивает — без этой строки первые зелёные
            // прогоны выглядели бы как «ничего не произошло».
            partial.textContent = "✓ Упражнение зелёное. Карточку засчитает зелёный прогон всего пакета — пункт «весь пакет» в списке упражнений.";
            partial.hidden = false;
            return;
          }
          if (code.fn ? d.fn !== code.fn : d.unit !== "pkg") return;
          var grade = d.hints > 0 ? "hard" : "good";
          view.hold();
          view.graded(gradePkg(code.pkg, code.fn, grade, Date.now()), grade);
        });

        function settle(text) {
          cur.settled = true;
          partial.hidden = true; // оценка стоит — подсказка про «весь пакет» больше не нужна
          box.insertBefore(el("p", "algo-today__verdict", text), actions);
          var next = el("button", "algo-quiz__btn algo-today__next", "Дальше →");
          next.type = "button";
          next.onclick = function () {
            render();
            focusCard();
          };
          actions.replaceChild(next, laterBtn);
        }
        function verdict(res, grade) {
          var days = Math.max(1, Math.round((res.due - Date.now()) / DAY));
          var when = "следующее повторение через " + days + " " + plural(days, "день", "дня", "дней");
          if (grade === "good") return "✓ Тесты зелёные без подсказок — «Помню»: " + when + ".";
          if (grade === "hard") return "✓ Тесты зелёные, но с подсказкой — «С трудом»: " + when + ".";
          var back = (loadCards()[id] || {}).back;
          return "Эталон показан — это «Забыл»: " + when +
            (back > 1 ? ", потом — через " + back + " " + plural(back, "день", "дня", "дней") : "") +
            (code.fn ? "; эта функция придёт на карточке первой." : ".");
        }

        return function mount() {
          if (typeof window.ALGO_RUNNER_INIT === "function") window.ALGO_RUNNER_INIT();
          else runnerDown("Этой карточке нужен runner, а виджет тренажёра на странице не загрузился. Нажми «Позже» — " +
            "карточка перенесётся на завтра, её интервал не изменится.");
        };
      }

      // Оценка идёт через report: он читает хранилище заново и меняет одну карточку, а не
      // пишет обратно всё, что виджет прочитал при отрисовке.
      function apply(grade, note) {
        // Карточка mix: показывала другую задачу шаблона — в той же записи, что и оценка, она становится
        // meta.last, и следующий показ возьмёт следующую.
        var res = info.shown
          ? gradeCard(id, grade, Date.now(), { note: note }, function (c) {
            if (!isCard(c.meta)) c.meta = {};
            c.meta.last = info.shown;
          })
          : report(id, grade, Date.now(), { note: note });
        render();
        if (res.status === "unsaved") {
          toast("Не удалось сохранить оценку: хранилище браузера недоступно или переполнено. Карточка осталась в очереди.");
        } else if (res.status === "early") {
          toast("Эту карточку уже оценили в другой вкладке — оставил как есть.");
        } else if (res.status === "graded") {
          var days = Math.max(1, Math.round((res.due - Date.now()) / DAY));
          var text = "Следующее повторение через " + days + " " + plural(days, "день", "дня", "дней");
          var back = grade === "again" ? (loadMap(KEY)[id] || {}).back : 0;
          if (back > 1) text += ", потом — через " + back + " " + plural(back, "день", "дня", "дней");
          toast(text);
        }
        focusCard();
      }

      // Дневник ошибок: «забыл» — единственный момент, когда причина ещё в
      // голове. Формулировка своими словами и есть то, что превращает промах в
      // знание, поэтому её показываем при следующем повторе этой же карточки.
      function askNote(done) {
        if (noteInput) {
          noteInput.focus(); // форма уже открыта: второе «Забыл» вторую не заводит
          return;
        }
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
          noteInput = null;
          done(input.value.trim());
        };
        wrap.appendChild(ok);
        box.appendChild(wrap);
        noteInput = input;
        input.focus();
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); ok.click(); }
        });
      }
    }

    // Очередь изменилась не из этого виджета: другая вкладка, report из другого скрипта, возврат на
    // вкладку, новый день. Порция пересчитывается всегда; карточка на экране остаётся, пока она в
    // порции и её срок прежний, а с открытой формой заметки — в любом случае (её текст ещё не записан).
    function refresh() {
      var now = Date.now();
      var q = queue(now);
      var keep = current && !q.damaged &&
        (noteInput || current.hold || (q.ids.indexOf(current.id) >= 0 && dueOf(q.cards[current.id]) === current.due));
      if (!keep) {
        render();
        return;
      }
      fillTop(q, now);
    }

    refreshers.push(refresh);
    // уход со страницы (перезагрузка, переход) с оценённой карточкой пакета на экране — как «Дальше»:
    // черновик, дописанный после оценки, не должен открыться на следующем показе карточки
    window.addEventListener("pagehide", function () {
      if (current && current.graded) dropDraft(current.pkg);
    });
    render();
  }

  // Счётчик «🔁 Сегодня: N» — на КАЖДОЙ странице: очередь, о которой не напоминает ни одна
  // страница, кроме собственной, не работает. N — порция дня (today().ids.length), а не всё
  // просроченное. Ставится в правую часть верхней панели mdBook первой кнопкой (порядок остальных
  // не меняется); нет панели — под заголовком главы. Пока карточек на сегодня нет, элемента нет
  // вовсе: страница не дёргается и не мигает.
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

  function refreshBadge() {
    var t = today();
    var n = t.ids.length;
    if (!badge) {
      if (!n) return;
      badge = makeBadge();
      if (!badge) return;
    }
    badge.hidden = !n;
    badge.querySelector(".algo-srs-badge__n").textContent = String(n);
    var title = "К повторению сегодня: " + n + " " + plural(n, "карточка", "карточки", "карточек") +
      (t.held ? ", ещё " + t.held + " — не раньше завтра" : "");
    badge.title = title;
    badge.setAttribute("aria-label", title);
  }

  function refreshViews() {
    refreshBadge();
    refreshers.forEach(function (f) { f(); });
  }

  // Вкладка на экране через полночь: порция нового дня приходит сама, без действий читателя. Один таймер
  // до следующей местной полуночи с запасом в две секунды (срабатывание вплотную к границе ещё могло бы
  // попасть во вчерашний день), по срабатыванию — та же перестройка, что при возврате на вкладку, и
  // перевзвод на следующие сутки. Локальный конструктор Date сам учитывает перевод часов.
  function armMidnight() {
    var now = Date.now();
    var d = new Date(now);
    var next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 2).getTime();
    var timer = setTimeout(function () {
      refreshViews();
      armMidnight();
    }, Math.max(1000, next - now));
    // в node таймер не держит процесс (jsdom отдаёт число — там проверки выходят сами)
    if (timer && typeof timer.unref === "function") timer.unref();
  }

  // «Сдаюсь» в любом виджете runner'а на любой странице (глава, смешанная тренировка, «Повторение») —
  // слушатель один, здесь: карточка пакета получает «Забыл» или заводится на завтра. Если это виджет
  // карточки «Повторения», он узнаёт итог через view на своём узле. Эталон после ЗЕЛЁНОГО прогона той же
  // функции на этой странице — сверка, а не «сдаюсь»: иначе «Помню», поставленное тестами, тут же
  // сменялось бы на «Забыл», стоило читателю сравнить своё решение с эталоном.
  var greenHere = {}; // «<pkg>.<fn>» и «<pkg>.*» (пакет целиком) — зелёные прогоны этой страницы
  function onRunnerResult(e) {
    var d = e.detail || {};
    if (!d.ok || d.gaveUp || typeof d.pkg !== "string") return;
    greenHere[d.pkg + "." + (d.unit === "pkg" ? "*" : d.fn)] = true;
  }
  function onGiveup(e) {
    var d = e.detail || {};
    if (typeof d.pkg !== "string" || !d.pkg) return;
    var fn = typeof d.fn === "string" ? d.fn : "";
    if (greenHere[d.pkg + ".*"] || greenHere[d.pkg + "." + fn]) return;
    var view = e.target && e.target.__algoTodayCard;
    if (view && view.settled()) return;
    if (view) view.hold(); // до записи: событие algo-srs:change иначе стёрло бы карточку с эталоном
    var res = giveup(d.pkg, fn, Date.now());
    if (view) view.graded(res, "again");
  }

  window.ALGO_SRS = {
    schedule: schedule,
    sync: sync,
    report: report,
    load: loadCards,
    due: function (now) { return dueIds(loadCards(), now == null ? Date.now() : now); },
    damaged: function () { return readMap(KEY).damaged; },
    today: today,
    later: later,
    giveup: giveup,
    limits: { cards: DAY_LIMIT, heavy: HEAVY_LIMIT },
    racePkgs: RACE_PKGS.slice(),
  };

  function init() {
    sync(Date.now());
    refreshBadge();
    document.addEventListener(CHANGE_EVENT, refreshViews);
    document.addEventListener("algo-runner:result", onRunnerResult);
    document.addEventListener("algo-runner:giveup", onGiveup);
    window.addEventListener("storage", function (e) {
      if (e.key === null || e.key === KEY || e.key === TODAY) refreshViews();
    });
    // Вкладка, открытая со вчера: сроки подошли и день сменился, а событий не было. Порция
    // пересчитывается, когда читатель возвращается к странице, и в местную полночь (armMidnight) —
    // если вкладка всё это время на экране; карточку на экране виджет при этом бережёт (refresh).
    armMidnight();
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refreshViews();
    });
    window.addEventListener("focus", refreshViews);
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) refreshViews(); // страница поднята из кэша переходов: скрипты заново не шли
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
