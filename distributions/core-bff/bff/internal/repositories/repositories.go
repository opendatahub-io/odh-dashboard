// Package repositories implements data access patterns for Kubernetes resources.
package repositories

import (
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

// Repositories is a convenient container that holds all repository instances.
type Repositories struct {
	HealthCheck                *HealthCheckRepository
	User                       *UserRepository
	Namespace                  *NamespaceRepository
	NamespaceAccess            *NamespaceAccessRepository
	DashboardConfig            *DashboardConfigRepository
	Status                     *StatusRepository
	Auth                       *AuthRepository
	Components                 *ComponentsRepository
	ClusterSettings            *ClusterSettingsRepository
	ConnectionType             *ConnectionTypeRepository
	AllowedUsers               *AllowedUsersRepository
	ServingRuntime             *ServingRuntimeRepository
	NIM                        *NIMRepository
	NamespaceMutation          *NamespaceMutationRepository
	Prometheus                 *PrometheusRepository
	OperatorSubscriptionStatus *OperatorSubscriptionStatusRepository
}

// RepositoriesConfig holds the dependencies needed to construct all repositories.
// SADynClient and SAClientset are service-account clients. They back the
// documented service-account reads on every platform, and user-initiated access
// only under CredentialPolicyServiceAccount (OpenShift).
type RepositoriesConfig struct {
	Platform config.PlatformType
	// PlatformConfirmed is false when Platform was guessed after a failed
	// probe rather than detected or configured. It keeps a guess from relaxing
	// the admission contract; see config.ResolveAdmissionMode.
	PlatformConfirmed bool
	// AdmissionMode is the configured bootstrap admission contract, or empty to
	// resolve from the platform. See config.ResolveAdmissionMode.
	AdmissionMode config.AdmissionMode
	SADynClient   dynamic.Interface
	SAClientset   kubernetes.Interface
	// CredentialPolicy selects whose credentials perform user-initiated
	// access. Empty resolves from Platform (see CredentialPolicyFor).
	CredentialPolicy CredentialPolicy
	// CallerClients resolves clients authenticated as the request's caller.
	// Required under CredentialPolicyCaller; without it every caller-scoped
	// operation fails rather than falling back to the service account.
	CallerClients     CallerClientsFunc
	Namespace         string
	OperatorNamespace string
	Prometheus        PrometheusConfig
	// NamespaceCandidates feeds the xKS namespace discovery. See
	// NamespaceAccessRepository.
	NamespaceCandidates []string
}

// NewRepositories creates a new Repositories instance with all repositories initialized.
func NewRepositories(cfg RepositoriesConfig) *Repositories {
	var disc discovery.DiscoveryInterface
	if cfg.SAClientset != nil {
		disc = cfg.SAClientset.Discovery()
	}
	auth := NewAuthRepository(cfg.SADynClient, disc)
	clients := newClientSource(cfg)

	dashboardConfig := newDashboardConfigRepository(cfg.Platform, cfg.PlatformConfirmed, cfg.SADynClient)
	dashboardConfig.clients = clients
	components := NewComponentsRepository(cfg.SADynClient, cfg.SAClientset)
	components.clients = clients
	clusterSettings := NewClusterSettingsRepository(cfg.SAClientset)
	clusterSettings.clients = clients
	connectionType := NewConnectionTypeRepository(cfg.SAClientset)
	connectionType.clients = clients
	servingRuntime := NewServingRuntimeRepository(cfg.SADynClient)
	servingRuntime.clients = clients
	namespaceMutation := NewNamespaceMutationRepository(cfg.SAClientset)
	namespaceMutation.clients = clients

	return &Repositories{
		HealthCheck:                NewHealthCheckRepository(),
		User:                       NewUserRepository(),
		Namespace:                  NewNamespaceRepository(),
		NamespaceAccess:            NewNamespaceAccessRepository(cfg.NamespaceCandidates, cfg.Namespace),
		DashboardConfig:            dashboardConfig,
		Status:                     NewStatusRepository(cfg.SADynClient, cfg.Namespace, auth, config.ResolveAdmissionMode(cfg.AdmissionMode, cfg.Platform, cfg.PlatformConfirmed)),
		Auth:                       auth,
		Components:                 components,
		ClusterSettings:            clusterSettings,
		ConnectionType:             connectionType,
		AllowedUsers:               NewAllowedUsersRepository(cfg.SADynClient),
		ServingRuntime:             servingRuntime,
		NIM:                        NewNIMRepository(cfg.SADynClient, cfg.SAClientset),
		NamespaceMutation:          namespaceMutation,
		Prometheus:                 NewPrometheusRepository(cfg.Prometheus),
		OperatorSubscriptionStatus: NewOperatorSubscriptionStatusRepository(cfg.SADynClient, cfg.OperatorNamespace),
	}
}
