package models

// CreatePolicyRequest is the request body for creating a new policy.
type CreatePolicyRequest struct {
	Name             string         `json:"name"`
	DisplayName      string         `json:"displayName,omitempty"`
	Description      string         `json:"description,omitempty"`
	ModelRefs        []ModelRef     `json:"modelRefs"`
	Subjects         SubjectSpec    `json:"subjects"`
	MeteringMetadata *TokenMetadata `json:"meteringMetadata,omitempty"`
}

// UpdatePolicyRequest is the request body for updating a policy.
type UpdatePolicyRequest struct {
	DisplayName      string         `json:"displayName,omitempty"`
	Description      string         `json:"description,omitempty"`
	ModelRefs        []ModelRef     `json:"modelRefs"`
	Subjects         SubjectSpec    `json:"subjects"`
	MeteringMetadata *TokenMetadata `json:"meteringMetadata,omitempty"`
}

// PolicyInfoResponse contains detailed policy info with related model refs.
type PolicyInfoResponse struct {
	Policy    MaaSAuthPolicy        `json:"policy"`
	ModelRefs []MaaSModelRefSummary `json:"modelRefs"`
}
