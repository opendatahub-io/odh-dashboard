package models

// ExternalModelConfigStatus describes whether the companion MaaSModelRef has an active
// subscription+auth-policy pairing (status.conditions type=GovernanceAttached).
// Separate from Kubernetes reconciliation phase. The controller only reports paired vs not;
// it does not distinguish missing subscription vs missing auth policy.
type ExternalModelConfigStatus string

const (
	ExternalModelConfigStatusReady    ExternalModelConfigStatus = "Ready"
	ExternalModelConfigStatusNoConfig ExternalModelConfigStatus = "NoConfig"
)

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
	Phase         string `json:"phase,omitempty"`
	Endpoint      string `json:"endpoint,omitempty"`
	StatusMessage string `json:"statusMessage,omitempty"`
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
	ConfigStatus  ExternalModelConfigStatus        `json:"configStatus"`
	MaaSModelRef  *ExternalModelMaaSModelRefStatus `json:"maaSModelRef,omitempty"`
}
