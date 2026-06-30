// Package repositories implements data access patterns for Kubernetes resources.
package repositories

import (
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

// NewRepositories creates a new Repositories instance with all repositories initialized.
// isXKS should be true for XKS platform deployments to disable OpenShift-dependent features.
// saDynClient and saClientset are service-account-scoped clients for privileged operations,
// matching the privileged watcher model where the dashboard SA performs reads and admin-gated mutations.
func NewRepositories(isXKS bool, saDynClient dynamic.Interface, saClientset kubernetes.Interface, namespace string) *Repositories {
	auth := NewAuthRepository(saDynClient)
	return &Repositories{
		HealthCheck:     NewHealthCheckRepository(),
		User:            NewUserRepository(),
		Namespace:       NewNamespaceRepository(),
		DashboardConfig: NewDashboardConfigRepository(isXKS, saDynClient),
		Status:          NewStatusRepository(saDynClient, namespace, auth),
		Auth:            auth,
		Components:      NewComponentsRepository(saDynClient, saClientset),
		ClusterSettings: NewClusterSettingsRepository(saClientset),
		ConnectionType:  NewConnectionTypeRepository(saClientset),
		AllowedUsers:    NewAllowedUsersRepository(saDynClient),
	}
}
