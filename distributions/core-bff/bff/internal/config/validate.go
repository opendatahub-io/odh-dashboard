package config

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"
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
// production deployment. Any development or mock affordance opts out, which is
// what makes the production-only rejections below safe to apply.
func (c EnvConfig) IsProductionProfile() bool {
	return !c.DevMode && !c.MockK8Client && !c.MockHTTPClient && !c.MockBFFClients
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

	if strings.TrimSpace(c.StaticAssetsDir) == "" {
		add("STATIC_ASSETS_DIR/--static-assets-dir is empty; the SPA asset root is required")
	}
}

func (c EnvConfig) validateAuth(add func(string, ...any)) {
	switch c.AuthMethod {
	case AuthMethodDisabled, AuthMethodUser:
	default:
		add("AUTH_METHOD/--auth-method is not a supported value (value omitted); it must be %q or %q",
			AuthMethodDisabled, AuthMethodUser)
	}

	if c.AuthMethod == AuthMethodUser && len(c.AuthTokenHeaders) == 0 && strings.TrimSpace(c.AuthTokenHeader) == "" {
		add("AUTH_TOKEN_HEADER/--auth-token-header is empty while AUTH_METHOD=%s; a token header is required",
			AuthMethodUser)
	}

	c.validateAuthTokenHeaders(add)
}

// credentialHeaderForbidden lists headers that must never be read as the caller
// credential: they carry other identity or session material that the edge, not
// the caller, is supposed to control. Prefix entries end in "-".
var credentialHeaderForbidden = []string{
	"cookie", "set-cookie", "proxy-authorization", "host",
	"impersonate-user", "impersonate-group", "impersonate-uid", "impersonate-extra-",
	"x-remote-",
	"x-forwarded-user", "x-forwarded-groups", "x-forwarded-email", "x-forwarded-preferred-username",
}

// validateAuthTokenHeaders checks the caller-credential header settings.
//
// AUTH_TOKEN_HEADERS, when set, replaces the single-header pair, so a prefix
// set alongside it is ambiguous (it would apply to one header and not the
// other) and is rejected rather than guessed at. Otherwise the legacy
// AUTH_TOKEN_HEADER gets the same name and forbidden-header checks, so an
// identity or session header cannot become the credential through either
// setting.
//
// Rejected entries are identified by position, never echoed: a token pasted
// into the setting by mistake is a valid header token and must not reach the
// startup log, which records only whether the legacy header is set and how
// many list entries there are. A forbidden header is reported by the credentialHeaderForbidden
// entry it matches (for a prefix entry, the prefix alone).
func (c EnvConfig) validateAuthTokenHeaders(add func(string, ...any)) {
	// The legacy header is checked in both modes: module proxies still forward
	// it, so it must never name an identity or session header.
	if strings.TrimSpace(c.AuthTokenHeader) != "" {
		validateCredentialHeaderName(add, "AUTH_TOKEN_HEADER/--auth-token-header", c.AuthTokenHeader)
	}
	if len(c.AuthTokenHeaders) == 0 {
		return
	}
	if c.AuthTokenPrefix != "" {
		add("AUTH_TOKEN_PREFIX/--auth-token-prefix is set together with AUTH_TOKEN_HEADERS/--auth-token-headers; the list defines its own parsing (Authorization uses the Bearer scheme, other headers carry the bare token), so unset the prefix")
	}

	seen := map[string]bool{}
	for i, raw := range c.AuthTokenHeaders {
		setting := fmt.Sprintf("AUTH_TOKEN_HEADERS/--auth-token-headers entry %d", i+1)
		if !validateCredentialHeaderName(add, setting, raw) {
			continue
		}
		lower := strings.ToLower(strings.TrimSpace(raw))
		if seen[lower] {
			add("%s repeats an earlier entry (value omitted); list each header once", setting)
			continue
		}
		seen[lower] = true
	}
}

// validateCredentialHeaderName reports problems with one credential header name
// under setting, and returns whether the name is a usable header name.
func validateCredentialHeaderName(add func(string, ...any), setting, raw string) bool {
	name := strings.TrimSpace(raw)
	if !isHTTPToken(name) {
		add("%s is not a valid HTTP header name (value omitted)", setting)
		return false
	}
	if f, ok := forbiddenCredentialHeader(strings.ToLower(name)); ok {
		if strings.HasSuffix(f, "-") {
			add("%s is an %s* header (rest of the value omitted), an identity or session header that cannot carry the caller token", setting, f)
		} else {
			add("%s is %s, an identity or session header that cannot carry the caller token", setting, f)
		}
	}
	return true
}

// forbiddenCredentialHeader returns the credentialHeaderForbidden entry lower
// matches. Only that fixed entry is ever reported, never the configured text,
// so a prefix match cannot echo an operator-supplied suffix.
func forbiddenCredentialHeader(lower string) (string, bool) {
	for _, f := range credentialHeaderForbidden {
		if lower == f || (strings.HasSuffix(f, "-") && strings.HasPrefix(lower, f)) {
			return f, true
		}
	}
	return "", false
}

// isHTTPToken reports whether s is an RFC 9110 token, the grammar of a header name.
func isHTTPToken(s string) bool {
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
		case strings.ContainsRune("!#$%&'*+-.^_`|~", r):
		default:
			return false
		}
	}
	return s != ""
}

// validateProductionProfile rejects development, mock, disabled-authentication
// and insecure-transport settings on a deployment that is not opted into a
// development profile. Each message names the setting and the way out.
func (c EnvConfig) validateProductionProfile(add func(string, ...any)) {
	if !c.IsProductionProfile() {
		return
	}

	if c.AuthMethod == AuthMethodDisabled {
		add("AUTH_METHOD=%s is not supported in a production profile; use %s, or set DEV_MODE=true for local development",
			AuthMethodDisabled, AuthMethodUser)
	}

	if c.InsecureSkipVerify {
		add("INSECURE_SKIP_VERIFY=true is not supported in a production profile; supply the upstream CA through BUNDLE_PATHS instead")
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

// exactOriginProblem reports why origin is not a single exact HTTP(S) origin,
// or "" when it is. The CORS middleware allows credentials and matches "*"
// anywhere in an entry as a wildcard, so a pattern such as "https://*" would
// admit every HTTPS site. Production entries must therefore name one origin.
func exactOriginProblem(origin string) string {
	if strings.Contains(origin, "*") {
		return "wildcards are not allowed"
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
	}
	return ""
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

	pair, err := tls.LoadX509KeyPair(tlsFiles.CertFile, tlsFiles.KeyFile)
	if err != nil {
		add("the serving certificate and key could not be loaded (cert=%s key=%s): %s",
			tlsFiles.CertFile, tlsFiles.KeyFile, sanitizeTLSError(err))
		return
	}

	// A pair that parses and matches can still be unusable: verifying clients
	// reject a leaf outside its validity window. Only the window is checked
	// here, not trust: a private or service CA is legitimate.
	leaf, err := x509.ParseCertificate(pair.Certificate[0])
	if err != nil {
		add("the serving certificate (cert=%s) could not be parsed: %s", tlsFiles.CertFile, sanitizeTLSError(err))
		return
	}
	if problem := validityProblem(leaf, time.Now()); problem != "" {
		add("the serving certificate (cert=%s) %s; rotate it before starting", tlsFiles.CertFile, problem)
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

	var unusable []string
	var loadedAny bool
	for _, path := range c.BundlePaths {
		path = strings.TrimSpace(path)
		if path == "" {
			continue
		}
		pem, err := os.ReadFile(path)
		if err != nil {
			unusable = append(unusable, fmt.Sprintf("%s (%s)", path, classifyFileError(err)))
			continue
		}
		if !x509.NewCertPool().AppendCertsFromPEM(pem) {
			unusable = append(unusable, fmt.Sprintf("%s (no PEM certificates)", path))
			continue
		}
		loadedAny = true
	}

	if !loadedAny {
		add("BUNDLE_PATHS was set explicitly but no CA certificates could be loaded from it: %s",
			strings.Join(unusable, ", "))
	}
}

func classifyFileError(err error) string {
	switch {
	case errors.Is(err, os.ErrNotExist):
		return "not found"
	case errors.Is(err, os.ErrPermission):
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
