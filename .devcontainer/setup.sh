#!/usr/bin/env bash
# Готовит окружение книги: mdBook нужной версии + прогрев зависимостей тренажёра.
# Запускается один раз при создании контейнера (postCreateCommand).
set -euo pipefail

MDBOOK_VERSION=0.5.2   # держать в согласии с .github/workflows/ci.yml

if ! command -v mdbook >/dev/null 2>&1; then
  echo "→ ставлю mdBook ${MDBOOK_VERSION}"
  mkdir -p "$HOME/.local/bin"
  curl -sSL "https://github.com/rust-lang/mdBook/releases/download/v${MDBOOK_VERSION}/mdbook-v${MDBOOK_VERSION}-x86_64-unknown-linux-gnu.tar.gz" \
    | tar -xz -C "$HOME/.local/bin" mdbook
  # PATH в интерактивных сессиях контейнера
  grep -qs 'HOME/.local/bin' "$HOME/.bashrc" || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi

echo "→ прогреваю сборку тренажёра (чтобы первый «Прогнать тесты» не ждал компиляции stdlib)"
( cd exercises && go build ./... )

cat <<'MSG'

Готово. Дальше:
  make serve     — книга на :3000 и runner на :8080 одной командой
  make check     — то же, что проверяет CI

Виджеты «💻 Реши прямо здесь» ходят на runner по адресу http://localhost:8080.
Если открываешь книгу через проброшенный порт (Codespaces в браузере), а не через
localhost, укажи адрес runner'а явно — в консоли браузера:
  localStorage.setItem('algoRunnerUrl', 'https://<твой-хост>-8080.app.github.dev')
и обнови страницу.
MSG
