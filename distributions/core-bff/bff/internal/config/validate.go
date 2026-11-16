package config

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"os"
	"strings"
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
		add("DEPLOYMENT_MODE/--deployment-mode is %q; it must be %q or %q",
			c.DeploymentMode, DeploymentModeFederated, DeploymentModeStandalone)
	}

	switch c.PlatformType {
	case PlatformOpenShift, PlatformXKS, "":
	default:
		add("ODH_PLATFORM_TYPE/--platform-type is %q; it must be %q, %q, or empty to auto-detect",
			c.PlatformType, PlatformOpenShift, PlatformXKS)
	}

	switch c.AdmissionMode {
	case AdmissionModeAuthResource, AdmissionModeAuthenticated, "":
	default:
		add("ADMISSION_MODE/--admission-mode is %q; it must be %q, %q, or empty to resolve from the platform",
			c.AdmissionMode, AdmissionModeAuthResource, AdmissionModeAuthenticated)
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
		add("AUTH_METHOD/--auth-method is %q; it must be %q or %q",
			c.AuthMethod, AuthMethodDisabled, AuthMethodUser)
	}

	if c.AuthMethod == AuthMethodUser && strings.TrimSpace(c.AuthTokenHeader) == "" {
		add("AUTH_TOKEN_HEADER/--auth-token-header is empty while AUTH_METHOD=%s; a token header is required",
			AuthMethodUser)
	}
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

	for _, origin := range c.AllowedOrigins {
		if strings.TrimSpace(origin) == "*" {
			add("ALLOWED_ORIGINS contains \"*\" while CORS responses allow credentials; list the exact dashboard origins instead")
			break
		}
	}
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

	if _, err := tls.LoadX509KeyPair(tlsFiles.CertFile, tlsFiles.KeyFile); err != nil {
		add("the serving certificate and key could not be loaded (cert=%s key=%s): %s",
			tlsFiles.CertFile, tlsFiles.KeyFile, sanitizeTLSError(err))
	}
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
