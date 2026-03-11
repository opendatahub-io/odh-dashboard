package repositories

import (
	"context"

	k8s "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type EvalHubStatusRepository struct{}

func NewEvalHubStatusRepository() *EvalHubStatusRepository {
	return &EvalHubStatusRepository{}
}

func (r *EvalHubStatusRepository) GetEvalHubCRStatus(
	client k8s.KubernetesClientInterface,
	ctx context.Context,
	identity *k8s.RequestIdentity,
	namespace string,
) (*models.EvalHubCRStatus, error) {
	return client.GetEvalHubCRStatus(ctx, identity, namespace)
}
