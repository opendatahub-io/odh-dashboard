package models

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
	Name        string `json:"name"`
	DisplayName string `json:"displayName,omitempty"`
	ServerName  string `json:"serverName,omitempty"`
	// RegistryServer and RegistryVersion trace deployments from MCP Registry; ServerName traces catalog.
	RegistryServer    string `json:"registryServer,omitempty"`
	RegistryVersion   string `json:"registryVersion,omitempty"`
	Namespace         string `json:"namespace"`
	UID               string `json:"uid"`
	CreationTimestamp string `json:"creationTimestamp"`
	Image             string `json:"image"`
	// Port and Path are from spec.config; consumers can build an access endpoint
	// URL without guessing the deployed container's listen address.
	Port       int32                    `json:"port"`
	Path       string                   `json:"path,omitempty"`
	YAML       string                   `json:"yaml,omitempty"`
	Conditions []McpDeploymentCondition `json:"conditions"`
	Address    *McpDeploymentAddress    `json:"address,omitempty"`
}

type McpDeploymentList struct {
	Items []McpDeployment `json:"items"`
	Size  int32           `json:"size"`
}

type McpDeploymentCreateRequest struct {
	Name            string `json:"name,omitempty"`
	DisplayName     string `json:"displayName,omitempty"`
	ServerName      string `json:"serverName,omitempty"`
	RegistryServer  string `json:"registryServer,omitempty"`
	RegistryVersion string `json:"registryVersion,omitempty"`
	Image           string `json:"image"`
	YAML            string `json:"yaml,omitempty"`
}

type McpDeploymentUpdateRequest struct {
	DisplayName     *string `json:"displayName,omitempty"`
	ServerName      *string `json:"serverName,omitempty"`
	RegistryServer  *string `json:"registryServer,omitempty"`
	RegistryVersion *string `json:"registryVersion,omitempty"`
	Image           *string `json:"image,omitempty"`
	YAML            *string `json:"yaml,omitempty"`
}

// McpSpecBody holds the config and runtime sections parsed from YAML.
type McpSpecBody struct {
	Config  *MCPConfigSpec  `json:"config,omitempty" yaml:"config,omitempty"`
	Runtime *MCPRuntimeSpec `json:"runtime,omitempty" yaml:"runtime,omitempty"`
}
