package kubernetes

import (
	"context"
	"errors"

	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/types"
	corev1 "k8s.io/api/core/v1"
)

// ErrExternalModelNotFound is returned when an external model is not found in the ConfigMap
var ErrExternalModelNotFound = errors.New("external model not found")

const ComponenetLabelValue = "llama-stack"

type KubernetesClientInterface interface {
	// Namespace access
	GetNamespaces(ctx context.Context, identity *integrations.RequestIdentity) ([]corev1.Namespace, error)
	CanListNamespaces(ctx context.Context, identity *integrations.RequestIdentity) (bool, error)
	GetAAModels(ctx context.Context, identity *integrations.RequestIdentity, namespace string) ([]models.AAModel, error)

	// Meta
	IsClusterAdmin(ctx context.Context, identity *integrations.RequestIdentity) (bool, error)
	BearerToken() (string, error)

	// Identity
	GetUser(ctx context.Context, identity *integrations.RequestIdentity) (string, error)

	// LlamaStack Distribution
	GetLlamaStackDistributions(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*lsdapi.LlamaStackDistributionList, error)
	CanListLlamaStackDistributions(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (bool, error)
	InstallLlamaStackDistribution(ctx context.Context, identity *integrations.RequestIdentity, namespace string, installModels []models.InstallModel, vectorStores []models.InstallVectorStore, maasClient maas.MaaSClientInterface) (*lsdapi.LlamaStackDistribution, error)
	DeleteLlamaStackDistribution(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) (*lsdapi.LlamaStackDistribution, error)
	GetModelProviderInfo(ctx context.Context, identity *integrations.RequestIdentity, namespace string, modelID string) (*types.ModelProviderInfo, error)

	// NemoGuardrails operations
	CreateNemoGuardrailsResources(ctx context.Context, namespace string) (string, error)
	GetNemoGuardrailsStatus(ctx context.Context, namespace string) (*models.NemoGuardrailsStatus, error)

	// ConfigMap operations
	GetConfigMap(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) (*corev1.ConfigMap, error)

	// External Models operations
	GenerateProviderID(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (string, error)
	CreateExternalModelSecret(ctx context.Context, identity *integrations.RequestIdentity, namespace string, secretName string, secretValue string) error
	CreateOrUpdateExternalModelConfigMap(ctx context.Context, identity *integrations.RequestIdentity, namespace string, providerID string, secretName string, req models.ExternalModelRequest) error
	DeleteExternalModel(ctx context.Context, identity *integrations.RequestIdentity, namespace string, modelID string) error
	DeleteSecret(ctx context.Context, identity *integrations.RequestIdentity, namespace string, secretName string) error
	GetExternalModelsConfig(ctx context.Context, namespace string) (*models.ExternalModelsConfig, error)
	GetVectorStoresConfig(ctx context.Context, namespace string) (*models.ExternalVectorStoresDocument, error)
	GetSecretValue(ctx context.Context, identity *integrations.RequestIdentity, namespace string, secretName string, secretKey string) (string, error)

	// Guardrails operations
	CanListGuardrailsOrchestrator(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (bool, error)
	GetGuardrailsOrchestratorStatus(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*models.GuardrailsStatus, error)

	// NemoGuardrails operations
	// GetNemoGuardrailsServiceURL returns the in-cluster service URL for the NemoGuardrails CR
	// in the given namespace. Returns ("", nil) if no NemoGuardrails CR exists.
	GetNemoGuardrailsServiceURL(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (string, error)
}
