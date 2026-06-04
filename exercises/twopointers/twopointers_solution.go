//go:build solution

package twopointers

import "sort"

func PairWithTargetSum(arr []int, target int) []int {
	left, right := 0, len(arr)-1
	for left < right {
		sum := arr[left] + arr[right]
		switch {
		case sum == target:
			return []int{left, right}
		case sum < target:
			left++
		default:
			right--
		}
	}
	return []int{-1, -1}
}

func RemoveDuplicates(arr []int) int {
	if len(arr) == 0 {
		return 0
	}
	next := 1
	for i := 1; i < len(arr); i++ {
		if arr[next-1] != arr[i] {
			arr[next] = arr[i]
			next++
		}
	}
	return next
}

func SortedSquares(arr []int) []int {
	n := len(arr)
	res := make([]int, n)
	left, right := 0, n-1
	for pos := n - 1; pos >= 0; pos-- {
		l, r := arr[left]*arr[left], arr[right]*arr[right]
		if l > r {
			res[pos] = l
			left++
		} else {
			res[pos] = r
			right--
		}
	}
	return res
}

func TripletsSumToZero(arr []int) [][]int {
	nums := make([]int, len(arr))
	copy(nums, arr)
	sort.Ints(nums)
	var res [][]int
	for i := 0; i < len(nums)-2; i++ {
		if i > 0 && nums[i] == nums[i-1] {
			continue
		}
		left, right := i+1, len(nums)-1
		for left < right {
			sum := nums[i] + nums[left] + nums[right]
			switch {
			case sum == 0:
				res = append(res, []int{nums[i], nums[left], nums[right]})
				left++
				right--
				for left < right && nums[left] == nums[left-1] {
					left++
				}
				for left < right && nums[right] == nums[right+1] {
					right--
				}
			case sum < 0:
				left++
			default:
				right--
			}
		}
	}
	return res
}

func DutchFlagSort(arr []int) {
	low, mid, high := 0, 0, len(arr)-1
	for mid <= high {
		switch arr[mid] {
		case 0:
			arr[low], arr[mid] = arr[mid], arr[low]
			low++
			mid++
		case 1:
			mid++
		default:
			arr[mid], arr[high] = arr[high], arr[mid]
			high--
		}
	}
}
