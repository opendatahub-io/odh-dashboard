package models

import "strings"

type NamespaceModel struct {
	Name        string  `json:"name"`
	DisplayName *string `json:"displayName,omitempty"`
}

// NewNamespaceModelFromNamespace creates a NamespaceModel using the namespace name
// and its OpenShift display name annotation if available.
func NewNamespaceModelFromNamespace(name string, annotations map[string]string) NamespaceModel {
	displayName := name
	if dn := strings.TrimSpace(annotations["openshift.io/display-name"]); dn != "" {
		displayName = dn
	}
	return NamespaceModel{
		Name:        name,
		DisplayName: &displayName,
	}
}
