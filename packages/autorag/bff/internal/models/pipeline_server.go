package models

// PipelineServer represents a DSPipelineApplication in a namespace
// This is the stable public API format exposed to the frontend
type PipelineServer struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Ready     bool   `json:"ready"`
	APIUrl    string `json:"api_url,omitempty"`
	UIUrl     string `json:"ui_url,omitempty"`
}

// PipelineServersData contains a list of pipeline servers
type PipelineServersData struct {
	Servers []PipelineServer `json:"servers"`
}

// DSPipelineApplication represents the Kubeflow DSPipelineApplication CR
// This matches the structure from the Data Science Pipelines Operator
type DSPipelineApplication struct {
	APIVersion string                        `json:"apiVersion"`
	Kind       string                        `json:"kind"`
	Metadata   DSPipelineApplicationMetadata `json:"metadata"`
	Spec       DSPipelineApplicationSpec     `json:"spec,omitempty"`
	Status     DSPipelineApplicationStatus   `json:"status,omitempty"`
}

type DSPipelineApplicationMetadata struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type DSPipelineApplicationSpec struct {
	// Spec fields can be added as needed
	APIServer *APIServer `json:"apiServer,omitempty"`
}

type APIServer struct {
	// API Server configuration
	Deploy bool `json:"deploy,omitempty"`
}

type DSPipelineApplicationStatus struct {
	Ready      bool                             `json:"ready"`
	Conditions []DSPipelineApplicationCondition `json:"conditions,omitempty"`
}

type DSPipelineApplicationCondition struct {
	Type    string `json:"type"`
	Status  string `json:"status"`
	Reason  string `json:"reason,omitempty"`
	Message string `json:"message,omitempty"`
}
