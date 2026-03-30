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
	DisplayName       string                   `json:"displayName,omitempty"`
	Namespace         string                   `json:"namespace"`
	UID               string                   `json:"uid"`
	CreationTimestamp string                   `json:"creationTimestamp"`
	Image             string                   `json:"image"`
	Port              int32                    `json:"port"`
	YAML              string                   `json:"yaml,omitempty"`
	Phase             McpDeploymentPhase       `json:"phase"`
	Conditions        []McpDeploymentCondition `json:"conditions,omitempty"`
}

type McpDeploymentList struct {
	Items         []McpDeployment `json:"items"`
	NextPageToken string          `json:"nextPageToken,omitempty"`
	PageSize      int32           `json:"pageSize"`
	Size          int32           `json:"size"`
}

type McpDeploymentCreateRequest struct {
	Name        string `json:"name,omitempty"`
	DisplayName string `json:"displayName,omitempty"`
	Image       string `json:"image"`
	Port        int32  `json:"port,omitempty"`
	YAML        string `json:"yaml,omitempty"`
}

type McpDeploymentUpdateRequest struct {
	DisplayName *string `json:"displayName,omitempty"`
	Image       *string `json:"image,omitempty"`
	Port        *int32  `json:"port,omitempty"`
	YAML        *string `json:"yaml,omitempty"`
}
