package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"
)

// useRealModule направляет обработчики на настоящий модуль exercises (тесты идут
// из cmd/runner, go.mod — двумя каталогами выше).
func useRealModule(t *testing.T) {
	t.Helper()
	root, err := findModuleRoot()
	if err != nil {
		t.Fatal(err)
	}
	old := moduleRoot
	t.Cleanup(func() { moduleRoot = old })
	moduleRoot = root
}

// useModule подменяет модуль крошечным: files — путь относительно корня → текст.
func useModule(t *testing.T, files map[string]string) {
	t.Helper()
	dir := t.TempDir()
	for name, body := range files {
		p := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	old := moduleRoot
	t.Cleanup(func() { moduleRoot = old })
	moduleRoot = dir
}

// get зовёт обработчик так, как это делает браузер: параметры — в строке запроса.
func get(t *testing.T, h http.HandlerFunc, path string, query map[string]string) (int, []byte) {
	t.Helper()
	q := url.Values{}
	for k, v := range query {
		q.Set(k, v)
	}
	req := httptest.NewRequest(http.MethodGet, path+"?"+q.Encode(), nil)
	rec := httptest.NewRecorder()
	h(rec, req)
	return rec.Code, rec.Body.Bytes()
}

type stubReply struct {
	Pkg   string `json:"pkg"`
	Code  string `json:"code"`
	Plain string `json:"plain"`
	Funcs []struct {
		Name       string   `json:"name"`
		Tests      []string `json:"tests"`
		Needs      []string `json:"needs"`
		Group      string   `json:"group"`
		GroupTests []string `json:"groupTests"`
		Hint       string   `json:"hint"`
		Recipe     string   `json:"recipe"`
	} `json:"funcs"`
}

func TestHandleStubSlidingWindow(t *testing.T) {
	useRealModule(t)
	code, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": "slidingwindow"})
	if code != http.StatusOK {
		t.Fatalf("код %d: %s", code, body)
	}
	var r stubReply
	if err := json.Unmarshal(body, &r); err != nil {
		t.Fatal(err)
	}
	if r.Pkg != "slidingwindow" {
		t.Errorf("pkg = %q", r.Pkg)
	}
	onDisk, err := os.ReadFile(filepath.Join(moduleRoot, "slidingwindow", "slidingwindow.go"))
	if err != nil {
		t.Fatal(err)
	}
	if r.Code != string(onDisk) {
		t.Errorf("code — это файл заготовки целиком, как и был")
	}
	if !strings.Contains(r.Code, "Ожидаемая сложность") || !strings.Contains(r.Code, "// TODO:") {
		t.Errorf("в code должны остаться подсказки и рецепты — это старый ответ")
	}
	if strings.Contains(r.Plain, "Ожидаемая сложность") || strings.Contains(r.Plain, "// TODO") {
		t.Errorf("в plain подсказок быть не должно:\n%s", r.Plain)
	}
	if !strings.Contains(r.Plain, `panic("TODO: реализуй MaxSumSubarray")`) {
		t.Errorf("в plain остаётся panic(\"TODO…\") — это и есть заготовка")
	}
	if len(r.Funcs) != 11 || r.Funcs[0].Name != "MaxSumSubarray" {
		t.Fatalf("funcs = %+v", r.Funcs)
	}
	first := r.Funcs[0]
	if !slices.Equal(first.Tests, []string{"TestMaxSumSubarray", "TestMaxSumSubarrayScales"}) {
		t.Errorf("tests первой функции = %v", first.Tests)
	}
	if first.Hint != "Ожидаемая сложность: O(n) по времени, O(1) по памяти." {
		t.Errorf("hint = %q", first.Hint)
	}
	if !strings.HasPrefix(first.Recipe, "реализуй инкрементальное окно:") {
		t.Errorf("recipe = %q", first.Recipe)
	}
}

// Тесты функции должны совпадать с тем, что реально есть в пакете: прогон по этому
// списку засчитывается, только если запустились все имена.
func TestHandleStubTestsExistInPackage(t *testing.T) {
	useRealModule(t)
	for _, pkg := range []string{"slidingwindow", "dp", "subsets", "bigo"} {
		code, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": pkg})
		if code != http.StatusOK {
			t.Fatalf("%s: код %d: %s", pkg, code, body)
		}
		var r stubReply
		if err := json.Unmarshal(body, &r); err != nil {
			t.Fatal(err)
		}
		existing := map[string]bool{}
		files, _ := filepath.Glob(filepath.Join(moduleRoot, pkg, "*_test.go"))
		for _, f := range files {
			src, err := os.ReadFile(f)
			if err != nil {
				t.Fatal(err)
			}
			for _, line := range strings.Split(string(src), "\n") {
				if rest, ok := strings.CutPrefix(line, "func Test"); ok {
					existing["Test"+rest[:strings.IndexAny(rest, "(")]] = true
				}
			}
		}
		for _, f := range r.Funcs {
			for _, name := range f.Tests {
				if !existing[name] {
					t.Errorf("%s.%s: теста %s в пакете нет", pkg, f.Name, name)
				}
			}
		}
	}
}

// У методов своих тестов по имени нет: список пуст, но это массив, а не null — виджет
// сравнивает длину, а не проверяет на null.
func TestHandleStubJSONShape(t *testing.T) {
	useRealModule(t)
	_, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": "bigo"})
	var raw struct {
		Funcs []map[string]json.RawMessage `json:"funcs"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		t.Fatal(err)
	}
	found := false
	for _, f := range raw.Funcs {
		var name string
		_ = json.Unmarshal(f["name"], &name)
		for _, key := range []string{"name", "tests", "needs", "group", "groupTests", "hint", "recipe"} {
			if _, ok := f[key]; !ok {
				t.Errorf("%s: нет поля %s", name, key)
			}
		}
		for _, key := range []string{"tests", "needs", "groupTests"} {
			if string(f[key]) == "null" {
				t.Errorf("%s: %s = null, нужен []", name, key)
			}
		}
		if name == "MinStack.Top" {
			found = true
			if string(f["tests"]) != "[]" {
				t.Errorf("MinStack.Top: tests = %s, ожидалось []", f["tests"])
			}
		}
	}
	if !found {
		t.Errorf("в funcs нет MinStack.Top")
	}

	// Пакет без упражнений — funcs и notes: [], не null.
	useModule(t, map[string]string{"go.mod": "module probe\n", "p/p.go": "package p\n\nfunc Ready() int { return 1 }\n"})
	_, body = get(t, handleStub, "/api/stub", map[string]string{"pkg": "p"})
	if !strings.Contains(string(body), `"funcs":[]`) || !strings.Contains(string(body), `"notes":[]`) {
		t.Errorf("ожидалось \"funcs\":[] и \"notes\":[]: %.300s", body)
	}
}

func TestHandleStubRejectsBadPackage(t *testing.T) {
	useRealModule(t)
	for _, pkg := range []string{"", "../x", "..", "/etc", "slidingwindow/..", "slidingwindow/", "Slidingwindow",
		"cmd/runner", "nope", "slidingwindow\x00", "slidingwindow.go"} {
		code, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": pkg})
		if code != http.StatusBadRequest {
			t.Errorf("pkg=%q: код %d, ожидался 400: %s", pkg, code, body)
		}
	}
}

// Тест делится между ВСЕМИ экспортированными функциями файла, не только упражнениями:
// TestFooBar принадлежит готовой FooBar, и Foo его не получает (иначе прогон по её
// «тестам» гонял бы чужой тест).
// Метод и конструктор запускаются типом: у MinStack.Top своих тестов нет, но есть группа
// с тестами типа; а тест функции, которому нужна соседняя, называет её в needs.
func TestHandleStubNeedsAndGroups(t *testing.T) {
	useRealModule(t)
	funcsOf := func(pkg string) map[string]struct {
		Tests, Needs, GroupTests []string
		Group                    string
	} {
		_, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": pkg})
		var r struct {
			Funcs []struct {
				Name       string   `json:"name"`
				Tests      []string `json:"tests"`
				Needs      []string `json:"needs"`
				Group      string   `json:"group"`
				GroupTests []string `json:"groupTests"`
			} `json:"funcs"`
		}
		if err := json.Unmarshal(body, &r); err != nil {
			t.Fatal(err)
		}
		out := map[string]struct {
			Tests, Needs, GroupTests []string
			Group                    string
		}{}
		for _, f := range r.Funcs {
			out[f.Name] = struct {
				Tests, Needs, GroupTests []string
				Group                    string
			}{f.Tests, f.Needs, f.GroupTests, f.Group}
		}
		return out
	}
	bfs := funcsOf("parallelbfs")["BFSLevelsConc"]
	if !slices.Equal(bfs.Needs, []string{"BFSLevelsSeq"}) || !slices.Equal(bfs.Tests, []string{"TestBFSLevelsConcMatchesSeq"}) {
		t.Errorf("BFSLevelsConc: %+v", bfs)
	}
	if seq := funcsOf("parallelbfs")["BFSLevelsSeq"]; len(seq.Needs) != 0 {
		t.Errorf("BFSLevelsSeq ничего не нужно: %+v", seq)
	}
	top := funcsOf("bigo")["MinStack.Top"]
	if top.Group != "MinStack" || len(top.Tests) != 0 || !slices.Contains(top.GroupTests, "TestMinStack") {
		t.Errorf("MinStack.Top: %+v", top)
	}
	ctor := funcsOf("lru")["Constructor"]
	if ctor.Group != "LRUCache" || len(ctor.GroupTests) < 5 {
		t.Errorf("lru.Constructor: %+v", ctor)
	}
}

func TestHandleStubTestsGoToLongestNameEvenOfReadyFunc(t *testing.T) {
	useModule(t, map[string]string{
		"go.mod": "module probe\n",
		"p/p.go": "//go:build !solution\n\npackage p\n\n" +
			"func Foo() int {\n\tpanic(\"TODO: реализуйте Foo\")\n}\n\nfunc FooBar() int { return 1 }\n",
		"p/p_test.go": "package p\n\nimport \"testing\"\n\n" +
			"func TestFoo(t *testing.T) {}\nfunc TestFooBar(t *testing.T) {}\n",
	})
	_, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": "p"})
	var r stubReply
	if err := json.Unmarshal(body, &r); err != nil {
		t.Fatal(err)
	}
	if len(r.Funcs) != 1 || !slices.Equal(r.Funcs[0].Tests, []string{"TestFoo"}) {
		t.Errorf("funcs = %+v, у Foo должен быть только TestFoo", r.Funcs)
	}
}

// bankLine — запись банка задач: пакет, функция и её тесты (поле t). У задачи на
// проектирование класса f — имя типа, и сверяются тесты типа (groupTests).
var bankLine = regexp.MustCompile(`^\s*\{ p: "([^"]+)", f: "([^"]+)",.* t: \[([^\]]*)\], x: `)

// Список тестов функции в ответе сервера и в банке задач — один и тот же: мок-интервью
// гоняет тесты по банку, виджет — по ответу сервера, и расхождение дало бы «не
// засчитан» там, где задача решена.
func TestHandleStubTestsMatchProblemBank(t *testing.T) {
	useRealModule(t)
	bank, err := os.ReadFile(filepath.Join(moduleRoot, "..", "assets", "problems.js"))
	if err != nil {
		t.Fatal(err)
	}
	checked := 0
	cache := map[string]map[string][]string{}
	for _, line := range strings.Split(string(bank), "\n") {
		m := bankLine.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		pkg, fn := m[1], m[2]
		var want []string
		for _, q := range strings.Split(m[3], ",") {
			if q = strings.Trim(strings.TrimSpace(q), `"`); q != "" {
				want = append(want, q)
			}
		}
		if _, ok := cache[pkg]; !ok {
			_, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": pkg})
			var r stubReply
			if err := json.Unmarshal(body, &r); err != nil {
				t.Fatalf("%s: %v: %s", pkg, err, body)
			}
			cache[pkg] = map[string][]string{}
			for _, f := range r.Funcs {
				cache[pkg][f.Name] = f.Tests
				if f.Group != "" {
					cache[pkg][f.Group] = f.GroupTests
				}
			}
		}
		got, ok := cache[pkg][fn]
		if !ok {
			t.Errorf("%s.%s: функции из банка нет в ответе /api/stub", pkg, fn)
			continue
		}
		if !slices.Equal(got, want) {
			t.Errorf("%s.%s: сервер отдаёт тесты %v, банк — %v", pkg, fn, got, want)
		}
		checked++
	}
	if checked < 150 {
		t.Errorf("сверено %d записей банка — разбор строк банка устарел?", checked)
	}
}

func TestHandleStubMissingStubFileIs404(t *testing.T) {
	useModule(t, map[string]string{"go.mod": "module probe\n", "empty/readme.txt": "x"})
	code, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": "empty"})
	if code != http.StatusNotFound {
		t.Errorf("код %d, ожидался 404: %s", code, body)
	}
}

// Файл заготовки правит читатель: недописанная функция на диске — обычное состояние.
// code отдаётся при любом содержимом, а если разобрать не вышло, виджет получает 200
// с plain = code, пустыми funcs и notes и причиной в warning — не 500, из-за которого он
// объявил бы runner мёртвым.
func TestHandleStubKeepsServingCodeWhenStubCannotBeParsed(t *testing.T) {
	const testFile = "package p\n\nimport \"testing\"\n\nfunc TestF(t *testing.T) {}\n"
	const goodStub = "package p\n\n// F — условие.\nfunc F() int {\n\tpanic(\"TODO: реализуйте F\")\n}\n"
	tests := []struct {
		name        string
		files       map[string]string
		wantWarning string
	}{
		{"заготовка не разбирается", map[string]string{"p/p.go": "package p\nfunc ("}, "разбор заготовки"},
		{"комментарий TODO после кода", map[string]string{"p/p.go": "package p\n\nfunc F() int {\n\treturn 0 // TODO: допишу\n}\n"}, "TODO после кода"},
		{"тестовый файл не разбирается", map[string]string{"p/p.go": goodStub, "p/p_test.go": "package p\nfunc ("}, "тесты пакета"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			files := map[string]string{"go.mod": "module probe\n"}
			for k, v := range tt.files {
				files[k] = v
			}
			if _, ok := files["p/p_test.go"]; !ok {
				files["p/p_test.go"] = testFile
			}
			useModule(t, files)
			code, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": "p"})
			if code != http.StatusOK {
				t.Fatalf("код %d, ожидался 200: %s", code, body)
			}
			var r struct {
				stubReply
				Notes   []map[string]string `json:"notes"`
				Warning string              `json:"warning"`
			}
			if err := json.Unmarshal(body, &r); err != nil {
				t.Fatal(err)
			}
			if r.Code != tt.files["p/p.go"] || r.Plain != r.Code {
				t.Errorf("code и plain должны быть файлом как есть: code=%q plain=%q", r.Code, r.Plain)
			}
			if r.Funcs == nil || len(r.Funcs) != 0 || r.Notes == nil || len(r.Notes) != 0 {
				t.Errorf("funcs и notes — пустые массивы, а не null: %s", body)
			}
			if !strings.Contains(r.Warning, tt.wantWarning) {
				t.Errorf("warning = %q, ожидалось упоминание %q", r.Warning, tt.wantWarning)
			}
		})
	}
}

func TestHandleStubWithoutProblemsHasNoWarning(t *testing.T) {
	useRealModule(t)
	_, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": "slidingwindow"})
	if strings.Contains(string(body), "warning") {
		t.Errorf("исправная заготовка отвечает без warning: %.200s", body)
	}
}

// Каталог cmd проходит проверку имени пакета, но заготовки в нём нет.
func TestHandleStubAndSolutionForDirectoryWithoutStubAre404(t *testing.T) {
	useRealModule(t)
	if code, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": "cmd"}); code != http.StatusNotFound {
		t.Errorf("/api/stub?pkg=cmd: код %d, ожидался 404: %s", code, body)
	}
	if code, body := get(t, handleSolution, "/api/solution", map[string]string{"pkg": "cmd", "func": "Main"}); code != http.StatusNotFound {
		t.Errorf("/api/solution?pkg=cmd: код %d, ожидался 404: %s", code, body)
	}
}

// Заготовку нельзя прочитать — это не «разбор заготовки», а ошибка сервера с тем, что случилось.
func TestHandleStubUnreadableStubIs500(t *testing.T) {
	useModule(t, map[string]string{"go.mod": "module probe\n", "d/d.go/keep": "x"}) // d.go — каталог
	code, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": "d"})
	if code != http.StatusInternalServerError || !strings.Contains(string(body), "чтение заготовки") {
		t.Errorf("код %d: %s", code, body)
	}
}

type solutionReply struct {
	Pkg   string `json:"pkg"`
	Func  string `json:"func"`
	Code  string `json:"code"`
	Error string `json:"error"`
}

func TestHandleSolution(t *testing.T) {
	useRealModule(t)
	code, body := get(t, handleSolution, "/api/solution", map[string]string{"pkg": "slidingwindow", "func": "MaxSumSubarray"})
	if code != http.StatusOK {
		t.Fatalf("код %d: %s", code, body)
	}
	var r solutionReply
	if err := json.Unmarshal(body, &r); err != nil {
		t.Fatal(err)
	}
	if r.Pkg != "slidingwindow" || r.Func != "MaxSumSubarray" {
		t.Errorf("ответ = %+v", r)
	}
	if !strings.HasPrefix(r.Code, "func MaxSumSubarray(arr []int, k int) int {") {
		t.Errorf("code должен начинаться с объявления функции:\n%s", r.Code)
	}
	if strings.Contains(r.Code, "//go:build") || strings.Contains(r.Code, "LongestSubstringKDistinct") {
		t.Errorf("в code только одна функция, без тега сборки:\n%s", r.Code)
	}
}

func TestHandleSolutionMethodComesWithItsType(t *testing.T) {
	useRealModule(t)
	code, body := get(t, handleSolution, "/api/solution", map[string]string{"pkg": "bigo", "func": "MinStack.Top"})
	if code != http.StatusOK {
		t.Fatalf("код %d: %s", code, body)
	}
	var r solutionReply
	if err := json.Unmarshal(body, &r); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(r.Code, "type MinStack struct") || !strings.Contains(r.Code, ") Top() int") {
		t.Errorf("метод без своего типа не читается:\n%s", r.Code)
	}
}

// Имя типа — задача на проектирование класса из банка: эталон всего типа, а не одного метода.
func TestHandleSolutionWholeType(t *testing.T) {
	useRealModule(t)
	code, body := get(t, handleSolution, "/api/solution", map[string]string{"pkg": "bigo", "func": "MinStack"})
	if code != http.StatusOK {
		t.Fatalf("код %d: %s", code, body)
	}
	var r solutionReply
	if err := json.Unmarshal(body, &r); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"type MinStack struct", "func NewMinStack()", ") Push(val int)", ") Pop()", ") Top() int", ") GetMin() int"} {
		if !strings.Contains(r.Code, want) {
			t.Errorf("нет %q:\n%s", want, r.Code)
		}
	}
	if strings.Contains(r.Code, "func NextGreaterElement") {
		t.Errorf("в эталоне типа чужая функция:\n%s", r.Code)
	}
}

func TestHandleSolutionUnknownFunc(t *testing.T) {
	useRealModule(t)
	code, body := get(t, handleSolution, "/api/solution", map[string]string{"pkg": "slidingwindow", "func": "Nope"})
	if code != http.StatusNotFound {
		t.Fatalf("код %d, ожидался 404: %s", code, body)
	}
	var r solutionReply
	if err := json.Unmarshal(body, &r); err != nil || r.Error == "" {
		t.Errorf("404 несёт {error}: %s (%v)", body, err)
	}
}

// Маршрут — не чтение файлов: имя пакета и имя функции проверяются до того, как
// что-либо открывается.
func TestHandleSolutionRejectsBadInput(t *testing.T) {
	useRealModule(t)
	tests := []struct{ pkg, fn string }{
		{"../x", "MaxSumSubarray"},
		{"", "MaxSumSubarray"},
		{"/etc", "MaxSumSubarray"},
		{"slidingwindow/..", "MaxSumSubarray"},
		{"slidingwindow", ""},
		{"slidingwindow", "../../../etc/passwd"},
		{"slidingwindow", "/etc/passwd"},
		{"slidingwindow", "..%2f..%2fgo.mod"},
		{"slidingwindow", "MaxSumSubarray."},
		{"slidingwindow", ".MaxSumSubarray"},
		{"slidingwindow", "A.B.C"},
		{"slidingwindow", "A..B"},
		{"slidingwindow", "Max Sum"},
		{"slidingwindow", "MaxSumSubarray\n"},
		{"slidingwindow", "MaxSumSubarray/../slidingwindow_test"},
		{"slidingwindow", "Max-Sum"},
	}
	for _, tt := range tests {
		code, body := get(t, handleSolution, "/api/solution", map[string]string{"pkg": tt.pkg, "func": tt.fn})
		if code != http.StatusBadRequest {
			t.Errorf("pkg=%q func=%q: код %d, ожидался 400: %s", tt.pkg, tt.fn, code, body)
		}
	}
}

// Эталон отдаётся только для функции, объявленной и в заготовке, и в эталоне: вспомогательные
// функции эталона — не то, что просят написать. Готовая функция, которая есть в обоих
// файлах, и уже решённая читателем на диске — отдаются (кнопка «сдаюсь» не должна исчезать).
func TestHandleSolutionWhitelist(t *testing.T) {
	useModule(t, map[string]string{
		"go.mod": "module probe\n",
		"p/p.go": "//go:build !solution\n\npackage p\n\n" +
			"func Task() int { return 42 }\n\nfunc Ready() int { return 1 }\n\nfunc ReaderOnly() int { return 0 }\n",
		"p/p_solution.go": "//go:build solution\n\npackage p\n\n" +
			"func Task() int { return helper() }\n\nfunc helper() int { return 2 }\n\nfunc Ready() int { return 1 }\n\nfunc Extra() int { return 3 }\n",
		"q/q.go":          "//go:build !solution\n\npackage q\n\nfunc Task() int {\n\tpanic(\"TODO: реализуйте Task\")\n}\n",
		"r/r.go":          "package r\n\nfunc Task() int {\n\treturn 1 +\n}\n", // недописана на диске
		"r/r_solution.go": "package r\n\nfunc Task() int { return 7 }\n",
	})
	solution := func(pkg, fn string) (int, string) {
		code, body := get(t, handleSolution, "/api/solution", map[string]string{"pkg": pkg, "func": fn})
		return code, string(body)
	}
	if code, body := solution("p", "Task"); code != http.StatusOK || !strings.Contains(body, "func helper()") {
		t.Errorf("Task (решена на диске): код %d, вспомогательная функция должна прийти вместе с ней: %s", code, body)
	}
	if code, body := solution("p", "Ready"); code != http.StatusOK {
		t.Errorf("Ready есть в обоих файлах: код %d: %s", code, body)
	}
	for _, fn := range []string{"Extra", "helper", "ReaderOnly", "Missing", "task", "Task.Method"} {
		if code, body := solution("p", fn); code != http.StatusNotFound {
			t.Errorf("%s: код %d, ожидался 404: %s", fn, code, body)
		}
	}
	// У пакета нет файла эталона — это «нет», а не ошибка сервера.
	if code, body := solution("q", "Task"); code != http.StatusNotFound {
		t.Errorf("пакет без эталона: код %d, ожидался 404: %s", code, body)
	}
	// Заготовка на диске не разбирается — имена читаются по тому, что разобралось.
	if code, body := solution("r", "Task"); code != http.StatusOK {
		t.Errorf("недописанная заготовка: код %d, ожидался 200: %s", code, body)
	}
}

// codereview и profiling: заготовка — рабочий код с изъяном, panic("TODO") в ней нет,
// но упражнения и эталоны у них есть.
func TestHandleStubPackagesWithoutTODOStillHaveExercises(t *testing.T) {
	useRealModule(t)
	for pkg, want := range map[string]string{"codereview": "HasDuplicate", "profiling": "FormatScores"} {
		_, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": pkg})
		var r stubReply
		if err := json.Unmarshal(body, &r); err != nil {
			t.Fatal(err)
		}
		found := false
		for _, f := range r.Funcs {
			found = found || f.Name == want
		}
		if !found {
			t.Errorf("%s: в funcs нет %s: %.300s", pkg, want, body)
		}
		if code, body := get(t, handleSolution, "/api/solution", map[string]string{"pkg": pkg, "func": want}); code != http.StatusOK {
			t.Errorf("%s.%s: код %d: %s", pkg, want, code, body)
		}
	}
}

// Всё, что убрано из plain и не попало в hint или recipe, — в notes; в теле типа
// остаётся нейтральная метка.
func TestHandleStubNotesAndTypeLabel(t *testing.T) {
	useRealModule(t)
	_, body := get(t, handleStub, "/api/stub", map[string]string{"pkg": "bigo"})
	var r struct {
		stubReply
		Notes []struct{ At, Text string } `json:"notes"`
	}
	if err := json.Unmarshal(body, &r); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(r.Plain, "type MinStack struct {\n\t// TODO: поля\n}") {
		t.Errorf("в теле типа должна остаться метка:\n%s", r.Plain)
	}
	if strings.Contains(r.Plain, "основной стек") {
		t.Errorf("подсказка из тела типа не должна оставаться в plain")
	}
	found := false
	for _, n := range r.Notes {
		found = found || (n.At == "type MinStack" && strings.Contains(n.Text, "основной стек и стек минимумов"))
	}
	if !found {
		t.Errorf("в notes нет текста блока TODO типа MinStack: %+v", r.Notes)
	}

	_, body = get(t, handleStub, "/api/stub", map[string]string{"pkg": "probabilistic"})
	r.Notes = nil
	if err := json.Unmarshal(body, &r); err != nil {
		t.Fatal(err)
	}
	if len(r.Notes) == 0 || r.Notes[0].At != "package" || !strings.HasPrefix(r.Notes[0].Text, "Подсказка: k позиций") {
		t.Errorf("подсказка пакета probabilistic должна быть в notes: %+v", r.Notes)
	}
}
