package models

type McpDeploymentPhase string

const (
	McpDeploymentPhasePending McpDeploymentPhase = "Pending"
	McpDeploymentPhaseRunning McpDeploymentPhase = "Running"
	McpDeploymentPhaseFailed  McpDeploymentPhase = "Failed"
)

type McpDeploymentCondition struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
}

type McpDeploymentAddress struct {
	URL string `json:"url"`
}

// McpDeployment represents a deployed MCPServer instance, flattened from the
// mcp.x-k8s.io/v1alpha1 MCPServer CRD for API consumption.
type McpDeployment struct {
	Name              string                   `json:"name"`
	DisplayName       string                   `json:"displayName,omitempty"`
	ServerName        string                   `json:"serverName,omitempty"`
	Namespace         string                   `json:"namespace"`
	UID               string                   `json:"uid"`
	CreationTimestamp string                   `json:"creationTimestamp"`
	Image             string                   `json:"image"`
	YAML              string                   `json:"yaml,omitempty"`
	Phase             McpDeploymentPhase       `json:"phase"`
	Conditions        []McpDeploymentCondition `json:"conditions,omitempty"`
	Address           *McpDeploymentAddress    `json:"address,omitempty"`
}

type McpDeploymentList struct {
	Items []McpDeployment `json:"items"`
	Size  int32           `json:"size"`
}

type McpDeploymentCreateRequest struct {
	Name        string `json:"name,omitempty"`
	DisplayName string `json:"displayName,omitempty"`
	ServerName  string `json:"serverName,omitempty"`
	Image       string `json:"image"`
	YAML        string `json:"yaml,omitempty"`
}

type McpDeploymentUpdateRequest struct {
	DisplayName *string `json:"displayName,omitempty"`
	ServerName  *string `json:"serverName,omitempty"`
	Image       *string `json:"image,omitempty"`
	YAML        *string `json:"yaml,omitempty"`
}

// SpecYAMLWrapper mirrors the "spec:" top-level key the frontend YAML
type SpecYAMLWrapper struct {
	Spec McpSpecBody `json:"spec" yaml:"spec"`
}

// McpSpecBody holds the config and runtime sections parsed from YAML.
type McpSpecBody struct {
	Config  *MCPConfigSpec  `json:"config,omitempty" yaml:"config,omitempty"`
	Runtime *MCPRuntimeSpec `json:"runtime,omitempty" yaml:"runtime,omitempty"`
}
