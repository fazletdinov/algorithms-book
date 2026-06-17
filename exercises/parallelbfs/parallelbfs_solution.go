//go:build solution

package parallelbfs

import (
	"sort"
	"sync"
	"sync/atomic"
)

func BFSLevelsSeq(adj [][]int, start int) [][]int {
	n := len(adj)
	levels := [][]int{}
	if n == 0 || start < 0 || start >= n {
		return levels
	}
	visited := make([]bool, n)
	visited[start] = true
	frontier := []int{start}
	for len(frontier) > 0 {
		level := append([]int(nil), frontier...)
		sort.Ints(level)
		levels = append(levels, level)
		var next []int
		for _, u := range frontier {
			for _, v := range adj[u] {
				if !visited[v] {
					visited[v] = true
					next = append(next, v)
				}
			}
		}
		frontier = next
	}
	return levels
}

func BFSLevelsConc(adj [][]int, start int) [][]int {
	n := len(adj)
	levels := [][]int{}
	if n == 0 || start < 0 || start >= n {
		return levels
	}
	visited := make([]bool, n)
	visited[start] = true
	frontier := []int{start}
	var mu sync.Mutex
	for len(frontier) > 0 {
		level := append([]int(nil), frontier...)
		sort.Ints(level)
		levels = append(levels, level)
		var next []int
		var wg sync.WaitGroup
		for _, u := range frontier {
			wg.Add(1)
			go func(u int) {
				defer wg.Done()
				for _, v := range adj[u] {
					// visited и next — общие; вся проверка-и-пометка под одним
					// замком, иначе двое могут добавить v в next дважды (гонка).
					mu.Lock()
					if !visited[v] {
						visited[v] = true
						next = append(next, v)
					}
					mu.Unlock()
				}
			}(u)
		}
		wg.Wait() // барьер: уровень целиком собран, переходим к следующему
		frontier = next
	}
	return levels
}

func BFSLevelsConcLocal(adj [][]int, start int) [][]int {
	n := len(adj)
	levels := [][]int{}
	if n == 0 || start < 0 || start >= n {
		return levels
	}
	visited := make([]int32, n)
	visited[start] = 1
	frontier := []int{start}
	for len(frontier) > 0 {
		level := append([]int(nil), frontier...)
		sort.Ints(level)
		levels = append(levels, level)
		locals := make([][]int, len(frontier))
		var wg sync.WaitGroup
		for i, u := range frontier {
			wg.Add(1)
			go func(i, u int) {
				defer wg.Done()
				var local []int
				for _, v := range adj[u] {
					// атомарный захват: ровно одна горутина переведёт 0→1 и
					// возьмёт v себе — ни мьютекса, ни дублей, ни гонки
					if atomic.CompareAndSwapInt32(&visited[v], 0, 1) {
						local = append(local, v)
					}
				}
				locals[i] = local // своя ячейка — общей записи нет
			}(i, u)
		}
		wg.Wait()
		var next []int
		for _, l := range locals { // слияние локальных фронтов (вне горячего пути)
			next = append(next, l...)
		}
		frontier = next
	}
	return levels
}
