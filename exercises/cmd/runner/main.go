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
// Безопасность: сервис ЛОКАЛЬНЫЙ и однопользовательский — он запускает твой же
// код на твоей машине, поэтому песочница не нужна. Слушает только localhost.
// НО: /api/run исполняет присланный код, поэтому CORS ограничен известными
// origin'ами книги (localhost + GitHub Pages) — иначе любой открытый в браузере
// сайт мог бы fetch'ем прогнать произвольный Go-код на машине читателя.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
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
	flag.Parse()

	root, err := findModuleRoot()
	if err != nil {
		log.Fatalf("runner: не найден go.mod модуля exercises: %v", err)
	}
	moduleRoot = root
	log.Printf("runner: модуль %s", moduleRoot)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", withCORS(handleHealth))
	mux.HandleFunc("/api/stub", withCORS(handleStub))
	mux.HandleFunc("/api/run", withCORS(handleRun))

	log.Printf("runner: слушаю http://localhost%s — Ctrl+C для остановки", *addr)
	if err := http.ListenAndServe("localhost"+strings.TrimPrefix(*addr, "localhost"), mux); err != nil {
		log.Fatal(err)
	}
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

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "module": moduleRoot})
}

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

// handleStub отдаёт файл-заготовку <pkg>/<pkg>.go как стартовый код.
func handleStub(w http.ResponseWriter, r *http.Request) {
	pkg := r.URL.Query().Get("pkg")
	dir, ok := validPkg(pkg)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "неизвестный пакет"})
		return
	}
	code, err := os.ReadFile(filepath.Join(dir, pkg+".go"))
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "заготовка не найдена"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"pkg": pkg, "code": string(code)})
}

type runRequest struct {
	Pkg  string `json:"pkg"`
	Code string `json:"code"`
	Race bool   `json:"race"` // запускать go test с детектором гонок (-race)
}

// handleRun копирует модуль во временный каталог, подменяет заготовку кодом
// пользователя и прогоняет `go test`.
func handleRun(w http.ResponseWriter, r *http.Request) {
	var req runRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "плохой JSON"})
		return
	}
	if _, ok := validPkg(req.Pkg); !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "неизвестный пакет"})
		return
	}

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

	res := runGoTest(tmp, req.Pkg, req.Race)
	writeJSON(w, http.StatusOK, res)
}

// ---- go test ----

type testResult struct {
	OK       bool        `json:"ok"`       // все тесты прошли, сборка успешна, гонок нет
	Build    bool        `json:"build"`    // компиляция удалась
	Race     bool        `json:"race"`     // детектор -race нашёл гонку данных
	Passed   int         `json:"passed"`   //
	Failed   int         `json:"failed"`   //
	Tests    []testEvent `json:"tests"`    // по тесту
	Output   string      `json:"output"`   // сырой вывод (ошибка сборки / отчёт о гонке)
	Duration string      `json:"duration"` //
}

type testEvent struct {
	Name   string `json:"name"`
	Pass   bool   `json:"pass"`
	Output string `json:"output"`
}

func runGoTest(dir, pkg string, race bool) testResult {
	// -race ощутимо медленнее и требует CGO, поэтому даём больше времени.
	timeout := 30 * time.Second
	args := []string{"test", "-json", "-count=1"}
	if race {
		args = append(args, "-race")
		timeout = 60 * time.Second
	}
	args = append(args, "./"+pkg+"/")

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	start := time.Now()
	cmd := exec.CommandContext(ctx, "go", args...)
	cmd.Dir = dir
	// GOFLAGS= — не тащим внешние теги; GOWORK=off — изолируем тест во временной
	// копии от go.work в корне репозитория (иначе модуль резолвится в настоящий
	// ./exercises и правки пользователя игнорируются).
	cmd.Env = append(os.Environ(), "GOFLAGS=", "GOWORK=off")
	out, _ := cmd.CombinedOutput()
	res := testResult{Duration: time.Since(start).Round(time.Millisecond).String()}

	// go test -json пишет поток JSON-событий, НО отчёт детектора гонок (-race) и
	// паники рантайма печатаются сырым текстом в stderr — они не валидный JSON.
	// Поэтому разбираем построчно: валидный JSON → событие, иначе → в extra
	// (там окажется «WARNING: DATA RACE», stack trace и т.п.), чтобы не потерять.
	events := map[string]*testEvent{}
	var order []string
	var pkgOut, extra strings.Builder
	for _, line := range bytes.Split(out, []byte("\n")) {
		if len(bytes.TrimSpace(line)) == 0 {
			continue
		}
		var ev struct {
			Action string `json:"Action"`
			Test   string `json:"Test"`
			Output string `json:"Output"`
		}
		if err := json.Unmarshal(line, &ev); err != nil {
			extra.Write(line)
			extra.WriteByte('\n')
			continue
		}
		if ev.Test == "" {
			if ev.Action == "output" {
				pkgOut.WriteString(ev.Output)
			}
			continue
		}
		te := events[ev.Test]
		if te == nil {
			te = &testEvent{Name: ev.Test}
			events[ev.Test] = te
			order = append(order, ev.Test)
		}
		switch ev.Action {
		case "output":
			te.Output += ev.Output
		case "pass":
			te.Pass = true
		case "fail":
			te.Pass = false
		}
	}

	// Отчёт детектора гонок -race приходит как per-test output ("WARNING: DATA
	// RACE"), поэтому ищем по всему сырому выводу, а не только в extra.
	dataRace := bytes.Contains(out, []byte("DATA RACE"))
	if len(order) == 0 {
		// Нет событий по тестам — пакет не собрался (или паника до тестов).
		res.Build = false
		res.Output = strings.TrimSpace(pkgOut.String() + "\n" + extra.String())
	} else {
		res.Build = true
		for _, name := range order {
			te := events[name]
			// показываем только верхнеуровневые тесты (без подтестов с '/')
			if strings.Contains(name, "/") {
				continue
			}
			res.Tests = append(res.Tests, *te)
			if te.Pass {
				res.Passed++
			} else {
				res.Failed++
			}
		}
		// в общий вывод добавляем сырой текст (отчёт о гонке / паника), если был
		res.Output = strings.TrimSpace(pkgOut.String() + "\n" + extra.String())
	}

	res.Race = dataRace
	res.OK = res.Build && res.Failed == 0 && res.Passed > 0 && !dataRace
	return res
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
