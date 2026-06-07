package models

type VerifyConnectionRequest struct {
	SourceType  string `json:"source_type"`
	BaseURL     string `json:"base_url"`
	SecretValue string `json:"secret_value,omitempty"`
	ModelID     string `json:"model_id,omitempty"`
}

type VerifyConnectionResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	ResponseTime int    `json:"response_time_ms,omitempty"`
}
