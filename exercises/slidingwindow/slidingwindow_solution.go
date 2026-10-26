//go:build solution

package slidingwindow

func MaxSumSubarray(arr []int, k int) int {
	if k <= 0 || k > len(arr) {
		return 0
	}
	windowSum := 0
	for i := 0; i < k; i++ {
		windowSum += arr[i]
	}
	maxSum := windowSum
	for i := k; i < len(arr); i++ {
		windowSum += arr[i] - arr[i-k]
		if windowSum > maxSum {
			maxSum = windowSum
		}
	}
	return maxSum
}

func LongestSubstringKDistinct(s string, k int) int {
	if k <= 0 {
		return 0
	}
	freq := make(map[byte]int)
	left, maxLen := 0, 0
	for right := 0; right < len(s); right++ {
		freq[s[right]]++
		for len(freq) > k {
			freq[s[left]]--
			if freq[s[left]] == 0 {
				delete(freq, s[left])
			}
			left++
		}
		if cur := right - left + 1; cur > maxLen {
			maxLen = cur
		}
	}
	return maxLen
}

func SmallestSubarrayWithSum(arr []int, target int) int {
	left, windowSum := 0, 0
	minLen := 0
	for right := 0; right < len(arr); right++ {
		windowSum += arr[right]
		for windowSum >= target {
			if cur := right - left + 1; minLen == 0 || cur < minLen {
				minLen = cur
			}
			windowSum -= arr[left]
			left++
		}
	}
	return minLen
}

func LongestSubstringNoRepeat(s string) int {
	lastSeen := make(map[byte]int)
	left, maxLen := 0, 0
	for right := 0; right < len(s); right++ {
		if pos, ok := lastSeen[s[right]]; ok && pos >= left {
			left = pos + 1
		}
		lastSeen[s[right]] = right
		if cur := right - left + 1; cur > maxLen {
			maxLen = cur
		}
	}
	return maxLen
}

func MaxSlidingWindow(arr []int, k int) []int {
	if k <= 0 || k > len(arr) {
		return []int{}
	}
	result := make([]int, 0, len(arr)-k+1)
	deque := make([]int, 0, k) // индексы, значения убывают от головы к хвосту
	for i := 0; i < len(arr); i++ {
		// убрать из головы индексы, вышедшие за окно
		if len(deque) > 0 && deque[0] <= i-k {
			deque = deque[1:]
		}
		// убрать из хвоста элементы, которые меньше текущего
		for len(deque) > 0 && arr[deque[len(deque)-1]] <= arr[i] {
			deque = deque[:len(deque)-1]
		}
		deque = append(deque, i)
		if i >= k-1 {
			result = append(result, arr[deque[0]])
		}
	}
	return result
}

func CharacterReplacement(s string, k int) int {
	var count [26]int
	left, best := 0, 0
	for right := 0; right < len(s); right++ {
		count[s[right]-'A']++
		for {
			top := 0 // частота самой частой буквы окна: 26 сравнений, константа
			for _, c := range count {
				top = max(top, c)
			}
			if right-left+1-top <= k {
				break
			}
			count[s[left]-'A']--
			left++
		}
		best = max(best, right-left+1)
	}
	return best
}

func CheckInclusion(s1, s2 string) bool {
	m := len(s1)
	if m > len(s2) {
		return false
	}
	var need, have [26]int
	for i := 0; i < m; i++ {
		need[s1[i]-'a']++
		have[s2[i]-'a']++
	}
	if need == have {
		return true
	}
	for i := m; i < len(s2); i++ {
		have[s2[i]-'a']++
		have[s2[i-m]-'a']--
		if need == have {
			return true
		}
	}
	return false
}

func LongestOnes(nums []int, k int) int {
	left, zeros, best := 0, 0, 0
	for right := 0; right < len(nums); right++ {
		if nums[right] == 0 {
			zeros++
		}
		for zeros > k {
			if nums[left] == 0 {
				zeros--
			}
			left++
		}
		if cur := right - left + 1; cur > best {
			best = cur
		}
	}
	return best
}

func NumSubarrayProductLessThanK(nums []int, k int) int {
	if k <= 1 {
		return 0
	}
	left, product, count := 0, 1, 0
	for right := 0; right < len(nums); right++ {
		product *= nums[right]
		for product >= k {
			product /= nums[left]
			left++
		}
		count += right - left + 1 // столько подмассивов кончаются на right внутри окна
	}
	return count
}

func SubarraysWithKDistinct(nums []int, k int) int {
	// ровно k = (не больше k) − (не больше k−1)
	return atMostKDistinct(nums, k) - atMostKDistinct(nums, k-1)
}

// atMostKDistinct считает куски, где различных чисел не больше k: окно семьи A,
// и у каждого right годны все right−left+1 кусков, что кончаются на нём.
func atMostKDistinct(nums []int, k int) int {
	if k <= 0 {
		return 0
	}
	freq := make(map[int]int)
	left, count := 0, 0
	for right := 0; right < len(nums); right++ {
		freq[nums[right]]++
		for len(freq) > k {
			freq[nums[left]]--
			if freq[nums[left]] == 0 {
				delete(freq, nums[left])
			}
			left++
		}
		count += right - left + 1
	}
	return count
}

func FindAnagrams(s, p string) []int {
	m := len(p)
	if m == 0 || m > len(s) {
		return nil
	}
	var need, have [26]int
	for i := 0; i < m; i++ {
		need[p[i]-'a']++
		have[s[i]-'a']++
	}
	var res []int
	if need == have {
		res = append(res, 0)
	}
	for i := m; i < len(s); i++ {
		have[s[i]-'a']++
		have[s[i-m]-'a']--
		if need == have {
			res = append(res, i-m+1)
		}
	}
	return res
}
