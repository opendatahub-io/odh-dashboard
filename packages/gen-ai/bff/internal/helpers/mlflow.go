package helper

import (
	"context"
	"fmt"
	"net/http"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mlflow"
)

// GetContextMLflowClientFromReq safely retrieves the MLflow client from the HTTP request context.
// Returns an error if the client is not found or is nil.
func GetContextMLflowClientFromReq(r *http.Request) (mlflow.ClientInterface, error) {
	return GetContextMLflowClient(r.Context())
}

// GetContextMLflowClient safely retrieves the MLflow client from the given context.
// Returns an error if the client is not found or is nil.
func GetContextMLflowClient(ctx context.Context) (mlflow.ClientInterface, error) {
	client, ok := ctx.Value(constants.MLflowClientKey).(mlflow.ClientInterface)

	if !ok || client == nil {
		return nil, fmt.Errorf("missing MLflow client in context - ensure AttachMLflowClient middleware is used")
	}

	return client, nil
}
