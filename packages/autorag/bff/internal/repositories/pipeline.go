package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	ps "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/pipelines"
)

func getEnvOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

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
	defaultPipelineNamePrefix = "documents-rag-optimization-pipeline"
)

// DiscoveredPipeline holds the discovered pipeline information
type DiscoveredPipeline struct {
	PipelineID        string
	PipelineVersionID string
	PipelineName      string
	Namespace         string
	DiscoveredAt      time.Time
}

// DefaultPipelineVersion is the release version suffix appended to pipeline version names.
// Override via PIPELINE_VERSION_SUFFIX env var, otherwise defaults to "3.4.0".
var DefaultPipelineVersion = getEnvOrDefault("PIPELINE_VERSION_SUFFIX", "3.4.0")

// PipelineDefinition describes a managed pipeline type for discovery and auto-creation.
type PipelineDefinition struct {
	Name        string // Exact pipeline display name for discovery and creation
	PipelineDir string // Directory name containing pipeline.yaml (matches upstream repo structure)
	Version     string // Release version suffix for the version name (e.g. "3.4.0")
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
type PipelineRepository struct {
	inFlight   map[string]chan struct{} // per-key completion signals for in-flight creation
	inFlightMu sync.Mutex               // guards inFlight map
}

// NewPipelineRepository creates a new pipeline repository
func NewPipelineRepository() *PipelineRepository {
	return &PipelineRepository{
		inFlight: make(map[string]chan struct{}),
	}
}

// DiscoverNamedPipelines discovers multiple managed pipelines in the given namespace,
// one per entry in the definitions map (pipeline type key → pipeline name).
//
// This method:
//  1. Checks the in-memory cache (5-minute TTL) for a previously discovered result
//  2. For each definition, calls discoverOnePipeline with exact name matching
//  3. Builds a partial result map — missing keys mean the pipeline was not found
//  4. Caches the partial result for future requests
//
// Parameters:
//   - client: Pipeline Server client interface
//   - ctx: Request context
//   - namespace: Kubernetes namespace to search in
//   - pipelineServerBaseURL: Base URL of the pipeline server (used in cache key)
//   - definitions: map from pipeline type key to exact pipeline display name
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
		discovered, err := r.discoverOnePipeline(client, ctx, namespace, namePrefix, "")
		if err != nil {
			return nil, fmt.Errorf("failed to discover pipeline %q: %w", pipelineType, err)
		}
		if discovered != nil {
			result[pipelineType] = discovered
		}
	}

	// Only cache when at least one pipeline was discovered to avoid long-lived negative caches
	// that would delay detection of pipelines deployed after the initial miss.
	if len(result) > 0 {
		globalPipelineCache.set(cacheKey, result)
	}

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
	versionName string,
) (*DiscoveredPipeline, error) {
	if namePrefix == "" {
		namePrefix = defaultPipelineNamePrefix
	}

	nameFilter := buildPipelineNameFilter(namePrefix)

	pipelinesResp, err := client.ListPipelines(ctx, nameFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to list pipelines: %w", err)
	}

	if pipelinesResp == nil || len(pipelinesResp.Pipelines) == 0 {
		return nil, nil
	}

	// Find matching pipeline by exact display name (case-insensitive).
	var matchedPipeline *models.KFPipeline
	for i := range pipelinesResp.Pipelines {
		pipeline := &pipelinesResp.Pipelines[i]
		if (pipeline.Namespace == "" || pipeline.Namespace == namespace) &&
			strings.EqualFold(pipeline.DisplayName, namePrefix) {
			matchedPipeline = pipeline
			break
		}
	}

	if matchedPipeline == nil {
		return nil, nil
	}

	// Get pipeline versions and match by exact version name
	versionsResp, err := client.ListPipelineVersions(ctx, matchedPipeline.PipelineID)
	if err != nil {
		return nil, fmt.Errorf("failed to list versions for pipeline %s: %w", matchedPipeline.PipelineID, err)
	}

	if versionsResp == nil || len(versionsResp.PipelineVersions) == 0 {
		return nil, nil
	}

	// Match by exact version name if provided, otherwise use the latest
	var matchedVersion *models.KFPipelineVersion
	if versionName != "" {
		for i := range versionsResp.PipelineVersions {
			v := &versionsResp.PipelineVersions[i]
			if strings.EqualFold(v.DisplayName, versionName) {
				matchedVersion = v
				break
			}
		}
	} else {
		matchedVersion = &versionsResp.PipelineVersions[0]
	}

	if matchedVersion == nil {
		return nil, nil
	}

	return &DiscoveredPipeline{
		PipelineID:        matchedPipeline.PipelineID,
		PipelineVersionID: matchedVersion.PipelineVersionID,
		PipelineName:      matchedPipeline.DisplayName,
		Namespace:         namespace,
		DiscoveredAt:      time.Now(),
	}, nil
}

// buildPipelineNameFilter builds a KFP predicate JSON filter that restricts ListPipelines
// results to pipelines whose display_name exactly matches the given name (EQUALS).
// Returns an empty string if name is empty, which signals the client to omit the filter.
func buildPipelineNameFilter(name string) string {
	if name == "" {
		return ""
	}

	filter := map[string]interface{}{
		"predicates": []map[string]interface{}{
			{
				"key":          "display_name",
				"operation":    "EQUALS",
				"string_value": name,
			},
		},
	}

	filterJSON, err := json.Marshal(filter)
	if err != nil {
		// Fall back to no filter rather than blocking discovery
		slog.Error("Failed to marshal pipeline name filter", "error", err, "name", name)
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

// EnsurePipeline discovers a pipeline by definition, creating it if it does not exist.
// This is called at experiment submission time so pipelines are created lazily.
func (r *PipelineRepository) EnsurePipeline(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	namespace string,
	pipelineServerBaseURL string,
	def PipelineDefinition,
) (*DiscoveredPipeline, error) {
	// Normalize pipeline name — use default if empty
	pipelineName := def.Name
	if pipelineName == "" {
		pipelineName = defaultPipelineNamePrefix
	}
	version := def.Version
	if version == "" {
		version = DefaultPipelineVersion
	}
	versionName := fmt.Sprintf("%s-%s", pipelineName, version)

	// Try discovery first
	discovered, err := r.discoverOnePipeline(client, ctx, namespace, pipelineName, versionName)
	if err != nil {
		return nil, err
	}
	if discovered != nil {
		return discovered, nil
	}

	// Soft miss — create the pipeline and/or version
	if def.PipelineDir == "" {
		return nil, fmt.Errorf("no pipeline %q version %q found and no YAML available for auto-creation", pipelineName, versionName)
	}

	// Serialize creation per key to prevent duplicate pipelines from concurrent requests.
	createKey := fmt.Sprintf("%s:%s:%s", pipelineServerBaseURL, namespace, versionName)
	r.inFlightMu.Lock()
	if doneCh, ok := r.inFlight[createKey]; ok {
		r.inFlightMu.Unlock()
		select {
		case <-doneCh:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		discovered, err = r.discoverOnePipeline(client, ctx, namespace, pipelineName, versionName)
		if err != nil {
			return nil, err
		}
		if discovered != nil {
			return discovered, nil
		}
		return nil, fmt.Errorf("pipeline %q version %q was not found after concurrent creation completed", pipelineName, versionName)
	}
	doneCh := make(chan struct{})
	r.inFlight[createKey] = doneCh
	r.inFlightMu.Unlock()
	defer func() {
		close(doneCh)
		r.inFlightMu.Lock()
		delete(r.inFlight, createKey)
		r.inFlightMu.Unlock()
	}()

	// Double-check after registering
	discovered, err = r.discoverOnePipeline(client, ctx, namespace, pipelineName, versionName)
	if err != nil {
		return nil, err
	}
	if discovered != nil {
		return discovered, nil
	}

	return r.ensurePipelineAndVersion(client, ctx, namespace, pipelineServerBaseURL, pipelineName, versionName, def)
}

// ensurePipelineAndVersion creates the pipeline shell and/or uploads a named version as needed.
func (r *PipelineRepository) ensurePipelineAndVersion(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	namespace string,
	pipelineServerBaseURL string,
	pipelineName string,
	versionName string,
	def PipelineDefinition,
) (*DiscoveredPipeline, error) {
	logger := slog.Default()

	yamlBytes, err := pipelines.GetPipelineYAML(def.PipelineDir)
	if err != nil {
		return nil, fmt.Errorf("failed to load embedded pipeline YAML %q: %w", def.PipelineDir, err)
	}

	// Step 1: Find or create the pipeline shell
	pipelineID, err := r.findOrCreatePipeline(client, ctx, namespace, pipelineName)
	if err != nil {
		return nil, err
	}

	// Step 2: Upload the named version
	uploadedVersion, err := client.UploadPipelineVersion(ctx, pipelineID, versionName, yamlBytes)
	if err != nil {
		// Handle 409 Conflict — version may already exist (created by another instance)
		var httpErr *ps.HTTPError
		if errors.As(err, &httpErr) && httpErr.StatusCode == http.StatusConflict {
			logger.Info("Pipeline version already exists, retrying discovery",
				"pipelineName", pipelineName, "versionName", versionName, "namespace", namespace)
			discovered, discoverErr := r.discoverOnePipeline(client, ctx, namespace, pipelineName, versionName)
			if discoverErr != nil {
				return nil, discoverErr
			}
			if discovered != nil {
				return discovered, nil
			}
			return nil, fmt.Errorf("pipeline version %q already exists but could not be discovered", versionName)
		}
		return nil, fmt.Errorf("failed to upload pipeline version %q: %w", versionName, err)
	}

	logger.Info("Auto-created pipeline version",
		"pipelineID", pipelineID,
		"versionID", uploadedVersion.PipelineVersionID,
		"versionName", versionName,
		"pipelineName", pipelineName,
		"namespace", namespace)

	// Invalidate cache so subsequent discovery picks up the new version
	r.InvalidateCache(pipelineServerBaseURL, namespace)

	return &DiscoveredPipeline{
		PipelineID:        pipelineID,
		PipelineVersionID: uploadedVersion.PipelineVersionID,
		PipelineName:      pipelineName,
		Namespace:         namespace,
		DiscoveredAt:      time.Now(),
	}, nil
}

// findOrCreatePipeline returns the pipeline ID for the given name, creating the shell if needed.
func (r *PipelineRepository) findOrCreatePipeline(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	namespace string,
	pipelineName string,
) (string, error) {
	const maxRetries = 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		nameFilter := buildPipelineNameFilter(pipelineName)
		pipelinesResp, err := client.ListPipelines(ctx, nameFilter)
		if err != nil {
			return "", fmt.Errorf("failed to list pipelines: %w", err)
		}

		if pipelinesResp != nil {
			for i := range pipelinesResp.Pipelines {
				p := &pipelinesResp.Pipelines[i]
				if (p.Namespace == "" || p.Namespace == namespace) &&
					strings.EqualFold(p.DisplayName, pipelineName) {
					return p.PipelineID, nil
				}
			}
		}

		// Pipeline doesn't exist — create shell
		created, err := client.CreatePipeline(ctx, pipelineName)
		if err != nil {
			var httpErr *ps.HTTPError
			if errors.As(err, &httpErr) && httpErr.StatusCode == http.StatusConflict {
				// Another instance created it — retry search on next iteration
				continue
			}
			return "", fmt.Errorf("failed to create pipeline %q: %w", pipelineName, err)
		}

		return created.PipelineID, nil
	}

	return "", fmt.Errorf("failed to find or create pipeline %q after %d attempts", pipelineName, maxRetries)
}
