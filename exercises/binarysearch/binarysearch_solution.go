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

func FindCeiling(arr []int, key int) int {
	if len(arr) == 0 || key > arr[len(arr)-1] {
		return -1
	}
	low, high := 0, len(arr)-1
	for low <= high {
		mid := low + (high-low)/2
		if arr[mid] < key {
			low = mid + 1
		} else {
			high = mid - 1
		}
	}
	return low
}

func FindFloor(arr []int, target int) int {
	if len(arr) == 0 || target < arr[0] {
		return -1
	}
	low, high := 0, len(arr)-1
	for low <= high {
		mid := low + (high-low)/2
		if arr[mid] <= target {
			low = mid + 1
		} else {
			high = mid - 1
		}
	}
	return high
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
	first := func() int {
		low, high, res := 0, len(arr)-1, -1
		for low <= high {
			mid := low + (high-low)/2
			switch {
			case arr[mid] == target:
				res = mid
				high = mid - 1
			case arr[mid] < target:
				low = mid + 1
			default:
				high = mid - 1
			}
		}
		return res
	}
	last := func() int {
		low, high, res := 0, len(arr)-1, -1
		for low <= high {
			mid := low + (high-low)/2
			switch {
			case arr[mid] == target:
				res = mid
				low = mid + 1
			case arr[mid] < target:
				low = mid + 1
			default:
				high = mid - 1
			}
		}
		return res
	}
	return []int{first(), last()}
}

func IntSqrt(x int) int {
	low, high, res := 0, x, 0
	for low <= high {
		mid := low + (high-low)/2
		if mid*mid <= x {
			res = mid
			low = mid + 1
		} else {
			high = mid - 1
		}
	}
	return res
}
