package models

import corev1 "k8s.io/api/core/v1"

// NamespaceModel is the shared selector item returned by list and exact lookup.
type NamespaceModel struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Phase       string `json:"phase"`
	IsAiProject bool   `json:"isAiProject"`
}

// NewNamespaceModelFromNamespace maps the same metadata for list and lookup.
func NewNamespaceModelFromNamespace(ns corev1.Namespace) NamespaceModel {
	displayName := ns.Annotations["openshift.io/display-name"]
	if displayName == "" {
		displayName = ns.Name
	}
	return NamespaceModel{
		Name:        ns.Name,
		DisplayName: displayName,
		Phase:       string(ns.Status.Phase),
		IsAiProject: ns.Labels["opendatahub.io/dashboard"] == "true",
	}
}
