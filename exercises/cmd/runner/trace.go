// Трассировка кода читателя: инструментирует ВЫБРАННУЮ читателем функцию
// (см. traceinstr), прогоняет её один раз на курируемом примере из
// data-trace-calls и возвращает пошаговый снимок переменных — не канонический
// пример, а РЕАЛЬНОЕ выполнение кода читателя.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"text/template"
	"time"

	"github.com/fazletdinov/algorithms-book/exercises/cmd/runner/traceinstr"
)

// moduleImportPath должен совпадать со строкой module в exercises/go.mod —
// нужен, чтобы харнесс мог импортировать инструментированный пакет.
const moduleImportPath = "github.com/fazletdinov/algorithms-book/exercises"

// traceTargets — пакеты с включённой визуализацией и список функций,
// разрешённых к трассировке в каждом (реестр на бэкенде — клиент не может
// трассировать произвольную функцию, только из этого списка). Читатель
// выбирает функцию сам в выпадающем списке (см. data-trace-calls в главе),
// потому что в одном файле пакета обычно несколько заготовок. ВАЖНО: харнесс
// (renderHarness) ожидает функцию с ОДНИМ возвращаемым значением —
// `result := <вызов>` не скомпилируется для multi-return; функции без
// возврата (мутируют аргумент на месте) — см. traceVoidFuncs ниже.
var traceTargets = map[string][]string{
	"slidingwindow": {
		"MaxSumSubarray",
		"LongestSubstringKDistinct",
		"SmallestSubarrayWithSum",
		"LongestSubstringNoRepeat",
		"MaxSlidingWindow",
	},
	"cyclicsort": {
		"CyclicSort",
		"FindMissingNumber",
		"FindAllMissingNumbers",
		"FindDuplicate",
		"FindAllDuplicates",
	},
	"prefixsum": {
		"RangeSums",
		"CountSubarraysWithSum",
		"LongestBalanced",
		"CountDivisibleSubarrays",
		"MaxSubarraySum",
		"ProductExceptSelf",
		"ApplyRangeAdds",
		"MatrixRegionSums",
	},
	"stack": {
		"IsValidBrackets",
		"DecodeString",
		"NextGreaterCircular",
		"StockSpans",
		"LargestRectangle",
		"SumSubarrayMins",
		"RemoveKDigits",
	},
	"twopointers": {
		"PairWithTargetSum",
		"RemoveDuplicates",
		"SortedSquares",
		"TripletsSumToZero",
		"DutchFlagSort",
	},
	"linkedlist": {
		"ReverseList",
		"ReverseSublist",
		"ReverseKGroup",
		"IsPalindrome",
	},
	"listcrud": {
		"InsertAt",
		"Search",
		"DeleteVal",
	},
	"treebfs": {
		"LevelOrder",
		"ZigzagLevelOrder",
		"RightSideView",
		"LevelAverages",
		"MinDepth",
	},
	"sparsetable": {
		"NewSparse",
	},
	"binarysearch": {
		"Search",
		"FindCeiling",
		"FindFloor",
		"SearchRotated",
		"IntSqrt",
	},
	"dp": {
		"ClimbStairs",
		"CoinChange",
		"LongestCommonSubsequence",
		"EditDistance",
		"LongestIncreasingSubsequence",
		"Knapsack01",
		"HouseRobber",
		"UniquePaths",
		"WordBreak",
	},
	"bits": {
		"SingleNumber",
		"HammingWeight",
		"MissingNumber",
		"CountBits",
		"TwoSingleNumbers",
	},
	"strmatch": {
		"KMPSearch",
		"RabinKarp",
		"CountOccurrences",
		"ZSearch",
	},
	"sorting": {
		"HeapSort",
		"CountingSort",
		"QuickSelect",
	},
	"topk": {
		"FindKLargest",
		"KthLargest",
		"KClosestPoints",
		"KClosestNumbers",
	},
	"intervals": {
		"InsertInterval",
		"IntervalsIntersection",
		"MinMeetingRooms",
	},
	"bigo": {
		"NextGreaterElement",
		"DailyTemperatures",
		"CountCopies",
	},
	"toposort": {
		"TopologicalSort",
		"FindOrderLexSmallest",
		"AlienOrder",
	},
	"numbertheory": {
		"GCD",
		"IsPrime",
		"SieveOfEratosthenes",
		"PowMod",
	},
	"fastslow": {
		"HasCycle",
		"DetectCycle",
		"CycleLength",
		"MiddleNode",
	},
	"graphs": {
		"BFSOrder",
		"ShortestPathUnweighted",
		"IsBipartite",
	},
	"grids": {
		"RottingOranges",
		"ShortestPathInBinaryMatrix",
	},
	"dijkstra": {
		"ShortestPath",
		"ShortestPathsFrom",
		"NetworkDelayTime",
	},
	"bellmanford": {
		"HasNegativeCycle",
		"ShortestPathWithAtMostKEdges",
	},
	"astar": {
		"PathExists",
	},
	"mst": {
		"MSTWeightPrim",
	},
	"maxflow": {
		"MaxFlow",
	},
	"greedy": {
		"CanJump",
		"MinJumps",
		"MaxProfit",
	},
	"kwaymerge": {
		"MergeKSortedArrays",
		"KthSmallestInSortedArrays",
		"SmallestRange",
		"KthSmallestInMatrix",
	},
	"combinatorics": {
		"Binomial",
		"Permutations",
		"CountDivisibleByAny",
		"Derangements",
	},
	"cryptography": {
		"ModExp",
		"IsProbablePrime",
	},
	"sampling": {
		"Shuffle",
		"ReservoirSample",
		"BirthdayThreshold",
	},
	"binheap": {
		"BuildHeap",
	},
	"fenwick": {
		"NewFenwick",
		"CountInversions",
		"CountSmallerToRight",
	},
	"segtree": {
		"NewSegmentTree",
		"NewMinSegmentTree",
	},
	"consistenthash": {
		"JumpHash", // цепочка «прыжков» по номерам корзин — её и надо видеть по шагам
	},
	"npcomplete": {
		"VerifySubsetSum",
		"VertexCoverGreedy2Approx",
	},
	"wordladder": {
		"LadderLength",
	},
	"parallelbfs": {
		"BFSLevelsSeq",
	},
	"parallelsearch": {
		"CountOccurrencesSeq",
	},
	"wordcount": {
		"FreqSeq",
	},
	"codereview": {
		"HasDuplicate",
	},
}

// Намеренно НЕ подключены, хотя инструментацию проходят (см. cmd/tracescan):
// dsu.NewUnionFind — тривиальный init-цикл, смотреть нечего; miniredis.SaveSnapshot
// — пишет файл на диск, трассировке тут делать нечего; profiling.FormatScores —
// её глава как раз про то, что по шагам проблему НЕ видно, надо профилировать
// (и на 1000 элементах трасса была бы неподъёмной).

// traceVoidFuncs — функции без возвращаемого значения (мутируют аргумент на
// месте, например сортировка в массиве): харнесс вызывает их отдельным
// оператором, а не `result := ...`, и печатает "null" вместо результата —
// итоговое состояние всё равно видно по последнему шагу трассы (переменная-аргумент).
var traceVoidFuncs = map[string]bool{
	"CyclicSort":    true,
	"DutchFlagSort": true,
	"HeapSort":      true,
	"Shuffle":       true,
}

func isTraceTarget(pkg, fn string) bool {
	return slices.Contains(traceTargets[pkg], fn)
}

type traceRequest struct {
	Pkg  string `json:"pkg"`
	Code string `json:"code"`
	Func string `json:"func"` // например: MaxSumSubarray — какую функцию файла трассировать
	Call string `json:"call"` // например: MaxSumSubarray([]int{2, 3, 5, 1, 8, 2, 6, 4}, 3)
}

type traceStep struct {
	Step int            `json:"step"`
	Line int            `json:"line"`
	Tag  string         `json:"tag"`
	Vars map[string]any `json:"vars"`
}

type traceResponse struct {
	OK          bool        `json:"ok"`
	Unsupported bool        `json:"unsupported,omitempty"`
	Build       bool        `json:"build,omitempty"`
	Timeout     bool        `json:"timeout,omitempty"`
	Panic       bool        `json:"panic,omitempty"`
	Reason      string      `json:"reason,omitempty"`
	Message     string      `json:"message,omitempty"`
	Output      string      `json:"output,omitempty"`
	Func        string      `json:"func,omitempty"`
	Call        string      `json:"call,omitempty"`
	Result      string      `json:"result,omitempty"`
	Steps       []traceStep `json:"steps"`
	Duration    string      `json:"duration,omitempty"`
	// Source — код читателя ПОСЛЕ stripBuildTag, то есть буквально то, что
	// парсил traceinstr.Instrument. Строки в steps[].line нумеруются именно
	// по этому тексту, не по исходному req.Code (там на 2 строки больше из-за
	// //go:build) — поэтому фронтенд подсвечивает строку в Source, а не в
	// содержимом редактора.
	Source string `json:"source,omitempty"`
}

// handleTrace копирует модуль во временный каталог (как handleRun),
// инструментирует функцию читателя, генерирует харнесс, вызывающий её на
// примере из data-trace-call, и прогоняет его.
func handleTrace(w http.ResponseWriter, r *http.Request) {
	var req traceRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "плохой JSON"})
		return
	}
	if _, ok := validPkg(req.Pkg); !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "неизвестный пакет"})
		return
	}
	if !isTraceTarget(req.Pkg, req.Func) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "эта функция не подключена для визуализации"})
		return
	}
	funcName := req.Func

	// Строки в трассе нумеруются по ЭТОМУ тексту (что парсит Instrument), а не
	// по req.Code — тот ещё содержит //go:build читателя. Source в ответе
	// всегда возвращает stripped, чтобы фронтенд подсвечивал верную строку.
	stripped := stripBuildTag(req.Code)

	qualifiedCall, err := qualifyTraceCall(req.Call, req.Pkg, funcName)
	if err != nil {
		writeJSON(w, http.StatusOK, traceResponse{
			Unsupported: true,
			Reason:      "не удалось разобрать пример вызова: " + err.Error(),
			Steps:       []traceStep{},
			Source:      stripped,
		})
		return
	}

	instrumented, err := traceinstr.Instrument([]byte(stripped), funcName)
	if err != nil {
		writeJSON(w, http.StatusOK, traceResponse{Unsupported: true, Reason: err.Error(), Steps: []traceStep{}, Source: stripped})
		return
	}

	tmp, err := os.MkdirTemp("", "algotracer-")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer os.RemoveAll(tmp)

	if err := copyModule(moduleRoot, tmp); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "копирование модуля: " + err.Error()})
		return
	}

	pkgDir := filepath.Join(tmp, req.Pkg)
	if err := os.WriteFile(filepath.Join(pkgDir, req.Pkg+".go"), instrumented, 0o644); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if err := os.WriteFile(filepath.Join(pkgDir, req.Pkg+"_trace_helper.go"), traceinstr.TraceHelperSource(req.Pkg), 0o644); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	_ = os.Remove(filepath.Join(pkgDir, req.Pkg+"_solution.go"))

	harnessDir := filepath.Join(tmp, "tracecmd")
	if err := os.MkdirAll(harnessDir, 0o755); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	harness, err := renderHarness(req.Pkg, qualifiedCall, traceVoidFuncs[funcName])
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if err := os.WriteFile(filepath.Join(harnessDir, "main.go"), harness, 0o644); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	res := runTraceHarness(tmp, funcName, qualifiedCall)
	res.Source = stripped
	writeJSON(w, http.StatusOK, res)
}

// qualifyTraceCall проверяет, что call — это ровно один вызов funcName(...)
// (не произвольный код: parser.ParseExpr принимает одно выражение, поэтому
// попытка впихнуть что-то ещё через ";" или второе выражение не пройдёт), и
// возвращает его с префиксом пакета. Это не граница безопасности (код
// читателя и так исполняется локально, как в /api/run) — это гигиена:
// защита от битого data-trace-call в markdown, который иначе сгенерировал бы
// непонятно что.
func qualifyTraceCall(call, pkg, funcName string) (string, error) {
	trimmed := strings.TrimSpace(call)
	expr, err := parser.ParseExpr(trimmed)
	if err != nil {
		return "", fmt.Errorf("не похоже на Go-выражение: %w", err)
	}
	ce, ok := expr.(*ast.CallExpr)
	if !ok {
		return "", fmt.Errorf("ожидался вызов функции")
	}
	id, ok := ce.Fun.(*ast.Ident)
	if !ok || id.Name != funcName {
		return "", fmt.Errorf("ожидался вызов %s(...)", funcName)
	}
	// trimmed уже начинается ровно с funcName( — иначе ce.Fun не был бы этим
	// голым идентификатором, так что конкатенация эквивалентна печати AST.
	return pkg + "." + trimmed, nil
}

var harnessTmpl = template.Must(template.New("harness").Parse(`package main

import (
	{{if not .Void}}"encoding/json"
	{{end}}"fmt"
	"math/rand"
	"os"

	{{.Pkg}} "{{.ImportPath}}"
)

// math/rand импортируется всегда — вызов в data-trace-calls может создавать
// генератор с фиксированным зерном (sampling.Shuffle, ReservoirSample:
// рандомизированный алгоритм без rng не вызвать, а трасса обязана быть
// воспроизводимой). Пустая ссылка держит импорт использованным для вызовов,
// которым rand не нужен, — а таких большинство.
var _ = rand.Int

func main() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintf(os.Stderr, "__TRACE_PANIC__ %v\n", r)
			os.Exit(1)
		}
	}()
	{{if .Void -}}
	{{.Call}}
	fmt.Println("__TRACE_RESULT__ null")
	{{- else -}}
	result := {{.Call}}
	// JSON, а не %v — иначе *ListNode/*TreeNode печатались бы как сырой
	// адрес (&{3 0xc0000...}); так фронтенд отрисует результат тем же
	// форматтером, что и переменные шагов (см. fmtValue в trace-viz.js).
	// "{}" — подозрительно для указателя/структуры: скорее всего, все поля
	// неэкспортируемые и json их не увидел (в отличие от %v) — тогда %v
	// содержательнее, несмотря на сырой адрес внутри.
	b, err := json.Marshal(result)
	if err != nil || string(b) == "{}" {
		fmt.Printf("__TRACE_RESULT__ %v\n", result)
	} else {
		fmt.Println("__TRACE_RESULT__ " + string(b))
	}
	{{- end}}
}
`))

type harnessData struct {
	Pkg        string
	ImportPath string
	Call       string
	Void       bool
}

func renderHarness(pkg, qualifiedCall string, void bool) ([]byte, error) {
	var buf bytes.Buffer
	data := harnessData{Pkg: pkg, ImportPath: moduleImportPath + "/" + pkg, Call: qualifiedCall, Void: void}
	if err := harnessTmpl.Execute(&buf, data); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// runTraceHarness собирает и запускает харнесс в два отдельных шага (не
// `go run`), чтобы чисто разводить ошибку сборки / панику / таймаут / успех
// по разным веткам ответа.
func runTraceHarness(tmp, funcName, qualifiedCall string) traceResponse {
	binPath := filepath.Join(tmp, ".tracebin")

	buildCtx, cancelBuild := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancelBuild()
	build := exec.CommandContext(buildCtx, "go", "build", "-o", binPath, "./tracecmd/")
	build.Dir = tmp
	build.Env = append(os.Environ(), "GOFLAGS=", "GOWORK=off")
	if buildOut, err := build.CombinedOutput(); err != nil {
		return traceResponse{Build: false, Output: strings.TrimSpace(string(buildOut)), Steps: []traceStep{}}
	}

	runCtx, cancelRun := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelRun()
	run := exec.CommandContext(runCtx, binPath)
	run.Dir = tmp
	var stdout, stderr bytes.Buffer
	run.Stdout = &stdout
	run.Stderr = &stderr

	start := time.Now()
	runErr := run.Run()
	duration := time.Since(start).Round(time.Millisecond).String()

	steps, result := parseTraceOutput(stdout.String())

	if runCtx.Err() == context.DeadlineExceeded {
		return traceResponse{
			Timeout:  true,
			Reason:   "выполнение не уложилось в 5с — похоже на бесконечный цикл",
			Steps:    steps,
			Duration: duration,
		}
	}
	if msg, ok := findPanic(stderr.String()); ok {
		return traceResponse{Build: true, Panic: true, Message: msg, Steps: steps, Duration: duration}
	}
	if runErr != nil {
		// сбой без нашего recover() (например, убит сигналом) — покажем как есть
		return traceResponse{Build: true, Panic: true, Message: strings.TrimSpace(stderr.String()), Steps: steps, Duration: duration}
	}

	return traceResponse{
		OK:       true,
		Build:    true,
		Func:     funcName,
		Call:     qualifiedCall,
		Result:   result,
		Steps:    steps,
		Duration: duration,
	}
}

// parseTraceOutput разбирает stdout харнеса построчно: строки "__TRACE__ "
// несут JSON-снимок шага, "__TRACE_RESULT__ " — возвращённое значение.
func parseTraceOutput(stdout string) ([]traceStep, string) {
	steps := make([]traceStep, 0)
	result := ""
	for line := range strings.SplitSeq(stdout, "\n") {
		if rest, ok := strings.CutPrefix(line, "__TRACE__ "); ok {
			var s traceStep
			if err := json.Unmarshal([]byte(rest), &s); err == nil {
				steps = append(steps, s)
			}
		} else if rest, ok := strings.CutPrefix(line, "__TRACE_RESULT__ "); ok {
			result = strings.TrimSpace(rest)
		}
	}
	return steps, result
}

func findPanic(stderr string) (string, bool) {
	for line := range strings.SplitSeq(stderr, "\n") {
		if rest, ok := strings.CutPrefix(line, "__TRACE_PANIC__ "); ok {
			return strings.TrimSpace(rest), true
		}
	}
	return "", false
}
