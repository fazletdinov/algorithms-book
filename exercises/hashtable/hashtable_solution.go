//go:build solution

package hashtable

type entry struct {
	key, val int
}

type HashMap struct {
	buckets [][]entry
	size    int
}

const initialBuckets = 4

func NewHashMap() *HashMap {
	return &HashMap{buckets: make([][]entry, initialBuckets)}
}

// index превращает ключ в номер бакета, нормализуя знак (key mod m в Go
// может быть отрицательным).
func (h *HashMap) index(key int) int {
	m := len(h.buckets)
	i := key % m
	if i < 0 {
		i += m
	}
	return i
}

func (h *HashMap) Put(key, val int) {
	i := h.index(key)
	for j := range h.buckets[i] {
		if h.buckets[i][j].key == key {
			h.buckets[i][j].val = val // обновляем на месте
			return
		}
	}
	h.buckets[i] = append(h.buckets[i], entry{key, val})
	h.size++
	if h.size*4 > len(h.buckets)*3 { // load factor > 0.75
		h.resize(len(h.buckets) * 2)
	}
}

func (h *HashMap) Get(key int) (int, bool) {
	i := h.index(key)
	for _, e := range h.buckets[i] {
		if e.key == key {
			return e.val, true
		}
	}
	return 0, false
}

func (h *HashMap) Delete(key int) bool {
	i := h.index(key)
	chain := h.buckets[i]
	for j, e := range chain {
		if e.key == key {
			h.buckets[i] = append(chain[:j], chain[j+1:]...) // вырезаем из цепочки
			h.size--
			return true
		}
	}
	return false
}

func (h *HashMap) Len() int { return h.size }

// resize создаёт newCap бакетов и перехеширует все записи: после смены len
// меняется и index(key), поэтому каждый ключ кладётся в новый бакет.
func (h *HashMap) resize(newCap int) {
	old := h.buckets
	h.buckets = make([][]entry, newCap)
	for _, chain := range old {
		for _, e := range chain {
			i := h.index(e.key)
			h.buckets[i] = append(h.buckets[i], e)
		}
	}
}

func TwoSum(nums []int, target int) []int {
	seen := make(map[int]int, len(nums)) // значение → индекс, где его видели
	for i, x := range nums {
		if j, ok := seen[target-x]; ok { // дополнение уже встречалось левее
			return []int{j, i}
		}
		seen[x] = i // после проверки: элемент не встанет в пару сам с собой
	}
	return nil
}

func GroupAnagrams(words []string) [][]string {
	groups := make(map[string][]string, len(words))
	var order []string // ключи в порядке первого появления — ответ не зависит от обхода map
	for _, w := range words {
		key := sortedLetters(w)
		if _, ok := groups[key]; !ok {
			order = append(order, key)
		}
		groups[key] = append(groups[key], w)
	}
	res := make([][]string, 0, len(order))
	for _, key := range order {
		res = append(res, groups[key])
	}
	return res
}

// sortedLetters — каноническая форма слова: его буквы по алфавиту. Сортировка
// подсчётом (букв всего 26) — O(k), без замыкания и без пакета sort.
func sortedLetters(w string) string {
	var count [26]int
	for i := 0; i < len(w); i++ {
		count[w[i]-'a']++
	}
	b := make([]byte, 0, len(w))
	for c := 0; c < 26; c++ {
		for range count[c] {
			b = append(b, byte('a'+c))
		}
	}
	return string(b)
}

func LongestConsecutive(nums []int) int {
	set := make(map[int]bool, len(nums))
	for _, x := range nums {
		set[x] = true
	}
	best := 0
	for x := range set { // по множеству, а не по nums: повторы начала не пересчитываются
		if set[x-1] {
			continue // x — не начало цепочки, её посчитают от начала
		}
		length := 1
		for set[x+length] {
			length++
		}
		if length > best {
			best = length
		}
	}
	return best
}

func FirstUniqueChar(s string) int {
	var count [26]int
	for i := 0; i < len(s); i++ {
		count[s[i]-'a']++
	}
	for i := 0; i < len(s); i++ {
		if count[s[i]-'a'] == 1 {
			return i
		}
	}
	return -1
}
