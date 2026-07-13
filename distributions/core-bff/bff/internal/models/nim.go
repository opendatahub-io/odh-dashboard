package models

import "k8s.io/apimachinery/pkg/runtime/schema"

const (
	NIMAccountName          = "odh-nim-account"
	NIMSecretName           = "nvidia-nim-access" //nolint:gosec // G101: resource name, not a credential
	NIMAccountKind          = "Account"
	NIMManagedLabel         = "opendatahub.io/managed"
	NIMForceValidationAnnot = "runtimes.opendatahub.io/nim-force-validation"
)

// NIMAccountGVR is the GroupVersionResource for NIM Account CRDs.
var NIMAccountGVR = schema.GroupVersionResource{
	Group:    "nim.opendatahub.io",
	Version:  "v1",
	Resource: "accounts",
}

// NIMResourceMapping maps nim-serving resource param values to their K8s type and
// the JSON path within the NIM Account CR where the resource name is found.
type NIMResourceMapping struct {
	ResourceType string   // "Secret" or "ConfigMap"
	Path         []string // nested keys in the Account CR to reach the resource name
}

// NIMResourceMap defines how each :nimResource param resolves to a K8s resource.
var NIMResourceMap = map[string]NIMResourceMapping{
	"apiKeySecret":  {ResourceType: "Secret", Path: []string{"spec", "apiKeySecret", "name"}},
	"nimPullSecret": {ResourceType: "Secret", Path: []string{"status", "nimPullSecret", "name"}},
	"nimConfig":     {ResourceType: "ConfigMap", Path: []string{"status", "nimConfig", "name"}},
}

// NIMServingResourceResponse wraps the result of a cross-resource NIM lookup.
type NIMServingResourceResponse struct {
	Body interface{} `json:"body"`
}

// NIMIntegrationStatus represents the status of a NIM integration.
type NIMIntegrationStatus struct {
	IsInstalled                  bool   `json:"isInstalled"`
	IsEnabled                    bool   `json:"isEnabled"`
	VariablesValidationStatus    string `json:"variablesValidationStatus"`
	VariablesValidationTimestamp string `json:"variablesValidationTimestamp"`
	CanInstall                   bool   `json:"canInstall"`
	Error                        string `json:"error"`
}

// NIMDeleteResponse represents the result of deleting a NIM account.
type NIMDeleteResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

// NIMNotFoundError indicates an expected not-found condition in NIM resource lookups.
type NIMNotFoundError struct {
	Reason string
}

func (e *NIMNotFoundError) Error() string {
	return e.Reason
}
