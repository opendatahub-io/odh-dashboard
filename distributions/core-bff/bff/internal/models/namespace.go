package models

import corev1 "k8s.io/api/core/v1"

// NamespaceModel preserves the legacy namespace list shape with optional AI classification.
type NamespaceModel struct {
	Name        string  `json:"name"`
	DisplayName *string `json:"displayName,omitempty"`
	IsAiProject *bool   `json:"isAiProject,omitempty"`
}

// NamespaceLookupModel returns the richer metadata needed to validate an exact namespace.
type NamespaceLookupModel struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Phase       string `json:"phase"`
	IsAiProject bool   `json:"isAiProject"`
}

// NewNamespaceModelFromNamespace preserves list display names as resource names.
func NewNamespaceModelFromNamespace(ns corev1.Namespace) NamespaceModel {
	displayName := ns.Name
	model := NamespaceModel{Name: ns.Name, DisplayName: &displayName}
	if label, exists := ns.Labels["opendatahub.io/dashboard"]; exists {
		isAiProject := label == "true"
		model.IsAiProject = &isAiProject
	}
	return model
}

// NewNamespaceLookupModelFromNamespace maps real metadata and lifecycle state.
func NewNamespaceLookupModelFromNamespace(ns corev1.Namespace) NamespaceLookupModel {
	displayName := ns.Annotations["openshift.io/display-name"]
	if displayName == "" {
		displayName = ns.Name
	}
	return NamespaceLookupModel{
		Name:        ns.Name,
		DisplayName: displayName,
		Phase:       string(ns.Status.Phase),
		IsAiProject: ns.Labels["opendatahub.io/dashboard"] == "true",
	}
}
