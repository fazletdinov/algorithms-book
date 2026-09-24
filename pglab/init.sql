-- Данные для главы «Postgres: EXPLAIN как pprof».
--
-- Цель — не «реалистичная схема интернет-магазина», а набор распределений,
-- на которых планировщик ВЫНУЖДЕН выбирать разные алгоритмы: уникальный ключ,
-- селективный диапазон, перекошенный столбец, текст с префиксами.
--
-- setseed фиксирует генератор случайных чисел, поэтому данные у тебя будут
-- в точности те же, что в главе, а значит и планы совпадут.

SELECT setseed(0.42);

-- users: 200 000 строк.
--   status  — сильный перекос: 80% active, 15% blocked, 5% deleted.
--             На нём видно, почему индекс по 'active' бесполезен,
--             а по 'deleted' — полезен.
--   city    — 100 равномерных значений, для группировок.
--   email   — текст с общими префиксами, для LIKE.
--   region  — ЖЁСТКО определяется городом (город 042 всегда в регионе r0).
--             Планировщик по умолчанию считает столбцы независимыми и на паре
--             (city, region) промахивается на порядок — на этом построен
--             раздел про CREATE STATISTICS.
CREATE TABLE users (
    id         integer PRIMARY KEY,
    email      text        NOT NULL,
    status     text        NOT NULL,
    city       text        NOT NULL,
    region     text        NOT NULL,
    created_at timestamptz NOT NULL
);

-- Город считается ХЕШЕМ от id, а не random(): значения так же разбросаны по
-- таблице, но воспроизводимы — у тебя выйдут те же строки, что в главе.
-- (Соблазн написать city через LATERAL с random() — ловушка: некоррелированный
-- LATERAL вычисляется ОДИН раз, и все 200 000 строк получают один город.)
INSERT INTO users (id, email, status, city, region, created_at)
SELECT g.id, g.email, g.status, g.city,
       -- десятки номера города → 10 регионов по 10 городов в каждом:
       -- city-042 всегда лежит в r4, город однозначно задаёт регион
       'r' || substr(g.city, 7, 1),
       g.created_at
FROM (
    SELECT i AS id,
           'user' || lpad(i::text, 6, '0') || '@' ||
               (ARRAY['example.com', 'mail.org', 'corp.io'])[1 + (i % 3)] AS email,
           CASE
               WHEN random() < 0.80 THEN 'active'
               WHEN random() < 0.75 THEN 'blocked'
               ELSE 'deleted'
           END AS status,
           'city-' || lpad((abs(hashtext(i::text)) % 100 + 1)::text, 3, '0') AS city,
           timestamptz '2024-01-01 00:00:00+00' + (i % 730) * interval '1 day' AS created_at
    FROM generate_series(1, 200000) AS i
) AS g;

-- orders: 2 000 000 строк — по 10 на пользователя в среднем, user_id распределён
-- равномерно. Перекос в лаборатории живёт в users.status, а не здесь.
CREATE TABLE orders (
    id         integer PRIMARY KEY,
    user_id    integer     NOT NULL,
    amount     numeric(10, 2) NOT NULL,
    status     text        NOT NULL,
    created_at timestamptz NOT NULL
);

INSERT INTO orders (id, user_id, amount, status, created_at)
SELECT i,
       1 + (random() * 199999)::int,
       (random() * 10000)::numeric(10, 2),
       CASE WHEN random() < 0.97 THEN 'paid' ELSE 'refunded' END,
       timestamptz '2024-01-01 00:00:00+00' + (i % 730) * interval '1 day'
                                            + (random() * 86400)::int * interval '1 second'
FROM generate_series(1, 2000000) AS i;

-- Индексы заводятся ПОСЛЕ вставки: строить дерево один раз по готовым данным
-- дешевле, чем поддерживать его на каждой из двух миллионов вставок.
CREATE INDEX users_status_idx     ON users (status);
CREATE INDEX users_created_at_idx ON users (created_at);
CREATE INDEX users_email_idx      ON users (email);
CREATE INDEX orders_user_id_idx   ON orders (user_id);
CREATE INDEX orders_created_at_idx ON orders (created_at);

-- VACUUM ANALYZE, а не просто ANALYZE, и это принципиально:
--   ANALYZE  — собирает статистику (сколько строк, какие значения частые);
--              без неё планировщик оценивает размеры с потолка;
--   VACUUM   — заодно строит КАРТУ ВИДИМОСТИ (visibility map), без которой
--              Index Only Scan невозможен: планировщик обязан лезть в таблицу
--              за версиями строк. Раздел главы про random_page_cost без этого
--              шага не воспроизводится.
VACUUM ANALYZE users;
VACUUM ANALYZE orders;

-- Маркер готовности — строго ПОСЛЕДНИЙ оператор засева. `make pg-lab` ждёт именно его,
-- а не «в orders 2 млн строк»: строки появляются раньше индексов и VACUUM, и по
-- такому признаку база объявлялась готовой на пару секунд раньше — первый же EXPLAIN
-- показывал бы план без Index Only Scan.
CREATE TABLE lab_ready AS SELECT now() AS ready_at;
