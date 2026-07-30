// RESP2-кодек: разбор запросов и сборка ответов по протоколу
// https://redis.io/docs/latest/develop/reference/protocol-spec/. Дан готовым
// (без build-тега, общий для заготовки и эталона) — это протокольная возня,
// а не алгоритмическая задача книги; читатель пишет обработчики команд в
// miniredis.go (doc пакета — там).
package miniredis

import (
	"bufio"
	"fmt"
	"io"
	"strconv"
	"strings"
)

// ReadCommand читает один запрос клиента и возвращает его как срез
// аргументов (первый элемент — имя команды). Понимает оба формата, которыми
// реально пишут RESP-клиенты:
//   - multibulk — то, что шлёт redis-cli: "*2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n";
//   - inline — голая строка вида "PING\r\n" или "SET foo bar\r\n", удобная
//     для ручного тыка через nc/telnet, где RESP-фреймы никто не собирает.
//
// Ошибку (в т.ч. io.EOF при разрыве соединения) возвращает как есть —
// вызывающий код должен закрыть соединение.
func ReadCommand(r *bufio.Reader) ([]string, error) {
	line, err := readLine(r)
	if err != nil {
		return nil, err
	}
	if len(line) == 0 {
		return nil, nil
	}
	if line[0] != '*' {
		return strings.Fields(line), nil
	}
	return parseMultibulk(r, line)
}

// readLine читает строку до '\n' и обрезает завершающие "\r\n"/"\n".
func readLine(r *bufio.Reader) (string, error) {
	line, err := r.ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimRight(line, "\r\n"), nil
}

// parseMultibulk разбирает тело массива *N после уже прочитанного заголовка.
func parseMultibulk(r *bufio.Reader, header string) ([]string, error) {
	n, err := strconv.Atoi(header[1:])
	if err != nil {
		return nil, fmt.Errorf("miniredis: битый заголовок массива %q: %w", header, err)
	}
	if n < 0 {
		return nil, fmt.Errorf("miniredis: отрицательная длина массива в %q", header)
	}
	args := make([]string, 0, n)
	for range n {
		bulkHeader, err := readLine(r)
		if err != nil {
			return nil, err
		}
		if len(bulkHeader) == 0 || bulkHeader[0] != '$' {
			return nil, fmt.Errorf("miniredis: ожидался $-заголовок bulk-строки, получено %q", bulkHeader)
		}
		blen, err := strconv.Atoi(bulkHeader[1:])
		if err != nil || blen < 0 {
			return nil, fmt.Errorf("miniredis: битая длина bulk-строки %q", bulkHeader)
		}
		buf := make([]byte, blen+2) // +2 на завершающий "\r\n" bulk-строки
		if _, err := io.ReadFull(r, buf); err != nil {
			return nil, err
		}
		args = append(args, string(buf[:blen]))
	}
	return args, nil
}

// Reply — ответ сервера в терминах RESP2. WriteTo пишет закодированный ответ
// в w БЕЗ Flush — вызывающий код сам решает, когда сбрасывать буфер.
type Reply interface {
	WriteTo(w *bufio.Writer) error
}

type simpleStringReply string

func (s simpleStringReply) WriteTo(w *bufio.Writer) error {
	_, err := fmt.Fprintf(w, "+%s\r\n", string(s))
	return err
}

// SimpleString — короткий статус-ответ (например, "OK"): redis-cli печатает
// его без кавычек. НЕ для пользовательских данных — они могут содержать
// "\r\n" и сломать протокол; для данных есть BulkString.
func SimpleString(s string) Reply { return simpleStringReply(s) }

type errorReply string

func (e errorReply) WriteTo(w *bufio.Writer) error {
	_, err := fmt.Fprintf(w, "-%s\r\n", string(e))
	return err
}

// Err строит ответ-ошибку. Соглашение Redis — код ошибки заглавными в начале
// ("ERR ...", "WRONGTYPE ..."); redis-cli печатает это как "(error) ...".
func Err(msg string) Reply { return errorReply(msg) }

type integerReply int64

func (i integerReply) WriteTo(w *bufio.Writer) error {
	_, err := fmt.Fprintf(w, ":%d\r\n", int64(i))
	return err
}

// Integer — целочисленный ответ (например, INCR или длина списка).
func Integer(n int64) Reply { return integerReply(n) }

type bulkStringReply string

func (b bulkStringReply) WriteTo(w *bufio.Writer) error {
	_, err := fmt.Fprintf(w, "$%d\r\n%s\r\n", len(b), string(b))
	return err
}

// BulkString — основной способ вернуть строковые данные: длина в байтах
// плюс сырое содержимое, поэтому безопасен для чего угодно, включая "\r\n"
// внутри значения.
func BulkString(s string) Reply { return bulkStringReply(s) }

type nilBulkReply struct{}

func (nilBulkReply) WriteTo(w *bufio.Writer) error {
	_, err := w.WriteString("$-1\r\n")
	return err
}

// NilBulk — «ключа нет» (redis-cli печатает как "(nil)").
func NilBulk() Reply { return nilBulkReply{} }

type arrayReply []Reply

func (a arrayReply) WriteTo(w *bufio.Writer) error {
	if _, err := fmt.Fprintf(w, "*%d\r\n", len(a)); err != nil {
		return err
	}
	for _, item := range a {
		if err := item.WriteTo(w); err != nil {
			return err
		}
	}
	return nil
}

// Array — составной ответ (например, элементы ZRANGE). Элементы сами по себе
// Reply, поэтому внутрь можно вкладывать BulkString/Integer/другой Array.
func Array(items []Reply) Reply { return arrayReply(items) }
