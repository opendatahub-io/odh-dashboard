package models

type NamespaceModel struct {
	Name        string  `json:"name"`
	DisplayName *string `json:"displayName,omitempty"`
}

func NewNamespaceModelFromNamespace(name string, displayName string) NamespaceModel {
	if displayName == "" {
		displayName = name
	}
	return NamespaceModel{
		Name:        name,
		DisplayName: &displayName,
	}
}
