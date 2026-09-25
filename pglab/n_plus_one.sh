#!/usr/bin/env bash
# N+1 против пачки — замер к главе «Когда алгоритм не нужен».
#
#   make pg-lab && ./pglab/n_plus_one.sh [пользователей=1000] [повторов=5]
#
# Задача одна и та же: заказы для N пользователей. Два способа:
#   N+1   — N отдельных запросов «WHERE user_id = $k», как пишет цикл в сервисе;
#   пачка — один запрос «WHERE user_id = ANY('{…}')».
# Время берётся из \timing самого psql: это время каждого запроса вместе с обменом
# с сервером, без запуска клиента. psql ходит по TCP (-h 127.0.0.1), как сервис,
# но внутри контейнера — сети почти нет, и это ЛУЧШИЙ случай для N+1: в проде
# каждый запрос добавляет ещё сетевую задержку до базы.
set -euo pipefail

N=${1:-1000}
REPEATS=${2:-5}
PSQL=(docker exec -i -e PGPASSWORD=algo algo-pglab psql -h 127.0.0.1 -U algo -d algolab -q -X)

ids=$(seq 1 "$N" | paste -sd, -)

nplus1() {
  echo '\timing on'
  for i in $(seq 1 "$N"); do echo "SELECT id, amount FROM orders WHERE user_id = $i;"; done
}
batch() {
  echo '\timing on'
  echo "SELECT user_id, id, amount FROM orders WHERE user_id = ANY('{$ids}'::int[]);"
}

# сумма «Time: X ms» по всем запросам скрипта
total_ms() { "${PSQL[@]}" -o /dev/null 2>&1 | awk '/^Time:/ {s += $2} END {printf "%.1f", s}'; }

median() { sort -n | awk '{a[NR]=$1} END {print a[int((NR+1)/2)]}'; }

rows=$("${PSQL[@]}" -tAc "SELECT count(*) FROM orders WHERE user_id = ANY('{$ids}'::int[])")

a=$(for _ in $(seq "$REPEATS"); do nplus1 | total_ms; echo; done | median)
b=$(for _ in $(seq "$REPEATS"); do batch | total_ms; echo; done | median)

echo "заказы $N пользователей ($rows строк), медиана из $REPEATS прогонов:"
echo "  N+1   ($N запросов): $a мс"
echo "  пачка (1 запрос):     $b мс"
awk -v a="$a" -v b="$b" 'BEGIN { printf "  пачка быстрее в %.1f раза — и это без сетевой задержки до базы\n", a / b }'
