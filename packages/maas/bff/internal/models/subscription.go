package models

import "time"

// GroupReference references a Kubernetes group by name.
type GroupReference struct {
	Name string `json:"name"`
}

// OwnerSpec defines who owns a subscription.
type OwnerSpec struct {
	Groups []GroupReference `json:"groups,omitempty"`
}

// TokenRateLimit defines a token-based rate limit.
type TokenRateLimit struct {
	Limit  int64  `json:"limit"`
	Window string `json:"window"`
}

// BillingRate defines billing information for a model.
type BillingRate struct {
	PerToken string `json:"perToken"`
}

// ModelSubscriptionRef references a model with rate limits within a subscription.
type ModelSubscriptionRef struct {
	Name              string           `json:"name"`
	Namespace         string           `json:"namespace"`
	TokenRateLimits   []TokenRateLimit `json:"tokenRateLimits,omitempty"`
	TokenRateLimitRef *string          `json:"tokenRateLimitRef,omitempty"`
	BillingRate       *BillingRate     `json:"billingRate,omitempty"`
}

// TokenMetadata contains metadata for token usage attribution and metering.
type TokenMetadata struct {
	OrganizationID string            `json:"organizationId,omitempty"`
	CostCenter     string            `json:"costCenter,omitempty"`
	Labels         map[string]string `json:"labels,omitempty"`
}

// MaaSSubscription is the BFF representation of a MaaSSubscription CR.
type MaaSSubscription struct {
	Name              string                 `json:"name"`
	Namespace         string                 `json:"namespace"`
	Phase             string                 `json:"phase,omitempty"`
	Priority          int32                  `json:"priority,omitempty"`
	Owner             OwnerSpec              `json:"owner"`
	ModelRefs         []ModelSubscriptionRef `json:"modelRefs"`
	TokenMetadata     *TokenMetadata         `json:"tokenMetadata,omitempty"`
	CreationTimestamp *time.Time             `json:"creationTimestamp,omitempty"`
}

// SubjectSpec defines subjects (groups) that have access.
type SubjectSpec struct {
	Groups []GroupReference `json:"groups,omitempty"`
}

// ModelRef is a simple reference to a MaaSModelRef by name and namespace.
type ModelRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

// MaaSAuthPolicy is the BFF representation of a MaaSAuthPolicy CR.
type MaaSAuthPolicy struct {
	Name             string         `json:"name"`
	Namespace        string         `json:"namespace"`
	Phase            string         `json:"phase,omitempty"`
	ModelRefs        []ModelRef     `json:"modelRefs"`
	Subjects         SubjectSpec    `json:"subjects"`
	MeteringMetadata *TokenMetadata `json:"meteringMetadata,omitempty"`
}

// ModelReference references a model endpoint.
type ModelReference struct {
	Kind string `json:"kind"`
	Name string `json:"name"`
}

// MaaSModelRefSummary is the BFF representation of a MaaSModelRef CR.
type MaaSModelRefSummary struct {
	Name      string         `json:"name"`
	Namespace string         `json:"namespace"`
	ModelRef  ModelReference `json:"modelRef"`
	Phase     string         `json:"phase,omitempty"`
	Endpoint  string         `json:"endpoint,omitempty"`
}

// CreateSubscriptionRequest is the request body for creating a new subscription.
type CreateSubscriptionRequest struct {
	Name             string                 `json:"name"`
	Owner            OwnerSpec              `json:"owner"`
	ModelRefs        []ModelSubscriptionRef `json:"modelRefs"`
	TokenMetadata    *TokenMetadata         `json:"tokenMetadata,omitempty"`
	Priority         int32                  `json:"priority,omitempty"`
	CreateAuthPolicy bool                   `json:"createAuthPolicy,omitempty"`
}

// UpdateSubscriptionRequest is the request body for updating a subscription.
type UpdateSubscriptionRequest struct {
	Owner         OwnerSpec              `json:"owner"`
	ModelRefs     []ModelSubscriptionRef `json:"modelRefs"`
	TokenMetadata *TokenMetadata         `json:"tokenMetadata,omitempty"`
	Priority      int32                  `json:"priority,omitempty"`
}

// CreateSubscriptionResponse is the response after creating or updating a subscription.
type CreateSubscriptionResponse struct {
	Subscription MaaSSubscription `json:"subscription"`
	AuthPolicy   *MaaSAuthPolicy  `json:"authPolicy,omitempty"`
}

// SubscriptionInfoResponse contains detailed subscription info with related resources.
type SubscriptionInfoResponse struct {
	Subscription MaaSSubscription      `json:"subscription"`
	ModelRefs    []MaaSModelRefSummary `json:"modelRefs"`
	AuthPolicies []MaaSAuthPolicy      `json:"authPolicies"`
}

// SubscriptionFormDataResponse contains data for the subscription creation form.
type SubscriptionFormDataResponse struct {
	Groups    []string              `json:"groups"`
	ModelRefs []MaaSModelRefSummary `json:"modelRefs"`
}
