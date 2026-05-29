package helper

import (
	"context"
	"testing"

	"github.com/opendatahub-io/mlflow/bff/internal/constants"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubClient struct {
	mlflowpkg.ClientInterface
}

func TestGetContextMLflowClientSuccess(t *testing.T) {
	expected := &stubClient{}
	ctx := context.WithValue(context.Background(), constants.MLflowClientKey, expected)

	client, err := GetContextMLflowClient(ctx)

	require.NoError(t, err)
	assert.Equal(t, expected, client)
}

func TestGetContextMLflowClientMissingKey(t *testing.T) {
	ctx := context.Background()

	client, err := GetContextMLflowClient(ctx)

	assert.Nil(t, client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing MLflow client in context")
}

func TestGetContextMLflowClientNilValue(t *testing.T) {
	ctx := context.WithValue(context.Background(), constants.MLflowClientKey, nil)

	client, err := GetContextMLflowClient(ctx)

	assert.Nil(t, client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing MLflow client in context")
}

func TestGetContextMLflowClientWrongType(t *testing.T) {
	ctx := context.WithValue(context.Background(), constants.MLflowClientKey, "not-a-client")

	client, err := GetContextMLflowClient(ctx)

	assert.Nil(t, client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing MLflow client in context")
}
