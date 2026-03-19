package models

// CreateMaaSModelRefRequest is the request body for creating a new MaaSModelRef.
type CreateMaaSModelRefRequest struct {
	Name             string         `json:"name"`
	Namespace        string         `json:"namespace"`
	ModelRef         ModelReference `json:"modelRef"`
	EndpointOverride string         `json:"endpointOverride,omitempty"`
}

// UpdateMaaSModelRefRequest is the request body for updating an existing MaaSModelRef.
type UpdateMaaSModelRefRequest struct {
	ModelRef         ModelReference `json:"modelRef"`
	EndpointOverride string         `json:"endpointOverride,omitempty"`
}
