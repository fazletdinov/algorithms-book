//go:build solution

package stack

import "bytes"

func IsValidBrackets(s string) bool {
	pair := map[byte]byte{')': '(', ']': '[', '}': '{'}
	stack := []byte{}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c == '(' || c == '[' || c == '{' {
			stack = append(stack, c)
		} else if open, ok := pair[c]; ok {
			if len(stack) == 0 || stack[len(stack)-1] != open {
				return false
			}
			stack = stack[:len(stack)-1]
		}
	}
	return len(stack) == 0
}

func DecodeString(s string) string {
	counts := []int{}
	prevs := [][]byte{}
	var cur []byte // []byte, а не string: cur += c на строке копировал бы её целиком на каждой букве
	num := 0
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= '0' && c <= '9' {
			num = num*10 + int(c-'0')
		} else if c == '[' {
			counts = append(counts, num)
			prevs = append(prevs, cur)
			num, cur = 0, nil
		} else if c == ']' {
			k := counts[len(counts)-1]
			counts = counts[:len(counts)-1]
			prev := prevs[len(prevs)-1]
			prevs[len(prevs)-1] = nil // не держать ссылку за пределами len
			prevs = prevs[:len(prevs)-1]
			cur = append(prev, bytes.Repeat(cur, k)...)
		} else {
			cur = append(cur, c)
		}
	}
	return string(cur)
}

func NextGreaterCircular(nums []int) []int {
	n := len(nums)
	res := make([]int, n)
	for i := range res {
		res[i] = -1
	}
	stack := []int{} // индексы, значения по стеку убывают
	for i := 0; i < 2*n; i++ {
		v := nums[i%n]
		for len(stack) > 0 && nums[stack[len(stack)-1]] < v {
			res[stack[len(stack)-1]] = v
			stack = stack[:len(stack)-1]
		}
		if i < n {
			stack = append(stack, i)
		}
	}
	return res
}

func StockSpans(prices []int) []int {
	res := make([]int, len(prices))
	stack := []int{} // индексы, цены строго убывают
	for i, p := range prices {
		for len(stack) > 0 && prices[stack[len(stack)-1]] <= p {
			stack = stack[:len(stack)-1]
		}
		if len(stack) == 0 {
			res[i] = i + 1
		} else {
			res[i] = i - stack[len(stack)-1]
		}
		stack = append(stack, i)
	}
	return res
}

func LargestRectangle(heights []int) int {
	n := len(heights)
	best := 0
	stack := []int{} // индексы, высоты строго растут: снимаем при >=
	for i := 0; i <= n; i++ {
		h := 0 // позиция n — столбик высоты 0: выталкивает всё, что осталось
		if i < n {
			h = heights[i]
		}
		for len(stack) > 0 && heights[stack[len(stack)-1]] >= h {
			top := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			left := -1
			if len(stack) > 0 {
				left = stack[len(stack)-1]
			}
			if area := heights[top] * (i - left - 1); area > best {
				best = area
			}
		}
		stack = append(stack, i)
	}
	return best
}

func SumSubarrayMins(arr []int) int {
	n := len(arr)
	total := 0
	stack := []int{} // индексы, значения строго возрастают
	for i := 0; i <= n; i++ {
		for len(stack) > 0 && (i == n || arr[stack[len(stack)-1]] >= arr[i]) {
			mid := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			left := -1
			if len(stack) > 0 {
				left = stack[len(stack)-1]
			}
			total += arr[mid] * (mid - left) * (i - mid)
		}
		stack = append(stack, i)
	}
	return total
}

func RemoveKDigits(num string, k int) string {
	stack := make([]byte, 0, len(num))
	for i := 0; i < len(num); i++ {
		d := num[i]
		for k > 0 && len(stack) > 0 && stack[len(stack)-1] > d {
			stack = stack[:len(stack)-1]
			k--
		}
		stack = append(stack, d)
	}
	stack = stack[:len(stack)-k] // стек не убывает: худшие цифры — в хвосте
	start := 0
	for start < len(stack) && stack[start] == '0' {
		start++
	}
	if start == len(stack) {
		return "0"
	}
	return string(stack[start:])
}
