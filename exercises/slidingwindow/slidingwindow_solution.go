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
