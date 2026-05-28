package repositories

import (
	"context"
	"crypto/x509"

	ogx "github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	corepipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck     *HealthCheckRepository
	User            *UserRepository
	Namespace       *NamespaceRepository
	OGXModels       *OGXModelsRepository
	OGXVectorStores *OGXVectorStoresRepository
	Secret          *SecretRepository
	S3              S3RepositoryInterface
	Pipelines       *PipelinesRepository
}

// RepositoriesConfig holds the dependencies needed to construct all repositories.
type RepositoriesConfig struct {
	K8sService         *corek8s.K8sService
	PipelinesService   *corepipelines.PipelinesService
	PipelinesCfg       PipelinesRepositoryConfig
	S3Service          *cores3.S3Service
	OGXClientFactory   ogx.OGXClientFactory
	InsecureSkipVerify bool
	RootCAs            *x509.CertPool
	RewriteURL         func(context.Context, string) (string, error)
}

func NewRepositories(cfg RepositoriesConfig) *Repositories {
	return &Repositories{
		HealthCheck:     NewHealthCheckRepository(),
		User:            NewUserRepository(),
		Namespace:       NewNamespaceRepository(),
		OGXModels:       NewOGXModelsRepository(cfg.K8sService, cfg.OGXClientFactory, cfg.InsecureSkipVerify, cfg.RootCAs, cfg.RewriteURL),
		OGXVectorStores: NewOGXVectorStoresRepository(cfg.K8sService, cfg.OGXClientFactory, cfg.InsecureSkipVerify, cfg.RootCAs, cfg.RewriteURL),
		Secret:          NewSecretRepository(),
		S3:              NewS3Repository(cfg.S3Service, cfg.K8sService, cfg.PipelinesService),
		Pipelines:       NewPipelinesRepository(cfg.PipelinesService, cfg.PipelinesCfg),
	}
}
