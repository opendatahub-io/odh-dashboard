package repositories

import (
	"context"
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// SubscriptionsRepositoryInterface defines the contract for subscription operations.
type SubscriptionsRepositoryInterface interface {
	ListSubscriptions(ctx context.Context) ([]models.MaaSSubscription, error)
	GetSubscription(ctx context.Context, name string) (*models.MaaSSubscription, error)
	CreateSubscription(ctx context.Context, request models.CreateSubscriptionRequest) (*models.CreateSubscriptionResponse, error)
	UpdateSubscription(ctx context.Context, name string, request models.UpdateSubscriptionRequest) (*models.CreateSubscriptionResponse, error)
	DeleteSubscription(ctx context.Context, name string) error
	GetFormData(ctx context.Context) (*models.SubscriptionFormDataResponse, error)
	GetAuthPoliciesForSubscription(ctx context.Context, subscriptionName string) ([]models.MaaSAuthPolicy, error)
	GetModelRefSummaries(ctx context.Context, refs []models.ModelSubscriptionRef) ([]models.MaaSModelRefSummary, error)
}

// MaaSModelRefsRepositoryInterface defines the contract for MaaSModelRef operations.
type MaaSModelRefsRepositoryInterface interface {
	CreateMaaSModelRef(ctx context.Context, request models.CreateMaaSModelRefRequest) (*models.MaaSModelRefSummary, error)
	UpdateMaaSModelRef(ctx context.Context, namespace, name string, request models.UpdateMaaSModelRefRequest) (*models.MaaSModelRefSummary, error)
	DeleteMaaSModelRef(ctx context.Context, namespace, name string) error
}

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck   *HealthCheckRepository
	User          *UserRepository
	Namespace     *NamespaceRepository
	Tiers         *TiersRepository
	APIKeys       *APIKeysRepository
	Models        *ModelsRepository
	Subscriptions SubscriptionsRepositoryInterface
	MaaSModelRefs MaaSModelRefsRepositoryInterface
}

func NewRepositories(
	logger *slog.Logger,
	k8sFactory kubernetes.KubernetesClientFactory,
	config config.EnvConfig,
	subscriptions SubscriptionsRepositoryInterface,
	maasModelRefs MaaSModelRefsRepositoryInterface,
) (*Repositories, error) {
	apiKeysRepo, err := NewAPIKeysRepository(logger, config.MaasApiUrl)
	if err != nil {
		return nil, err
	}

	modelsRepo, err := NewModelsRepository(logger, config.MaasApiUrl)
	if err != nil {
		return nil, err
	}

	return &Repositories{
		HealthCheck: NewHealthCheckRepository(),
		User:        NewUserRepository(),
		Namespace:   NewNamespaceRepository(),
		Tiers: NewTiersRepository(
			logger,
			k8sFactory,
			config.TiersConfigMapNamespace,
			config.TiersConfigMapName,
			config.GatewayNamespace,
			config.GatewayName),
		APIKeys:       apiKeysRepo,
		Models:        modelsRepo,
		Subscriptions: subscriptions,
		MaaSModelRefs: maasModelRefs,
	}, nil
}
