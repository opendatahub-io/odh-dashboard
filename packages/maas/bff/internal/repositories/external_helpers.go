package repositories

import (
	"net/url"
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

const (
	secretDataKeyAPIKey        = "api-key"
	secretBBRManagedLabelKey   = "inference.networking.k8s.io/bbr-managed"
	secretBBRManagedLabelValue = "true"
)

func authMechanismToCRD(mechanism models.AuthMechanism) string {
	return string(mechanism)
}

func authMechanismFromCRD(authType string) models.AuthMechanism {
	switch strings.ToLower(authType) {
	case string(models.AuthMechanismSigV4):
		return models.AuthMechanismSigV4
	case string(models.AuthMechanismOAuth2):
		return models.AuthMechanismOAuth2
	default:
		return models.AuthMechanismAPIKey
	}
}

func normalizeEndpointURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if strings.Contains(raw, "://") {
		if u, err := url.Parse(raw); err == nil && u.Host != "" {
			return u.Host
		}
	}
	if idx := strings.Index(raw, "/"); idx >= 0 {
		return raw[:idx]
	}
	return raw
}

func applyDisplayAnnotations(annotations map[string]string, displayName, description string) map[string]string {
	if annotations == nil {
		annotations = map[string]string{}
	}
	if displayName != "" {
		annotations[displayNameAnnotation] = displayName
	}
	if description != "" {
		annotations[descriptionAnnotation] = description
	}
	return annotations
}

func applyOptionalDisplayAnnotations(annotations map[string]string, displayName, description *string) map[string]string {
	if annotations == nil {
		annotations = map[string]string{}
	}
	if displayName != nil {
		if *displayName == "" {
			delete(annotations, displayNameAnnotation)
		} else {
			annotations[displayNameAnnotation] = *displayName
		}
	}
	if description != nil {
		if *description == "" {
			delete(annotations, descriptionAnnotation)
		} else {
			annotations[descriptionAnnotation] = *description
		}
	}
	return annotations
}

func readDisplayAnnotations(annotations map[string]string) (displayName, description string) {
	if annotations == nil {
		return "", ""
	}
	return annotations[displayNameAnnotation], annotations[descriptionAnnotation]
}

func stringMapFromUnstructured(raw map[string]interface{}) map[string]string {
	if len(raw) == 0 {
		return nil
	}
	result := make(map[string]string, len(raw))
	for key, value := range raw {
		if str, ok := value.(string); ok {
			result[key] = str
		}
	}
	if len(result) == 0 {
		return nil
	}
	return result
}

func stringMapToUnstructured(values map[string]string) map[string]interface{} {
	if len(values) == 0 {
		return nil
	}
	result := make(map[string]interface{}, len(values))
	for key, value := range values {
		result[key] = value
	}
	return result
}

func convertUnstructuredToExternalProviderSummary(obj *unstructured.Unstructured) *models.ExternalProviderSummary {
	content := obj.UnstructuredContent()
	displayName, description := readDisplayAnnotations(obj.GetAnnotations())

	summary := &models.ExternalProviderSummary{
		Name:        obj.GetName(),
		Namespace:   obj.GetNamespace(),
		DisplayName: displayName,
		Description: description,
	}

	endpoint, _, _ := unstructured.NestedString(content, "spec", "endpoint")
	summary.EndpointUrl = endpoint

	provider, _, _ := unstructured.NestedString(content, "spec", "provider")
	summary.Provider = provider

	authType, _, _ := unstructured.NestedString(content, "spec", "auth", "type")
	summary.AuthMechanism = authMechanismFromCRD(authType)

	secretRef, _, _ := unstructured.NestedString(content, "spec", "auth", "secretRef", "name")
	summary.CredentialSecretRef = secretRef

	configMap, _, _ := unstructured.NestedStringMap(content, "spec", "config")
	summary.Config = configMap

	phase, _, _ := unstructured.NestedString(content, "status", "phase")
	summary.Phase = phase

	return summary
}

func buildExternalProviderUnstructured(request models.CreateExternalProviderRequest) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetAPIVersion("inference.opendatahub.io/v1alpha1")
	obj.SetKind("ExternalProvider")
	obj.SetName(request.Name)
	obj.SetNamespace(request.Namespace)
	obj.SetAnnotations(applyDisplayAnnotations(nil, request.DisplayName, request.Description))

	spec := map[string]interface{}{
		"provider": request.Provider,
		"endpoint": normalizeEndpointURL(request.EndpointUrl),
		"auth": map[string]interface{}{
			"type": authMechanismToCRD(request.AuthMechanism),
			"secretRef": map[string]interface{}{
				"name": request.CredentialSecretRef,
			},
		},
	}
	if config := stringMapToUnstructured(request.Config); config != nil {
		spec["config"] = config
	}
	obj.Object["spec"] = spec
	return obj
}

func convertUnstructuredToExternalModelSummary(obj *unstructured.Unstructured) *models.ExternalModelSummary {
	content := obj.UnstructuredContent()
	displayName, description := readDisplayAnnotations(obj.GetAnnotations())

	summary := &models.ExternalModelSummary{
		Name:        obj.GetName(),
		Namespace:   obj.GetNamespace(),
		DisplayName: displayName,
		Description: description,
	}

	modelName, _, _ := unstructured.NestedString(content, "spec", "modelName")
	if modelName != "" {
		summary.ModelName = modelName
	} else {
		summary.ModelName = obj.GetName()
	}

	refs, _, _ := unstructured.NestedSlice(content, "spec", "externalProviderRefs")
	summary.ProviderRefs = make([]models.ProviderRef, 0, len(refs))
	for _, ref := range refs {
		refMap, ok := ref.(map[string]interface{})
		if !ok {
			continue
		}
		providerRef := models.ProviderRef{}
		if refObj, ok := refMap["ref"].(map[string]interface{}); ok {
			if name, ok := refObj["name"].(string); ok {
				providerRef.ProviderName = name
			}
		}
		if weight, ok := refMap["weight"].(int64); ok {
			providerRef.Weight = int(weight)
		} else if weight, ok := refMap["weight"].(float64); ok {
			providerRef.Weight = int(weight)
		}
		if apiFormat, ok := refMap["apiFormat"].(string); ok {
			providerRef.APIFormat = apiFormat
		}
		if path, ok := refMap["path"].(string); ok {
			providerRef.Path = path
		}
		if targetModel, ok := refMap["targetModel"].(string); ok {
			providerRef.TargetModel = targetModel
		}
		if config, ok := refMap["config"].(map[string]interface{}); ok {
			providerRef.Config = stringMapFromUnstructured(config)
		}
		summary.ProviderRefs = append(summary.ProviderRefs, providerRef)
	}

	phase, _, _ := unstructured.NestedString(content, "status", "phase")
	summary.Phase = phase

	return summary
}

func buildExternalProviderRefs(refs []models.ProviderRef) []interface{} {
	result := make([]interface{}, 0, len(refs))
	for _, ref := range refs {
		entry := map[string]interface{}{
			"ref": map[string]interface{}{
				"name": ref.ProviderName,
			},
			"weight":      ref.Weight,
			"apiFormat":   ref.APIFormat,
			"path":        ref.Path,
			"targetModel": ref.TargetModel,
		}
		if config := stringMapToUnstructured(ref.Config); config != nil {
			entry["config"] = config
		}
		result = append(result, entry)
	}
	return result
}

func buildExternalModelUnstructured(request models.CreateExternalModelRequest) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetAPIVersion("inference.opendatahub.io/v1alpha1")
	obj.SetKind("ExternalModel")
	obj.SetName(request.Name)
	obj.SetNamespace(request.Namespace)
	obj.SetAnnotations(applyDisplayAnnotations(nil, request.DisplayName, request.Description))

	spec := map[string]interface{}{
		"externalProviderRefs": buildExternalProviderRefs(request.ProviderRefs),
	}
	if request.ModelName != "" {
		spec["modelName"] = request.ModelName
	}
	obj.Object["spec"] = spec
	return obj
}
