package repositories

import (
	"context"
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

		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		assert.Equal(t, "9e3940d5-b275-4b64-be10-b914cd06c58e", discovered.PipelineID)
		assert.Equal(t, "22e57c06-030f-4c63-900d-0a808d577899", discovered.PipelineVersionID)
		assert.Equal(t, "autorag-pipeline", discovered.PipelineName)
		assert.Equal(t, namespace, discovered.Namespace)
	})

	t.Run("should discover pipeline with custom prefix", func(t *testing.T) {
		namespace := "test-ns-2"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		// Mock returns "autorag-pipeline", so "autorag" prefix should match
		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "autorag")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		assert.Equal(t, "autorag-pipeline", discovered.PipelineName)
	})

	t.Run("should be case-insensitive when matching prefix", func(t *testing.T) {
		namespace := "test-ns-3"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		// Mock returns "autorag-pipeline", "AUTORAG" prefix should match (case-insensitive)
		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "AUTORAG")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		assert.Equal(t, "autorag-pipeline", discovered.PipelineName)
	})

	t.Run("should return error when namespace is empty", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, "", "autorag")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "namespace is required")
	})

	t.Run("should return error when client is nil", func(t *testing.T) {
		namespace := "test-ns-4"
		discovered, err := repo.DiscoverAutoRAGPipeline(nil, ctx, namespace, "autorag")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "pipeline server client is nil")
	})

	t.Run("should return error when no pipeline matches prefix", func(t *testing.T) {
		namespace := "test-ns-5"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		// Mock returns "autorag-pipeline", "nonexistent" prefix should not match
		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "nonexistent")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		if err != nil {
			assert.Contains(t, err.Error(), "pipeline not found")
			assert.Contains(t, err.Error(), "nonexistent")
		}
	})

	t.Run("should use first version when multiple versions exist", func(t *testing.T) {
		namespace := "test-ns-6"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		discovered, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "autorag")

		assert.NoError(t, err)
		assert.NotNil(t, discovered)
		// Mock returns version v1.0.0 as first version
		assert.Equal(t, "22e57c06-030f-4c63-900d-0a808d577899", discovered.PipelineVersionID)
	})

	t.Run("should cache discovery results", func(t *testing.T) {
		namespace := "test-ns-7"
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")

		// First call should discover and cache
		discovered1, err1 := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "autorag")
		assert.NoError(t, err1)
		assert.NotNil(t, discovered1)

		// Second call should return cached result
		discovered2, err2 := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "autorag")
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
		discovered1, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "autorag")
		assert.NoError(t, err)
		assert.NotNil(t, discovered1)

		// Invalidate cache
		repo.InvalidateCache(namespace)

		// Next discovery should fetch fresh (not from cache)
		discovered2, err := repo.DiscoverAutoRAGPipeline(mockClient, ctx, namespace, "autorag")
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

// failingListPipelinesClient simulates a pipeline server client that fails to list pipelines
type failingListPipelinesClient struct {
	psmocks.MockPipelineServerClient
}

func (f *failingListPipelinesClient) ListPipelines(_ context.Context) (*models.KFPipelinesResponse, error) {
	return nil, assert.AnError
}

func TestDiscoverAutoRAGPipeline_ErrorHandling(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should return error when ListPipelines fails", func(t *testing.T) {
		namespace := "test-ns-error-1"
		failClient := &failingListPipelinesClient{}

		discovered, err := repo.DiscoverAutoRAGPipeline(failClient, ctx, namespace, "autorag")

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

func TestDiscoverAutoRAGPipeline_EmptyPipelines(t *testing.T) {
	repo := NewPipelineRepository()
	ctx := context.Background()

	t.Run("should return error when no pipelines exist", func(t *testing.T) {
		namespace := "test-ns-empty"
		emptyClient := &emptyPipelinesClient{}

		discovered, err := repo.DiscoverAutoRAGPipeline(emptyClient, ctx, namespace, "autorag")

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

		discovered, err := repo.DiscoverAutoRAGPipeline(noVersionsClient, ctx, namespace, "autorag")

		assert.Error(t, err)
		assert.Nil(t, discovered)
		assert.Contains(t, err.Error(), "no versions found")
	})
}
