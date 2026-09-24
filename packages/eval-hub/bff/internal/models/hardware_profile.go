package models

// HardwareProfileResource is one resource declaration from a HardwareProfile
// identifier. Values are strings because Kubernetes quantities may be expressed
// as millicores, bytes, or accelerator counts.
type HardwareProfileResource struct {
	DisplayName  string `json:"display_name,omitempty"`
	Identifier   string `json:"identifier"`
	ResourceType string `json:"resource_type,omitempty"`
	Default      string `json:"default,omitempty"`
	Minimum      string `json:"minimum,omitempty"`
	Maximum      string `json:"maximum,omitempty"`
}

// HardwareProfile is the namespace-scoped subset of a HardwareProfile CRD
// needed by the EvalHub form and validation flow.
type HardwareProfile struct {
	Name           string                    `json:"name"`
	DisplayName    string                    `json:"display_name"`
	Description    string                    `json:"description,omitempty"`
	Enabled        bool                      `json:"enabled"`
	SchedulingType string                    `json:"scheduling_type,omitempty"`
	LocalQueueName string                    `json:"local_queue_name,omitempty"`
	PriorityClass  string                    `json:"priority_class,omitempty"`
	Resources      []HardwareProfileResource `json:"resources,omitempty"`
}

type HardwareProfilesResponse struct {
	Items   []HardwareProfile `json:"items"`
	Warning string            `json:"warning,omitempty"`
}

type HardwareProfileValidationRequest struct {
	HardwareProfile string   `json:"hardware_profile"`
	ProviderIDs     []string `json:"provider_ids"`
}

type HardwareProfileResourceMismatch struct {
	ProviderID string `json:"provider_id"`
	Resource   string `json:"resource"`
	Required   string `json:"required"`
	Available  string `json:"available"`
	Message    string `json:"message"`
}

type HardwareProfileValidationResponse struct {
	Compatible      bool                              `json:"compatible"`
	HardwareProfile string                            `json:"hardware_profile"`
	Mismatches      []HardwareProfileResourceMismatch `json:"mismatches,omitempty"`
}
