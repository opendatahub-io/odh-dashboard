package api

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	. "github.com/onsi/ginkgo/v2"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
)

var _ = Describe("ResponsesRelayHandler", func() {
	var app App

	BeforeEach(func() {
		logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
		app = App{
			config:       config.EnvConfig{Port: 4000},
			logger:       logger,
			repositories: repositories.NewRepositories(),
		}
	})

	newRelayRequest := func(rawQuery, body string) *http.Request {
		req := httptest.NewRequest(http.MethodPost, "/gen-ai/api/v1/lsd/responses/relay?"+rawQuery, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		identity := &integrations.RequestIdentity{Token: "test-token"}
		return req.WithContext(context.WithValue(req.Context(), constants.RequestIdentityKey, identity))
	}

	It("should return 401 without an authentication identity", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodPost, "/gen-ai/api/v1/lsd/responses/relay?target=%2Fautorag%2Fapi%2Fv1%2Fresponses", strings.NewReader("{}"))
		rr := httptest.NewRecorder()

		app.ResponsesRelayHandler(rr, req, nil)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	It("should return 401 when the identity has no token", func() {
		t := GinkgoT()
		req := httptest.NewRequest(http.MethodPost, "/gen-ai/api/v1/lsd/responses/relay?target=%2Fautorag%2Fapi%2Fv1%2Fresponses", strings.NewReader("{}"))
		req = req.WithContext(context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{}))
		rr := httptest.NewRecorder()

		app.ResponsesRelayHandler(rr, req, nil)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	DescribeTable("should reject invalid target parameters",
		func(rawQuery string) {
			t := GinkgoT()
			// GatewayDomain is set to prove target validation precedes the
			// gateway-configuration check.
			app.config.GatewayDomain = "gateway.example.com"

			req := newRelayRequest(rawQuery, `{"model":"m"}`)
			rr := httptest.NewRecorder()

			app.ResponsesRelayHandler(rr, req, nil)

			assert.Equal(t, http.StatusBadRequest, rr.Code)
			assert.Contains(t, rr.Body.String(), "target")
		},
		Entry("missing target parameter", ""),
		Entry("empty target parameter", "target="),
		Entry("absolute URL target", "target="+url.QueryEscape("https://evil.example/api")),
		Entry("protocol-relative URL target", "target="+url.QueryEscape("//evil.example/api")),
		Entry("target without leading slash", "target="+url.QueryEscape("autorag/api/v1/responses")),
		Entry("dot segment traversal", "target="+url.QueryEscape("/../x")),
		Entry("embedded dot segment traversal", "target="+url.QueryEscape("/autorag/../maas/api")),
		Entry("backslash in target path", "target="+url.QueryEscape(`/\evil.example`)),
		Entry("percent-encoded control character", "target="+url.QueryEscape("/autorag/api/v1/responses%00")),
		Entry("path outside allowed relay prefixes", "target="+url.QueryEscape("/gen-ai/api/v1/lsd/responses")),
	)

	It("should return 503 when the gateway domain is not configured", func() {
		t := GinkgoT()
		req := newRelayRequest("target="+url.QueryEscape("/autorag/api/v1/responses"), `{"model":"m"}`)
		rr := httptest.NewRecorder()

		app.ResponsesRelayHandler(rr, req, nil)

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
		assert.Contains(t, rr.Body.String(), "not configured")
	})

	It("should return 413 when the request body exceeds the size limit", func() {
		t := GinkgoT()
		app.config.GatewayDomain = "gateway.example.com"
		oversized := strings.Repeat("x", 1<<20+1)

		req := newRelayRequest("target="+url.QueryEscape("/autorag/api/v1/responses"), oversized)
		rr := httptest.NewRecorder()

		app.ResponsesRelayHandler(rr, req, nil)

		assert.Equal(t, http.StatusRequestEntityTooLarge, rr.Code)
	})

	It("should relay to the gateway target and stream SSE chunks as separate writes", func() {
		t := GinkgoT()

		var receivedMethod, receivedPath, receivedQuery, receivedAuth, receivedContentType, receivedAccept, receivedBody string
		var receivedForwardedToken string
		upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			receivedMethod = r.Method
			receivedPath = r.URL.Path
			receivedQuery = r.URL.RawQuery
			receivedAuth = r.Header.Get("Authorization")
			receivedForwardedToken = r.Header.Get("x-forwarded-access-token")
			receivedContentType = r.Header.Get("Content-Type")
			receivedAccept = r.Header.Get("Accept")
			body, _ := io.ReadAll(r.Body)
			receivedBody = string(body)

			w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			flusher, ok := w.(http.Flusher)
			fmt.Fprint(w, "data: {\"type\":\"response.created\"}\n\n")
			if ok {
				flusher.Flush()
			}
			// Sleep between chunks so the relay's Read loop sees them as separate reads,
			// making the writeCount > 1 assertion deterministic.
			time.Sleep(20 * time.Millisecond)
			fmt.Fprint(w, "data: {\"type\":\"response.completed\"}\n\n")
			if ok {
				flusher.Flush()
			}
		}))
		defer upstream.Close()

		app.config.GatewayDomain = strings.TrimPrefix(upstream.URL, "https://")
		app.httpClient = upstream.Client()

		target := "/autorag/api/v1/responses?namespace=test-ns&dbSecretName=db&maasSecretName=maas"
		body := `{"model":"granite","input":[]}`
		req := newRelayRequest("target="+url.QueryEscape(target), body)
		crr := &countingResponseRecorder{ResponseRecorder: httptest.NewRecorder()}

		app.ResponsesRelayHandler(crr, req, nil)

		assert.Equal(t, http.StatusOK, crr.Code)
		assert.Contains(t, crr.Header().Get("Content-Type"), "text/event-stream")
		assert.Contains(t, crr.Body.String(), "response.created")
		assert.Contains(t, crr.Body.String(), "response.completed")
		assert.Greater(t, crr.writeCount, 1, "relay must forward upstream chunks as separate writes, not buffer into one")

		assert.Equal(t, http.MethodPost, receivedMethod)
		assert.Equal(t, "/autorag/api/v1/responses", receivedPath)
		assert.Equal(t, "namespace=test-ns&dbSecretName=db&maasSecretName=maas", receivedQuery)
		assert.Equal(t, "Bearer test-token", receivedAuth)
		assert.Equal(t, "test-token", receivedForwardedToken)
		assert.Equal(t, "application/json", receivedContentType)
		assert.Equal(t, "text/event-stream", receivedAccept)
		assert.Equal(t, body, receivedBody)
	})

	It("should honor a scheme-qualified gateway domain for local development", func() {
		t := GinkgoT()

		var receivedPath, receivedQuery string
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			receivedPath = r.URL.Path
			receivedQuery = r.URL.RawQuery
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprint(w, `{"ok":true}`)
		}))
		defer upstream.Close()

		app.config.GatewayDomain = upstream.URL + "/"
		app.httpClient = upstream.Client()

		req := newRelayRequest("target="+url.QueryEscape("/autorag/api/v1/responses?namespace=test-ns"), `{"model":"m"}`)
		rr := httptest.NewRecorder()

		app.ResponsesRelayHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "/autorag/api/v1/responses", receivedPath)
		assert.Equal(t, "namespace=test-ns", receivedQuery)
		assert.JSONEq(t, `{"ok":true}`, rr.Body.String())
	})

	It("should pipe a non-200 upstream error envelope verbatim", func() {
		t := GinkgoT()

		upstreamBody := `{"error":{"code":"404","message":"vector database secret not found"}}`
		upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprint(w, upstreamBody)
		}))
		defer upstream.Close()

		app.config.GatewayDomain = strings.TrimPrefix(upstream.URL, "https://")
		app.httpClient = upstream.Client()

		req := newRelayRequest("target="+url.QueryEscape("/autorag/api/v1/responses"), `{"model":"m"}`)
		rr := httptest.NewRecorder()

		app.ResponsesRelayHandler(rr, req, nil)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Header().Get("Content-Type"), "application/json")
		assert.JSONEq(t, upstreamBody, rr.Body.String())
	})

	It("should return 502 when the relay target is unreachable", func() {
		t := GinkgoT()

		// Reserve a TLS port then release it so dialing the gateway domain fails.
		upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
		upstreamURL := upstream.URL
		upstream.Close()

		app.config.GatewayDomain = strings.TrimPrefix(upstreamURL, "https://")
		app.httpClient = &http.Client{}

		req := newRelayRequest("target="+url.QueryEscape("/autorag/api/v1/responses"), `{"model":"m"}`)
		rr := httptest.NewRecorder()

		app.ResponsesRelayHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadGateway, rr.Code)
		assert.Contains(t, rr.Body.String(), "unreachable")
		// The transport error (with the gateway's address) must stay in server
		// logs, not in the client-facing response.
		assert.NotContains(t, rr.Body.String(), "dial tcp")
	})
})

// relayTestTransport records requests without contacting the configured gateway.
type relayTestTransport func(*http.Request) (*http.Response, error)

func (f relayTestTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func TestResponsesRelayGatewayScheme(t *testing.T) {
	const target = "/autorag/api/v1/responses?namespace=test-ns"
	tests := []struct {
		name    string
		gateway string
		wantURL string
	}{
		{name: "bare remote host", gateway: "gateway.example.com", wantURL: "https://gateway.example.com"},
		{name: "explicit remote HTTPS", gateway: "https://gateway.example.com/", wantURL: "https://gateway.example.com"},
		{name: "trimmed HTTPS", gateway: "  https://gateway.example.com///  ", wantURL: "https://gateway.example.com"},
		{name: "localhost HTTP", gateway: "http://localhost:4001/", wantURL: "http://localhost:4001"},
		{name: "uppercase localhost", gateway: "http://LOCALHOST:4001", wantURL: "http://LOCALHOST:4001"},
		{name: "IPv4 loopback", gateway: "http://127.0.0.1:4001", wantURL: "http://127.0.0.1:4001"},
		{name: "IPv4 loopback range", gateway: "http://127.0.0.2:4001", wantURL: "http://127.0.0.2:4001"},
		{name: "IPv6 loopback", gateway: "http://[::1]:4001/", wantURL: "http://[::1]:4001"},
		{name: "IPv4 mapped loopback", gateway: "http://[::ffff:127.0.0.1]:4001", wantURL: "http://[::ffff:127.0.0.1]:4001"},
		{name: "remote HTTP", gateway: "http://gateway.example.com"},
		{name: "private IPv4 HTTP", gateway: "http://192.168.1.1:4001"},
		{name: "unspecified IPv4 HTTP", gateway: "http://0.0.0.0:4001"},
		{name: "unspecified IPv6 HTTP", gateway: "http://[::]:4001"},
		{name: "remote IPv6 HTTP", gateway: "http://[2001:db8::1]:4001"},
		{name: "localhost suffix", gateway: "http://localhost.example.com:4001"},
		{name: "misleading userinfo", gateway: "http://localhost@gateway.example.com"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			called := false
			app := App{
				config: config.EnvConfig{GatewayDomain: tt.gateway},
				logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
				httpClient: &http.Client{Transport: relayTestTransport(func(r *http.Request) (*http.Response, error) {
					called = true
					assert.Equal(t, tt.wantURL+target, r.URL.String())
					assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
					return &http.Response{
						StatusCode: http.StatusOK,
						Header:     make(http.Header),
						Body:       io.NopCloser(strings.NewReader(`{"ok":true}`)),
					}, nil
				})},
			}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/lsd/responses/relay?target="+url.QueryEscape(target), strings.NewReader("{}"))
			identity := &integrations.RequestIdentity{Token: "test-token"}
			req = req.WithContext(context.WithValue(req.Context(), constants.RequestIdentityKey, identity))
			rr := httptest.NewRecorder()

			app.ResponsesRelayHandler(rr, req, nil)

			if tt.wantURL == "" {
				assert.Equal(t, http.StatusBadRequest, rr.Code)
				assert.Contains(t, rr.Body.String(), "must use HTTPS")
				assert.False(t, called, "invalid gateway must not receive a request")
			} else {
				assert.Equal(t, http.StatusOK, rr.Code)
				assert.True(t, called, "allowed gateway must receive the request")
			}
		})
	}
}

func TestResponsesRelayDoesNotFollowRedirects(t *testing.T) {
	tests := []struct {
		name     string
		status   int
		location string
	}{
		{name: "301 cross-host", status: http.StatusMovedPermanently, location: "https://other.example/responses"},
		{name: "302 cross-host", status: http.StatusFound, location: "https://other.example/responses"},
		{name: "303 cross-host", status: http.StatusSeeOther, location: "https://other.example/responses"},
		{name: "307 cross-host", status: http.StatusTemporaryRedirect, location: "https://other.example/responses"},
		{name: "308 cross-host", status: http.StatusPermanentRedirect, location: "https://other.example/responses"},
		{name: "HTTPS downgrade", status: http.StatusTemporaryRedirect, location: "http://gateway.example.com/responses"},
		{name: "same-origin", status: http.StatusTemporaryRedirect, location: "/autorag/api/v1/redirected"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			requests := 0
			app := App{
				config: config.EnvConfig{GatewayDomain: "gateway.example.com"},
				logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
				httpClient: &http.Client{Transport: relayTestTransport(func(r *http.Request) (*http.Response, error) {
					requests++
					if requests > 1 {
						return &http.Response{StatusCode: http.StatusOK, Header: make(http.Header), Body: http.NoBody}, nil
					}
					assert.Equal(t, "https://gateway.example.com/autorag/api/v1/responses", r.URL.String())
					assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
					assert.Equal(t, "test-token", r.Header.Get("x-forwarded-access-token"))
					return &http.Response{
						StatusCode: tt.status,
						Header:     http.Header{"Location": {tt.location}},
						Body:       io.NopCloser(strings.NewReader("redirect response")),
					}, nil
				})},
			}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/lsd/responses/relay?target="+url.QueryEscape("/autorag/api/v1/responses"), strings.NewReader("{}"))
			identity := &integrations.RequestIdentity{Token: "test-token"}
			req = req.WithContext(context.WithValue(req.Context(), constants.RequestIdentityKey, identity))
			rr := httptest.NewRecorder()

			app.ResponsesRelayHandler(rr, req, nil)

			assert.Equal(t, 1, requests, "redirect destination must not receive a request")
			assert.Equal(t, tt.status, rr.Code)
			assert.Equal(t, "redirect response", rr.Body.String())
			assert.Empty(t, rr.Header().Get("Location"))
		})
	}
}
