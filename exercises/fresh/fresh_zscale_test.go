package fresh

import (
	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
	"math/rand"
	"slices"
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
