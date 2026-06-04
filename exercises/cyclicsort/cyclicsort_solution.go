//go:build solution

package cyclicsort

import "sort"

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

func FindAllMissingNumbers(nums []int) []int {
	i := 0
	for i < len(nums) {
		correct := nums[i] - 1
		if nums[i] != nums[correct] {
			nums[i], nums[correct] = nums[correct], nums[i]
		} else {
			i++
		}
	}
	missing := []int{}
	for i := 0; i < len(nums); i++ {
		if nums[i] != i+1 {
			missing = append(missing, i+1)
		}
	}
	return missing
}

func FindDuplicate(nums []int) int {
	i := 0
	for i < len(nums) {
		correct := nums[i] - 1
		if nums[i] != nums[correct] {
			nums[i], nums[correct] = nums[correct], nums[i]
		} else if i != correct {
			return nums[i]
		} else {
			i++
		}
	}
	return -1
}

func FindAllDuplicates(nums []int) []int {
	i := 0
	for i < len(nums) {
		correct := nums[i] - 1
		if nums[i] != nums[correct] {
			nums[i], nums[correct] = nums[correct], nums[i]
		} else {
			i++
		}
	}
	// После сортировки на индексе i стоит либо i+1, либо «лишний» элемент —
	// значение nums[i], которое не смогло встать на своё место, потому что
	// там уже лежит такой же дубликат. Собираем такие значения и сортируем
	// для вывода по возрастанию.
	duplicates := []int{}
	for i := 0; i < len(nums); i++ {
		if nums[i] != i+1 {
			duplicates = append(duplicates, nums[i])
		}
	}
	sort.Ints(duplicates)
	return duplicates
}
