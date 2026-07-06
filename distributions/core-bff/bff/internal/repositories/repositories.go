// Package repositories implements data access patterns for Kubernetes resources.
package repositories

import (
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

// Repositories is a convenient container that holds all repository instances.
type Repositories struct {
	HealthCheck     *HealthCheckRepository
	User            *UserRepository
	Namespace       *NamespaceRepository
	DashboardConfig *DashboardConfigRepository
	Status          *StatusRepository
	Auth            *AuthRepository
	Components      *ComponentsRepository
	ClusterSettings *ClusterSettingsRepository
	ConnectionType  *ConnectionTypeRepository
	AllowedUsers    *AllowedUsersRepository
}

// RepositoriesConfig holds the dependencies needed to construct all repositories.
// saDynClient and saClientset are service-account-scoped clients for privileged operations,
// matching the privileged watcher model where the dashboard SA performs reads and admin-gated mutations.
type RepositoriesConfig struct {
	Platform    config.PlatformType
	SADynClient dynamic.Interface
	SAClientset kubernetes.Interface
	Namespace   string
}

// NewRepositories creates a new Repositories instance with all repositories initialized.
func NewRepositories(cfg RepositoriesConfig) *Repositories {
	auth := NewAuthRepository(cfg.SADynClient)
	return &Repositories{
		HealthCheck:     NewHealthCheckRepository(),
		User:            NewUserRepository(),
		Namespace:       NewNamespaceRepository(),
		DashboardConfig: NewDashboardConfigRepository(cfg.Platform, cfg.SADynClient),
		Status:          NewStatusRepository(cfg.SADynClient, cfg.Namespace, auth),
		Auth:            auth,
		Components:      NewComponentsRepository(cfg.SADynClient, cfg.SAClientset),
		ClusterSettings: NewClusterSettingsRepository(cfg.SAClientset),
		ConnectionType:  NewConnectionTypeRepository(cfg.SAClientset),
		AllowedUsers:    NewAllowedUsersRepository(cfg.SADynClient),
	}
}
