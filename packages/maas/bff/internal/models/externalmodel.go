package models

// ProviderRef references an ExternalProvider with routing configuration.
type ProviderRef struct {
	ProviderName string                   `json:"providerName"`
	Weight       int                      `json:"weight"`
	APIFormat    string                   `json:"apiFormat"`
	Path         string                   `json:"path"`
	TargetModel  string                   `json:"targetModel"`
	Config       map[string]string        `json:"config,omitempty"`
	Provider     *ExternalProviderDetails `json:"provider,omitempty"`
}

// ExternalModelMaaSModelRefStatus contains published endpoint details from the companion MaaSModelRef.
type ExternalModelMaaSModelRefStatus struct {
	Phase              string `json:"phase,omitempty"`
	Endpoint           string `json:"endpoint,omitempty"`
	StatusMessage      string `json:"statusMessage,omitempty"`
	GovernanceAttached bool   `json:"governanceAttached"`
}

// ExternalModelSummary is the BFF representation of an ExternalModel CR.
type ExternalModelSummary struct {
	Name          string                           `json:"name"`
	Namespace     string                           `json:"namespace"`
	DisplayName   string                           `json:"displayName,omitempty"`
	Description   string                           `json:"description,omitempty"`
	ModelName     string                           `json:"modelName,omitempty"`
	ProviderRefs  []ProviderRef                    `json:"providerRefs"`
	Phase         string                           `json:"phase,omitempty"`
	StatusMessage string                           `json:"statusMessage,omitempty"`
	MaaSModelRef  *ExternalModelMaaSModelRefStatus `json:"maaSModelRef,omitempty"`
}
