"use strict";
// Детерминированный генератор для проверок: один и тот же seed — одна и та же последовательность,
// поэтому падение на случайном наборе воспроизводится.
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

module.exports = { mulberry32 };
