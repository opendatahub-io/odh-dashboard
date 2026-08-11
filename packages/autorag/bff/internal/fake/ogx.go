package fake

import (
	"context"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// OGXClient is a fake implementation of ogx.OGXClientInterface for local development and testing.
type OGXClient struct{}

var _ ogx.OGXClientInterface = (*OGXClient)(nil)

func (c *OGXClient) ListModels(_ context.Context, _, _ string) ([]models.OGXNativeModel, error) {
	return []models.OGXNativeModel{
		{
			ID: "vllm-inference/meta-llama/Llama-3.1-8B-Instruct",
			CustomMetadata: &models.OGXCustomMetadata{
				ModelType:          "llm",
				ProviderID:         "vllm-inference",
				ProviderResourceID: "meta-llama/Llama-3.1-8B-Instruct",
			},
		},
		{
			ID: "vllm-embedding/ibm-granite/granite-embedding-english-r2",
			CustomMetadata: &models.OGXCustomMetadata{
				ModelType:          "embedding",
				ProviderID:         "vllm-embedding",
				ProviderResourceID: "ibm-granite/granite-embedding-english-r2",
			},
		},
	}, nil
}

func (c *OGXClient) ListProviders(_ context.Context, _, _ string) ([]models.OGXProvider, error) {
	return []models.OGXProvider{
		{API: "vector_io", ProviderID: "milvus", ProviderType: "remote::milvus"},
		{API: "vector_io", ProviderID: "pgvector", ProviderType: "remote::pgvector"},
	}, nil
}
