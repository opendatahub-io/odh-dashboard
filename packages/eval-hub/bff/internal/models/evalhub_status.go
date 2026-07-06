package models

type EvalHubCRStatus struct {
	Name            string             `json:"name"`
	Namespace       string             `json:"namespace"`
	Phase           string             `json:"phase"`
	Ready           string             `json:"ready"`
	URL             string             `json:"url,omitempty"`
	ActiveProviders []string           `json:"activeProviders,omitempty"`
	Conditions      []EvalHubCondition `json:"conditions,omitempty"`
	LastUpdateTime  string             `json:"lastUpdateTime,omitempty"`
	ReadyReplicas   int64              `json:"readyReplicas"`
	Replicas        int64              `json:"replicas"`
}

type EvalHubCondition struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
}
