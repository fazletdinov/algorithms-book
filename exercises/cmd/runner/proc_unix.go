//go:build unix

package main

import (
	"context"
	"os/exec"
	"syscall"
	"time"
)

// groupCommand готовит команду, у которой по отмене ctx умирает ВСЁ дерево.
// `go test` запускает тестовый бинарник дочерним процессом: SIGKILL одному
// `go` оставлял бинарник сиротой до его собственного таймаута, а Wait — висеть
// на трубе, которую сирота унаследовал (для этого WaitDelay).
func groupCommand(ctx context.Context, name string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error { return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL) }
	cmd.WaitDelay = 2 * time.Second
	return cmd
}
