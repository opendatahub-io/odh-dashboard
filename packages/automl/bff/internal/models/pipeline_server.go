package models

// DSPipelineApplication represents the Kubeflow DSPipelineApplication CR
// This matches the structure from the Data Science Pipelines Operator
type DSPipelineApplication struct {
	APIVersion string                        `json:"apiVersion"`
	Kind       string                        `json:"kind"`
	Metadata   DSPipelineApplicationMetadata `json:"metadata"`
	Spec       *DSPipelineApplicationSpec    `json:"spec,omitempty"`
	Status     *DSPipelineApplicationStatus  `json:"status,omitempty"`
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
	Components *DSPipelineApplicationComponents `json:"components,omitempty"`
}

type DSPipelineApplicationComponents struct {
	APIServer *DSPipelineApplicationAPIServerStatus `json:"apiServer,omitempty"`
}

type DSPipelineApplicationAPIServerStatus struct {
	URL         string `json:"url,omitempty"`
	ExternalURL string `json:"externalUrl,omitempty"`
}

type DSPipelineApplicationCondition struct {
	Type    string `json:"type"`
	Status  string `json:"status"`
	Reason  string `json:"reason,omitempty"`
	Message string `json:"message,omitempty"`
}
