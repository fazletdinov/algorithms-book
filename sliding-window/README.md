# Sliding Window (Скользящее окно)

## Описание шаблона

Шаблон **Sliding Window** (также известный как "метод двух указателей с окном") — это техника оптимизации, используемая для выполнения операций с подмассивами или подстроками фиксированного или переменного размера в массиве или строке. 

### Исторический контекст

Идея скользящего окна восходит к задачам обработки сигналов и анализа временных рядов, где нужно было вычислять статистики (среднее, максимум, минимум) для последовательных интервалов данных. В программировании этот паттерн стал популярен благодаря своей эффективности: вместо пересчета всех элементов заново для каждого окна, мы переиспользуем вычисления предыдущего окна.

### Основная идея

Ключевое преимущество скользящего окна — **инкрементальное обновление**: при переходе от одного окна к следующему мы добавляем один новый элемент и удаляем один старый, вместо полного пересчета всех элементов окна. Это позволяет снизить временную сложность с O(n×k) до O(n), где n — размер массива, а k — размер окна.

## Когда применять

Используйте этот шаблон, когда:
- Входные данные представляют собой линейную структуру данных (массив, связанный список, строка)
- Нужно найти самую длинную/короткую подстроку, подмассив или желаемое значение
- Задача связана с подмассивами или подстроками фиксированного размера
- Можно оптимизировать решение, избегая повторных вычислений

## Алгоритм/Подход

### Базовый подход с псевдокодом:

#### Фиксированное окно:

```pseudocode
function slidingWindowFixed(arr, k):
    // Шаг 1: Инициализация
    windowSum = 0
    maxSum = -∞
    
    // Шаг 2: Вычисление суммы первого окна
    for i = 0 to k-1:
        windowSum += arr[i]
    maxSum = windowSum
    
    // Шаг 3: Скольжение окна
    for i = k to n-1:
        // Добавляем новый элемент справа
        windowSum += arr[i]
        // Удаляем старый элемент слева
        windowSum -= arr[i - k]
        // Обновляем результат
        maxSum = max(maxSum, windowSum)
    
    return maxSum
```

#### Переменное окно (расширяющееся/сжимающееся):

```pseudocode
function slidingWindowVariable(arr, condition):
    left = 0
    maxLen = 0
    
    for right = 0 to n-1:
        // Расширяем окно: добавляем arr[right]
        add arr[right] to window
        
        // Сжимаем окно пока условие не выполняется
        while condition not satisfied:
            remove arr[left] from window
            left++
        
        // Обновляем результат
        maxLen = max(maxLen, right - left + 1)
    
    return maxLen
```

### Детальный разбор шагов:

1. **Инициализация**: 
   - Для фиксированного окна: вычисляем начальное значение окна (первые k элементов)
   - Для переменного окна: устанавливаем `left = 0`, `right = 0`, инициализируем структуры данных для отслеживания состояния окна (например, HashMap для подсчета символов)

2. **Расширение окна**:
   - Добавляем элемент `arr[right]` в окно
   - Обновляем метрики окна (сумма, количество уникальных элементов и т.д.)

3. **Скольжение/Сжатие**:
   - Для фиксированного окна: автоматически удаляем `arr[left]` при добавлении `arr[right]`
   - Для переменного окна: проверяем условие и сжимаем окно слева, если необходимо

4. **Обновление результата**:
   - На каждом шаге проверяем, является ли текущее окно лучшим решением
   - Сохраняем оптимальное значение

### Типы окон:

- **Фиксированное окно**: Размер окна остается постоянным (k элементов). Используется когда нужно найти оптимальное значение для подмассива фиксированного размера.
- **Переменное окно**: Размер окна изменяется в зависимости от условий. Используется для поиска максимального/минимального подмассива, удовлетворяющего условию.

## Визуализация

### Фиксированное окно размера K=3 (максимальная сумма):

```
Исходный массив: [1, 2, 3, 4, 5, 6], k = 3

Инициализация:
windowSum = 1 + 2 + 3 = 6
maxSum = 6

Шаг 1: [1, 2, 3] 4, 5, 6
        ↑  ↑  ↑
        left=0, right=2
        windowSum = 6, maxSum = 6

Шаг 2: 1 [2, 3, 4] 5, 6
           ↑  ↑  ↑
        left=1, right=3
        windowSum = 6 - 1 + 4 = 9, maxSum = 9

Шаг 3: 1, 2 [3, 4, 5] 6
              ↑  ↑  ↑
        left=2, right=4
        windowSum = 9 - 2 + 5 = 12, maxSum = 12

Шаг 4: 1, 2, 3 [4, 5, 6]
                 ↑  ↑  ↑
        left=3, right=5
        windowSum = 12 - 3 + 6 = 15, maxSum = 15

Результат: maxSum = 15
```

### Переменное окно (поиск максимальной подстроки без повторяющихся символов):

```
Строка: "abcabcbb"

Шаг 1: [a] b c a b c b b
        ↑  ↑
        left=0, right=0, chars={a}, len=1, maxLen=1

Шаг 2: [a b] c a b c b b
        ↑     ↑
        left=0, right=1, chars={a,b}, len=2, maxLen=2

Шаг 3: [a b c] a b c b b
        ↑        ↑
        left=0, right=2, chars={a,b,c}, len=3, maxLen=3

Шаг 4: [a b c a] b c b b  ← дубликат 'a'!
        ↑         ↑
        left=0, right=3, chars={a,b,c,a} - НЕДОПУСТИМО
        Сжимаем: left=1, chars={b,c,a}, len=3, maxLen=3

Шаг 5: a [b c a b] c b b  ← дубликат 'b'!
             ↑     ↑
        left=1, right=4, chars={b,c,a,b} - НЕДОПУСТИМО
        Сжимаем: left=2, chars={c,a,b}, len=3, maxLen=3

Шаг 6: a b [c a b c] b b  ← дубликат 'c'!
              ↑       ↑
        left=2, right=5, сжимаем до left=3
        chars={a,b,c}, len=3, maxLen=3

Шаг 7: a b c [a b c b] b  ← дубликат 'b'!
                 ↑     ↑
        left=3, right=6, сжимаем до left=5
        chars={c,b}, len=2, maxLen=3

Шаг 8: a b c a b [c b b]  ← дубликат 'b'!
                    ↑   ↑
        left=5, right=7, сжимаем до left=7
        chars={b}, len=1, maxLen=3

Результат: maxLen = 3 (подстрока "abc")
```

### Переменное окно (минимум подстроки, содержащей все символы из t):

```
s = "ADOBECODEBANC", t = "ABC"

Шаг 1: [A D O B E C] O D E B A N C
        ↑           ↑
        left=0, right=5
        Найдены все символы: A, B, C
        Длина = 6, minLen = 6

Шаг 2: A [D O B E C O] D E B A N C
           ↑           ↑
        left=1, right=6
        Все еще содержит A, B, C
        Длина = 6, minLen = 6

Шаг 3: A D [O B E C O D] E B A N C
             ↑           ↑
        left=2, right=7
        Все еще содержит A, B, C
        Длина = 6, minLen = 6

... продолжаем сжимать ...

Шаг N: A D O B E C O D E B [A N C]
                                ↑ ↑
        left=10, right=12
        Содержит A, C, но не B
        Расширяем...

Финальный результат: "BANC" (длина 4)
```

## Математическое обоснование

### Почему алгоритм работает?

**Инвариант скользящего окна**: На каждом шаге i окно содержит элементы от `left` до `right` включительно, и все элементы внутри окна удовлетворяют условию задачи (или окно имеет фиксированный размер k).

**Доказательство корректности для фиксированного окна**:
- Базовый случай: Первое окно [0..k-1] корректно вычислено
- Индуктивный шаг: Предположим, окно [i-k..i-1] корректно. При переходе к [i-k+1..i]:
  - Удаляем arr[i-k] (старый левый элемент)
  - Добавляем arr[i] (новый правый элемент)
  - Сумма обновляется: `newSum = oldSum - arr[i-k] + arr[i]`
  - Это эквивалентно полному пересчету, но за O(1) вместо O(k)

**Доказательство корректности для переменного окна**:
- **Монотонность**: Если окно [left..right] не удовлетворяет условию, то любое окно [left'..right], где left' < left, также не будет удовлетворять (для монотонных условий)
- **Оптимальность**: Мы расширяем окно до максимально возможного размера перед сжатием, гарантируя, что не пропустим оптимальное решение

## Временная и пространственная сложность

### Детальный анализ:

**Фиксированное окно**:
- **Временная сложность**: O(n)
  - Инициализация первого окна: O(k)
  - Скольжение: (n-k) итераций × O(1) операций = O(n-k) = O(n)
  - Итого: O(k) + O(n) = O(n)
- **Пространственная сложность**: O(1)
  - Используем только константное количество переменных (windowSum, maxSum, индексы)

**Переменное окно**:
- **Временная сложность**: O(n)
  - Каждый элемент добавляется максимум один раз (right увеличивается)
  - Каждый элемент удаляется максимум один раз (left увеличивается)
  - Всего: n добавлений + n удалений = O(n) операций
- **Пространственная сложность**: O(k), где k — максимальный размер окна
  - HashMap/Set для отслеживания элементов в окне: O(k) в худшем случае
  - В среднем может быть O(min(k, |алфавит|)) для строк

### Сравнение с наивным подходом:

| Подход | Временная сложность | Пространственная сложность |
|--------|---------------------|----------------------------|
| Наивный (пересчет для каждого окна) | O(n×k) | O(1) |
| Скользящее окно | O(n) | O(k) |

Для k << n выигрыш значительный: O(n×k) → O(n)

## Примеры задач на LeetCode

### Легкие:
- [Maximum Average Subarray I](https://leetcode.com/problems/maximum-average-subarray-i/) - Максимальная средняя подмассива размера K
- [Maximum Sum Subarray of Size K](https://leetcode.com/problems/maximum-subarray/) - Максимальная сумма подмассива размера K
- [Best Time to Buy and Sell Stock](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) - Лучшее время для покупки и продажи акций

### Средние:
- [Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/) - Самая длинная подстрока без повторяющихся символов
- [Longest Substring with At Most K Distinct Characters](https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters/) - Самая длинная подстрока с максимум K различными символами
- [Fruit Into Baskets](https://leetcode.com/problems/fruit-into-baskets/) - Фрукты в корзины

### Сложные:
- [Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/) - Минимальное окно подстроки
- [Substring with Concatenation of All Words](https://leetcode.com/problems/substring-with-concatenation-of-all-words/) - Подстрока с конкатенацией всех слов
- [Sliding Window Maximum](https://leetcode.com/problems/sliding-window-maximum/) - Максимум скользящего окна

## Сравнение с альтернативными подходами

### 1. Наивный подход (перебор всех подмассивов):

**Go**:
```go
// O(n²) для всех подмассивов × O(k) для вычисления = O(n²×k)
for i := 0; i < n; i++ {
    for j := i; j < n; j++ {
        subarray := arr[i:j+1]
        if condition(subarray) {
            updateResult()
        }
    }
}
```

**Rust**:
```rust
// O(n²) для всех подмассивов × O(k) для вычисления = O(n²×k)
for i in 0..n {
    for j in i..n {
        let subarray = &arr[i..=j];
        if condition(subarray) {
            update_result();
        }
    }
}
```

**Недостатки**: 
- Временная сложность O(n²) или O(n²×k)
- Много повторных вычислений

**Когда использовать**: Только если нужны ВСЕ подмассивы, а не оптимальный

### 2. Динамическое программирование:

Для некоторых задач скользящее окно можно заменить DP, но:
- **Скользящее окно**: O(n) время, O(k) память
- **DP**: O(n) время, O(n) память (для таблицы состояний)

**Вывод**: Скользящее окно эффективнее по памяти для задач с локальными зависимостями

### 3. Префиксные суммы:

Для задач на сумму подмассива можно использовать префиксные суммы:
- Префиксные суммы: O(n) предобработка + O(1) запрос
- Скользящее окно: O(n) общее время

**Когда использовать префиксные суммы**: Если нужны запросы к случайным подмассивам
**Когда использовать скользящее окно**: Если нужно найти оптимальный подмассив

## Типичные ошибки и подводные камни

### 1. Неправильная инициализация окна

❌ **Неправильно**:

**Go**:
```go
left, right := 0, 0
maxLen := 0
// Пропускаем инициализацию первого окна
```

**Rust**:
```rust
let mut left = 0;
let mut right = 0;
let mut max_len = 0;
// Пропускаем инициализацию первого окна
```

✅ **Правильно**:

**Go**:
```go
left, right := 0, 0
maxLen := 0
// Инициализируем структуры данных для окна
window := make(map[byte]int)
```

**Rust**:
```rust
let mut left = 0;
let mut right = 0;
let mut max_len = 0;
// Инициализируем структуры данных для окна
let mut window = HashMap::new();
```

### 2. Забывание обновлять результат при сжатии окна

❌ **Неправильно**:

**Go**:
```go
for conditionNotSatisfied() {
    shrinkWindow()
    // Забыли обновить maxLen здесь!
}
```

**Rust**:
```rust
while condition_not_satisfied() {
    shrink_window();
    // Забыли обновить max_len здесь!
}
```

✅ **Правильно**:

**Go**:
```go
for conditionNotSatisfied() {
    shrinkWindow()
    if right-left+1 > maxLen {
        maxLen = right - left + 1  // Обновляем после сжатия
    }
}
```

**Rust**:
```rust
while condition_not_satisfied() {
    shrink_window();
    max_len = max_len.max(right - left + 1);  // Обновляем после сжатия
}
```

### 3. Неправильное управление границами

❌ **Неправильно**:

**Go**:
```go
for right := 0; right < n; right++ {
    addToWindow(arr[right])
    for condition() {
        removeFromWindow(arr[left])
        left++
    }
    // Обновляем результат ДО проверки условия
    if right-left+1 > maxLen {
        maxLen = right - left + 1
    }
}
```

**Rust**:
```rust
for right in 0..n {
    add_to_window(arr[right]);
    while condition() {
        remove_from_window(arr[left]);
        left += 1;
    }
    // Обновляем результат ДО проверки условия
    max_len = max_len.max(right - left + 1);
}
```

✅ **Правильно**:

**Go**:
```go
for right := 0; right < n; right++ {
    addToWindow(arr[right])
    for conditionNotSatisfied() {
        removeFromWindow(arr[left])
        left++
    }
    // Обновляем результат ПОСЛЕ того, как условие выполнено
    if right-left+1 > maxLen {
        maxLen = right - left + 1
    }
}
```

**Rust**:
```rust
for right in 0..n {
    add_to_window(arr[right]);
    while condition_not_satisfied() {
        remove_from_window(arr[left]);
        left += 1;
    }
    // Обновляем результат ПОСЛЕ того, как условие выполнено
    max_len = max_len.max(right - left + 1);
}
```

### 4. Off-by-one ошибки

❌ **Неправильно**:

**Go**:
```go
windowSize := right - left  // Не включает right!
```

**Rust**:
```rust
let window_size = right - left;  // Не включает right!
```

✅ **Правильно**:

**Go**:
```go
windowSize := right - left + 1  // Включает оба конца
```

**Rust**:
```rust
let window_size = right - left + 1;  // Включает оба конца
```

### 5. Неэффективное обновление структур данных

❌ **Неправильно** (пересчет всей суммы):

**Go**:
```go
for right := k; right < n; right++ {
    windowSum := 0
    for i := left; i <= right; i++ {
        windowSum += arr[i]  // O(k) операция!
    }
}
```

**Rust**:
```rust
for right in k..n {
    let window_sum: i32 = arr[left..=right].iter().sum();  // O(k) операция!
}
```

✅ **Правильно** (инкрементальное обновление):

**Go**:
```go
windowSum += arr[right] - arr[left]
left++
```

**Rust**:
```rust
window_sum += arr[right] - arr[left];
left += 1;
```

## Практические советы по применению

1. **Определите тип окна**:
   - Фиксированное → используйте простой цикл с индексами
   - Переменное → используйте два указателя left/right

2. **Выберите правильную структуру данных**:
   - Для подсчета уникальных элементов → HashMap/Set
   - Для отслеживания минимума/максимума → Deque (для O(1) операций)
   - Для простых сумм → переменная

3. **Порядок операций важен**:
   - Сначала расширяйте окно (right++)
   - Затем проверяйте условие
   - Потом сжимайте при необходимости (left++)
   - Наконец обновляйте результат

4. **Обработка граничных случаев**:
   - Пустой массив
   - Массив меньше размера окна
   - Все элементы одинаковые
   - Нет решения (окно никогда не удовлетворяет условию)

5. **Оптимизация для больших данных**:
   - Используйте Deque вместо списка для O(1) операций с обоих концов
   - Избегайте создания новых подмассивов/подстрок
   - Используйте индексы вместо срезов

## Аллокации памяти и управление памятью

### Теория аллокаций в Rust и Go

#### Rust: Владение и аллокации

В Rust управление памятью основано на системе владения (ownership):
- **Стек**: Примитивные типы (`i32`, `bool`, ссылки) хранятся на стеке
- **Куча**: Динамические структуры (`Vec`, `String`, `HashMap`) аллоцируются в куче
- **Владение**: Каждое значение имеет одного владельца, который отвечает за освобождение памяти
- **Borrow checker**: Проверяет заимствования на этапе компиляции

**Аллокации в Rust**:
- `Vec::new()` - создает пустой вектор (не аллоцирует память сразу)
- `Vec::with_capacity(n)` - предварительно аллоцирует память для n элементов
- `String::from()` - аллоцирует память в куче для строки
- `HashMap::new()` - создает пустую хеш-таблицу

#### Go: Сборщик мусора и escape analysis

В Go управление памятью автоматическое:
- **Стек**: Локальные переменные, примитивы, небольшие структуры
- **Куча**: Большие структуры, слайсы с динамическим размером, интерфейсы
- **Garbage Collector (GC)**: Автоматически освобождает неиспользуемую память
- **Escape Analysis**: Компилятор определяет, должна ли переменная быть в куче

**Аллокации в Go**:
- `make([]T, len, cap)` - создает слайс с предварительно выделенной емкостью
- `map[string]int{}` - создает мапу (аллоцируется в куче)
- `new(T)` - аллоцирует память и возвращает указатель
- `&struct{...}` - может привести к escape в кучу

### Анализ аллокаций для Sliding Window

#### Фиксированное окно:

**Rust**:
```rust
// Аллокации:
// - windowSum: i32 (стек) - O(1)
// - maxSum: i32 (стек) - O(1)
// - Индексы: usize (стек) - O(1)
// Итого: O(1) памяти, никаких аллокаций в куче
```

**Go**:
```go
// Аллокации:
// - windowSum: int (стек) - O(1)
// - maxSum: int (стек) - O(1)
// - Индексы: int (стек) - O(1)
// Итого: O(1) памяти, никаких аллокаций в куче
```

#### Переменное окно:

**Rust**:
```rust
// Аллокации:
// - HashMap для подсчета символов: O(k), где k - размер алфавита
// - left, right: usize (стек) - O(1)
// Итого: O(k) памяти в худшем случае
```

**Go**:
```go
// Аллокации:
// - map[rune]int для подсчета: O(k) в куче
// - left, right: int (стек) - O(1)
// Итого: O(k) памяти, map аллоцируется в куче
```

### Оптимизация памяти

#### Rust оптимизации:

1. **Предварительное выделение HashMap**:
```rust
// ❌ Плохо: HashMap растет динамически
let mut char_count = HashMap::new();

// ✅ Хорошо: Предварительное выделение
let mut char_count = HashMap::with_capacity(26); // для ASCII
```

2. **Избежание клонирования**:
```rust
// ❌ Плохо: клонирование строки
let substring = s[left..right].to_string();

// ✅ Хорошо: использование срезов
let substring = &s[left..right];
```

3. **Переиспользование структур**:
```rust
// Переиспользование HashMap вместо создания новой
char_count.clear(); // вместо HashMap::new()
```

#### Go оптимизации:

1. **Предварительное выделение слайсов**:
```go
// ❌ Плохо: слайс растет динамически
result := []int{}

// ✅ Хорошо: предварительное выделение
result := make([]int, 0, expectedSize)
```

2. **Избежание escape в кучу**:
```go
// Используйте указатели только когда необходимо
// Компилятор Go оптимизирует, но лучше быть явным
```

3. **Переиспользование map**:
```go
// Очистка map вместо создания новой
for k := range charCount {
    delete(charCount, k)
}
```

### Сравнение Rust vs Go

| Аспект | Rust | Go |
|--------|------|-----|
| Управление памятью | Владение, компилятор | GC, runtime |
| Аллокации HashMap | Явные, контролируемые | Автоматические |
| Производительность | Предсказуемая, без пауз GC | Может быть паузы GC |
| Сложность | Выше (borrow checker) | Ниже (автоматическое) |
| Оптимизация | На этапе компиляции | Runtime оптимизации |

**Когда использовать Rust**: Когда нужна предсказуемая производительность и контроль над памятью
**Когда использовать Go**: Когда важна простота разработки и приемлемы небольшие паузы GC

## Оптимизация производительности

### Общие техники

1. **Избежание ненужных аллокаций**:
   - Используйте предварительное выделение памяти
   - Переиспользуйте структуры данных
   - Избегайте создания временных объектов в циклах

2. **Кэширование вычислений**:
   - Сохраняйте результаты дорогих операций
   - Используйте lookup таблицы для часто используемых значений

3. **Оптимизация циклов**:
   - Минимизируйте операции внутри циклов
   - Используйте итераторы вместо индексов (в Rust)
   - Избегайте проверок условий в горячих путях

### Специфичные оптимизации для Sliding Window

#### 1. Оптимизация для фиксированного окна:

**Rust**:
```rust
// ✅ Оптимизированная версия
pub fn max_sum_optimized(arr: &[i32], k: usize) -> i32 {
    if arr.len() < k { return 0; }
    
    // Используем итераторы для лучшей оптимизации
    let mut window_sum: i32 = arr.iter().take(k).sum();
    let mut max_sum = window_sum;
    
    for i in k..arr.len() {
        window_sum += arr[i] - arr[i - k];
        max_sum = max_sum.max(window_sum);
    }
    
    max_sum
}
```

**Go**:
```go
// ✅ Оптимизированная версия
func maxSumOptimized(arr []int, k int) int {
    if len(arr) < k { return 0 }
    
    windowSum := 0
    for i := 0; i < k; i++ {
        windowSum += arr[i]
    }
    maxSum := windowSum
    
    for i := k; i < len(arr); i++ {
        windowSum += arr[i] - arr[i-k]
        if windowSum > maxSum {
            maxSum = windowSum
        }
    }
    
    return maxSum
}
```

#### 2. Оптимизация для переменного окна:

**Использование VecDeque для минимума/максимума**:
```rust
use std::collections::VecDeque;

// Для задачи "Sliding Window Maximum"
// Используем VecDeque для O(1) операций с обоих концов
let mut deque = VecDeque::with_capacity(k);
```

### Оптимизация для Rust

1. **Использование `Vec::with_capacity()`**:
```rust
// Предварительное выделение памяти
let mut result = Vec::with_capacity(n);
```

2. **Избежание `clone()`**:
```rust
// ❌ Плохо
let copy = data.clone();

// ✅ Хорошо: использование ссылок
let reference = &data;
```

3. **Использование `&str` вместо `String`**:
```rust
// ✅ Для входных данных используйте &str
fn process(s: &str) { ... }
```

4. **Zero-cost abstractions**:
```rust
// Итераторы компилируются в эффективный код
arr.iter().filter(|&x| x > 0).sum()
```

### Оптимизация для Go

1. **Предварительное выделение слайсов**:
```go
// ✅ Предварительное выделение
result := make([]int, 0, n)
```

2. **Избежание escape в кучу**:
```go
// Используйте значения вместо указателей когда возможно
// Компилятор оптимизирует, но лучше быть явным
```

3. **Использование `sync.Pool` для переиспользования**:
```go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 0, 1024)
    },
}
```

4. **Оптимизация сборщика мусора**:
```go
// Минимизируйте аллокации в горячих путях
// Используйте переиспользование объектов
```

## Профилирование

### Инструменты профилирования

#### Rust инструменты:

1. **`cargo bench`** - встроенные бенчмарки:
```toml
# Cargo.toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }
```

2. **`cargo-flamegraph`** - визуализация производительности:
```bash
cargo install flamegraph
cargo flamegraph --bench sliding_window
```

3. **`perf`** - системный профилировщик Linux:
```bash
perf record --call-graph dwarf ./target/release/benchmark
perf report
```

4. **`valgrind`** - анализ памяти:
```bash
valgrind --tool=massif ./target/release/benchmark
```

#### Go инструменты:

1. **`go test -bench`** - бенчмарки:
```go
func BenchmarkSlidingWindow(b *testing.B) {
    arr := generateTestData(1000)
    for i := 0; i < b.N; i++ {
        maxSumSubarray(arr, 10)
    }
}
```

2. **`go tool pprof`** - профилирование CPU и памяти:
```bash
go test -cpuprofile=cpu.prof -memprofile=mem.prof -bench=.
go tool pprof cpu.prof
```

3. **`go test -memprofile`** - профиль памяти:
```bash
go test -memprofile=mem.prof -bench=.
go tool pprof mem.prof
```

### Как профилировать Sliding Window

#### Rust пример:

```rust
// benches/sliding_window_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use sliding_window::max_sum_subarray_fixed_k;

fn bench_sliding_window(c: &mut Criterion) {
    let arr: Vec<i32> = (0..10000).collect();
    
    c.bench_function("sliding_window_k_100", |b| {
        b.iter(|| max_sum_subarray_fixed_k(black_box(&arr), 100))
    });
}

criterion_group!(benches, bench_sliding_window);
criterion_main!(benches);
```

**Запуск**:
```bash
cargo bench
```

#### Go пример:

```go
// sliding_window_test.go
func BenchmarkMaxSumSubarray(b *testing.B) {
    arr := make([]int, 10000)
    for i := range arr {
        arr[i] = i
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        maxSumSubarrayFixedK(arr, 100)
    }
}
```

**Запуск**:
```bash
go test -bench=. -benchmem
```

### Примеры профилирования

#### Анализ производительности фиксированного окна:

**Rust вывод `cargo bench`**:
```
sliding_window_k_100    time:   [1.2345 µs 1.2456 µs 1.2567 µs]
                        change: [-2.3456% +0.1234% +2.5678%] (p = 0.95)
```

**Go вывод `go test -bench`**:
```
BenchmarkMaxSumSubarray-8    1000000    1234 ns/op    0 B/op    0 allocs/op
```

**Интерпретация**:
- `1234 ns/op` - среднее время на операцию
- `0 B/op` - нет аллокаций в куче
- `0 allocs/op` - нет вызовов аллокатора

#### Анализ памяти переменного окна:

**Rust с valgrind**:
```
HEAP SUMMARY:
    total heap usage: 1 allocs, 1 frees, 1,024 bytes allocated
```

**Go с pprof**:
```
(pprof) top
      flat  flat%   sum%        cum   cum%
    50.00% 50.00% 50.00%     50.00% 50.00%  main.makeMap
```

### Интерпретация результатов

1. **Время выполнения**: Сравнивайте с наивным подходом
2. **Аллокации**: Идеально - 0 аллокаций в горячем пути
3. **Использование памяти**: Минимизируйте пиковое использование
4. **Узкие места**: Ищите функции, занимающие >10% времени

## Тестирование

### Стратегии тестирования

1. **Unit-тесты**: Тестирование отдельных функций
2. **Граничные случаи**: Пустые данные, один элемент, максимальные значения
3. **Стресс-тесты**: Большие объемы данных
4. **Property-based тестирование**: Автоматическая генерация тестовых данных

### Примеры тестов для Sliding Window

#### Rust тесты:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_max_sum_fixed_k_basic() {
        let arr = vec![2, 1, 5, 1, 3, 2];
        assert_eq!(max_sum_subarray_fixed_k(&arr, 3), 9);
    }

    #[test]
    fn test_max_sum_fixed_k_empty() {
        let arr = vec![];
        assert_eq!(max_sum_subarray_fixed_k(&arr, 3), 0);
    }

    #[test]
    fn test_max_sum_fixed_k_single_element() {
        let arr = vec![5];
        assert_eq!(max_sum_subarray_fixed_k(&arr, 1), 5);
    }

    #[test]
    fn test_longest_substring_no_repeats() {
        assert_eq!(longest_substring_no_repeats("abcabcbb"), 3);
        assert_eq!(longest_substring_no_repeats("bbbbb"), 1);
        assert_eq!(longest_substring_no_repeats("pwwkew"), 3);
    }

    // Property-based тест с proptest
    #[cfg(feature = "proptest")]
    proptest! {
        #[test]
        fn test_max_sum_property(arr in prop::collection::vec(-1000i32..1000, 1..1000)) {
            let k = (arr.len() / 2).max(1);
            let result = max_sum_subarray_fixed_k(&arr, k);
            // Свойство: результат должен быть >= любого элемента
            assert!(result >= *arr.iter().max().unwrap());
        }
    }
}
```

#### Go тесты:

```go
func TestMaxSumSubarrayFixedK(t *testing.T) {
    tests := []struct {
        name string
        arr  []int
        k    int
        want int
    }{
        {"basic", []int{2, 1, 5, 1, 3, 2}, 3, 9},
        {"empty", []int{}, 3, 0},
        {"single", []int{5}, 1, 5},
        {"all_negative", []int{-1, -2, -3}, 2, -3},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := maxSumSubarrayFixedK(tt.arr, tt.k); got != tt.want {
                t.Errorf("maxSumSubarrayFixedK() = %v, want %v", got, tt.want)
            }
        })
    }
}

func TestLongestSubstringNoRepeats(t *testing.T) {
    tests := []struct {
        s    string
        want int
    }{
        {"abcabcbb", 3},
        {"bbbbb", 1},
        {"pwwkew", 3},
        {"", 0},
        {"a", 1},
    }

    for _, tt := range tests {
        t.Run(tt.s, func(t *testing.T) {
            if got := longestSubstringNoRepeats(tt.s); got != tt.want {
                t.Errorf("longestSubstringNoRepeats() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### Запуск тестов

#### Rust:

```bash
# Запуск всех тестов
cargo test

# Запуск с выводом
cargo test -- --nocapture

# Запуск конкретного теста
cargo test test_max_sum_fixed_k_basic

# Запуск бенчмарков
cargo bench
```

#### Go:

```bash
# Запуск всех тестов
go test

# Запуск с выводом
go test -v

# Запуск конкретного теста
go test -run TestMaxSumSubarrayFixedK

# Запуск бенчмарков
go test -bench=. -benchmem

# Запуск с профилированием
go test -bench=. -cpuprofile=cpu.prof -memprofile=mem.prof
```

### Бенчмарки

#### Rust бенчмарк с criterion:

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};

fn sliding_window_benchmark(c: &mut Criterion) {
    let sizes = vec![100, 1000, 10000, 100000];
    
    let mut group = c.benchmark_group("sliding_window");
    for size in sizes {
        let arr: Vec<i32> = (0..size).collect();
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            &arr,
            |b, arr| {
                b.iter(|| max_sum_subarray_fixed_k(black_box(arr), 10));
            },
        );
    }
    group.finish();
}

criterion_group!(benches, sliding_window_benchmark);
criterion_main!(benches);
```

#### Go бенчмарк:

```go
func BenchmarkSlidingWindowSizes(b *testing.B) {
    sizes := []int{100, 1000, 10000, 100000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            arr := make([]int, size)
            for i := range arr {
                arr[i] = i
            }
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                maxSumSubarrayFixedK(arr, 10)
            }
        })
    }
}
```

## Примеры кода

См. файлы:
- [Rust примеры](./rust/examples.rs)
- [Go примеры](./go/examples.go)

## Дополнительные ресурсы

- [Grokking the Coding Interview: Sliding Window Pattern](https://www.educative.io/courses/grokking-the-coding-interview) - Интерактивный курс
- [LeetCode Sliding Window Problems](https://leetcode.com/tag/sliding-window/) - Коллекция задач
- [Wikipedia: Sliding Window Protocol](https://en.wikipedia.org/wiki/Sliding_window_protocol) - Исторический контекст

