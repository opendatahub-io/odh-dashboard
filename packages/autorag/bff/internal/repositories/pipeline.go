package repositories

import (
	"context"
	"fmt"
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

	// defaultPipelineNamePrefix is the default prefix used when none is configured
	// TODO: Replace name-based identification with pipeline attribute/metadata
	// Managed pipelines should have an attribute (label, annotation, or field) that explicitly
	// marks them as AutoRAG managed pipelines. This would be more robust than name matching.
	// Example: pipeline.metadata.labels["odh.io/managed-pipeline"] = "autorag"
	// or pipeline.spec.pipelineType = "autorag"
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

// pipelineCacheEntry wraps discovered pipeline with expiration
type pipelineCacheEntry struct {
	pipeline  *DiscoveredPipeline
	expiresAt time.Time
}

// pipelineCache is a simple in-memory cache for discovered pipelines
// Key: namespace, Value: discovered pipeline info
type pipelineCache struct {
	mu      sync.RWMutex
	entries map[string]*pipelineCacheEntry
}

// Global cache instance (singleton)
// TODO: Consider dependency injection for better testability
var globalPipelineCache = &pipelineCache{
	entries: make(map[string]*pipelineCacheEntry),
}

// get retrieves a cached pipeline for a namespace if still valid
func (c *pipelineCache) get(namespace string) *DiscoveredPipeline {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, exists := c.entries[namespace]
	if !exists {
		return nil
	}

	// Check if entry has expired
	if time.Now().After(entry.expiresAt) {
		return nil
	}

	return entry.pipeline
}

// set stores a discovered pipeline in the cache
func (c *pipelineCache) set(namespace string, pipeline *DiscoveredPipeline) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries[namespace] = &pipelineCacheEntry{
		pipeline:  pipeline,
		expiresAt: time.Now().Add(pipelineCacheTTL),
	}
}

// invalidate removes a cached entry for a namespace
func (c *pipelineCache) invalidate(namespace string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.entries, namespace)
}

// PipelineRepository handles pipeline discovery logic
type PipelineRepository struct{}

// NewPipelineRepository creates a new pipeline repository
func NewPipelineRepository() *PipelineRepository {
	return &PipelineRepository{}
}

// DiscoverAutoRAGPipeline finds the AutoRAG managed pipeline in the given namespace.
//
// This method automatically discovers the AutoRAG pipeline by:
//  1. Checking the in-memory cache (5-minute TTL) for previously discovered pipelines
//  2. If not cached, listing all pipelines from the Pipeline Server
//  3. Finding the pipeline with name starting with the specified prefix (case-insensitive)
//  4. Retrieving the first version of the discovered pipeline
//  5. Caching the result for future requests
//
// Parameters:
//   - client: Pipeline Server client interface
//   - ctx: Request context
//   - namespace: Kubernetes namespace to search in
//   - pipelineNamePrefix: Prefix to identify managed pipelines (e.g., "autorag")
//
// Returns:
//   - *DiscoveredPipeline: The discovered pipeline with IDs and metadata
//   - error: If no pipeline matching the prefix is found or an error occurs during discovery
//
// Note: Currently uses name-based matching. Future versions will use pipeline metadata/attributes
// to identify managed pipelines more reliably.
func (r *PipelineRepository) DiscoverAutoRAGPipeline(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	namespace string,
	pipelineNamePrefix string,
) (*DiscoveredPipeline, error) {
	if client == nil {
		return nil, fmt.Errorf("pipeline server client is nil")
	}

	if namespace == "" {
		return nil, fmt.Errorf("namespace is required for pipeline discovery")
	}

	// Use default prefix if none provided
	if pipelineNamePrefix == "" {
		pipelineNamePrefix = defaultPipelineNamePrefix
	}

	// Check cache first
	if cached := globalPipelineCache.get(namespace); cached != nil {
		return cached, nil
	}

	// Call pipeline server to list pipelines
	pipelinesResp, err := client.ListPipelines(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list pipelines: %w", err)
	}

	if pipelinesResp == nil || len(pipelinesResp.Pipelines) == 0 {
		return nil, fmt.Errorf("no pipelines found in namespace %s", namespace)
	}

	// Find AutoRAG pipeline by name (case-insensitive prefix match)
	// TODO: Replace with attribute-based lookup once managed pipeline metadata is available
	var autoragPipeline *models.KFPipeline
	for i := range pipelinesResp.Pipelines {
		pipeline := &pipelinesResp.Pipelines[i]
		if strings.HasPrefix(strings.ToLower(pipeline.DisplayName), strings.ToLower(pipelineNamePrefix)) {
			autoragPipeline = pipeline
			break
		}
	}

	if autoragPipeline == nil {
		return nil, fmt.Errorf("AutoRAG pipeline not found in namespace %s (searched for pipelines starting with %q)",
			namespace, pipelineNamePrefix)
	}

	// Get pipeline versions for the AutoRAG pipeline
	versionsResp, err := client.ListPipelineVersions(ctx, autoragPipeline.PipelineID)
	if err != nil {
		return nil, fmt.Errorf("failed to list versions for pipeline %s: %w", autoragPipeline.PipelineID, err)
	}

	if versionsResp == nil || len(versionsResp.PipelineVersions) == 0 {
		return nil, fmt.Errorf("no versions found for AutoRAG pipeline %s", autoragPipeline.PipelineID)
	}

	// Use the first version (typically the latest or default)
	// TODO: Consider version selection strategy (latest, default, specific tag, etc.)
	version := versionsResp.PipelineVersions[0]

	discovered := &DiscoveredPipeline{
		PipelineID:        autoragPipeline.PipelineID,
		PipelineVersionID: version.PipelineVersionID,
		PipelineName:      autoragPipeline.DisplayName,
		Namespace:         namespace,
		DiscoveredAt:      time.Now(),
	}

	// Cache the result
	globalPipelineCache.set(namespace, discovered)

	return discovered, nil
}

// InvalidateCache removes cached pipeline info for a namespace
// Useful for testing or when pipeline changes are detected
func (r *PipelineRepository) InvalidateCache(namespace string) {
	globalPipelineCache.invalidate(namespace)
}
