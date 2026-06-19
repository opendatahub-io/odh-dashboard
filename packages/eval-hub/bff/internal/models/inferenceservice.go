package models

type InferenceServiceItem struct {
	Name  string `json:"name"`
	URL   string `json:"url,omitempty"`
	Ready bool   `json:"ready"`
}

type InferenceServicesResponse struct {
	Items   []InferenceServiceItem `json:"items"`
	Warning string                 `json:"warning,omitempty"`
}
