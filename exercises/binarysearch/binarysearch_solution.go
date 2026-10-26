//go:build solution

package binarysearch

func Search(arr []int, target int) int {
	low, high := 0, len(arr)-1
	for low <= high {
		mid := low + (high-low)/2
		switch {
		case arr[mid] == target:
			return mid
		case arr[mid] < target:
			low = mid + 1
		default:
			high = mid - 1
		}
	}
	return -1
}

// FindCeiling, FindFloor, FindFirstLast и IntSqrt — одна форма firstTrue из
// главы: ответ всегда в [lo, hi], цикл lo < hi, mid подходит — hi = mid, иначе
// lo = mid + 1. Меняется только вопрос и то, что делать с найденной границей.

func FindCeiling(arr []int, key int) int {
	lo, hi := 0, len(arr) // первый i с arr[i] >= key; len(arr) — такого нет
	for lo < hi {
		mid := lo + (hi-lo)/2
		if arr[mid] >= key {
			hi = mid
		} else {
			lo = mid + 1
		}
	}
	if lo == len(arr) {
		return -1
	}
	return lo
}

func FindFloor(arr []int, target int) int {
	lo, hi := 0, len(arr) // первый i с arr[i] > target; пол — на единицу левее
	for lo < hi {
		mid := lo + (hi-lo)/2
		if arr[mid] > target {
			hi = mid
		} else {
			lo = mid + 1
		}
	}
	return lo - 1 // lo == 0 — все элементы больше target, ответ -1
}

func SearchRotated(arr []int, target int) int {
	low, high := 0, len(arr)-1
	for low <= high {
		mid := low + (high-low)/2
		if arr[mid] == target {
			return mid
		}
		if arr[low] <= arr[mid] {
			if arr[low] <= target && target < arr[mid] {
				high = mid - 1
			} else {
				low = mid + 1
			}
		} else {
			if arr[mid] < target && target <= arr[high] {
				low = mid + 1
			} else {
				high = mid - 1
			}
		}
	}
	return -1
}

func FindFirstLast(arr []int, target int) []int {
	// firstTrue с вопросом ok: первый индекс, где ok истинно, или len(arr)
	firstTrue := func(ok func(int) bool) int {
		lo, hi := 0, len(arr)
		for lo < hi {
			mid := lo + (hi-lo)/2
			if ok(mid) {
				hi = mid
			} else {
				lo = mid + 1
			}
		}
		return lo
	}
	first := firstTrue(func(i int) bool { return arr[i] >= target })
	if first == len(arr) || arr[first] != target {
		return []int{-1, -1}
	}
	afterLast := firstTrue(func(i int) bool { return arr[i] > target })
	return []int{first, afterLast - 1}
}

func IntSqrt(x int) int {
	// firstTrue на [0, x/2+2] с вопросом «m*m > x»; ответ — на единицу левее.
	// √x ≤ x/2 + 1, поэтому правый край всегда «да»; x+1 переполнился бы при x = MaxInt.
	// m > x/m — то же условие без переполнения m*m.
	lo, hi := 0, x/2+2
	for lo < hi {
		mid := lo + (hi-lo)/2
		if mid > 0 && mid > x/mid {
			hi = mid
		} else {
			lo = mid + 1
		}
	}
	return lo - 1
}

func MinEatingSpeed(piles []int, h int) int {
	feasible := func(speed int) bool {
		hours := 0
		for _, p := range piles {
			hours += (p + speed - 1) / speed // ceil(p/speed)
			if hours > h {
				return false
			}
		}
		return true
	}
	lo, hi := 1, 1 // ответ в [lo, hi]: при max(piles) каждая куча — за час
	for _, p := range piles {
		hi = max(hi, p)
	}
	for lo < hi {
		mid := lo + (hi-lo)/2
		if feasible(mid) {
			hi = mid // успевает — ответ mid или медленнее
		} else {
			lo = mid + 1
		}
	}
	return lo
}

func ShipWithinDays(weights []int, days int) int {
	feasible := func(capacity int) bool {
		need, load := 1, 0
		for _, w := range weights {
			if load+w > capacity {
				need++
				load = 0
			}
			load += w
		}
		return need <= days
	}
	lo, hi := 0, 0 // меньше самой тяжёлой посылки нельзя, всё за день — сумма
	for _, w := range weights {
		lo = max(lo, w)
		hi += w
	}
	for lo < hi {
		mid := lo + (hi-lo)/2
		if feasible(mid) {
			hi = mid
		} else {
			lo = mid + 1
		}
	}
	return lo
}
