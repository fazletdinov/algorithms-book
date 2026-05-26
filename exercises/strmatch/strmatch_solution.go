//go:build solution

package strmatch

func buildLPS(pattern string) []int {
	lps := make([]int, len(pattern))
	length := 0
	for i := 1; i < len(pattern); {
		if pattern[i] == pattern[length] {
			length++
			lps[i] = length
			i++
		} else if length > 0 {
			length = lps[length-1]
		} else {
			lps[i] = 0
			i++
		}
	}
	return lps
}

func KMPSearch(text, pattern string) int {
	if len(pattern) == 0 {
		return 0
	}
	lps := buildLPS(pattern)
	i, j := 0, 0
	for i < len(text) {
		if text[i] == pattern[j] {
			i++
			j++
			if j == len(pattern) {
				return i - j
			}
		} else if j > 0 {
			j = lps[j-1]
		} else {
			i++
		}
	}
	return -1
}

func RabinKarp(text, pattern string) int {
	n, m := len(text), len(pattern)
	if m == 0 {
		return 0
	}
	if m > n {
		return -1
	}
	const base, mod = 256, 1_000_000_007

	power := 1
	for i := 0; i < m-1; i++ {
		power = power * base % mod
	}

	var patHash, winHash int
	for i := 0; i < m; i++ {
		patHash = (patHash*base + int(pattern[i])) % mod
		winHash = (winHash*base + int(text[i])) % mod
	}

	for i := 0; i+m <= n; i++ {
		if patHash == winHash && text[i:i+m] == pattern {
			return i
		}
		if i+m < n {
			remove := int(text[i]) * power % mod
			winHash = ((winHash-remove+mod)*base + int(text[i+m])) % mod
		}
	}
	return -1
}
