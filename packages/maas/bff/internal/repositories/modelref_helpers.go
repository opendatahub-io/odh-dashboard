package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

const (
	displayNameAnnotation       = "openshift.io/display-name"
	descriptionAnnotation       = "openshift.io/description"
	modelCapabilitiesAnnotation = "opendatahub.io/model-capabilities"
)

// buildModelRefSummaryIndex returns a lookup map from "namespace/name" to MaaSModelRefSummary.
func buildModelRefSummaryIndex(summaries []models.MaaSModelRefSummary) map[string]models.MaaSModelRefSummary {
	idx := make(map[string]models.MaaSModelRefSummary, len(summaries))
	for _, s := range summaries {
		idx[s.Namespace+"/"+s.Name] = s
	}
	return idx
}

// listAllModelRefSummaries fetches all MaaSModelRef CRs and converts them to MaaSModelRefSummary.
// Conversion failures for individual items are logged and skipped rather than failing the whole list.
func listAllModelRefSummaries(ctx context.Context, logger *slog.Logger, kubeClient dynamic.Interface) ([]models.MaaSModelRefSummary, error) {
	list, err := kubeClient.Resource(constants.MaaSModelRefGvr).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaSModelRefs: %w", err)
	}

	summaries := make([]models.MaaSModelRefSummary, 0, len(list.Items))
	for _, item := range list.Items {
		summary := convertUnstructuredToModelRefSummary(&item)
		summaries = append(summaries, *summary)
	}

	return summaries, nil
}

// listModelRefSummariesInNamespace fetches MaaSModelRef CRs in a namespace.
func listModelRefSummariesInNamespace(
	ctx context.Context,
	kubeClient dynamic.Interface,
	namespace string,
) ([]models.MaaSModelRefSummary, error) {
	list, err := kubeClient.Resource(constants.MaaSModelRefGvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaSModelRefs: %w", err)
	}

	summaries := make([]models.MaaSModelRefSummary, 0, len(list.Items))
	for _, item := range list.Items {
		summary := convertUnstructuredToModelRefSummary(&item)
		summaries = append(summaries, *summary)
	}

	return summaries, nil
}

// convertUnstructuredToModelRefSummary converts a MaaSModelRef unstructured object to a MaaSModelRefSummary.
func convertUnstructuredToModelRefSummary(obj *unstructured.Unstructured) *models.MaaSModelRefSummary {
	content := obj.UnstructuredContent()

	summary := &models.MaaSModelRefSummary{
		Name:      obj.GetName(),
		Namespace: obj.GetNamespace(),
	}

	annotations := obj.GetAnnotations()
	summary.DisplayName = annotations[constants.DisplayNameAnnotation]
	summary.Description = annotations[constants.DescriptionAnnotation]

	if modelCapabilities, ok := annotations[modelCapabilitiesAnnotation]; ok && modelCapabilities != "" {
		var caps []string
		if err := json.Unmarshal([]byte(modelCapabilities), &caps); err == nil {
			summary.ModelCapabilities = caps
		} else {
			slog.Warn("malformed model-capabilities annotation", slog.String("name", obj.GetName()), slog.String("namespace", obj.GetNamespace()), slog.Any("error", err))
		}
	}

	kind, _, _ := unstructured.NestedString(content, "spec", "modelRef", "kind")
	name, _, _ := unstructured.NestedString(content, "spec", "modelRef", "name")
	summary.ModelRef = models.ModelReference{Kind: kind, Name: name}

	phase, _, _ := unstructured.NestedString(content, "status", "phase")
	summary.Phase = phase
	summary.StatusMessage = extractReadyConditionMessage(content)
	summary.GovernanceAttached = isConditionStatusTrue(content, "GovernanceAttached")

	endpoint, _, _ := unstructured.NestedString(content, "status", "endpoint")
	summary.Endpoint = endpoint

	return summary
}
