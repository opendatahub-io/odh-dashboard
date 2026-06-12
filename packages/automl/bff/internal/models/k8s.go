package models

import "strings"

type User struct {
	UserID       string `json:"userId"`
	ClusterAdmin bool   `json:"clusterAdmin"`
}

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

// SecretListItem represents a filtered secret with its UUID, name, type, and available keys
type SecretListItem struct {
	UUID        string            `json:"uuid"`
	Name        string            `json:"name"`
	Type        string            `json:"type,omitempty"`
	Data        map[string]string `json:"data"`
	DisplayName string            `json:"displayName,omitempty"`
	Description string            `json:"description,omitempty"`
}

// NewSecretListItem creates a new SecretListItem
func NewSecretListItem(uuid, name, secretType string, data map[string]string, displayName, description string) SecretListItem {
	return SecretListItem{
		UUID:        uuid,
		Name:        name,
		Type:        secretType,
		Data:        data,
		DisplayName: displayName,
		Description: description,
	}
}
