package repositories

import (
	"fmt"

	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

type UserRepository struct{}

func NewUserRepository() *UserRepository {
	return &UserRepository{}
}

func (r *UserRepository) GetUser(client k8s.KubernetesClientInterface, identity *k8s.RequestIdentity) (*models.User, error) {
	isAdmin, err := client.IsClusterAdmin(identity)
	if err != nil {
		return nil, fmt.Errorf("failed to check admin status: %w", err)
	}

	userID, err := client.GetUser(identity)
	if err != nil {
		return nil, fmt.Errorf("failed to get user identity: %w", err)
	}

	return &models.User{
		UserID:       userID,
		ClusterAdmin: isAdmin,
	}, nil
}
