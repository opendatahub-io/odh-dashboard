package models

// SecretListItem represents a filtered secret with its UUID, name, and type
type SecretListItem struct {
	UUID string `json:"uuid"`
	Name string `json:"name"`
	Type string `json:"type"`
}

// NewSecretListItem creates a new SecretListItem
func NewSecretListItem(uuid, name, secretType string) SecretListItem {
	return SecretListItem{
		UUID: uuid,
		Name: name,
		Type: secretType,
	}
}
