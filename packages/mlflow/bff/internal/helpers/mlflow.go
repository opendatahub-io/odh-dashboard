package helper

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/mlflow/bff/internal/constants"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
)

// GetContextMLflowClient extracts the MLflow client stored by the AttachMLflowClient middleware.
func GetContextMLflowClient(ctx context.Context) (mlflow.ClientInterface, error) {
	client, ok := ctx.Value(constants.MLflowClientKey).(mlflow.ClientInterface)
	if !ok || client == nil {
		return nil, fmt.Errorf("missing MLflow client in context - ensure AttachMLflowClient middleware is used")
	}

	return client, nil
}
