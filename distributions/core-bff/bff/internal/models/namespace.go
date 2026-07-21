package models

// NamespaceModel represents a Kubernetes namespace with display name.
type NamespaceModel struct {
	Name        string  `json:"name"`
	DisplayName *string `json:"displayName,omitempty"`
}

// NewNamespaceModelFromNamespace creates a NamespaceModel from a namespace name.
func NewNamespaceModelFromNamespace(name string) NamespaceModel {
	displayName := name // For now, use name as display name, but this can be customized later
	return NamespaceModel{
		Name:        name,
		DisplayName: &displayName,
	}
}
