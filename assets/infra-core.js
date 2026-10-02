/* Общие помощники инфраструктурных виджетов (Postgres, Redis, Kafka). Ничего не регистрирует:
 * загружается ПЕРЕД файлами тем (book.toml), в node — через require. */
(function () {
  "use strict";
  var core = {
    plural: function (n, one, few, many) { var a = n % 100, b = n % 10; return (a >= 11 && a <= 14) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many; },
    // Размеры клампятся: поля ввода открыты читателю, а сетка из 10 000 ячеек ничему не учит.
    clampInt: function (v, lo, hi, def) { var n = parseInt(v, 10); return isNaN(n) ? def : Math.max(lo, Math.min(hi, n)); },
    mulberry32: function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
    shuffled: function (n, seed) {
      var a = [], rnd = core.mulberry32(seed), i, j, k, t;
      for (i = 0; i < n; i++) a.push(i);
      for (j = n - 1; j > 0; j--) { k = Math.floor(rnd() * (j + 1)); t = a[j]; a[j] = a[k]; a[k] = t; }
      return a;
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof window !== "undefined") window.ALGO_VIZ_INFRA = core;
})();
