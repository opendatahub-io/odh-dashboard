package repositories

import (
	"context"
	"fmt"
	"log/slog"

	corev1 "k8s.io/api/core/v1"
	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// SecretsRepository handles Kubernetes Secret operations.
type SecretsRepository struct {
	logger     *slog.Logger
	k8sFactory kubernetes.KubernetesClientFactory
}

// NewSecretsRepository creates a new Secrets repository.
func NewSecretsRepository(logger *slog.Logger, k8sFactory kubernetes.KubernetesClientFactory) *SecretsRepository {
	return &SecretsRepository{
		logger:     logger,
		k8sFactory: k8sFactory,
	}
}

// ListSecrets returns BBR-managed Secret names in a namespace (never values).
func (r *SecretsRepository) ListSecrets(ctx context.Context, namespace string) ([]models.SecretSummary, error) {
	r.logger.Debug("Listing Secrets", slog.String("namespace", namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	list, err := client.GetKubeClient().CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: secretBBRManagedLabelKey + "=" + secretBBRManagedLabelValue,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list Secrets: %w", err)
	}

	summaries := make([]models.SecretSummary, 0, len(list.Items))
	for _, item := range list.Items {
		summaries = append(summaries, models.SecretSummary{Name: item.Name})
	}
	return summaries, nil
}

// CreateSecret creates an opaque Secret with the api-key data key.
func (r *SecretsRepository) CreateSecret(ctx context.Context, request models.CreateSecretRequest) (*models.CreateSecretResponse, error) {
	r.logger.Debug("Creating Secret", slog.String("name", request.Name), slog.String("namespace", request.Namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      request.Name,
			Namespace: request.Namespace,
			Labels: map[string]string{
				secretBBRManagedLabelKey: secretBBRManagedLabelValue,
			},
		},
		Type: corev1.SecretTypeOpaque,
		StringData: map[string]string{
			secretDataKeyAPIKey: request.Value,
		},
	}

	created, err := client.GetKubeClient().CoreV1().Secrets(request.Namespace).Create(ctx, secret, metav1.CreateOptions{})
	if err != nil {
		if k8sErrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("Secret '%s' already exists", request.Name)
		}
		return nil, fmt.Errorf("failed to create Secret: %w", err)
	}

	return &models.CreateSecretResponse{Name: created.Name}, nil
}
