package pipelines

import (
	"testing"
	"time"
)

func TestTTLCache(t *testing.T) {
	t.Run("get/set round trip", func(t *testing.T) {
		c := newTTLCache[string]()
		c.set("key", "value")

		got, ok := c.get("key")
		if !ok || got != "value" {
			t.Errorf("got %q, ok=%v, want value/true", got, ok)
		}
	})

	t.Run("miss returns false", func(t *testing.T) {
		c := newTTLCache[string]()
		_, ok := c.get("missing")
		if ok {
			t.Error("expected false for missing key")
		}
	})

	t.Run("expired entry returns false", func(t *testing.T) {
		c := newTTLCache[string]()
		c.mu.Lock()
		c.entries["expired"] = &ttlCacheEntry[string]{
			value:     "old",
			expiresAt: time.Now().Add(-time.Second),
		}
		c.mu.Unlock()

		_, ok := c.get("expired")
		if ok {
			t.Error("expected false for expired entry")
		}

		// entry should be cleaned up
		c.mu.Lock()
		_, exists := c.entries["expired"]
		c.mu.Unlock()
		if exists {
			t.Error("expired entry should have been deleted")
		}
	})

	t.Run("invalidate removes entry", func(t *testing.T) {
		c := newTTLCache[string]()
		c.set("key", "value")
		c.invalidate("key")

		_, ok := c.get("key")
		if ok {
			t.Error("expected false after invalidate")
		}
	})

	t.Run("evicts oldest when full", func(t *testing.T) {
		c := newTTLCache[int]()

		// Fill to maxCacheSize
		for i := range maxCacheSize {
			c.set("key-"+string(rune('a'+i%26))+string(rune('0'+i/26)), i)
		}

		// Manually set lastAccessed to make "oldest" entry the oldest
		c.mu.Lock()
		// Pick any key and make it clearly the oldest
		var someKey string
		for k := range c.entries {
			someKey = k
			break
		}
		c.entries[someKey].lastAccessed = time.Now().Add(-time.Hour)
		c.mu.Unlock()

		// Add one more — should evict the oldest
		c.set("new-key", 999)

		got, ok := c.get("new-key")
		if !ok || got != 999 {
			t.Error("new entry should exist")
		}

		c.mu.Lock()
		size := len(c.entries)
		c.mu.Unlock()
		if size > maxCacheSize {
			t.Errorf("cache size %d exceeds max %d", size, maxCacheSize)
		}
	})

	t.Run("overwrite existing key does not evict", func(t *testing.T) {
		c := newTTLCache[string]()
		c.set("key", "v1")
		c.set("key", "v2")

		got, ok := c.get("key")
		if !ok || got != "v2" {
			t.Errorf("got %q, want v2", got)
		}
	})
}

func TestPipelineCacheGetCachedVersionIDs(t *testing.T) {
	t.Run("found by pipeline ID", func(t *testing.T) {
		c := newPipelineCache()
		c.set("ns1", map[string]*DiscoveredPipeline{
			"type-a": {
				PipelineID:    "pid-1",
				AllVersionIDs: []string{"v1", "v2", "v3"},
			},
		})

		ids := c.getCachedVersionIDs("pid-1")
		if len(ids) != 3 {
			t.Fatalf("expected 3 IDs, got %d", len(ids))
		}
		if ids[0] != "v1" || ids[1] != "v2" || ids[2] != "v3" {
			t.Errorf("unexpected IDs: %v", ids)
		}
	})

	t.Run("not found returns nil", func(t *testing.T) {
		c := newPipelineCache()
		c.set("ns1", map[string]*DiscoveredPipeline{
			"type-a": {PipelineID: "pid-1", AllVersionIDs: []string{"v1"}},
		})

		ids := c.getCachedVersionIDs("pid-unknown")
		if ids != nil {
			t.Errorf("expected nil, got %v", ids)
		}
	})

	t.Run("empty version IDs returns nil", func(t *testing.T) {
		c := newPipelineCache()
		c.set("ns1", map[string]*DiscoveredPipeline{
			"type-a": {PipelineID: "pid-1", AllVersionIDs: nil},
		})

		ids := c.getCachedVersionIDs("pid-1")
		if ids != nil {
			t.Errorf("expected nil, got %v", ids)
		}
	})

	t.Run("skips expired entries", func(t *testing.T) {
		c := newPipelineCache()
		c.set("ns1", map[string]*DiscoveredPipeline{
			"type-a": {PipelineID: "pid-1", AllVersionIDs: []string{"v1"}},
		})

		// Expire the entry
		c.mu.Lock()
		c.entries["ns1"].expiresAt = time.Now().Add(-time.Second)
		c.mu.Unlock()

		ids := c.getCachedVersionIDs("pid-1")
		if ids != nil {
			t.Errorf("expected nil for expired entry, got %v", ids)
		}
	})

	t.Run("caps at maxVersionIDs", func(t *testing.T) {
		c := newPipelineCache()
		manyIDs := make([]string, maxVersionIDs+50)
		for i := range manyIDs {
			manyIDs[i] = "v" + string(rune('0'+i%10))
		}
		c.set("ns1", map[string]*DiscoveredPipeline{
			"type-a": {PipelineID: "pid-1", AllVersionIDs: manyIDs},
		})

		ids := c.getCachedVersionIDs("pid-1")
		if len(ids) != maxVersionIDs {
			t.Errorf("expected %d IDs, got %d", maxVersionIDs, len(ids))
		}
	})

	t.Run("returns copy not reference", func(t *testing.T) {
		c := newPipelineCache()
		c.set("ns1", map[string]*DiscoveredPipeline{
			"type-a": {PipelineID: "pid-1", AllVersionIDs: []string{"v1", "v2"}},
		})

		ids := c.getCachedVersionIDs("pid-1")
		ids[0] = "mutated"

		ids2 := c.getCachedVersionIDs("pid-1")
		if ids2[0] != "v1" {
			t.Error("mutation should not affect cached data")
		}
	})
}
