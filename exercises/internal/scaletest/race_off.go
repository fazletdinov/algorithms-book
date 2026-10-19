//go:build !race

package scaletest

// raceFactor — без -race срок не меняется (см. race_on.go).
const raceFactor = 1
