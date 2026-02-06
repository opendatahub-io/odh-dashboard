package repositories

import (
	"context"
	"errors"
	"log/slog"
	"slices"

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

var (
	ErrGroupsAPINotFound = errors.New("groups API not found")
	ErrGroupsForbidden   = errors.New("access to groups forbidden")
)

type AuthRepository struct {
	logger     *slog.Logger
	k8sFactory kubernetes.KubernetesClientFactory
}

func NewAuthRepository(logger *slog.Logger, k8sFactory kubernetes.KubernetesClientFactory) *AuthRepository {
	return &AuthRepository{
		logger:     logger,
		k8sFactory: k8sFactory,
	}
}

// ListGroups lists all OpenShift Groups the user has access to.
// Returns ErrGroupsForbidden if the user doesn't have permission to list groups.
// Returns ErrGroupsAPINotFound if the Groups API doesn't exist (e.g., external OIDC).
func (r *AuthRepository) ListGroups(ctx context.Context) (*models.GroupsList, error) {
	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		r.logger.Error("failed to get kubernetes client", "error", err)
		return nil, err
	}

	dynClient := client.GetDynamicClient()

	// Groups are cluster-scoped resources
	groupList, err := dynClient.Resource(constants.GroupsGvr).List(ctx, metav1.ListOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			r.logger.Debug("groups API not found - likely using external OIDC")
			return nil, ErrGroupsAPINotFound
		}
		if k8sErrors.IsForbidden(err) {
			r.logger.Debug("access to groups forbidden", "error", err)
			return nil, ErrGroupsForbidden
		}
		r.logger.Error("failed to list groups", "error", err)
		return nil, err
	}

	groups := make([]string, 0, len(groupList.Items))
	for _, item := range groupList.Items {
		groups = append(groups, item.GetName())
	}

	if !slices.Contains(groups, "system:authenticated") {
		groups = append(groups, "system:authenticated")
	}

	return &models.GroupsList{
		Groups: groups,
	}, nil
}
