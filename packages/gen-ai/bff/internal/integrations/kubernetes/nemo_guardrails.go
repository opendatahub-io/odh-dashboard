package kubernetes

import (
	"context"
	"fmt"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
	"github.com/opendatahub-io/gen-ai/internal/models"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const nemoGuardrailsCRName = "nemoguardrails"

// nemoGuardrailsModelInfo holds per-model data resolved during NemoGuardrails resource creation.
type nemoGuardrailsModelInfo struct {
	modelID     string
	endpointURL string // OpenAI-compatible endpoint (with /v1 suffix)
	sourceType  models.ModelSourceTypeEnum
	cmName      string // Kubernetes ConfigMap name, e.g. "guardrail-maas-granite-3b"
}

// sourceTypeSlug returns the URL-safe slug for a ModelSourceTypeEnum used in resource names.
func sourceTypeSlug(t models.ModelSourceTypeEnum) string {
	switch t {
	case models.ModelSourceTypeMaaS:
		return "maas"
	case models.ModelSourceTypeCustomEndpoint:
		return "custom-endpoint"
	default:
		return "namespace"
	}
}

// sanitizeGuardrailName converts an arbitrary model name into a valid Kubernetes resource name
// segment. It lowercases the string, replaces any character that is not [a-z0-9-] with a hyphen,
// collapses consecutive hyphens, trims leading/trailing hyphens, and truncates to 50 characters
// to leave room for the "guardrail-<source-type>-" prefix within the 253-character DNS name limit.
func sanitizeGuardrailName(name string) string {
	var b strings.Builder
	prevHyphen := false
	for _, r := range strings.ToLower(name) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			prevHyphen = false
		} else {
			if !prevHyphen {
				b.WriteRune('-')
				prevHyphen = true
			}
		}
	}
	result := strings.Trim(b.String(), "-")
	if len(result) > 50 {
		result = strings.TrimRight(result[:50], "-")
	}
	return result
}

// nemoGuardrailsConfigMapName returns the full ConfigMap name for a model, encoding the
// source type in the name so tooling can identify model provenance without parsing annotations.
// Example: "guardrail-maas-granite-3b", "guardrail-namespace-my-llm"
func nemoGuardrailsConfigMapName(modelID string, sourceType models.ModelSourceTypeEnum) string {
	return constants.NemoGuardrailsConfigMapPrefix + sourceTypeSlug(sourceType) + "-" + sanitizeGuardrailName(modelID)
}

// buildNemoConfigYAML returns the config.yaml content for a single NemoGuardrails model entry.
// Follows the sample-7 pattern: top-level model field + api_key_env_var pointing to OPENAI_API_KEY.
func buildNemoConfigYAML(modelID, endpointURL string) string {
	return fmt.Sprintf(`models:
  - type: main
    engine: openai
    model: %s
    api_key_env_var: %s
    parameters:
      openai_api_base: "%s"
rails:
  input:
    flows:
      - self check input
  output:
    flows:
      - self check output
`, modelID, constants.NemoGuardrailsOpenAIAPIKeyEnvName, endpointURL)
}

// buildNemoGuardrailsConfigMapData returns the three-key data map for a per-model ConfigMap.
func buildNemoGuardrailsConfigMapData(modelID, endpointURL string) map[string]string {
	return map[string]string{
		"config.yaml": buildNemoConfigYAML(modelID, endpointURL),
		"prompts.yml": constants.NemoGuardrailsSelfCheckPromptsYAML,
		"rails.co":    constants.NemoGuardrailsRailsCo,
	}
}

// buildMaaSModelsMapForNemo calls maasClient.ListModels once and returns a map keyed by model ID.
// Returns an empty map (not an error) when maasClient is nil or no MaaS models are requested.
func buildMaaSModelsMapForNemo(
	ctx context.Context,
	installModels []models.InstallModel,
	maasClient maas.MaaSClientInterface,
	userAuthToken string,
) (map[string]*models.MaaSModel, error) {
	result := make(map[string]*models.MaaSModel)
	if maasClient == nil {
		return result, nil
	}

	hasMaaS := false
	for _, m := range installModels {
		if m.ModelSourceType == models.ModelSourceTypeMaaS {
			hasMaaS = true
			break
		}
	}
	if !hasMaaS {
		return result, nil
	}

	maasModels, err := maasClient.ListModels(ctx, userAuthToken)
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaS models: %w", err)
	}
	for i := range maasModels {
		m := &maasModels[i]
		result[m.ID] = m
	}
	return result, nil
}

// resolveNemoGuardrailsModelInfo resolves the model ID and endpoint URL for a single install model.
func (kc *TokenKubernetesClient) resolveNemoGuardrailsModelInfo(
	ctx context.Context,
	namespace string,
	model models.InstallModel,
	maasModelsMap map[string]*models.MaaSModel,
	externalModelsConfig *models.ExternalModelsConfig,
) (nemoGuardrailsModelInfo, error) {
	switch {
	case model.ModelSourceType == models.ModelSourceTypeMaaS:
		maasModel, ok := maasModelsMap[model.ModelName]
		if !ok {
			return nemoGuardrailsModelInfo{}, fmt.Errorf("MaaS model %q not found", model.ModelName)
		}
		endpointURL := ensureVLLMCompatibleURL(maasModel.URL)
		return nemoGuardrailsModelInfo{
			modelID:     maasModel.ID,
			endpointURL: endpointURL,
			sourceType:  model.ModelSourceType,
			cmName:      nemoGuardrailsConfigMapName(maasModel.ID, model.ModelSourceType),
		}, nil

	case models.IsExternalModelSource(model.ModelSourceType):
		if externalModelsConfig == nil {
			return nemoGuardrailsModelInfo{}, fmt.Errorf("external models config not loaded for model %q", model.ModelName)
		}
		extDetails, err := kc.getExternalModelDetails(externalModelsConfig, model.ModelName)
		if err != nil {
			return nemoGuardrailsModelInfo{}, fmt.Errorf("cannot find external model %q: %w", model.ModelName, err)
		}
		return nemoGuardrailsModelInfo{
			modelID:     extDetails.modelID,
			endpointURL: extDetails.endpointURL,
			sourceType:  model.ModelSourceType,
			cmName:      nemoGuardrailsConfigMapName(extDetails.modelID, model.ModelSourceType),
		}, nil

	default: // namespace
		details, err := kc.getModelDetailsFromServingRuntime(ctx, namespace, model.ModelName)
		if err != nil {
			return nemoGuardrailsModelInfo{}, fmt.Errorf("cannot determine endpoint for model %q: %w", model.ModelName, err)
		}
		return nemoGuardrailsModelInfo{
			modelID:     details.modelID,
			endpointURL: details.endpointURL,
			sourceType:  model.ModelSourceType,
			cmName:      nemoGuardrailsConfigMapName(details.modelID, model.ModelSourceType),
		}, nil
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
	// Replace only spec, preserving ResourceVersion and operator-managed metadata.
	existing.Object["spec"] = cr.Object["spec"]
	if err := kc.Client.Update(ctx, existing); err != nil {
		return fmt.Errorf("failed to update NemoGuardrails CR: %w", err)
	}
	kc.Logger.Info("updated NemoGuardrails CR", "name", nemoGuardrailsCRName, "namespace", namespace)
	return nil
}

// deleteStaleNemoConfigMaps removes any ConfigMaps whose names begin with the guardrail prefix
// and carry the dashboard label but are no longer referenced by the current model set.
func (kc *TokenKubernetesClient) deleteStaleNemoConfigMaps(ctx context.Context, namespace string, activeNames map[string]bool) {
	cmList := &corev1.ConfigMapList{}
	if err := kc.Client.List(ctx, cmList,
		client.InNamespace(namespace),
		client.MatchingLabels{OpenDataHubDashboardLabelKey: "true"},
	); err != nil {
		kc.Logger.Warn("failed to list ConfigMaps for stale NemoGuardrails cleanup", "error", err)
		return
	}

	for i := range cmList.Items {
		cm := &cmList.Items[i]
		if !strings.HasPrefix(cm.Name, constants.NemoGuardrailsConfigMapPrefix) || activeNames[cm.Name] {
			continue
		}
		if err := kc.Client.Delete(ctx, cm); err != nil && !apierrors.IsNotFound(err) {
			kc.Logger.Warn("failed to delete stale NemoGuardrails ConfigMap", "name", cm.Name, "error", err)
		} else {
			kc.Logger.Info("deleted stale NemoGuardrails ConfigMap", "name", cm.Name, "namespace", namespace)
		}
	}
}

// CreateNemoGuardrailsResources creates or updates per-model ConfigMaps and the NemoGuardrails CR
// for the given set of install models. It uses the same model list format as the LSD install endpoint.
//
// On subsequent calls the CR spec is updated to reflect the new model set, stale ConfigMaps are
// deleted, and new/changed ConfigMaps are upserted.
//
// The model source type is encoded in each ConfigMap name (e.g. guardrail-maas-granite-3b) so
// later tooling can identify model provenance without parsing annotations.
//
// All models use OPENAI_API_KEY=fake; real keys are supplied at runtime via the guardrails API.
//
// Returns the name of the NemoGuardrails CR.
func (kc *TokenKubernetesClient) CreateNemoGuardrailsResources(
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	installModels []models.InstallModel,
	maasClient maas.MaaSClientInterface,
	userAuthToken string,
) (string, error) {
	// Step 1: Build MaaS models map once to avoid multiple ListModels calls.
	maasModelsMap, err := buildMaaSModelsMapForNemo(ctx, installModels, maasClient, userAuthToken)
	if err != nil {
		return "", err
	}

	// Step 2: Pre-fetch external models config once if any custom_endpoint models are present.
	var externalModelsConfig *models.ExternalModelsConfig
	for _, m := range installModels {
		if models.IsExternalModelSource(m.ModelSourceType) {
			cfg, err := kc.GetExternalModelsConfig(ctx, namespace)
			if err != nil {
				return "", fmt.Errorf("failed to get external models config: %w", err)
			}
			externalModelsConfig = cfg
			break
		}
	}

	// Step 3: Resolve endpoint URL and ConfigMap name for each model.
	modelInfos := make([]nemoGuardrailsModelInfo, 0, len(installModels))
	for _, m := range installModels {
		info, err := kc.resolveNemoGuardrailsModelInfo(ctx, namespace, m, maasModelsMap, externalModelsConfig)
		if err != nil {
			return "", fmt.Errorf("failed to resolve model info for %q: %w", m.ModelName, err)
		}
		modelInfos = append(modelInfos, info)
		kc.Logger.Debug("resolved NemoGuardrails model info",
			"modelName", m.ModelName, "modelID", info.modelID,
			"sourceType", info.sourceType, "cmName", info.cmName, "endpointURL", info.endpointURL)
	}

	// Step 4: Upsert per-model ConfigMaps and track active names for stale cleanup.
	activeNames := make(map[string]bool, len(modelInfos))
	for _, info := range modelInfos {
		cm := &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      info.cmName,
				Namespace: namespace,
				Labels: map[string]string{
					OpenDataHubDashboardLabelKey: "true",
				},
			},
			Data: buildNemoGuardrailsConfigMapData(info.modelID, info.endpointURL),
		}
		if err := kc.upsertNemoConfigMap(ctx, cm); err != nil {
			return "", fmt.Errorf("failed to upsert NemoGuardrails ConfigMap %q: %w", cm.Name, err)
		}
		activeNames[info.cmName] = true
	}

	// Step 5: Upsert the NemoGuardrails CR (unstructured — no typed Go package for this CRD).
	nemoConfigs := make([]interface{}, len(modelInfos))
	for i, info := range modelInfos {
		entry := map[string]interface{}{
			"name":       info.cmName,
			"configMaps": []interface{}{info.cmName},
		}
		if i == 0 {
			entry["default"] = true
		}
		nemoConfigs[i] = entry
	}

	cr := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": constants.NemoGuardrailsAPIVersion,
			"kind":       constants.NemoGuardrailsKind,
			"metadata": map[string]interface{}{
				"name":      nemoGuardrailsCRName,
				"namespace": namespace,
				"labels": map[string]interface{}{
					OpenDataHubDashboardLabelKey: "true",
				},
				"annotations": map[string]interface{}{
					constants.NemoGuardrailsEnableAuthAnnotation: "true",
				},
			},
			"spec": map[string]interface{}{
				"nemoConfigs": nemoConfigs,
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

	// Step 6: Delete ConfigMaps that belonged to models removed from the set.
	// This runs after the CR is updated so no stale reference window exists.
	kc.deleteStaleNemoConfigMaps(ctx, namespace, activeNames)

	kc.Logger.Info("NemoGuardrails resources reconciled", "name", nemoGuardrailsCRName, "namespace", namespace, "configs", len(modelInfos))
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
	err := kc.Client.Get(ctx, client.ObjectKey{Name: nemoGuardrailsCRName, Namespace: namespace}, cr)
	if err != nil {
		return nil, err
	}
	return cr, nil
}
