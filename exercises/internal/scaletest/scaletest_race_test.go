//go:build race

package scaletest

import (
	"testing"
	"time"
)

// Под -race код медленнее примерно на порядок — и эталон, и перебор. Срок
// растёт вместе с ним, иначе эталон на медленной машине упирался бы в него.
func TestWithinStretchesLimitUnderRace(t *testing.T) {
	r := &recorder{TB: t}
	Within(r, 20*time.Millisecond, "под -race", func() { time.Sleep(100 * time.Millisecond) })
	if r.failed {
		t.Fatalf("под -race срок 20ms не растянулся до 200ms: %s", r.msg)
	}
}
