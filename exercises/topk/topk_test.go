package topk

import (
	"reflect"
	"sort"
	"testing"
)

func TestFindKLargest(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		k    int
		want []int
	}{
		{"пример из условия", []int{3, 2, 1, 5, 6, 4}, 2, []int{6, 5}},
		{"k равно нулю", []int{3, 2, 1}, 0, []int{}},
		{"k больше длины", []int{3, 1, 2}, 5, []int{3, 2, 1}},
		{"k равно длине", []int{4, 1, 7}, 3, []int{7, 4, 1}},
		{"один элемент", []int{42}, 1, []int{42}},
		{"три наибольших", []int{3, 1, 5, 12, 2, 11}, 3, []int{12, 11, 5}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FindKLargest(tt.nums, tt.k)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("FindKLargest(%v, %d) = %v, ожидалось %v", tt.nums, tt.k, got, tt.want)
			}
		})
	}
}

func TestTopKFrequent(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		k    int
		want []int
	}{
		{"пример из условия", []int{1, 1, 1, 2, 2, 3}, 2, []int{1, 2}},
		{"один наиболее частый", []int{1, 1, 1, 2, 2, 3, 3, 3, 3}, 1, []int{3}},
		{"k равно нулю", []int{1, 1, 2}, 0, []int{}},
		{"один элемент", []int{7}, 1, []int{7}},
		{"чёткое разделение частот", []int{5, 5, 5, 5, 6, 6, 6, 7, 7, 8}, 2, []int{5, 6}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FindKFrequentSorted(TopKFrequent(tt.nums, tt.k))
			want := FindKFrequentSorted(tt.want)
			if !reflect.DeepEqual(got, want) {
				t.Errorf("TopKFrequent(%v, %d) = %v, ожидалось как множество %v", tt.nums, tt.k, got, tt.want)
			}
		})
	}
}

// FindKFrequentSorted нормализует срез для сравнения как множества:
// копирует и сортирует по возрастанию (порядок ответа TopKFrequent не важен).
func FindKFrequentSorted(s []int) []int {
	out := append([]int(nil), s...)
	sort.Ints(out)
	return out
}

func TestKthLargest(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		k    int
		want int
	}{
		{"пример из условия", []int{3, 2, 1, 5, 6, 4}, 2, 5},
		{"с дубликатами", []int{3, 2, 3, 1, 2, 4, 5, 5, 6}, 4, 4},
		{"наибольший", []int{3, 2, 1, 5, 6, 4}, 1, 6},
		{"наименьший", []int{3, 2, 1, 5, 6, 4}, 6, 1},
		{"один элемент", []int{42}, 1, 42},
		{"все равны", []int{7, 7, 7, 7}, 3, 7},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := KthLargest(tt.nums, tt.k)
			if got != tt.want {
				t.Errorf("KthLargest(%v, %d) = %d, ожидалось %d", tt.nums, tt.k, got, tt.want)
			}
		})
	}
}

func TestKClosestPoints(t *testing.T) {
	tests := []struct {
		name   string
		points [][]int
		k      int
		want   [][]int
	}{
		{"пример из условия", [][]int{{1, 3}, {-2, 2}}, 1, [][]int{{-2, 2}}},
		{"две из трёх", [][]int{{3, 3}, {5, -1}, {-2, 4}}, 2, [][]int{{3, 3}, {-2, 4}}},
		{"k равно нулю", [][]int{{1, 1}}, 0, [][]int{}},
		{"k больше длины", [][]int{{2, 2}, {1, 1}}, 5, [][]int{{1, 1}, {2, 2}}},
		{"одна точка", [][]int{{0, 5}}, 1, [][]int{{0, 5}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sortPoints(KClosestPoints(tt.points, tt.k))
			want := sortPoints(tt.want)
			if !reflect.DeepEqual(got, want) {
				t.Errorf("KClosestPoints(%v, %d) = %v, ожидалось как множество %v", tt.points, tt.k, got, tt.want)
			}
		})
	}
}

func TestKClosestNumbers(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		k    int
		x    int
		want []int
	}{
		{"x внутри массива", []int{1, 2, 3, 4, 5}, 4, 3, []int{1, 2, 3, 4}},
		{"x левее массива", []int{1, 2, 3, 4, 5}, 4, -1, []int{1, 2, 3, 4}},
		{"x правее массива", []int{1, 2, 3, 4, 5}, 2, 10, []int{4, 5}},
		{"равное расстояние — меньшее", []int{1, 3}, 1, 2, []int{1}},
		{"k равно длине", []int{1, 5, 10}, 3, 4, []int{1, 5, 10}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := KClosestNumbers(tt.arr, tt.k, tt.x)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("KClosestNumbers(%v, %d, %d) = %v, ожидалось %v", tt.arr, tt.k, tt.x, got, tt.want)
			}
		})
	}
}

// sortPoints нормализует набор точек для сравнения как множества: копирует и
// сортирует лексикографически (порядок ответа KClosestPoints не важен).
func sortPoints(points [][]int) [][]int {
	out := make([][]int, len(points))
	copy(out, points)
	sort.Slice(out, func(i, j int) bool {
		if out[i][0] != out[j][0] {
			return out[i][0] < out[j][0]
		}
		return out[i][1] < out[j][1]
	})
	return out
}
