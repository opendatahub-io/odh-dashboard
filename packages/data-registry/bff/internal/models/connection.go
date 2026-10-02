package models

type ConnectionModel struct {
	Type           string  `json:"type"`
	ID             string  `json:"id,omitempty"`
	SecretName     string  `json:"secret_name,omitempty"`
	Name           string  `json:"name,omitempty"`
	ConnectionType *string `json:"connectionType,omitempty"`
}

type ConnectionWarning struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ConnectionsMetadata struct {
	Warnings []ConnectionWarning `json:"warnings,omitempty"`
}
