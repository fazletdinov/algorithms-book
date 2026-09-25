//go:build solution

package consistenthash

import (
	"slices"
	"strconv"
)

type point struct {
	h    uint32
	node string
}

// Ring — кольцо: отсортированные точки виртуальных узлов.
type Ring struct {
	replicas int
	points   []point // по (h, node) — порядок кольца и правило ничьей
	nodes    map[string]bool
}

func NewRing(replicas int) *Ring {
	if replicas < 1 {
		replicas = 1
	}
	return &Ring{replicas: replicas, nodes: map[string]bool{}}
}

func (r *Ring) Add(nodes ...string) {
	for _, n := range nodes {
		if r.nodes[n] {
			continue
		}
		r.nodes[n] = true
		for i := range r.replicas {
			r.points = append(r.points, point{HashKey(n + "#" + strconv.Itoa(i)), n})
		}
	}
	slices.SortFunc(r.points, cmpPoint)
}

func (r *Ring) Remove(node string) {
	if !r.nodes[node] {
		return
	}
	delete(r.nodes, node)
	// Порядок оставшихся точек не меняется — сортировать заново не нужно.
	r.points = slices.DeleteFunc(r.points, func(p point) bool { return p.node == node })
}

func (r *Ring) Get(key string) string {
	if len(r.points) == 0 {
		return ""
	}
	h := HashKey(key)
	// Первая точка с хешем >= h: бинарный поиск по отсортированному кольцу.
	i, _ := slices.BinarySearchFunc(r.points, h, func(p point, t uint32) int {
		switch {
		case p.h < t:
			return -1
		case p.h > t:
			return 1
		}
		return 0
	})
	if i == len(r.points) {
		i = 0 // за последней точкой — снова первая: это и делает прямую кольцом
	}
	return r.points[i].node
}

func cmpPoint(a, b point) int {
	switch {
	case a.h < b.h:
		return -1
	case a.h > b.h:
		return 1
	case a.node < b.node:
		return -1
	case a.node > b.node:
		return 1
	}
	return 0
}

func MovedFraction(keys []string, before, after func(string) string) float64 {
	if len(keys) == 0 {
		return 0
	}
	moved := 0
	for _, k := range keys {
		if before(k) != after(k) {
			moved++
		}
	}
	return float64(moved) / float64(len(keys))
}

func JumpHash(key uint64, buckets int) int {
	if buckets <= 0 {
		return -1
	}
	var b, j int64 = -1, 0
	for j < int64(buckets) {
		b = j
		key = key*2862933555777941757 + 1
		j = int64(float64(b+1) * (float64(int64(1)<<31) / float64((key>>33)+1)))
	}
	return int(b)
}
