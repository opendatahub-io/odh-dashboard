package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
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
	coreBffEntryName = "coreBff"
	clusterDNSFmt    = "%s.%s.svc.cluster.local:%d"
	schemeHostFmt    = "%s://%s"
)

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
}

type moduleProxyHandler struct {
	path    string
	handler http.Handler
}

// parseFederationConfig reads and deserializes the federation-config JSON file.
func parseFederationConfig(filePath string) ([]moduleFederationEntry, error) {
	if filePath == "" {
		return nil, nil
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read federation config %s: %w", filePath, err)
	}

	var entries []moduleFederationEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, fmt.Errorf("failed to parse federation config %s: %w", filePath, err)
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
func validateProxyEntries(entries []normalizedProxyEntry) error {
	seen := make(map[string]string)
	for _, e := range entries {
		if prev, ok := seen[e.service.Path]; ok {
			return fmt.Errorf("duplicate proxy path %s in entries %s and %s", e.service.Path, prev, e.entryName)
		}
		seen[e.service.Path] = e.entryName
	}

	for _, e := range entries {
		pathWithSlash := e.service.Path + "/"
		prefixedPath := PathPrefix + pathWithSlash

		for _, reserved := range reservedBFFPrefixes {
			if strings.HasPrefix(pathWithSlash, reserved) || strings.HasPrefix(reserved, pathWithSlash) {
				return fmt.Errorf("module proxy path %s in entry %s collides with reserved BFF route %s", e.service.Path, e.entryName, reserved)
			}
			if strings.HasPrefix(prefixedPath, reserved) || strings.HasPrefix(reserved, prefixedPath) {
				return fmt.Errorf("module proxy path %s in entry %s collides with reserved BFF route %s (via %s prefix)", e.service.Path, e.entryName, reserved, PathPrefix)
			}
		}
	}

	for _, e := range entries {
		if e.service.Service.Name == "" {
			return fmt.Errorf("entry %s has empty service name", e.entryName)
		}
		if e.service.Service.Namespace == "" {
			return fmt.Errorf("entry %s has empty service namespace", e.entryName)
		}
		if e.service.Service.Port == 0 {
			return fmt.Errorf("entry %s has zero service port", e.entryName)
		}
	}

	return nil
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

	if err := validateProxyEntries(normalized); err != nil {
		return err
	}

	var handlers []moduleProxyHandler
	for _, entry := range normalized {
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
			return fmt.Errorf("failed to parse target URL for entry %s: %w", entry.entryName, err)
		}

		allowHTTP := !entry.service.TLS || app.config.DevMode || app.config.MockK8Client
		insecureSkipVerify := app.config.InsecureSkipVerify && (app.config.DevMode || app.config.MockK8Client)

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
			StripHeaders:       proxy.SensitiveIngressHeaders(app.config.AuthTokenHeader),
			ModifyResponse:     ssrf.NewRedirectValidator(app.logger),
			SSRFValidateTarget: true,
			SSRFAllowedHosts:   []string{targetURL.Hostname()},
			Logger:             app.logger,
		}

		if entry.service.Authorize {
			cfg.AuthHeaderFn = func(r *http.Request) string {
				identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
				if !ok || identity == nil {
					return ""
				}
				return k8s.BearerTokenPrefix + identity.ResolveToken(app.devFallbackToken)
			}
		}

		if len(entry.service.Headers) > 0 {
			headers := entry.service.Headers
			cfg.SetOutboundHeadersFn = func(_ *http.Request, outH http.Header) {
				for k, v := range headers {
					outH.Set(k, v)
				}
			}
		}

		rp, err := proxy.NewReverseProxy(cfg)
		if err != nil {
			return fmt.Errorf("failed to create module proxy for entry %s path %s: %w", entry.entryName, proxyPath, err)
		}

		handlers = append(handlers, moduleProxyHandler{
			path:    proxyPath,
			handler: rp,
		})
	}

	app.moduleProxies = handlers
	return nil
}

func (app *App) registerModuleProxies(mux *http.ServeMux) {
	for _, mp := range app.moduleProxies {
		mux.Handle(mp.path+"/", mp.handler)
		mux.Handle(PathPrefix+mp.path+"/", http.StripPrefix(PathPrefix, mp.handler))
	}
}
