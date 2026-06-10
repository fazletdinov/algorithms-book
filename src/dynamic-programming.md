# 🧮 Dynamic Programming (Динамическое программирование)

<div class="algo-hero">
  <div class="algo-hero__main">
    <div class="algo-hero__name">Dynamic Programming <span class="algo-hero__ru">Динамическое программирование</span></div>
    <div class="algo-hero__tag">Перекрывающиеся подзадачи + запоминание → полином вместо экспоненты</div>
  </div>
  <div class="algo-hero__metrics">
    <div class="algo-hero__metric"><span>Время</span><b>сост.×переход</b></div>
    <div class="algo-hero__metric"><span>Память</span><b>O(состояний)</b></div>
  </div>
</div>

<div class="algo-cards2">
  <div class="algo-card algo-card--yes">
    <div class="algo-card__hdr">Когда применять</div>
    <ul>
      <li>«сколькими <b>способами</b>…» (подсчёт вариантов)</li>
      <li>«<b>минимум / максимум / самый длинный</b>…» при цепочке выборов</li>
      <li>«<b>можно ли</b> достичь…» (достижимость комбинацией шагов)</li>
      <li>подзадачи <b>перекрываются</b> + оптимальная подструктура</li>
    </ul>
  </div>
  <div class="algo-card algo-card--no">
    <div class="algo-card__hdr">Когда НЕ применять</div>
    <ul>
      <li>подзадачи <b>уникальны</b> → обычная рекурсия / backtracking</li>
      <li>жадность доказуемо работает (проще и быстрее)</li>
      <li>нет оптимальной подструктуры</li>
      <li>состояний экспоненциально много — не уложится</li>
    </ul>
  </div>
</div>

<p class="algo-hint">🔍 <b>Как распознать в условии:</b> <b>«сколькими способами», «минимум/максимум», «можно ли достичь», «самая длинная подпоследовательность»</b> · цепочка выборов, где варианты повторяются.</p>

<div class="algo-mental">
  <div class="algo-mental__icon">💡</div>
  <div class="algo-mental__body">
    <div class="algo-mental__title">Запомни (4 шага построения)</div>
    <ul>
      <li><b>Состояние</b> — что описывает подзадачу (<code>dp[i]</code>);</li>
      <li><b>Переход</b> — рекуррента через меньшие состояния;</li>
      <li><b>База</b> — тривиальные случаи (<code>dp[0]</code>);</li>
      <li><b>Порядок</b> — чтобы нужное было посчитано раньше.</li>
    </ul>
    <p>Мемоизация (сверху вниз) = рекурсия + кэш; табуляция (снизу вверх) = заполняем таблицу. Время ≈ <b>число состояний × стоимость перехода</b>.</p>
  </div>
</div>

## 🎬 Визуализация

> 💡 **Интерактивная демонстрация (пошаговый дебаг Coin Change).** Для каждой суммы `a` перебирается
> каждая монета `c`; видно, как меняются `best` и ячейка `dp[a]`. Синяя ячейка — текущая сумма,
> фиолетовая — источник `dp[a−c]`. Справа — код с подсветкой строки и панель переменных (`a`, `c`,
> `dp[a−c]`, `best`, `dp[a]`). Можно подставить свои монеты и `amount`. (Виджет работает в собранной
> книге `mdbook serve`/`mdbook build`, а не при просмотре `.md` на GitHub.)

<div class="algo-viz" data-viz="dp-coins" data-coins="1,3,4" data-amount="6"></div>

Монеты `{1, 3, 4}`, сумма `6` — классика, где **жадность ошибается**: жадный взял бы
`4 + 1 + 1 = 3` монеты, а ДП находит оптимум `3 + 3 = 2`.

## ⚡ Шаблон для собеседования

```go
// Coin Change: dp[a] = минимум монет на сумму a
dp := make([]int, amount+1)
for a := 1; a <= amount; a++ {
    dp[a] = INF
    for _, c := range coins {
        if c <= a && dp[a-c]+1 < dp[a] {
            dp[a] = dp[a-c] + 1 // переход через меньшую сумму
        }
    }
}
// dp[amount] — ответ (или INF, если набрать нельзя)
```

1. состояние `dp[a]` — ответ для суммы `a`;
2. база `dp[0] = 0`;
3. переход: пробуем каждую монету `c`, `dp[a] = min(dp[a], dp[a-c]+1)`;
4. идём от меньших сумм к большим.

## 📖 Разбор

<details class="algo-details">
<summary>Два подхода, примеры (1D / 2D / рюкзак) и сложность</summary>

ДП разбивает задачу на **перекрывающиеся подзадачи** и сохраняет их результаты. Нужны
два свойства: перекрывающиеся подзадачи и оптимальная подструктура.

#### Мемоизация (сверху вниз)

```go
func fibMemo(n int) int {
    memo := make(map[int]int)
    var f func(int) int
    f = func(k int) int {
        if k < 2 {
            return k
        }
        if v, ok := memo[k]; ok {
            return v
        }
        memo[k] = f(k-1) + f(k-2)
        return memo[k]
    }
    return f(n)
}
```

#### Табуляция (снизу вверх)

```go
func fibTab(n int) int {
    if n < 2 {
        return n
    }
    prev, cur := 0, 1
    for i := 2; i <= n; i++ {
        prev, cur = cur, prev+cur // O(1) памяти
    }
    return cur
}
```

#### Coin Change (минимум монет)

```go
func coinChange(coins []int, amount int) int {
    const INF = 1 << 30
    dp := make([]int, amount+1)
    for i := 1; i <= amount; i++ {
        dp[i] = INF
        for _, c := range coins {
            if c <= i && dp[i-c]+1 < dp[i] {
                dp[i] = dp[i-c] + 1
            }
        }
    }
    if dp[amount] >= INF {
        return -1
    }
    return dp[amount]
}
```

#### 2D ДП: Longest Common Subsequence

```go
func lcs(a, b string) int {
    m, n := len(a), len(b)
    dp := make([][]int, m+1)
    for i := range dp {
        dp[i] = make([]int, n+1)
    }
    for i := 1; i <= m; i++ {
        for j := 1; j <= n; j++ {
            if a[i-1] == b[j-1] {
                dp[i][j] = dp[i-1][j-1] + 1
            } else {
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
            }
        }
    }
    return dp[m][n]
}
```

#### 0/1 Рюкзак

Состояние `dp[i][w]` — максимальная ценность из первых `i` предметов при вместимости `w`.
Выбор «взять / не взять»: `dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight[i]] + value[i])`.
Часто сворачивается до 1D-массива по `w` (идём по `w` в обратную сторону).

#### Сложность

| Задача              | Состояний | Переход | Время       | Память (оптим.) |
|---------------------|-----------|---------|-------------|-----------------|
| Фибоначчи / лестница| O(n)      | O(1)    | O(n)        | O(1)            |
| Coin Change         | O(amount) | O(монет)| O(amount·k) | O(amount)       |
| LCS                 | O(m·n)    | O(1)    | O(m·n)      | O(min(m, n))    |
| 0/1 Рюкзак          | O(n·W)    | O(1)    | O(n·W)      | O(W)            |

**Время ≈ (число состояний) × (стоимость перехода)**.

</details>

## ⚠️ Типичные ошибки

1. **Неправильная база** — забыли `dp[0]` или задали неверно; вся таблица «съезжает».
2. **Неверный порядок обхода** — состояние используется раньше, чем посчитано.
3. **Путаница индексов строк и таблицы** — для строк длины `m` таблица размера `m+1`, символ `a[i-1]` ↔ `dp[i]`.
4. **Мемоизация без кэша на самом деле** — забыли записать результат перед `return`.
5. **0/1-рюкзак: проход по `w` в прямом порядке** при свёрнутом массиве — предмет берётся несколько раз.

## 🧩 Задачи

**LeetCode:**

- [Climbing Stairs](https://leetcode.com/problems/climbing-stairs/)
- [House Robber](https://leetcode.com/problems/house-robber/)
- [Coin Change](https://leetcode.com/problems/coin-change/)
- [Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/)
- [Unique Paths](https://leetcode.com/problems/unique-paths/) — 2D ДП на сетке
- [Word Break](https://leetcode.com/problems/word-break/)
- [Edit Distance](https://leetcode.com/problems/edit-distance/) (сложная)
- [Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/) (сложная)
- [Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/) — 0/1 рюкзак

**Тренажёр** — пакет `dp`:

```bash
cd exercises
go test ./dp/                 # ваши решения
go test -tags solution ./dp/  # эталон
```

Реализуйте `ClimbStairs`, `CoinChange`, `LongestCommonSubsequence`, `EditDistance`,
`LongestIncreasingSubsequence`, `Knapsack01`, `HouseRobber`, `UniquePaths` и `WordBreak`.

## 🔗 Связанные шаблоны

- **[Backtracking](backtracking.md)** — когда подзадачи перекрываются, перебор превращается в ДП мемоизацией.
- **[Greedy](greedy.md)** — когда жадность доказуема, она проще ДП.
- **[Modified Binary Search](modified-binary-search.md)** — ускоряет некоторые ДП (LIS до O(n log n)).
