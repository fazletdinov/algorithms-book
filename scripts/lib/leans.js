"use strict";
// Опоры главы ядра — ссылки первого предложения «Эта глава стоит на главе/главах …» блока «Вспомни».
// Один разбор на двоих: check-ladder.js проверяет по нему маршрут, gen-course-map.js рисует стрелки карты.
// null — предложения нет.
function leansOf(text) {
  const lean = text.match(/Эта глава стоит на глав[еах]+ ([\s\S]*?)\.(?:\s|<)/);
  if (!lean) return null;
  return [...lean[1].matchAll(/href="([\w-]+)\.md"/g)].map((m) => m[1]);
}
module.exports = { leansOf };
