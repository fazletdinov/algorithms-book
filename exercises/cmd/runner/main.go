// Command runner — локальный helper-сервер для «решай задачу прямо в книге».
//
// Книга (mdBook) обращается сюда по fetch: отдаёт заготовку пакета как
// стартовый код, принимает код пользователя, прогоняет настоящий `go test`
// против неизменных тестов пакета и возвращает результат.
//
// Запуск (из каталога exercises/):
//
//	go run ./cmd/runner            # слушает http://localhost:8080
//	go run ./cmd/runner -addr :9000
//
// Пределы прогона (run.go): тесту — 20 с (45 с с -race), сырому выводу — 4 МиБ
// (на этом потолке прогон останавливается сразу), прогоны идут по одному.
// Зависшее решение получает ответ с причиной, а не держит тестовый бинарник до
// его собственных десяти минут; прогон, не дошедший до тестов (не хватило срока
// или памяти на сборку, не сработал ограничитель), — свою причину, а не «ошибку
// компиляции». Ctrl+C (и SIGTERM) останавливает сервер вместе с идущим прогоном —
// см. serve.
//
// Предел памяти (mem.go) — 2 ГиБ на прогон, флаг -mem-mb (0 — без предела).
// Способ выбирается при старте: область systemd с MemoryMax, если пользовательский
// systemd её даёт; иначе prlimit на адреса тестового бинарника; иначе предела нет
// — об этом пишет лог, а виджет показывает предупреждение. Действующий способ
// отдаёт /api/health (поле limits).
//
// Безопасность: сервис ЛОКАЛЬНЫЙ и однопользовательский — он запускает твой же
// код на твоей машине, поэтому песочницы нет (пределы времени и памяти — не
// изоляция: они только не дают решению подвесить машину). Слушает только localhost, и
// это НЕ настройка по умолчанию, а инвариант: адрес принудительно приводится к
// localhost, что бы ни передали в -addr. НО: /api/run исполняет присланный код,
// поэтому CORS ограничен известными origin'ами книги (localhost + GitHub Pages)
// — иначе любой открытый в браузере сайт мог бы fetch'ем прогнать произвольный
// Go-код на машине читателя.
//
// Единственное исключение — флаг -listen-all, и он нужен ровно для одного
// сценария: runner работает ВНУТРИ контейнера (docker/devcontainer), где
// «наружу» — это всё ещё изолированная сеть контейнера, а до хоста порт
// доводит уже docker, которому и решать, кому его показывать:
//
//	docker run --rm --memory=2g --memory-swap=2g -p 127.0.0.1:8080:8080 \
//	  -v "$PWD:/w" -w /w/exercises golang:1.24 go run ./cmd/runner -listen-all
//
// Публикация вида `-p 8080:8080` (без 127.0.0.1) отдаст исполнение
// произвольного кода всей локальной сети — так делать не надо. В контейнере
// systemd нет: работают prlimit и предел самого контейнера (--memory), упор в
// него виден как «signal: killed».
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strings"
	"syscall"
	"time"
)

// moduleRoot — каталог модуля exercises (где лежит go.mod). Определяется при
// старте подъёмом вверх от рабочего каталога.
var moduleRoot string

// pkgName разрешает только простые имена пакетов (буквы/цифры), чтобы code из
// запроса не мог сослаться на произвольный путь файловой системы.
var pkgName = regexp.MustCompile(`^[a-z][a-z0-9]*$`)

func main() {
	addr := flag.String("addr", ":8080", "адрес прослушивания (localhost)")
	listenAll := flag.Bool("listen-all", false, "слушать на всех интерфейсах — ТОЛЬКО внутри контейнера/ВМ")
	memMB := flag.Int("mem-mb", 2048, "предел памяти одного прогона, МиБ (0 — без предела)")
	flag.Parse()

	root, err := findModuleRoot()
	if err != nil {
		log.Fatalf("runner: не найден go.mod модуля exercises: %v", err)
	}
	moduleRoot = root
	log.Printf("runner: модуль %s", moduleRoot)

	limiter := detectMemLimiter(context.Background(), int64(*memMB)<<20)
	switch limiter.Mode {
	case memCgroup:
		log.Printf("runner: предел памяти прогона — %s (область systemd с MemoryMax, без подкачки)", humanBytes(limiter.Bytes))
	case memRlimit:
		log.Printf("runner: предел памяти прогона — %s адресов тестового бинарника (prlimit; области systemd --user с пределом нет)", humanBytes(limiter.Bytes))
	default:
		if *memMB > 0 {
			log.Print("runner: ВНИМАНИЕ: предела памяти нет — ни systemd --user, ни prlimit; бесконечный рост в решении может занять всю память машины")
		} else {
			log.Print("runner: предел памяти выключен (-mem-mb 0)")
		}
	}

	srv := newServer(limiter)
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", withCORS(srv.handleHealth))
	mux.HandleFunc("/api/stub", withCORS(handleStub))
	mux.HandleFunc("/api/solution", withCORS(handleSolution))
	mux.HandleFunc("/api/run", withCORS(srv.handleRun))
	mux.HandleFunc("/api/trace", withCORS(srv.handleTrace))

	// По умолчанию — жёстко localhost: /api/run исполняет присланный код, и
	// доступный по сети runner означал бы удалённое выполнение кода на машине
	// читателя. -listen-all снимает ограничение осознанно и только для запуска
	// в контейнере (см. док-комментарий пакета).
	listen := "localhost" + strings.TrimPrefix(*addr, "localhost")
	if *listenAll {
		listen = *addr
		log.Printf("runner: ВНИМАНИЕ — слушаю %s на всех интерфейсах (-listen-all). "+
			"/api/run исполняет присланный код: это безопасно только внутри контейнера/ВМ, "+
			"порт которого опубликован на 127.0.0.1", listen)
	}
	ln, err := net.Listen("tcp", listen)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("runner: слушаю http://localhost%s — Ctrl+C для остановки", *addr)
	// Ctrl+C и SIGTERM не убивают процесс сразу, а гасят ctx: только так сигнал
	// доходит до прогонов, которые живут в своих группах процессов (см. serve).
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	err = serve(ctx, ln, mux)
	stop()
	if err != nil {
		log.Fatal(err)
	}
	log.Print("runner: остановлен")
}

// shutdownGrace — сколько serve ждёт обработчики после остановки. Группы
// процессов убиты уже в момент отмены; срок нужен, чтобы Wait отпустил трубы
// (WaitDelay — 2 с), а обработчик убрал временный каталог.
const shutdownGrace = 5 * time.Second

// serve обслуживает ln, пока жив ctx; ctx — база контекста каждого запроса.
// Прогоны живут в своих группах процессов (groupCommand), и сигнал, который
// терминал по Ctrl+C или `kill 0` из make serve шлёт группе runner'а, до них не
// доходит: без этой связи зависший тест переживал сервер. Отмена ctx доходит
// до r.Context() и убивает группу тем же путём, что уход клиента.
func serve(ctx context.Context, ln net.Listener, h http.Handler) error {
	srv := &http.Server{Handler: h, BaseContext: func(net.Listener) context.Context { return ctx }}
	stopping, release := context.WithCancel(ctx)
	drained := make(chan struct{})
	go func() {
		defer close(drained)
		<-stopping.Done()
		grace, cancel := context.WithTimeout(context.Background(), shutdownGrace)
		defer cancel()
		_ = srv.Shutdown(grace) // не уложились — выходим всё равно: группы уже убиты
	}()
	err := srv.Serve(ln)
	release() // Serve мог упасть и сам — отпускаем горутину выше
	<-drained
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

// findModuleRoot поднимается вверх от текущего каталога до go.mod с нужным
// module path.
func findModuleRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		gomod := filepath.Join(dir, "go.mod")
		if b, err := os.ReadFile(gomod); err == nil &&
			bytes.Contains(b, []byte("algorithms-book/exercises")) {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("go.mod не найден вверх от %s", dir)
		}
		dir = parent
	}
}

// ---- CORS ----

// allowedOrigin — только сама книга: локальный mdbook serve (любой порт на
// localhost/127.0.0.1) и опубликованная версия на GitHub Pages. Запросы из
// не-браузерных клиентов (curl) идут без Origin — их CORS не касается.
func allowedOrigin(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return false
	}
	if u.Scheme == "http" && (u.Hostname() == "localhost" || u.Hostname() == "127.0.0.1") {
		return true
	}
	return origin == "https://fazletdinov.github.io"
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin != "" {
			if !allowedOrigin(origin) {
				http.Error(w, "origin not allowed", http.StatusForbidden)
				return
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h(w, r)
	}
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

// ---- handlers ----

// handleHealth, кроме «жив», сообщает действующие пределы: виджет показывает их в
// шапке и предупреждает, когда предела памяти нет.
func (s *server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	lim := s.limits(false)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "module": moduleRoot, "limits": map[string]any{
		"memory": lim.Mem.Mode, "memoryBytes": lim.Mem.Bytes, "memoryText": humanBytes(lim.Mem.Bytes),
		"testTimeout": lim.TestTimeout.String(), "raceTimeout": s.limits(true).TestTimeout.String(),
	}})
}

// server — состояние между запросами. Окно slot (ёмкость 1) пускает один прогон
// за раз: два одновременных go test — два компилятора и два набора тестов в памяти.
type server struct {
	slot        chan struct{}
	limits      func(race bool) runLimits
	traceLimits func() runLimits
}

// newServer: mem — предел памяти, выбранный при старте (detectMemLimiter); он
// один на прогоны и трассы.
func newServer(mem memLimiter) *server {
	return &server{
		slot: make(chan struct{}, 1),
		limits: func(race bool) runLimits {
			lim := defaultLimits(race)
			lim.Mem = mem
			return lim
		},
		traceLimits: func() runLimits { return runLimits{Deadline: 5 * time.Second, MaxOutput: maxRunOutput, Mem: mem} },
	}
}

// acquire ждёт очереди на прогон; false — клиент ушёл, не дождавшись.
func (s *server) acquire(ctx context.Context) bool {
	select {
	case s.slot <- struct{}{}:
		return true
	case <-ctx.Done():
		return false
	}
}

func (s *server) release() { <-s.slot }

// validPkg проверяет имя пакета и что он существует в модуле.
func validPkg(pkg string) (string, bool) {
	if !pkgName.MatchString(pkg) {
		return "", false
	}
	dir := filepath.Join(moduleRoot, pkg)
	if fi, err := os.Stat(dir); err != nil || !fi.IsDir() {
		return "", false
	}
	return dir, true
}

type runRequest struct {
	Pkg  string `json:"pkg"`
	Code string `json:"code"`
	Race bool   `json:"race"` // запускать go test с детектором гонок (-race)
	// Tests — если не пусто, гоняются ТОЛЬКО эти тесты (go test -run). Нужно
	// мок-интервью: задача там — одна функция пакета, а panic("TODO") в любой
	// другой роняет весь тестовый бинарник, и до теста нужной функции дело
	// может просто не дойти.
	Tests []string `json:"tests,omitempty"`
}

// testNameRe — имя тестовой функции Go. Список уходит в аргумент -run как
// регулярное выражение, поэтому пропускаем только идентификаторы: никаких
// метасимволов, которые превратили бы фильтр в «запусти всё» или сломали его.
var testNameRe = regexp.MustCompile(`^Test[A-Za-z0-9_]*$`)

// maxTestFilter — потолок длины списка: у самой «тестовой» функции тренажёра
// их единицы, так что больше — это не запрос тренажёра.
const maxTestFilter = 32

// testArgs собирает аргументы `go test`. Вынесено из runGoTest, чтобы
// проверить фильтр тестом, не поднимая сервер и не компилируя модуль.
// timeout — срок тестового бинарника: без -timeout он живёт 10 минут, и
// зависшее решение держало бы его всё это время.
func testArgs(pkg string, race bool, tests []string, timeout time.Duration) ([]string, error) {
	args := []string{"test", "-json", "-count=1", "-timeout", timeout.String()}
	if race {
		args = append(args, "-race")
	}
	if len(tests) > 0 {
		if len(tests) > maxTestFilter {
			return nil, fmt.Errorf("слишком много тестов в фильтре: %d (максимум %d)", len(tests), maxTestFilter)
		}
		for _, t := range tests {
			if !testNameRe.MatchString(t) {
				return nil, fmt.Errorf("недопустимое имя теста: %q", t)
			}
		}
		// ^(...)$ — точное совпадение имени: без якорей TestFoo зацепил бы и
		// TestFooBar соседней функции.
		args = append(args, "-run", "^("+strings.Join(tests, "|")+")$")
	}
	return append(args, "./"+pkg+"/"), nil
}

// handleRun копирует модуль во временный каталог, подменяет заготовку кодом
// пользователя и прогоняет `go test`.
func (s *server) handleRun(w http.ResponseWriter, r *http.Request) {
	var req runRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "плохой JSON"})
		return
	}
	if _, ok := validPkg(req.Pkg); !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "неизвестный пакет"})
		return
	}
	lim := s.limits(req.Race)
	// Фильтр проверяем ДО копирования модуля: битый запрос не должен стоить
	// копии каталога и компиляции.
	args, err := testArgs(req.Pkg, req.Race, req.Tests, lim.TestTimeout)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	// Очередь — после проверок запроса и до копии модуля: битый запрос отвечает
	// сразу, а ждущий не держит на диске ещё одну копию.
	if !s.acquire(r.Context()) {
		return
	}
	defer s.release()

	tmp, err := os.MkdirTemp("", "algorunner-")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer os.RemoveAll(tmp)

	if err := copyModule(moduleRoot, tmp); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "копирование модуля: " + err.Error()})
		return
	}
	// Подменяем заготовку кодом пользователя; build-тег снимаем, чтобы файл
	// компилировался при обычном `go test` (без -tags solution). Эталон
	// удаляем во временной копии, чтобы не дублировать символы.
	stub := filepath.Join(tmp, req.Pkg, req.Pkg+".go")
	if err := os.WriteFile(stub, []byte(stripBuildTag(req.Code)), 0o644); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	_ = os.Remove(filepath.Join(tmp, req.Pkg, req.Pkg+"_solution.go"))

	res := runGoTest(r.Context(), tmp, args, req.Tests, lim)
	res.Filtered = len(req.Tests) > 0
	writeJSON(w, http.StatusOK, res)
}

// ---- helpers ----

var buildTagLine = regexp.MustCompile(`(?m)^//go:build .*$\n?`)

// stripBuildTag убирает строку `//go:build ...` (и устаревший `// +build`),
// чтобы файл компилировался без тегов.
func stripBuildTag(code string) string {
	code = buildTagLine.ReplaceAllString(code, "")
	code = regexp.MustCompile(`(?m)^// \+build .*$\n?`).ReplaceAllString(code, "")
	return strings.TrimLeft(code, "\n")
}

// copyModule копирует .go/.mod/.sum файлы модуля во временный каталог,
// сохраняя структуру. Зависимостей вне stdlib в модуле нет, поэтому этого
// достаточно для `go test`.
func copyModule(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		name := d.Name()
		if d.IsDir() {
			// пропускаем скрытые/служебные каталоги
			if path != src && strings.HasPrefix(name, ".") {
				return filepath.SkipDir
			}
			return nil
		}
		ext := filepath.Ext(name)
		if ext != ".go" && name != "go.mod" && name != "go.sum" {
			return nil
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		b, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(target, b, 0o644)
	})
}
