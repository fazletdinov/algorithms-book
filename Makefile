# Makefile — удобный запуск учебника локально.
#
#   make serve   — книга (http://localhost:3000) + runner (http://localhost:8080)
#                  ОДНОЙ командой; виджеты «💻 Реши прямо здесь» сразу работают.
#                  Ctrl+C останавливает оба.
#   make book    — только книга (mdbook serve)
#   make runner  — только helper-сервер для «реши в книге»
#   make build   — сборка книги в ./book
#   make check   — то же, что проверяет CI (gofmt, эталоны, книга, ссылки)

.PHONY: serve book runner build check help
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

## check: локально прогнать то, что проверяет CI
check:
	cd exercises && gofmt -l . && go vet -tags solution ./... && go test -tags solution -count=1 ./...
	mdbook build
	node scripts/check-links.js

## help: список целей
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  make /'
