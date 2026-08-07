package fake

import (
	"context"

	"github.com/kubeflow/model-registry/pkg/openapi"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
)

// ModelRegistryClient is a fake implementation of modelregistry.ModelRegistryClientInterface
// for local development and testing.
type ModelRegistryClient struct{}

var _ modelregistry.ModelRegistryClientInterface = (*ModelRegistryClient)(nil)

func (c *ModelRegistryClient) CreateRegisteredModel(_ context.Context, _ string, body openapi.RegisteredModelCreate) (*openapi.RegisteredModel, error) {
	id := "fake-model-id"
	return &openapi.RegisteredModel{
		Id:   &id,
		Name: body.Name,
	}, nil
}

func (c *ModelRegistryClient) CreateModelVersion(_ context.Context, _, _ string, body openapi.ModelVersionCreate) (*openapi.ModelVersion, error) {
	id := "fake-version-id"
	return &openapi.ModelVersion{
		Id:   &id,
		Name: body.Name,
	}, nil
}

func (c *ModelRegistryClient) CreateModelArtifact(_ context.Context, _, _ string, body openapi.ModelArtifactCreate) (*openapi.ModelArtifact, error) {
	id := "fake-artifact-id"
	return &openapi.ModelArtifact{
		Id:   &id,
		Name: body.Name,
	}, nil
}
