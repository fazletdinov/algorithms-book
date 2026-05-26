//go:build solution

package twopointers

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
