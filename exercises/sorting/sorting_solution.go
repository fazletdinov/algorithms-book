//go:build solution

package sorting

import "math/rand/v2"

func MergeSort(nums []int) []int {
	if len(nums) <= 1 {
		out := make([]int, len(nums))
		copy(out, nums)
		return out
	}
	mid := len(nums) / 2
	left := MergeSort(nums[:mid])
	right := MergeSort(nums[mid:])
	return merge(left, right)
}

// merge сливает два отсортированных среза в один. При равенстве голов берёт из
// левого — это и обеспечивает устойчивость сортировки.
func merge(left, right []int) []int {
	out := make([]int, 0, len(left)+len(right))
	i, j := 0, 0
	for i < len(left) && j < len(right) {
		if left[i] <= right[j] {
			out = append(out, left[i])
			i++
		} else {
			out = append(out, right[j])
			j++
		}
	}
	out = append(out, left[i:]...)
	out = append(out, right[j:]...)
	return out
}

func QuickSort(nums []int) {
	quickSort(nums, 0, len(nums)-1)
}

// quickSort: случайный опорный — против неудачного порядка (отсортированный
// вход), три зоны — против повторов (все равные). Рекурсия идёт в меньшую
// часть, большая — следующим витком цикла: стек O(log n) даже в худшем случае.
func quickSort(a []int, lo, hi int) {
	for lo < hi {
		lt, gt := partition3(a, lo, hi)
		if lt-lo < hi-gt {
			quickSort(a, lo, lt-1)
			lo = gt + 1
		} else {
			quickSort(a, gt+1, hi)
			hi = lt - 1
		}
	}
}

// partition3 разбивает a[lo..hi] вокруг случайного опорного на три зоны:
// [lo,lt) — меньше, [lt,gt] — равны опорному, (gt,hi] — больше.
func partition3(a []int, lo, hi int) (lt, gt int) {
	pivot := a[lo+rand.IntN(hi-lo+1)]
	lt, i, gt := lo, lo, hi
	for i <= gt {
		switch {
		case a[i] < pivot:
			a[lt], a[i] = a[i], a[lt]
			lt++
			i++
		case a[i] > pivot:
			a[i], a[gt] = a[gt], a[i]
			gt-- // пришедший с конца a[i] ещё не проверен — i не двигаем
		default:
			i++
		}
	}
	return lt, gt
}

func HeapSort(nums []int) {
	n := len(nums)
	// Построение max-кучи: просеиваем вниз все внутренние узлы за O(n).
	for i := n/2 - 1; i >= 0; i-- {
		siftDown(nums, i, n)
	}
	// Извлекаем максимум в конец, уменьшаем кучу, восстанавливаем свойство.
	for end := n - 1; end > 0; end-- {
		nums[0], nums[end] = nums[end], nums[0]
		siftDown(nums, 0, end)
	}
}

// siftDown просеивает узел i вниз в куче размера size (полуоткрытый [0,size)).
func siftDown(a []int, i, size int) {
	for {
		l, r, largest := 2*i+1, 2*i+2, i
		if l < size && a[l] > a[largest] {
			largest = l
		}
		if r < size && a[r] > a[largest] {
			largest = r
		}
		if largest == i {
			return
		}
		a[i], a[largest] = a[largest], a[i]
		i = largest
	}
}

func CountingSort(nums []int) []int {
	if len(nums) == 0 {
		return []int{}
	}
	min, max := nums[0], nums[0]
	for _, v := range nums {
		if v < min {
			min = v
		}
		if v > max {
			max = v
		}
	}
	count := make([]int, max-min+1)
	for _, v := range nums {
		count[v-min]++
	}
	out := make([]int, 0, len(nums))
	for i, c := range count {
		for ; c > 0; c-- {
			out = append(out, i+min)
		}
	}
	return out
}

func QuickSelect(nums []int, k int) int {
	lo, hi, target := 0, len(nums)-1, k-1
	for {
		lt, gt := partition3(nums, lo, hi)
		switch {
		case target < lt:
			hi = lt - 1
		case target > gt:
			lo = gt + 1
		default:
			return nums[target] // ранг попал в зону равных опорному
		}
	}
}
