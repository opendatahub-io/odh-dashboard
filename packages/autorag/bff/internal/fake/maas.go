package fake

import (
	"context"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// MaaSClient is a fake implementation of maas.MaaSClientInterface for local development and testing.
type MaaSClient struct{}

var _ maas.MaaSClientInterface = (*MaaSClient)(nil)

func (c *MaaSClient) ListModels(_ context.Context, _, _ string) ([]models.MaaSNativeModel, error) {
	return []models.MaaSNativeModel{
		{
			ID: "vllm-inference/meta-llama/Llama-3.1-8B-Instruct",
			CustomMetadata: &models.MaaSCustomMetadata{
				ModelType:          "llm",
				ProviderID:         "vllm-inference",
				ProviderResourceID: "meta-llama/Llama-3.1-8B-Instruct",
			},
		},
		{
			ID: "vllm-embedding/ibm-granite/granite-embedding-english-r2",
			CustomMetadata: &models.MaaSCustomMetadata{
				ModelType:          "embedding",
				ProviderID:         "vllm-embedding",
				ProviderResourceID: "ibm-granite/granite-embedding-english-r2",
			},
		},
	}, nil
}

func (c *MaaSClient) ListProviders(_ context.Context, _, _ string) ([]models.MaaSProvider, error) {
	return []models.MaaSProvider{
		{API: "vector_io", ProviderID: "milvus", ProviderType: "remote::milvus"},
		{API: "vector_io", ProviderID: "pgvector", ProviderType: "remote::pgvector"},
	}, nil
}
