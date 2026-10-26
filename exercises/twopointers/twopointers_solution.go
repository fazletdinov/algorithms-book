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

func MoveZeroes(arr []int) {
	insertPos := 0
	for i := 0; i < len(arr); i++ {
		if arr[i] != 0 {
			arr[insertPos], arr[i] = arr[i], arr[insertPos]
			insertPos++
		}
	}
}

func MaxArea(height []int) int {
	l, r := 0, len(height)-1
	best := 0
	for l < r {
		best = max(best, min(height[l], height[r])*(r-l))
		if height[l] < height[r] {
			l++
		} else {
			r--
		}
	}
	return best
}

func MergeSorted(nums1 []int, m int, nums2 []int, n int) {
	i, j := m-1, n-1
	for pos := m + n - 1; j >= 0; pos-- {
		if i >= 0 && nums1[i] > nums2[j] {
			nums1[pos] = nums1[i]
			i--
		} else {
			nums1[pos] = nums2[j]
			j--
		}
	}
}

func IsSubsequence(s, t string) bool {
	i := 0
	for j := 0; j < len(t) && i < len(s); j++ {
		if s[i] == t[j] {
			i++
		}
	}
	return i == len(s)
}

func IntersectSorted(nums1, nums2 []int) []int {
	var res []int
	i, j := 0, 0
	for i < len(nums1) && j < len(nums2) {
		switch {
		case nums1[i] < nums2[j]:
			i++
		case nums1[i] > nums2[j]:
			j++
		default:
			res = append(res, nums1[i])
			i++
			j++
		}
	}
	return res
}

func ThreeSumClosest(nums []int, target int) int {
	sort.Ints(nums)
	best := nums[0] + nums[1] + nums[2]
	for i := 0; i < len(nums)-2; i++ {
		left, right := i+1, len(nums)-1
		for left < right {
			sum := nums[i] + nums[left] + nums[right]
			if closer(sum, best, target) {
				best = sum
			}
			switch {
			case sum < target:
				left++
			case sum > target:
				right--
			default:
				return sum
			}
		}
	}
	return best
}

// closer сообщает, лучше ли сумма a, чем b: ближе к target, а при равном
// расстоянии — меньше.
func closer(a, b, target int) bool {
	da, db := abs(a-target), abs(b-target)
	return da < db || (da == db && a < b)
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
