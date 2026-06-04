package repositories

import (
	"context"
	"fmt"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

// UserRepository handles user-related operations.
type UserRepository struct{}

// NewUserRepository creates a new UserRepository instance.
func NewUserRepository() *UserRepository {
	return &UserRepository{}
}

func (r *UserRepository) GetUser(ctx context.Context, client k8s.KubernetesClientInterface, identity *k8s.RequestIdentity) (*models.User, error) {
	isAdmin, err := client.IsClusterAdmin(ctx, identity)
	if err != nil {
		return nil, fmt.Errorf("failed to check admin status: %w", err)
	}

	userID, err := client.GetUser(ctx, identity)
	if err != nil {
		return nil, fmt.Errorf("failed to get user identity: %w", err)
	}

	return &models.User{
		UserID:       userID,
		ClusterAdmin: isAdmin,
	}, nil
}
