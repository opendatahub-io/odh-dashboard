package repositories

import (
	"context"
	"fmt"

	k8s "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
)

type AccessRepository struct{}

func NewAccessRepository() *AccessRepository {
	return &AccessRepository{}
}

func (r *AccessRepository) CanListEvalHubInstances(client k8s.KubernetesClientInterface, ctx context.Context, identity *k8s.RequestIdentity, namespace string) (bool, error) {
	allowed, err := client.CanListEvalHubInstances(ctx, identity, namespace)
	if err != nil {
		return false, fmt.Errorf("error checking EvalHub access: %w", err)
	}
	return allowed, nil
}

func (r *AccessRepository) CanCreateEvalHubResources(client k8s.KubernetesClientInterface, ctx context.Context, identity *k8s.RequestIdentity, namespace string) (bool, error) {
	allowed, err := client.CanCreateEvalHubResources(ctx, identity, namespace)
	if err != nil {
		return false, fmt.Errorf("error checking collection creation permissions: %w", err)
	}
	return allowed, nil
}

func (r *AccessRepository) CanDeleteEvalHubResources(client k8s.KubernetesClientInterface, ctx context.Context, identity *k8s.RequestIdentity, namespace string) (bool, error) {
	allowed, err := client.CanDeleteEvalHubResources(ctx, identity, namespace)
	if err != nil {
		return false, fmt.Errorf("error checking collection generation deletion permissions: %w", err)
	}
	return allowed, nil
}
