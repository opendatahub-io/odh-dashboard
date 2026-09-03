package repositories

import (
	"context"
	"fmt"

	k8s "github.com/opendatahub-io/data-registry/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/data-registry/bff/internal/models"
)

type ConnectionRepository struct{}

func NewConnectionRepository() *ConnectionRepository {
	return &ConnectionRepository{}
}

func (r *ConnectionRepository) GetConnections(client k8s.KubernetesClientInterface, ctx context.Context, namespace string) ([]models.ConnectionModel, error) {
	secrets, err := client.GetConnections(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("error fetching connections: %w", err)
	}

	connectionModels := make([]models.ConnectionModel, 0, len(secrets))
	for _, secret := range secrets {
		model := models.ConnectionModel{
			Name: secret.Name,
		}
		if secret.Annotations != nil {
			if displayName, ok := secret.Annotations["openshift.io/display-name"]; ok {
				model.DisplayName = &displayName
			}
			if connType, ok := secret.Annotations["opendatahub.io/connection-type-ref"]; ok {
				model.ConnectionType = &connType
			} else if connType, ok := secret.Annotations["opendatahub.io/connection-type"]; ok {
				model.ConnectionType = &connType
			}
		}
		connectionModels = append(connectionModels, model)
	}

	return connectionModels, nil
}
