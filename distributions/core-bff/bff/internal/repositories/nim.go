package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/k8sutil"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

// NIMRepository handles NIM Account CR and related resource operations.
// Shared by the nim-serving cross-resource lookup and the integrations/nim endpoints.
type NIMRepository struct {
	saDynClient dynamic.Interface
	saClientset kubernetes.Interface
}

func NewNIMRepository(saDynClient dynamic.Interface, saClientset kubernetes.Interface) *NIMRepository {
	return &NIMRepository{saDynClient: saDynClient, saClientset: saClientset}
}

// GetNIMAccount lists NIM Account CRs and returns the first one.
func (r *NIMRepository) GetNIMAccount(ctx context.Context, namespace string) (*unstructured.Unstructured, error) {
	list, err := r.saDynClient.Resource(models.NIMAccountGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list NIM accounts: %w", err)
	}
	if len(list.Items) == 0 {
		return nil, nil
	}
	return &list.Items[0], nil
}

// GetNIMServingResource performs the cross-resource lookup for a NIM serving resource.
// It fetches the NIM Account CR, resolves the resource name from it, then fetches the
// Secret or ConfigMap.
func (r *NIMRepository) GetNIMServingResource(ctx context.Context, namespace, nimResource string) (interface{}, error) {
	mapping, ok := models.NIMResourceMap[nimResource]
	if !ok {
		return nil, &models.NIMNotFoundError{Reason: fmt.Sprintf("invalid NIM resource type %q", nimResource)}
	}

	account, err := r.GetNIMAccount(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to get NIM account: %w", err)
	}
	if account == nil {
		return nil, &models.NIMNotFoundError{Reason: fmt.Sprintf("no NIM account found in namespace %q", namespace)}
	}

	resourceName, found, err := unstructured.NestedString(account.Object, mapping.Path...)
	if err != nil || !found || resourceName == "" {
		return nil, &models.NIMNotFoundError{Reason: fmt.Sprintf("resource name not found in NIM account at path %v", mapping.Path)}
	}

	return r.fetchNIMResource(ctx, mapping.ResourceType, namespace, resourceName)
}

// fetchNIMResource fetches a Secret or ConfigMap by type and name.
func (r *NIMRepository) fetchNIMResource(ctx context.Context, resourceType, namespace, name string) (interface{}, error) {
	var result interface{}
	var err error

	switch resourceType {
	case "Secret":
		result, err = r.saClientset.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	case "ConfigMap":
		result, err = r.saClientset.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	default:
		return nil, fmt.Errorf("unsupported resource type %q", resourceType)
	}

	if err != nil {
		if k8serrors.IsNotFound(err) {
			return nil, &models.NIMNotFoundError{Reason: fmt.Sprintf("%s %q not found", strings.ToLower(resourceType), name)}
		}
		return nil, fmt.Errorf("failed to get %s %q: %w", strings.ToLower(resourceType), name, err)
	}
	return result, nil
}

// GetNIMStatus derives the NIM integration status from the Account CR.
func (r *NIMRepository) GetNIMStatus(ctx context.Context, namespace string) (*models.NIMIntegrationStatus, error) {
	account, err := r.GetNIMAccount(ctx, namespace)
	if err != nil {
		if k8serrors.IsNotFound(err) || k8sutil.IsDiscoveryError(err) {
			return &models.NIMIntegrationStatus{
				VariablesValidationStatus: "Unknown",
				CanInstall:                false,
				Error:                     "NIM not installed",
			}, nil
		}
		return &models.NIMIntegrationStatus{
			VariablesValidationStatus: "Unknown",
			CanInstall:                false,
			Error:                     "An unexpected error occurred. Please try again later.",
		}, nil
	}

	if account == nil {
		return &models.NIMIntegrationStatus{
			CanInstall:                true,
			VariablesValidationStatus: "Unknown",
		}, nil
	}

	return deriveStatusFromAccount(account), nil
}

// CreateNIMAccount creates or updates the NIM secret and ensures the Account CR exists.
func (r *NIMRepository) CreateNIMAccount(ctx context.Context, namespace string, secretData map[string]string) (*models.NIMIntegrationStatus, error) {
	if err := r.manageNIMSecret(ctx, namespace, secretData); err != nil {
		return nil, fmt.Errorf("failed to manage NIM secret: %w", err)
	}

	account, err := r.GetNIMAccount(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing NIM account: %w", err)
	}

	if account == nil {
		obj := &unstructured.Unstructured{
			Object: map[string]interface{}{
				"apiVersion": "nim.opendatahub.io/v1",
				"kind":       models.NIMAccountKind,
				"metadata": map[string]interface{}{
					"name":      models.NIMAccountName,
					"namespace": namespace,
					"labels": map[string]interface{}{
						models.NIMManagedLabel: "true",
					},
				},
				"spec": map[string]interface{}{
					"apiKeySecret": map[string]interface{}{
						"name": models.NIMSecretName,
					},
				},
			},
		}
		_, err = r.saDynClient.Resource(models.NIMAccountGVR).Namespace(namespace).Create(ctx, obj, metav1.CreateOptions{})
		if err != nil && !k8serrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("failed to create NIM account: %w", err)
		}
	}

	return r.GetNIMStatus(ctx, namespace)
}

// DeleteNIMAccount deletes the NIM Account CR.
func (r *NIMRepository) DeleteNIMAccount(ctx context.Context, namespace string) (*models.NIMDeleteResponse, error) {
	err := r.saDynClient.Resource(models.NIMAccountGVR).Namespace(namespace).Delete(ctx, models.NIMAccountName, metav1.DeleteOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) || k8sutil.IsDiscoveryError(err) {
			return &models.NIMDeleteResponse{
				Success: false,
				Error:   "Unable to delete NIM account: the resource was not found",
			}, nil
		}
		return nil, fmt.Errorf("failed to delete NIM account: %w", err)
	}
	return &models.NIMDeleteResponse{Success: true}, nil
}

// manageNIMSecret creates or replaces the NIM access secret.
// On update, the secret is reset to template state (matching Fastify's blind-replace behavior).
// This wipes any metadata added by external controllers. If that becomes a problem we can
// switch to fetch-modify-update in the future.
func (r *NIMRepository) manageNIMSecret(ctx context.Context, namespace string, data map[string]string) error {
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      models.NIMSecretName,
			Namespace: namespace,
			Labels: map[string]string{
				models.NIMManagedLabel: "true",
			},
		},
		Type:       corev1.SecretTypeOpaque,
		StringData: data,
	}

	_, err := r.saClientset.CoreV1().Secrets(namespace).Create(ctx, secret, metav1.CreateOptions{})
	if err != nil {
		if !k8serrors.IsAlreadyExists(err) {
			return fmt.Errorf("failed to create NIM secret: %w", err)
		}
		existing, getErr := r.saClientset.CoreV1().Secrets(namespace).Get(ctx, models.NIMSecretName, metav1.GetOptions{})
		if getErr != nil {
			return fmt.Errorf("failed to get existing NIM secret for replace: %w", getErr)
		}
		secret.ResourceVersion = existing.ResourceVersion
		secret.Annotations = map[string]string{
			models.NIMForceValidationAnnot: time.Now().UTC().Format(time.RFC3339),
		}
		_, updateErr := r.saClientset.CoreV1().Secrets(namespace).Update(ctx, secret, metav1.UpdateOptions{})
		if updateErr != nil {
			return fmt.Errorf("failed to replace NIM secret: %w", updateErr)
		}
	}
	return nil
}

// deriveStatusFromAccount extracts integration status from the NIM Account CR conditions.
func deriveStatusFromAccount(account *unstructured.Unstructured) *models.NIMIntegrationStatus {
	status := &models.NIMIntegrationStatus{
		IsInstalled:               true,
		VariablesValidationStatus: "Unknown",
	}

	conditions, found, _ := unstructured.NestedSlice(account.Object, "status", "conditions")
	if !found {
		status.CanInstall = true
		return status
	}

	var errorMessages []string
	for _, c := range conditions {
		cond, ok := c.(map[string]interface{})
		if !ok {
			continue
		}
		condType, _, _ := unstructured.NestedString(cond, "type")
		condStatus, _, _ := unstructured.NestedString(cond, "status")
		condMessage, _, _ := unstructured.NestedString(cond, "message")

		switch condType {
		case "AccountStatus":
			status.IsEnabled = condStatus == "True"
		case "APIKeyValidation":
			status.VariablesValidationStatus = condStatus
		}

		if condStatus != "True" && condMessage != "" {
			errorMessages = append(errorMessages, condMessage)
		}
	}
	if len(errorMessages) > 0 {
		status.Error = strings.Join(errorMessages, "; ")
	}

	lastCheck, _, _ := unstructured.NestedString(account.Object, "status", "lastAccountCheck")
	status.VariablesValidationTimestamp = lastCheck
	status.CanInstall = !status.IsEnabled

	return status
}
