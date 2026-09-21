package models

// AgentDeploymentCreateRequest is the request body for POST /api/v1/agent-deployments.
type AgentDeploymentCreateRequest struct {
	Name           string `json:"name"`
	Description    string `json:"description,omitempty"`
	AgentProfileID string `json:"agentProfileId"`
	// MCPServerAuth maps an MCP server ID (the selected ConfigMap key) to its
	// optional authorization value. Values are written to deployment-only Secrets.
	MCPServerAuth map[string]string `json:"mcpServerAuth,omitempty"`
}

// AgentDeploymentCreateResponse is returned after all agent deployment resources are created.
type AgentDeploymentCreateResponse struct {
	LlamaStackConfigMapName string `json:"llamaStackConfigMapName"`
	WrapperAppConfigMapName string `json:"wrapperAppConfigMapName"`
	SandboxName             string `json:"sandboxName"`
	Namespace               string `json:"namespace"`
	RouteURL                string `json:"routeUrl"`
	AgentProfileID          string `json:"agentProfileId"`
}
