package proxy

import (
	"crypto/tls"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func mustParseURL(t *testing.T, rawURL string) *url.URL {
	t.Helper()
	u, err := url.Parse(rawURL)
	if err != nil {
		t.Fatalf("failed to parse URL %q: %v", rawURL, err)
	}
	return u
}

func TestNewReverseProxy_Validation(t *testing.T) {
	logger := testLogger()

	tests := []struct {
		name    string
		cfg     ProxyConfig
		wantErr bool
	}{
		{
			name:    "nil target URL",
			cfg:     ProxyConfig{Logger: logger},
			wantErr: true,
		},
		{
			name: "HTTP target blocked",
			cfg: ProxyConfig{
				TargetURL: mustParseURL(t, "http://example.com"),
				AllowHTTP: false,
				Logger:    logger,
			},
			wantErr: true,
		},
		{
			name: "HTTP target allowed",
			cfg: ProxyConfig{
				TargetURL: mustParseURL(t, "http://example.com"),
				AllowHTTP: true,
				Logger:    logger,
			},
			wantErr: false,
		},
		{
			name: "HTTPS target always allowed",
			cfg: ProxyConfig{
				TargetURL: mustParseURL(t, "https://example.com"),
				AllowHTTP: false,
				Logger:    logger,
			},
			wantErr: false,
		},
		{
			name: "nil logger",
			cfg: ProxyConfig{
				TargetURL: mustParseURL(t, "https://example.com"),
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewReverseProxy(tt.cfg)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewReverseProxy() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestNewReverseProxy_Forwarding(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Path", r.URL.Path)
		w.Header().Set("X-Got-Query", r.URL.RawQuery)
		w.Header().Set("X-Got-Auth", r.Header.Get("Authorization"))
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	}))
	defer backend.Close()

	targetURL := mustParseURL(t, backend.URL)

	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL: targetURL,
		AllowHTTP: true,
		Logger:    testLogger(),
		PathRewriteFn: func(r *http.Request) string {
			return "/rewritten" + r.URL.Path
		},
		AuthHeaderFn: func(r *http.Request) string {
			return "Bearer test-token"
		},
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/original?foo=bar", nil)
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("X-Got-Path"); got != "/rewritten/original" {
		t.Errorf("path = %q, want %q", got, "/rewritten/original")
	}
	if got := rec.Header().Get("X-Got-Query"); got != "foo=bar" {
		t.Errorf("query = %q, want %q", got, "foo=bar")
	}
	if got := rec.Header().Get("X-Got-Auth"); got != "Bearer test-token" {
		t.Errorf("auth = %q, want %q", got, "Bearer test-token")
	}
}

func TestNewReverseProxy_NoPathRewrite(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Path", r.URL.Path)
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL: mustParseURL(t, backend.URL),
		AllowHTTP: true,
		Logger:    testLogger(),
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/keep/this/path", nil)
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Got-Path"); got != "/keep/this/path" {
		t.Errorf("path = %q, want %q", got, "/keep/this/path")
	}
}

func TestNewReverseProxy_ErrorHandler(t *testing.T) {
	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL: mustParseURL(t, "http://127.0.0.1:1"),
		AllowHTTP: true,
		Logger:    testLogger(),
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("custom error"))
		},
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusServiceUnavailable)
	}
	if got := rec.Body.String(); got != "custom error" {
		t.Errorf("body = %q, want %q", got, "custom error")
	}
}

func TestNewReverseProxy_DefaultErrorHandler(t *testing.T) {
	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL: mustParseURL(t, "http://127.0.0.1:1"),
		AllowHTTP: true,
		Logger:    testLogger(),
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadGateway {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadGateway)
	}
}

func TestNewReverseProxy_PostBody(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		w.Header().Set("X-Got-Method", r.Method)
		w.Header().Set("X-Got-Content-Type", r.Header.Get("Content-Type"))
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(body)
	}))
	defer backend.Close()

	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL: mustParseURL(t, backend.URL),
		AllowHTTP: true,
		Logger:    testLogger(),
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	body := `{"key":"value"}`
	req := httptest.NewRequest(http.MethodPost, "/data", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("X-Got-Method"); got != http.MethodPost {
		t.Errorf("method = %q, want %q", got, http.MethodPost)
	}
}

func TestNewReverseProxy_ModifyResponse(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL: mustParseURL(t, backend.URL),
		AllowHTTP: true,
		Logger:    testLogger(),
		ModifyResponse: func(resp *http.Response) error {
			resp.Header.Set("X-Custom", "injected")
			return nil
		},
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Custom"); got != "injected" {
		t.Errorf("X-Custom = %q, want %q", got, "injected")
	}
}

func TestNewReverseProxy_AuthHeaderStripped(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Auth", r.Header.Get("Authorization"))
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL: mustParseURL(t, backend.URL),
		AllowHTTP: true,
		Logger:    testLogger(),
		AuthHeaderFn: func(r *http.Request) string {
			return "Bearer injected-token"
		},
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer client-supplied-token")
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Got-Auth"); got != "Bearer injected-token" {
		t.Errorf("auth = %q, want %q (client token should be stripped)", got, "Bearer injected-token")
	}
}

func TestNewReverseProxy_ClientAuthStrippedWhenNoIdentity(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Auth", r.Header.Get("Authorization"))
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL: mustParseURL(t, backend.URL),
		AllowHTTP: true,
		Logger:    testLogger(),
		AuthHeaderFn: func(r *http.Request) string {
			return ""
		},
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer client-supplied-token")
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Got-Auth"); got != "" {
		t.Errorf("auth = %q, want empty (client token must be stripped even when identity is absent)", got)
	}
}

func TestNewReverseProxy_ImpersonateHeadersStripped(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Impersonate-User", r.Header.Get("Impersonate-User"))
		w.Header().Set("X-Got-Impersonate-Group", r.Header.Get("Impersonate-Group"))
		w.Header().Set("X-Got-Impersonate-Extra", r.Header.Get("Impersonate-Extra-Scopes"))
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL: mustParseURL(t, backend.URL),
		AllowHTTP: true,
		Logger:    testLogger(),
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Impersonate-User", "attacker")
	req.Header.Set("Impersonate-Group", "system:masters")
	req.Header.Set("Impersonate-Extra-Scopes", "admin")
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Got-Impersonate-User"); got != "" {
		t.Errorf("Impersonate-User = %q, want empty (must be stripped)", got)
	}
	if got := rec.Header().Get("X-Got-Impersonate-Group"); got != "" {
		t.Errorf("Impersonate-Group = %q, want empty (must be stripped)", got)
	}
	if got := rec.Header().Get("X-Got-Impersonate-Extra"); got != "" {
		t.Errorf("Impersonate-Extra-Scopes = %q, want empty (must be stripped)", got)
	}
}

func TestNewReverseProxy_StripHeaders(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Cookie", r.Header.Get("Cookie"))
		w.Header().Set("X-Got-Forwarded-Token", r.Header.Get("X-Forwarded-Access-Token"))
		w.Header().Set("X-Got-Forwarded-For", r.Header.Get("X-Forwarded-For"))
		w.Header().Set("X-Got-Content-Type", r.Header.Get("Content-Type"))
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL: mustParseURL(t, backend.URL),
		AllowHTTP: true,
		Logger:    testLogger(),
		StripHeaders: []string{
			"cookie",
			"x-forwarded-access-token",
			"x-forwarded-for",
		},
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Cookie", "session=abc123")
	req.Header.Set("X-Forwarded-Access-Token", "secret-user-token")
	req.Header.Set("X-Forwarded-For", "10.0.0.1")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Got-Cookie"); got != "" {
		t.Errorf("Cookie = %q, want empty (must be stripped)", got)
	}
	if got := rec.Header().Get("X-Got-Forwarded-Token"); got != "" {
		t.Errorf("X-Forwarded-Access-Token = %q, want empty (must be stripped)", got)
	}
	if got := rec.Header().Get("X-Got-Forwarded-For"); got != "" {
		t.Errorf("X-Forwarded-For = %q, want empty (must be stripped)", got)
	}
	if got := rec.Header().Get("X-Got-Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want %q (non-stripped headers must pass through)", got, "application/json")
	}
}

func TestNewReverseProxy_SSRFValidateTarget_BlocksPrivateIP(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL:          mustParseURL(t, backend.URL),
		AllowHTTP:          true,
		SSRFValidateTarget: true,
		Logger:             testLogger(),
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d (private IP target should be blocked by default error handler)", rec.Code, http.StatusForbidden)
	}
}

func TestNewReverseProxy_SSRFValidateTarget_Disabled(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	}))
	defer backend.Close()

	proxy, err := NewReverseProxy(ProxyConfig{
		TargetURL:          mustParseURL(t, backend.URL),
		AllowHTTP:          true,
		SSRFValidateTarget: false,
		Logger:             testLogger(),
	})
	if err != nil {
		t.Fatalf("NewReverseProxy() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d (private IP should be allowed when SSRF validation is off)", rec.Code, http.StatusOK)
	}
}

func TestNewTLSConfig(t *testing.T) {
	cfg := NewTLSConfig(nil, false)
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("MinVersion = %d, want TLS 1.2 (%d)", cfg.MinVersion, tls.VersionTLS12)
	}
	if cfg.InsecureSkipVerify {
		t.Error("InsecureSkipVerify should be false")
	}

	cfg2 := NewTLSConfig(nil, true)
	if !cfg2.InsecureSkipVerify {
		t.Error("InsecureSkipVerify should be true")
	}
}
