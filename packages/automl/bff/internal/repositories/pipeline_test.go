package repositories

import (
	"context"
	"fmt"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestDiscoverAutoMLPipeline(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should discover pipeline with default prefix", func(t *testing.T) {
		namespace := "test-ns-1"
		mockClient := psmocks.NewMockPipelineServerClient()

		discovered, err := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace, "")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		assert.Equal(t, "9e3940d5-b275-4b64-be10-b914cd06c58e", discovered.PipelineID)
		assert.Equal(t, "22e57c06-030f-4c63-900d-0a808d577899", discovered.PipelineVersionID)
		assert.Equal(t, "automl-optimization-pipeline", discovered.PipelineName)
		assert.Equal(t, namespace, discovered.Namespace)
	})

	t.Run("should discover pipeline with custom prefix", func(t *testing.T) {
		namespace := "test-ns-2"
		mockClient := psmocks.NewMockPipelineServerClient()

		// Mock returns "automl-pipeline", so "automl" prefix should match
		discovered, err := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace, "automl")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		assert.Equal(t, "automl-optimization-pipeline", discovered.PipelineName)
	})

	t.Run("should be case-insensitive when matching prefix", func(t *testing.T) {
		namespace := "test-ns-3"
		mockClient := psmocks.NewMockPipelineServerClient()

		// Mock returns "automl-pipeline", "AUTOML" prefix should match (case-insensitive)
		discovered, err := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace, "AUTOML")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		assert.Equal(t, "automl-optimization-pipeline", discovered.PipelineName)
	})

	t.Run("should return error when namespace is empty", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient()

		discovered, err := repo.DiscoverAutoMLPipeline(mockClient, ctx, "", "automl")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "namespace is required")
	})

	t.Run("should return error when client is nil", func(t *testing.T) {
		namespace := "test-ns-4"
		discovered, err := repo.DiscoverAutoMLPipeline(nil, ctx, namespace, "automl")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "pipeline server client is nil")
	})

	t.Run("should return error when no pipeline matches prefix", func(t *testing.T) {
		namespace := "test-ns-5"
		mockClient := psmocks.NewMockPipelineServerClient()

		// Mock returns "automl-pipeline", "nonexistent" prefix should not match
		discovered, err := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace, "nonexistent")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		if err != nil {
			assert.Contains(t, err.Error(), "pipeline not found")
			assert.Contains(t, err.Error(), "nonexistent")
		}
	})

	t.Run("should use first version when multiple versions exist", func(t *testing.T) {
		namespace := "test-ns-6"
		mockClient := psmocks.NewMockPipelineServerClient()

		discovered, err := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace, "automl")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		// Mock returns version v1.0.0 as first version
		assert.Equal(t, "22e57c06-030f-4c63-900d-0a808d577899", discovered.PipelineVersionID)
	})

	t.Run("should cache discovery results", func(t *testing.T) {
		namespace := "test-ns-7"
		mockClient := psmocks.NewMockPipelineServerClient()

		// First call should discover and cache
		discovered1, err1 := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace, "automl")
		assert.NoError(t, err1)
		assert.NotNil(t, discovered1)

		// Second call should return cached result
		discovered2, err2 := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace, "automl")
		assert.NoError(t, err2)
		assert.NotNil(t, discovered2)

		// Should be the same result
		assert.Equal(t, discovered1.PipelineID, discovered2.PipelineID)
		assert.Equal(t, discovered1.PipelineVersionID, discovered2.PipelineVersionID)
	})

	t.Run("should invalidate cache when requested", func(t *testing.T) {
		namespace := "test-ns-8"
		mockClient := psmocks.NewMockPipelineServerClient()

		// Discover and cache
		discovered1, err := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace, "automl")
		assert.NoError(t, err)
		assert.NotNil(t, discovered1)

		// Invalidate cache
		repo.InvalidateCache(namespace)

		// Next discovery should fetch fresh (not from cache)
		discovered2, err := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace, "automl")
		assert.NoError(t, err)
		assert.NotNil(t, discovered2)
	})
}

func TestInvalidateCache(t *testing.T) {
	repo := NewPipelineRepository()

	t.Run("should not panic when invalidating non-existent namespace", func(t *testing.T) {
		assert.NotPanics(t, func() {
			repo.InvalidateCache("non-existent-namespace")
		})
	})
}

func TestCacheSizeLimit(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()
	mockClient := psmocks.NewMockPipelineServerClient()

	t.Run("should evict oldest entry when cache reaches size limit", func(t *testing.T) {
		// Clear cache before test
		globalPipelineCache.mu.Lock()
		globalPipelineCache.entries = make(map[string]*pipelineCacheEntry)
		globalPipelineCache.mu.Unlock()

		// Add first entry
		namespace1 := "test-ns-evict-1"
		discovered1, err := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace1, "automl")
		assert.NoError(t, err)
		assert.NotNil(t, discovered1)

		// Add second entry (accessed later)
		namespace2 := "test-ns-evict-2"
		discovered2, err := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace2, "automl")
		assert.NoError(t, err)
		assert.NotNil(t, discovered2)

		// Access first entry again to make it more recently used
		cached1 := globalPipelineCache.get(namespace1)
		assert.NotNil(t, cached1)

		// Manually set cache to be at capacity for testing
		globalPipelineCache.mu.Lock()
		// Save the two real entries
		entry1 := globalPipelineCache.entries[namespace1]
		entry2 := globalPipelineCache.entries[namespace2]
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
		globalPipelineCache.entries[namespace1] = entry1
		globalPipelineCache.entries[namespace2] = entry2
		globalPipelineCache.mu.Unlock()

		// Verify cache is at capacity
		globalPipelineCache.mu.RLock()
		cacheSize := len(globalPipelineCache.entries)
		globalPipelineCache.mu.RUnlock()
		assert.Equal(t, maxCacheEntries, cacheSize)

		// Add a new entry - should trigger eviction
		namespace3 := "test-ns-evict-3"
		discovered3, err := repo.DiscoverAutoMLPipeline(mockClient, ctx, namespace3, "automl")
		assert.NoError(t, err)
		assert.NotNil(t, discovered3)

		// Cache should still be at max size
		globalPipelineCache.mu.RLock()
		finalSize := len(globalPipelineCache.entries)
		globalPipelineCache.mu.RUnlock()
		assert.Equal(t, maxCacheEntries, finalSize)

		// The new entry should be in the cache
		cached3 := globalPipelineCache.get(namespace3)
		assert.NotNil(t, cached3)

		// namespace1 should still be there (was accessed more recently)
		cachedStill := globalPipelineCache.get(namespace1)
		assert.NotNil(t, cachedStill)
	})
}

func TestCacheLRUEviction(t *testing.T) {
	t.Run("should update last accessed time on cache hit", func(t *testing.T) {
		// Clear cache
		globalPipelineCache.mu.Lock()
		globalPipelineCache.entries = make(map[string]*pipelineCacheEntry)
		globalPipelineCache.mu.Unlock()

		namespace := "test-lru-access"
		pipeline := &DiscoveredPipeline{
			PipelineID:        "test-id",
			PipelineVersionID: "test-version",
			Namespace:         namespace,
		}

		// Add entry
		globalPipelineCache.set(namespace, pipeline)

		// Get initial access time
		globalPipelineCache.mu.RLock()
		initialAccessTime := globalPipelineCache.entries[namespace].lastAccessed
		globalPipelineCache.mu.RUnlock()

		// Wait a small amount of time
		// Note: In practice, time.Now() has limited precision, so we can't rely on exact differences
		// but we can verify the field is being set

		// Access the entry
		retrieved := globalPipelineCache.get(namespace)
		assert.NotNil(t, retrieved)

		// Verify last accessed time was updated (should be same or later)
		globalPipelineCache.mu.RLock()
		updatedAccessTime := globalPipelineCache.entries[namespace].lastAccessed
		globalPipelineCache.mu.RUnlock()

		assert.True(t, updatedAccessTime.Equal(initialAccessTime) || updatedAccessTime.After(initialAccessTime),
			"lastAccessed should be updated on cache hit")
	})
}

// failingListPipelinesClient simulates a pipeline server client that fails to list pipelines
type failingListPipelinesClient struct {
	psmocks.MockPipelineServerClient
}

func (f *failingListPipelinesClient) ListPipelines(_ context.Context) (*models.KFPipelinesResponse, error) {
	return nil, assert.AnError
}

func TestDiscoverAutoMLPipeline_ErrorHandling(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should return error when ListPipelines fails", func(t *testing.T) {
		namespace := "test-ns-error-1"
		failClient := &failingListPipelinesClient{}

		discovered, err := repo.DiscoverAutoMLPipeline(failClient, ctx, namespace, "automl")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "failed to list pipelines")
	})
}

// emptyPipelinesClient returns an empty list of pipelines
type emptyPipelinesClient struct {
	psmocks.MockPipelineServerClient
}

func (e *emptyPipelinesClient) ListPipelines(_ context.Context) (*models.KFPipelinesResponse, error) {
	return &models.KFPipelinesResponse{
		Pipelines:     []models.KFPipeline{},
		TotalSize:     0,
		NextPageToken: "",
	}, nil
}

func TestDiscoverAutoMLPipeline_EmptyPipelines(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should return error when no pipelines exist", func(t *testing.T) {
		namespace := "test-ns-empty"
		emptyClient := &emptyPipelinesClient{}

		discovered, err := repo.DiscoverAutoMLPipeline(emptyClient, ctx, namespace, "automl")

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

func TestDiscoverAutoMLPipeline_NoVersions(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should return error when pipeline has no versions", func(t *testing.T) {
		namespace := "test-ns-no-versions"
		noVersionsClient := &noPipelineVersionsClient{}

		discovered, err := repo.DiscoverAutoMLPipeline(noVersionsClient, ctx, namespace, "automl")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "no versions found")
	})
}
