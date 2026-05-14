package pipelines

import (
	"sync"
	"time"
)

const (
	cacheTTL       = 5 * time.Minute
	maxCacheSize   = 1000
	maxVersionIDs  = 100
)

type cacheEntry struct {
	pipelines    map[string]*DiscoveredPipeline
	expiresAt    time.Time
	lastAccessed time.Time
}

// pipelineCache is an in-memory LRU cache for discovered pipelines.
// Key: namespace (one DSPA per namespace)
type pipelineCache struct {
	mu      sync.RWMutex
	entries map[string]*cacheEntry
}

func newPipelineCache() *pipelineCache {
	return &pipelineCache{
		entries: make(map[string]*cacheEntry),
	}
}


func (c *pipelineCache) get(key string) map[string]*DiscoveredPipeline {
	c.mu.Lock()
	defer c.mu.Unlock()

	entry, exists := c.entries[key]
	if !exists {
		return nil
	}

	if time.Now().After(entry.expiresAt) {
		delete(c.entries, key)
		return nil
	}

	entry.lastAccessed = time.Now()
	return entry.pipelines
}

func (c *pipelineCache) set(key string, pipelines map[string]*DiscoveredPipeline) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.entries) >= maxCacheSize {
		if _, exists := c.entries[key]; !exists {
			c.evictOldest()
		}
	}

	now := time.Now()
	c.entries[key] = &cacheEntry{
		pipelines:    pipelines,
		expiresAt:    now.Add(cacheTTL),
		lastAccessed: now,
	}
}

func (c *pipelineCache) invalidate(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.entries, key)
}

// getCachedVersionIDs looks up pre-fetched version IDs for a pipeline ID.
// Returns nil on cache miss, letting the caller fall back to an API call.
// Returns a defensive copy to prevent mutation of cached data.
func (c *pipelineCache) getCachedVersionIDs(pipelineID string) []string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	for _, entry := range c.entries {
		if time.Now().After(entry.expiresAt) {
			continue
		}
		for _, dp := range entry.pipelines {
			if dp.PipelineID == pipelineID && len(dp.AllVersionIDs) > 0 {
				n := len(dp.AllVersionIDs)
				if n > maxVersionIDs {
					n = maxVersionIDs
				}
				result := make([]string, n)
				copy(result, dp.AllVersionIDs[:n])
				return result
			}
		}
	}
	return nil
}

// dspaCache caches discovered DSPA base URLs by namespace.
type dspaCache struct {
	mu      sync.RWMutex
	entries map[string]*dspaCacheEntry
}

type dspaCacheEntry struct {
	baseURL      string
	expiresAt    time.Time
	lastAccessed time.Time
}

func newDSPACache() *dspaCache {
	return &dspaCache{
		entries: make(map[string]*dspaCacheEntry),
	}
}

func (c *dspaCache) get(namespace string) (string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	entry, exists := c.entries[namespace]
	if !exists {
		return "", false
	}
	if time.Now().After(entry.expiresAt) {
		delete(c.entries, namespace)
		return "", false
	}
	entry.lastAccessed = time.Now()
	return entry.baseURL, true
}

func (c *dspaCache) set(namespace, baseURL string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.entries) >= maxCacheSize {
		if _, exists := c.entries[namespace]; !exists {
			c.evictOldest()
		}
	}

	now := time.Now()
	c.entries[namespace] = &dspaCacheEntry{
		baseURL:      baseURL,
		expiresAt:    now.Add(cacheTTL),
		lastAccessed: now,
	}
}

func (c *dspaCache) evictOldest() {
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

// evictOldest removes the least recently accessed entry. Must be called with lock held.
func (c *pipelineCache) evictOldest() {
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
