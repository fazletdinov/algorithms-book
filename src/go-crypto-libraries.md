# 🔐 Криптография на практике: библиотеки Go

> Как это устроено внутри (модульная арифметика, RSA, Миллер–Рабин), разобрано в главе
> [«Криптография»](cryptography.md). Здесь — только что брать из библиотек в рабочем коде и какие
> ошибки делают чаще всего. Своих реализаций здесь нет.

## Два правила важнее всех библиотек

1. **Не пиши свою криптографию.** Бери `crypto/*` из стандартной библиотеки и `golang.org/x/crypto`:
   их проверяли годами (константное время, фаззинг, аудиты). Почему самодельное ломается —
   [«Цена на практике»](cryptography.md#-цена-на-практике).
2. **Пароли хешируют, а не шифруют.** Шифр обратим: украли ключ — прочитали все пароли. Нужен
   медленный хеш с солью (`bcrypt`, `argon2id`), а не AES и не SHA-256.

## Карта: задача → пакет

| Задача | Пакет | Что брать |
|---|---|---|
| Ключи, токены, соли, nonce | [`crypto/rand`](https://pkg.go.dev/crypto/rand) | `rand.Read`, `rand.Text` — **не** `math/rand` |
| **Хеш пароля** | [`x/crypto/bcrypt`](https://pkg.go.dev/golang.org/x/crypto/bcrypt), [`x/crypto/argon2`](https://pkg.go.dev/golang.org/x/crypto/argon2) | `bcrypt` (проще) или `argon2.IDKey` |
| Подпись сообщения общим ключом (MAC) | [`crypto/hmac`](https://pkg.go.dev/crypto/hmac) | `hmac.New(sha256.New, key)`, `hmac.Equal` |
| Шифрование данных | [`crypto/cipher`](https://pkg.go.dev/crypto/cipher) + [`crypto/aes`](https://pkg.go.dev/crypto/aes) | **AES-GCM** |
| Хеш для целостности файла | [`crypto/sha256`](https://pkg.go.dev/crypto/sha256) | `sha256.Sum256` |
| Цифровая подпись | [`crypto/ed25519`](https://pkg.go.dev/crypto/ed25519) | Ed25519 по умолчанию; RSA — только с PSS/OAEP |
| Сравнение секретов | [`crypto/subtle`](https://pkg.go.dev/crypto/subtle) | `ConstantTimeCompare` — **не** `==` |
| HTTPS | [`crypto/tls`](https://pkg.go.dev/crypto/tls) | готовый стек через `net/http` |
| JWT | [`github.com/golang-jwt/jwt/v5`](https://pkg.go.dev/github.com/golang-jwt/jwt/v5) | `ParseWithClaims` с `WithValidMethods` |

`x/crypto` — отдельный модуль, не stdlib: `go get golang.org/x/crypto`.

## Случайность: только `crypto/rand`

`math/rand` выдаёт последовательность, однозначно заданную сидом: по нескольким токенам её
восстанавливают и предсказывают следующие. Всё секретное берётся из `crypto/rand`.

```go
token := rand.Text() // Go 1.24+: строка base32, не меньше 128 бит случайности

key := make([]byte, 32)
rand.Read(key) // с Go 1.24 никогда не возвращает ошибку: при сбое ОС программа падает
```

Это не «проигнорированная ошибка»: документация `rand.Read` с Go 1.24 обещает, что ошибки не
будет никогда. В Go 1.23 и раньше ошибку проверяй.

## Хеш пароля: `bcrypt` или `argon2id`

Быстрый SHA-256 перебирают миллиардами вариантов в секунду. Медленный хеш делает каждую попытку
дорогой, а соль — разной для одинаковых паролей. `bcrypt` хранит соль и стоимость внутри хеша,
поэтому в БД кладут одну строку.

```go
func HashPassword(password string) ([]byte, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil { // например, пароль длиннее 72 байт — ErrPasswordTooLong
		return nil, fmt.Errorf("hash password: %w", err)
	}
	return hash, nil
}

func CheckPassword(hash []byte, password string) (bool, error) {
	err := bcrypt.CompareHashAndPassword(hash, []byte(password))
	if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		return false, nil // неверный пароль — не сбой
	}
	if err != nil {
		return false, fmt.Errorf("check password: %w", err) // битый хеш в БД
	}
	return true, nil
}
```

Различай «пароль не подошёл» и «хеш испорчен»: первое — ответ 401, второе — ошибка в логах.

**`argon2id`** ещё и требует много памяти — перебор на видеокартах дорожает сильнее. Обёртки
«сравни с хешем» у `x/crypto/argon2` нет: соль и параметры храни сам, сравнивай через `subtle`.

```go
const (
	argonTime    = 3
	argonMemory  = 64 * 1024 // КиБ = 64 МиБ: второй вариант RFC 9106 из документации IDKey
	argonThreads = 4
	argonKeyLen  = 32
)

salt := make([]byte, 16)
rand.Read(salt)
hash := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
// при входе: тот же IDKey с сохранённой солью, затем
ok := subtle.ConstantTimeCompare(got, hash) == 1
```

## HMAC: подпись общим ключом

HMAC доказывает, что сообщение пришло от владельца ключа и не изменено: подписи вебхуков,
ссылки «сбросить пароль», JWT с `HS256`.

```go
func Sign(key, msg []byte) []byte {
	m := hmac.New(sha256.New, key)
	m.Write(msg) // Write у hash.Hash по контракту не возвращает ошибку
	return m.Sum(nil)
}

func Verify(key, msg, tag []byte) bool {
	return hmac.Equal(Sign(key, msg), tag) // константное время, не bytes.Equal
}
```

`==` и `bytes.Equal` выходят на первом несовпавшем байте, и по времени ответа тег подбирают
побайтно. `hmac.Equal` и `subtle.ConstantTimeCompare` сравнивают все байты всегда.

## Шифрование: AES-GCM

AES-GCM шифрует **и** проверяет целостность одним тегом: подменённый шифртекст `Open` отвергнет
ошибкой. Главная опасность GCM — повтор nonce с тем же ключом: он раскрывает данные. С Go 1.24
`cipher.NewGCMWithRandomNonce` сам берёт случайный nonce на каждое сообщение и кладёт его перед
шифртекстом — повторить его по ошибке нельзя.

```go
func NewAEAD(key []byte) (cipher.AEAD, error) { // key — 16/24/32 байта: AES-128/192/256
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("aes: %w", err)
	}
	gcm, err := cipher.NewGCMWithRandomNonce(block)
	if err != nil {
		return nil, fmt.Errorf("gcm: %w", err)
	}
	return gcm, nil
}

func Encrypt(gcm cipher.AEAD, plaintext []byte) []byte {
	return gcm.Seal(nil, nil, plaintext, nil) // nonce ‖ шифртекст ‖ тег
}

func Decrypt(gcm cipher.AEAD, ct []byte) ([]byte, error) {
	pt, err := gcm.Open(nil, nil, ct, nil)
	if err != nil { // подмена или чужой ключ
		return nil, fmt.Errorf("decrypt: %w", err)
	}
	return pt, nil
}
```

Документация ограничивает такой режим 2³² сообщениями на ключ. Со старым `cipher.NewGCM` nonce
(`gcm.NonceSize()` байт) заполняешь из `crypto/rand` сам — на **каждое** сообщение. Блочный шифр
напрямую (`block.Encrypt` по блокам, режим ECB) не используй: одинаковые блоки дают одинаковый
шифртекст, узор данных виден.

## TLS: всё уже собрано

`https://` связывает всё сразу: обмен ключами по Диффи–Хеллману даёт общий секрет, сертификат и
подпись над рукопожатием доказывают, что сервер настоящий, а данные дальше идут быстрым AES-GCM.
Дорогая асимметрика работает один раз, дешёвая симметрика — на весь трафик. Шаги TLS 1.3:

<div class="algo-viz" data-viz="tls-handshake"></div>

В Go это `crypto/tls`, и собирать его руками не нужно:

```go
// сервер
if err := http.ListenAndServeTLS(":443", "cert.pem", "key.pem", handler); err != nil {
	return fmt.Errorf("serve https: %w", err)
}

// клиент: http.Client сам проверяет сертификат по системным CA
resp, err := http.Get("https://example.com")
if err != nil {
	return fmt.Errorf("get: %w", err)
}
defer resp.Body.Close()
```

`tls.Config` задаёт только политику: минимальную версию, проверку клиентских сертификатов.
**Никогда** не ставь `InsecureSkipVerify: true` в проде — это отключает проверку сертификата, и
посредник подменяет сервер незаметно.

## JWT: подписанный, а не зашифрованный

JWT — три части base64url через точку: `header.payload.signature`. Подпись считается над
`header.payload` (`HS256` — HMAC с общим секретом, `RS256`/`ES256` — асимметричная подпись).
Сервер верит payload только после проверки подписи. Сам payload читает кто угодно — это
base64, а не шифр: пароли туда не кладут.

```go
func Issue(secret []byte, userID string) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   userID,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}

func ParseUser(secret []byte, raw string) (string, error) {
	var claims jwt.RegisteredClaims
	_, err := jwt.ParseWithClaims(raw, &claims,
		func(*jwt.Token) (any, error) { return secret, nil },
		jwt.WithValidMethods([]string{"HS256"}), // против "alg":"none" и подмены RS256→HS256
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return "", fmt.Errorf("parse token: %w", err)
	}
	return claims.Subject, nil
}
```

Главные дыры JWT:

1. **Декодировать payload без проверки подписи** — любой допишет себе `"role":"admin"`.
2. **Не фиксировать `alg`** — проходит токен без подписи (`none`), а при путанице HS256/RS256
   атакующий подписывает токен публичным RSA-ключом как HMAC-секретом. Фиксируй список методов.
3. **Длинный `exp`** — токен нельзя отозвать до истечения. Короткий access-токен и refresh-токен,
   либо серверный список отзыва.

«Войти через Google» — OAuth 2.0 с PKCE (`golang.org/x/oauth2`): пароль видит только сервер
авторизации, приложение получает токен, а `id_token` в OIDC — тот же JWT с теми же правилами
проверки (плюс `iss` и `aud`).

<div class="algo-viz" data-viz="oauth-flow"></div>

## Главные ошибки

1. **`math/rand` для токенов, ключей, соли** — предсказуемо. Только `crypto/rand`.
2. **Пароль через SHA-256, MD5 или шифрование** — перебирается или расшифровывается. `bcrypt`/`argon2id`.
3. **Повтор nonce в AES-GCM** — раскрывает данные. `NewGCMWithRandomNonce` или свежий nonce из `crypto/rand`.
4. **ECB и самодельные режимы** — узор виден. Только AEAD (AES-GCM).
5. **Секреты через `==`** — атака по времени. `hmac.Equal`, `subtle.ConstantTimeCompare`.
6. **JWT без фиксированного `alg` или без проверки подписи** — подделка токена.
7. **`InsecureSkipVerify: true`** — HTTPS без проверки сервера.
8. **Ошибку крипто-вызова отбросили через `_`** — `aes.NewCipher` с ключом не той длины вернёт
   ошибку и `nil`, и паника случится далеко от причины (см. [«Ревью чужого кода»](code-review.md)).

## Связь с книгой

Те же идеи без библиотечной брони: [быстрое возведение по модулю](cryptography.md#-визуализация-modexp--ядро-rsa)
(ядро RSA и Диффи–Хеллмана), [Миллер–Рабин](cryptography.md#-визуализация-как-миллер--рабин-ловит-число-кармайкла)
(простые для ключей), [обратный по модулю](cryptography.md#1-расширенный-евклид-и-обратный-по-модулю).
RSA в Go считает не на `math/big`, а на своей длинной арифметике с константным временем (`crypto/internal/fips140/bigmod`) — [разбор](go-stdlib-structures.md#-разбор-на-чём-считает-rsa-в-go).

> 🌍 **Где это в настоящем коде** (Go 1.24)
>
> - [`ConstantTimeCompare`](https://github.com/golang/go/blob/go1.24.0/src/crypto/internal/fips140/subtle/constant_time.go) — XOR всех пар байтов копится в одну переменную, раннего выхода нет; `crypto/subtle` вызывает её.
> - [`hmac.Equal`](https://github.com/golang/go/blob/go1.24.0/src/crypto/hmac/hmac.go) — тот же `subtle.ConstantTimeCompare`.
> - [`rand.Read`](https://github.com/golang/go/blob/go1.24.0/src/crypto/rand/rand.go) — байты из генератора ОС; при сбое роняет программу, а не возвращает ошибку. Рядом — [`rand.Text`](https://github.com/golang/go/blob/go1.24.0/src/crypto/rand/text.go).
> - [`NewGCMWithRandomNonce`](https://github.com/golang/go/blob/go1.24.0/src/crypto/cipher/gcm.go) — AES-GCM со случайным nonce перед шифртекстом.

## 🧩 Задачи

Проверь понимание — выбери вариант, впиши ответ или расставь по порядку.

<div class="algo-challenge" data-type="choice" data-options="crypto/rand — криптографически стойкий источник|math/rand — быстрее и проще|time.Now().UnixNano() как сид для math/rand" data-answer="0" data-explain="Всё секретное (ключи, соли, nonce, токены сессий, CSRF) берётся только из crypto/rand. math/rand детерминирован от сида — его выход предсказуем, по нему восстанавливают токены.">
<div class="algo-challenge__q">Откуда брать случайные токены и ключи?</div>
</div>

<div class="algo-challenge" data-type="choice" data-options="Медленный хеш с солью: bcrypt или argon2id|Быстрый хеш SHA-256 с солью|AES-шифрование пароля секретным ключом" data-answer="0" data-explain="Пароль нельзя шифровать (шифр обратим — украли ключ, прочитали всё) и нельзя хешировать быстрым SHA-256 (перебирают миллиардами в секунду). Нужен намеренно медленный хеш с солью: bcrypt или argon2id.">
<div class="algo-challenge__q">Как правильно хранить пароли пользователей?</div>
</div>

<div class="algo-challenge" data-type="cloze" data-answer="уникальный" data-hint="Повтор его в GCM катастрофичен — раскрывает открытый текст." data-explain="Ключевое правило AES-GCM: nonce должен быть уникальным на каждое сообщение и браться из crypto/rand. Повтор nonce в GCM раскрывает открытый текст и ломает аутентичность.">
<div class="algo-challenge__q">Впиши слово:</div>
<pre class="algo-challenge__code">в AES-GCM nonce должен быть ______ на каждое сообщение</pre>
</div>

<div class="algo-challenge" data-type="predict" data-answer="16" data-hint="AES-128; размер ключа = длине в битах / 8." data-explain="aes.NewCipher принимает ключ 16/24/32 байта — это AES-128/192/256. Значит, AES-128 использует ключ ровно 16 байт.">
<div class="algo-challenge__q">Сколько байт занимает ключ AES-128?</div>
</div>

<div class="algo-challenge" data-type="choice" data-options="Жёстко зафиксировать ожидаемый alg при проверке подписи|Разрешить любой alg из заголовка, но проверять подпись тем ключом, что указан в токене|Отклонять токены с истёкшим exp — подделанный токен всё равно быстро протухнет" data-answer="0" data-explain="Если сервер не фиксирует alg, возможны атаки alg:none (токен без подписи) и путаница HS256/RS256 (атакующий подписывает по HS256, используя публичный RSA-ключ как HMAC-секрет). Всегда жёстко проверяй тип метода подписи.">
<div class="algo-challenge__q">Как защититься от атак «alg:none» и подмены RS256→HS256 в JWT?</div>
</div>

<div class="algo-challenge" data-type="ordering" data-items="ClientHello / ServerHello + обмен ключевыми share (ECDHE)|Сертификат (цепочка до CA) и CertificateVerify (подпись над рукопожатием)|Finished и переход на симметричный AES-GCM" data-hint="Сначала согласовать секрет, затем доказать подлинность, затем шифровать данные." data-explain="TLS 1.3 за один round-trip: (1) стороны обмениваются ECDHE-share и каждый вычисляет общий секрет, сам секрет по сети не идёт; (2) сервер шлёт сертификат (клиент проверяет цепочку до доверенного CA) и CertificateVerify — подпись приватным ключом над рукопожатием: именно она доказывает, что это не MITM, переславший чужой сертификат; (3) Finished и весь трафик шифруется быстрым AES-GCM.">
<div class="algo-challenge__q">Расставь шаги TLS 1.3-хендшейка по порядку:</div>
</div>
