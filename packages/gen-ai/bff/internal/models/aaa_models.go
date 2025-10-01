package models

type AAModel struct {
	ModelName      string   `json:"model_name"`
	ServingRuntime string   `json:"serving_runtime"`
	APIProtocol    string   `json:"api_protocol"`
	Version        string   `json:"version"`
	Usecase        string   `json:"usecase"`
	Description    string   `json:"description"`
	Endpoints      []string `json:"endpoints"`
	Status         string   `json:"status"`
	DisplayName    string   `json:"display_name"`
}
