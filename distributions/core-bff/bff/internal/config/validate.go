package config

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/util/validation"
)

// ValidationError collects every configuration problem found at startup so one
// run surfaces the full list instead of one problem per restart.
type ValidationError struct {
	Problems []string
}

func (e *ValidationError) Error() string {
	if len(e.Problems) == 1 {
		return "invalid configuration: " + e.Problems[0]
	}
	return fmt.Sprintf("invalid configuration (%d problems):\n  - %s",
		len(e.Problems), strings.Join(e.Problems, "\n  - "))
}

// TLSFiles holds the serving certificate inputs resolved from CLI or environment.
type TLSFiles struct {
	CertFile string
	KeyFile  string
}

// Enabled reports whether TLS serving was requested. A half-configured pair is
// not "enabled": Validate rejects it rather than letting the server fall back
// to plaintext HTTP.
func (t TLSFiles) Enabled() bool {
	return t.CertFile != "" && t.KeyFile != ""
}

// IsProductionProfile reports whether the resolved configuration claims to be a
// production deployment. Only DEV_MODE and MOCK_K8S_CLIENT opt out: both mean
// there is no real cluster behind the process, which is what makes relaxing
// the production-only rejections below safe. MOCK_HTTP_CLIENT and
// MOCK_BFF_CLIENTS replace one client each while every other client stays
// real, so on their own they keep the production rules in force.
func (c EnvConfig) IsProductionProfile() bool {
	return !c.DevMode && !c.MockK8Client
}

// SkipsTLSVerification reports whether outbound transports may skip upstream
// certificate verification. It is the single gate every real client uses, so
// only an explicit development profile can skip verification, even if
// Validate is bypassed. MOCK_K8S_CLIENT alone is not enough: it replaces the
// Kubernetes clients only, and the connection probes, Prometheus and the
// service proxies can still reach real endpoints.
func (c EnvConfig) SkipsTLSVerification() bool {
	return c.InsecureSkipVerify && c.DevMode
}

// Validate checks the resolved configuration and returns a *ValidationError
// describing every problem. It is the single gate between flag parsing and
// server startup: a configuration that does not validate must not start.
//
// The rules are documented in docs/runtime-contract.md. Validate never reads or
// reports credential values.
func (c EnvConfig) Validate(tlsFiles TLSFiles) error {
	var problems []string
	add := func(format string, args ...any) {
		problems = append(problems, fmt.Sprintf(format, args...))
	}

	c.validateCore(add)
	c.validateAuth(add)
	c.validateProductionProfile(add)
	c.validateServiceTargets(add)
	validateServingTLS(tlsFiles, add)
	c.validateTrustBundles(add)

	if len(problems) > 0 {
		return &ValidationError{Problems: problems}
	}
	return nil
}

func (c EnvConfig) validateCore(add func(string, ...any)) {
	if c.Port < 1 || c.Port > 65535 {
		add("PORT/--port is %d; it must be between 1 and 65535", c.Port)
	}

	switch c.DeploymentMode {
	case DeploymentModeFederated, DeploymentModeStandalone:
	default:
		add("DEPLOYMENT_MODE/--deployment-mode is not a supported value (value omitted); it must be %q or %q",
			DeploymentModeFederated, DeploymentModeStandalone)
	}

	switch c.PlatformType {
	case PlatformOpenShift, PlatformXKS, "":
	default:
		add("ODH_PLATFORM_TYPE/--platform-type is not a supported value (value omitted); it must be %q, %q, or empty to auto-detect",
			PlatformOpenShift, PlatformXKS)
	}

	switch c.AdmissionMode {
	case AdmissionModeAuthResource, AdmissionModeAuthenticated, "":
	default:
		add("ADMISSION_MODE/--admission-mode is not a supported value (value omitted); it must be %q, %q, or empty to resolve from the platform",
			AdmissionModeAuthResource, AdmissionModeAuthenticated)
	}

	if strings.TrimSpace(c.Namespace) == "" {
		add("NAMESPACE/--namespace is empty; the dashboard namespace is required")
	}
	if strings.TrimSpace(c.DashboardConfigName) == "" {
		add("DASHBOARD_CONFIG_NAME/--dashboard-config-name is empty; unset it to use the default %q, or name the OdhDashboardConfig instance", "odh-dashboard-config")
	}
	c.validateKubernetesNames(add)

	if strings.TrimSpace(c.StaticAssetsDir) == "" {
		add("STATIC_ASSETS_DIR/--static-assets-dir is empty; the SPA asset root is required")
	}
}

// validateKubernetesNames checks every setting that names a Kubernetes object.
// They are used in API paths, label selectors and in-cluster DNS names, so a
// value such as "monitoring/thanos-querier" would otherwise silently change
// the request target. Empty values are left to their own required-field rules.
func (c EnvConfig) validateKubernetesNames(add func(string, ...any)) {
	for _, n := range []struct {
		setting, value, kind string
		check                func(string) []string
		required             bool
	}{
		{"NAMESPACE/--namespace", c.Namespace, "namespace name", validation.IsDNS1123Label, true},
		{"OPERATOR_NAMESPACE/--operator-namespace", c.OperatorNamespace, "namespace name", validation.IsDNS1123Label, false},
		{"WORKBENCH_NAMESPACE/--workbench-namespace", c.WorkbenchNamespace, "namespace name", validation.IsDNS1123Label, false},
		{"DASHBOARD_CONFIG_NAME/--dashboard-config-name", c.DashboardConfigName, "object name", validation.IsDNS1123Subdomain, true},
		{"ENABLED_APPS_CM/--enabled-apps-cm", c.EnabledAppsCM, "ConfigMap name", validation.IsDNS1123Subdomain, false},
		{"PROMETHEUS_NAMESPACE/--prometheus-namespace", c.PrometheusNamespace, "namespace name", validation.IsDNS1123Label, false},
		{"PROMETHEUS_INSTANCE/--prometheus-instance", c.PrometheusInstance, "Service name", validation.IsDNS1035Label, false},
	} {
		// An optional setting may be empty. Whitespace is a value, and an
		// invalid one, except where a required setting's blank is already
		// reported as missing.
		if n.value == "" || (n.required && strings.TrimSpace(n.value) == "") {
			continue
		}
		if len(n.check(n.value)) > 0 {
			add("%s (value omitted) is not a valid Kubernetes %s", n.setting, n.kind)
		}
	}
}

func (c EnvConfig) validateAuth(add func(string, ...any)) {
	switch c.AuthMethod {
	case AuthMethodDisabled, AuthMethodUser:
	default:
		add("AUTH_METHOD/--auth-method is not a supported value (value omitted); it must be %q or %q",
			AuthMethodDisabled, AuthMethodUser)
	}

	if c.AuthMethod == AuthMethodUser {
		switch header := strings.TrimSpace(c.AuthTokenHeader); {
		case header == "":
			add("AUTH_TOKEN_HEADER/--auth-token-header is empty while AUTH_METHOD=%s; a token header is required",
				AuthMethodUser)
		case !isHTTPFieldName(c.AuthTokenHeader):
			add("AUTH_TOKEN_HEADER/--auth-token-header (value omitted) is not a valid HTTP field name; a gateway could never send it")
		}
	}
}

// isHTTPFieldName reports whether name is an RFC 9110 field name: one or more
// token characters, so no spaces, separators or control characters.
func isHTTPFieldName(name string) bool {
	if name == "" {
		return false
	}
	for i := 0; i < len(name); i++ {
		c := name[i]
		switch {
		case c >= 'a' && c <= 'z', c >= 'A' && c <= 'Z', c >= '0' && c <= '9':
		case strings.IndexByte("!#$%&'*+-.^_`|~", c) >= 0:
		default:
			return false
		}
	}
	return true
}

// validateProductionProfile rejects development, mock, disabled-authentication
// and insecure-transport settings on a deployment that is not opted into a
// development profile. Each message names the setting and the way out.
func (c EnvConfig) validateProductionProfile(add func(string, ...any)) {
	// Checked outside the production gate: SkipsTLSVerification honours the
	// flag in DEV_MODE only, so accepting it elsewhere would be a silent no-op.
	if c.InsecureSkipVerify && !c.DevMode {
		if c.IsProductionProfile() {
			add("INSECURE_SKIP_VERIFY=true is not supported in a production profile; supply the upstream CA through BUNDLE_PATHS instead")
		} else {
			add("INSECURE_SKIP_VERIFY=true requires DEV_MODE=true; MOCK_K8S_CLIENT mocks the Kubernetes clients only, and the other outbound clients stay real")
		}
	}

	if !c.IsProductionProfile() {
		return
	}

	if c.AuthMethod == AuthMethodDisabled {
		add("AUTH_METHOD=%s is not supported in a production profile; use %s, or set DEV_MODE=true for local development",
			AuthMethodDisabled, AuthMethodUser)
	}

	for i, origin := range c.AllowedOrigins {
		origin = strings.TrimSpace(origin)
		if origin == "" {
			continue
		}
		// Entries are reported by position, never by value: a rejected entry
		// can carry user info or a query string that must not reach the logs.
		if reason := exactOriginProblem(origin); reason != "" {
			add("ALLOWED_ORIGINS entry %d (1-based, value omitted) is not an exact origin (%s) while CORS responses allow credentials; list each dashboard origin as scheme://host[:port]",
				i+1, reason)
		}
	}
}

// validateServiceTargets checks the upstream service URL overrides. Both carry
// the caller's bearer token, so outside DEV_MODE they must be reached over
// HTTPS, mocked Kubernetes or not; a bare host name would otherwise pass
// startup and fail on the first request. Problems name the setting only:
// either value may carry user info.
func (c EnvConfig) validateServiceTargets(add func(string, ...any)) {
	for _, target := range []struct{ setting, value string }{
		{"MODEL_SERVING_HOST/--model-serving-host", c.ModelServingServiceHost},
		{"PROMETHEUS_HOST/--prometheus-host", c.PrometheusHost},
	} {
		if target.value == "" {
			continue
		}
		if reason := serviceTargetProblem(target.value, c.DevMode); reason != "" {
			add("%s (value omitted) %s", target.setting, reason)
		}
	}

	// Without PROMETHEUS_HOST the target is derived from the instance,
	// namespace and port, so validate the URL the repository will call.
	if c.PrometheusHost != "" {
		return
	}
	// The derived target needs all three parts. Leaving all of them empty
	// turns Prometheus off; leaving only some empty is a half-configured
	// target that would otherwise fail every query at request time.
	parts := []string{c.PrometheusInstance, c.PrometheusNamespace, c.PrometheusPort}
	if set := countNonEmpty(parts); set > 0 && set < len(parts) {
		add("PROMETHEUS_INSTANCE, PROMETHEUS_NAMESPACE and PROMETHEUS_PORT (values omitted) are only partly set; set all three to derive the Prometheus target, leave all three empty to turn it off, or set PROMETHEUS_HOST")
		return
	}
	if c.PrometheusPort != "" && !isPort(c.PrometheusPort) {
		add("PROMETHEUS_PORT/--prometheus-port (value omitted) must be a port number between 1 and 65535")
		return
	}
	if derived := PrometheusTarget("", c.PrometheusInstance, c.PrometheusNamespace, c.PrometheusPort); derived != "" {
		if reason := serviceTargetProblem(derived, c.DevMode); reason != "" {
			add("PROMETHEUS_INSTANCE, PROMETHEUS_NAMESPACE and PROMETHEUS_PORT (values omitted) derive a Prometheus URL that %s", reason)
		}
	}
}

// PrometheusTarget is the base URL the Prometheus repository calls: host when
// set, otherwise the in-cluster Thanos service derived from instance,
// namespace and port, or "" when there is not enough to derive it.
func PrometheusTarget(host, instance, namespace, port string) string {
	if host != "" {
		return host
	}
	if instance == "" || namespace == "" || port == "" {
		return ""
	}
	return fmt.Sprintf("https://%s.%s.svc.cluster.local:%s", instance, namespace, port)
}

// isPort reports whether s is a decimal TCP port between 1 and 65535.
func isPort(s string) bool {
	n, err := strconv.Atoi(s)
	return err == nil && n >= 1 && n <= 65535 && strconv.Itoa(n) == s
}

// serviceTargetProblem reports why target is not a usable absolute service
// base URL, or "" when it is. Request paths and query strings are appended to
// the base, so a query or fragment in it would silently replace or drop them.
func serviceTargetProblem(target string, allowPlaintext bool) string {
	u, err := url.Parse(target)
	switch {
	case strings.TrimSpace(target) != target:
		return "has leading or trailing whitespace"
	case err != nil:
		return "does not parse as a URL"
	case u.Scheme != "http" && u.Scheme != "https":
		return "must be an absolute http(s) URL such as https://host:port"
	case u.Hostname() == "":
		return "has no host"
	case u.User != nil:
		return "must not carry user info; the caller's bearer token is the only credential sent"
	case u.Port() != "" && !isPort(u.Port()):
		return "has a port outside 1-65535"
	case strings.HasSuffix(u.Host, ":"):
		return "has an empty port"
	case u.RawQuery != "" || u.ForceQuery || u.Fragment != "" || strings.Contains(target, "#"):
		return "must not carry a query string or fragment; it is a base URL that request paths are appended to"
	case !allowPlaintext && u.Scheme != "https":
		return "must use https unless DEV_MODE=true, because the caller's bearer token is sent to it"
	}
	return ""
}

// exactOriginProblem reports why origin is not a single exact HTTP(S) origin,
// or "" when it is. The CORS middleware allows credentials and matches "*"
// anywhere in an entry as a wildcard, so a pattern such as "https://*" would
// admit every HTTPS site. Production entries must therefore name one origin.
func exactOriginProblem(origin string) string {
	if strings.Contains(origin, "*") {
		return "wildcards are not allowed"
	}
	if strings.Contains(origin, "#") {
		// url.Parse drops an empty fragment ("https://host#"), so check the text.
		return "path (including a trailing slash), query and fragment are not allowed"
	}
	u, err := url.Parse(origin)
	if err != nil {
		return "it does not parse as a URL"
	}
	switch {
	case u.Scheme != "http" && u.Scheme != "https":
		return "the scheme must be http or https"
	case u.Host == "" || u.Hostname() == "":
		return "the host is missing"
	case u.User != nil:
		return "user info is not allowed"
	case u.Path != "" || u.RawPath != "" || u.RawQuery != "" || u.Fragment != "" || u.ForceQuery:
		// A root "/" is rejected too: browsers send Origin without it, and the
		// CORS allowlist compares the configured string as written, so
		// "https://dashboard.example/" would never match.
		return "path (including a trailing slash), query and fragment are not allowed"
	case (u.Scheme == "https" && u.Port() == "443") || (u.Scheme == "http" && u.Port() == "80"):
		// Browsers omit the scheme's default port from Origin, and the
		// allowlist compares strings as written, so this could never match.
		return "the scheme's default port (:443 for https, :80 for http) must be omitted"
	}
	// The remaining forms could never equal a browser's serialized Origin
	// either: browsers send a canonical decimal port and an ASCII (punycode)
	// host without a trailing dot.
	if problem := canonicalHostPortProblem(u); problem != "" {
		return problem
	}
	return ""
}

// canonicalHostPortProblem reports why u's host and port are not in the
// canonical form a client sends: an empty or non-canonical port, a trailing
// dot, or a host that is not ASCII.
func canonicalHostPortProblem(u *url.URL) string {
	switch host := u.Hostname(); {
	case strings.HasSuffix(u.Host, ":"):
		return "the port is empty"
	case u.Port() != "" && !isPort(u.Port()):
		return "the port must be a decimal number between 1 and 65535 without leading zeros"
	case strings.HasSuffix(host, "."):
		return "the host must not end with a dot"
	case !isASCII(host):
		return "the host must be ASCII; use the punycode (xn--) form of an internationalized name"
	}
	return ""
}

func isASCII(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] > 0x7e || s[i] < 0x21 {
			return false
		}
	}
	return true
}

// validateServingTLS fails startup on any half-configured or unusable serving
// certificate. Without this the server silently falls back to plaintext HTTP.
func validateServingTLS(tlsFiles TLSFiles, add func(string, ...any)) {
	hasCert := tlsFiles.CertFile != ""
	hasKey := tlsFiles.KeyFile != ""

	switch {
	case !hasCert && !hasKey:
		return
	case hasCert != hasKey:
		missing, present := "KEY_FILE/--key-file", "CERT_FILE/--cert-file"
		if !hasCert {
			missing, present = present, missing
		}
		add("%s is set but %s is not; TLS needs both, and a partial pair must not fall back to plaintext HTTP", present, missing)
		return
	}

	// Problems name the setting, never its value: a PEM block pasted where a
	// path belongs would otherwise land in the log. The files are read here
	// rather than through tls.LoadX509KeyPair, whose errors quote the path.
	certPEM, certErr := os.ReadFile(tlsFiles.CertFile)
	keyPEM, keyErr := os.ReadFile(tlsFiles.KeyFile)
	if certErr != nil || keyErr != nil {
		for _, f := range []struct {
			setting string
			err     error
		}{{"CERT_FILE/--cert-file", certErr}, {"KEY_FILE/--key-file", keyErr}} {
			if f.err != nil {
				add("%s (value omitted) could not be read: %s", f.setting, FileProblem(f.err))
			}
		}
		return
	}
	pair, err := tls.X509KeyPair(certPEM, keyPEM)
	if err != nil {
		add("the serving pair from CERT_FILE/--cert-file and KEY_FILE/--key-file (values omitted) could not be loaded: %s",
			sanitizeTLSError(err))
		return
	}

	// A pair that parses and matches can still be unusable: verifying clients
	// reject a leaf outside its validity window. Only the window is checked
	// here, not trust: a private or service CA is legitimate.
	leaf, err := x509.ParseCertificate(pair.Certificate[0])
	if err != nil {
		add("the serving certificate from CERT_FILE/--cert-file (value omitted) could not be parsed: %s", sanitizeTLSError(err))
		return
	}
	if problem := validityProblem(leaf, time.Now()); problem != "" {
		add("the serving certificate from CERT_FILE/--cert-file (value omitted) %s; rotate it before starting", problem)
	}
}

// validityProblem reports why leaf is not usable at now, or "" when it is.
func validityProblem(leaf *x509.Certificate, now time.Time) string {
	switch {
	case now.Before(leaf.NotBefore):
		return "is not valid yet (NotBefore " + leaf.NotBefore.UTC().Format(time.RFC3339) + ")"
	case now.After(leaf.NotAfter):
		return "has expired (NotAfter " + leaf.NotAfter.UTC().Format(time.RFC3339) + ")"
	}
	return ""
}

// validateTrustBundles fails startup when the operator explicitly supplied CA
// bundle paths and none of them yielded a usable certificate. Falling back to
// the system pool in that case is a silent trust downgrade.
func (c EnvConfig) validateTrustBundles(add func(string, ...any)) {
	if !c.BundlePathsRequired {
		return
	}

	// An explicit but empty value ("", " ", ",,") parses to no paths at all.
	// Returning early there would let the requested trust bundle silently
	// become the system pool, which is the same downgrade this check exists to
	// prevent for unreadable files.
	if len(c.BundlePaths) == 0 {
		add("BUNDLE_PATHS was set explicitly but contains no usable path; unset it to use the default trust bundle set, or supply at least one readable PEM bundle")
		return
	}

	// Entries are reported by position, never by value: a PEM block pasted
	// where a path belongs would otherwise land in the log.
	var unusable []string
	var loadedAny bool
	for i, path := range c.BundlePaths {
		path = strings.TrimSpace(path)
		if path == "" {
			continue
		}
		pem, err := os.ReadFile(path)
		if err != nil {
			unusable = append(unusable, fmt.Sprintf("entry %d (%s)", i+1, FileProblem(err)))
			continue
		}
		if !x509.NewCertPool().AppendCertsFromPEM(pem) {
			unusable = append(unusable, fmt.Sprintf("entry %d (no PEM certificates)", i+1))
			continue
		}
		loadedAny = true
	}

	if !loadedAny {
		add("BUNDLE_PATHS was set explicitly but no CA certificates could be loaded from it (1-based entries, values omitted): %s",
			strings.Join(unusable, ", "))
	}
}

// FileProblem describes a file read failure without the path, which
// os.PathError would otherwise quote.
func FileProblem(err error) string {
	switch {
	case errors.Is(err, fs.ErrNotExist):
		return "not found"
	case errors.Is(err, fs.ErrPermission):
		return "permission denied"
	default:
		return "unreadable"
	}
}

// sanitizeTLSError keeps the actionable part of a key-pair failure without
// echoing file contents back into the log.
func sanitizeTLSError(err error) string {
	msg := err.Error()
	if idx := strings.Index(msg, "-----BEGIN"); idx >= 0 {
		return strings.TrimSpace(msg[:idx]) + "(PEM content omitted)"
	}
	return msg
}
