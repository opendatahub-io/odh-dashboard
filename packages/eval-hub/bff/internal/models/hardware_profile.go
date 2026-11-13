package models

type HardwareProfileValidationRequest struct {
	HardwareProfiles []string `json:"hardware_profiles"`
	ProviderIDs      []string `json:"provider_ids"`
}

type HardwareProfileResourceMismatch struct {
	ProviderID string `json:"provider_id"`
	Resource   string `json:"resource"`
	Required   string `json:"required"`
	Available  string `json:"available"`
	Message    string `json:"message"`
}

type HardwareProfileValidationResult struct {
	Compatible      bool                              `json:"compatible"`
	HardwareProfile string                            `json:"hardware_profile"`
	Mismatches      []HardwareProfileResourceMismatch `json:"mismatches,omitempty"`
}

type HardwareProfileValidationResponse struct {
	Items []HardwareProfileValidationResult `json:"items"`
}
