#!/bin/sh
# Замеры настоящего Redis к главе «Капстоун: мини-Redis» — сверка с нашим мини-Redis.
#
#   make redis-lab && redislab/measure.sh [wire|ttl|active|all]   (по умолчанию all)
#
#   wire   — байты на проводе. Запросы — ровно случаи разбора из golden-эталона мини-Redis
#            (scripts/fixtures/redis-golden.json, раздел parse), рядом — что о них сказал
#            ReadCommand мини-Redis; затем шаги раздела reply, где ответ мини-Redis записан
#            в эталоне байт в байт, и скрипт сам сравнивает его с ответом Redis. В конце —
#            пределы протокола настоящего Redis: настройки по точному имени, длинные заголовки
#            и строки, судьба соединения после ошибки протокола (по CLIENT LIST).
#   ttl    — сценарии раздела ttl того же эталона: токен «+N» — настоящая пауза sleep N,
#            команды — через redis-cli; каждый ответ сравнивается с ответом мини-Redis.
#            Отдельно — округление TTL (TTL и PTTL в нескольких точках одного срока).
#   active — активное удаление: ключи с истёкшим сроком исчезают без единого обращения
#            к ним, а с DEBUG SET-ACTIVE-EXPIRE 0 лежат в памяти до первого обращения.
#            DEBUG в лаборатории разрешён только локально (enable-debug-command local) —
#            docker exec как раз локальный, а через опубликованный порт DEBUG отклоняется.
#
# Сценарии берутся из эталона, а не переписаны сюда: вторая копия разошлась бы с первой,
# как только эталон обновят. Всё идёт через docker exec в контейнер algo-redislab (nc и
# redis-cli — из образа), так что на хосте нужны только docker, od и обычные sh/awk/sleep
# (sleep с дробью — GNU coreutils и busybox умеют). Docker Desktop завис — запускай как
# DOCKER_CONTEXT=default redislab/measure.sh: эту переменную docker читает сам.
#
# Скрипт идемпотентен: каждый раздел начинает с FLUSHALL, а выключенное активное удаление
# возвращается (DEBUG SET-ACTIVE-EXPIRE 1) даже при обрыве — через trap. Паузы идут по
# настоящим часам: шаг, у которого остаток срока ровно на границе (для TTL настоящего Redis
# это полсекунды — он округляет, для GET — ноль), может от прогона к прогону дать разный
# ответ — это свойство замера, а не Redis.
set -euf

C=algo-redislab
GOLDEN="$(dirname "$0")/../scripts/fixtures/redis-golden.json"
US=$(printf '\037') # разделитель полей в записях эталона: не пробел, пустые поля не слипаются

rcli() { docker exec "$C" redis-cli "$@" </dev/null; }

# Голые байты в Redis и ответ байт за байтом. Каждый вызов — своё соединение: после
# ошибки протокола остаток пакета Redis не обрабатывает, а через ~1 с этого клиента уже
# нет в CLIENT LIST (см. conn_probe ниже), — следующий случай не должен от этого страдать.
# Аргумент — строка в экранировании printf '%b' (\r\n — четыре символа), как в эталоне.
nc_send() { printf '%b' "$1" | docker exec -i "$C" nc -w1 localhost 6379; }
show_bytes() {
	if [ -n "$1" ]; then printf '%s\n' "$1"; else echo '   (ни одного байта)'; fi
}

# Пропускает вывод сравнения насквозь (сразу, построчно) и в конце печатает счёт:
# tally РЕГЭКСП_СОВПАЛО РЕГЭКСП_РАСХОДИТСЯ ПОДПИСЬ_ИТОГА
tally() {
	awk -v ok="$1" -v bad="$2" -v label="$3" '
	{ print; fflush() }
	$0 ~ ok { m++ }
	$0 ~ bad { d++ }
	END { printf "\n%s %d, расходится %d (из %d)\n", label, m, d, m + d }'
}

# check_lab ПОДКОМАНДА — эталон нужен wire и ttl, разделу active он не нужен.
check_lab() {
	if ! docker exec "$C" redis-cli ping 2>/dev/null </dev/null | grep -qx PONG; then
		echo "✗ Redis-лаборатория не отвечает: контейнер $C не запущен или Redis ещё не готов." >&2
		echo "  Подними: make redis-lab   (Docker Desktop завис — DOCKER_CONTEXT=default make redis-lab)" >&2
		exit 1
	fi
	if [ "$1" != active ] && [ ! -r "$GOLDEN" ]; then
		echo "✗ Нет эталона $GOLDEN — из exercises/: go test -tags solution -run TestGolden -count=1 ./miniredis/ -update" >&2
		exit 1
	fi
}

# banner ПОДКОМАНДА — версия, частота cron и откуда эталон (если подкоманда его читает).
banner() {
	ver=$(rcli INFO server | tr -d '\r' | sed -n 's/^redis_version://p')
	hz=$(rcli CONFIG GET hz | sed -n 2p)
	ctx=$(docker context show 2>/dev/null || echo "${DOCKER_CONTEXT:-по умолчанию}")
	echo "redislab: Redis $ver (hz=$hz), контейнер $C, docker context: $ctx"
	if [ "$1" != active ]; then echo "эталон мини-Redis: $GOLDEN"; fi
}

# Записи эталона, по одной на строку, поля через US. Файл пишет json.MarshalIndent Go —
# одно поле на строку с постоянным отступом, — поэтому хватает awk без разбора JSON.
# Строки остаются в JSON-экранировании: для \r \n \\ оно совпадает с printf '%b'. \uXXXX
# и \" этот разбор не раскрывает (printf '%b' оставил бы от \" обратную косую черту с
# кавычкой) — встретив их, падаем, а не сравниваем искажённые байты.
#   P idx name raw args err eof consumed  — случай разбора (args уже в виде ["A", "B"])
#   R idx name / L idx key value / S idx reply arg…  — сценарий ответов, preload, шаг
#   T idx name script / K idx token reply  — сценарий TTL и его шаг
golden_records() {
	awk -v US="$US" '
	function str(line) {
		sub(/^ *("[^"]*": )?"/, "", line); sub(/",?$/, "", line)
		if (line ~ /\\u/) { print "✗ в эталоне встретилась последовательность \\uXXXX — скрипт её не разбирает: " line > "/dev/stderr"; exit 3 }
		if (line ~ /\\"/) { print "✗ в эталоне встретилась последовательность \\\" — скрипт её не разбирает: " line > "/dev/stderr"; exit 3 }
		return line
	}
	/^  "parse": \[/ { sec = "P"; n = 0; next }
	/^  "reply": \[/ { sec = "R"; n = 0; next }
	/^  "ttl": \[/   { sec = "T"; n = 0; next }
	/^    \{/        { n++; next }
	sec == "P" && /^      "name": / { name = str($0); next }
	sec == "P" && /^      "raw": /  { raw = str($0); next }
	sec == "P" && /^      "args": null/ { args = "null"; next }
	sec == "P" && /^      "args": \[\]/ { args = "[]"; next }
	sec == "P" && /^      "args": \[$/  { inargs = 1; args = ""; next }
	sec == "P" && inargs && /^      \]/   { inargs = 0; args = "[" args "]"; next }
	sec == "P" && inargs { args = args (args == "" ? "" : ", ") "\"" str($0) "\""; next }
	sec == "P" && /^      "err": /  { err = ($0 ~ /true/) ? "да" : "нет"; next }
	sec == "P" && /^      "eof": /  { eof = ($0 ~ /true/) ? "да" : "нет"; next }
	sec == "P" && /^      "consumed": / {
		c = $0; sub(/^.*: /, "", c)
		print "P" US n US name US raw US args US err US eof US c; next
	}
	sec == "R" && /^      "name": /  { print "R" US n US str($0); next }
	sec == "R" && /^        "[^"]*": "/ { k = $0; sub(/^ *"/, "", k); sub(/".*$/, "", k)
		print "L" US n US k US str($0); next }
	sec == "R" && /^          "args": / { sargs = ""; next } # и "[", и "[]", и null: шаг без args не берёт чужие
	sec == "R" && /^            "/ { sargs = sargs US str($0); next }
	sec == "R" && /^          "reply": / { print "S" US n US str($0) sargs; next }
	sec == "T" && /^      "name": /   { name = str($0); next }
	sec == "T" && /^      "script": / { print "T" US n US name US str($0); next }
	sec == "T" && /^          "token": / { tok = str($0); next }
	sec == "T" && /^          "reply": / { print "K" US n US tok US str($0); next }
	' "$GOLDEN"
}

# --- wire ---------------------------------------------------------------------------

# Случай разбора. Что слать, решает то, что сделал с ним мини-Redis (эталон):
#   конец ввода (eof)            — держим соединение открытым 1 с: видно, что сервер ждёт
#                                  остаток и молчит, а не отвечает ошибкой;
#   ошибка или пустая команда    — в конец дописан PING\r\n: мини-Redis тут не шлёт ни байта,
#                                  и по +PONG видно, живо ли соединение у настоящего Redis;
#   иначе                        — запрос как есть.
wire_parse_case() {
	idx=$1 name=$2 raw=$3 args=$4 err=$5 eof=$6 consumed=$7
	printf '\n--- [разбор %s] %b\n' "$idx" "$name"
	printf '%s\n' "мини-Redis (ReadCommand по эталону): args $args, ошибка протокола: $err, конец ввода: $eof, съедено байт: $consumed"
	if [ "$eof" = да ]; then
		printf '%s\n' "\$ { printf '$raw'; sleep 1; } | docker exec -i $C nc -w1 localhost 6379 | od -An -c"
		out=$({ printf '%b' "$raw"; sleep 1; } | docker exec -i "$C" nc -w1 localhost 6379 | od -An -c)
	elif [ "$err" = да ] || [ "$args" = null ] || [ "$args" = '[]' ]; then
		printf '%s\n' "\$ printf '${raw}PING\\r\\n' | docker exec -i $C nc -w1 localhost 6379 | od -An -c"
		out=$(nc_send "${raw}PING\\r\\n" | od -An -c)
	else
		printf '%s\n' "\$ printf '$raw' | docker exec -i $C nc -w1 localhost 6379 | od -An -c"
		out=$(nc_send "$raw" | od -An -c)
	fi
	show_bytes "$out"
}

# Шаг сценария ответов: args кодируются в RESP-массив, ответ Redis сравнивается с ответом
# мини-Redis из эталона побайтно (через od -c обоих).
wire_reply_step() {
	want=$1
	shift
	req="*$#\\r\\n"
	for a in "$@"; do
		len=$(printf '%b' "$a" | wc -c | tr -d ' ')
		req="$req\$$len\\r\\n$a\\r\\n"
	done
	printf '\n  %s\n' "$*"
	printf '%s\n' "  \$ printf '$req' | docker exec -i $C nc -w1 localhost 6379 | od -An -c"
	got=$(nc_send "$req" | od -An -c)
	exp=$(printf '%b' "$want" | od -An -c)
	show_bytes "$got"
	if [ "$got" = "$exp" ]; then
		echo "  = совпало с мини-Redis побайтно"
	else
		echo "  ≠ РАСХОДИТСЯ; мини-Redis (эталон) отвечает:"
		show_bytes "$exp"
	fi
}

wire() {
	echo
	echo "=== wire: байты на проводе (nc внутри контейнера, ответ — od -An -c) ==="
	rcli FLUSHALL >/dev/null
	echo "FLUSHALL; случаи — в порядке эталона, состояние между ними сохраняется (SET foo bar раньше GET foo)."
	printf '%s\n' 'Где мини-Redis не отвечает ничего (ошибка, пустая команда), в конец дописан PING\r\n — живо ли соединение;'
	echo "где команда оборвана, соединение держится открытым 1 с — ждёт ли сервер остаток."
	recs=$(golden_records)
	printf '%s\n' "$recs" | grep "^P$US" | while IFS="$US" read -r _ idx name raw args err eof consumed; do
		wire_parse_case "$idx" "$name" "$raw" "$args" "$err" "$eof" "$consumed"
	done
	# Клиент, дописавший команду после паузы, — пара к случаям «оборвано…» выше: сервер
	# не забыл начало, а дождался конца. Такого случая в эталоне нет (там нет сокета).
	printf '\n--- [дополнительно] команда дописана через 1 с\n'
	printf '%s\n' "\$ { printf '*1\\r\\n\$4\\r\\nPI'; sleep 1; printf 'NG\\r\\n'; } | docker exec -i $C nc -w1 localhost 6379 | od -An -c"
	# shellcheck disable=SC2016 # $4 — заголовок RESP, а не переменная
	out=$({ printf '*1\r\n$4\r\nPI'; sleep 1; printf 'NG\r\n'; } | docker exec -i "$C" nc -w1 localhost 6379 | od -An -c)
	show_bytes "$out"

	printf '%s\n' "$recs" | grep "^R$US" | while IFS="$US" read -r _ ridx rname; do
		rcli FLUSHALL >/dev/null
		# preload сценария — обычными SET до шагов, как store.data[k] = v в эталоне
		printf '%s\n' "$recs" | grep "^L$US$ridx$US" | while IFS="$US" read -r _ _ k v; do
			rcli SET "$(printf '%b' "$k")" "$(printf '%b' "$v")" >/dev/null
		done
		pre=$(printf '%s\n' "$recs" | grep "^L$US$ridx$US" | awk -F "$US" '{printf "%s%s=%s", (NR > 1 ? " " : ""), $3, $4}')
		printf '\n--- [ответы %s] %b (FLUSHALL; preload: %s)\n' "$ridx" "$rname" "${pre:-—}"
		printf '%s\n' "$recs" | grep "^S$US$ridx$US" | while IFS= read -r line; do
			# поля шага: S idx reply arg1 arg2 … — args переменной длины, режем по US сами
			set --
			rest=${line#S"$US"*"$US"}
			want=${rest%%"$US"*}
			case $rest in
			*"$US"*)
				rest=${rest#*"$US"}
				while :; do
					set -- "$@" "${rest%%"$US"*}"
					case $rest in *"$US"*) rest=${rest#*"$US"} ;; *) break ;; esac
				done
				;;
			esac
			wire_reply_step "$want" "$@"
		done
	done | tally '^  = совпало' '^  ≠ РАСХОДИТСЯ' 'итог ответов: совпало побайтно'
	wire_limits
}

# Строка из n букв «a» — длинные запросы к пределам протокола (удвоением строки: быстро и без
# head -c, которого нет в POSIX).
gen() { awk -v n="$1" 'BEGIN { s = "a"; while (length(s) < n) s = s s; printf "%s", substr(s, 1, n) }'; }

# limit_probe ПОДПИСЬ КОМАНДА — КОМАНДА печатает запрос; она же показана и она же исполнена
# (eval строки, записанной в этом файле), так что напечатанное — ровно отправленное.
limit_probe() {
	printf '\n  %s\n' "$1"
	printf '%s\n' "  \$ $2 | docker exec -i $C nc -w1 localhost 6379 | od -An -c"
	out=$(eval "$2" | docker exec -i "$C" nc -w1 localhost 6379 | od -An -c)
	show_bytes "$out"
}

# Клиенты с именем probe-* по CLIENT LIST — только поля, по которым их видно.
probe_clients() {
	rcli CLIENT LIST | awk '
		/ name=probe-/ { for (i = 1; i <= NF; i++) if ($i ~ /^(addr|name|age|cmd)=/) printf "%s ", $i; print ""; n++ }
		END { if (!n) print "(клиентов probe-* нет)" }' | sed 's/^/    CLIENT LIST: /'
}

# conn_probe ИМЯ ЗАПРОС — соединение называет себя ИМЯ, шлёт ЗАПРОС (экранирование %b) и
# держит свою сторону открытой 2 с; через 1 с из другого соединения смотрим CLIENT LIST.
# Выход nc тут ничего не доказывает: busybox nc не завершается сам, когда сервер закрыл
# соединение, — поэтому смотрим, числится ли клиент у самого сервера.
conn_probe() {
	printf '\n  %s: CLIENT SETNAME %s, затем %s; клиент держит сокет 2 с, CLIENT LIST — через 1 с\n' "$1" "$1" "$2"
	out=$({
		printf 'CLIENT SETNAME %s\r\n' "$1"
		printf '%b' "$2"
		sleep 1
		probe_clients >&3
		sleep 1
	} | docker exec -i "$C" nc -w1 localhost 6379 | od -An -c)
	echo "    ответ на этом соединении:"
	show_bytes "$out"
}

# Пределы протокола настоящего Redis: что из них настраивается и где граница на деле. Печатаем
# увиденное, без вердиктов: как назвать наблюдение, решает текст главы.
wire_limits() {
	echo
	echo "--- [пределы протокола] настройки по точному имени (пустой массив — такой настройки нет)"
	for name in proto-max-bulk-len proto-max-multibulk-len proto-inline-max-size; do
		printf '  CONFIG GET %-24s → %s\n' "$name" "$(rcli --no-raw CONFIG GET "$name" | paste -sd ' ' -)"
	done
	echo "  все настройки, в имени которых есть proto, inline, multibulk или query (CONFIG GET *):"
	rcli CONFIG GET '*' | paste - - | awk -F '\t' '$1 ~ /proto|inline|multibulk|query/' | sed 's/^/    /'

	echo
	echo "--- [пределы протокола] число элементов массива (за заголовком — PING: если заголовок принят,"
	echo "    сервер ждёт \$-строку и спотыкается о P)"
	limit_probe '*1048577 — на 1 больше предела мини-Redis (maxMultibulkLen)' "printf '*1048577\\r\\nPING\\r\\n'"
	limit_probe '*2147483647' "printf '*2147483647\\r\\nPING\\r\\n'"
	limit_probe '*2147483648' "printf '*2147483648\\r\\nPING\\r\\n'"

	echo
	echo "--- [пределы протокола] длина строки без перевода строки (gen N — N букв «a», функция этого скрипта)"
	limit_probe '65536 байт без \n, соединение открыто 1 с' '{ gen 65536; sleep 1; }'
	limit_probe '65537 байт без \n' 'gen 65537'
	limit_probe 'законченная строка: EXISTS + 70000 байт + \r\n' "{ printf 'EXISTS '; gen 70000; printf '\\r\\n'; }"
	limit_probe 'законченная строка: EXISTS + 200000 байт + \r\n' "{ printf 'EXISTS '; gen 200000; printf '\\r\\n'; }"
	limit_probe 'заголовок массива: * и 70000 цифр без \r\n' "{ printf '*'; gen 70000 | tr a 1; }"

	echo
	echo "--- [пределы протокола] соединение после ошибки протокола (только клиенты с именем probe-*)"
	exec 3>&1
	conn_probe probe-ping 'PING\r\n'
	conn_probe probe-starx '*x\r\n'
	conn_probe probe-bulklen '*1\r\n$-1\r\n'
	exec 3>&-
}

# --- ttl ----------------------------------------------------------------------------

# Ответ эталона (RESP в JSON-экранировании) в том виде, как его печатает redis-cli --no-raw:
# так ответы мини-Redis и настоящего Redis сравниваются строка в строку.
cli_form() {
	s=${1%\\r\\n}
	case $s in
	'$-1') printf '(nil)' ;;
	'$'*) printf '"%s"' "${s#*\\r\\n}" ;;
	+*) printf '%s' "${s#+}" ;;
	:*) printf '(integer) %s' "${s#:}" ;;
	-*) printf '(error) %s' "${s#-}" ;;
	*) printf '?%s' "$s" ;;
	esac
}

# Скрипт сценария → строки для одного сеанса redis-cli; «+N» — настоящая пауза. Сеанс один
# на сценарий: отдельный docker exec на команду добавлял бы ~30 мс к каждой паузе. Первым
# идёт PING с паузой 0.5 с — пока redis-cli стартует в контейнере, строки копятся в канале
# и ушли бы разом, сдвинув первую паузу сценария на время старта. Пробелы вокруг токена
# снимаются без внешних процессов: лишний fork после паузы — это лишние миллисекунды срока.
ttl_feed() {
	echo PING
	sleep 0.5
	printf '%s\n' "$1" | tr ';' '\n' | while IFS=' ' read -r tok; do
		case $tok in
		+*) sleep "${tok#+}" ;;
		*) printf '%s\n' "$tok" ;;
		esac
	done
}

ttl_scenario() {
	tidx=$1 tname=$2 script=$3 steps=$4
	printf '\n--- [ttl %s] %s\n' "$tidx" "$tname"
	printf '%s\n' "сценарий: $script"
	out=$(ttl_feed "$script" | docker exec -i "$C" redis-cli --no-raw | sed 1d)
	i=0
	printf '%s\n' "$steps" | while IFS="$US" read -r _ _ tok rep; do
		case $tok in
		+*)
			printf '  %-22s пауза %s с\n' "$tok" "${tok#+}"
			continue
			;;
		esac
		i=$((i + 1))
		got=$(printf '%s\n' "$out" | sed -n "${i}p")
		want=$(cli_form "$rep")
		mark=РАСХОДИТСЯ
		[ "$got" = "$want" ] && mark=совпало
		printf '  %-22s Redis: %-18s мини-Redis: %-18s (%s) %s\n' "$tok" "$got" "$want" "$rep" "$mark"
	done
}

ttl_rounding() {
	echo
	echo "--- Округление TTL: SET a 1; EXPIRE a 3; затем TTL и PTTL в точках 0.4 0.6 1.2 2.4 2.6 с"
	echo "    (мини-Redis отдал бы при том же остатке PTTL/1000 без дробной части — int64(exp.Sub(now).Seconds()))"
	rcli FLUSHALL >/dev/null
	out=$({
		echo PING
		sleep 0.5
		echo 'SET a 1'
		echo 'EXPIRE a 3'
		# точка:пауза от предыдущей точки — паузы заранее, чтобы не тратить время на расчёт
		for p in 0.4:0.4 0.6:0.2 1.2:0.6 2.4:1.2 2.6:0.2; do
			sleep "${p#*:}"
			echo 'TTL a'
			echo 'PTTL a'
		done
	} | docker exec -i "$C" redis-cli --no-raw | sed 1d)
	echo "  SET a 1     → $(printf '%s\n' "$out" | sed -n 1p)"
	echo "  EXPIRE a 3  → $(printf '%s\n' "$out" | sed -n 2p)"
	# шапка — готовой строкой: printf выравнивает по байтам, и кириллица съехала бы
	echo '  t, с     TTL (Redis)      PTTL (Redis)       прошло, мс  TTL мини-Redis'
	i=3
	for t in 0.4 0.6 1.2 2.4 2.6; do
		ttl=$(printf '%s\n' "$out" | sed -n "${i}p")
		pttl=$(printf '%s\n' "$out" | sed -n "$((i + 1))p")
		ms=${pttl#"(integer) "}
		mini=$(awk -v ms="$ms" 'BEGIN { if (ms < 0) print ms; else print int(ms / 1000) }')
		printf '  %-8s %-16s %-18s %-11s %s\n' "$t" "$ttl" "$pttl" "$((3000 - ms))" "$mini"
		i=$((i + 2))
	done
}

ttl() {
	echo
	echo "=== ttl: сценарии TTL из эталона, «+N» — настоящая пауза (redis-cli --no-raw) ==="
	echo "Сравниваются только ОТВЕТЫ команд. Названия сценариев взяты из эталона и описывают поведение"
	echo "мини-Redis («просрочен, но лежит в памяти», «TTL отбрасывает дробную часть»): «совпало» у таких"
	echo "сценариев ничего не говорит ни о памяти, ни об усечении. Память — в разделе active, округление —"
	echo "в таблице в конце этого раздела."
	recs=$(golden_records)
	printf '%s\n' "$recs" | grep "^T$US" | while IFS="$US" read -r _ tidx tname script; do
		rcli FLUSHALL >/dev/null
		ttl_scenario "$tidx" "$tname" "$script" "$(printf '%s\n' "$recs" | grep "^K$US$tidx$US")"
	done | tally ' совпало$' ' РАСХОДИТСЯ$' 'итог ttl: совпало'
	echo "Шаг сразу после паузы, где остаток срока ровно на границе, по настоящим часам даёт то один, то другой"
	echo "ответ: миллисекунда туда-сюда. Для TTL настоящего Redis граница — полсекунды (он округляет), для GET — ноль."
	echo "Само правило округления — в таблице ниже."
	ttl_rounding
}

# --- active -------------------------------------------------------------------------

expired_keys() { rcli INFO stats | tr -d '\r' | sed -n 's/^expired_keys://p'; }

# Время сервера в микросекундах (TIME отдаёт секунды и микросекунды двумя строками).
usec_of() { printf '%s\n' "$1" | awk 'NR == 1 { s = $1 } NR == 2 { printf "%.0f", s * 1000000 + $1 }'; }

restore_active() { rcli DEBUG SET-ACTIVE-EXPIRE 1 >/dev/null 2>&1 || true; }

active() {
	echo
	echo "=== active: активное удаление просроченных ключей ==="
	rcli FLUSHALL >/dev/null
	echo "(1) FLUSHALL; 1000 ключей SET k<i> v EX 1 одним сеансом redis-cli, дальше только DBSIZE и TIME"
	echo "    каждые 0.5 с — к самим ключам никто не обращается (DBSIZE считает и просроченные)"
	# исходное состояние задаём сами: прошлый прогон, убитый SIGKILL, мог оставить его выключенным
	echo "  DEBUG SET-ACTIVE-EXPIRE 1 → $(rcli DEBUG SET-ACTIVE-EXPIRE 1)  (исходное состояние: активное удаление включено)"
	e0=$(expired_keys)
	out=$({
		echo TIME
		i=1
		while [ "$i" -le 1000 ]; do
			echo "SET k$i v EX 1"
			i=$((i + 1))
		done
		echo TIME
	} | docker exec -i "$C" redis-cli)
	t0=$(usec_of "$(printf '%s\n' "$out" | sed -n 1,2p)")
	t1=$(usec_of "$(printf '%s\n' "$out" | tail -n 2)")
	oks=$(printf '%s\n' "$out" | grep -cx OK || true)
	echo "  expired_keys до: $e0;  SET … EX 1 ответили OK: $oks;  запись заняла $(((t1 - t0) / 1000)) мс (TIME сервера)"
	n=0
	while :; do
		sleep 0.5
		n=$((n + 1))
		poll=$(printf 'TIME\nDBSIZE\n' | docker exec -i "$C" redis-cli)
		tp=$(usec_of "$(printf '%s\n' "$poll" | sed -n 1,2p)")
		size=$(printf '%s\n' "$poll" | sed -n 3p)
		awk -v d="$((tp - t0))" -v s="$size" 'BEGIN { printf "  t=+%.3f с от первого SET   DBSIZE=%s\n", d / 1e6, s }'
		[ "$size" = 0 ] && break
		if [ "$n" -ge 60 ]; then
			echo "  ✗ за 30 с DBSIZE не дошёл до нуля"
			break
		fi
	done
	e1=$(expired_keys)
	echo "  expired_keys после: $e1 (+$((e1 - e0)))"

	echo
	echo "(2) DEBUG SET-ACTIVE-EXPIRE 0 — активное удаление выключено, остаётся только ленивое, как в мини-Redis"
	rcli FLUSHALL >/dev/null
	trap restore_active EXIT
	trap 'exit 130' INT
	trap 'exit 143' TERM
	trap 'exit 129' HUP
	echo "  DEBUG SET-ACTIVE-EXPIRE 0 → $(rcli DEBUG SET-ACTIVE-EXPIRE 0)"
	e0=$(expired_keys)
	echo "  SET a 1 EX 1              → $(rcli SET a 1 EX 1)"
	sleep 3
	echo "  (пауза 3 с)"
	echo "  DBSIZE                    → $(rcli DBSIZE)"
	echo "  GET a                     → $(rcli --no-raw GET a)"
	echo "  DBSIZE                    → $(rcli DBSIZE)"
	e1=$(expired_keys)
	echo "  expired_keys: $e0 → $e1 (+$((e1 - e0)): ключ удалило обращение GET)"
	echo "  DEBUG SET-ACTIVE-EXPIRE 1 → $(rcli DEBUG SET-ACTIVE-EXPIRE 1)  (вернули как было)"
	trap - EXIT INT TERM HUP
	rcli FLUSHALL >/dev/null
}

cmd=${1:-all}
case $cmd in
wire | ttl | active | all) ;;
*)
	echo "использование: $0 [wire|ttl|active|all]" >&2
	exit 2
	;;
esac

check_lab "$cmd"
banner "$cmd"
case $cmd in
all)
	wire
	ttl
	active
	;;
*) "$cmd" ;;
esac
