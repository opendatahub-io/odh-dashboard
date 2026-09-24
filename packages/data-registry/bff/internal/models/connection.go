package models

type ConnectionModel struct {
	Name           string  `json:"name"`
	DisplayName    *string `json:"displayName,omitempty"`
	ConnectionType *string `json:"connectionType,omitempty"`
}
