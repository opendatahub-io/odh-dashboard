package models

// MutationResponse is the standard response for create/update/patch/delete operations.
type MutationResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
