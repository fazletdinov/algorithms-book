// Command tracescan — разведка: какие функции тренажёра ПРИГОДНЫ для
// «🎞 Визуализировать», но ещё не подключены в traceTargets (cmd/runner/trace.go).
//
//	cd exercises && go run ./cmd/tracescan            # только неподключённые кандидаты
//	cd exercises && go run ./cmd/tracescan -all       # все функции с вердиктом
//
// Пригодность = функция экспортирована, ровно одно возвращаемое значение (или
// ни одного — тогда она попадает в traceVoidFuncs) и её форма проходит
// traceinstr.Instrument (циклы/if любой вложенности; горутины, замыкания,
// рекурсия и циклы внутри switch/select — не проходят). Проверяется на ЭТАЛОНЕ
// (<pkg>/<pkg>_solution.go), а не на заготовке: в заготовке тело — panic("TODO"),
// там нет ни одного цикла, и Instrument закономерно отвергает вообще всё. Эталон
// же показывает ту форму, к которой придёт читатель.
package main

import (
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/fazletdinov/algorithms-book/exercises/cmd/runner/traceinstr"
)

func main() {
	all := flag.Bool("all", false, "показывать и непригодные функции с причиной")
	root := flag.String("root", ".", "корень модуля exercises")
	flag.Parse()

	wired, err := parseWired(filepath.Join(*root, "cmd", "runner", "trace.go"))
	if err != nil {
		fmt.Fprintln(os.Stderr, "не разобрал traceTargets:", err)
		os.Exit(1)
	}

	entries, err := os.ReadDir(*root)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	var pkgs []string
	for _, e := range entries {
		if e.IsDir() && e.Name() != "cmd" && !strings.HasPrefix(e.Name(), ".") {
			pkgs = append(pkgs, e.Name())
		}
	}
	sort.Strings(pkgs)

	var candidates, already int
	for _, pkg := range pkgs {
		src, err := os.ReadFile(filepath.Join(*root, pkg, pkg+"_solution.go"))
		if err != nil {
			// пакеты «другого типа» (codereview, profiling) держат рабочий код
			// прямо в файле-заготовке — у них эталон не показателен
			src, err = os.ReadFile(filepath.Join(*root, pkg, pkg+".go"))
			if err != nil {
				continue
			}
		}
		var lines []string
		for _, fn := range topLevelFuncs(src) {
			if !ast.IsExported(fn.name) || fn.results > 1 || fn.recv {
				continue
			}
			if _, err := traceinstr.Instrument(src, fn.name); err != nil {
				if *all {
					lines = append(lines, fmt.Sprintf("    ✗ %-28s %v", fn.name, err))
				}
				continue
			}
			mark := "✓"
			if wired[pkg][fn.name] {
				mark, already = "·", already+1
				if !*all {
					continue
				}
			} else {
				candidates++
			}
			void := ""
			if fn.results == 0 {
				void = "  (без возврата — нужен traceVoidFuncs)"
			}
			lines = append(lines, fmt.Sprintf("    %s %-28s%s", mark, fn.name, void))
		}
		if len(lines) > 0 {
			fmt.Printf("%s:\n%s\n", pkg, strings.Join(lines, "\n"))
		}
	}
	fmt.Printf("\nитого: %d пригодных и НЕ подключённых, %d уже в traceTargets\n", candidates, already)
}

type fnInfo struct {
	name    string
	results int
	recv    bool
}

func topLevelFuncs(src []byte) []fnInfo {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, "src.go", src, parser.SkipObjectResolution)
	if err != nil {
		return nil
	}
	var out []fnInfo
	for _, d := range file.Decls {
		fn, ok := d.(*ast.FuncDecl)
		if !ok {
			continue
		}
		info := fnInfo{name: fn.Name.Name, recv: fn.Recv != nil}
		if fn.Type.Results != nil {
			for _, f := range fn.Type.Results.List {
				info.results += max(len(f.Names), 1)
			}
		}
		out = append(out, info)
	}
	return out
}

// parseWired достаёт из trace.go текущий состав traceTargets — чтобы разведчик
// показывал именно то, чего ещё нет.
func parseWired(path string) (map[string]map[string]bool, error) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, path, nil, parser.SkipObjectResolution)
	if err != nil {
		return nil, err
	}
	out := map[string]map[string]bool{}
	ast.Inspect(file, func(n ast.Node) bool {
		vs, ok := n.(*ast.ValueSpec)
		if !ok || len(vs.Names) == 0 || vs.Names[0].Name != "traceTargets" || len(vs.Values) == 0 {
			return true
		}
		lit, ok := vs.Values[0].(*ast.CompositeLit)
		if !ok {
			return false
		}
		for _, elt := range lit.Elts {
			kv, ok := elt.(*ast.KeyValueExpr)
			if !ok {
				continue
			}
			pkg := strings.Trim(exprString(kv.Key), `"`)
			out[pkg] = map[string]bool{}
			if fns, ok := kv.Value.(*ast.CompositeLit); ok {
				for _, f := range fns.Elts {
					out[pkg][strings.Trim(exprString(f), `"`)] = true
				}
			}
		}
		return false
	})
	return out, nil
}

func exprString(e ast.Expr) string {
	if lit, ok := e.(*ast.BasicLit); ok {
		return lit.Value
	}
	return ""
}
