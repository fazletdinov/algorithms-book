//go:build solution

package miniredis

import (
	"encoding/gob"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/fazletdinov/algorithms-book/exercises/ratelimiter"
)

// snapshotData — то, что реально идёт на диск. НЕ Store целиком: у Store
// есть мьютекс (незачем и нельзя сериализовать) и неэкспортированные поля
// (gob их не увидит без ручного (Un)GobEncode); отдельный тип с
// экспортируемыми полями держит формат снапшота стабильным независимо от
// того, как устроен Store внутри.
type snapshotData struct {
	Data   map[string]string
	Expire map[string]time.Time
	ZSets  map[string]map[string]int64
}

func dispatchSet(store *Store, args []string) Reply {
	if len(args) != 2 {
		return Err("ERR wrong number of arguments for 'set' command")
	}
	store.mu.Lock()
	store.data[args[0]] = args[1]
	delete(store.expire, args[0])
	store.mu.Unlock()
	return SimpleString("OK")
}

func dispatchGet(store *Store, args []string) Reply {
	if len(args) != 1 {
		return Err("ERR wrong number of arguments for 'get' command")
	}
	store.mu.Lock()
	value, ok := store.live(args[0])
	store.mu.Unlock()
	if !ok {
		return NilBulk()
	}
	return BulkString(value)
}

func dispatchDel(store *Store, args []string) Reply {
	if len(args) == 0 {
		return Err("ERR wrong number of arguments for 'del' command")
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	n := 0
	for _, key := range args {
		if _, ok := store.live(key); ok {
			delete(store.data, key)
			delete(store.expire, key)
			n++
		}
	}
	return Integer(int64(n))
}

func dispatchExpire(store *Store, args []string) Reply {
	if len(args) != 2 {
		return Err("ERR wrong number of arguments for 'expire' command")
	}
	seconds, err := strconv.Atoi(args[1])
	if err != nil {
		return Err("ERR value is not an integer or out of range")
	}
	key := args[0]

	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.live(key); !ok {
		return Integer(0)
	}
	if seconds <= 0 {
		delete(store.data, key)
		delete(store.expire, key)
		return Integer(1)
	}
	store.expire[key] = store.now().Add(time.Duration(seconds) * time.Second)
	return Integer(1)
}

func dispatchTTL(store *Store, args []string) Reply {
	if len(args) != 1 {
		return Err("ERR wrong number of arguments for 'ttl' command")
	}
	key := args[0]

	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.live(key); !ok {
		return Integer(-2)
	}
	exp, hasTTL := store.expire[key]
	if !hasTTL {
		return Integer(-1)
	}
	return Integer(int64(exp.Sub(store.now()).Seconds()))
}

func dispatchZAdd(store *Store, args []string) Reply {
	if len(args) < 3 || (len(args)-1)%2 != 0 {
		return Err("ERR wrong number of arguments for 'zadd' command")
	}
	key := args[0]
	pairs := args[1:]

	type scoreMember struct {
		score  int64
		member string
	}
	parsed := make([]scoreMember, 0, len(pairs)/2)
	for i := 0; i+1 < len(pairs); i += 2 {
		score, err := strconv.ParseInt(pairs[i], 10, 64)
		if err != nil {
			return Err("ERR value is not an integer or out of range")
		}
		parsed = append(parsed, scoreMember{score: score, member: pairs[i+1]})
	}

	store.mu.Lock()
	defer store.mu.Unlock()
	zset, ok := store.zsets[key]
	if !ok {
		zset = make(map[string]int64)
		store.zsets[key] = zset
	}
	added := 0
	for _, sm := range parsed {
		if _, exists := zset[sm.member]; !exists {
			added++
		}
		zset[sm.member] = sm.score
	}
	return Integer(int64(added))
}

func dispatchZScore(store *Store, args []string) Reply {
	if len(args) != 2 {
		return Err("ERR wrong number of arguments for 'zscore' command")
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	zset, ok := store.zsets[args[0]]
	if !ok {
		return NilBulk()
	}
	score, ok := zset[args[1]]
	if !ok {
		return NilBulk()
	}
	return BulkString(strconv.FormatInt(score, 10))
}

func dispatchZRange(store *Store, args []string) Reply {
	if len(args) != 3 {
		return Err("ERR wrong number of arguments for 'zrange' command")
	}
	start, err1 := strconv.Atoi(args[1])
	stop, err2 := strconv.Atoi(args[2])
	if err1 != nil || err2 != nil {
		return Err("ERR value is not an integer or out of range")
	}

	store.mu.Lock()
	members := zsetOrdered(store.zsets[args[0]])
	store.mu.Unlock()

	n := len(members)
	if start < 0 {
		start += n
	}
	if stop < 0 {
		stop += n
	}
	if start < 0 {
		start = 0
	}
	if stop >= n {
		stop = n - 1
	}
	if n == 0 || start > stop || start >= n {
		return Array(nil)
	}

	items := make([]Reply, 0, stop-start+1)
	for _, m := range members[start : stop+1] {
		items = append(items, BulkString(m))
	}
	return Array(items)
}

func dispatchZRank(store *Store, args []string) Reply {
	if len(args) != 2 {
		return Err("ERR wrong number of arguments for 'zrank' command")
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	zset, ok := store.zsets[args[0]]
	if !ok {
		return NilBulk()
	}
	if _, ok := zset[args[1]]; !ok {
		return NilBulk()
	}
	for i, m := range zsetOrdered(zset) {
		if m == args[1] {
			return Integer(int64(i))
		}
	}
	return NilBulk() // недостижимо при консистентном zset, но не паникуем
}

func RateLimitReply(bucket *ratelimiter.TokenBucket, nowMs int64) Reply {
	if bucket.Allow(nowMs) {
		return nil
	}
	return Err("ERR rate limit exceeded, try again later")
}

func SaveSnapshot(store *Store, path string) error {
	store.mu.Lock()
	snap := snapshotData{
		Data:   make(map[string]string, len(store.data)),
		Expire: make(map[string]time.Time, len(store.expire)),
		ZSets:  make(map[string]map[string]int64, len(store.zsets)),
	}
	for k, v := range store.data {
		snap.Data[k] = v
	}
	for k, v := range store.expire {
		snap.Expire[k] = v
	}
	for k, zset := range store.zsets {
		copyZset := make(map[string]int64, len(zset))
		for member, score := range zset {
			copyZset[member] = score
		}
		snap.ZSets[k] = copyZset
	}
	store.mu.Unlock()

	tmp, err := os.CreateTemp(filepath.Dir(path), filepath.Base(path)+".*.tmp")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	if err := gob.NewEncoder(tmp).Encode(snap); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpPath)
		return err
	}
	if err := os.Rename(tmpPath, path); err != nil {
		os.Remove(tmpPath)
		return err
	}
	return nil
}

func LoadSnapshot(store *Store, path string) error {
	f, err := os.Open(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}
	defer f.Close()

	var snap snapshotData
	if err := gob.NewDecoder(f).Decode(&snap); err != nil {
		return err
	}

	store.mu.Lock()
	defer store.mu.Unlock()
	store.data = snap.Data
	store.expire = snap.Expire
	store.zsets = snap.ZSets
	if store.data == nil {
		store.data = make(map[string]string)
	}
	if store.expire == nil {
		store.expire = make(map[string]time.Time)
	}
	if store.zsets == nil {
		store.zsets = make(map[string]map[string]int64)
	}
	return nil
}

func dispatchSave(store *Store, args []string) Reply {
	if len(args) > 1 {
		return Err("ERR wrong number of arguments for 'save' command")
	}
	path := "dump.rdb"
	if len(args) == 1 {
		path = args[0]
	}
	if err := SaveSnapshot(store, path); err != nil {
		return Err("ERR " + err.Error())
	}
	return SimpleString("OK")
}
