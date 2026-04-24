package kubernetes

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
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

// upsertNemoConfigMap creates the ConfigMap if it does not exist, or updates its data if it does.
func (kc *TokenKubernetesClient) upsertNemoConfigMap(ctx context.Context, cm *corev1.ConfigMap) error {
	err := kc.Client.Create(ctx, cm)
	if err == nil {
		kc.Logger.Info("created NemoGuardrails ConfigMap", "name", cm.Name, "namespace", cm.Namespace)
		return nil
	}
	if !apierrors.IsAlreadyExists(err) {
		return err
	}

	existing := &corev1.ConfigMap{}
	if err := kc.Client.Get(ctx, client.ObjectKey{Name: cm.Name, Namespace: cm.Namespace}, existing); err != nil {
		return fmt.Errorf("failed to get existing NemoGuardrails ConfigMap %q: %w", cm.Name, err)
	}
	cm.ResourceVersion = existing.ResourceVersion
	if err := kc.Client.Update(ctx, cm); err != nil {
		return fmt.Errorf("failed to update NemoGuardrails ConfigMap %q: %w", cm.Name, err)
	}
	kc.Logger.Info("updated NemoGuardrails ConfigMap", "name", cm.Name, "namespace", cm.Namespace)
	return nil
}

// upsertNemoGuardrailsCR creates the NemoGuardrails CR if it does not exist, or updates its spec
// if it does. Only spec is replaced on update; operator-managed metadata fields are preserved.
func (kc *TokenKubernetesClient) upsertNemoGuardrailsCR(ctx context.Context, namespace string, cr *unstructured.Unstructured) error {
	err := kc.Client.Create(ctx, cr)
	if err == nil {
		kc.Logger.Info("created NemoGuardrails CR", "name", nemoGuardrailsCRName, "namespace", namespace)
		return nil
	}
	if !apierrors.IsAlreadyExists(err) {
		return err
	}

	existing, err := kc.GetNemoGuardrailsCR(ctx, namespace)
	if err != nil {
		return fmt.Errorf("failed to get existing NemoGuardrails CR: %w", err)
	}
	existing.Object["spec"] = cr.Object["spec"]
	if err := kc.Client.Update(ctx, existing); err != nil {
		return fmt.Errorf("failed to update NemoGuardrails CR: %w", err)
	}
	kc.Logger.Info("updated NemoGuardrails CR", "name", nemoGuardrailsCRName, "namespace", namespace)
	return nil
}

// CreateNemoGuardrailsResources creates a placeholder ConfigMap and NemoGuardrails CR in the
// namespace. The actual model, prompts, and API key are supplied at request time via inline
// config in each guardrail/checks call — no per-model K8s resources are needed.
//
// Returns the name of the NemoGuardrails CR.
func (kc *TokenKubernetesClient) CreateNemoGuardrailsResources(
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
) (string, error) {
	// Step 1: Upsert the placeholder ConfigMap.
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      nemoGuardrailsPlaceholderName,
			Namespace: namespace,
			Labels:    map[string]string{OpenDataHubDashboardLabelKey: "true"},
		},
		Data: buildNemoPlaceholderConfigMapData(),
	}
	if err := kc.upsertNemoConfigMap(ctx, cm); err != nil {
		return "", fmt.Errorf("failed to upsert NemoGuardrails placeholder ConfigMap: %w", err)
	}

	// Step 2: Upsert the NemoGuardrails CR pointing to the placeholder.
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

	if err := kc.upsertNemoGuardrailsCR(ctx, namespace, cr); err != nil {
		return "", fmt.Errorf("failed to upsert NemoGuardrails CR: %w", err)
	}

	kc.Logger.Info("NemoGuardrails resources reconciled", "namespace", namespace)
	return nemoGuardrailsCRName, nil
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
