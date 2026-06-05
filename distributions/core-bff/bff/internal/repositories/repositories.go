// Package repositories implements data access patterns for Kubernetes resources.
package repositories

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck *HealthCheckRepository
	User        *UserRepository
	Namespace   *NamespaceRepository
}

// NewRepositories creates a new Repositories instance with all repositories initialized.
func NewRepositories() *Repositories {
	return &Repositories{
		HealthCheck: NewHealthCheckRepository(),
		User:        NewUserRepository(),
		Namespace:   NewNamespaceRepository(),
	}
}
