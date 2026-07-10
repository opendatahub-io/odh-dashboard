package models

type InferenceServiceItem struct {
	Name            string `json:"name"`
	URL             string `json:"url,omitempty"`
	Ready           bool   `json:"ready"`
	ModelFormatName string `json:"modelFormatName,omitempty"`
}

type InferenceServicesResponse struct {
	Items   []InferenceServiceItem `json:"items"`
	Warning string                 `json:"warning,omitempty"`
}
