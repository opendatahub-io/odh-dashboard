package models

import "fmt"

type Connection struct {
	Metadata struct {
		ID        string `json:"id"`
		TenantID  string `json:"tenant_id,omitempty"`
		CreatedAt string `json:"created_at"`
		UpdatedAt string `json:"updated_at"`
	} `json:"metadata"`
	Resource struct {
		Name                 string          `json:"name"`
		Description          *string         `json:"description,omitempty"`
		DataConnectionTypeID string          `json:"data_connection_type_id"`
		DataConnectionType   *ConnectionType `json:"data_connection_type,omitempty"`
		Format               string          `json:"format"`
		CredentialsRef       struct {
			Secret string `json:"secret"`
		} `json:"credentials_ref"`
		Properties map[string]string `json:"properties"`
	} `json:"resource"`
	Status struct {
		State     string `json:"state"`
		Message   string `json:"message,omitempty"`
		UpdatedAt string `json:"updated_at,omitempty"`
	} `json:"status"`
}

type ConnectionTypeCredentialField struct {
	Name        string `json:"name"`
	Label       string `json:"label"`
	Description string `json:"description,omitempty"`
	Required    bool   `json:"required"`
	Type        string `json:"type"`
	EnumValues  []struct {
		Value string `json:"value"`
		Label string `json:"label"`
	} `json:"enum_values,omitzero"`
	DefaultValue string `json:"default_value,omitempty"`
}

type ConnectionType struct {
	Metadata struct {
		ID        string `json:"id"`
		TenantID  string `json:"tenant_id,omitempty"`
		CreatedAt string `json:"created_at"`
		UpdatedAt string `json:"updated_at"`
	} `json:"metadata"`
	Resource struct {
		Name              string                          `json:"name"`
		Provider          string                          `json:"provider"`
		Description       string                          `json:"description,omitempty"`
		CredentialsFields []ConnectionTypeCredentialField `json:"credentials_fields"`
		Tags              []string                        `json:"tags,omitzero"`
	} `json:"resource"`
	Status struct {
		FlightReady bool   `json:"flight_ready"`
		FlightURL   string `json:"flight_url,omitempty"`
		Message     string `json:"message,omitempty"`
		UpdatedAt   string `json:"updated_at,omitempty"`
	} `json:"status"`
}

type ConnectionTypeField struct {
	Name         string      `json:"name"`
	Label        string      `json:"label"`
	Description  string      `json:"description,omitempty"`
	Required     bool        `json:"required"`
	Type         string      `json:"type"`
	EnumValues   []EnumValue `json:"enum_values,omitempty"`
	DefaultValue string      `json:"default_value,omitempty"`
}

type EnumValue struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

func ValidateConnection(connection Connection) error {
	if connection.Metadata.ID == "" || connection.Resource.Name == "" ||
		connection.Resource.DataConnectionTypeID == "" ||
		(connection.Resource.Format != "tabular" && connection.Resource.Format != "binary") ||
		connection.Status.State == "" {
		return fmt.Errorf("connection response is missing required fields")
	}
	return nil
}
