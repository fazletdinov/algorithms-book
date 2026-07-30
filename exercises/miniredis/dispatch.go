package miniredis

import (
	"fmt"
	"strings"
)

// Dispatch выполняет одну команду над store и возвращает ответ. args[0] —
// имя команды (без учёта регистра, как в настоящем Redis), args[1:] —
// параметры. Пустой args (пустая inline-строка) — не ошибка протокола, а
// пустая команда: сервер обычно отфильтровывает такие строки сам и Dispatch
// не вызывает (см. cmd/miniredis/main.go), но Dispatch остаётся корректным и
// на этот случай — полезно для тестов.
//
// Сам роутинг и PING/ECHO даны готовыми (протокольная демонстрация с этапа
// 1, решать там нечего); SET/GET/DEL/EXPIRE/TTL/ZADD/ZSCORE/ZRANGE/ZRANK —
// задача этапов 2-4, см. miniredis.go.
func Dispatch(store *Store, args []string) Reply {
	if len(args) == 0 {
		return Err("ERR empty command")
	}
	switch strings.ToUpper(args[0]) {
	case "PING":
		return dispatchPing(args[1:])
	case "ECHO":
		return dispatchEcho(args[1:])
	case "SET":
		return dispatchSet(store, args[1:])
	case "GET":
		return dispatchGet(store, args[1:])
	case "DEL":
		return dispatchDel(store, args[1:])
	case "EXPIRE":
		return dispatchExpire(store, args[1:])
	case "TTL":
		return dispatchTTL(store, args[1:])
	case "ZADD":
		return dispatchZAdd(store, args[1:])
	case "ZSCORE":
		return dispatchZScore(store, args[1:])
	case "ZRANGE":
		return dispatchZRange(store, args[1:])
	case "ZRANK":
		return dispatchZRank(store, args[1:])
	default:
		return Err(fmt.Sprintf("ERR unknown command '%s'", args[0]))
	}
}

// dispatchPing: без аргументов — статус PONG; с одним аргументом — эхо этим
// же аргументом (ровно так ведёт себя настоящий Redis).
func dispatchPing(args []string) Reply {
	switch len(args) {
	case 0:
		return SimpleString("PONG")
	case 1:
		return BulkString(args[0])
	default:
		return Err("ERR wrong number of arguments for 'ping' command")
	}
}

func dispatchEcho(args []string) Reply {
	if len(args) != 1 {
		return Err("ERR wrong number of arguments for 'echo' command")
	}
	return BulkString(args[0])
}
