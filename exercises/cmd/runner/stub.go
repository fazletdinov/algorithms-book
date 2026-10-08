package main

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"slices"

	"github.com/fazletdinov/algorithms-book/exercises/cmd/internal/stubdoc"
)

// funcName — имя упражнения в запросе: идентификатор Go либо «Тип.Метод». Строгое на
// всякий случай: имя идёт в разбор исходника, и ни путей, ни пробелов в нём быть не
// должно. Регистр не проверяется — неэкспортированные упражнения (dispatch… в
// miniredis) такие же; что имя есть среди функций заготовки, проверяет handleSolution.
var funcName = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$`)

// stubFunc — упражнение заготовки в ответе /api/stub.
type stubFunc struct {
	Name   string   `json:"name"`
	Tests  []string `json:"tests"` // тесты именно этой функции; нет своих — []
	Hint   string   `json:"hint"`
	Recipe string   `json:"recipe"`
}

// stubNote — убранный из plain текст, которого нет ни в hint, ни в recipe упражнений.
type stubNote struct {
	At   string `json:"at"` // «package», «type Имя» или «func Имя»
	Text string `json:"text"`
}

// stubResponse — ответ /api/stub. Code — заготовка как в репозитории (старый
// ответ, с подсказками); Plain — она же без подсказок и рецептов. Warning — почему
// Plain, Funcs и Notes пусты: заготовка на диске недописана или не разбирается, а Code
// отдаётся всегда.
type stubResponse struct {
	Pkg     string     `json:"pkg"`
	Code    string     `json:"code"`
	Plain   string     `json:"plain"`
	Funcs   []stubFunc `json:"funcs"`
	Notes   []stubNote `json:"notes"`
	Warning string     `json:"warning,omitempty"`
}

// handleStub отдаёт файл-заготовку <pkg>/<pkg>.go как стартовый код, его вариант без
// подсказок и список упражнений с их тестами. Файл правит читатель, и недописанная
// функция на диске — обычное состояние: код отдаётся при любом его содержимом, а если
// разобрать не удалось, plain = code, funcs и notes пусты и в warning стоит причина.
func handleStub(w http.ResponseWriter, r *http.Request) {
	pkg := r.URL.Query().Get("pkg")
	dir, ok := validPkg(pkg)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "неизвестный пакет"})
		return
	}
	code, err := os.ReadFile(filepath.Join(dir, pkg+".go"))
	if errors.Is(err, os.ErrNotExist) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "заготовка не найдена"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "чтение заготовки: " + err.Error()})
		return
	}
	resp, err := describeStub(dir, pkg, code)
	if err != nil {
		resp = stubResponse{Pkg: pkg, Code: string(code), Plain: string(code), Funcs: []stubFunc{}, Notes: []stubNote{}, Warning: err.Error()}
	}
	writeJSON(w, http.StatusOK, resp)
}

func describeStub(dir, pkg string, code []byte) (stubResponse, error) {
	// Эталон нужен только чтобы найти упражнения без panic("TODO") (codereview,
	// profiling); нет его — упражнения только с panic("TODO").
	solution, _ := os.ReadFile(filepath.Join(dir, pkg+"_solution.go"))
	funcs, err := stubdoc.Exercises(code, solution)
	if err != nil {
		return stubResponse{}, fmt.Errorf("разбор заготовки: %w", err)
	}
	plain, err := stubdoc.Plain(code)
	if err != nil {
		return stubResponse{}, fmt.Errorf("заготовка без подсказок: %w", err)
	}
	notes, err := stubdoc.Notes(code, funcs)
	if err != nil {
		return stubResponse{}, fmt.Errorf("заготовка без подсказок: %w", err)
	}
	// Тесты делятся между ВСЕМИ экспортированными функциями файла, а не только
	// упражнениями: так же их делит банк задач, и список функции совпадает с банком.
	topLevel, err := stubdoc.TopLevelFuncs(code)
	if err != nil {
		return stubResponse{}, fmt.Errorf("разбор заготовки: %w", err)
	}
	testsOf, err := stubdoc.AssignTests(dir, topLevel)
	if err != nil {
		return stubResponse{}, fmt.Errorf("тесты пакета: %w", err)
	}
	resp := stubResponse{Pkg: pkg, Code: string(code), Plain: string(plain), Funcs: stubFuncs(funcs, testsOf), Notes: make([]stubNote, 0, len(notes))}
	for _, n := range notes {
		resp.Notes = append(resp.Notes, stubNote{At: n.At, Text: n.Text})
	}
	return resp, nil
}

// stubFuncs собирает ответ: у каждой функции — её тесты, у остальных — пустой
// массив, а не null (виджет сравнивает длину).
func stubFuncs(funcs []stubdoc.Func, testsOf map[string][]string) []stubFunc {
	out := make([]stubFunc, 0, len(funcs))
	for _, f := range funcs {
		tests := testsOf[f.Name] // методы сюда не попадают: «Тип.Метод» ни один тест не назовёт
		if tests == nil {
			tests = []string{}
		}
		out = append(out, stubFunc{Name: f.Name, Tests: tests, Hint: f.Hint, Recipe: f.Recipe})
	}
	return out
}

// handleSolution отдаёт эталон ОДНОЙ функции: её объявление и то, без чего оно не
// читается (см. stubdoc.Solution), — не файл <pkg>_solution.go. Спрашивать можно
// только функцию, объявленную и в заготовке, и в эталоне. Это не защита файловой
// системы (Solution и так берёт объявления только из <pkg>_solution.go), а граница
// смысла: готовые вспомогательные функции эталона — не то, что просят написать.
// Заготовка на диске может быть недописана — имена читаются по тому, что разобралось.
func handleSolution(w http.ResponseWriter, r *http.Request) {
	pkg := r.URL.Query().Get("pkg")
	dir, ok := validPkg(pkg)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "неизвестный пакет"})
		return
	}
	fn := r.URL.Query().Get("func")
	if !funcName.MatchString(fn) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "недопустимое имя функции"})
		return
	}
	notFound := func() {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "эталона этой функции нет"})
	}
	stub, err := os.ReadFile(filepath.Join(dir, pkg+".go"))
	if errors.Is(err, os.ErrNotExist) {
		notFound()
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "чтение заготовки: " + err.Error()})
		return
	}
	if !slices.Contains(stubdoc.Declared(stub), fn) {
		notFound()
		return
	}
	solution, err := os.ReadFile(filepath.Join(dir, pkg+"_solution.go"))
	if errors.Is(err, os.ErrNotExist) {
		notFound()
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "чтение эталона: " + err.Error()})
		return
	}
	code, err := stubdoc.Solution(solution, fn)
	switch {
	case errors.Is(err, stubdoc.ErrNotFound):
		notFound()
	case err != nil:
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "разбор эталона: " + err.Error()})
	default:
		writeJSON(w, http.StatusOK, map[string]string{"pkg": pkg, "func": fn, "code": code})
	}
}
