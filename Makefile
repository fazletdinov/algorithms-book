# Makefile — удобный запуск учебника локально.
#
#   make serve   — книга (http://localhost:3000) + runner (http://localhost:8080)
#                  ОДНОЙ командой; виджеты «💻 Реши прямо здесь» сразу работают.
#                  Ctrl+C останавливает оба.
#   make book    — только книга (mdbook serve)
#   make runner  — только helper-сервер для «реши в книге»
#   make build   — сборка книги в ./book
#   make check   — то же, что проверяет CI (gofmt, эталоны, книга, ссылки)
#   make pg-lab  — Postgres-лаборатория к главе «Postgres: EXPLAIN как pprof»
#   make redis-lab — Redis-лаборатория к главе «Капстоун: мини-Redis»
#                  (redis-cli внутри — make redis-cli, погасить — make redis-lab-down,
#                  замеры главы — redislab/measure.sh all)

.PHONY: serve book runner docker-runner build check help pg-lab pg-psql pg-lab-down redis-lab redis-cli redis-lab-down
.DEFAULT_GOAL := help

## serve: книга + runner вместе (Ctrl+C гасит оба)
serve:
	@echo "  Сборка runner…"
	@cd exercises && go build -o .algo-runner ./cmd/runner
	@echo "▶ Книга:   http://localhost:3000"
	@echo "▶ Runner:  http://localhost:8080  (для виджетов «Реши прямо здесь»)"
	@echo "  Ctrl+C — остановить оба."
	@trap 'kill 0' INT TERM EXIT; \
	 ( cd exercises && ./.algo-runner ) & \
	 mdbook serve & \
	 wait

## book: только dev-сервер книги
book:
	mdbook serve

## runner: только helper-сервер go test для «реши в книге»
runner:
	cd exercises && go run ./cmd/runner

## build: собрать статическую книгу в ./book
build:
	mdbook build

## docker-runner: runner в контейнере (если Go локально не установлен)
docker-runner:
	docker run --rm -p 127.0.0.1:8080:8080 -v "$(CURDIR):/w" -w /w/exercises \
	  golang:1.24 go run ./cmd/runner -listen-all

## pg-lab: поднять Postgres-лабораторию к главе «Postgres: EXPLAIN как pprof»
pg-lab:
	cd pglab && docker compose up -d
	@echo "  Жду засева: 2 млн строк, индексы, VACUUM ANALYZE…"
	@# Ждём маркер lab_ready (последний оператор init.sql) и ходим по TCP: на время
	@# засева образ поднимает временный сервер только на unix-сокете, так что TCP
	@# ответит лишь финальный сервер — тот, что уже не будет перезапущен.
	@for i in $$(seq 1 120); do \
	  if docker exec -e PGPASSWORD=algo algo-pglab psql -h 127.0.0.1 -U algo -d algolab \
	       -tAc 'SELECT 1 FROM lab_ready' 2>/dev/null | grep -qx 1; then \
	    echo "▶ База готова: make pg-psql  (или psql postgres://algo:algo@localhost:25432/algolab)"; \
	    exit 0; \
	  fi; \
	  sleep 2; \
	done; \
	echo "✗ База не поднялась за 4 минуты — смотри: docker logs algo-pglab"; exit 1

## pg-psql: psql внутри контейнера лаборатории
pg-psql:
	docker exec -it algo-pglab psql -U algo -d algolab

## pg-lab-down: погасить лабораторию и стереть её данные
pg-lab-down:
	cd pglab && docker compose down -v

## redis-lab: поднять Redis-лабораторию к главе «Капстоун: мини-Redis»
redis-lab:
	cd redislab && docker compose up -d
	@# Ждём PONG от самого redis-server (redis-cli внутри контейнера): «контейнер
	@# запущен» ещё не значит «сервер принимает команды».
	@for i in $$(seq 1 60); do \
	  if docker exec algo-redislab redis-cli ping 2>/dev/null | grep -qx PONG; then \
	    echo "▶ Redis готов: make redis-cli  (или redis-cli -p 26379); замеры главы — redislab/measure.sh all"; \
	    exit 0; \
	  fi; \
	  sleep 1; \
	done; \
	echo "✗ Redis не ответил PONG за 60 секунд — смотри: docker logs algo-redislab"; exit 1

## redis-cli: redis-cli внутри контейнера Redis-лаборатории
redis-cli:
	docker exec -it algo-redislab redis-cli

## redis-lab-down: погасить Redis-лабораторию и стереть её данные
redis-lab-down:
	cd redislab && docker compose down -v

## check: локально прогнать то, что проверяет CI
check:
	cd exercises && gofmt -l . && go vet -tags solution ./... && go test -tags solution -count=1 ./... && go run ./cmd/checksnippets -src ../src && go run ./cmd/problembank -check
	mdbook build
	node scripts/check-links.js
	node scripts/check-viz.js
	node scripts/check-challenges.js
	node scripts/check-registries.js
	node scripts/check-explain.js
	node scripts/check-ladder.js

## help: список целей
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  make /'
