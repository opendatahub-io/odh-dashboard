package proxy

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
)

func testK8sProxyConfig(host string) K8sProxyConfig {
	return K8sProxyConfig{
		K8sHost:            host,
		InsecureSkipVerify: true,
		AllowHTTP:          true,
		Logger:             testLogger(),
	}
}

func newIdentityContext(token string) context.Context {
	identity := &k8s.RequestIdentity{
		UserID: "test-user",
		Token:  k8s.NewBearerToken(token),
	}
	return context.WithValue(context.Background(), constants.RequestIdentityKey, identity)
}

func TestK8sProxy_PathStripping(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Path", r.URL.Path)
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
	if err != nil {
		t.Fatalf("NewK8sProxyHandler() error = %v", err)
	}

	tests := []struct {
		name     string
		path     string
		wantPath string
	}{
		{"pods list", "/api/k8s/api/v1/pods", "/api/v1/pods"},
		{"namespaced resource", "/api/k8s/apis/apps/v1/namespaces/test/deployments", "/apis/apps/v1/namespaces/test/deployments"},
		{"CRD resource", "/api/k8s/apis/serving.kserve.io/v1beta1/inferenceservices", "/apis/serving.kserve.io/v1beta1/inferenceservices"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			req = req.WithContext(newIdentityContext("test-token"))
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if got := rec.Header().Get("X-Got-Path"); got != tt.wantPath {
				t.Errorf("path = %q, want %q", got, tt.wantPath)
			}
		})
	}
}

func TestK8sProxy_QueryParams(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Query", r.URL.RawQuery)
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
	if err != nil {
		t.Fatalf("NewK8sProxyHandler() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods?watch=true&labelSelector=app%3Dtest", nil)
	req = req.WithContext(newIdentityContext("test-token"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Got-Query"); got != "watch=true&labelSelector=app%3Dtest" {
		t.Errorf("query = %q, want %q", got, "watch=true&labelSelector=app%3Dtest")
	}
}

func TestK8sProxy_AuthHeader(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Auth", r.Header.Get("Authorization"))
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
	if err != nil {
		t.Fatalf("NewK8sProxyHandler() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods", nil)
	req = req.WithContext(newIdentityContext("my-secret-token"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Got-Auth"); got != "Bearer my-secret-token" {
		t.Errorf("auth = %q, want %q", got, "Bearer my-secret-token")
	}
}

func TestK8sProxy_MissingIdentity(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Auth", r.Header.Get("Authorization"))
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
	if err != nil {
		t.Fatalf("NewK8sProxyHandler() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Got-Auth"); got != "" {
		t.Errorf("auth = %q, want empty (no identity in context)", got)
	}
}

func TestK8sProxy_AllHTTPMethods(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Method", r.Method)
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
	if err != nil {
		t.Fatalf("NewK8sProxyHandler() error = %v", err)
	}

	methods := []string{
		http.MethodGet, http.MethodPost, http.MethodPut,
		http.MethodPatch, http.MethodDelete, http.MethodHead, http.MethodOptions,
	}

	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/api/k8s/api/v1/pods", nil)
			req = req.WithContext(newIdentityContext("token"))
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if got := rec.Header().Get("X-Got-Method"); got != method {
				t.Errorf("method = %q, want %q", got, method)
			}
		})
	}
}

func TestK8sProxy_RequestBody(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		w.Header().Set("X-Got-Content-Type", r.Header.Get("Content-Type"))
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(body)
	}))
	defer backend.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
	if err != nil {
		t.Fatalf("NewK8sProxyHandler() error = %v", err)
	}

	body := `{"apiVersion":"v1","kind":"ConfigMap","metadata":{"name":"test"}}`
	req := httptest.NewRequest(http.MethodPost, "/api/k8s/api/v1/namespaces/default/configmaps", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(newIdentityContext("token"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Body.String(); got != body {
		t.Errorf("body = %q, want %q", got, body)
	}
	if got := rec.Header().Get("X-Got-Content-Type"); got != "application/json" {
		t.Errorf("content-type = %q, want %q", got, "application/json")
	}
}

func TestK8sProxy_SensitiveHeadersStripped(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Cookie", r.Header.Get("Cookie"))
		w.Header().Set("X-Got-Token", r.Header.Get("X-Forwarded-Access-Token"))
		w.Header().Set("X-Got-XFF", r.Header.Get("X-Forwarded-For"))
		w.Header().Set("X-Got-Real-IP", r.Header.Get("X-Real-Ip"))
		w.Header().Set("X-Got-Content-Type", r.Header.Get("Content-Type"))
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	cfg := testK8sProxyConfig(backend.URL)
	cfg.AuthTokenHeader = "x-forwarded-access-token"
	handler, err := NewK8sProxyHandler(cfg)
	if err != nil {
		t.Fatalf("NewK8sProxyHandler() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods", nil)
	req.Header.Set("Cookie", "session=abc123")
	req.Header.Set("X-Forwarded-Access-Token", "secret-user-token")
	req.Header.Set("X-Forwarded-For", "10.0.0.1")
	req.Header.Set("X-Real-Ip", "10.0.0.2")
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(newIdentityContext("test-token"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Got-Cookie"); got != "" {
		t.Errorf("Cookie = %q, want empty (must be stripped)", got)
	}
	if got := rec.Header().Get("X-Got-Token"); got != "" {
		t.Errorf("X-Forwarded-Access-Token = %q, want empty (must be stripped)", got)
	}
	if got := rec.Header().Get("X-Got-XFF"); got != "" {
		t.Errorf("X-Forwarded-For = %q, want empty (must be stripped)", got)
	}
	if got := rec.Header().Get("X-Got-Real-IP"); got != "" {
		t.Errorf("X-Real-Ip = %q, want empty (must be stripped)", got)
	}
	if got := rec.Header().Get("X-Got-Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want %q (non-sensitive headers must pass through)", got, "application/json")
	}
}

func TestNewK8sProxyHandler_InvalidURL(t *testing.T) {
	_, err := NewK8sProxyHandler(testK8sProxyConfig("://invalid"))
	if err == nil {
		t.Error("expected error for invalid URL")
	}
}

func TestNewK8sProxyHandler_RejectsInvalidK8sHost(t *testing.T) {
	tests := []struct {
		name string
		host string
	}{
		{"empty string", ""},
		{"relative path", "/relative/path"},
		{"no scheme", "just-a-hostname"},
		{"ftp scheme", "ftp://host:21"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewK8sProxyHandler(testK8sProxyConfig(tt.host))
			if err == nil {
				t.Errorf("expected error for K8sHost=%q, got nil", tt.host)
			}
		})
	}
}

func TestK8sProxy_ResponsePassthrough(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Custom-Header", "preserved")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"kind":"Status","code":404}`))
	}))
	defer backend.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
	if err != nil {
		t.Fatalf("NewK8sProxyHandler() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/nonexistent", nil)
	req = req.WithContext(newIdentityContext("token"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
	if got := rec.Header().Get("X-Custom-Header"); got != "preserved" {
		t.Errorf("X-Custom-Header = %q, want %q", got, "preserved")
	}
	if got := rec.Body.String(); got != `{"kind":"Status","code":404}` {
		t.Errorf("body = %q, want %q", got, `{"kind":"Status","code":404}`)
	}
}

func TestK8sProxy_ForbiddenPassthrough(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"kind":"Status","code":403,"message":"pods is forbidden"}`))
	}))
	defer backend.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
	if err != nil {
		t.Fatalf("NewK8sProxyHandler() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods", nil)
	req = req.WithContext(newIdentityContext("token"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusForbidden)
	}
	if got := rec.Body.String(); got != `{"kind":"Status","code":403,"message":"pods is forbidden"}` {
		t.Errorf("body = %q, want K8s forbidden response", got)
	}
}

func TestK8sProxy_RedirectToPrivateIPBlocked(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Location", "http://10.0.0.1/secret")
		w.WriteHeader(http.StatusFound)
	}))
	defer backend.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
	if err != nil {
		t.Fatalf("NewK8sProxyHandler() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods", nil)
	req = req.WithContext(newIdentityContext("token"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d for redirect to private IP", rec.Code, http.StatusForbidden)
	}
}
