package models

// MutationResponse is the standard envelope for create/update/patch/delete operations.
// The "Response" suffix distinguishes it from domain models - it is a wire-format
// contract (Fastify's { success, error } shape), not a Kubernetes resource representation.
type MutationResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
