/* Инфраструктурные визуализации (Postgres, Redis, Kafka). Регистрируются в движке через
 * window.ALGO_VIZ.register. Генераторы — чистые функции, экспортируются для node-теста. */
(function () {
  "use strict";
  var exportsForTest = {};
  if (typeof module !== "undefined" && module.exports) module.exports = exportsForTest;
  if (typeof window === "undefined" || !window.ALGO_VIZ) return;
})();
