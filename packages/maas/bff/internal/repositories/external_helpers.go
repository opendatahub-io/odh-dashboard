package repositories

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/validation"
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

func authMechanismToCRD(mechanism models.AuthMechanism) string {
	return string(mechanism)
}

// applyDisplayAnnotations updates display metadata annotations on a resource.
func applyDisplayAnnotations(annotations map[string]string, displayName, description *string) map[string]string {
	if annotations == nil {
		annotations = map[string]string{}
	}
	if displayName != nil {
		if *displayName == "" {
			delete(annotations, constants.DisplayNameAnnotation)
		} else {
			annotations[constants.DisplayNameAnnotation] = *displayName
		}
	}
	if description != nil {
		if *description == "" {
			delete(annotations, constants.DescriptionAnnotation)
		} else {
			annotations[constants.DescriptionAnnotation] = *description
		}
	}
	return annotations
}

func buildExternalProviderUnstructured(request models.CreateExternalProviderRequest) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetAPIVersion("inference.opendatahub.io/v1alpha1")
	obj.SetKind("ExternalProvider")
	obj.SetName(request.Name)
	obj.SetNamespace(request.Namespace)
	obj.SetAnnotations(applyDisplayAnnotations(nil, &request.DisplayName, &request.Description))

	spec := map[string]interface{}{
		"provider": request.Provider,
		"endpoint": normalizeEndpointURL(request.EndpointUrl),
		"auth": map[string]interface{}{
			"type": authMechanismToCRD(request.AuthMechanism),
			"secretRef": map[string]interface{}{
				"name": normalizeSecretRefName(request.CredentialSecretRef),
			},
		},
	}
	if config := stringMapToUnstructured(request.Config); config != nil {
		spec["config"] = config
	}
	obj.Object["spec"] = spec
	return obj
}

func convertUnstructuredToExternalProviderSummary(obj *unstructured.Unstructured) *models.ExternalProviderSummary {
	content := obj.UnstructuredContent()
	displayName, description := readDisplayAnnotations(obj.GetAnnotations())

	ready := extractReadyCondition(content)

	summary := &models.ExternalProviderSummary{
		Name:               obj.GetName(),
		Namespace:          obj.GetNamespace(),
		DisplayName:        displayName,
		Description:        description,
		Status:             ready.Status,
		ConditionType:      ready.ConditionType,
		LastTransitionTime: ready.LastTransitionTime,
		StatusMessage:      ready.Message,
		Reason:             ready.Reason,
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
		Reason:              summary.Reason,
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
				Reason:             modelRef.Reason,
				GovernanceAttached: modelRef.GovernanceAttached,
			}
		}

		for j := range summary.ProviderRefs {
			providerKey := summary.Namespace + "/" + summary.ProviderRefs[j].ProviderName
			if provider, ok := providers[providerKey]; ok {
				details := externalProviderDetailsFromSummary(provider)
				if summary.ProviderRefs[j].AuthMechanism != nil {
					details.AuthMechanism = *summary.ProviderRefs[j].AuthMechanism
				}
				if summary.ProviderRefs[j].CredentialSecretRef != "" {
					details.CredentialSecretRef = summary.ProviderRefs[j].CredentialSecretRef
				}
				summary.ProviderRefs[j].Provider = details
			}
		}
	}
	return summaries
}

func convertUnstructuredToExternalModelSummary(obj *unstructured.Unstructured) *models.ExternalModelSummary {
	content := obj.UnstructuredContent()
	displayName, description := readDisplayAnnotations(obj.GetAnnotations())

	ready := extractReadyCondition(content)

	summary := &models.ExternalModelSummary{
		Name:               obj.GetName(),
		Namespace:          obj.GetNamespace(),
		DisplayName:        displayName,
		Description:        description,
		Status:             ready.Status,
		ConditionType:      ready.ConditionType,
		LastTransitionTime: ready.LastTransitionTime,
		StatusMessage:      ready.Message,
		Reason:             ready.Reason,
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
		if authMap, ok := refMap["auth"].(map[string]interface{}); ok {
			if authType, ok := authMap["type"].(string); ok && authType != "" {
				mech := authMechanismFromCRD(authType)
				providerRef.AuthMechanism = &mech
			}
			if secretRefMap, ok := authMap["secretRef"].(map[string]interface{}); ok {
				if name, ok := secretRefMap["name"].(string); ok {
					providerRef.CredentialSecretRef = name
				}
			}
		}
		summary.ProviderRefs = append(summary.ProviderRefs, providerRef)
	}

	phase, _, _ := unstructured.NestedString(content, "status", "phase")
	summary.Phase = phase

	return summary
}

func buildExternalModelUnstructured(request models.CreateExternalModelRequest) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetAPIVersion("inference.opendatahub.io/v1alpha1")
	obj.SetKind("ExternalModel")
	obj.SetName(request.Name)
	obj.SetNamespace(request.Namespace)
	obj.SetAnnotations(applyDisplayAnnotations(nil, &request.DisplayName, &request.Description))

	spec := map[string]interface{}{
		"externalProviderRefs": buildExternalProviderRefs(request.ProviderRefs),
	}
	if request.ModelName != "" {
		spec["modelName"] = request.ModelName
	}
	obj.Object["spec"] = spec
	return obj
}

func (r *ExternalModelsRepository) createMaaSModelRefForExternalModel(ctx context.Context, request models.CreateExternalModelRequest, parentUID string) error {
	_, err := r.modelRefsRepo.CreateMaaSModelRef(ctx, models.CreateMaaSModelRefRequest{
		Name:        request.Name,
		Namespace:   request.Namespace,
		ModelRef:    models.ModelReference{Kind: "ExternalModel", Name: request.Name},
		DisplayName: request.DisplayName,
		Description: request.Description,
		Uid:         parentUID,
	}, false)
	return err
}

func (r *ExternalModelsRepository) syncMaaSModelRefOnUpdate(ctx context.Context, namespace, name string, request models.UpdateExternalModelRequest, parentUID string) error {
	updateRequest := models.UpdateMaaSModelRefRequest{
		ModelRef: models.ModelReference{Kind: "ExternalModel", Name: name},
	}
	if request.DisplayName != nil {
		updateRequest.DisplayName = request.DisplayName
	}
	if request.Description != nil {
		updateRequest.Description = request.Description
	}

	_, err := r.modelRefsRepo.UpdateMaaSModelRef(ctx, namespace, name, updateRequest, false)
	if err == nil {
		return nil
	}
	if !errors.Is(err, ErrNotFound) {
		return err
	}

	createRequest := models.CreateMaaSModelRefRequest{
		Name:      name,
		Namespace: namespace,
		ModelRef:  models.ModelReference{Kind: "ExternalModel", Name: name},
		Uid:       parentUID,
	}
	if request.DisplayName != nil {
		createRequest.DisplayName = *request.DisplayName
	}
	if request.Description != nil {
		createRequest.Description = *request.Description
	}
	_, err = r.modelRefsRepo.CreateMaaSModelRef(ctx, createRequest, false)
	return err
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
		if ref.AuthMechanism != nil && normalizeSecretRefName(ref.CredentialSecretRef) != "" {
			entry["auth"] = map[string]interface{}{
				"type": authMechanismToCRD(*ref.AuthMechanism),
				"secretRef": map[string]interface{}{
					"name": normalizeSecretRefName(ref.CredentialSecretRef),
				},
			}
		}
		result = append(result, entry)
	}
	return result
}

var endpointFQDNPattern = regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)+$`)

const maxEndpointFQDNLength = 253

func normalizeEndpointURL(raw string) string {
	return strings.TrimSpace(raw)
}

func normalizeSecretRefName(raw string) string {
	return strings.TrimSpace(raw)
}

// ValidateSecretRefName checks the trimmed value against ExternalProvider/ExternalModel CRD secretRef.name rules.
func ValidateSecretRefName(raw string) error {
	name := normalizeSecretRefName(raw)
	if errs := validation.IsDNS1123Label(name); len(errs) > 0 {
		return fmt.Errorf("must be a valid Kubernetes Secret name")
	}
	return nil
}

// ValidateCredentialSecretRef validates ExternalProvider credentialSecretRef.
func ValidateCredentialSecretRef(raw string) error {
	if strings.TrimSpace(raw) == "" {
		return fmt.Errorf("credentialSecretRef is required")
	}
	if err := ValidateSecretRefName(raw); err != nil {
		return fmt.Errorf("credentialSecretRef %s", err.Error())
	}
	return nil
}

// ValidateProviderRefCredentialSecretRef validates ExternalModel providerRef credentialSecretRef.
func ValidateProviderRefCredentialSecretRef(raw string) error {
	if strings.TrimSpace(raw) == "" {
		return fmt.Errorf("providerRef.credentialSecretRef is required when providerRef.authMechanism is set")
	}
	if err := ValidateSecretRefName(raw); err != nil {
		return fmt.Errorf("providerRef.credentialSecretRef %s", err.Error())
	}
	return nil
}

// ValidateSecretName validates Kubernetes Secret metadata.name.
func ValidateSecretName(raw string) error {
	if strings.TrimSpace(raw) == "" {
		return fmt.Errorf("name is required")
	}
	if raw != strings.TrimSpace(raw) {
		return fmt.Errorf("name must not contain leading or trailing whitespace")
	}
	if errs := validation.IsDNS1123Subdomain(raw); len(errs) > 0 {
		return fmt.Errorf("name must be a valid Kubernetes Secret name")
	}
	return nil
}

// ValidateEndpointURL checks ExternalProvider spec.endpoint against the CRD:
// FQDN, no scheme or path, 1–253 characters.
func ValidateEndpointURL(raw string) error {
	host := normalizeEndpointURL(raw)
	if host == "" {
		return fmt.Errorf("endpointUrl is required")
	}
	if len(host) > maxEndpointFQDNLength {
		return fmt.Errorf("endpointUrl must be at most %d characters", maxEndpointFQDNLength)
	}
	if !endpointFQDNPattern.MatchString(host) {
		return fmt.Errorf("endpointUrl must be an FQDN with no scheme or path (e.g. api.openai.com)")
	}
	return nil
}
