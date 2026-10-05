# Infra-viz: Kafka — лаборатория `kafka-lab/`, глава `kafka.md`, виджеты `kafka-log` и `kafka-partition` — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать читателю первую часть Kafka: новую главу простым языком (лог только на дозапись, offset, партиции, ключ → партиция, consumer group в части «где я остановился» — offset и lag) и два виджета — `kafka-log` (журнал, читатели, фиксация позиции, потеря/повтор сообщений при падении читателя) и `kafka-partition` (ключ → партиция по настоящему алгоритму Kafka). Всё, что глава говорит о настоящей Kafka, измерено на лаборатории `kafka-lab/` (контейнер `apache/kafka`), а модель партиционирования сверена с ней через сохранённый «золотой» файл.

**Architecture:** Лаборатория по образцу `pglab/`/`redislab/` (Docker, loopback, версия пришпилена, не в CI) + `kafka-lab/measure.sh` с разделами `log|partition|group|fixture`. Раздел `fixture` пишет `scripts/fixtures/kafka-partitions.json` — какую партицию выбрала НАСТОЯЩАЯ Kafka для набора ключей при 3 и 6 партициях; node-тест требует полного совпадения JS-модели `murmur2` с этим файлом (файл правится только скриптом при живой Kafka, в CI Docker не нужен). Новый файл темы `assets/infra-kafka.js` (формат как у `infra-redis.js`), вписывается в `book.toml`. Виджеты встраиваются в новую главу `src/kafka.md` (группа 8, `lvl: ext`).

**Tech Stack:** Docker, образ `apache/kafka:3.9.1` (режим KRaft, один брокер; скачан локально, 563 МБ), shell (POSIX), vanilla JS, mdBook, jsdom, Playwright MCP для проверки в браузере. Docker нужен ТОЛЬКО в Task 1.

**Spec:** `docs/superpowers/specs/2026-10-01-infra-visualization-design.md` (раздел Kafka). Этот план — первая половина; `kafka-group` (ребаланс) и `kafka-isr` (репликация, трёхброкерная лаборатория) — следующий план. Предыдущие планы слиты (`…-redis-resp-ttl.md` — образец формата, golden-механизма и лаборатории).

## Global Constraints

- Язык контента русский, листинги Go (спека). Объяснять простым языком: аналогия ДО определения; каждый термин (offset, партиция, брокер, топик, consumer group, lag, commit, at-least-once) вводится до первого использования.
- Формат файла темы: записи `    "тип": {` (4 пробела) внутри `var INFRA = {`, листинги в `var CODE = {`, оба блока закрываются `\n  };`; регистрация `Object.keys(INFRA).forEach(function (t) { window.ALGO_VIZ.register(t, INFRA[t], CODE[INFRA[t].codeKey]); });` в конце; генераторы — чистые функции ДО строки-стража `if (typeof window === "undefined" || !window.ALGO_VIZ) return;` и экспортируются для node (`exportsForTest`/`module.exports`, как в `infra-redis.js`); файл начинается с `var core = (typeof module !== "undefined" && module.exports) ? require("./infra-core.js") : window.ALGO_VIZ_INFRA;`; вписан в `book.toml` сразу после `infra-redis.js`; `inputs:` одной строкой, `presets:` по одному на строку, `lineNotes` одной строкой. Образец формата — `assets/infra-redis.js`, читать его первым.
- Правила генераторов (CLAUDE.md): снимок = состояние ПОСЛЕ подсвеченной строки; одна строка листинга — один кадр; чип — только переменная, живая на этой строке («—» до объявления, вне области видимости и на кадре `done`); имя чипа — идентификатор из листинга; листинг объявляет всё, что делает генератор; пресет задаёт РОВНО поля `inputs` типа и не дублирует кнопку «пример главы»; 🎯 спрашивает на строках `if/for … {`, верный ответ — следующий кадр = L+1.
- Уроки прежних планов: (а) у каждого пункта легенды есть `.algo-tp__legdot--<cls>` с hex-цветом в `assets/infra-viz.css`, тест выводит список из массива легенды; легенда по типам; (б) числа после двоеточия или `core.plural`; (в) под каждым виджетом в главе — предложение о границах модели; (г) «живой источник — правда»: расхождение модели с лабораторией чинится в МОДЕЛИ; (д) НИКАКИХ утверждений о настоящей Kafka без источника: измеренное подаётся как «измерено на Kafka <версия из лаборатории>» с воспроизводимой командой (`kafka-lab/measure.sh <раздел>`), поведение собственной модели — как «в нашей модели»; если факт не измерен и не очевиден из исходника алгоритма — его в главе нет; (е) не объяснять причины, которых не измеряли (внутренности контроллера, устройство индексов).
- Критерии готовности: `node scripts/infra-viz-check.js`, `check-viz.js`, `check-registries.js`, `check-challenges.js`, `mdbook build` + `check-links.js`, `predict-check.js`, `viz-render-check.js` (~25 мин, фон), `check-viz-names.js` (~8 мин, фон), из `exercises/`: `gofmt -l .`, `go vet -tags solution ./...`, `go test -tags solution -count=1 ./...`, `go run ./cmd/checksnippets -src ../src` — зелёные; soft-skip ≠ pass.
- Среда: `main` опережает `origin` — ничего не пушить; работать в worktree `.worktrees/kafka` (ветка `infra-viz-kafka`, `.worktrees/` в `.gitignore`); субагенты иногда падают с API 403 — `SendMessage`-resume; если Docker Desktop завис — `DOCKER_CONTEXT=default`; коммиты заканчиваются строкой `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. `murmur2` в JS даёт ту же партицию, что настоящая Kafka, на КАЖДОМ ключе фикстуры (3 и 6 партиций, включая не-ASCII, пустую строку, ключи длины 0–7 для всех четырёх хвостов `len%4`, отрицательный хеш → `toPositive`).
2. `kafka-log`: committed offset = «следующее к чтению» (после чтения 0,1,2 фиксируется 3), lag = конец журнала − committed; падение читателя до `commit` ведёт к ПОВТОРУ уже обработанных сообщений, а не к потере; `commit` до обработки + падение — к ПОТЕРЕ; пустой poll, poll за концом, второй читатель в другой группе читает с нуля независимо — всё это совпадает с измерением на лаборатории.
3. `kafka-partition`: порядок сообщений одного ключа внутри партиции сохраняется, между партициями порядка нет; одинаковые ключи — одна партиция; смена числа партиций переселяет ключи (измерено фикстурой 3→6).
4. В главе нет неизмеренных утверждений о настоящей Kafka; каждое прослеживается до сырого вывода в отчёте Task 1.
5. Лаборатория: только loopback, версия пришпилена и печатается, не в CI, воспроизводима с нуля (`make kafka-lab` ждёт готовности по настоящей команде, а не по статусу контейнера), `make kafka-lab-down` стирает данные.
6. Реестры: глава в `SUMMARY.md`, `progress.js` (`lvl: ext`), счётчики в `CLAUDE.md` (ext 26 → 27) и `check-registries.js` зелёные; файл темы вписан в `book.toml`.

## File Structure

| Файл | Ответственность |
|---|---|
| `kafka-lab/docker-compose.yml`, `kafka-lab/measure.sh` (создать) | одиночный брокер KRaft на loopback; замеры `log|partition|group|fixture|all` |
| `Makefile` (изменить) | цели `kafka-lab`, `kafka-shell`, `kafka-lab-down` по образцу `redis-lab` |
| `scripts/fixtures/kafka-partitions.json` (создать, генерируется `measure.sh fixture`) | `{ version, runs: [{ partitions, keys: [{key, partition}] }] }` |
| `assets/infra-kafka.js` (создать) | `murmur2`, `partitionFor`, `bKafkaPartition`, `parseProduce`; `parseLogScript`, `logExec`, `bKafkaLog`; рисунки; записи INFRA (2), листинги CODE (2), регистрация |
| `assets/infra-viz.css` (изменить) | стили `.iv-kafka*` + legdot-правила |
| `book.toml` (изменить) | `assets/infra-kafka.js` после `infra-redis.js` |
| `scripts/infra-viz-check.js` (изменить) | murmur2 против фикстуры, модель журнала, jsdom обоих типов, легенда |
| `src/kafka.md` (создать), `src/SUMMARY.md`, `assets/progress.js` (изменить) | глава и реестры |
| `CLAUDE.md` (изменить) | типы Kafka, `kafka-lab/` рядом с `redislab/`, счётчики |

---

### Task 1: Лаборатория `kafka-lab/` и замеры (фундамент фактов)

**Files:** Create `kafka-lab/docker-compose.yml`, `kafka-lab/measure.sh`, `scripts/fixtures/kafka-partitions.json`; Modify `Makefile`.

**Interfaces:**
- Produces: `scripts/fixtures/kafka-partitions.json` = `{ "version": "<версия Kafka из лаборатории>", "runs": [ { "partitions": 3, "keys": [ { "key": "...", "partition": N } ] }, { "partitions": 6, "keys": [...] } ] }` — ключи ОДНИ И ТЕ ЖЕ в обоих запусках (не меньше 40): `user-1`…`user-20`, `a`, `b`, `c`, `ab`, `abc`, `abcd`, `abcde`, `abcdef`, `abcdefg`, `order-42`, `Привет`, `日本`, `🙂`, ключ из 33 символов, ключ из 100 символов; пустую строку проверить отдельно (если console-producer её не передаёт — записать это в отчёт, в фикстуру не класть). Продюсер и сверка партиции — настоящие утилиты Kafka внутри контейнера.
- Produces (в отчёт): сырой вывод всех замеров ниже, версия Kafka (`kafka-topics.sh --version`), образ с digest, воспроизводимые команды.

Лаборатория: официальный образ `apache/kafka:3.9.1` запускается с настройками по умолчанию (одиночный KRaft-брокер, слушает `localhost:9092` ВНУТРИ контейнера); утилиты в `/opt/kafka/bin/`; все команды идут через `docker exec` (порт на хост не публикуется, если не понадобится — тогда `127.0.0.1:29092`, ниже эфемерного диапазона Linux). Контейнер `algo-kafkalab`. Если стандартной конфигурации достаточно — переменных окружения не добавлять. Комментарий в начале compose-файла — как у `redislab/docker-compose.yml` (что делает, как поднять/погасить, почему порт/loopback, где digest, `DOCKER_CONTEXT=default`).

- [ ] **Step 1: compose + Makefile.** Цели `kafka-lab` (поднять и ждать готовности НАСТОЯЩЕЙ командой: `docker exec algo-kafkalab /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list` завершается с кодом 0; до 90 секунд), `kafka-shell` (`docker exec -it algo-kafkalab sh`), `kafka-lab-down` (`cd kafka-lab && docker compose down -v`). Проверить с нуля: `make kafka-lab-down; make kafka-lab` — готов, версия печатается.
- [ ] **Step 2: `measure.sh log`** (топик с 1 партицией, имя уникальное на запуск или удаляется в начале раздела). Замерить и напечатать сырьём: (а) создание топика и `--describe`; (б) продюсер шлёт 5 сообщений, `kafka-get-offsets.sh` (последний offset = 5, смысл «следующий записываемый»); (в) `kafka-console-consumer.sh --from-beginning --property print.offset=true --property print.partition=true --max-messages 5` — offset'ы 0..4 подряд; (г) читатель БЕЗ группы с `--offset 3 --partition 0` читает с позиции 3; (д) `kafka-dump-log.sh --files <файл .log партиции> --print-data-log` — показать, что сообщения лежат в файле подряд (путь найти через `docker exec ... find /tmp -name '*.log'`; если путь иной в этом образе — записать как есть); (е) попытка «изменить» сообщение невозможна — в отчёт ничего не придумывать, это не измеряем.
- [ ] **Step 3: `measure.sh group`.** Группа `g1` читает 3 из 5 (`--group g1 --max-messages 3`, offset автофиксируется при выходе) → `kafka-consumer-groups.sh --describe --group g1` печатает CURRENT-OFFSET=3, LOG-END-OFFSET=5, LAG=2 (записать сырьём); повторный запуск той же группы читает сообщения с offset 3 и 4 (то есть «следующее к чтению»); новая группа `g2` с `--from-beginning` видит всё независимо от g1; новая группа без `--from-beginning` на уже заполненном топике НЕ видит старые сообщения (`auto.offset.reset=latest`) — проверить таймаутом `--timeout-ms 5000` и записать фактический вывод. Сценарий повтора/потери: читатель с `--property enable.auto.commit=false` (через `--consumer-property enable.auto.commit=false`) читает 3 и выходит без фиксации → следующий запуск той же группы читает с offset 0 снова (повтор); зафиксированная позиция до обработки — моделируется в виджете, на Kafka её не меряем (в отчёте указать «не измерено, это логика приложения»).
- [ ] **Step 4: `measure.sh partition` и `fixture`.** Топик с 3 партициями; продюсер с `--property parse.key=true --property key.separator=:` шлёт `<ключ>:<значение>` для всех ключей; считать обратно `kafka-console-consumer.sh --from-beginning --property print.key=true --property print.partition=true --property print.offset=true --timeout-ms 8000` и разобрать пары ключ→партиция (awk). Убедиться, что все сообщения одного ключа — в одной партиции, а в каждой партиции offset'ы идут подряд с 0. Повторить с 6 партициями (новый топик). `fixture` пишет JSON (только если для каждого ключа партиция одна и та же во всех его сообщениях; иначе падает громко). Печатает сводку: сколько ключей сменили партицию между 3 и 6. Отдельно замерить сообщение БЕЗ ключа (30 штук) в топик с 3 партициями: распределение по партициям записать как есть (поведение «липкого» назначения зависит от версии клиента — в главе только измеренное, с версией).
- [ ] **Step 5: `measure.sh all`** — все разделы подряд, код выхода 0; идемпотентность (повторный запуск после `all` тоже 0: топики с уникальными именами или пересоздаются). Скрипт POSIX sh, `set -euf`, `shellcheck -s sh` чист (если shellcheck есть), `trap` убирает временные топики.
- [ ] **Step 6: коммит.** `git add kafka-lab Makefile scripts/fixtures/kafka-partitions.json && git commit` (сообщение по-русски, с Co-Authored-By). В отчёт — сырые выводы всех разделов, список ключей, число переехавших ключей, версия, digest образа. Закончить `make kafka-lab-down`.

---

### Task 2: Виджет `kafka-partition` и `murmur2` (сверка с настоящей Kafka)

**Files:** Create `assets/infra-kafka.js`; Modify `assets/infra-viz.css`, `book.toml`, `scripts/infra-viz-check.js`.

**Interfaces:**
- Consumes: `scripts/fixtures/kafka-partitions.json` (Task 1).
- Produces (экспорт для node): `murmur2(bytes: Uint8Array) → int32`, `partitionFor(key: string, n: number) → number`, `parseProduce(text) → { msgs: [{key, val}], bad: [...] }`, `bKafkaPartition(msgs, n) → steps`.

Черновик `murmur2` (порт `org.apache.kafka.common.utils.Utils.murmur2`; ИСТИНА — фикстура, при расхождении чинить код, не фикстуру):

```js
function murmur2(bytes) {
  var m = 0x5bd1e995, r = 24, len = bytes.length;
  var h = (0x9747b28c ^ len) | 0;
  var len4 = len >> 2;
  for (var i = 0; i < len4; i++) {
    var i4 = i * 4;
    var k = (bytes[i4] & 0xff) | ((bytes[i4 + 1] & 0xff) << 8) | ((bytes[i4 + 2] & 0xff) << 16) | ((bytes[i4 + 3] & 0xff) << 24);
    k = Math.imul(k, m); k ^= k >>> r; k = Math.imul(k, m);
    h = Math.imul(h, m); h ^= k;
  }
  var tail = len & ~3;
  switch (len % 4) {
    case 3: h ^= (bytes[tail + 2] & 0xff) << 16; // fallthrough
    case 2: h ^= (bytes[tail + 1] & 0xff) << 8;  // fallthrough
    case 1: h ^= bytes[tail] & 0xff; h = Math.imul(h, m);
  }
  h ^= h >>> 13; h = Math.imul(h, m); h ^= h >>> 15;
  return h | 0;
}
function partitionFor(key, n) { return (murmur2(utf8(key)) & 0x7fffffff) % n; }
```

`utf8(str)` — свои байты UTF-8 без `TextEncoder` в зависимостях (в node и браузере `TextEncoder` есть — можно им). Ключи в виджете: ASCII и любой текст (кодируется UTF-8, как у настоящего продюсера).

Виджет `kafka-partition`: входы `data-msgs` (сообщения через `; `, формат `ключ=значение`, значение необязательно, не более 16 сообщений, ключ не пустой — пустой не поддерживается и попадает в `bad`) и `data-partitions` (1…8). Пример главы: `data-msgs="user-1=вход; user-2=вход; user-1=заказ; user-3=вход; user-2=оплата; user-1=выход"`, `data-partitions="3"`.

Листинг (Go; строки нумеровать с 0 в `CODE`, генератор эмитит кадр на каждую):

```go
func produce(msgs []Msg, n int) [][]Msg {
    logs := make([][]Msg, n)
    for _, m := range msgs {
        h := murmur2([]byte(m.Key))
        p := int(h&0x7fffffff) % n
        logs[p] = append(logs[p], m)
    }
    return logs
}
```

Кадры (по строкам): объявление `logs` (n пустых журналов); заголовок `for` (кадр берёт следующее сообщение либо цикл кончается; 🎯 «попадёт ли сообщение в тело» — см. правило движка); `h := …` (чип `h` — число хеша ДЕСЯТИЧНОЕ со знаком, как Java `int`); `p := …` (чип `p`; подсветить журнал `p`); `append` (сообщение появляется в конце журнала p с его offset = прежняя длина журнала, чип `n` остаётся числом партиций); `return` (кадр `done`). Чипы: `n`, `m` (текущее сообщение `ключ`), `h`, `p`. Рисунок: n колонок-журналов («партиция 0…»), клетки-сообщения с offset сверху и ключом внутри, цвет клетки зависит от ключа (стабильная палитра по порядку первого появления ключа, 6 цветов + повтор); справа от текущего сообщения строка вычисления: `murmur2("user-1") = -123…; & 0x7fffffff = …; % 3 = 1`. После `done` — сводка «порядок внутри партиции» (для каждого ключа: все его сообщения лежат в одной партиции и идут в порядке отправки). Легенда по типу: «текущее сообщение», «уже записано», «сообщения одного ключа — один цвет» (если цвета не имеют единого CSS-класса, пункт легенды описывает схему текстом без точки). Пресеты (по одному на строке, поля ровно `data-msgs` и `data-partitions`): «один ключ — одна партиция» (одно значение ключа 6 раз, 3 партиции); «партиций больше, чем ключей» (2 ключа, 6 партиций — часть партиций пуста); «добавили партицию» (те же 6 ключей `user-1…user-6`, 4 партиции — сравнить с примером главы вручную, в `hint` написать, что с 3 на 4 часть ключей переехала); «ключи с хвостом» (ключи длины 1,2,3,4,5 — все четыре случая хвоста); «не только латиница» (`Привет`, `日本`, `🙂` — байты UTF-8).

- [ ] **Step 1: тесты (падающие).** В `scripts/infra-viz-check.js`: (а) для всех ключей фикстуры `partitionFor(key, runs[i].partitions)` совпадает с записью (счёт совпадений печатается; хоть одно несовпадение — падение с перечнем); (б) генератор: для 500 случайных наборов (core `mulberry32`) все сообщения одного ключа в одной партиции и в порядке отправки, offset'ы в каждой партиции 0..len-1, сумма длин = число сообщений; (в) `parseProduce` режет по `; `, отбрасывает пустой ключ в `bad`, ограничивает 16; (г) инвариант чипов («—» на done, `m`/`h`/`p` живы только на своих строках, как проверено у `redis-resp`); (д) легенда: классы выводятся из исходника и имеют legdot-правила с hex; (е) jsdom: виджет строится, пресеты ставят ровно `inputs`, последний кадр показывает сводку. Запустить — падают (нет файла).
- [ ] **Step 2: реализация** `assets/infra-kafka.js` (создать по образцу `infra-redis.js`: заголовок `var core`, генераторы, страж, `INFRA`, `CODE`, регистрация), CSS `.iv-kafka*` (токены `--iv-*`, тёмная тема — по образцу redis-блока), запись в `book.toml`. Сначала `murmur2` и тест (а): добиться 100% совпадения с фикстурой; при несовпадении — чинить код `murmur2` (знаковость `>>>`, `Math.imul`, хвост), не фикстуру.
- [ ] **Step 3: проверки.** `node scripts/infra-viz-check.js`, `check-viz.js` (типы/пресеты/дубликаты), `check-registries.js`, `predict-check.js` — зелёные. Мутации: сломать константу сида, убрать `& 0x7fffffff`, заменить `Math.imul` на `*` — каждая роняет тест (а). Результаты в отчёт.
- [ ] **Step 4: коммит** (по-русски).

---

### Task 3: Виджет `kafka-log` (журнал, читатели, фиксация позиции)

**Files:** Modify `assets/infra-kafka.js`, `assets/infra-viz.css`, `scripts/infra-viz-check.js`.

**Interfaces:**
- Consumes: ядро/хелперы Task 2 (`infra-kafka.js` уже вписан в `book.toml`).
- Produces: `parseLogScript(text) → { tokens, bad }`, `logExec(tokens) → { steps/state }`, `bKafkaLog(tokens) → steps`, тип `kafka-log` (вход `data-script`).

Модель (одна партиция, одна последовательность offset'ов; брокер не меняется): журнал `log` — массив сообщений, offset = индекс; группа читателей `g` имеет `committed[g]` (по умолчанию 0 — как у `--from-beginning`; режим `latest` не моделируется, это сказано под виджетом) и `pos[g]` (позиция процесса-читателя; после `crash` равна `committed[g]`). Грамматика `data-script`, токены через `; `, не более 24:
- `+x` — продюсер дописал сообщение с меткой `x` (1–6 символов `[A-Za-zА-Яа-я0-9]`); можно `+x +y` через `; `;
- `poll g N` — читатель группы `g` (имя 1–4 символа) берёт до N (1…5) сообщений с позиции `pos[g]`; `pos[g]` растёт на число взятых; сообщения ставятся в «обработано (локально)» группы;
- `commit g` — `committed[g] = pos[g]`;
- `crash g` — читатель упал: `pos[g] = committed[g]`, локальная обработка остаётся как была (она уже случилась, это и есть повтор или потеря); счётчики «повторно обработано» (сообщения, которые читатель возьмёт ещё раз после crash) считаются при следующем `poll`: если взято сообщение, чей offset уже в `processed[g]`, оно — повтор.
- Режим «потери» показывает пресет `commit` ДО обработки: в модели обработка = момент `poll`; потерей считается сообщение с offset < `committed[g]`, которое НЕ было взято ни одним `poll` (то есть commit опередил poll): токен `commit g` разрешён, только если `pos[g]` ≤ длины журнала; чтобы показать потерю, добавить токен `skip g N` — «читатель закоммитил N сообщений вперёд, не обработав» (committed[g] = min(len, pos[g]+N); pos тоже); он моделирует «закоммитили, потом упали, не успев обработать». Помечается в UI как «зафиксировано, но не обработано».
Состояние кадра: `log` (метки), `end = len(log)`, по каждой группе: `committed`, `pos`, `processed` (множество offset'ов), `dupes`, `lost`, `lag = end − committed`. Показатель lag в чипах — число.

Листинг (Go, консьюмер-цикл; строка = кадр, один кадр на токен-действие, действие раскрывается строками):

```go
func consume(log []string, g *Group, n int) {
    for i := 0; i < n && g.pos < len(log); i++ {
        msg := log[g.pos]
        process(msg)
        g.pos++
    }
}

func commit(g *Group)  { g.committed = g.pos }
func onCrash(g *Group) { g.pos = g.committed }
```

(Токены `+x`/`skip` не имеют своих строк кода: `+x` — кадр продюсера без подсветки листинга? Нельзя: правило «одна строка = один кадр». Решение: листинг дополнить функцией `func produce(log *[]string, msg string) { *log = append(*log, msg) }` и `func skip(g *Group, n int) { g.pos += n; g.committed = g.pos }`, каждый токен идёт по строкам своей функции.) Чипы: `pos`, `committed`, `end` (=`len(log)`), `lag` — только живые на строке; имя чипа = идентификатор листинга (`g.pos` → чип `pos`), счётчики «повторов/потерь/lag» — `cfg.metrics`.

Рисунок: журнал горизонтальной лентой клеток с offset'ами, справа конец («следующий offset = N»); под лентой для каждой группы — метка `committed` (треугольник «следующее к чтению, как записано в Kafka») и `pos` (позиция процесса); клетки левее `pos`, уже обработанные, затемнены; повтор (клетка обработана второй раз) — янтарная рамка; потеря — красный пунктир; lag — скобка между `committed` и `end`. Легенда по типу: «обработано», «ещё не прочитано», «повтор», «зафиксировано, но не обработано (потеря)», «позиция committed», «позиция pos». Пресеты (поля ровно `data-script`): «нормальная работа» (`+a; +b; +c; +d; +e; poll g1 3; commit g1; poll g1 2; commit g1`), «упал до commit — повтор» (`+a; +b; +c; +d; poll g1 3; crash g1; poll g1 3; commit g1`), «зафиксировал до обработки — потеря» (`+a; +b; +c; +d; skip g1 3; crash g1; poll g1 3`), «две группы» (`+a; +b; +c; poll g1 3; commit g1; poll g2 3; commit g2`), «читатель отстаёт — растёт lag» (`+a; +b; +c; +d; +e; +f; poll g1 1; commit g1; +g; +h`).

- [ ] **Step 1: тесты (падающие).** `parseLogScript` (границы: 24 токена, неизвестный токен → `bad`, имена, N); `logExec` на сценариях Task 1 «group»: после `+a…+e; poll g 3; commit g` → committed=3, lag=2; повторный `poll g 2` берёт offset 3 и 4; `crash` до `commit` → следующий `poll` повторно берёт те же offset'ы (dupes растут); новая группа читает с 0 независимо; случайные сценарии (500): `0 ≤ committed ≤ pos ≤ end` всегда (кроме `skip`, где `pos`=`committed`), `lag = end − committed`, повторы + потери считаются по определению; чипы/легенда/jsdom как в Task 2.
- [ ] **Step 2: реализация** (`logExec` — чистая функция, `bKafkaLog` эмитит кадры по строкам функций; рисунок `kafkaLogViz`; запись INFRA `kafka-log`; CODE; CSS + legdot-правила). Сверить числа примера «нормальная работа» с выводом Task 1 (`CURRENT-OFFSET 3 / LOG-END 5 / LAG 2`) — должны совпасть буквально.
- [ ] **Step 3: проверки и мутации** (`commit g` без `pos`→`committed`; `lag` от `pos` вместо `committed`; `crash` не сбрасывает `pos` — каждая роняет тест). Все скрипты Task 2 Step 3 зелёные.
- [ ] **Step 4: коммит.**

---

### Task 4: Глава `src/kafka.md`, реестры, CLAUDE.md, полная проверка

**Files:** Create `src/kafka.md`; Modify `src/SUMMARY.md`, `assets/progress.js`, `CLAUDE.md`.

**Interfaces:** Consumes отчёт Task 1 (сырые измерения), оба виджета. Produces: страница `kafka.html` (группа 8, `lvl: "ext"`), номер главы — следующий за предыдущей (проверить по `SUMMARY.md`).

Глава для читателя «Go-разработчик, ~1 год, знаком с Kafka по названию». Структура (простым русским, аналогия до определения, каждый раздел короткий):
1. «Что это и зачем» — аналогия: общая тетрадь учёта, куда только дописывают в конец, а каждый читатель держит закладку; вывод «Kafka — не очередь, где сообщение исчезает после чтения, а журнал, который хранится, а читатели помнят, докуда дошли».
2. «Журнал и offset» + виджет `kafka-log` с «Что смотреть» (точный список цветов/меток по легенде), предложение о границах модели (одна партиция, нет репликации, режим `latest` не моделируется, обработка = момент poll).
3. «Закладка читателя: committed, lag» — off-by-one (committed = следующее к чтению), три исхода падения читателя (повтор / потеря / норма) → «at-least-once» вводится ЗДЕСЬ, с отсылкой к идемпотентности (ссылка на главы по надёжности, если есть в книге, иначе без ссылки).
4. «Партиции и ключ» + виджет `kafka-partition` (границы модели: считается только хеш ключа; сообщения без ключа не моделируются; `murmur2` сверен с настоящей Kafka на N ключах из фикстуры — число из `fixture`), связь с главой «Консистентное хеширование» (смена числа партиций переселяет ключи; в Kafka нет кольца — измеренное число переехавших ключей 3→6 из Task 1).
5. «Что видно в `kafka-topics` / `kafka-console-consumer` / `kafka-consumer-groups`» — реальные команды и фрагменты ИХ ВЫВОДА из отчёта Task 1 (сырой текст в ```text), где смотреть offset/lag/партицию; только измеренное.
6. «Типичные ошибки» — 4–5 пунктов, каждый либо измерен, либо следует из виджетов (ожидание глобального порядка между партициями; commit до обработки; смена числа партиций у ключевого топика; чтение «с начала» новой группой по умолчанию НЕ происходит — это измерено в Task 1 раздел `group`).
7. «Воспроизвести самому» — `make kafka-lab`, `kafka-lab/measure.sh log|partition|group|all`, `make kafka-lab-down`; версия Kafka; «Docker Desktop завис → `DOCKER_CONTEXT=default`».
8. «Дальше» — анонс: ребаланс группы и репликация — в следующей части (одним предложением, без обещания сроков).
Каждый блок-цитата с командой подписан версией. Окончание «Запомни» одним абзацем.

- [ ] **Step 1: написать главу.** Ни одного утверждения о Kafka вне списка «измерено в Task 1 / очевидно из алгоритма `murmur2`». Все числа примеров — из выполнения виджетов/отчёта. Виджеты встраиваются как `<div class="algo-viz" data-viz="kafka-log" data-script="..."></div>` и `<div class="algo-viz" data-viz="kafka-partition" data-msgs="..." data-partitions="3"></div>` (атрибуты — ровно «пример главы» из Task 2/3).
- [ ] **Step 2: реестры.** `src/SUMMARY.md` — строка главы в группе 8 (после `miniredis.md`), `assets/progress.js` — запись `{ t: "Kafka: журнал, offset и партиции", h: "kafka.html", lvl: "ext" }` рядом с `miniredis`, `CLAUDE.md`: счётчик `ext` 26 → 27, строка в «Инфраструктурные виджеты» про `kafka-log`/`kafka-partition`, golden-фикстуру Kafka (правится ТОЛЬКО `kafka-lab/measure.sh fixture`), раздел «### Kafka-лаборатория» рядом с Redis-лабораторией (контейнер, образ с digest, loopback, нет в CI, цели make, `measure.sh`-разделы).
- [ ] **Step 3: полный набор проверок** по «Критериям готовности» (медленные — в фоне на ФИНАЛЬНОМ состоянии); `mdbook build`, `check-links.js`, `check-registries.js` (счётчики), `checksnippets` (листинги Go в главе разбираются; псевдокод с `<!-- snippet:pseudo -->`). Проверка в настоящем браузере (Playwright MCP): оба виджета на странице главы, пресеты нажаты, 🎯 работает, на ширине 390px нет горизонтального переполнения; скриншот-заметки в отчёт.
- [ ] **Step 4: трассировка утверждений.** Таблица «утверждение главы → строка вывода Task 1» в отчёт; утверждения без источника удалить из главы.
- [ ] **Step 5: коммит** (по-русски).
