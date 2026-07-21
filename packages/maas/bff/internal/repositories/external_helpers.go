package repositories

import (
	"context"
	"fmt"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

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

func readDisplayAnnotations(annotations map[string]string) (displayName, description string) {
	if annotations == nil {
		return "", ""
	}
	return annotations[constants.DisplayNameAnnotation], annotations[constants.DescriptionAnnotation]
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
	summary.StatusMessage = extractReadyConditionMessage(content)

	return summary
}

func buildExternalProviderSummaryIndex(summaries []models.ExternalProviderSummary) map[string]models.ExternalProviderSummary {
	idx := make(map[string]models.ExternalProviderSummary, len(summaries))
	for _, summary := range summaries {
		idx[summary.Namespace+"/"+summary.Name] = summary
	}
	return idx
}

func externalProviderDetailsFromSummary(summary models.ExternalProviderSummary) *models.ExternalProviderDetails {
	return &models.ExternalProviderDetails{
		DisplayName:         summary.DisplayName,
		Description:         summary.Description,
		EndpointUrl:         summary.EndpointUrl,
		AuthMechanism:       summary.AuthMechanism,
		CredentialSecretRef: summary.CredentialSecretRef,
		Provider:            summary.Provider,
		Config:              summary.Config,
		Phase:               summary.Phase,
		StatusMessage:       summary.StatusMessage,
	}
}

func listExternalProviderSummariesInNamespace(
	ctx context.Context,
	kubeClient dynamic.Interface,
	namespace string,
) ([]models.ExternalProviderSummary, error) {
	list, err := kubeClient.Resource(constants.ExternalProviderGvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list ExternalProviders: %w", err)
	}

	summaries := make([]models.ExternalProviderSummary, 0, len(list.Items))
	for _, item := range list.Items {
		summaries = append(summaries, *convertUnstructuredToExternalProviderSummary(&item))
	}
	return summaries, nil
}

func enrichExternalModelSummaries(
	summaries []models.ExternalModelSummary,
	providers map[string]models.ExternalProviderSummary,
	modelRefs map[string]models.MaaSModelRefSummary,
) []models.ExternalModelSummary {
	for i := range summaries {
		summary := &summaries[i]
		modelKey := summary.Namespace + "/" + summary.Name

		if modelRef, ok := modelRefs[modelKey]; ok &&
			modelRef.ModelRef.Kind == "ExternalModel" && modelRef.ModelRef.Name == summary.Name {
			summary.MaaSModelRef = &models.ExternalModelMaaSModelRefStatus{
				Phase:              modelRef.Phase,
				Endpoint:           modelRef.Endpoint,
				StatusMessage:      modelRef.StatusMessage,
				GovernanceAttached: modelRef.GovernanceAttached,
			}
		}

		for j := range summary.ProviderRefs {
			providerKey := summary.Namespace + "/" + summary.ProviderRefs[j].ProviderName
			if provider, ok := providers[providerKey]; ok {
				summary.ProviderRefs[j].Provider = externalProviderDetailsFromSummary(provider)
			}
		}
	}
	return summaries
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
	summary.StatusMessage = extractReadyConditionMessage(content)

	return summary
}
