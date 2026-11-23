package models

// AccessDecision is the outcome of one SelfSubjectAccessReview. It is a string
// rather than a bool so a denied check and a check that could not be evaluated
// stay distinguishable on the wire. Only AccessAllowed ever enables an action.
type AccessDecision string

const (
	AccessAllowed AccessDecision = "allowed"
	AccessDenied  AccessDecision = "denied"
	// AccessError means the review could not be evaluated. It never grants access.
	AccessError AccessDecision = "error"
)

// NamespaceDiscoverySource says where the candidate namespaces came from.
type NamespaceDiscoverySource string

const (
	// NamespaceSourceClusterList: the caller may list namespaces cluster-wide,
	// so the candidates are the namespaces the caller listed.
	NamespaceSourceClusterList NamespaceDiscoverySource = "cluster-list"
	// NamespaceSourceCandidates: the caller cannot list namespaces, so the
	// candidates are the configured, labelled and requested namespaces. The UI
	// keeps offering manual namespace entry in this mode.
	NamespaceSourceCandidates NamespaceDiscoverySource = "candidates"
)

// Discovery issue codes. They are counts and codes only: an issue never names
// a namespace, so a failure cannot reveal one the caller is not authorized for.
const (
	IssueClusterListReviewFailed = "CLUSTER_LIST_REVIEW_FAILED"
	IssueClusterListFailed       = "CLUSTER_LIST_FAILED"
	IssueLabelDiscoveryFailed    = "LABEL_DISCOVERY_FAILED"
	IssueAccessReviewFailed      = "ACCESS_REVIEW_FAILED"
	// IssueNamespaceReadFailed: the caller may get the namespace, but reading
	// it failed, so its phase and metadata are missing (phase Unknown).
	IssueNamespaceReadFailed = "NAMESPACE_READ_FAILED"
	IssueCandidatesTruncated = "CANDIDATES_TRUNCATED"
	// IssueSharedAccessReviewFailed counts failed dashboard-namespace reviews.
	IssueSharedAccessReviewFailed = "SHARED_ACCESS_REVIEW_FAILED"
	// IssueDiscoveryDeadlineExceeded: the request deadline expired; reviews
	// still pending were counted as failed.
	IssueDiscoveryDeadlineExceeded = "DISCOVERY_DEADLINE_EXCEEDED"
)

// ResourcePermissions maps a verb to its decision for one resource.
type ResourcePermissions map[string]AccessDecision

// NamespaceActions are the UI-facing capabilities derived from the permission
// matrix. Each is true only when every review it depends on was allowed, so a
// failed review hides the action instead of offering it.
type NamespaceActions struct {
	// View: list and get LLMInferenceServices.
	View bool `json:"view"`
	// Deploy: create LLMInferenceServices.
	Deploy bool `json:"deploy"`
	// Edit: patch LLMInferenceServices.
	Edit bool `json:"edit"`
	// Delete: delete LLMInferenceServices.
	Delete bool `json:"delete"`
	// ManageTokenAuth: create, get, patch (owner reference) and delete Secrets
	// for token authentication.
	ManageTokenAuth bool `json:"manageTokenAuth"`
}

// Any reports whether at least one action is available.
func (a NamespaceActions) Any() bool {
	return a.View || a.Deploy || a.Edit || a.Delete || a.ManageTokenAuth
}

// NamespacePhaseUnknown is reported when the caller is authorized in a
// namespace but its Namespace object (and so its status.phase) could not be
// read. Such a namespace is usable: the UI offers it, labelled by its name.
const NamespacePhaseUnknown = "Unknown"

// NamespaceAccess is one namespace the caller is authorized to use, with the
// permission matrix that authorized it.
type NamespaceAccess struct {
	Name string `json:"name"`
	// DisplayName is present only when the namespace object could be read (by
	// the caller, or by the opt-in label discovery).
	DisplayName string `json:"displayName,omitempty"`
	// Phase is always set: the namespace's status.phase when it could be read,
	// otherwise NamespacePhaseUnknown.
	Phase string `json:"phase"`
	// IsAiProject is true only when the namespace object could be read and its
	// opendatahub.io/dashboard label is exactly "true", as on /api/v1/namespaces.
	IsAiProject bool             `json:"isAiProject"`
	Actions     NamespaceActions `json:"actions"`
	// Permissions is keyed by "<group>/<resource>" ("core" for the empty group).
	Permissions map[string]ResourcePermissions `json:"permissions"`
}

// SharedNamespaceAccess reports the caller's reads of resources the RHAII
// journey retains from the dashboard namespace.
type SharedNamespaceAccess struct {
	Namespace   string                         `json:"namespace"`
	Permissions map[string]ResourcePermissions `json:"permissions"`
}

// NamespaceDiscoveryIssue is a non-fatal discovery problem.
type NamespaceDiscoveryIssue struct {
	Code  string `json:"code"`
	Count int    `json:"count"`
}

// NamespaceAccessList is the discovery result.
type NamespaceAccessList struct {
	Source NamespaceDiscoverySource `json:"source"`
	// Complete is false when any candidate source or access review failed, so
	// the list may be missing namespaces the caller could use.
	Complete   bool                      `json:"complete"`
	Issues     []NamespaceDiscoveryIssue `json:"issues"`
	Namespaces []NamespaceAccess         `json:"namespaces"`
	Shared     SharedNamespaceAccess     `json:"shared"`
}
