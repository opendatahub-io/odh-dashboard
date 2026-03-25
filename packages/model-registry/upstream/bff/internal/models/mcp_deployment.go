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

// McpDeployment represents a deployed MCPServer instance, flattened from the
// mcp.x-k8s.io/v1alpha1 MCPServer CRD for API consumption.
type McpDeployment struct {
	Name              string                   `json:"name"`
	Namespace         string                   `json:"namespace"`
	CreationTimestamp string                   `json:"creationTimestamp"`
	Image             string                   `json:"image"`
	Port              int32                    `json:"port"`
	Phase             McpDeploymentPhase       `json:"phase"`
	Conditions        []McpDeploymentCondition `json:"conditions,omitempty"`
}

type McpDeploymentList struct {
	Items         []McpDeployment `json:"items"`
	NextPageToken string          `json:"nextPageToken,omitempty"`
	PageSize      int32           `json:"pageSize"`
	Size          int32           `json:"size"`
}
