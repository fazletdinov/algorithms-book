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
