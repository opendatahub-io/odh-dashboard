package repositories

import (
	"context"
	"fmt"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestDiscoverNamedPipelines(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should discover single pipeline with default prefix", func(t *testing.T) {
		namespace := "test-ns-1"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")
		ids := psmocks.DeriveMockIDs(mockClient.Namespace) // namespace is "" for non-mock:// URLs

		definitions := map[string]string{"automl": ""}
		pipelines, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace, "http://mock-ps", definitions)

		assert.NoError(t, err)
		assert.NotNil(t, pipelines)
		assert.Contains(t, pipelines, "automl")
		discovered := pipelines["automl"]
		assert.Equal(t, ids.PipelineID, discovered.PipelineID)
		assert.Equal(t, ids.LatestVersionID, discovered.PipelineVersionID)
		assert.Equal(t, "automl-pipeline", discovered.PipelineName)
		assert.Equal(t, namespace, discovered.Namespace)
	})

	t.Run("should discover pipeline with custom prefix", func(t *testing.T) {
		namespace := "test-ns-2"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		definitions := map[string]string{"automl": "automl"}
		pipelines, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace, "http://mock-ps", definitions)

		assert.NoError(t, err)
		assert.Contains(t, pipelines, "automl")
		assert.Equal(t, "automl-pipeline", pipelines["automl"].PipelineName)
	})

	t.Run("should be case-insensitive when matching prefix", func(t *testing.T) {
		namespace := "test-ns-3"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		definitions := map[string]string{"automl": "AUTOML"}
		pipelines, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace, "http://mock-ps", definitions)

		assert.NoError(t, err)
		assert.Contains(t, pipelines, "automl")
		assert.Equal(t, "automl-pipeline", pipelines["automl"].PipelineName)
	})

	t.Run("should return error when namespace is empty", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		definitions := map[string]string{"automl": "automl"}
		pipelines, err := repo.DiscoverNamedPipelines(mockClient, ctx, "", "http://mock-ps", definitions)

		assert.Error(t, err)
		assert.Nil(t, pipelines)
		assert.Contains(t, err.Error(), "namespace is required")
	})

	t.Run("should return error when client is nil", func(t *testing.T) {
		namespace := "test-ns-4"
		definitions := map[string]string{"automl": "automl"}
		pipelines, err := repo.DiscoverNamedPipelines(nil, ctx, namespace, "http://mock-ps", definitions)

		assert.Error(t, err)
		assert.Nil(t, pipelines)
		assert.Contains(t, err.Error(), "pipeline server client is nil")
	})

	t.Run("should return partial map when one prefix does not match", func(t *testing.T) {
		namespace := "test-ns-5"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		definitions := map[string]string{
			"automl":      "automl",
			"nonexistent": "nonexistent-prefix",
		}
		pipelines, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace, "http://mock-ps", definitions)

		assert.NoError(t, err)
		assert.NotNil(t, pipelines)
		assert.Contains(t, pipelines, "automl", "automl pipeline should be found")
		assert.NotContains(t, pipelines, "nonexistent", "nonexistent pipeline should not be in result")
	})

	t.Run("should return empty map when no pipelines match any prefix", func(t *testing.T) {
		namespace := "test-ns-6"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		definitions := map[string]string{"foo": "nonexistent-prefix"}
		pipelines, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace, "http://mock-ps", definitions)

		assert.NoError(t, err)
		assert.NotNil(t, pipelines)
		assert.Empty(t, pipelines)
	})

	t.Run("should use latest version when multiple versions exist", func(t *testing.T) {
		namespace := "test-ns-7"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")
		ids := psmocks.DeriveMockIDs(mockClient.Namespace)

		definitions := map[string]string{"automl": "automl"}
		pipelines, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace, "http://mock-ps", definitions)

		assert.NoError(t, err)
		assert.Contains(t, pipelines, "automl")
		// Mock returns versions sorted by created_at desc; v2.0.0 is the most recently created
		assert.Equal(t, ids.LatestVersionID, pipelines["automl"].PipelineVersionID)
	})

	t.Run("should cache discovery results", func(t *testing.T) {
		namespace := "test-ns-8"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		definitions := map[string]string{"automl": "automl"}

		// First call should discover and cache
		pipelines1, err1 := repo.DiscoverNamedPipelines(mockClient, ctx, namespace, "http://mock-ps", definitions)
		assert.NoError(t, err1)
		assert.Contains(t, pipelines1, "automl")

		// Second call should return cached result
		pipelines2, err2 := repo.DiscoverNamedPipelines(mockClient, ctx, namespace, "http://mock-ps", definitions)
		assert.NoError(t, err2)
		assert.Contains(t, pipelines2, "automl")

		// Should be the same result
		assert.Equal(t, pipelines1["automl"].PipelineID, pipelines2["automl"].PipelineID)
		assert.Equal(t, pipelines1["automl"].PipelineVersionID, pipelines2["automl"].PipelineVersionID)
	})

	t.Run("should invalidate cache when requested", func(t *testing.T) {
		namespace := "test-ns-9"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		definitions := map[string]string{"automl": "automl"}

		// Discover and cache
		pipelines1, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace, "http://mock-ps", definitions)
		assert.NoError(t, err)
		assert.Contains(t, pipelines1, "automl")

		// Invalidate cache
		repo.InvalidateCache("http://mock-ps", namespace)

		// Next discovery should fetch fresh (not from cache)
		pipelines2, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace, "http://mock-ps", definitions)
		assert.NoError(t, err)
		assert.Contains(t, pipelines2, "automl")
	})

	t.Run("should discover two named pipelines (timeseries and tabular)", func(t *testing.T) {
		namespace := "test-ns-10"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")
		mockClient.PipelineNames = []string{"automl-timeseries-pipeline", "automl-tabular-pipeline"}

		tsIDs := psmocks.DeriveMockIDsFromName(mockClient.Namespace, "automl-timeseries-pipeline")
		clsIDs := psmocks.DeriveMockIDsFromName(mockClient.Namespace, "automl-tabular-pipeline")

		definitions := map[string]string{
			"timeseries": "automl-timeseries",
			"tabular":    "automl-tabular",
		}
		pipelines, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace, "http://mock-ps", definitions)

		assert.NoError(t, err)
		assert.Len(t, pipelines, 2)
		assert.Contains(t, pipelines, "timeseries")
		assert.Contains(t, pipelines, "tabular")
		assert.Equal(t, tsIDs.PipelineID, pipelines["timeseries"].PipelineID)
		assert.Equal(t, tsIDs.LatestVersionID, pipelines["timeseries"].PipelineVersionID)
		assert.Equal(t, clsIDs.PipelineID, pipelines["tabular"].PipelineID)
		assert.Equal(t, clsIDs.LatestVersionID, pipelines["tabular"].PipelineVersionID)
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

		definitions := map[string]string{"automl": "automl"}
		const baseURL = "http://mock-ps"

		// Add first entry
		namespace1 := "test-ns-evict-1"
		pipelines1, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace1, baseURL, definitions)
		assert.NoError(t, err)
		assert.NotNil(t, pipelines1)

		// Add second entry (accessed later)
		namespace2 := "test-ns-evict-2"
		pipelines2, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace2, baseURL, definitions)
		assert.NoError(t, err)
		assert.NotNil(t, pipelines2)

		cacheKey1 := fmt.Sprintf("%s:%s", baseURL, namespace1)
		cacheKey2 := fmt.Sprintf("%s:%s", baseURL, namespace2)

		// Access first entry again to make it more recently used
		cached1 := globalPipelineCache.get(cacheKey1)
		assert.NotNil(t, cached1)

		// Manually set cache to be at capacity for testing
		globalPipelineCache.mu.Lock()
		entry1 := globalPipelineCache.entries[cacheKey1]
		entry2 := globalPipelineCache.entries[cacheKey2]
		globalPipelineCache.entries = make(map[string]*pipelineCacheEntry)
		for i := 0; i < maxCacheEntries-2; i++ {
			globalPipelineCache.entries[fmt.Sprintf("filler-%d", i)] = &pipelineCacheEntry{
				pipelines:    map[string]*DiscoveredPipeline{},
				expiresAt:    entry1.expiresAt,
				lastAccessed: entry2.lastAccessed,
			}
		}
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
		pipelines3, err := repo.DiscoverNamedPipelines(mockClient, ctx, namespace3, baseURL, definitions)
		assert.NoError(t, err)
		assert.NotNil(t, pipelines3)

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
		pipelines := map[string]*DiscoveredPipeline{
			"automl": {
				PipelineID:        "test-id",
				PipelineVersionID: "test-version",
				Namespace:         "test-lru-access",
			},
		}

		// Add entry
		globalPipelineCache.set(cacheKey, pipelines)

		// Get initial access time
		globalPipelineCache.mu.RLock()
		initialAccessTime := globalPipelineCache.entries[cacheKey].lastAccessed
		globalPipelineCache.mu.RUnlock()

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

func TestDiscoverNamedPipelines_ErrorHandling(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should return error when ListPipelines fails", func(t *testing.T) {
		namespace := "test-ns-error-1"
		failClient := &failingListPipelinesClient{}

		definitions := map[string]string{"automl": "automl"}
		pipelines, err := repo.DiscoverNamedPipelines(failClient, ctx, namespace, "http://mock-ps", definitions)

		assert.Error(t, err)
		assert.Nil(t, pipelines)
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

func TestDiscoverNamedPipelines_EmptyPipelines(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should return empty map when no pipelines exist", func(t *testing.T) {
		namespace := "test-ns-empty"
		emptyClient := &emptyPipelinesClient{}

		definitions := map[string]string{"automl": "automl"}
		pipelines, err := repo.DiscoverNamedPipelines(emptyClient, ctx, namespace, "http://mock-ps", definitions)

		assert.NoError(t, err)
		assert.NotNil(t, pipelines)
		assert.Empty(t, pipelines)
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

func TestDiscoverNamedPipelines_NoVersions(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should return empty map (soft miss) when pipeline has no versions", func(t *testing.T) {
		namespace := "test-ns-no-versions"
		noVersionsClient := &noPipelineVersionsClient{}

		definitions := map[string]string{"automl": "automl"}
		pipelines, err := repo.DiscoverNamedPipelines(noVersionsClient, ctx, namespace, "http://mock-ps", definitions)

		// No versions is a soft miss — not an error, just omit from results
		assert.NoError(t, err)
		assert.NotNil(t, pipelines)
		assert.Empty(t, pipelines)
	})
}

func TestBuildPipelineNameFilter(t *testing.T) {
	t.Run("should return empty string when prefix is empty", func(t *testing.T) {
		result := buildPipelineNameFilter("")
		assert.Equal(t, "", result)
	})

	t.Run("should build IS_SUBSTRING filter for given prefix", func(t *testing.T) {
		result := buildPipelineNameFilter("automl")
		assert.Contains(t, result, "IS_SUBSTRING")
		assert.Contains(t, result, "display_name")
		assert.Contains(t, result, "automl")
	})

	t.Run("should produce valid JSON", func(t *testing.T) {
		result := buildPipelineNameFilter("automl")
		assert.JSONEq(t, `{"predicates":[{"key":"display_name","operation":"IS_SUBSTRING","string_value":"automl"}]}`, result)
	})
}
