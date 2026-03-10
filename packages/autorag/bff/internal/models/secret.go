package models

// SecretListItem represents a filtered secret with its UUID, name, type, and available keys
type SecretListItem struct {
	UUID          string   `json:"uuid"`
	Name          string   `json:"name"`
	Type          string   `json:"type"`
	AvailableKeys []string `json:"availableKeys"`
}

// NewSecretListItem creates a new SecretListItem
func NewSecretListItem(uuid, name, secretType string, availableKeys []string) SecretListItem {
	return SecretListItem{
		UUID:          uuid,
		Name:          name,
		Type:          secretType,
		AvailableKeys: availableKeys,
	}
}
