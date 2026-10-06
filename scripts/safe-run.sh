#!/bin/sh
# Запуск команды с жёстким пределом памяти и времени в отдельной cgroup-области.
# SAFE_MEM (по умолчанию 2G), SAFE_SECS (по умолчанию 120). Код 137 — упёрся в память, 124 — таймаут.
u="safe-$$-$(date +%s%N)"
systemd-run --user --scope -q --unit="$u" -p MemoryMax="${SAFE_MEM:-2G}" -p MemorySwapMax=0 -- timeout -k 5 "${SAFE_SECS:-120}" "$@"
rc=$?
systemctl --user kill --signal=KILL "$u.scope" >/dev/null 2>&1
systemctl --user stop "$u.scope" >/dev/null 2>&1
# Область, в которой сработал предел памяти, остаётся в состоянии failed до конца сеанса.
systemctl --user reset-failed "$u.scope" >/dev/null 2>&1
exit $rc
