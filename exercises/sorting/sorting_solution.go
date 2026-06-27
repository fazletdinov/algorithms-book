//go:build solution

package sorting

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

func quickSort(a []int, lo, hi int) {
	if lo >= hi {
		return
	}
	p := partition(a, lo, hi)
	quickSort(a, lo, p-1)
	quickSort(a, p+1, hi)
}

// partition по схеме Ломуто: опорным берём a[hi]; i — граница «меньших».
// Возвращает финальную позицию опорного.
func partition(a []int, lo, hi int) int {
	pivot := a[hi]
	i := lo
	for j := lo; j < hi; j++ {
		if a[j] < pivot {
			a[i], a[j] = a[j], a[i]
			i++
		}
	}
	a[i], a[hi] = a[hi], a[i]
	return i
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
		if lo == hi {
			return nums[lo]
		}
		p := partition(nums, lo, hi)
		switch {
		case p == target:
			return nums[p]
		case p < target:
			lo = p + 1
		default:
			hi = p - 1
		}
	}
}
