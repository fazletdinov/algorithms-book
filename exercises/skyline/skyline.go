//go:build !solution

// Package skyline — The Skyline Problem: sweep line + макс-куча (комбинация).
// Разбор — в книге: ../../src/pattern-combinations.md (раздел «The Skyline Problem»).
//
//	go test ./skyline/                 # твои решения
//	go test -tags solution ./skyline/  # эталон
//
// Реализуй GetSkyline: по зданиям [left, right, height] верни силуэт — список
// ключевых точек [x, height], где меняется высота крыши. Идея: события левых/правых
// краёв слева направо (sweep), в каждой точке — максимум активных высот (макс-куча);
// точку фиксируем, только когда вершина кучи (текущая высота силуэта) изменилась.
package skyline

// GetSkyline возвращает силуэт города как список точек [x, height].
func GetSkyline(buildings [][]int) [][]int {
	// TODO: события (x, -h) на левом крае и (x, +h) на правом; отсортировать
	// (при равном x входы раньше выходов); макс-куча активных высот с ленивым
	// удалением; при смене вершины записать [x, вершина].
	panic("TODO: реализуй GetSkyline")
}
