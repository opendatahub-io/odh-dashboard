package models

import "time"

// TokenRateLimitInfo is the rate limit shape returned by the maas-api passthrough.
type TokenRateLimitInfo struct {
	Limit  int64  `json:"limit"`
	Window string `json:"window"`
}

// BillingRateInfo is the billing rate shape returned by the maas-api passthrough.
type BillingRateInfo struct {
	PerToken string `json:"per_token"`
}

// ModelRefInfo is a model reference with rate limits from the maas-api passthrough.
type ModelRefInfo struct {
	Name            string               `json:"name"`
	DisplayName     string               `json:"display_name,omitempty"`
	Namespace       string               `json:"namespace,omitempty"`
	TokenRateLimits []TokenRateLimitInfo `json:"token_rate_limits"`
	BillingRate     *BillingRateInfo     `json:"billing_rate,omitempty"`
}

// SubscriptionListItem is the sanitised subscription view from the maas-api /v1/subscriptions passthrough.
type SubscriptionListItem struct {
	SubscriptionIDHeader    string            `json:"subscription_id_header"`
	SubscriptionDescription string            `json:"subscription_description"`
	DisplayName             string            `json:"display_name,omitempty"`
	Priority                int32             `json:"priority"`
	ModelRefs               []ModelRefInfo    `json:"model_refs"`
	OrganizationID          string            `json:"organization_id,omitempty"`
	CostCenter              string            `json:"cost_center,omitempty"`
	Labels                  map[string]string `json:"labels,omitempty"`
}

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
	Name            string           `json:"name"`
	Namespace       string           `json:"namespace"`
	TokenRateLimits []TokenRateLimit `json:"tokenRateLimits"`
	BillingRate     *BillingRate     `json:"billingRate,omitempty"`
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
	DisplayName       string                 `json:"displayName,omitempty"`
	Description       string                 `json:"description,omitempty"`
	Namespace         string                 `json:"namespace"`
	Phase             string                 `json:"phase,omitempty"`
	StatusMessage     string                 `json:"statusMessage,omitempty"`
	Priority          int32                  `json:"priority"`
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
	Name              string         `json:"name"`
	Namespace         string         `json:"namespace"`
	DisplayName       string         `json:"displayName,omitempty"`
	Description       string         `json:"description,omitempty"`
	Phase             string         `json:"phase,omitempty"`
	StatusMessage     string         `json:"statusMessage,omitempty"`
	CreationTimestamp *time.Time     `json:"creationTimestamp,omitempty"`
	ModelRefs         []ModelRef     `json:"modelRefs"`
	Subjects          SubjectSpec    `json:"subjects"`
	MeteringMetadata  *TokenMetadata `json:"meteringMetadata,omitempty"`
}

// ModelReference references a model endpoint.
type ModelReference struct {
	Kind string `json:"kind"`
	Name string `json:"name"`
}

// MaaSModelRefSummary is the BFF representation of a MaaSModelRef CR.
type MaaSModelRefSummary struct {
	Name        string         `json:"name"`
	Namespace   string         `json:"namespace"`
	DisplayName string         `json:"displayName,omitempty"`
	Description string         `json:"description,omitempty"`
	ModelRef    ModelReference `json:"modelRef"`
	Phase       string         `json:"phase,omitempty"`
	Endpoint    string         `json:"endpoint,omitempty"`
}

// CreateSubscriptionRequest is the request body for creating a new subscription.
type CreateSubscriptionRequest struct {
	Name             string                 `json:"name"`
	DisplayName      string                 `json:"displayName,omitempty"`
	Description      string                 `json:"description,omitempty"`
	Owner            OwnerSpec              `json:"owner"`
	ModelRefs        []ModelSubscriptionRef `json:"modelRefs"`
	TokenMetadata    *TokenMetadata         `json:"tokenMetadata,omitempty"`
	Priority         int32                  `json:"priority,omitempty"`
	CreateAuthPolicy bool                   `json:"createAuthPolicy,omitempty"`
}

// UpdateSubscriptionRequest is the request body for updating a subscription.
type UpdateSubscriptionRequest struct {
	DisplayName   string                 `json:"displayName,omitempty"`
	Description   string                 `json:"description,omitempty"`
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

// SubscriptionFormDataResponse contains data for the subscription and policy creation forms.
type SubscriptionFormDataResponse struct {
	Groups        []string              `json:"groups"`
	ModelRefs     []MaaSModelRefSummary `json:"modelRefs"`
	Policies      []MaaSAuthPolicy      `json:"policies"`
	Subscriptions []MaaSSubscription    `json:"subscriptions"`
}
