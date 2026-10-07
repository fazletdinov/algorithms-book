package main

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"

	"github.com/fazletdinov/algorithms-book/exercises/cmd/internal/stubdoc"
)

// funcName — имя упражнения в запросе: «Sum» или «Тип.Метод», обе части
// экспортированные. Строгое на всякий случай: имя идёт в разбор исходника, и ни
// пути, ни пробелов, ни регистра «никто не просил» в нём быть не должно.
var funcName = regexp.MustCompile(`^[A-Z][A-Za-z0-9_]*(\.[A-Z][A-Za-z0-9_]*)?$`)

// stubFunc — упражнение заготовки в ответе /api/stub.
type stubFunc struct {
	Name   string   `json:"name"`
	Tests  []string `json:"tests"` // тесты именно этой функции; у метода и у функции без своих тестов — []
	Hint   string   `json:"hint"`
	Recipe string   `json:"recipe"`
}

// stubResponse — ответ /api/stub. Code — заготовка как в репозитории (старый
// ответ, с подсказками); Plain — она же без подсказок и рецептов.
type stubResponse struct {
	Pkg   string     `json:"pkg"`
	Code  string     `json:"code"`
	Plain string     `json:"plain"`
	Funcs []stubFunc `json:"funcs"`
}

// handleStub отдаёт файл-заготовку <pkg>/<pkg>.go как стартовый код, его вариант без
// подсказок и список упражнений с их тестами.
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
	resp, err := describeStub(dir, pkg, code)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func describeStub(dir, pkg string, code []byte) (stubResponse, error) {
	funcs, err := stubdoc.Funcs(code)
	if err != nil {
		return stubResponse{}, fmt.Errorf("разбор заготовки: %w", err)
	}
	plain, err := stubdoc.Plain(code)
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
	return stubResponse{Pkg: pkg, Code: string(code), Plain: string(plain), Funcs: stubFuncs(funcs, testsOf)}, nil
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

// handleSolution отдаёт эталон ОДНОЙ функции заготовки: её объявление и то, без чего
// оно не читается (см. stubdoc.Solution) — не файл <pkg>_solution.go. Спрашивать
// можно только то, что заготовка просит написать: имя сверяется со списком её
// упражнений, поэтому маршрут не читает ничего, кроме эталонов этих функций.
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
	var funcs []stubdoc.Func
	if err == nil {
		funcs, err = stubdoc.Funcs(stub)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "разбор заготовки: " + err.Error()})
		return
	}
	known := false
	for _, f := range funcs {
		known = known || f.Name == fn
	}
	if !known {
		notFound()
		return
	}
	solution, err := os.ReadFile(filepath.Join(dir, pkg+"_solution.go"))
	if errors.Is(err, os.ErrNotExist) {
		notFound()
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
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
