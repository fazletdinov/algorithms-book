//go:build race

package scaletest

// raceFactor — во сколько раз растёт срок под -race: детектор замедляет код
// примерно на порядок, и эталон, и перебор одинаково.
const raceFactor = 10
