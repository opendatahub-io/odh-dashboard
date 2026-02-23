package models

// SecretListItem represents a filtered secret with its UUID and name
type SecretListItem struct {
	UUID string `json:"uuid"`
	Name string `json:"name"`
}

// NewSecretListItem creates a new SecretListItem
func NewSecretListItem(uuid, name string) SecretListItem {
	return SecretListItem{
		UUID: uuid,
		Name: name,
	}
}
