package models

type AAModel struct {
	ModelName      string   `json:"model_name"`
	ModelID        string   `json:"model_id"`
	ServingRuntime string   `json:"serving_runtime"`
	APIProtocol    string   `json:"api_protocol"`
	Version        string   `json:"version"`
	Usecase        string   `json:"usecase"`
	Description    string   `json:"description"`
	Endpoints      []string `json:"endpoints"`
	Status         string   `json:"status"`
	DisplayName    string   `json:"display_name"`
	SAToken        SAToken  `json:"sa_token"`
}

type SAToken struct {
	Name      string `json:"name"`
	TokenName string `json:"token_name"`
	Token     string `json:"token"`
}
