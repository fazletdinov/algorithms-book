package miniredis

import (
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestSnapshotRoundTrip(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	store, _ := newStoreForTest(start)
	store.data["foo"] = "bar"
	store.data["baz"] = "qux"
	store.expire["foo"] = start.Add(1 * time.Hour)
	store.zsets = map[string]map[string]int64{
		"board": {"alice": 10, "bob": 20},
	}

	dir := t.TempDir()
	path := filepath.Join(dir, "snap.rdb")
	if err := SaveSnapshot(store, path); err != nil {
		t.Fatalf("SaveSnapshot() error = %v", err)
	}

	loaded, _ := newStoreForTest(start)
	if err := LoadSnapshot(loaded, path); err != nil {
		t.Fatalf("LoadSnapshot() error = %v", err)
	}

	if len(loaded.data) != 2 || loaded.data["foo"] != "bar" || loaded.data["baz"] != "qux" {
		t.Errorf("data после загрузки = %v, want foo=bar baz=qux", loaded.data)
	}
	wantExp := start.Add(1 * time.Hour)
	if gotExp, ok := loaded.expire["foo"]; !ok || !gotExp.Equal(wantExp) {
		t.Errorf("expire[foo] = %v, ok=%v, want %v", gotExp, ok, wantExp)
	}
	if _, hasExp := loaded.expire["baz"]; hasExp {
		t.Errorf("expire[baz] не должен существовать — baz без TTL")
	}
	if score := loaded.zsets["board"]["alice"]; score != 10 {
		t.Errorf("zsets[board][alice] = %d, want 10", score)
	}
	if score := loaded.zsets["board"]["bob"]; score != 20 {
		t.Errorf("zsets[board][bob] = %d, want 20", score)
	}
	if _, ok := loaded.live("foo"); !ok {
		t.Errorf("foo должен быть жив сразу после загрузки (TTL ещё не истёк)")
	}
}

func TestLoadSnapshotMissingFileIsNotError(t *testing.T) {
	store, _ := newStoreForTest(time.Now())
	store.data["existing"] = "value"

	dir := t.TempDir()
	path := filepath.Join(dir, "does-not-exist.rdb")
	if err := LoadSnapshot(store, path); err != nil {
		t.Fatalf("LoadSnapshot() на несуществующем файле error = %v, want nil", err)
	}
	if store.data["existing"] != "value" {
		t.Errorf("LoadSnapshot() на несуществующем файле не должен трогать store")
	}
}

// TestSnapshotSaveIsAtomic не описывает требование атомарности — гоняет его.
// Одна горутина непрерывно перезаписывает снапшот (SaveSnapshot), другая —
// непрерывно читает тот же файл (LoadSnapshot) в СВОЙ собственный Store (эта
// гонка — про файловую систему, не про разделяемую память, поэтому у каждого
// чтения своя копия, никакого пересечения со stage 6). Если SaveSnapshot
// пишет во временный файл и делает os.Rename — любое конкурентное открытие
// path увидит либо целиком старую, либо целиком новую версию: НИ ОДНОЙ
// ошибки декодирования быть не должно, сколько раз ни гоняй. Если вместо
// этого пишет в path напрямую (os.WriteFile/os.Create) — открытие файла в
// момент между усечением и записью почти гарантированно поймает пустой или
// оборванный файл: gob.Decode вернёт ошибку.
func TestSnapshotSaveIsAtomic(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "race.rdb")

	writer, _ := newStoreForTest(time.Now())
	for i := range 500 {
		writer.data[fmt.Sprintf("key%d", i)] = strings.Repeat("x", 100)
	}
	if err := SaveSnapshot(writer, path); err != nil {
		t.Fatalf("исходный SaveSnapshot() error = %v", err)
	}

	const rounds = 300
	var wg sync.WaitGroup
	corrupted := make(chan string, rounds)

	wg.Add(1)
	go func() {
		defer wg.Done()
		for range rounds {
			if err := SaveSnapshot(writer, path); err != nil {
				corrupted <- "SaveSnapshot: " + err.Error()
			}
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		for range rounds {
			reader, _ := newStoreForTest(time.Now())
			if err := LoadSnapshot(reader, path); err != nil {
				corrupted <- "LoadSnapshot: " + err.Error()
			}
		}
	}()

	wg.Wait()
	close(corrupted)
	for msg := range corrupted {
		t.Errorf("гонка SAVE/чтение файла поймала сбой: %v — SaveSnapshot не атомарна"+
			" (пишет в path напрямую вместо временный файл + os.Rename)", msg)
	}
}

// TestDispatchSave — команда SAVE как её видит клиент: путь аргументом (без
// аргумента она пишет в "dump.rdb" рядом с процессом, что в тесте только
// мусорило бы рабочим каталогом), ответ +OK и файл, который реально читается
// обратно. Отдельно — арность: лишние аргументы обязаны стать ошибкой, а не
// молча проигнорироваться.
func TestDispatchSave(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	store, _ := newStoreForTest(start)
	store.data["foo"] = "bar"

	dir := t.TempDir()
	path := filepath.Join(dir, "explicit.rdb")

	if got, want := writeReply(t, Dispatch(store, []string{"SAVE", path})), "+OK\r\n"; got != want {
		t.Fatalf("Dispatch(SAVE %s) wire = %q, want %q", path, got, want)
	}

	loaded, _ := newStoreForTest(start)
	if err := LoadSnapshot(loaded, path); err != nil {
		t.Fatalf("LoadSnapshot() после SAVE error = %v", err)
	}
	if loaded.data["foo"] != "bar" {
		t.Errorf("после SAVE + LoadSnapshot data[foo] = %q, want \"bar\"", loaded.data["foo"])
	}

	got := writeReply(t, Dispatch(store, []string{"SAVE", path, "лишний"}))
	want := "-ERR wrong number of arguments for 'save' command\r\n"
	if got != want {
		t.Errorf("Dispatch(SAVE с двумя аргументами) wire = %q, want %q", got, want)
	}
}
