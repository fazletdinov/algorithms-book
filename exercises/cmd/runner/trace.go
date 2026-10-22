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
// dsu.NewUnionFind — тривиальный init-цикл, смотреть нечего; profiling.FormatScores —
// её глава как раз про то, что по шагам проблему НЕ видно, надо профилировать
// (и на 1000 элементах трасса была бы неподъёмной); ahocorasick.NewAutomaton —
// всё состояние в неэкспортируемых полях структуры читателя, JSON трассы
// показал бы {}; ahocorasick.Censor — суть (проход автомата) внутри вызова
// FindAll, а трасса видит только разметку covered и цикл по рунам;
// consistenthash.MovedFraction — счётчик расхождений, суть главы — в функциях
// before/after, чьи тела трасса не показывает.

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

// traceResponse — ответ /api/trace. Build («харнесс собрался») идёт БЕЗ
// omitempty намеренно: trace-viz.js узнаёт ошибку сборки по build === false, а
// опущенное поле для него — undefined, и читатель вместо вывода компилятора
// видел «Не удалось построить трассу». Поэтому false оно только у ошибки
// компилятора (и у Unsupported): сборка, остановленная сроком или отменой, несёт
// true и причину в Reason.
type traceResponse struct {
	OK          bool        `json:"ok"`
	Unsupported bool        `json:"unsupported,omitempty"`
	Build       bool        `json:"build"`
	Timeout     bool        `json:"timeout,omitempty"`
	MemLimit    bool        `json:"memLimit,omitempty"`
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
func (s *server) handleTrace(w http.ResponseWriter, r *http.Request) {
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

	// Сборка харнесса — тот же компилятор, что у /api/run: очередь общая.
	if !s.acquire(r.Context()) {
		return
	}
	defer s.release()

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

	res := runTraceHarness(r.Context(), tmp, funcName, qualifiedCall, s.traceLimits())
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
	// Первой строкой: по ней сервер отличает сбой в коде читателя от случая, когда
	// до main дело не дошло (ограничитель памяти перед бинарником не сработал).
	fmt.Println("__TRACE_START__")
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
// по разным веткам ответа. lim.BuildTimeout — срок сборки (ноль —
// defaultBuildTimeout), lim.Deadline — срок самого запуска, lim.MaxOutput — потолок
// трассы: шаг — строка stdout, и бесконечный цикл иначе копил бы их в памяти
// сервера до конца срока.
func runTraceHarness(ctx context.Context, tmp, funcName, qualifiedCall string, lim runLimits) traceResponse {
	binPath := filepath.Join(tmp, ".tracebin")

	buildTimeout := lim.BuildTimeout
	if buildTimeout <= 0 {
		buildTimeout = defaultBuildTimeout
	}
	buildCtx, cancelBuild := context.WithTimeout(ctx, buildTimeout)
	defer cancelBuild()
	build := groupCommand(buildCtx, "go", "build", "-o", binPath, "./tracecmd/")
	build.Dir = tmp
	build.Env = goEnv(tmp)
	if buildOut, err := build.CombinedOutput(); err != nil {
		// Сборку остановил срок или отмена, а не компилятор: с build === false виджет
		// написал бы «код не скомпилировался» над обрывком вывода. Build: true — он
		// проверяет build раньше, чем timeout и reason.
		switch buildCtx.Err() {
		case context.DeadlineExceeded:
			reason := fmt.Sprintf("сборка трассы не уложилась в %s — %s", buildTimeout, slowBuildHint(false))
			return traceResponse{Build: true, Timeout: true, Reason: reason, Steps: []traceStep{}}
		case context.Canceled: // ушёл клиент либо останавливается сервер: это не срок, Timeout тут был бы неправдой
			return traceResponse{Build: true, Reason: "сборка трассы прервана: runner останавливается или запрос отменён", Steps: []traceStep{}}
		}
		return traceResponse{Build: false, Output: strings.TrimSpace(string(buildOut)), Steps: []traceStep{}}
	}

	runCtx, cancelRun := context.WithTimeout(ctx, lim.Deadline)
	defer cancelRun()
	unit := unitName()
	run := lim.Mem.binary(runCtx, unit, binPath)
	run.Dir = tmp
	// Трасса упёрлась в потолок — читать дальше нечего: запуск останавливается сразу, не по сроку.
	stdout, stderr := &cappedBuffer{limit: lim.MaxOutput, onFull: cancelRun}, &cappedBuffer{limit: lim.MaxOutput}
	run.Stdout, run.Stderr = stdout, stderr

	start := time.Now()
	runErr := run.Run()
	duration := time.Since(start).Round(time.Millisecond).String()
	expired := runCtx.Err() == context.DeadlineExceeded // сразу: опрос области ниже тоже занимает время
	bg := context.WithoutCancel(ctx)                    // срок запуска мог выйти, а итог области ещё нужен
	hit := lim.Mem.hitLimit(bg, unit, stderr.buf.Bytes())
	if lim.Mem.Mode == memCgroup {
		cleanupUnit(bg, unit)
	}

	steps, result, started := parseTraceOutput(stdout.buf.String())

	if hit {
		reason := "выполнение упёрлось в предел памяти " + lim.Mem.limitText(false) + " — похоже на бесконечный рост (например, обход без visited)"
		return traceResponse{Build: true, MemLimit: true, Reason: reason, Steps: steps, Duration: duration}
	}
	if expired || stdout.truncated {
		reason := fmt.Sprintf("выполнение не уложилось в %s — похоже на бесконечный цикл", lim.Deadline)
		if stdout.truncated {
			reason = fmt.Sprintf("трасса не поместилась в %d КиБ — похоже на очень длинный или бесконечный цикл; возьми вход поменьше", lim.MaxOutput>>10)
		}
		// Build: true — виджет проверяет build раньше, чем timeout.
		return traceResponse{Build: true, Timeout: true, Reason: reason, Steps: steps, Duration: duration}
	}
	if msg, ok := findPanic(stderr.buf.String()); ok {
		return traceResponse{Build: true, Panic: true, Message: msg, Steps: steps, Duration: duration}
	}
	if runErr != nil && !started && !crashRe.Match(stderr.buf.Bytes()) {
		// Не паника в коде читателя: до main харнесса дело не дошло — не стартовал
		// бинарник или ограничитель памяти перед ним (systemd-run не создал область и
		// вышел со своим кодом). Виджет показывает reason последней веткой. Паника
		// рантайма без строки старта — другое: решение упало при инициализации
		// (переменная уровня пакета, init), и это сбой в коде читателя — ветка ниже.
		return traceResponse{Build: true, Reason: "трасса не запустилась: " + launchCause(runErr, stderr.buf.String()), Steps: steps, Duration: duration}
	}
	if runErr != nil {
		// сбой без нашего recover() (например, убит сигналом) — покажем как есть
		return traceResponse{Build: true, Panic: true, Message: strings.TrimSpace(stderr.buf.String()), Steps: steps, Duration: duration}
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
// несут JSON-снимок шага, "__TRACE_RESULT__ " — возвращённое значение,
// "__TRACE_START__" — main харнесса начал работу (started).
func parseTraceOutput(stdout string) (steps []traceStep, result string, started bool) {
	steps = make([]traceStep, 0)
	for line := range strings.SplitSeq(stdout, "\n") {
		if rest, ok := strings.CutPrefix(line, "__TRACE__ "); ok {
			var s traceStep
			if err := json.Unmarshal([]byte(rest), &s); err == nil {
				steps = append(steps, s)
			}
		} else if rest, ok := strings.CutPrefix(line, "__TRACE_RESULT__ "); ok {
			result = strings.TrimSpace(rest)
		} else if line == "__TRACE_START__" {
			started = true
		}
	}
	return steps, result, started
}

func findPanic(stderr string) (string, bool) {
	for line := range strings.SplitSeq(stderr, "\n") {
		if rest, ok := strings.CutPrefix(line, "__TRACE_PANIC__ "); ok {
			return strings.TrimSpace(rest), true
		}
	}
	return "", false
}
