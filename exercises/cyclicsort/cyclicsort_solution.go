//go:build solution

package cyclicsort

func CyclicSort(nums []int) {
	i := 0
	for i < len(nums) {
		correct := nums[i] - 1
		if nums[i] != nums[correct] {
			nums[i], nums[correct] = nums[correct], nums[i]
		} else {
			i++
		}
	}
}

func FindMissingNumber(nums []int) int {
	i := 0
	for i < len(nums) {
		j := nums[i]
		if j < len(nums) && nums[i] != nums[j] {
			nums[i], nums[j] = nums[j], nums[i]
		} else {
			i++
		}
	}
	for i := 0; i < len(nums); i++ {
		if nums[i] != i {
			return i
		}
	}
	return len(nums)
}
