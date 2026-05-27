package pipelines

import (
	"sync"
	"time"
)

const (
	cacheTTL      = 5 * time.Minute
	maxCacheSize  = 1000
	maxVersionIDs = 100
)

// ttlCache is a generic TTL cache with LRU eviction.
type ttlCache[V any] struct {
	mu      sync.Mutex
	entries map[string]*ttlCacheEntry[V]
}

type ttlCacheEntry[V any] struct {
	value        V
	expiresAt    time.Time
	lastAccessed time.Time
}

func newTTLCache[V any]() *ttlCache[V] {
	return &ttlCache[V]{entries: make(map[string]*ttlCacheEntry[V])}
}

func (c *ttlCache[V]) get(key string) (V, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	entry, ok := c.entries[key]
	if !ok {
		var zero V
		return zero, false
	}
	if time.Now().After(entry.expiresAt) {
		delete(c.entries, key)
		var zero V
		return zero, false
	}
	entry.lastAccessed = time.Now()
	return entry.value, true
}

func (c *ttlCache[V]) set(key string, value V) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.entries) >= maxCacheSize {
		if _, exists := c.entries[key]; !exists {
			c.evictOldest()
		}
	}

	now := time.Now()
	c.entries[key] = &ttlCacheEntry[V]{
		value:        value,
		expiresAt:    now.Add(cacheTTL),
		lastAccessed: now,
	}
}

func (c *ttlCache[V]) invalidate(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.entries, key)
}

// evictOldest removes the least recently accessed entry. Must be called with lock held.
func (c *ttlCache[V]) evictOldest() {
	var oldestKey string
	var oldestTime time.Time

	for key, entry := range c.entries {
		if oldestKey == "" || entry.lastAccessed.Before(oldestTime) {
			oldestKey = key
			oldestTime = entry.lastAccessed
		}
	}

	if oldestKey != "" {
		delete(c.entries, oldestKey)
	}
}

// pipelineCache caches discovered pipelines by namespace with pipeline-specific lookup.
type pipelineCache struct {
	*ttlCache[map[string]*DiscoveredPipeline]
}

func newPipelineCache() *pipelineCache {
	return &pipelineCache{newTTLCache[map[string]*DiscoveredPipeline]()}
}

// getCachedVersionIDs searches all cached namespaces for a pipeline by ID and returns
// its version IDs, avoiding an API call when discovery already fetched the versions.
func (c *pipelineCache) getCachedVersionIDs(pipelineID string) []string {
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, entry := range c.entries {
		if time.Now().After(entry.expiresAt) {
			continue
		}
		for _, dp := range entry.value {
			if dp.PipelineID == pipelineID && len(dp.AllVersionIDs) > 0 {
				n := min(len(dp.AllVersionIDs), maxVersionIDs)
				result := make([]string, n)
				copy(result, dp.AllVersionIDs[:n])
				return result
			}
		}
	}
	return nil
}

// dspaCache caches discovered DSPA info by namespace.
type dspaCache = ttlCache[*DiscoveredDSPA]

func newDSPACache() *dspaCache {
	return newTTLCache[*DiscoveredDSPA]()
}
