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

.PHONY: serve book runner docker-runner build check help pg-lab pg-psql pg-lab-down
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
	@echo "  Жду, пока нальются данные (2 млн строк; в первый раз дольше — качается образ)…"
	@until docker exec algo-pglab psql -U algo -d algolab -tAc \
	  'SELECT count(*) FROM orders' 2>/dev/null | grep -qx 2000000; do sleep 2; done
	@echo "▶ База готова: make pg-psql  (или psql postgres://algo:algo@localhost:55432/algolab)"

## pg-psql: psql внутри контейнера лаборатории
pg-psql:
	docker exec -it algo-pglab psql -U algo -d algolab

## pg-lab-down: погасить лабораторию и стереть её данные
pg-lab-down:
	cd pglab && docker compose down -v

## check: локально прогнать то, что проверяет CI
check:
	cd exercises && gofmt -l . && go vet -tags solution ./... && go test -tags solution -count=1 ./... && go run ./cmd/checksnippets -src ../src && go run ./cmd/problembank -check
	mdbook build
	node scripts/check-links.js
	node scripts/check-viz.js
	node scripts/check-challenges.js
	node scripts/check-registries.js
	node scripts/check-explain.js

## help: список целей
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  make /'
