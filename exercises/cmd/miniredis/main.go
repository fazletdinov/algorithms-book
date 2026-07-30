// Command miniredis — сервер капстоуна книги: слушает RESP-протокол
// (совместимый с redis-cli) на TCP и маршрутизирует команды в
// miniredis.Dispatch. Теория и маршрут по этапам — в книге:
// ../../../src/miniredis.md
//
// Запуск (из каталога exercises/):
//
//	go run ./cmd/miniredis            # слушает localhost:6380
//	go run ./cmd/miniredis -addr localhost:7000
//
// Проверка:
//
//	redis-cli -p 6380 PING
//	redis-cli -p 6380 ECHO hello
//
// Без redis-cli — тот же протокол понимает и nc:
//
//	printf 'PING\r\n' | nc localhost 6380
//
// Порт по умолчанию — 6380, а не стандартный 6379 у Redis, чтобы не
// конфликтовать с уже запущенным настоящим redis-server. Слушаем только
// localhost — как и cmd/runner, это локальный однопользовательский
// инструмент, ему незачем быть доступным по сети.
//
// Каждое соединение получает своё ведро токенов (miniredis.RateLimitReply,
// этап 5) — больше 5 команд подряд без паузы сервер начнёт отвечать ERR,
// пока ведро не пополнится (2 токена/сек).
package main

import (
	"bufio"
	"errors"
	"flag"
	"io"
	"log"
	"net"
	"time"

	"github.com/fazletdinov/algorithms-book/exercises/miniredis"
	"github.com/fazletdinov/algorithms-book/exercises/ratelimiter"
)

func main() {
	addr := flag.String("addr", "localhost:6380", "адрес прослушивания")
	flag.Parse()

	ln, err := net.Listen("tcp", *addr)
	if err != nil {
		log.Fatalf("miniredis: не удалось слушать %s: %v", *addr, err)
	}
	log.Printf("miniredis: слушаю %s — Ctrl+C для остановки.", ln.Addr())
	log.Printf("miniredis: проверка — redis-cli -p 6380 PING (порт свой, если запускали с -addr)")

	store := miniredis.NewStore()
	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Printf("miniredis: accept: %v", err)
			continue
		}
		go handleConn(conn, store)
	}
}

// handleConn обслуживает одно соединение до разрыва или ошибки протокола:
// читает команду, диспетчерит, пишет и сбрасывает ответ, повторяет.
//
// bucket — ведро лимита СВОЁ на это соединение (не общее на сервер): его
// никогда не делят две горутины, поэтому оно передаётся в
// miniredis.RateLimitReply без какой-либо синхронизации.
func handleConn(conn net.Conn, store *miniredis.Store) {
	defer conn.Close()
	bucket := ratelimiter.NewTokenBucket(5, 2) // всплеск до 5 команд подряд, дальше 2/сек
	r := bufio.NewReader(conn)
	w := bufio.NewWriter(conn)
	for {
		args, err := miniredis.ReadCommand(r)
		if err != nil {
			if !errors.Is(err, io.EOF) {
				log.Printf("miniredis: %s: %v", conn.RemoteAddr(), err)
			}
			return
		}
		if len(args) == 0 {
			continue // пустая inline-строка — настоящий Redis тоже её просто пропускает
		}

		reply := miniredis.RateLimitReply(bucket, time.Now().UnixMilli())
		if reply == nil {
			reply = miniredis.Dispatch(store, args)
		}
		if err := reply.WriteTo(w); err != nil {
			log.Printf("miniredis: %s: запись ответа: %v", conn.RemoteAddr(), err)
			return
		}
		if err := w.Flush(); err != nil {
			log.Printf("miniredis: %s: flush: %v", conn.RemoteAddr(), err)
			return
		}
	}
}
