package miniredis

import (
	"bufio"
	"bytes"
	"errors"
	"io"
	"strings"
	"testing"
)

func TestReadCommandMultibulk(t *testing.T) {
	tests := []struct {
		name string
		wire string // ровно то, что реально шлёт redis-cli на проводе
		want []string
	}{
		{"PING без аргументов", "*1\r\n$4\r\nPING\r\n", []string{"PING"}},
		{"PING с аргументом", "*2\r\n$4\r\nPING\r\n$5\r\nhello\r\n", []string{"PING", "hello"}},
		{"SET foo bar", "*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n", []string{"SET", "foo", "bar"}},
		{"пустая bulk-строка", "*2\r\n$3\r\nSET\r\n$0\r\n\r\n", []string{"SET", ""}},
		{"значение с пробелом внутри (не разбивается)", "*2\r\n$3\r\nSET\r\n$11\r\nhello world\r\n", []string{"SET", "hello world"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := bufio.NewReader(strings.NewReader(tt.wire))
			got, err := ReadCommand(r)
			if err != nil {
				t.Fatalf("ReadCommand() error = %v", err)
			}
			if len(got) != len(tt.want) {
				t.Fatalf("ReadCommand() = %v, want %v", got, tt.want)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("arg[%d] = %q, want %q", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestReadCommandInline(t *testing.T) {
	tests := []struct {
		name string
		wire string
		want []string
	}{
		{"голый PING", "PING\r\n", []string{"PING"}},
		{"PING без \\r (просто \\n)", "PING\n", []string{"PING"}},
		{"несколько слов", "SET foo bar\r\n", []string{"SET", "foo", "bar"}},
		{"лишние пробелы схлопываются", "SET   foo   bar\r\n", []string{"SET", "foo", "bar"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := bufio.NewReader(strings.NewReader(tt.wire))
			got, err := ReadCommand(r)
			if err != nil {
				t.Fatalf("ReadCommand() error = %v", err)
			}
			if len(got) != len(tt.want) {
				t.Fatalf("ReadCommand() = %v, want %v", got, tt.want)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("arg[%d] = %q, want %q", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestReadCommandEOF(t *testing.T) {
	r := bufio.NewReader(strings.NewReader(""))
	if _, err := ReadCommand(r); !errors.Is(err, io.EOF) {
		t.Fatalf("ReadCommand() на пустом потоке = %v, хотели io.EOF", err)
	}
}

func TestReadCommandTwoRequestsInOnePacket(t *testing.T) {
	// Второй запрос должен разобраться следующим вызовом того же bufio.Reader —
	// именно так это используется в цикле сервера на одном соединении.
	r := bufio.NewReader(strings.NewReader("*1\r\n$4\r\nPING\r\n*1\r\n$4\r\nPING\r\n"))
	first, err := ReadCommand(r)
	if err != nil || len(first) != 1 || first[0] != "PING" {
		t.Fatalf("первый ReadCommand() = %v, %v", first, err)
	}
	second, err := ReadCommand(r)
	if err != nil || len(second) != 1 || second[0] != "PING" {
		t.Fatalf("второй ReadCommand() = %v, %v", second, err)
	}
}

func writeReply(t *testing.T, rep Reply) string {
	t.Helper()
	var buf bytes.Buffer
	w := bufio.NewWriter(&buf)
	if err := rep.WriteTo(w); err != nil {
		t.Fatalf("WriteTo() error = %v", err)
	}
	if err := w.Flush(); err != nil {
		t.Fatalf("Flush() error = %v", err)
	}
	return buf.String()
}

func TestReplyWireFormat(t *testing.T) {
	tests := []struct {
		name string
		rep  Reply
		want string
	}{
		{"SimpleString", SimpleString("OK"), "+OK\r\n"},
		{"Err", Err("ERR unknown command 'FOO'"), "-ERR unknown command 'FOO'\r\n"},
		{"Integer положительный", Integer(1000), ":1000\r\n"},
		{"Integer отрицательный", Integer(-1), ":-1\r\n"},
		{"BulkString", BulkString("foobar"), "$6\r\nfoobar\r\n"},
		{"BulkString пустая строка (не путать с NilBulk)", BulkString(""), "$0\r\n\r\n"},
		{"NilBulk", NilBulk(), "$-1\r\n"},
		{"Array пустой", Array(nil), "*0\r\n"},
		{"Array из BulkString", Array([]Reply{BulkString("a"), BulkString("bc")}), "*2\r\n$1\r\na\r\n$2\r\nbc\r\n"},
		{"Array вложенный (Integer + Array)", Array([]Reply{Integer(1), Array([]Reply{BulkString("x")})}), "*2\r\n:1\r\n*1\r\n$1\r\nx\r\n"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := writeReply(t, tt.rep); got != tt.want {
				t.Errorf("wire = %q, want %q", got, tt.want)
			}
		})
	}
}
