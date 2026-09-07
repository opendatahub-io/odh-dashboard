package models

type SandboxPhase string

const (
	SandboxPhaseProvisioning SandboxPhase = "PROVISIONING"
	SandboxPhaseReady        SandboxPhase = "READY"
	SandboxPhaseError        SandboxPhase = "ERROR"
	SandboxPhaseDeleting     SandboxPhase = "DELETING"
	SandboxPhaseUnknown      SandboxPhase = "UNKNOWN"
	SandboxPhaseUnspecified  SandboxPhase = "UNSPECIFIED"
)

type SandboxCondition struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
}

type SandboxStatus struct {
	SandboxName          string             `json:"sandboxName,omitempty"`
	AgentPod             string             `json:"agentPod,omitempty"`
	Conditions           []SandboxCondition `json:"conditions,omitempty"`
	Phase                SandboxPhase       `json:"phase"`
	CurrentPolicyVersion int                `json:"currentPolicyVersion"`
}

type FilesystemPolicy struct {
	IncludeWorkdir *bool    `json:"includeWorkdir,omitempty"`
	ReadOnly       []string `json:"readOnly,omitempty"`
	ReadWrite      []string `json:"readWrite,omitempty"`
}

type SandboxPolicy struct {
	Version         *int                         `json:"version,omitempty"`
	Filesystem      *FilesystemPolicy            `json:"filesystem,omitempty"`
	NetworkPolicies map[string]NetworkPolicyRule `json:"networkPolicies,omitempty"`
}

type NetworkPolicyRule struct {
	Name      string            `json:"name,omitempty"`
	Endpoints []NetworkEndpoint `json:"endpoints,omitempty"`
}

type NetworkEndpoint struct {
	Host     string `json:"host,omitempty"`
	Port     *int   `json:"port,omitempty"`
	Protocol string `json:"protocol,omitempty"`
}

type SandboxSpec struct {
	LogLevel    string            `json:"logLevel,omitempty"`
	Environment map[string]string `json:"environment,omitempty"`
	Image       string            `json:"image,omitempty"`
	Providers   []string          `json:"providers,omitempty"`
	Policy      *SandboxPolicy    `json:"policy,omitempty"`
}

type Sandbox struct {
	Metadata ObjectMeta    `json:"metadata"`
	Spec     SandboxSpec   `json:"spec"`
	Status   SandboxStatus `json:"status"`
}
