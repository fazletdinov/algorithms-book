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
