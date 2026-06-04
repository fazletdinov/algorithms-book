//go:build solution

package bits

func SingleNumber(nums []int) int {
	res := 0
	for _, n := range nums {
		res ^= n
	}
	return res
}

func IsPowerOfTwo(n int) bool {
	return n > 0 && n&(n-1) == 0
}

func HammingWeight(n uint32) int {
	count := 0
	for n != 0 {
		n &= n - 1
		count++
	}
	return count
}

func MissingNumber(nums []int) int {
	res := len(nums)
	for i, n := range nums {
		res ^= i ^ n
	}
	return res
}

func CountBits(n int) []int {
	bits := make([]int, n+1)
	for i := 1; i <= n; i++ {
		bits[i] = bits[i>>1] + (i & 1)
	}
	return bits
}

func TwoSingleNumbers(nums []int) []int {
	xor := 0
	for _, n := range nums {
		xor ^= n
	}
	diff := xor & -xor
	a, b := 0, 0
	for _, n := range nums {
		if n&diff != 0 {
			a ^= n
		} else {
			b ^= n
		}
	}
	if a > b {
		a, b = b, a
	}
	return []int{a, b}
}
