//go:build !unix

package main

import (
	"context"
	"os/exec"
	"time"
)

// groupCommand вне unix (Windows) группу процессов не заводит: по отмене ctx
// умирает только сама команда. WaitDelay всё равно нужен — без него Wait висел
// бы на трубе, которую унаследовал уцелевший тестовый бинарник.
func groupCommand(ctx context.Context, name string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.WaitDelay = 2 * time.Second
	return cmd
}
