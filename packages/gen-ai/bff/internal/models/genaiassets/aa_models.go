package genaiassets

type AAModel struct {
	ModelName      string     `json:"model_name"`
	ServingRuntime string     `json:"serving_runtime"`
	APIProtocol    string     `json:"api_protocol"`
	Version        string     `json:"version"`
	Usecase        string     `json:"usecase"`
	Description    string     `json:"description"`
	Endpoints      []Endpoint `json:"endpoints"`
}

type Endpoint struct {
	External *ExternalEndpoint `json:"external,omitempty"`
	Internal *InternalEndpoint `json:"internal,omitempty"`
}

type ExternalEndpoint struct {
	URL                string `json:"url"`
	APIToken           string `json:"api_token"`
	ServiceAccountName string `json:"service_account_name"`
	SecretDisplayName  string `json:"secret_display_name"`
}

type InternalEndpoint struct {
	URL string `json:"url"`
}
