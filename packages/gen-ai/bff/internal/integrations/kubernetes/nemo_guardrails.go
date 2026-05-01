package kubernetes

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/models"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	nemoGuardrailsCRName          = "nemoguardrails"
	nemoGuardrailsPlaceholderName = "guardrail-placeholder"
)

// buildNemoPlaceholderConfigMapData returns the ConfigMap data for the placeholder config.
// The placeholder uses a fake model and endpoint — real model details are supplied at
// runtime via inline config in each guardrail/checks request.
func buildNemoPlaceholderConfigMapData() map[string]string {
	return map[string]string{
		"config.yaml": fmt.Sprintf(`models:
  - type: main
    engine: openai
    model: placeholder
    api_key_env_var: %s
    parameters:
      openai_api_base: "http://placeholder.invalid/v1"
rails:
  input:
    flows:
      - self check input
  output:
    flows:
      - self check output
`, constants.NemoGuardrailsOpenAIAPIKeyEnvName),
		"prompts.yml": constants.NemoGuardrailsSelfCheckPromptsYAML,
		"rails.co":    constants.NemoGuardrailsRailsCo,
	}
}

// CreateNemoGuardrailsResources creates a placeholder ConfigMap and NemoGuardrails CR in the
// namespace. Returns an error if NemoGuardrails is already initialised — this is a one-time
// setup; the UI should check for an existing CR before calling.
//
// The actual model, prompts, and API key are supplied at request time via inline config in
// each guardrail/checks call — no per-model K8s resources are needed.
//
// Returns the name of the created NemoGuardrails CR.
func (kc *TokenKubernetesClient) CreateNemoGuardrailsResources(
	ctx context.Context,
	namespace string,
) (string, error) {
	// Guard: fail fast if NemoGuardrails already exists in this namespace.
	existing, err := kc.GetNemoGuardrailsCR(ctx, namespace)
	if err != nil && !apierrors.IsNotFound(err) {
		return "", fmt.Errorf("failed to check for existing NemoGuardrails CR: %w", err)
	}
	if existing != nil {
		return "", &models.ErrNemoGuardrailsAlreadyInitialised{Namespace: namespace}
	}

	// Step 1: Create the placeholder ConfigMap.
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      nemoGuardrailsPlaceholderName,
			Namespace: namespace,
			Labels:    map[string]string{OpenDataHubDashboardLabelKey: "true"},
		},
		Data: buildNemoPlaceholderConfigMapData(),
	}
	if err := kc.Client.Create(ctx, cm); err != nil {
		return "", fmt.Errorf("failed to create NemoGuardrails placeholder ConfigMap: %w", err)
	}
	kc.Logger.Info("created NemoGuardrails ConfigMap", "name", cm.Name, "namespace", namespace)

	// Step 2: Create the NemoGuardrails CR pointing to the placeholder.
	cr := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": constants.NemoGuardrailsAPIVersion,
			"kind":       constants.NemoGuardrailsKind,
			"metadata": map[string]interface{}{
				"name":      nemoGuardrailsCRName,
				"namespace": namespace,
				"labels":    map[string]interface{}{OpenDataHubDashboardLabelKey: "true"},
				"annotations": map[string]interface{}{
					constants.NemoGuardrailsEnableAuthAnnotation: "true",
				},
			},
			"spec": map[string]interface{}{
				"nemoConfigs": []interface{}{
					map[string]interface{}{
						"name":       nemoGuardrailsPlaceholderName,
						"configMaps": []interface{}{nemoGuardrailsPlaceholderName},
						"default":    true,
					},
				},
				"env": []interface{}{
					map[string]interface{}{
						"name":  constants.NemoGuardrailsOpenAIAPIKeyEnvName,
						"value": constants.NemoGuardrailsOpenAIAPIKeyFakeValue,
					},
				},
			},
		},
	}
	cr.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "trustyai.opendatahub.io",
		Version: "v1alpha1",
		Kind:    constants.NemoGuardrailsKind,
	})

	if err := kc.Client.Create(ctx, cr); err != nil {
		if apierrors.IsAlreadyExists(err) {
			// A concurrent init completed between our GetNemoGuardrailsCR check and now.
			// Clean up the placeholder ConfigMap we just created before returning.
			if deleteErr := kc.Client.Delete(ctx, cm); deleteErr != nil {
				kc.Logger.Error("failed to clean up ConfigMap after concurrent CR creation", "error", deleteErr)
			}
			return "", &models.ErrNemoGuardrailsAlreadyInitialised{Namespace: namespace}
		}
		// Unexpected server error — clean up the ConfigMap we just created.
		if deleteErr := kc.Client.Delete(ctx, cm); deleteErr != nil {
			kc.Logger.Error("failed to clean up ConfigMap after CR creation failure", "error", deleteErr)
		}
		return "", fmt.Errorf("failed to create NemoGuardrails CR: %w", err)
	}

	// Set the NemoGuardrails CR as owner of the ConfigMap so it is garbage collected
	// when the CR is deleted.
	cm.OwnerReferences = []metav1.OwnerReference{
		{
			APIVersion:         constants.NemoGuardrailsAPIVersion,
			Kind:               constants.NemoGuardrailsKind,
			Name:               nemoGuardrailsCRName,
			UID:                cr.GetUID(),
			Controller:         &[]bool{true}[0],
			BlockOwnerDeletion: &[]bool{false}[0],
		},
	}
	if err := kc.Client.Update(ctx, cm); err != nil {
		// Roll back both resources so we don't leave a CR without a properly owned ConfigMap.
		if deleteErr := kc.Client.Delete(ctx, cr); deleteErr != nil {
			kc.Logger.Error("failed to clean up CR after owner reference update failure", "error", deleteErr)
		}
		if deleteErr := kc.Client.Delete(ctx, cm); deleteErr != nil {
			kc.Logger.Error("failed to clean up ConfigMap after owner reference update failure", "error", deleteErr)
		}
		return "", fmt.Errorf("failed to set owner reference on NemoGuardrails ConfigMap: %w", err)
	}

	kc.Logger.Info("NemoGuardrails resources created", "namespace", namespace)
	return nemoGuardrailsCRName, nil
}

// GetNemoGuardrailsStatus returns the status of the NemoGuardrails CR in the given namespace.
// Returns a 404 K8s error if the CR does not exist.
func (kc *TokenKubernetesClient) GetNemoGuardrailsStatus(ctx context.Context, namespace string) (*models.NemoGuardrailsStatus, error) {
	cr, err := kc.GetNemoGuardrailsCR(ctx, namespace)
	if err != nil {
		if apierrors.IsNotFound(err) {
			return nil, NewK8sErrorWithNamespace(ErrCodeNotFound, "NemoGuardrails not found", namespace, 404)
		}
		return nil, NewK8sErrorWithNamespace(ErrCodeInternalError,
			fmt.Sprintf("failed to get NemoGuardrails: %v", err), namespace, 500)
	}

	// Extract phase from status.conditions — look for the ReconcileComplete condition
	// or fall back to Progressing if none indicate readiness.
	phase := constants.GuardrailsPhaseProgressing
	isReady := false

	if status, ok := cr.Object["status"].(map[string]interface{}); ok {
		if rawPhase, ok := status["phase"].(string); ok && rawPhase != "" {
			phase = rawPhase
			isReady = rawPhase == constants.GuardrailsPhaseReady
		}
	}

	return &models.NemoGuardrailsStatus{
		Name:    cr.GetName(),
		Phase:   phase,
		IsReady: isReady,
	}, nil
}

// GetNemoGuardrailsCR returns the NemoGuardrails CR in the given namespace, or nil if not found.
func (kc *TokenKubernetesClient) GetNemoGuardrailsCR(ctx context.Context, namespace string) (*unstructured.Unstructured, error) {
	cr := &unstructured.Unstructured{}
	cr.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "trustyai.opendatahub.io",
		Version: "v1alpha1",
		Kind:    constants.NemoGuardrailsKind,
	})
	if err := kc.Client.Get(ctx, client.ObjectKey{Name: nemoGuardrailsCRName, Namespace: namespace}, cr); err != nil {
		return nil, err
	}
	return cr, nil
}
