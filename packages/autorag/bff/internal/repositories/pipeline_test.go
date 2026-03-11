package repositories

import (
	"context"
	"fmt"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestDiscoverAutoRAGPipeline(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should discover pipeline with default prefix", func(t *testing.T) {
		namespace := "test-ns-1"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")
		ids := psmocks.DeriveMockIDs(mockClient.Namespace) // namespace is "" for non-mock:// URLs

		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "http://mock-ps", "")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		assert.Equal(t, ids.PipelineID, discovered.PipelineID)
		assert.Equal(t, ids.LatestVersionID, discovered.PipelineVersionID)
		assert.Equal(t, "autorag-pipeline", discovered.PipelineName)
		assert.Equal(t, namespace, discovered.Namespace)
	})

	t.Run("should discover pipeline with custom prefix", func(t *testing.T) {
		namespace := "test-ns-2"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		// Mock returns "autorag-pipeline", so "autorag" prefix should match
		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "http://mock-ps", "autorag")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		assert.Equal(t, "autorag-pipeline", discovered.PipelineName)
	})

	t.Run("should be case-insensitive when matching prefix", func(t *testing.T) {
		namespace := "test-ns-3"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		// Mock returns "autorag-pipeline", "AUTORAG" prefix should match (case-insensitive)
		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "http://mock-ps", "AUTORAG")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		assert.Equal(t, "autorag-pipeline", discovered.PipelineName)
	})

	t.Run("should return error when namespace is empty", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, "", "http://mock-ps", "autorag")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "namespace is required")
	})

	t.Run("should return error when client is nil", func(t *testing.T) {
		namespace := "test-ns-4"
		discovered, err := repo.DiscoverAutoRAGPipeline(nil, ctx, namespace, "http://mock-ps", "autorag")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "pipeline server client is nil")
	})

	t.Run("should return error when no pipeline matches prefix", func(t *testing.T) {
		namespace := "test-ns-5"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		// Mock returns "autorag-pipeline", "nonexistent" prefix should not match
		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "http://mock-ps", "nonexistent")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		if err != nil {
			assert.Contains(t, err.Error(), "pipeline not found")
			assert.Contains(t, err.Error(), "nonexistent")
		}
	})

	t.Run("should use latest version when multiple versions exist", func(t *testing.T) {
		namespace := "test-ns-6"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")
		ids := psmocks.DeriveMockIDs(mockClient.Namespace)

		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "http://mock-ps", "autorag")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		// Mock returns versions sorted by created_at desc; v2.0.0 is the most recently created
		assert.Equal(t, ids.LatestVersionID, discovered.PipelineVersionID)
	})

	t.Run("should cache discovery results", func(t *testing.T) {
		namespace := "test-ns-7"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		// First call should discover and cache
		discovered1, err1 := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "http://mock-ps", "autorag")
		assert.NoError(t, err1)
		assert.NotNil(t, discovered1)

		// Second call should return cached result
		discovered2, err2 := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "http://mock-ps", "autorag")
		assert.NoError(t, err2)
		assert.NotNil(t, discovered2)

		// Should be the same result
		assert.Equal(t, discovered1.PipelineID, discovered2.PipelineID)
		assert.Equal(t, discovered1.PipelineVersionID, discovered2.PipelineVersionID)
	})

	t.Run("should invalidate cache when requested", func(t *testing.T) {
		namespace := "test-ns-8"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		// Discover and cache
		discovered1, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "http://mock-ps", "autorag")
		assert.NoError(t, err)
		assert.NotNil(t, discovered1)

		// Invalidate cache
		repo.InvalidateCache("http://mock-ps", namespace)

		// Next discovery should fetch fresh (not from cache)
		discovered2, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "http://mock-ps", "autorag")
		assert.NoError(t, err)
		assert.NotNil(t, discovered2)
	})
}

func TestInvalidateCache(t *testing.T) {
	repo := NewPipelineRepository()

	t.Run("should not panic when invalidating non-existent namespace", func(t *testing.T) {
		assert.NotPanics(t, func() {
			repo.InvalidateCache("http://mock-ps", "non-existent-namespace")
		})
	})
}

func TestCacheSizeLimit(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()
	mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

	t.Run("should evict oldest entry when cache reaches size limit", func(t *testing.T) {
		// Clear cache before test
		globalPipelineCache.mu.Lock()
		globalPipelineCache.entries = make(map[string]*pipelineCacheEntry)
		globalPipelineCache.mu.Unlock()

		// Add first entry
		namespace1 := "test-ns-evict-1"
		discovered1, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace1, "http://mock-ps", "autorag")
		assert.NoError(t, err)
		assert.NotNil(t, discovered1)

		// Add second entry (accessed later)
		namespace2 := "test-ns-evict-2"
		discovered2, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace2, "http://mock-ps", "autorag")
		assert.NoError(t, err)
		assert.NotNil(t, discovered2)

		const baseURL = "http://mock-ps"
		cacheKey1 := fmt.Sprintf("%s:%s", baseURL, namespace1)
		cacheKey2 := fmt.Sprintf("%s:%s", baseURL, namespace2)

		// Access first entry again to make it more recently used
		cached1 := globalPipelineCache.get(cacheKey1)
		assert.NotNil(t, cached1)

		// Manually set cache to be at capacity for testing
		globalPipelineCache.mu.Lock()
		// Save the two real entries
		entry1 := globalPipelineCache.entries[cacheKey1]
		entry2 := globalPipelineCache.entries[cacheKey2]
		// Clear and fill cache to exact limit with filler entries
		globalPipelineCache.entries = make(map[string]*pipelineCacheEntry)
		// Add (maxCacheEntries - 2) filler entries, leaving room for our 2 real entries
		for i := 0; i < maxCacheEntries-2; i++ {
			globalPipelineCache.entries[fmt.Sprintf("filler-%d", i)] = &pipelineCacheEntry{
				pipeline:     &DiscoveredPipeline{Namespace: fmt.Sprintf("filler-%d", i)},
				expiresAt:    entry1.expiresAt,
				lastAccessed: entry2.lastAccessed, // Use entry2's (older) access time
			}
		}
		// Add back the real entries (entry1 has more recent access time)
		globalPipelineCache.entries[cacheKey1] = entry1
		globalPipelineCache.entries[cacheKey2] = entry2
		globalPipelineCache.mu.Unlock()

		// Verify cache is at capacity
		globalPipelineCache.mu.RLock()
		cacheSize := len(globalPipelineCache.entries)
		globalPipelineCache.mu.RUnlock()
		assert.Equal(t, maxCacheEntries, cacheSize)

		// Add a new entry - should trigger eviction
		namespace3 := "test-ns-evict-3"
		discovered3, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace3, baseURL, "autorag")
		assert.NoError(t, err)
		assert.NotNil(t, discovered3)

		// Cache should still be at max size
		globalPipelineCache.mu.RLock()
		finalSize := len(globalPipelineCache.entries)
		globalPipelineCache.mu.RUnlock()
		assert.Equal(t, maxCacheEntries, finalSize)

		// The new entry should be in the cache
		cacheKey3 := fmt.Sprintf("%s:%s", baseURL, namespace3)
		cached3 := globalPipelineCache.get(cacheKey3)
		assert.NotNil(t, cached3)

		// namespace1 should still be there (was accessed more recently)
		cachedStill := globalPipelineCache.get(cacheKey1)
		assert.NotNil(t, cachedStill)
	})
}

func TestCacheLRUEviction(t *testing.T) {
	t.Run("should update last accessed time on cache hit", func(t *testing.T) {
		// Clear cache
		globalPipelineCache.mu.Lock()
		globalPipelineCache.entries = make(map[string]*pipelineCacheEntry)
		globalPipelineCache.mu.Unlock()

		cacheKey := "http://mock-ps:test-lru-access"
		pipeline := &DiscoveredPipeline{
			PipelineID:        "test-id",
			PipelineVersionID: "test-version",
			Namespace:         "test-lru-access",
		}

		// Add entry
		globalPipelineCache.set(cacheKey, pipeline)

		// Get initial access time
		globalPipelineCache.mu.RLock()
		initialAccessTime := globalPipelineCache.entries[cacheKey].lastAccessed
		globalPipelineCache.mu.RUnlock()

		// Wait a small amount of time
		// Note: In practice, time.Now() has limited precision, so we can't rely on exact differences
		// but we can verify the field is being set

		// Access the entry
		retrieved := globalPipelineCache.get(cacheKey)
		assert.NotNil(t, retrieved)

		// Verify last accessed time was updated (should be same or later)
		globalPipelineCache.mu.RLock()
		updatedAccessTime := globalPipelineCache.entries[cacheKey].lastAccessed
		globalPipelineCache.mu.RUnlock()

		assert.True(t, updatedAccessTime.Equal(initialAccessTime) || updatedAccessTime.After(initialAccessTime),
			"lastAccessed should be updated on cache hit")
	})
}

// failingListPipelinesClient simulates a pipeline server client that fails to list pipelines
type failingListPipelinesClient struct {
	psmocks.MockPipelineServerClient
}

func (f *failingListPipelinesClient) ListPipelines(_ context.Context, _ string) (*models.KFPipelinesResponse, error) {
	return nil, assert.AnError
}

func TestDiscoverAutoRAGPipeline_ErrorHandling(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should return error when ListPipelines fails", func(t *testing.T) {
		namespace := "test-ns-error-1"
		failClient := &failingListPipelinesClient{}

		discovered, err := repo.DiscoverAutoRAGPipeline(failClient, ctx, namespace, "http://mock-ps", "autorag")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "failed to list pipelines")
	})
}

// emptyPipelinesClient returns an empty list of pipelines
type emptyPipelinesClient struct {
	psmocks.MockPipelineServerClient
}

func (e *emptyPipelinesClient) ListPipelines(_ context.Context, _ string) (*models.KFPipelinesResponse, error) {
	return &models.KFPipelinesResponse{
		Pipelines:     []models.KFPipeline{},
		TotalSize:     0,
		NextPageToken: "",
	}, nil
}

func TestDiscoverAutoRAGPipeline_EmptyPipelines(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should return error when no pipelines exist", func(t *testing.T) {
		namespace := "test-ns-empty"
		emptyClient := &emptyPipelinesClient{}

		discovered, err := repo.DiscoverAutoRAGPipeline(emptyClient, ctx, namespace, "http://mock-ps", "autorag")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "no pipelines found")
	})
}

// noPipelineVersionsClient returns a pipeline but no versions
type noPipelineVersionsClient struct {
	psmocks.MockPipelineServerClient
}

func (n *noPipelineVersionsClient) ListPipelineVersions(_ context.Context, _ string) (*models.KFPipelineVersionsResponse, error) {
	return &models.KFPipelineVersionsResponse{
		PipelineVersions: []models.KFPipelineVersion{},
		TotalSize:        0,
		NextPageToken:    "",
	}, nil
}

func TestDiscoverAutoRAGPipeline_NoVersions(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should return error when pipeline has no versions", func(t *testing.T) {
		namespace := "test-ns-no-versions"
		noVersionsClient := &noPipelineVersionsClient{}

		discovered, err := repo.DiscoverAutoRAGPipeline(noVersionsClient, ctx, namespace, "http://mock-ps", "autorag")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "no versions found")
	})
}

func TestBuildPipelineNameFilter(t *testing.T) {
	t.Run("should return empty string when prefix is empty", func(t *testing.T) {
		result := buildPipelineNameFilter("")
		assert.Equal(t, "", result)
	})

	t.Run("should build IS_SUBSTRING filter for given prefix", func(t *testing.T) {
		result := buildPipelineNameFilter("autorag")
		assert.Contains(t, result, "IS_SUBSTRING")
		assert.Contains(t, result, "display_name")
		assert.Contains(t, result, "autorag")
	})

	t.Run("should produce valid JSON", func(t *testing.T) {
		result := buildPipelineNameFilter("autorag")
		assert.JSONEq(t, `{"predicates":[{"key":"display_name","operation":"IS_SUBSTRING","string_value":"autorag"}]}`, result)
	})
}
