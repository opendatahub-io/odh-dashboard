package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseFederationConfig(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(t *testing.T) string
		wantNil   bool
		wantCount int
		wantErr   bool
		errSubstr string
	}{
		{
			name: "empty path returns nil",
			setup: func(t *testing.T) string {
				return ""
			},
			wantNil: true,
		},
		{
			name: "non-existent file returns error",
			setup: func(t *testing.T) string {
				return "/nonexistent/federation-config.json"
			},
			wantErr:   true,
			errSubstr: "/nonexistent/federation-config.json",
		},
		{
			name: "malformed JSON returns error",
			setup: func(t *testing.T) string {
				dir := t.TempDir()
				p := filepath.Join(dir, "bad.json")
				require.NoError(t, os.WriteFile(p, []byte(`{not valid`), 0600))
				return p
			},
			wantErr:   true,
			errSubstr: "failed to parse federation config",
		},
		{
			name: "empty JSON array succeeds",
			setup: func(t *testing.T) string {
				dir := t.TempDir()
				p := filepath.Join(dir, "empty.json")
				require.NoError(t, os.WriteFile(p, []byte(`[]`), 0600))
				return p
			},
			wantCount: 0,
		},
		{
			name: "file exceeding max size returns error",
			setup: func(t *testing.T) string {
				dir := t.TempDir()
				p := filepath.Join(dir, "large.json")
				data := make([]byte, maxFederationConfigLen+1)
				for i := range data {
					data[i] = 'x'
				}
				require.NoError(t, os.WriteFile(p, data, 0600))
				return p
			},
			wantErr:   true,
			errSubstr: "exceeds maximum size",
		},
		{
			name: "valid JSON with multiple entries",
			setup: func(t *testing.T) string {
				entries := []moduleFederationEntry{
					{
						Name:      "genAi",
						Authorize: true,
						TLS:       true,
						ProxyService: []moduleProxyServiceEntry{
							{
								Authorize:   true,
								Path:        "/gen-ai/api",
								PathRewrite: "/api",
								TLS:         true,
								Service:     moduleServiceRef{Name: "gen-ai-bff", Namespace: "redhat-ods-apps", Port: 8443},
							},
						},
					},
					{
						Name:      "maas",
						Authorize: true,
						TLS:       true,
						ProxyService: []moduleProxyServiceEntry{
							{
								Authorize:   true,
								Path:        "/maas/api",
								PathRewrite: "/api",
								TLS:         true,
								Service:     moduleServiceRef{Name: "maas-bff", Namespace: "redhat-ods-apps", Port: 8443},
							},
						},
					},
				}
				data, err := json.Marshal(entries)
				require.NoError(t, err)
				dir := t.TempDir()
				p := filepath.Join(dir, "config.json")
				require.NoError(t, os.WriteFile(p, data, 0600))
				return p
			},
			wantCount: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := tt.setup(t)
			entries, err := parseFederationConfig(path)
			if tt.wantErr {
				require.Error(t, err)
				if tt.errSubstr != "" {
					assert.Contains(t, err.Error(), tt.errSubstr)
				}
				return
			}
			require.NoError(t, err)
			if tt.wantNil {
				assert.Nil(t, entries)
				return
			}
			require.Len(t, entries, tt.wantCount)
		})
	}

	// Verify parsed field mapping for the multi-entry case.
	t.Run("multi-entry fields are mapped correctly", func(t *testing.T) {
		entries := []moduleFederationEntry{
			{
				Name:      "genAi",
				Authorize: true,
				TLS:       true,
				ProxyService: []moduleProxyServiceEntry{
					{
						Authorize:   true,
						Path:        "/gen-ai/api",
						PathRewrite: "/api",
						TLS:         true,
						Service:     moduleServiceRef{Name: "gen-ai-bff", Namespace: "redhat-ods-apps", Port: 8443},
					},
				},
			},
			{
				Name: "maas",
				Proxy: []moduleProxyRoute{
					{Path: "/maas/api", PathRewrite: "/api"},
				},
				Service: &moduleServiceRef{Name: "maas-bff", Namespace: "redhat-ods-apps", Port: 9443},
			},
		}
		data, err := json.Marshal(entries)
		require.NoError(t, err)
		dir := t.TempDir()
		p := filepath.Join(dir, "config.json")
		require.NoError(t, os.WriteFile(p, data, 0600))

		parsed, err := parseFederationConfig(p)
		require.NoError(t, err)
		require.Len(t, parsed, 2)

		assert.Equal(t, "genAi", parsed[0].Name)
		assert.True(t, parsed[0].Authorize)
		require.Len(t, parsed[0].ProxyService, 1)
		assert.Equal(t, "/gen-ai/api", parsed[0].ProxyService[0].Path)
		assert.Equal(t, int32(8443), parsed[0].ProxyService[0].Service.Port)

		assert.Equal(t, "maas", parsed[1].Name)
		require.Len(t, parsed[1].Proxy, 1)
		assert.Equal(t, "/maas/api", parsed[1].Proxy[0].Path)
		require.NotNil(t, parsed[1].Service)
		assert.Equal(t, int32(9443), parsed[1].Service.Port)
	})
}

func TestNormalizeFederationEntries(t *testing.T) {
	tests := []struct {
		name      string
		entries   []moduleFederationEntry
		wantCount int
		wantErr   bool
		errSubstr string
		validate  func(t *testing.T, result []normalizedProxyEntry)
	}{
		{
			name: "old-format entry normalized correctly",
			entries: []moduleFederationEntry{
				{
					Name:      "genAi",
					Authorize: true,
					TLS:       true,
					Service:   &moduleServiceRef{Name: "gen-ai-bff", Namespace: "ns", Port: 8443},
					Proxy: []moduleProxyRoute{
						{Path: "/gen-ai/api", PathRewrite: "/api"},
					},
				},
			},
			wantCount: 1,
			validate: func(t *testing.T, result []normalizedProxyEntry) {
				assert.Equal(t, "genAi", result[0].entryName)
				assert.Equal(t, "/gen-ai/api", result[0].service.Path)
				assert.Equal(t, "/api", result[0].service.PathRewrite)
				assert.True(t, result[0].service.Authorize)
				assert.True(t, result[0].service.TLS)
				assert.Equal(t, "gen-ai-bff", result[0].service.Service.Name)
			},
		},
		{
			name: "new-format entry used as-is",
			entries: []moduleFederationEntry{
				{
					Name: "maas",
					ProxyService: []moduleProxyServiceEntry{
						{
							Authorize:   false,
							Path:        "/maas/api",
							PathRewrite: "/api",
							TLS:         false,
							Service:     moduleServiceRef{Name: "maas-bff", Namespace: "ns", Port: 8080},
						},
					},
				},
			},
			wantCount: 1,
			validate: func(t *testing.T, result []normalizedProxyEntry) {
				assert.False(t, result[0].service.Authorize)
				assert.False(t, result[0].service.TLS)
				assert.Equal(t, int32(8080), result[0].service.Service.Port)
			},
		},
		{
			name: "entry with both proxy and proxyService uses proxyService",
			entries: []moduleFederationEntry{
				{
					Name:      "test",
					Authorize: true,
					TLS:       true,
					Service:   &moduleServiceRef{Name: "old-svc", Namespace: "ns", Port: 443},
					Proxy:     []moduleProxyRoute{{Path: "/old/api", PathRewrite: "/api"}},
					ProxyService: []moduleProxyServiceEntry{
						{
							Authorize:   false,
							Path:        "/new/api",
							PathRewrite: "/v2",
							TLS:         false,
							Service:     moduleServiceRef{Name: "new-svc", Namespace: "ns", Port: 8080},
						},
					},
				},
			},
			wantCount: 1,
			validate: func(t *testing.T, result []normalizedProxyEntry) {
				assert.Equal(t, "/new/api", result[0].service.Path)
				assert.Equal(t, "new-svc", result[0].service.Service.Name)
			},
		},
		{
			name: "old-format entry with nil service returns error",
			entries: []moduleFederationEntry{
				{
					Name:  "badEntry",
					Proxy: []moduleProxyRoute{{Path: "/bad/api", PathRewrite: "/api"}},
				},
			},
			wantErr:   true,
			errSubstr: "badEntry",
		},
		{
			name: "coreBff entry is skipped",
			entries: []moduleFederationEntry{
				{
					Name: "coreBff",
					ProxyService: []moduleProxyServiceEntry{
						{Path: "/self/api", Service: moduleServiceRef{Name: "self", Namespace: "ns", Port: 443}},
					},
				},
				{
					Name: "other",
					ProxyService: []moduleProxyServiceEntry{
						{Path: "/other/api", Service: moduleServiceRef{Name: "other-svc", Namespace: "ns", Port: 443}},
					},
				},
			},
			wantCount: 1,
			validate: func(t *testing.T, result []normalizedProxyEntry) {
				assert.Equal(t, "other", result[0].entryName)
			},
		},
		{
			name: "entry with no proxy routes skipped silently",
			entries: []moduleFederationEntry{
				{
					Name:        "mlflowEmbedded",
					RemoteEntry: "http://example.com/remoteEntry.js",
				},
			},
			wantCount: 0,
		},
		{
			name: "mixed config with old and new format",
			entries: []moduleFederationEntry{
				{
					Name:      "oldModule",
					Authorize: true,
					TLS:       true,
					Service:   &moduleServiceRef{Name: "old-svc", Namespace: "ns", Port: 443},
					Proxy:     []moduleProxyRoute{{Path: "/old/api", PathRewrite: "/api"}},
				},
				{
					Name: "newModule",
					ProxyService: []moduleProxyServiceEntry{
						{
							Authorize:   false,
							Path:        "/new/api",
							PathRewrite: "/api",
							TLS:         false,
							Service:     moduleServiceRef{Name: "new-svc", Namespace: "ns", Port: 8080},
						},
					},
				},
			},
			wantCount: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := normalizeFederationEntries(tt.entries)
			if tt.wantErr {
				require.Error(t, err)
				if tt.errSubstr != "" {
					assert.Contains(t, err.Error(), tt.errSubstr)
				}
				return
			}
			require.NoError(t, err)
			assert.Len(t, result, tt.wantCount)
			if tt.validate != nil {
				tt.validate(t, result)
			}
		})
	}
}

func TestValidateProxyEntries(t *testing.T) {
	tests := []struct {
		name      string
		entries   []normalizedProxyEntry
		wantErr   bool
		errSubstr string
	}{
		{
			name: "empty proxy path rejected",
			entries: []normalizedProxyEntry{
				{entryName: "emptyPath", service: moduleProxyServiceEntry{Path: "", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "empty proxy path",
		},
		{
			name: "non-rooted proxy path rejected",
			entries: []normalizedProxyEntry{
				{entryName: "noSlash", service: moduleProxyServiceEntry{Path: "gen-ai/api", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "non-rooted proxy path",
		},
		{
			name: "root proxy path rejected",
			entries: []normalizedProxyEntry{
				{entryName: "rootPath", service: moduleProxyServiceEntry{Path: "/", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "uses root path / which conflicts with the SPA catch-all",
		},
		{
			name: "trailing slash in proxy path rejected",
			entries: []normalizedProxyEntry{
				{entryName: "trailingSlash", service: moduleProxyServiceEntry{Path: "/gen-ai/api/", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "has trailing slash in proxy path /gen-ai/api/ (will be appended automatically)",
		},
		{
			name: "ServeMux single-segment wildcard rejected",
			entries: []normalizedProxyEntry{
				{entryName: "wildcard", service: moduleProxyServiceEntry{Path: "/module/{id}", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "http.ServeMux wildcard syntax",
		},
		{
			name: "ServeMux multi-segment wildcard rejected",
			entries: []normalizedProxyEntry{
				{entryName: "wildcard", service: moduleProxyServiceEntry{Path: "/module/{path...}", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "http.ServeMux wildcard syntax",
		},
		{
			name: "module path /core-bff/api collides with reserved prefix",
			entries: []normalizedProxyEntry{
				{entryName: "selfCollide", service: moduleProxyServiceEntry{Path: "/core-bff/api", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "collides with reserved BFF route",
		},
		{
			name: "duplicate proxy paths rejected",
			entries: []normalizedProxyEntry{
				{entryName: "modA", service: moduleProxyServiceEntry{Path: "/shared/api", Service: moduleServiceRef{Name: "a", Namespace: "ns", Port: 443}}},
				{entryName: "modB", service: moduleProxyServiceEntry{Path: "/shared/api", Service: moduleServiceRef{Name: "b", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "duplicate proxy path /shared/api in entries modA and modB",
		},
		{
			name: "module path colliding with reserved /api/k8s/",
			entries: []normalizedProxyEntry{
				{entryName: "badMod", service: moduleProxyServiceEntry{Path: "/api/k8s", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "collides with reserved BFF route",
		},
		{
			name: "module path colliding with /api/service/model-serving/",
			entries: []normalizedProxyEntry{
				{entryName: "conflict", service: moduleProxyServiceEntry{Path: "/api/service/model-serving", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "collides with reserved BFF route",
		},
		{
			name: "empty service name rejected",
			entries: []normalizedProxyEntry{
				{entryName: "badSvc", service: moduleProxyServiceEntry{Path: "/ok/api", Service: moduleServiceRef{Name: "", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "empty service name",
		},
		{
			name: "empty service namespace rejected",
			entries: []normalizedProxyEntry{
				{entryName: "badNs", service: moduleProxyServiceEntry{Path: "/ok/api", Service: moduleServiceRef{Name: "svc", Namespace: "", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "empty service namespace",
		},
		{
			name: "zero service port rejected",
			entries: []normalizedProxyEntry{
				{entryName: "badPort", service: moduleProxyServiceEntry{Path: "/ok/api", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 0}}},
			},
			wantErr:   true,
			errSubstr: "invalid service port 0 (must be 1-65535)",
		},
		{
			name: "negative service port rejected",
			entries: []normalizedProxyEntry{
				{entryName: "badPort", service: moduleProxyServiceEntry{Path: "/ok/api", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: -1}}},
			},
			wantErr:   true,
			errSubstr: "invalid service port -1 (must be 1-65535)",
		},
		{
			name: "service port above TCP range rejected",
			entries: []normalizedProxyEntry{
				{entryName: "badPort", service: moduleProxyServiceEntry{Path: "/ok/api", Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 65536}}},
			},
			wantErr:   true,
			errSubstr: "invalid service port 65536 (must be 1-65535)",
		},
		{
			name: "invalid RFC 1123 service name rejected",
			entries: []normalizedProxyEntry{
				{entryName: "badName", service: moduleProxyServiceEntry{Path: "/ok/api", Service: moduleServiceRef{Name: "UPPER_CASE", Namespace: "ns", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "invalid service name",
		},
		{
			name: "invalid RFC 1123 service namespace rejected",
			entries: []normalizedProxyEntry{
				{entryName: "badNs", service: moduleProxyServiceEntry{Path: "/ok/api", Service: moduleServiceRef{Name: "svc", Namespace: "has spaces", Port: 443}}},
			},
			wantErr:   true,
			errSubstr: "invalid service namespace",
		},
		{
			name: "authorize with custom Authorization header rejected",
			entries: []normalizedProxyEntry{
				{entryName: "authConflict", service: moduleProxyServiceEntry{
					Authorize: true, Path: "/ok/api",
					Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443},
					Headers: map[string]string{"authorization": "Bearer static-token"},
				}},
			},
			wantErr:   true,
			errSubstr: "custom Authorization header while authorize is enabled",
		},
		{
			name: "authorize with custom Authorization header case-insensitive",
			entries: []normalizedProxyEntry{
				{entryName: "authConflict", service: moduleProxyServiceEntry{
					Authorize: true, Path: "/ok/api",
					Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443},
					Headers: map[string]string{"AUTHORIZATION": "Bearer static-token"},
				}},
			},
			wantErr:   true,
			errSubstr: "custom Authorization header while authorize is enabled",
		},
		{
			name: "non-authorized route with Authorization header allowed",
			entries: []normalizedProxyEntry{
				{entryName: "staticAuth", service: moduleProxyServiceEntry{
					Authorize: false, Path: "/ok/api",
					Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443},
					Headers: map[string]string{"Authorization": "Bearer static-token"},
				}},
			},
			wantErr: false,
		},
		{
			name: "valid entries pass",
			entries: []normalizedProxyEntry{
				{entryName: "genAi", service: moduleProxyServiceEntry{Path: "/gen-ai/api", Service: moduleServiceRef{Name: "gen-ai-bff", Namespace: "ns", Port: 8443}}},
				{entryName: "maas", service: moduleProxyServiceEntry{Path: "/maas/api", Service: moduleServiceRef{Name: "maas-bff", Namespace: "ns", Port: 8443}}},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateProxyEntries(tt.entries)
			if tt.wantErr {
				require.Error(t, err)
				if tt.errSubstr != "" {
					assert.Contains(t, err.Error(), tt.errSubstr)
				}
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestInitModuleProxies_RejectsServeMuxWildcardPathsBeforeRegistration(t *testing.T) {
	tests := []struct {
		name string
		path string
	}{
		{name: "single segment wildcard", path: "/module/{id}"},
		{name: "multi-segment wildcard", path: "/module/{path...}"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			configFile := writeTempConfig(t, []moduleFederationEntry{{
				Name: "wildcard",
				ProxyService: []moduleProxyServiceEntry{{
					Path: tt.path, TLS: false,
					Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443},
				}},
			}})
			app := newTestApp(func(a *App) {
				a.config.MFRemotesConfig = configFile
				a.config.DevMode = true
			})

			err := app.initModuleProxies()
			require.ErrorContains(t, err, "http.ServeMux wildcard syntax")
			assert.Empty(t, app.moduleProxies)
			assert.NotPanics(t, func() {
				app.registerModuleProxies(http.NewServeMux())
			})
		})
	}
}

func TestReservedPathCollisionBothDirections(t *testing.T) {
	tests := []struct {
		name string
		path string
	}{
		{name: "module is prefix of reserved", path: "/api"},
		{name: "reserved is prefix of module", path: "/api/k8s/custom"},
		{name: "matches healthcheck route exactly", path: HealthCheckPath},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entries := []normalizedProxyEntry{
				{entryName: "collision", service: moduleProxyServiceEntry{Path: tt.path, Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			}
			err := validateProxyEntries(entries)
			require.Error(t, err)
			assert.Contains(t, err.Error(), "collides with reserved BFF route")
		})
	}
}

func TestReservedPathCollisionUsesPathSegmentBoundaries(t *testing.T) {
	tests := []struct {
		name string
		path string
	}{
		{name: "healthcheck lookalike", path: "/healthcheck-module"},
		{name: "OpenAPI descendant", path: "/openapi/docs"},
		{name: "Swagger UI lookalike", path: "/swagger-ui-module"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entries := []normalizedProxyEntry{
				{entryName: "nonCollision", service: moduleProxyServiceEntry{Path: tt.path, Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			}
			require.NoError(t, validateProxyEntries(entries))
		})
	}
}

// TestReservedPathCollisionViaPathPrefix covers the case where a module proxy
// path only collides with a reserved BFF route once the PathPrefix ("/core-bff")
// variant is considered. A path like "/openapi" does not collide with any
// reserved bare path (e.g. "/api/", "/api/k8s/"), but registerModuleProxies
// dual-registers it at PathPrefix+"/openapi/", which collides with the real
// OpenAPIPath route ("/core-bff/openapi") and would panic http.ServeMux at
// startup if this branch of validateProxyEntries were broken.
func TestReservedPathCollisionViaPathPrefix(t *testing.T) {
	tests := []struct {
		name string
		path string
	}{
		{name: "collides with openapi route only via PathPrefix", path: "/openapi"},
		{name: "collides with swagger-ui route only via PathPrefix", path: "/swagger-ui"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entries := []normalizedProxyEntry{
				{entryName: "sneaky", service: moduleProxyServiceEntry{Path: tt.path, Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 443}}},
			}
			err := validateProxyEntries(entries)
			require.Error(t, err)
			assert.Contains(t, err.Error(), "collides with reserved BFF route")
			assert.Contains(t, err.Error(), "sneaky")
		})
	}
}

func TestInitModuleProxies_EmptyConfig(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.MFRemotesConfig = ""
	})
	err := app.initModuleProxies()
	require.NoError(t, err)
	assert.Nil(t, app.moduleProxies)
}

func TestInitModuleProxies_AuthorizeTrue(t *testing.T) {
	var receivedAuthHeader string
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuthHeader = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	entries := []moduleFederationEntry{
		{
			Name: "authMod",
			ProxyService: []moduleProxyServiceEntry{
				{
					Authorize:   true,
					Path:        "/auth-mod/api",
					PathRewrite: "/api",
					TLS:         false,
					Service:     moduleServiceRef{Name: "localhost", Namespace: "test", Port: 8080},
				},
			},
		},
	}
	configFile := writeTempConfig(t, entries)

	app := newTestApp(func(a *App) {
		a.config.MFRemotesConfig = configFile
		a.config.DevMode = true
		a.config.MockK8Client = false
	})

	err := app.initModuleProxies()
	require.NoError(t, err)
	require.Len(t, app.moduleProxies, 1)

	assert.NotNil(t, app.moduleProxies[0].handler)

	admin := k8mocks.DefaultTestUsers[0]

	appDirect := newTestApp(func(a *App) {
		a.config.DevMode = true
	})
	proxyHandler := createTestProxy(t, appDirect, backend.URL, "/auth-mod/api", "/api", true, false, nil)
	rr := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "/auth-mod/api/v1/items", nil)
	req2 = reqWithIdentity(req2, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken("test-token-123"),
	})
	proxyHandler.ServeHTTP(rr, req2)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, receivedAuthHeader, "Bearer test-token-123")
}

func TestInitModuleProxies_AuthorizeFalse(t *testing.T) {
	var receivedAuthHeader string
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuthHeader = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	app := newTestApp(func(a *App) {
		a.config.DevMode = true
	})
	proxyHandler := createTestProxy(t, app, backend.URL, "/noauth/api", "/api", false, false, nil)

	admin := k8mocks.DefaultTestUsers[0]
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/noauth/api/v1/items", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken("should-not-appear"),
	})
	proxyHandler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Empty(t, receivedAuthHeader)
}

func TestInitModuleProxies_TLSFalse(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	app := newTestApp(func(a *App) {
		a.config.DevMode = true
	})
	proxyHandler := createTestProxy(t, app, backend.URL, "/perses/api", "/api", false, false, nil)
	require.NotNil(t, proxyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/perses/api/v1/dashboards", nil)
	proxyHandler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestInitModuleProxies_CustomHeaders(t *testing.T) {
	var receivedHeaders http.Header
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedHeaders = r.Header.Clone()
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	app := newTestApp(func(a *App) {
		a.config.DevMode = true
	})
	headers := map[string]string{
		"X-Custom-Header": "custom-value",
		"X-Another":       "another-value",
	}
	proxyHandler := createTestProxy(t, app, backend.URL, "/custom/api", "/api", false, false, headers)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/custom/api/v1/data", nil)
	proxyHandler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	require.NotNil(t, receivedHeaders)
	assert.Equal(t, "custom-value", receivedHeaders.Get("X-Custom-Header"))
	assert.Equal(t, "another-value", receivedHeaders.Get("X-Another"))
}

func TestInitModuleProxies_PathRewrite(t *testing.T) {
	var receivedPath string
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	app := newTestApp(func(a *App) {
		a.config.DevMode = true
	})
	proxyHandler := createTestProxy(t, app, backend.URL, "/gen-ai/api", "/api", false, false, nil)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/gen-ai/api/v1/models", nil)
	proxyHandler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "/api/v1/models", receivedPath)
}

func TestInitModuleProxies_InvalidServiceFields(t *testing.T) {
	tests := []struct {
		name      string
		entries   []moduleFederationEntry
		errSubstr string
	}{
		{
			name: "empty service name",
			entries: []moduleFederationEntry{
				{
					Name: "badName",
					ProxyService: []moduleProxyServiceEntry{
						{Path: "/bad/api", PathRewrite: "/api", TLS: false, Service: moduleServiceRef{Name: "", Namespace: "ns", Port: 443}},
					},
				},
			},
			errSubstr: "empty service name",
		},
		{
			name: "zero port",
			entries: []moduleFederationEntry{
				{
					Name: "badPort",
					ProxyService: []moduleProxyServiceEntry{
						{Path: "/bad/api", PathRewrite: "/api", TLS: false, Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 0}},
					},
				},
			},
			errSubstr: "invalid service port 0 (must be 1-65535)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			configFile := writeTempConfig(t, tt.entries)
			app := newTestApp(func(a *App) {
				a.config.MFRemotesConfig = configFile
				a.config.DevMode = true
			})
			err := app.initModuleProxies()
			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.errSubstr)
		})
	}
}

// TestInitModuleProxies_AllowHTTPIndependentOfDevMode guards ADV-011: every other
// tls:false test in this file also sets DevMode:true, so a regression that dropped
// the "!entry.service.TLS ||" term from initModuleProxies' AllowHTTP computation
// (leaving only the DevMode/MockK8Client checks) would go undetected. This test
// calls the real app.initModuleProxies() — not the duplicated buildModuleProxyConfig
// test helper — with DevMode and MockK8Client both false, so a proxy.NewReverseProxy
// "insecure HTTP target URLs are not allowed" failure can only be caused by AllowHTTP
// not being driven by the entry's own tls field.
func TestInitModuleProxies_AllowHTTPIndependentOfDevMode(t *testing.T) {
	tests := []struct {
		name string
		tls  bool
	}{
		{name: "tls false outside dev/mock mode still builds (perses-style production HTTP target)", tls: false},
		{name: "tls true outside dev/mock mode builds (standard production HTTPS target)", tls: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entries := []moduleFederationEntry{
				{
					Name: "prodMod",
					ProxyService: []moduleProxyServiceEntry{
						{
							Path:        "/prod/api",
							PathRewrite: "/api",
							TLS:         tt.tls,
							Service:     moduleServiceRef{Name: "prod-svc", Namespace: "ns", Port: 8080},
						},
					},
				},
			}
			configFile := writeTempConfig(t, entries)
			app := newTestApp(func(a *App) {
				a.config.MFRemotesConfig = configFile
			})
			require.False(t, app.config.DevMode)
			require.False(t, app.config.MockK8Client)

			err := app.initModuleProxies()
			require.NoError(t, err)
			require.Len(t, app.moduleProxies, 1)
			assert.NotNil(t, app.moduleProxies[0].handler)
		})
	}
}

func TestInitModuleProxies_DuplicatePaths(t *testing.T) {
	entries := []moduleFederationEntry{
		{
			Name: "modA",
			ProxyService: []moduleProxyServiceEntry{
				{Path: "/shared/api", PathRewrite: "/api", TLS: false, Service: moduleServiceRef{Name: "a", Namespace: "ns", Port: 443}},
			},
		},
		{
			Name: "modB",
			ProxyService: []moduleProxyServiceEntry{
				{Path: "/shared/api", PathRewrite: "/api", TLS: false, Service: moduleServiceRef{Name: "b", Namespace: "ns", Port: 443}},
			},
		},
	}
	configFile := writeTempConfig(t, entries)
	app := newTestApp(func(a *App) {
		a.config.MFRemotesConfig = configFile
		a.config.DevMode = true
	})
	err := app.initModuleProxies()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "duplicate proxy path")
	assert.Contains(t, err.Error(), "modA")
	assert.Contains(t, err.Error(), "modB")
}

func TestInitModuleProxies_MalformedJSON(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "bad.json")
	require.NoError(t, os.WriteFile(p, []byte(`not json`), 0600))

	app := newTestApp(func(a *App) {
		a.config.MFRemotesConfig = p
	})
	err := app.initModuleProxies()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse federation config")
}

func TestInitModuleProxies_NonExistentFile(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.MFRemotesConfig = "/does/not/exist.json"
	})
	err := app.initModuleProxies()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "/does/not/exist.json")
}

func TestInitModuleProxies_SkipsNoProxyRoutes(t *testing.T) {
	entries := []moduleFederationEntry{
		{
			Name:        "mlflowEmbedded",
			RemoteEntry: "http://example.com/remoteEntry.js",
		},
	}
	configFile := writeTempConfig(t, entries)
	app := newTestApp(func(a *App) {
		a.config.MFRemotesConfig = configFile
		a.config.DevMode = true
	})
	err := app.initModuleProxies()
	require.NoError(t, err)
	assert.Nil(t, app.moduleProxies)
}

// TestRegisterModuleProxies_DualPathRegistration verifies that registerModuleProxies
// (the actual mux-wiring code, distinct from the handlers exercised directly in the
// tests above) registers each module proxy at both its bare path and the
// PathPrefix-stripped path, and that multiple registered proxies route independently
// without cross-talk.
func TestRegisterModuleProxies_DualPathRegistration(t *testing.T) {
	var receivedPaths []string
	newBackend := func(tag string) *httptest.Server {
		return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			receivedPaths = append(receivedPaths, tag+":"+r.URL.Path)
			w.WriteHeader(http.StatusOK)
		}))
	}
	backendA := newBackend("A")
	defer backendA.Close()
	backendB := newBackend("B")
	defer backendB.Close()

	app := newTestApp(func(a *App) {
		a.config.DevMode = true
	})
	handlerA := createTestProxy(t, app, backendA.URL, "/gen-ai/api", "/api", false, false, nil)
	handlerB := createTestProxy(t, app, backendB.URL, "/maas/api", "/v1", false, false, nil)
	app.moduleProxies = []moduleProxyHandler{
		{path: "/gen-ai/api", handler: handlerA},
		{path: "/maas/api", handler: handlerB},
	}

	mux := http.NewServeMux()
	app.registerModuleProxies(mux)

	tests := []struct {
		name        string
		requestPath string
		want        string
	}{
		{name: "genAi bare path routes to backend A", requestPath: "/gen-ai/api/models", want: "A:/api/models"},
		{name: "genAi PathPrefix-stripped path routes to backend A", requestPath: PathPrefix + "/gen-ai/api/models", want: "A:/api/models"},
		{name: "maas bare path routes to backend B", requestPath: "/maas/api/jobs", want: "B:/v1/jobs"},
		{name: "maas PathPrefix-stripped path routes to backend B", requestPath: PathPrefix + "/maas/api/jobs", want: "B:/v1/jobs"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			receivedPaths = nil
			rr := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, tt.requestPath, nil)
			mux.ServeHTTP(rr, req)
			assert.Equal(t, http.StatusOK, rr.Code)
			require.Len(t, receivedPaths, 1)
			assert.Equal(t, tt.want, receivedPaths[0])
		})
	}
}

// TestRoutes_ModuleProxyPaths verifies that module proxies configured via app.moduleProxies
// are actually reachable through the full app.Routes() stack (newServiceMux -> registerModuleProxies
// -> newCombinedMux's authenticated handler chain), mirroring the existing TestRoutes_K8sProxyPaths /
// TestRoutes_WsProxyPaths integration tests. TestRegisterModuleProxies_DualPathRegistration above only
// exercises registerModuleProxies against a bare mux built by the test itself, so it would not catch a
// regression where the "app.registerModuleProxies(mux)" call is removed from newServiceMux() in
// routes.go — this test closes that gap by going through the real Routes() wiring end to end.
func TestRoutes_ModuleProxyPaths(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Path", r.URL.Path)
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	tmpDir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte("<html></html>"), 0600))

	app := newTestApp(func(a *App) {
		a.config.StaticAssetsDir = tmpDir
	})
	handler := createTestProxy(t, app, backend.URL, "/gen-ai/api", "/api", false, false, nil)
	app.moduleProxies = []moduleProxyHandler{
		{path: "/gen-ai/api", handler: handler},
	}

	ts := httptest.NewServer(app.Routes())
	defer ts.Close()

	tests := []struct {
		name     string
		path     string
		wantPath string
	}{
		{"bare path", "/gen-ai/api/v1/models", "/api/v1/models"},
		{"prefixed path", "/core-bff/gen-ai/api/v1/models", "/api/v1/models"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := http.Get(ts.URL + tt.path)
			require.NoError(t, err)
			defer resp.Body.Close()

			assert.Equal(t, http.StatusOK, resp.StatusCode)
			assert.Equal(t, tt.wantPath, resp.Header.Get("X-Got-Path"))
		})
	}
}

// createTestProxy creates a proxy handler pointing at the given backend URL for testing.
func createTestProxy(t *testing.T, app *App, backendURL, proxyPath, pathRewrite string, authorize, useTLS bool, headers map[string]string) http.Handler {
	t.Helper()

	entries := []moduleFederationEntry{
		{
			Name: "testModule",
			ProxyService: []moduleProxyServiceEntry{
				{
					Authorize:   authorize,
					Path:        proxyPath,
					PathRewrite: pathRewrite,
					TLS:         useTLS,
					Service:     moduleServiceRef{Name: "placeholder", Namespace: "ns", Port: 8080},
					Headers:     headers,
				},
			},
		},
	}

	normalized, err := normalizeFederationEntries(entries)
	require.NoError(t, err)
	require.Len(t, normalized, 1)

	entry := normalized[0]

	targetURL, err := url.Parse(backendURL)
	require.NoError(t, err)

	cfg := app.buildModuleProxyConfig(entry, targetURL, true, false, false)

	rp, err := proxy.NewReverseProxy(cfg)
	require.NoError(t, err)
	return rp
}

func writeTempConfig(t *testing.T, entries []moduleFederationEntry) string {
	t.Helper()
	data, err := json.Marshal(entries)
	require.NoError(t, err)
	dir := t.TempDir()
	p := filepath.Join(dir, "federation-config.json")
	require.NoError(t, os.WriteFile(p, data, 0600))
	return p
}
