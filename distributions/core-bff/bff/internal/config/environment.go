// Package config defines environment-driven configuration for the BFF server.
package config

import (
	"errors"
	"log/slog"
	"strings"
)

const (
	// AuthMethodDisabled skips identity extraction entirely.
	// No auth headers are checked and no RequestIdentity is injected into the context.
	// Intended for mock/testing scenarios only.
	AuthMethodDisabled = "disabled"

	// AuthMethodUser uses a user-provided Bearer token for authentication.
	AuthMethodUser = "user_token"

	// DefaultAuthTokenHeader is the header the RHOAI OAuth proxy uses to forward
	// the user's access token to BFFs.
	DefaultAuthTokenHeader = "x-forwarded-access-token" //nolint:gosec // G101: not a credential, config default for header name

	// DefaultAuthTokenPrefix is empty because x-forwarded-access-token carries
	// the raw token with no scheme prefix.
	DefaultAuthTokenPrefix = ""

	// DefaultDisabledAuthToken is injected as a placeholder when auth is disabled.
	// It must match the first entry in k8mocks.DefaultTestUsers so that mock-mode
	// handlers can resolve a valid test identity.
	DefaultDisabledAuthToken = "FAKE_CLUSTER_ADMIN_TOKEN" //nolint:gosec // G101: test-only placeholder, not a real credential
)

// DeploymentMode represents the deployment mode enum
type DeploymentMode string

const (
	// DeploymentModeFederated represents the federated platform mode
	DeploymentModeFederated DeploymentMode = "federated"
	// DeploymentModeStandalone represents the standalone mode
	DeploymentModeStandalone DeploymentMode = "standalone"
)

// String implements the fmt.Stringer interface
func (d DeploymentMode) String() string {
	return string(d)
}

// Set implements the flag.Value interface
func (d *DeploymentMode) Set(value string) error {
	switch strings.ToLower(value) {
	case "federated":
		*d = DeploymentModeFederated
	case "standalone":
		*d = DeploymentModeStandalone
	default:
		// The rejected value is not echoed: startup diagnostics never quote raw input.
		return errors.New("invalid deployment mode (value omitted): it must be federated or standalone")
	}
	return nil
}

// IsStandaloneMode returns true if the deployment mode is standalone
func (d DeploymentMode) IsStandaloneMode() bool {
	return d == DeploymentModeStandalone
}

// IsFederatedMode returns true if the deployment mode is federated
func (d DeploymentMode) IsFederatedMode() bool {
	return d == DeploymentModeFederated
}

// PlatformType represents the target platform enum
type PlatformType string

const (
	// PlatformOpenShift probes for OpenShift-specific cluster info at startup
	PlatformOpenShift PlatformType = "OpenShift"
	// PlatformXKS represents vanilla Kubernetes; skips OpenShift API detection
	PlatformXKS PlatformType = "XKS"
)

// String implements the fmt.Stringer interface
func (p PlatformType) String() string {
	return string(p)
}

// Set implements the flag.Value interface
func (p *PlatformType) Set(value string) error {
	switch value {
	case "OpenShift":
		*p = PlatformOpenShift
	case "XKS":
		*p = PlatformXKS
	case "":
		*p = ""
	default:
		return errors.New("invalid platform type (value omitted): it must be OpenShift, XKS, or empty for auto-detect")
	}
	return nil
}

// IsXKS returns true if the platform is XKS (non-OpenShift)
func (p PlatformType) IsXKS() bool {
	return p == PlatformXKS
}

// EnvConfig holds environment-driven configuration for the BFF server.
type EnvConfig struct {
	// Port is the HTTP server port.
	Port int
	// MockK8Client enables mock Kubernetes client mode.
	MockK8Client bool
	// MockHTTPClient enables mock HTTP client mode.
	MockHTTPClient bool
	// DevMode enables development mode.
	DevMode bool
	// DeploymentMode specifies federated or standalone deployment.
	DeploymentMode DeploymentMode
	// DevModeClientPort is the frontend dev server port.
	DevModeClientPort int
	// StaticAssetsDir is the directory for serving static assets.
	StaticAssetsDir string
	// LogLevel is the logging level.
	LogLevel slog.Level
	// AllowedOrigins lists CORS allowed origins.
	AllowedOrigins []string
	// BundlePaths is a list of filesystem paths to PEM-encoded CA bundle files.
	// The certificates are added to the Root CAs used for every outbound TLS
	// connection. Individual missing or unreadable files are skipped; see
	// BundlePathsRequired for what happens when none of them load.
	BundlePaths []string

	// BundlePathsRequired is true when BUNDLE_PATHS was supplied explicitly
	// (environment or CLI) rather than defaulted. An explicit trust bundle that
	// yields no usable certificate fails startup instead of silently falling
	// back to the system pool, which would be a trust downgrade.
	BundlePathsRequired bool

	// ─── AUTH ───────────────────────────────────────────────────
	// Specifies the authentication method used by the server.
	// Valid values: "disabled" or "user_token"
	AuthMethod string

	// Header used to extract the authentication token.
	// Default is "x-forwarded-access-token" and can be overridden via CLI/env for proxy integration scenarios.
	AuthTokenHeader string

	// Optional prefix to strip from the token header value.
	// Default is "" (empty); set to "Bearer " when using the standard Authorization header.
	AuthTokenPrefix string

	// AuthTokenHeaders is an ordered list of headers that may carry the caller
	// credential (AUTH_TOKEN_HEADERS / --auth-token-headers). When set it
	// replaces AuthTokenHeader/AuthTokenPrefix: Authorization must use the
	// Bearer scheme, any other header carries the bare token, and every header
	// presented must carry the same token. Empty keeps the single-header mode.
	// See docs/runtime-contract.md, "Caller credentials".
	AuthTokenHeaders []string

	// ─── TLS ────────────────────────────────────────────────────
	// TLS verification settings for HTTP client connections to the Client
	// InsecureSkipVerify when true, skips TLS certificate verification (useful for development/local setups)
	// Default is false (secure) for production environments
	InsecureSkipVerify bool

	// ─── BFF INTER-COMMUNICATION ─────────────────────────────────
	// MockBFFClients enables mock mode for BFF inter-communication clients.
	// When true, BFF clients return mock responses instead of making real HTTP calls.
	MockBFFClients bool

	// ─── CORE BFF ───────────────────────────────────────────────
	// PlatformType indicates the target platform.
	PlatformType PlatformType

	// AdmissionMode selects the dashboard admission contract used by the
	// bootstrap endpoints. Empty means "resolve from the platform at startup"
	// (see ResolveAdmissionMode).
	AdmissionMode AdmissionMode

	// Namespace is the Kubernetes namespace where the dashboard is deployed.
	Namespace string

	// OperatorNamespace is an optional preferred namespace for the data science operator subscription.
	OperatorNamespace string

	// WorkbenchNamespace is the Kubernetes namespace for workbenches.
	// Defaults to Namespace if not set. Used in namespace allowlist validation.
	WorkbenchNamespace string

	// NamespaceCandidates is the operator-configured list of namespaces the xKS
	// namespace discovery evaluates for callers who cannot list namespaces
	// cluster-wide. Listing a namespace here grants nothing: each candidate is
	// returned only after the caller's own access reviews allow it.
	NamespaceCandidates []string

	// NamespaceDiscoveryLabelSelector, when set, lets the dashboard service
	// account enumerate namespaces matching this selector as additional xKS
	// discovery candidates. Empty (the default) disables the enumeration. It is
	// the one documented service-account exception in namespace discovery and
	// needs a cluster-scoped list on namespaces for the service account.
	NamespaceDiscoveryLabelSelector string

	// DashboardConfigName is the name of the OdhDashboardConfig CR to read.
	DashboardConfigName string

	// EnabledAppsCM is the name of the ConfigMap that tracks enabled applications.
	EnabledAppsCM string

	// MFRemotesConfig is the filesystem path to the module federation remotes config file.
	MFRemotesConfig string

	// DevUser is the username injected when DevMode is true and no upstream identity is present.
	DevUser string

	// DevGroups is a comma-separated list of groups injected alongside DevUser in dev mode.
	DevGroups string

	// ─── MODEL SERVING ──────────────────────────────────────────
	// ModelServingServiceHost overrides the model-serving service proxy target URL.
	// When empty, the target is constructed as https://model-serving-api.<namespace>.svc.cluster.local:443.
	ModelServingServiceHost string

	// ─── PROMETHEUS (OpenShift-only) ────────────────────────────
	// PrometheusHost is a full Prometheus/Thanos host URL override. When set, used directly
	// instead of constructing from namespace/instance/port.
	PrometheusHost string

	// PrometheusNamespace is the namespace where Prometheus/Thanos is deployed.
	PrometheusNamespace string

	// PrometheusInstance is the Prometheus/Thanos instance name.
	PrometheusInstance string

	// PrometheusPort is the Prometheus/Thanos RBAC port.
	PrometheusPort string
}
