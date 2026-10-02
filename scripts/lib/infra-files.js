"use strict";
// Файлы инфраструктурных виджетов — маска assets/infra-*.js, ядро ПЕРВЫМ: файлы тем берут из него
// помощники при загрузке (book.toml держит тот же порядок). Общее место, чтобы четыре скрипта
// не расходились в порядке и в том, какие файлы считать.
const fs = require("fs");
const path = require("path");

function infraFiles(root) {
  return fs.readdirSync(path.join(root, "assets"))
    .filter((n) => /^infra-.*\.js$/.test(n))
    .sort((a, b) => (a === "infra-core.js" ? -1 : b === "infra-core.js" ? 1 : a.localeCompare(b)));
}

// [{ name, src }] в порядке загрузки
function readInfra(root) {
  return infraFiles(root).map((name) => ({ name, src: fs.readFileSync(path.join(root, "assets", name), "utf8") }));
}

// по <script> на файл: ядро регистрирует window.ALGO_VIZ_INFRA до того, как темы его прочтут
function infraScriptTags(root) {
  return readInfra(root).map((f) => `<script>${f.src}</script>`).join("");
}

module.exports = { infraFiles, readInfra, infraScriptTags };
