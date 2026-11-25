package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"slices"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/ssrf"
)

// Types compatible with dashboard-operator/internal/controller/module_deploy.go:42-69.

type moduleProxyRoute struct {
	Path        string `json:"path"`
	PathRewrite string `json:"pathRewrite"`
}

type moduleServiceRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Port      int32  `json:"port"`
}

type moduleFederationEntry struct {
	Name         string                    `json:"name"`
	RemoteEntry  string                    `json:"remoteEntry,omitempty"`
	Authorize    bool                      `json:"authorize"`
	TLS          bool                      `json:"tls"`
	Proxy        []moduleProxyRoute        `json:"proxy,omitempty"`
	Service      *moduleServiceRef         `json:"service,omitempty"`
	ProxyService []moduleProxyServiceEntry `json:"proxyService,omitempty"`
}

type moduleProxyServiceEntry struct {
	Authorize   bool              `json:"authorize"`
	Path        string            `json:"path"`
	PathRewrite string            `json:"pathRewrite"`
	TLS         bool              `json:"tls"`
	Service     moduleServiceRef  `json:"service"`
	Headers     map[string]string `json:"headers,omitempty"`
}

const (
	coreBffEntryName       = "coreBff"
	clusterDNSFmt          = "%s.%s.svc.cluster.local:%d"
	schemeHostFmt          = "%s://%s"
	maxFederationConfigLen = 1_048_576 // 1 MiB
)

// rfc1123Label matches a valid RFC 1123 DNS label: lowercase alphanumeric and hyphens, 1-63 chars.
var rfc1123Label = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`)

// reservedBFFPrefixes are path prefixes already registered on the BFF mux.
// Module proxy paths must not collide with these to prevent http.ServeMux panics.
// Update this list when new top-level BFF route prefixes are added.
var reservedBFFPrefixes = []string{
	APIPathPrefix + "/",
	proxy.K8sProxyPrefix,
	proxy.WssProxyPrefix,
	ModelServingProxyPrefix,
	HealthCheckPath,
	OpenAPIPath,
	SwaggerUIPath,
	PathPrefix + "/",
}

type moduleProxyHandler struct {
	path    string
	handler http.Handler
}

// parseFederationConfig reads and deserializes the federation-config JSON file.
// Failures name MF_REMOTES_CONFIG, never its value or the file contents: the
// path is operator input, and os and encoding/json errors would quote it or
// the offending bytes.
func parseFederationConfig(filePath string) ([]moduleFederationEntry, error) {
	if filePath == "" {
		return nil, nil
	}
	const setting = "MF_REMOTES_CONFIG/--mf-remotes-config (value omitted)"

	f, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("%s could not be read: %s", setting, config.FileProblem(err))
	}
	defer f.Close()

	limited := io.LimitReader(f, maxFederationConfigLen+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return nil, fmt.Errorf("%s could not be read: %s", setting, config.FileProblem(err))
	}
	if len(data) > maxFederationConfigLen {
		return nil, fmt.Errorf("%s exceeds the maximum size of %d bytes", setting, maxFederationConfigLen)
	}

	var entries []moduleFederationEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		var syntaxErr *json.SyntaxError
		var typeErr *json.UnmarshalTypeError
		switch {
		case errors.As(err, &syntaxErr):
			return nil, fmt.Errorf("%s is not valid JSON (byte offset %d)", setting, syntaxErr.Offset)
		case errors.As(err, &typeErr):
			return nil, fmt.Errorf("%s does not match the federation-config schema (field %q)", setting, typeErr.Field)
		default:
			return nil, fmt.Errorf("%s could not be parsed", setting)
		}
	}

	return entries, nil
}

type normalizedProxyEntry struct {
	entryName string
	service   moduleProxyServiceEntry
}

// normalizeFederationEntries converts old-format and new-format entries into a flat list of proxy routes.
func normalizeFederationEntries(entries []moduleFederationEntry) ([]normalizedProxyEntry, error) {
	var result []normalizedProxyEntry

	for _, entry := range entries {
		if entry.Name == coreBffEntryName {
			continue
		}

		if len(entry.ProxyService) > 0 {
			for _, ps := range entry.ProxyService {
				result = append(result, normalizedProxyEntry{
					entryName: entry.Name,
					service:   ps,
				})
			}
			continue
		}

		if len(entry.Proxy) == 0 {
			continue
		}

		if entry.Service == nil {
			return nil, fmt.Errorf("entry %s has proxy routes but no service definition", entry.Name)
		}

		for _, p := range entry.Proxy {
			result = append(result, normalizedProxyEntry{
				entryName: entry.Name,
				service: moduleProxyServiceEntry{
					Authorize:   entry.Authorize,
					Path:        p.Path,
					PathRewrite: p.PathRewrite,
					TLS:         entry.TLS,
					Service: moduleServiceRef{
						Name:      entry.Service.Name,
						Namespace: entry.Service.Namespace,
						Port:      entry.Service.Port,
					},
				},
			})
		}
	}

	return result, nil
}

// validateProxyEntries rejects duplicate paths, reserved-route collisions, and invalid service refs.
func validateProxyEntries(entries []normalizedProxyEntry, authTokenHeader string) error {
	if err := validateProxyPaths(entries); err != nil {
		return err
	}
	return validateServiceRefs(entries, authTokenHeader)
}

func validateProxyPaths(entries []normalizedProxyEntry) error {
	for _, e := range entries {
		if e.service.Path == "" {
			return fmt.Errorf("entry %s has empty proxy path", e.entryName)
		}
		if e.service.Path == "/" {
			return fmt.Errorf("entry %s uses root path / which conflicts with the SPA catch-all", e.entryName)
		}
		if !strings.HasPrefix(e.service.Path, "/") {
			return fmt.Errorf("entry %s has a non-rooted proxy path (value omitted; must start with /)", e.entryName)
		}
		if strings.HasSuffix(e.service.Path, "/") {
			return fmt.Errorf("entry %s has a trailing slash in its proxy path (value omitted; it is appended automatically)", e.entryName)
		}
		if strings.ContainsAny(e.service.Path, "{}") {
			return fmt.Errorf("entry %s has http.ServeMux wildcard syntax in its proxy path (value omitted)", e.entryName)
		}
	}

	seen := make(map[string]string)
	for _, e := range entries {
		if prev, ok := seen[e.service.Path]; ok {
			return fmt.Errorf("duplicate proxy path %s in entries %s and %s", e.service.Path, prev, e.entryName)
		}
		seen[e.service.Path] = e.entryName
	}

	for _, e := range entries {
		prefixedPath := PathPrefix + e.service.Path

		for _, reserved := range reservedBFFPrefixes {
			if proxyPathsOverlap(e.service.Path, reserved) {
				return fmt.Errorf("module proxy path %s in entry %s collides with reserved BFF route %s", e.service.Path, e.entryName, reserved)
			}
			if reserved != PathPrefix+"/" && strings.TrimSuffix(prefixedPath, "/") == strings.TrimSuffix(reserved, "/") {
				return fmt.Errorf("module proxy path %s in entry %s collides with reserved BFF route %s (via %s prefix)", e.service.Path, e.entryName, reserved, PathPrefix)
			}
		}
	}

	return nil
}

// proxyPathsOverlap reports whether two proxy paths share a complete path segment.
func proxyPathsOverlap(a, b string) bool {
	a = strings.TrimSuffix(a, "/")
	b = strings.TrimSuffix(b, "/")

	return a == b || strings.HasPrefix(a, b+"/") || strings.HasPrefix(b, a+"/")
}

// Entry errors name the entry and the field that failed, never the rejected
// value: the federation config is free-form operator input.
func validateServiceRefs(entries []normalizedProxyEntry, authTokenHeader string) error {
	for _, e := range entries {
		if e.service.Service.Name == "" {
			return fmt.Errorf("entry %s has empty service name", e.entryName)
		}
		if !rfc1123Label.MatchString(e.service.Service.Name) {
			return fmt.Errorf("entry %s has an invalid service name (value omitted; must be a valid RFC 1123 label)", e.entryName)
		}
		if e.service.Service.Namespace == "" {
			return fmt.Errorf("entry %s has empty service namespace", e.entryName)
		}
		if !rfc1123Label.MatchString(e.service.Service.Namespace) {
			return fmt.Errorf("entry %s has an invalid service namespace (value omitted; must be a valid RFC 1123 label)", e.entryName)
		}
		if e.service.Service.Port <= 0 || e.service.Service.Port > 65535 {
			return fmt.Errorf("entry %s has an invalid service port (value omitted; must be 1-65535)", e.entryName)
		}

		if e.service.Authorize {
			for k := range e.service.Headers {
				if reserved, ok := reservedCredentialHeader(k, authTokenHeader); ok {
					return fmt.Errorf("entry %s sets a custom %s header while authorize is enabled; credential headers carry only the server-resolved caller token", e.entryName, reserved)
				}
			}
		}
	}

	return nil
}

// reservedCredentialHeaders are the headers that carry the caller credential to
// an authorized module: Authorization and X-Forwarded-Access-Token always,
// whichever header ingress is configured to read, plus the configured one.
// Only the server-resolved token may appear in them.
func reservedCredentialHeaders(authTokenHeader string) []string {
	headers := []string{constants.HeaderAuthorization, constants.HeaderForwardedToken}
	if authTokenHeader != "" && !slices.ContainsFunc(headers, func(h string) bool { return strings.EqualFold(h, authTokenHeader) }) {
		headers = append(headers, authTokenHeader)
	}
	return headers
}

// reservedCredentialHeader reports whether name is a reserved credential
// header, returning its canonical spelling.
func reservedCredentialHeader(name, authTokenHeader string) (string, bool) {
	for _, h := range reservedCredentialHeaders(strings.TrimSpace(authTokenHeader)) {
		if strings.EqualFold(strings.TrimSpace(name), h) {
			return http.CanonicalHeaderKey(h), true
		}
	}
	return "", false
}

// buildModuleProxyConfig creates a ProxyConfig for a normalized proxy entry.
func (app *App) buildModuleProxyConfig(entry normalizedProxyEntry, targetURL *url.URL, allowHTTP, insecureSkipVerify, ssrfValidate bool) proxy.ProxyConfig {
	proxyPath := entry.service.Path
	pathRewrite := entry.service.PathRewrite

	cfg := proxy.ProxyConfig{
		TargetURL:          targetURL,
		RootCAs:            app.rootCAs,
		InsecureSkipVerify: insecureSkipVerify,
		AllowHTTP:          allowHTTP,
		PathRewriteFn: func(r *http.Request) string {
			return pathRewrite + strings.TrimPrefix(r.URL.Path, proxyPath)
		},
		StripHeaders: proxy.SensitiveIngressHeaders(app.config.AuthTokenHeader),
		// SSRF redirect check, then force no-store (Node rewriteNoStoreCacheHeaders parity).
		ModifyResponse:     chainModifyResponse(ssrf.NewRedirectValidator(app.logger), forceNoStoreCacheHeaders),
		SSRFValidateTarget: ssrfValidate,
		Logger:             app.logger,
	}

	if ssrfValidate {
		cfg.SSRFAllowedHosts = []string{targetURL.Hostname()}
	}

	customHeaders := entry.service.Headers

	if entry.service.Authorize {
		cfg.AuthHeaderFn = func(r *http.Request) string {
			identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
			if !ok || identity == nil {
				return ""
			}
			return k8s.BearerHeader(identity.ResolveToken(app.devFallbackToken))
		}

		// Re-inject the validated user token in every credential header.
		// mod-arch BFFs (maas, gen-ai, ...) read x-forwarded-access-token, not
		// the Kubernetes-style Authorization header that AuthHeaderFn sets, and
		// the configured ingress header may be a third one. The inbound values
		// are stripped by SensitiveIngressHeaders (StripHeaders) so a client
		// cannot spoof them; SetOutboundHeadersFn runs after stripping (see
		// proxy.rewriteFunc). Static headers are applied first, then every
		// reserved credential header is cleared, so only the server-resolved
		// token can appear there. A tokenless identity (a certificate-only
		// DEV_MODE fallback, or a mock without a token) sends none of them.
		//
		// Authorization keeps the Bearer prefix; other headers receive the raw
		// token.
		authTokenHeader := strings.TrimSpace(app.config.AuthTokenHeader)
		reserved := reservedCredentialHeaders(authTokenHeader)
		cfg.SetOutboundHeadersFn = func(r *http.Request, outH http.Header) {
			for k, v := range customHeaders {
				outH.Set(k, v)
			}
			for _, h := range reserved {
				outH.Del(h)
			}
			identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
			if !ok || identity == nil {
				return
			}
			token := identity.ResolveToken(app.devFallbackToken)
			if token == "" {
				return
			}
			outH.Set(constants.HeaderAuthorization, k8s.BearerTokenPrefix+token)
			// With no ingress header configured only Authorization carries the
			// token (no raw-token injection); otherwise every reserved header
			// does, so a module reading any convention sees the same caller.
			if authTokenHeader == "" {
				return
			}
			for _, h := range reserved {
				if !strings.EqualFold(h, constants.HeaderAuthorization) {
					outH.Set(h, token)
				}
			}
		}
	} else if len(customHeaders) > 0 {
		cfg.SetOutboundHeadersFn = func(_ *http.Request, outH http.Header) {
			for k, v := range customHeaders {
				outH.Set(k, v)
			}
		}
	}

	return cfg
}

func (app *App) initModuleProxies() error {
	entries, err := parseFederationConfig(app.config.MFRemotesConfig)
	if err != nil {
		return err
	}
	if entries == nil {
		return nil
	}

	normalized, err := normalizeFederationEntries(entries)
	if err != nil {
		return err
	}
	if len(normalized) == 0 {
		return nil
	}

	if err := validateProxyEntries(normalized, app.config.AuthTokenHeader); err != nil {
		return err
	}

	handlers, err := app.buildModuleProxyHandlers(normalized)
	if err != nil {
		return err
	}

	app.moduleProxies = handlers
	return nil
}

func (app *App) buildModuleProxyHandlers(entries []normalizedProxyEntry) ([]moduleProxyHandler, error) {
	var handlers []moduleProxyHandler
	for _, entry := range entries {
		scheme := "https"
		if !entry.service.TLS {
			scheme = "http"
		}
		targetHost := fmt.Sprintf(clusterDNSFmt,
			entry.service.Service.Name,
			entry.service.Service.Namespace,
			entry.service.Service.Port,
		)
		targetURL, err := url.Parse(fmt.Sprintf(schemeHostFmt, scheme, targetHost))
		if err != nil {
			return nil, fmt.Errorf("failed to parse target URL for entry %s: %w", entry.entryName, err)
		}

		allowHTTP := !entry.service.TLS || app.config.DevMode
		insecureSkipVerify := app.config.SkipsTLSVerification()

		cfg := app.buildModuleProxyConfig(entry, targetURL, allowHTTP, insecureSkipVerify, true)

		rp, err := proxy.NewReverseProxy(cfg)
		if err != nil {
			return nil, fmt.Errorf("failed to create module proxy for entry %s path %s: %w", entry.entryName, entry.service.Path, err)
		}

		handlers = append(handlers, moduleProxyHandler{
			path:    entry.service.Path,
			handler: rp,
		})
	}
	return handlers, nil
}

func (app *App) registerModuleProxies(mux *http.ServeMux) {
	for _, mp := range app.moduleProxies {
		mux.Handle(mp.path+"/", mp.handler)
		mux.Handle(PathPrefix+mp.path+"/", http.StripPrefix(PathPrefix, mp.handler))
	}
}
