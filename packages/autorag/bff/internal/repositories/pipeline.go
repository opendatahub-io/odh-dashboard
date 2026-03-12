package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	ps "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// TODO: Confirm caching architecture for shared ODH deployments
// This implementation uses in-memory caching which has the following considerations:
// 1. Memory usage: Each cached entry consumes memory; consider limits for multi-tenant deployments
// 2. Cache invalidation: Currently uses TTL-based expiration; may need event-based invalidation
// 3. Multi-instance: If multiple BFF instances run, each has its own cache (no shared state)
// 4. Shared deployments: In ODH shared environments, evaluate if distributed cache (Redis, etc.) is needed
// 5. Security: Ensure cache doesn't leak pipeline info across namespaces in multi-tenant scenarios
// Recommendation: Review with architecture team before production deployment

const (
	// pipelineCacheTTL is how long discovered pipeline info is cached
	// Set to 5 minutes to balance freshness vs API load
	pipelineCacheTTL = 5 * time.Minute

	// maxCacheEntries limits the number of cached pipelines to prevent unbounded memory growth
	// in multi-tenant deployments. When the cache reaches this limit, the least recently
	// accessed entry is evicted to make room for new entries.
	maxCacheEntries = 1000

	// defaultPipelineNamePrefix is the default prefix used when none is configured
	// TODO: Replace name-based identification with pipeline attribute/metadata
	defaultPipelineNamePrefix = "autorag"
)

// DiscoveredPipeline holds the discovered pipeline information
type DiscoveredPipeline struct {
	PipelineID        string
	PipelineVersionID string
	PipelineName      string
	Namespace         string
	DiscoveredAt      time.Time
}

// pipelineCacheEntry wraps a map of discovered pipelines with expiration and LRU tracking.
// The map key is the pipeline type (e.g. "autorag").
type pipelineCacheEntry struct {
	pipelines    map[string]*DiscoveredPipeline
	expiresAt    time.Time
	lastAccessed time.Time
}

// pipelineCache is a simple in-memory cache for discovered pipelines
// Key: composite "pipelineServerBaseURL:namespace", Value: map of discovered pipeline info by type
type pipelineCache struct {
	mu      sync.RWMutex
	entries map[string]*pipelineCacheEntry
}

// Global cache instance (singleton)
// TODO: Consider dependency injection for better testability
var globalPipelineCache = &pipelineCache{
	entries: make(map[string]*pipelineCacheEntry),
}

// get retrieves cached pipelines for a namespace if still valid.
// Updates the last accessed time for LRU eviction.
func (c *pipelineCache) get(key string) map[string]*DiscoveredPipeline {
	c.mu.Lock()
	defer c.mu.Unlock()

	entry, exists := c.entries[key]
	if !exists {
		return nil
	}

	// Check if entry has expired
	if time.Now().After(entry.expiresAt) {
		delete(c.entries, key)
		return nil
	}

	// Update last accessed time for LRU tracking
	entry.lastAccessed = time.Now()

	return entry.pipelines
}

// set stores discovered pipelines in the cache.
// Evicts the least recently accessed entry if cache is at capacity.
func (c *pipelineCache) set(key string, pipelines map[string]*DiscoveredPipeline) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// If at capacity and this is a new entry (not an update), evict oldest
	if len(c.entries) >= maxCacheEntries {
		if _, exists := c.entries[key]; !exists {
			c.evictOldest()
		}
	}

	now := time.Now()
	c.entries[key] = &pipelineCacheEntry{
		pipelines:    pipelines,
		expiresAt:    now.Add(pipelineCacheTTL),
		lastAccessed: now,
	}
}

// invalidate removes a cached entry for a key
func (c *pipelineCache) invalidate(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.entries, key)
}

// evictOldest removes the least recently accessed entry from the cache
// Must be called with lock held
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

// PipelineRepository handles pipeline discovery logic
type PipelineRepository struct{}

// NewPipelineRepository creates a new pipeline repository
func NewPipelineRepository() *PipelineRepository {
	return &PipelineRepository{}
}

// DiscoverNamedPipelines discovers multiple managed pipelines in the given namespace,
// one per entry in the definitions map (pipeline type key → name prefix).
//
// This method:
//  1. Checks the in-memory cache (5-minute TTL) for a previously discovered result
//  2. For each definition, calls discoverOnePipeline
//  3. Builds a partial result map — missing keys mean the pipeline was not found
//  4. Caches the partial result for future requests
//
// Parameters:
//   - client: Pipeline Server client interface
//   - ctx: Request context
//   - namespace: Kubernetes namespace to search in
//   - pipelineServerBaseURL: Base URL of the pipeline server (used in cache key)
//   - definitions: map from pipeline type key to name prefix (e.g. {"autorag": "autorag"})
//
// Returns:
//   - map[string]*DiscoveredPipeline: partial map; missing key means pipeline not found
//   - error: non-nil only on API failure (hard error)
func (r *PipelineRepository) DiscoverNamedPipelines(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	namespace string,
	pipelineServerBaseURL string,
	definitions map[string]string,
) (map[string]*DiscoveredPipeline, error) {
	if client == nil {
		return nil, fmt.Errorf("pipeline server client is nil")
	}

	if namespace == "" {
		return nil, fmt.Errorf("namespace is required for pipeline discovery")
	}

	// Build a composite cache key to prevent cross-tenant leakage
	cacheKey := fmt.Sprintf("%s:%s", pipelineServerBaseURL, namespace)

	// Check cache first
	if cached := globalPipelineCache.get(cacheKey); cached != nil {
		return cached, nil
	}

	result := make(map[string]*DiscoveredPipeline)

	for pipelineType, namePrefix := range definitions {
		discovered, err := r.discoverOnePipeline(client, ctx, namespace, namePrefix)
		if err != nil {
			return nil, fmt.Errorf("failed to discover pipeline %q: %w", pipelineType, err)
		}
		if discovered != nil {
			result[pipelineType] = discovered
		}
	}

	// Cache the result (even if partial or empty)
	globalPipelineCache.set(cacheKey, result)

	return result, nil
}

// discoverOnePipeline finds a single managed pipeline by name prefix in the given namespace.
//
// Returns:
//   - (*DiscoveredPipeline, nil): pipeline found
//   - (nil, nil): no pipeline matching the prefix (soft miss — not an error)
//   - (nil, err): API failure (hard error)
func (r *PipelineRepository) discoverOnePipeline(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	namespace string,
	namePrefix string,
) (*DiscoveredPipeline, error) {
	if namePrefix == "" {
		namePrefix = defaultPipelineNamePrefix
	}

	// Build a server-side filter to reduce the result set. The Go-side HasPrefix check
	// below remains the authoritative gate for correctness.
	nameFilter := buildPipelineNameFilter(namePrefix)

	pipelinesResp, err := client.ListPipelines(ctx, nameFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to list pipelines: %w", err)
	}

	if pipelinesResp == nil || len(pipelinesResp.Pipelines) == 0 {
		// No pipelines at all — soft miss
		return nil, nil
	}

	// Find matching pipeline by namespace and name (case-insensitive prefix match).
	// Namespace guard is a defence-in-depth measure: the KFP API is already scoped to
	// the DSPA in this namespace, but an empty or cross-namespace response could otherwise
	// leak pipelines from other tenants.
	// TODO: Replace with attribute-based lookup once managed pipeline metadata is available
	var matchedPipeline *models.KFPipeline
	for i := range pipelinesResp.Pipelines {
		pipeline := &pipelinesResp.Pipelines[i]
		if (pipeline.Namespace == "" || pipeline.Namespace == namespace) &&
			strings.HasPrefix(strings.ToLower(pipeline.DisplayName), strings.ToLower(namePrefix)) {
			matchedPipeline = pipeline
			break
		}
	}

	if matchedPipeline == nil {
		// No pipeline matches the prefix — soft miss
		return nil, nil
	}

	// Get pipeline versions
	versionsResp, err := client.ListPipelineVersions(ctx, matchedPipeline.PipelineID)
	if err != nil {
		return nil, fmt.Errorf("failed to list versions for pipeline %s: %w", matchedPipeline.PipelineID, err)
	}

	if versionsResp == nil || len(versionsResp.PipelineVersions) == 0 {
		// No versions yet — treat as soft miss so other pipelines can still be discovered
		return nil, nil
	}

	// Use the first version (most recently created, as client requests sorted by created_at desc)
	version := versionsResp.PipelineVersions[0]

	return &DiscoveredPipeline{
		PipelineID:        matchedPipeline.PipelineID,
		PipelineVersionID: version.PipelineVersionID,
		PipelineName:      matchedPipeline.DisplayName,
		Namespace:         namespace,
		DiscoveredAt:      time.Now(),
	}, nil
}

// buildPipelineNameFilter builds a KFP predicate JSON filter that restricts ListPipelines
// results to pipelines whose display_name contains the given prefix (IS_SUBSTRING).
// Returns an empty string if namePrefix is empty, which signals the client to omit the filter.
// The Go-side HasPrefix check in discoverOnePipeline is the authoritative gate.
func buildPipelineNameFilter(namePrefix string) string {
	if namePrefix == "" {
		return ""
	}

	filter := map[string]interface{}{
		"predicates": []map[string]interface{}{
			{
				"key":          "display_name",
				"operation":    "IS_SUBSTRING",
				"string_value": namePrefix,
			},
		},
	}

	filterJSON, err := json.Marshal(filter)
	if err != nil {
		// Fall back to no filter rather than blocking discovery
		slog.Error("Failed to marshal pipeline name filter", "error", err, "namePrefix", namePrefix)
		return ""
	}

	return string(filterJSON)
}

// InvalidateCache removes cached pipeline info for a given pipeline server and namespace.
// Useful for testing or when pipeline changes are detected.
func (r *PipelineRepository) InvalidateCache(pipelineServerBaseURL, namespace string) {
	cacheKey := fmt.Sprintf("%s:%s", pipelineServerBaseURL, namespace)
	globalPipelineCache.invalidate(cacheKey)
}
