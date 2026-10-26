package fresh

import (
	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
	"math/rand"
	"slices"
	"strconv"
	"strings"
	"testing"
)

// TestMaxSatisfiedCustomersScales — сложность, а не ответ. k = n/2: пересчёт
// выигрыша заново для каждого начала стоит k на начало, O(n·k). Сдвиг на минуту
// меняет два слагаемых — O(n).
func TestMaxSatisfiedCustomersScales(t *testing.T) {
	const n, k = 300000, 150000
	customers := make([]int, n)
	grumpy := make([]bool, n)
	for i := range customers {
		customers[i] = 1
		grumpy[i] = i%2 == 0
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MaxSatisfiedCustomers(n=300000, k=150000) — похоже на O(n·k) там, где нужен O(n)"+
			" (замер: эталон ~1 мс, перебор ~5.9 с)",
		func() { got = MaxSatisfiedCustomers(customers, grumpy, k) })
	if want := n/2 + k/2; got != want {
		t.Fatalf("MaxSatisfiedCustomers = %d, ожидалось %d", got, want)
	}
}

// TestMinBoatsScales — сложность, а не ответ. Веса вперемешку: поиск пары для
// каждого перебором оставшихся (лучший подходящий или первый подходящий) —
// O(n²). После сортировки — два конца навстречу.
func TestMinBoatsScales(t *testing.T) {
	const n, limit = 300000, 1000000000
	r := rand.New(rand.NewSource(11))
	weights := make([]int, n)
	for i := range weights {
		// Половина тяжелее половины предела: каждой паре нужен лёгкий партнёр.
		if i%2 == 0 {
			weights[i] = limit/2 + 1 + r.Intn(limit/2)
		} else {
			weights[i] = 1 + r.Intn(limit/2)
		}
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinBoats(n=300000, веса вперемешку) — похоже на O(n²) там, где нужен O(n log n)"+
			" (замер: эталон ~20 мс; сортировка с удалением партнёра из среза ~9.3 с,"+
			" поиск партнёра без сортировки — больше 2 мин)",
		func() { got = MinBoats(weights, limit) })
	if got < n/2 || got > n {
		t.Fatalf("MinBoats = %d, ответ обязан быть между %d и %d", got, n/2, n)
	}
}

// TestBestClosingHourScales — сложность, а не ответ. Штраф каждого часа заново —
// n на час, O(n²); при переходе к следующему часу меняется одно слагаемое.
func TestBestClosingHourScales(t *testing.T) {
	const n = 300000
	b := make([]byte, n)
	for i := range b {
		b[i] = 'Y'
	}
	log := string(b)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"BestClosingHour(n=300000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~0.3 мс, перебор ~11.6 с)",
		func() { got = BestClosingHour(log) })
	if got != n {
		t.Fatalf("BestClosingHour(все 'Y') = %d, ожидалось %d", got, n)
	}
}

// TestCountSteadyPairsScales — сложность, а не ответ. nums[i] = i: ровная КАЖДАЯ
// пара, и перебору пар нечем сократить n²/2 сравнений. Счёт ключей — O(n).
func TestCountSteadyPairsScales(t *testing.T) {
	const n = 300000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = i
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CountSteadyPairs(n=300000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~5 мс, перебор ~6.4 с)",
		func() { got = CountSteadyPairs(nums) })
	if want := n * (n - 1) / 2; got != want {
		t.Fatalf("CountSteadyPairs(0..n-1) = %d, ожидалось %d", got, want)
	}
}

// TestLongestWarmingSpanScales — сложность, а не ответ. Температура строго падает:
// ответ 0, и перебор пар — от каждого i с конца с выходом на первом подходящем
// j или по ширине от большей к меньшей — проверяет все n²/2 пар. Стек — O(n).
func TestLongestWarmingSpanScales(t *testing.T) {
	const n = 200000
	temps := make([]int, n)
	for i := range temps {
		temps[i] = n - i
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LongestWarmingSpan(n=200000, строгое похолодание) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~3 мс; перебор с выходом ~8.2 с, по ширине ~10.8 с)",
		func() { got = LongestWarmingSpan(temps) })
	if got != 0 {
		t.Fatalf("LongestWarmingSpan(строгое похолодание) = %d, ожидалось 0", got)
	}
}

// TestMinTimeForTripsScales — сложность, а не ответ. Ответы до 10¹⁸ минут: перебор T
// по одному и пошаговая симуляция рейсов (до 10¹² событий) до них не доходят; поиск
// границы по T — около 60 проверок по n. Третий вход — ещё и про переполнение: сто
// тысяч быстрых автобусов и один медленный; если искать до max(tripTime)·totalTrips
// и складывать рейсы всех автобусов до конца, сумма на середине не помещается в int.
func TestMinTimeForTripsScales(t *testing.T) {
	const total = 1000000000000
	same := make([]int, 100000)
	for i := range same {
		same[i] = 1000000
	}
	fast := make([]int, 100000)
	for i := range fast {
		fast[i] = 1
	}
	fast[0] = 1000000
	tests := []struct {
		name     string
		tripTime []int
		want     int
	}{
		{"один медленный автобус, ответ 10¹⁸", []int{1000000}, 1000000000000000000},
		{"сто тысяч одинаковых, ответ 10¹³", same, 10000000000000},
		{"сумма рейсов не помещается в int", fast, 10000101},
	}
	for _, tt := range tests {
		var got int
		scaletest.Within(t, scaletest.Limit,
			"MinTimeForTrips("+tt.name+", totalTrips=10¹²) — похоже на перебор T или симуляцию рейсов"+
				" там, где нужен поиск по ответу (замер: эталон до ~11 мс, перебор не завершается)",
			func() { got = MinTimeForTrips(tt.tripTime, total) })
		if got != tt.want {
			t.Fatalf("MinTimeForTrips(%s) = %d, ожидалось %d", tt.name, got, tt.want)
		}
	}
}

// TestTotalBusyTimeScales — сложность, а не ответ. Сеансы не пересекаются и идут
// вразнобой, концы — до 10⁹: разметка каждого момента времени не завершается, а
// вставка в список склеенных без сортировки — O(n²). Сортировка — O(n log n).
func TestTotalBusyTimeScales(t *testing.T) {
	const n = 200000
	r := rand.New(rand.NewSource(12))
	sessions := make([][2]int, n)
	for i, p := range r.Perm(n) {
		sessions[i] = [2]int{p * 5000, p*5000 + 1}
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"TotalBusyTime(n=200000 непересекающихся сеансов вразнобой) — похоже на O(n²) там, где нужен O(n log n)"+
			" (замер: эталон ~30 мс; склеенные на месте ~71 с, с новым срезом на каждый сеанс — больше 200 с)",
		func() { got = TotalBusyTime(sessions) })
	if got != n {
		t.Fatalf("TotalBusyTime = %d, ожидалось %d", got, n)
	}
}

// TestHIndexScales — сложность, а не ответ. Половина статей с n цитированиями,
// половина без: h = n/2, и перебор h с подсчётом статей — что сверху вниз, что
// снизу вверх с выходом на первом неудачном — делает ~n²/2 шагов. Подсчёт по
// корзинам — O(n), сортировка — O(n log n).
func TestHIndexScales(t *testing.T) {
	const n = 300000
	citations := make([]int, n)
	for i := 0; i < n; i += 2 {
		citations[i] = n
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"HIndex(n=300000, h = n/2) — похоже на O(n²) там, где нужен O(n) или O(n log n)"+
			" (замер: эталон ~1 мс; перебор h сверху ~14 с, снизу ~16 с)",
		func() { got = HIndex(citations) })
	if got != n/2 {
		t.Fatalf("HIndex = %d, ожидалось %d", got, n/2)
	}
}

// Тесты масштаба: не ответ, а класс сложности. Каждый вход — худший для
// перебора, который хуже задуманного на целый класс; замеры — в тексте падения.

func TestMaxTwinSumScales(t *testing.T) {
	const n = 200000
	vals := make([]int, n)
	for i := range vals {
		vals[i] = i % 1000
	}
	// Пары по краям дают 999; одна пара в глубине — 100000.
	vals[1234], vals[n-1-1234] = 50000, 50000
	head := g2list(vals)
	const want = 100000
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MaxTwinSum(список из 200000 узлов) — похоже на O(n²): к каждому близнецу идёшь от головы заново"+
			" (замер: эталон ~1 мс, перебор ~20 с)",
		func() { got = MaxTwinSum(head) })
	if got != want {
		t.Fatalf("MaxTwinSum = %d, ожидалось %d", got, want)
	}
}

// g2chainTree — цепочка из n узлов, вправо и влево через раз; значение узла на
// глубине d (с 1) — d, поэтому тяжелее всех последний уровень.
func g2chainTree(n int) *TreeNode {
	root := &TreeNode{Val: 1}
	cur := root
	for d := 2; d <= n; d++ {
		next := &TreeNode{Val: d}
		if d%2 == 0 {
			cur.Left = next
		} else {
			cur.Right = next
		}
		cur = next
	}
	return root
}

func TestHeaviestLevelScales(t *testing.T) {
	const n = 100000
	root := g2chainTree(n)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"HeaviestLevel(цепочка из 100000 узлов) — похоже на O(n·h): отдельный обход дерева на каждый уровень"+
			" (замер: эталон ~2 мс, перебор ~67 с)",
		func() { got = HeaviestLevel(root) })
	if got != n {
		t.Fatalf("HeaviestLevel = %d, ожидалось %d", got, n)
	}
}

func TestTimeToNotifyAllScales(t *testing.T) {
	const n = 200000
	// Цепочка подчинения во всю компанию в перемешанном порядке номеров.
	rng := rand.New(rand.NewSource(31))
	order := rng.Perm(n)
	manager := make([]int, n)
	notifyTime := make([]int, n)
	manager[order[0]] = -1
	for k := 1; k < n; k++ {
		manager[order[k]] = order[k-1]
	}
	for k := 0; k < n-1; k++ {
		notifyTime[order[k]] = 1
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"TimeToNotifyAll(цепочка из 200000 сотрудников) — похоже на O(n·h): от каждого сотрудника"+
			" поднимаешься к директору заново (замер: эталон ~25 мс, перебор > 90 с)",
		func() { got = TimeToNotifyAll(manager, notifyTime) })
	if got != n-1 {
		t.Fatalf("TimeToNotifyAll = %d, ожидалось %d", got, n-1)
	}
}

func TestClosestPricesScales(t *testing.T) {
	const n, q = 100000, 100000
	prices := make([]int, n)
	for i := range prices {
		prices[i] = 10 * i
	}
	root := g2bst(prices)
	queries := make([]int, q)
	for i := range queries {
		queries[i] = 10*((i*7919)%n) + 4 // на 4 выше цены — ближе к ней, чем к следующей
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"ClosestPrices(100000 цен, 100000 запросов) — похоже на O(n·q): каждый запрос перебирает весь каталог"+
			" (замер: эталон ~14 мс, перебор ~35 с)",
		func() { got = ClosestPrices(root, queries) })
	for i, qv := range queries {
		if want := qv - 4; got[i] != want {
			t.Fatalf("ClosestPrices: на запрос %d ответ %d, ожидалось %d", qv, got[i], want)
		}
	}
}

func TestFurthestStopScales(t *testing.T) {
	const n = 500000
	// Пила: подъём на случайную высоту, затем спуск обратно. Подъёмы случайные —
	// вставка в отсортированный срез сдвигает в среднем половину.
	rng := rand.New(rand.NewSource(32))
	heights := make([]int, n)
	var climbs []int
	for i := range heights {
		heights[i] = 1
		if i%2 == 1 {
			d := 1 + rng.Intn(999999)
			heights[i] += d
			climbs = append(climbs, d)
		}
	}
	rides := len(climbs) / 2
	// Энергии ровно на все подъёмы, кроме rides самых высоких: дойти можно до конца.
	sorted := slices.Clone(climbs)
	slices.Sort(sorted)
	energy := 0
	for _, d := range sorted[:len(sorted)-rides] {
		energy += d
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"FurthestStop(500000 точек, 125000 попуток) — похоже на O(n²): на каждой точке заново выбираешь,"+
			" каким подъёмам отдать попутки (замер: эталон ~29 мс; пересортировка на каждой точке > 90 с, вставка в отсортированный срез ~5 с)",
		func() { got = FurthestStop(heights, energy, rides) })
	if got != n-1 {
		t.Fatalf("FurthestStop = %d, ожидалось %d", got, n-1)
	}
}

func TestCableMovesToConnectScales(t *testing.T) {
	const n = 200000
	// Цепочка офисов без одного звена в середине: два куска, кабелей n−2 —
	// не хватает. Плюс один лишний кабель в первом куске — хватает, ответ 1.
	cables := make([][]int, 0, n)
	for i := 0; i+1 < n; i++ {
		if i != n/2 {
			cables = append(cables, []int{i, i + 1})
		}
	}
	cables = append(cables, []int{0, 2})
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CableMovesToConnect(цепочка из 200000 офисов) — похоже на O(n·m): соседей ищешь перебором всех"+
			" кабелей или куски сливаешь перекрашиванием всех офисов (замер: эталон ~18 мс, перекрашивание ~12 с)",
		func() { got = CableMovesToConnect(n, cables) })
	if got != 1 {
		t.Fatalf("CableMovesToConnect = %d, ожидалось 1", got)
	}
}

func TestFastestRoutesCountScales(t *testing.T) {
	// Цепочка ромбов: a → b1 → c и a → b2 → c за одно время, ромбов k.
	// Быстрейших маршрутов 2^k.
	const k = 33333
	n := 3*k + 1
	roads := make([][]int, 0, 4*k)
	for i := 0; i < k; i++ {
		a := 3 * i
		roads = append(roads,
			[]int{a, a + 1, 2}, []int{a + 1, a + 3, 3},
			[]int{a, a + 2, 4}, []int{a + 2, a + 3, 1})
	}
	want := 1
	for i := 0; i < k; i++ {
		want = want * 2 % g2testMod
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"FastestRoutesCount(цепочка ромбов, 100000 перекрёстков) — похоже на O(n²): ближайший перекрёсток"+
			" ищешь просмотром всех (замер: эталон ~9 мс, поиск ближайшего просмотром ~7 с)",
		func() { got = FastestRoutesCount(n, roads) })
	if got != want {
		t.Fatalf("FastestRoutesCount = %d, ожидалось %d", got, want)
	}
}

const g2testMod = 1_000_000_007

func TestMinBuildTimeScales(t *testing.T) {
	const n = 200000
	// Цепочка модулей; зависимости перечислены с конца — пересчёт «пока меняется»
	// продвигается на один модуль за проход.
	duration := make([]int, n)
	deps := make([][]int, 0, n-1)
	for i := range duration {
		duration[i] = 1 + i%3
	}
	for i := n - 2; i >= 0; i-- {
		deps = append(deps, []int{i, i + 1})
	}
	want := 0
	for _, d := range duration {
		want += d
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinBuildTime(цепочка из 200000 модулей) — похоже на O(n·m): времена пересчитываются проходами,"+
			" пока меняются (замер: эталон ~8 мс, проходы «пока меняется» ~82 с, рекурсия без запоминания > 90 с)",
		func() { got = MinBuildTime(n, duration, deps) })
	if got != want {
		t.Fatalf("MinBuildTime = %d, ожидалось %d", got, want)
	}
}

// Тесты масштаба проверяют класс сложности, а не ответ: перебор после срока крутится
// в горутине до выхода бинарника, поэтому файл идёт последним. У MaxUniqueParts и
// CountMagnetWords теста масштаба нет: их ответ сам растёт экспоненциально.

// g3Xorshift — детерминированный генератор входов (зерно не нуль).
func g3Xorshift(x *uint32) uint32 {
	*x ^= *x << 13
	*x ^= *x >> 17
	*x ^= *x << 5
	return *x
}

// TestSplitBetweenOfficesScales: 2·10⁵ сотрудников. Перебор половин — 2ⁿ, таблица
// «сколько уже в A» — n·n/2 = 2·10¹⁰ клеток; сортировка — n log n.
func TestSplitBetweenOfficesScales(t *testing.T) {
	const n = 200000
	costs := make([][2]int, n)
	x := uint32(2463534242)
	want := 0
	for i := range costs {
		a := 1 + int(g3Xorshift(&x)%5000)
		// Первая половина дешевле в A на 5000, вторая — в B: ответ известен заранее.
		if i < n/2 {
			costs[i] = [2]int{a, a + 5000}
		} else {
			costs[i] = [2]int{a + 5000, a}
		}
		want += a
	}
	// Перемешиваем, чтобы порядок входа не подсказывал ответ.
	for i := n - 1; i > 0; i-- {
		j := int(g3Xorshift(&x) % uint32(i+1))
		costs[i], costs[j] = costs[j], costs[i]
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"SplitBetweenOffices на 2·10⁵ сотрудниках — похоже на перебор или таблицу n×n/2 там, где нужен"+
			" O(n log n) (замер: эталон ~3 мс, таблица по числу уже в A — 17 с)",
		func() { got = SplitBetweenOffices(costs) })
	if got != want {
		t.Fatalf("SplitBetweenOffices = %d, ожидалось %d", got, want)
	}
}

// TestMinTicketCostScales: 10⁵ поездок подряд, ежедневно. Перебор покупок без
// запоминания — 3 ветки на каждую непокрытую поездку, экспонента; запоминание по
// номеру поездки — O(n).
func TestMinTicketCostScales(t *testing.T) {
	const n = 100000
	days := make([]int, n)
	for i := range days {
		days[i] = i + 1
	}
	costs := [3]int{2, 7, 15}
	// 3333 месячных по 15 покрывают 99990 дней; хвост из 10 дней дешевле закрыть
	// недельным и тремя разовыми: 7 + 3·2 = 13 < 15.
	want := n/30*15 + 13
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinTicketCost на 10⁵ ежедневных поездках — похоже на перебор покупок без запоминания"+
			" (экспонента) там, где нужен O(n) (замер: эталон ~1 мс, перебор не завершился за 40 с)",
		func() { got = MinTicketCost(days, costs) })
	if got != want {
		t.Fatalf("MinTicketCost = %d, ожидалось %d", got, want)
	}
}

// TestCanMergeLogsScales: a = "a"×999 + "x", b = "a"×1000, merged = "a"×998 + "x" + …
// Счёт букв сходится, но перед x в merged только 998 букв a, а a требует 999 —
// ответ «нет». Перебор без запоминания раскладывает первые 998 букв a между двумя
// журналами всеми способами (около 2⁹⁹⁸), таблица — 10⁶ клеток.
func TestCanMergeLogsScales(t *testing.T) {
	a := strings.Repeat("a", 999) + "x"
	b := strings.Repeat("a", 1000)
	merged := strings.Repeat("a", 998) + "x" + strings.Repeat("a", 1001)
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"CanMergeLogs на журналах по 1000 событий — похоже на перебор без запоминания (экспонента)"+
			" там, где нужен O(len(a)·len(b)) (замер: эталон ~1 мс, перебор не завершился за 40 с)",
		func() { got = CanMergeLogs(a, b, merged) })
	if got {
		t.Fatalf("CanMergeLogs = true, ожидалось false")
	}
}

// TestMaxOrdersInVanScales: 200 заказов, у каждого вес + объём = 40, лимиты по 200 —
// влезает не больше 10 заказов, и оценка «взято + сколько осталось» ничего не
// отсекает. Перебор наборов — 2²⁰⁰; таблица — 200·200·200 = 8·10⁶ клеток.
func TestMaxOrdersInVanScales(t *testing.T) {
	const n = 200
	orders := make([][2]int, n)
	x := uint32(362436069)
	for i := range orders {
		w := 1 + int(g3Xorshift(&x)%39)
		orders[i] = [2]int{w, 40 - w}
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MaxOrdersInVan на 200 заказах и лимитах 200×200 — похоже на перебор наборов (экспонента)"+
			" там, где нужен O(n·maxWeight·maxVolume) (замер: эталон ~10 мс, перебор не завершился за 40 с)",
		func() { got = MaxOrdersInVan(orders, 200, 200) })
	if got != 10 {
		t.Fatalf("MaxOrdersInVan = %d, ожидалось 10", got)
	}
}

// TestLastInCircleScales: миллион детей и огромное k. Модель круга срезом или
// списком — O(n²) (каждое выбывание сдвигает или проходит до половины круга),
// пересчёт номера от меньшего круга — O(n).
func TestLastInCircleScales(t *testing.T) {
	const n = 1000000
	const k = 999999937
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LastInCircle(10⁶, 999999937) — похоже на моделирование круга, O(n²), там, где нужен O(n)"+
			" (замер: эталон ~5 мс, модель срезом — больше 40 с)",
		func() { got = LastInCircle(n, k) })
	// Ответ не выводится в уме: он снят с эталона и сверен с моделью круга на
	// дереве Фенвика (O(n log n), другой способ — то же 946435).
	const want = 946435
	if got != want {
		t.Fatalf("LastInCircle = %d, ожидалось %d", got, want)
	}
}

// TestVisibleAheadScales — сложность, а не ответ. Рост убывает: никто не
// заслонён выше себя, и просмотр вправо от каждого — даже с остановкой на
// первом, кто выше, — идёт до конца очереди, O(n²).
func TestVisibleAheadScales(t *testing.T) {
	const n = 200000
	heights := make([]int, n)
	for i := range heights {
		heights[i] = n - i
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"VisibleAhead(200000 человек по убыванию роста) — похоже на O(n²): от каждого смотришь вправо до конца"+
			" (замер: эталон ~1 мс, перебор с остановкой на высоком ~10.5 с)",
		func() { got = VisibleAhead(heights) })
	for i, v := range got {
		if want := min(1, n-1-i); v != want {
			t.Fatalf("VisibleAhead: человек %d видит %d, ожидалось %d", i, v, want)
		}
	}
}

// TestSurvivingRobotsScales — сложность, а не ответ. Один тяжёлый в конце едет
// влево и разбивает всех: моделирование «найди первое столкновение и убери» — n
// проходов по n роботам.
func TestSurvivingRobotsScales(t *testing.T) {
	const n = 200000
	robots := make([]int, n)
	for i := range robots {
		robots[i] = 1
	}
	robots[n-1] = -1000
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"SurvivingRobots(199999 лёгких вправо и один тяжёлый влево) — похоже на O(n²): по столкновению за проход"+
			" (замер: эталон ~1 мс, моделирование ~13 с)",
		func() { got = SurvivingRobots(robots) })
	if len(got) != 1 || got[0] != -1000 {
		t.Fatalf("SurvivingRobots: уцелели %d роботов, ожидался один −1000", len(got))
	}
}

// TestStateAfterScales — сложность, а не ответ. Хвост 5·10⁵ и кольцо 5·10⁵, k = 10¹⁸:
// шагать k раз нельзя, а поиск повтора линейным просмотром пройденного — O((μ+λ)²).
func TestStateAfterScales(t *testing.T) {
	const tail, loop = 500000, 500000
	const k = 1_000_000_000_000_000_000
	next := func(x int) int {
		if x == tail+loop-1 {
			return tail
		}
		return x + 1
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"StateAfter(хвост 500000, кольцо 500000, k = 10¹⁸) — похоже на шаги по одному или поиск повтора просмотром"+
			" пройденного (замер: эталон ~7 мс, просмотр пройденного и шаги по одному > 60 с)",
		func() { got = StateAfter(0, next, k) })
	if want := tail + (k-tail)%loop; got != want {
		t.Fatalf("StateAfter = %d, ожидалось %d", got, want)
	}
}

// TestHasRoundTripScales — сложность, а не ответ. Все прыгают вперёд на 1, последний —
// назад: путь из каждой клетки доходит до конца и ломается. Без пометки тупиков
// проверка из каждой клетки заново — O(n²).
func TestHasRoundTripScales(t *testing.T) {
	const n = 200000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = 1
	}
	nums[n-1] = -1
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"HasRoundTrip(200000 клеток, тупик в конце) — похоже на O(n²): тупики не помечаются"+
			" (замер: эталон ~5 мс, два бегуна из каждой клетки без пометки > 60 с)",
		func() { got = HasRoundTrip(nums) })
	if got {
		t.Fatalf("HasRoundTrip = true, ожидалось false")
	}
}

// TestCountSplitsScales — сложность, а не ответ. Заказы не пересекаются: склейка
// групп проверкой всех пар — O(n²).
func TestCountSplitsScales(t *testing.T) {
	const n = 200000
	ranges := make([][2]int, n)
	rng := rand.New(rand.NewSource(71))
	for i, p := range rng.Perm(n) {
		ranges[i] = [2]int{3 * p, 3*p + 1}
	}
	want := 1
	for range n {
		want = want * 2 % 1_000_000_007
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CountSplits(200000 непересекающихся заказов) — похоже на O(n²): каждая пара проверяется на пересечение"+
			" (замер: эталон ~30 мс, перебор пар ~58 с)",
		func() { got = CountSplits(ranges) })
	if got != want {
		t.Fatalf("CountSplits = %d, ожидалось %d", got, want)
	}
}

// TestFirstCommonSlotScales — сложность, а не ответ. Промежутки двоих чередуются и
// не пересекаются: перебор всех пар — n·m.
func TestFirstCommonSlotScales(t *testing.T) {
	const n = 100000
	a, b := make([][2]int, n), make([][2]int, n)
	rng := rand.New(rand.NewSource(72))
	for i, p := range rng.Perm(n) {
		a[i] = [2]int{4 * p, 4*p + 2}
	}
	for i, p := range rng.Perm(n) {
		b[i] = [2]int{4*p + 2, 4*p + 4}
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"FirstCommonSlot(100000 и 100000 промежутков) — похоже на O(n·m): проверяется каждая пара"+
			" (замер: эталон ~26 мс, перебор пар ~9 с)",
		func() { got = FirstCommonSlot(a, b, 1) })
	if got != -1 {
		t.Fatalf("FirstCommonSlot = %d, ожидалось −1", got)
	}
}

// TestKioskSpacingScales — сложность, а не ответ. 99999 мест через 5000 м и одно
// далеко: ответ ~2·10⁵, а верхняя оценка ~4·10⁵ — перебор d по одному и снизу, и
// сверху делает ~2·10⁵ проверок по n мест.
func TestKioskSpacingScales(t *testing.T) {
	const n, m = 100000, 2500
	positions := make([]int, n)
	for i := range n - 1 {
		positions[i] = 1 + 5000*i
	}
	positions[n-1] = 1_000_000_000
	rng := rand.New(rand.NewSource(73))
	rng.Shuffle(n, func(i, j int) { positions[i], positions[j] = positions[j], positions[i] })
	var got int
	scaletest.Within(t, scaletest.Limit,
		"KioskSpacing(100000 мест, 2500 киосков) — похоже на перебор расстояния по одному"+
			" (замер: эталон ~7 мс, перебор d сверху ~14 с, снизу ~8 с)",
		func() { got = KioskSpacing(positions, m) })
	if want := 200000; got != want {
		t.Fatalf("KioskSpacing = %d, ожидалось %d", got, want)
	}
}

// TestFindOnTrailScales — сложность, а не ответ. Тропа в 10¹⁰ точек, вершина на
// десятой части, нужная точка — посреди спуска: обход по точкам с любого конца —
// больше 4·10⁹ запросов; и бюджет — не больше 200.
func TestFindOnTrailScales(t *testing.T) {
	const n = 10_000_000_000
	const peak = n / 10
	const at = peak + 4_500_000_003 // высоты подъёма кратны 10, у этой точки — нет
	calls := 0
	height := func(i int) int {
		calls++
		if i <= peak {
			return 10 * i
		}
		return 10*peak - (i - peak)
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"FindOnTrail(тропа в 10¹⁰ точек) — похоже на обход по точкам"+
			" (замер: эталон — 131 запрос, обход слева ~8.5 с, справа ~15.6 с)",
		func() { got = FindOnTrail(n, height, 10*peak-(at-peak)) })
	if got != at {
		t.Fatalf("FindOnTrail = %d, ожидалось %d", got, at)
	}
	if calls > 200 {
		t.Fatalf("FindOnTrail: %d запросов height, а можно не больше 200", calls)
	}
}

// g5chain — цепочка из n узлов со значениями vals[0], vals[1], …: каждый следующий —
// правый ребёнок, если его значение больше, иначе левый.
func g5chain(vals []int) *TreeNode {
	root := &TreeNode{Val: vals[0]}
	cur := root
	for _, v := range vals[1:] {
		next := &TreeNode{Val: v}
		if v > cur.Val {
			cur.Right = next
		} else {
			cur.Left = next
		}
		cur = next
	}
	return root
}

// TestPriceBonusScales — сложность, а не ответ. Цепочка из 10⁵ цен: сумма больших
// заново для каждого узла — O(n²).
func TestPriceBonusScales(t *testing.T) {
	const n = 100000
	vals := make([]int, n)
	for i := range vals {
		vals[i] = i + 1
	}
	root := g5chain(vals)
	scaletest.Within(t, scaletest.Limit,
		"PriceBonus(цепочка из 100000 цен) — похоже на O(n²): для каждой цены заново складываешь все большие"+
			" (замер: эталон ~5 мс, перебор ~5.1 с)",
		func() { root = PriceBonus(root) })
	for node, i := root, 1; node != nil; node, i = node.Right, i+1 {
		if want := (i + n) * (n - i + 1) / 2; node.Val != want {
			t.Fatalf("PriceBonus: у цены %d бонус %d, ожидалось %d", i, node.Val, want)
		}
	}
}

// TestMinPriceGapScales — сложность, а не ответ. Цепочка из 2·10⁵ цен, близкие —
// только последние две: сравнение всех пар — O(n²).
func TestMinPriceGapScales(t *testing.T) {
	const n = 200000
	vals := make([]int, n)
	for i := range vals {
		vals[i] = 1000 * i
	}
	vals[n-1] = vals[n-2] + 7
	root := g5chain(vals)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinPriceGap(цепочка из 200000 цен) — похоже на O(n²): сравниваются все пары"+
			" (замер: эталон ~1 мс, перебор пар ~14 с)",
		func() { got = MinPriceGap(root) })
	if got != 7 {
		t.Fatalf("MinPriceGap = %d, ожидалось 7", got)
	}
}

// g5festiveChain — праздничная цепочка из n лампочек: на ярусе d номер d+1.
func g5festiveChain(n int) *TreeNode {
	root := &TreeNode{Val: 1}
	cur := root
	for d := 1; d < n; d++ {
		next := &TreeNode{Val: d + 1}
		if d%2 == 0 {
			cur.Left = next
		} else {
			cur.Right = next
		}
		cur = next
	}
	return root
}

func TestIsFestiveTreeScales(t *testing.T) {
	const n = 100000
	root := g5festiveChain(n)
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"IsFestiveTree(цепочка из 100000 лампочек) — похоже на O(n·h): отдельный обход дерева на каждый ярус"+
			" (замер: эталон ~2 мс, перебор > 60 с)",
		func() { got = IsFestiveTree(root) })
	if !got {
		t.Fatalf("IsFestiveTree = false, ожидалось true")
	}
}

func TestMinutesToSpreadScales(t *testing.T) {
	const n = 100000
	root := g2chainTree(n) // значения 1…n сверху вниз
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinutesToSpread(цепочка из 100000 сотрудников, слух из середины) — похоже на O(n·ответ):"+
			" каждую минуту просматривается вся компания (замер: эталон ~26 мс, перебор > 60 с)",
		func() { got = MinutesToSpread(root, n/2) })
	if want := n - n/2; got != want {
		t.Fatalf("MinutesToSpread = %d, ожидалось %d", got, want)
	}
}

// Тесты масштаба порции g4: не ответ, а класс сложности. Замеры — в тексте падения.

func TestLongestWellStockedRunScales(t *testing.T) {
	// Алфавит по кругу: каждого товара 7692 штуки, а нужно 7693 — годного отрезка
	// нет, и перебору отрезков нечем сократить работу.
	const n, k = 26 * 7692, 7693
	s := strings.Repeat("abcdefghijklmnopqrstuvwxyz", n/26)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LongestWellStockedRun(n=199992, k=7693) — похоже на O(n²) перебор отрезков там, где нужен O(26·n)"+
			" (замер: эталон ~1 мс, перебор отрезков ~16 с)",
		func() { got = LongestWellStockedRun(s, k) })
	if got != 0 {
		t.Fatalf("LongestWellStockedRun = %d, ожидалось 0", got)
	}
}

func TestCalmArrangementScales(t *testing.T) {
	const n = 1000
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"CalmArrangement(n=1000) — похоже на перебор расстановок там, где нужно разбиение пополам"+
			" (замер: эталон меньше 1 мс, перебор с возвратом не уложился и в 100 с)",
		func() { got = CalmArrangement(n) })
	if why := g4CheckCalm(got, n); why != "" {
		t.Fatalf("CalmArrangement(%d) — не спокойная: %s", n, why)
	}
}

func TestMatchingRowsAndColumnsScales(t *testing.T) {
	// Вся схема одного цвета: каждая строка совпадает с каждым столбцом, и
	// поэлементное сравнение не обрывается раньше конца — n³.
	const n = 1500
	grid := make([][]int, n)
	for i := range grid {
		grid[i] = make([]int, n)
		for j := range grid[i] {
			grid[i][j] = 7
		}
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MatchingRowsAndColumns(n=1500, один цвет) — похоже на O(n³) там, где нужен O(n²)"+
			" (замер: эталон ~25 мс, поэлементное сравнение ~15 с)",
		func() { got = MatchingRowsAndColumns(grid) })
	if got != n*n {
		t.Fatalf("MatchingRowsAndColumns = %d, ожидалось %d", got, n*n)
	}
}

func TestFewestCutBricksScales(t *testing.T) {
	// 10⁴ рядов по 20 кирпичей, швы почти все разные: подсчёт рядов для каждого
	// шва отдельно — (число швов)·(число рядов или кирпичей).
	const rows, per, width = 10000, 20, 1000000000
	r := rand.New(rand.NewSource(61))
	wall := make([][]int, rows)
	for i := range wall {
		cuts := make([]int, 0, per+1)
		for len(cuts) < per-1 {
			cuts = append(cuts, 1+r.Intn(width-1))
		}
		cuts = append(cuts, 0, width)
		slices.Sort(cuts)
		cuts = slices.Compact(cuts)
		for j := 1; j < len(cuts); j++ {
			wall[i] = append(wall[i], cuts[j]-cuts[j-1])
		}
	}
	// Общий шов у многих рядов случайно не появится: ответ — rows − 1 или чуть меньше.
	var got int
	scaletest.Within(t, scaletest.Limit,
		"FewestCutBricks(10⁴ рядов × 20 кирпичей) — похоже на перебор швов с подсчётом по рядам"+
			" (замер: эталон ~10 мс, перебор швов по множествам рядов ~22 с)",
		func() { got = FewestCutBricks(wall) })
	if got < rows-3 || got > rows-1 {
		t.Fatalf("FewestCutBricks = %d, ожидалось около %d", got, rows-1)
	}
}

// g4nodes — n узлов в общем массиве (одно выделение); g4relink заново сцепляет их
// в список с данными значениями, ничего не выделяя.
func g4relink(nodes []ListNode, vals func(i int) int) *ListNode {
	for i := range nodes {
		nodes[i].Val = vals(i)
		nodes[i].Next = nil
		if i+1 < len(nodes) {
			nodes[i].Next = &nodes[i+1]
		}
	}
	if len(nodes) == 0 {
		return nil
	}
	return &nodes[0]
}

func TestSplitByThresholdScales(t *testing.T) {
	const n = 200000
	nodes := make([]ListNode, n)
	head := g4relink(nodes, func(i int) int { return i % 2 }) // через одного срочный
	var got *ListNode
	scaletest.Within(t, scaletest.Limit,
		"SplitByThreshold(200000 узлов через одного) — похоже на O(n²): к концу группы идёшь от головы заново"+
			" (замер: эталон ~1 мс, вставка с проходом от головы ~20 с)",
		func() { got = SplitByThreshold(head, 1) })
	node := got
	for i := 0; i < n; i++ {
		want := 0
		if i >= n/2 {
			want = 1
		}
		if node == nil || node.Val != want {
			t.Fatalf("SplitByThreshold: узел %d не %d", i, want)
		}
		node = node.Next
	}
	if node != nil {
		t.Fatalf("SplitByThreshold: после %d узлов список не кончился", n)
	}
}

func TestSplitByThresholdNoAllocs(t *testing.T) {
	nodes := make([]ListNode, 1000)
	allocs := testing.AllocsPerRun(20, func() {
		SplitByThreshold(g4relink(nodes, func(i int) int { return i % 3 }), 1)
	})
	if allocs != 0 {
		t.Fatalf("SplitByThreshold выделяет память %.0f раз за вызов — узлы надо переставлять, а не копировать", allocs)
	}
}

func TestDropRepeatedScales(t *testing.T) {
	const n = 200000
	nodes := make([]ListNode, n)
	head := g4relink(nodes, func(i int) int { return i }) // повторов нет вовсе
	var got *ListNode
	scaletest.Within(t, scaletest.Limit,
		"DropRepeated(200000 разных заказов) — похоже на O(n²): каждый номер ищешь по всему списку"+
			" (замер: эталон меньше 1 мс, подсчёт каждого номера по всему списку ~52 с)",
		func() { got = DropRepeated(head) })
	c := 0
	for node := got; node != nil && c <= n; node = node.Next {
		c++
	}
	if c != n {
		t.Fatalf("DropRepeated: осталось %d узлов, ожидалось %d", c, n)
	}
}

func TestDropRepeatedNoAllocs(t *testing.T) {
	nodes := make([]ListNode, 1000)
	allocs := testing.AllocsPerRun(20, func() {
		DropRepeated(g4relink(nodes, func(i int) int {
			if i < 500 {
				return i / 2 // пары одинаковых — уйдут
			}
			return i
		}))
	})
	if allocs != 0 {
		t.Fatalf("DropRepeated выделяет память %.0f раз за вызов — узлы надо перецеплять, а не копировать", allocs)
	}
}

func TestSplitIntoConvoysScales(t *testing.T) {
	const n = 200000
	nodes := make([]ListNode, n)
	head := g4relink(nodes, func(i int) int { return i })
	var got []*ListNode
	scaletest.Within(t, scaletest.Limit,
		"SplitIntoConvoys(200000 узлов, k=200000) — похоже на O(n·k): к началу каждого конвоя идёшь от головы"+
			" (замер: эталон ~2 мс, проход от головы к каждому конвою ~26 с)",
		func() { got = SplitIntoConvoys(head, n) })
	for i, h := range got {
		if h == nil || h.Val != i || h.Next != nil {
			t.Fatalf("SplitIntoConvoys: конвой %d — не один узел %d", i, i)
		}
	}
}

func TestSplitIntoConvoysNoAllocs(t *testing.T) {
	nodes := make([]ListNode, 1000)
	allocs := testing.AllocsPerRun(20, func() {
		SplitIntoConvoys(g4relink(nodes, func(i int) int { return i }), 7)
	})
	if allocs > 1 { // одно выделение — сам срез ответа
		t.Fatalf("SplitIntoConvoys выделяет память %.0f раз за вызов — кроме среза ответа, ничего не нужно", allocs)
	}
}

func TestMinTotalWalkScales(t *testing.T) {
	const n = 200000
	r := rand.New(rand.NewSource(62))
	houses := make([]int, n)
	for i := range houses {
		houses[i] = r.Intn(2000000001) - 1000000000
	}
	want := g4WalkRef(slices.Clone(houses))
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinTotalWalk(n=200000) — похоже на O(n²): сумма шагов для каждого дома заново"+
			" (замер: эталон ~13 мс, перебор места встречи ~19 с)",
		func() { got = MinTotalWalk(houses) })
	if got != want {
		t.Fatalf("MinTotalWalk = %d, ожидалось %d", got, want)
	}
}

// g4WalkRef — сумма расстояний до медианы, посчитанная прямо по определению.
func g4WalkRef(h []int) int {
	slices.Sort(h)
	m, s := h[len(h)/2], 0
	for _, x := range h {
		s += max(x-m, m-x)
	}
	return s
}

func TestMinRaisesToDistinctScales(t *testing.T) {
	// Все хотят один номер: «прибавлять, пока занят» — 0 + 1 + … + (n−1) шагов.
	const n = 100000
	nums := make([]int, n)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinRaisesToDistinct(n=100000 одинаковых) — похоже на O(n²): номер растёт по единице, пока занят"+
			" (замер: эталон меньше 1 мс, «прибавлять, пока занят» с множеством ~44 с)",
		func() { got = MinRaisesToDistinct(nums) })
	if want := n * (n - 1) / 2; got != want {
		t.Fatalf("MinRaisesToDistinct = %d, ожидалось %d", got, want)
	}
}

func TestMaxEqualAfterBoostsScales(t *testing.T) {
	// Бюджета хватает на всех: перебор «для каждой цели — влево, пока хватает»
	// не обрывается и идёт до начала — n²/2.
	const n = 200000
	r := rand.New(rand.NewSource(63))
	s := make([]int, n)
	for i := range s {
		s[i] = 1 + r.Intn(100000)
	}
	const budget = 10000000000
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MaxEqualAfterBoosts(n=200000, бюджет на всех) — похоже на O(n²) там, где нужен O(n log n)"+
			" (замер: эталон ~13 мс, перебор влево от каждой цели ~9 с)",
		func() { got = MaxEqualAfterBoosts(s, budget) })
	if got != n {
		t.Fatalf("MaxEqualAfterBoosts = %d, ожидалось %d", got, n)
	}
}

func TestMinTakesFromEndsScales(t *testing.T) {
	// Все посылки по 1, снять нужно все, кроме одной: перебор «сколько слева ×
	// сколько справа» проходит ~n²/2 сочетаний.
	const n = 200000
	w := make([]int, n)
	for i := range w {
		w[i] = 1
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinTakesFromEnds(n=200000, x = n−1) — похоже на O(n²) перебор «слева × справа» там, где нужен O(n)"+
			" (замер: эталон меньше 1 мс, перебор «слева × справа» ~16 с)",
		func() { got = MinTakesFromEnds(w, n-1) })
	if got != n-1 {
		t.Fatalf("MinTakesFromEnds = %d, ожидалось %d", got, n-1)
	}
}

func TestGoodsBetweenDividersScales(t *testing.T) {
	// Каждый вопрос — почти вся полка: проход по куску на вопрос — n·q.
	const n, q = 100000, 100000
	b := make([]byte, n)
	for i := range b {
		b[i] = '*'
		if i%3 == 0 {
			b[i] = '|'
		}
	}
	shelf := string(b)
	queries := make([][2]int, q)
	for i := range queries {
		queries[i] = [2]int{i % 3, n - 1 - i%3}
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"GoodsBetweenDividers(n=100000, q=100000, длинные куски) — похоже на O(n·q) там, где нужен O(n + q)"+
			" (замер: эталон ~1 мс, проход по куску на вопрос ~19 с)",
		func() { got = GoodsBetweenDividers(shelf, queries) })
	for i := 0; i < 3; i++ { // вопросы повторяются с периодом 3
		if want := g4BruteGoods(shelf, queries[i][0], queries[i][1]); got[i] != want {
			t.Fatalf("GoodsBetweenDividers: ответ %d = %d, ожидалось %d", i, got[i], want)
		}
	}
	for i, v := range got {
		if v != got[i%3] {
			t.Fatalf("GoodsBetweenDividers: ответ %d = %d, ожидалось %d (как у вопроса %d)", i, v, got[i%3], i%3)
		}
	}
}

func TestCountBalancedTeamsScales(t *testing.T) {
	const n = 200000
	r := rand.New(rand.NewSource(64))
	skill := make([]int, n)
	for i := range skill {
		skill[i] = r.Intn(1000)
	}
	// Сумма любой пары в [0, 1998]: годны все пары.
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CountBalancedTeams(n=200000) — похоже на O(n²) перебор пар там, где нужен O(n log n)"+
			" (замер: эталон ~8 мс, перебор пар ~10 с)",
		func() { got = CountBalancedTeams(skill, 0, 2000) })
	if want := n * (n - 1) / 2; got != want {
		t.Fatalf("CountBalancedTeams = %d, ожидалось %d", got, want)
	}
}

func TestWidestAffordableGapScales(t *testing.T) {
	// prices[j] = m − j + 1, offers[i] = (m − i)/2 + 1: лучший j для i — (m+i)/2,
	// и перебор j и с конца, и от i с выходом на первом неподходящем проходит
	// по ~(m − i)/2 шагов на каждое i.
	const m = 300000
	offers, prices := make([]int, m), make([]int, m)
	for i := range offers {
		offers[i] = (m-i)/2 + 1
		prices[i] = m - i + 1
	}
	want := 0
	for i := range offers {
		j := m - (m-i)/2 // последний j с prices[j] ≥ offers[i]
		if j > m-1 {
			j = m - 1
		}
		want = max(want, j-i)
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"WidestAffordableGap(n=m=300000) — похоже на O(n·m) там, где нужен O(n + m)"+
			" (замер: эталон ~1 мс, перебор j от i с выходом на первом неподходящем ~12 с)",
		func() { got = WidestAffordableGap(offers, prices) })
	if got != want {
		t.Fatalf("WidestAffordableGap = %d, ожидалось %d", got, want)
	}
}

// g6chain — цепочка из n узлов, влево и вправо через раз; значения — vals(d)
// для глубины d с 1. Возвращает корень и самый глубокий узел.
func g6chain(n int, vals func(d int) int) (root, last *TreeNode) {
	root = &TreeNode{Val: vals(1)}
	last = root
	for d := 2; d <= n; d++ {
		next := &TreeNode{Val: vals(d)}
		if d%2 == 0 {
			last.Left = next
		} else {
			last.Right = next
		}
		last = next
	}
	return root, last
}

// TestMinCrateMovesScales — сложность, а не ответ. Все ящики на дне цепочки:
// пересчитывать ящики и склады поддерева заново для каждой дороги — O(n²).
func TestMinCrateMovesScales(t *testing.T) {
	const n = 100000
	root, last := g6chain(n, func(int) int { return 0 })
	last.Val = n
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinCrateMoves(цепочка из 100000 складов, все ящики внизу) — похоже на O(n²): поддерево"+
			" каждой дороги пересчитывается заново (замер: эталон ~7 мс, перебор ~59 с)",
		func() { got = MinCrateMoves(root) })
	if want := n * (n - 1) / 2; got != want {
		t.Fatalf("MinCrateMoves = %d, ожидалось %d", got, want)
	}
}

// TestWidestSalaryGapScales — сложность, а не ответ. На цепочке перебор пар
// «начальник — каждый его подчинённый» — O(n²).
func TestWidestSalaryGapScales(t *testing.T) {
	const n = 100000
	root, _ := g6chain(n, func(d int) int { return d })
	var got int
	scaletest.Within(t, scaletest.Limit,
		"WidestSalaryGap(цепочка из 100000 сотрудников) — похоже на O(n²): для каждого перебираешь всех подчинённых"+
			" (замер: эталон ~8 мс, перебор ~56 с)",
		func() { got = WidestSalaryGap(root) })
	if got != n-1 {
		t.Fatalf("WidestSalaryGap = %d, ожидалось %d", got, n-1)
	}
}

// TestBestTeamScoreScales — сложность, а не ответ. k = n/2: лучшие k−1 навыков
// заново для каждого «самого медленного» или вставка в отсортированный срез — O(n²).
func TestBestTeamScoreScales(t *testing.T) {
	const n, k = 250000, 170000
	rng := rand.New(rand.NewSource(71))
	skill, speed := make([]int, n), make([]int, n)
	for i := range skill {
		skill[i], speed[i] = rng.Intn(100001), rng.Intn(100001)
	}
	// Нижняя граница: команда из k самых быстрых.
	order := make([]int, n)
	for i := range order {
		order[i] = i
	}
	slices.SortFunc(order, func(a, b int) int { return speed[b] - speed[a] })
	low := 0
	for _, i := range order[:k] {
		low += skill[i]
	}
	low *= speed[order[k-1]]
	var got int
	scaletest.Within(t, scaletest.Limit,
		"BestTeamScore(n=250000, k=170000) — похоже на O(n²): набор лучших k пересобирается или"+
			" держится отсортированным срезом (замер: эталон ~39 мс; отсортированный срез со вставкой ~8.8 с, он же с пропуском слабых ~6.8 с)",
		func() { got = BestTeamScore(skill, speed, k) })
	if got < low {
		t.Fatalf("BestTeamScore = %d, а команда из k самых быстрых уже даёт %d", got, low)
	}
}

// TestMinWeightGapScales — сложность, а не ответ. Для каждой из m+1 границ
// m лучших деталей заново или вставкой в отсортированный срез — O(m²).
func TestMinWeightGapScales(t *testing.T) {
	const m = 150000
	rng := rand.New(rand.NewSource(72))
	weights := make([]int, 3*m)
	for i := range weights {
		weights[i] = 1 + rng.Intn(100000)
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinWeightGap(m=150000) — похоже на O(m²): m лучших деталей пересобираются для каждой границы"+
			" (замер: эталон ~39 мс; отсортированные срезы со вставкой ~16.5 с, они же с пропуском лишних ~10.3 с)",
		func() { got = MinWeightGap(weights) })
	if got >= 0 {
		t.Fatalf("MinWeightGap = %d, на случайных весах ответ заведомо отрицательный", got)
	}
}

// TestMinBusiestCourierScales — 12 заказов, 7 курьеров: без отсечений 7¹² ≈ 1.4·10¹⁰
// распределений. Ответ экспоненциален по природе, тест ловит только полный перебор:
// любое из двух отсечений эталона («не лучше найденного» и «одинаково загруженные
// курьеры взаимозаменяемы») само по себе укладывается.
func TestMinBusiestCourierScales(t *testing.T) {
	jobs := []int{9899, 8861, 8264, 7786, 7311, 6617, 5866, 5109, 4412, 3577, 2821, 1999}
	const k = 7
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinBusiestCourier(12 заказов, 7 курьеров) — похоже на перебор всех 7¹² распределений без отсечений"+
			" (замер: эталон ~2 мс, перебор без отсечений ~73 с; одно из двух отсечений по отдельности — 32 и 371 мс)",
		func() { got = MinBusiestCourier(slices.Clone(jobs), k) })
	sum := 0
	for _, j := range jobs {
		sum += j
	}
	if low := (sum + k - 1) / k; got < low || got > low+jobs[0] {
		t.Fatalf("MinBusiestCourier = %d, ответ обязан быть между %d и %d", got, low, low+jobs[0])
	}
}

// TestMinHopsToLastScales — сложность, а не ответ. Все станции одного цвета,
// кроме последней: перебирать список цвета для каждой станции — O(n²).
func TestMinHopsToLastScales(t *testing.T) {
	const n = 100000
	colors := make([]int, n)
	for i := range colors {
		colors[i] = 7
	}
	colors[n-1] = 8
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinHopsToLast(100000 станций одного цвета) — похоже на O(n²): переходы по цвету раскрываются"+
			" для каждой станции заново (замер: эталон ~8 мс, перебор ~22 с)",
		func() { got = MinHopsToLast(colors) })
	if got != 2 {
		t.Fatalf("MinHopsToLast = %d, ожидалось 2", got)
	}
}

// TestCookableDishesScales — сложность, а не ответ. Цепочка: блюдо i из блюда
// i+1, последнее — из запасов. Проходы по книге до неподвижной точки добавляют
// по одному блюду — O(n²).
func TestCookableDishesScales(t *testing.T) {
	const n = 100000
	recipes := make([]string, n)
	ingredients := make([][]string, n)
	for i := range recipes {
		recipes[i] = "блюдо" + strconv.Itoa(i)
	}
	for i := 0; i+1 < n; i++ {
		ingredients[i] = []string{recipes[i+1], "соль"}
	}
	ingredients[n-1] = []string{"соль"}
	var got []string
	scaletest.Within(t, scaletest.Limit,
		"CookableDishes(цепочка из 100000 блюд) — похоже на O(n²): проходы по книге, пока что-то добавляется"+
			" (замер: эталон ~36 мс, перебор ~3 мин)",
		func() { got = CookableDishes(recipes, ingredients, []string{"соль"}) })
	if len(got) != n {
		t.Fatalf("CookableDishes: приготовлено %d блюд, ожидалось %d", len(got), n)
	}
}

// TestSafeRoomsScales — сложность, а не ответ. Цепочка 0 → 1 → … → n−1 и круг
// в стороне: отдельный обход из каждой комнаты — O(n²).
func TestSafeRoomsScales(t *testing.T) {
	const n = 100000
	doors := make([][]int, n+2)
	for v := 0; v+1 < n; v++ {
		doors[v] = []int{v + 1}
	}
	doors[n-1] = []int{}
	doors[n], doors[n+1] = []int{n + 1}, []int{n}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"SafeRooms(цепочка из 100000 комнат) — похоже на O(n²): из каждой комнаты свой обход"+
			" (замер: эталон ~4 мс, перебор ~66 с)",
		func() { got = SafeRooms(doors) })
	if len(got) != n {
		t.Fatalf("SafeRooms: безопасных %d, ожидалось %d", len(got), n)
	}
}

// TestEarliestFullBloomScales — сложность, а не ответ. Выбирать следующее
// семя просмотром всех оставшихся — O(n²).
func TestEarliestFullBloomScales(t *testing.T) {
	const n = 200000
	rng := rand.New(rand.NewSource(73))
	plant, grow := make([]int, n), make([]int, n)
	for i, p := range rng.Perm(n) {
		plant[i], grow[i] = 1, p%10000+1
	}
	// Рост ограничен 10⁴, поэтому ответ посчитан отдельно, без сортировки:
	// корзины по длине роста.
	var cnt [10001]int
	for _, g := range grow {
		cnt[g]++
	}
	want, day := 0, 0
	for g := 10000; g >= 1; g-- {
		if cnt[g] > 0 {
			day += cnt[g]
			want = max(want, day+g)
		}
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"EarliestFullBloom(n=200000) — похоже на O(n²): следующее семя выбирается просмотром всех оставшихся"+
			" (замер: эталон ~25 мс, перебор ~115 с)",
		func() { got = EarliestFullBloom(plant, grow) })
	if got != want {
		t.Fatalf("EarliestFullBloom = %d, ожидалось %d", got, want)
	}
}

// TestCanSplitIntoRunsScales — сложность, а не ответ. m единиц, m двоек, m троек:
// открыто m лесенок, и поиск подходящей просмотром всех — O(n²).
func TestCanSplitIntoRunsScales(t *testing.T) {
	const m = 100000
	nums := make([]int, 0, 3*m)
	for v := 1; v <= 3; v++ {
		for range m {
			nums = append(nums, v)
		}
	}
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"CanSplitIntoRuns(100000 единиц, двоек и троек) — похоже на O(n²): лесенка для карточки ищется"+
			" просмотром всех открытых (замер: эталон ~5 мс, перебор ~20 с)",
		func() { got = CanSplitIntoRuns(nums) })
	if !got {
		t.Fatal("CanSplitIntoRuns = false, ожидалось true")
	}
}
