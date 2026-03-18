package models

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
