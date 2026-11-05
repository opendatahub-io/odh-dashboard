package proxy

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"syscall"
	"testing"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestWebSocketHandshakeFailurePreservesKubernetesStatus(t *testing.T) {
	for _, status := range []int{401, 403, 404, 429, 503} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			audit := uuid.NewString()
			var outboundID string
			backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				outboundID = r.Header.Get(httpcontract.RequestIDHeader)
				w.Header().Set(httpcontract.AuditIDHeader, audit)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(status)
				_, _ = fmt.Fprintf(w, `{"kind":"Status","apiVersion":"v1","code":%d,"message":"CANARY_TOKEN CANARY_SECRET"}`, status)
			}))
			defer backend.Close()
			var logs bytes.Buffer
			logger := slog.New(slog.NewJSONHandler(&logs, nil))
			tracker := NewConnectionTracker(logger)
			defer tracker.Stop()
			cfg := testWsConfig(backend.URL, tracker)
			cfg.Logger = logger
			handler, err := NewWsProxyHandler(cfg)
			require.NoError(t, err)
			server := httptest.NewServer(httpcontract.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handler.ServeHTTP(w, r.WithContext(identityContext(r, "CANARY_TOKEN")))
			})))
			defer server.Close()
			c, resp, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/wss/k8s/api/v1/pods", nil)
			require.Error(t, err)
			require.Nil(t, c)
			require.NotNil(t, resp)
			defer resp.Body.Close()
			require.Equal(t, status, resp.StatusCode)
			b, err := io.ReadAll(resp.Body)
			require.NoError(t, err)
			var s metav1.Status
			require.NoError(t, json.Unmarshal(b, &s))
			require.Equal(t, "Status", s.Kind)
			require.Equal(t, status, int(s.Code))
			require.Equal(t, outboundID, resp.Header.Get(httpcontract.RequestIDHeader))
			require.NotEmpty(t, outboundID)
			require.Equal(t, audit, resp.Header.Get(httpcontract.AuditIDHeader))
			require.NotContains(t, string(b)+logs.String(), "CANARY")
		})
	}
}

func identityContext(r *http.Request, token string) context.Context {
	return context.WithValue(r.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: k8s.NewBearerToken(token)})
}

func TestLocalWebSocketRejectionsUseBFFEnvelope(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()
	cfg := testWsConfig("http://127.0.0.1:1", tracker)
	cfg.AllowedOrigins = []string{"https://allowed.example"}
	handler, err := NewWsProxyHandler(cfg)
	require.NoError(t, err)
	for _, tc := range []struct {
		identity, upgrade bool
		status            int
	}{{false, false, 401}, {true, false, 400}, {true, true, 403}} {
		r := httptest.NewRequest("GET", "/wss/k8s/api/v1/pods", nil)
		if tc.identity {
			r = r.WithContext(identityContext(r, "CANARY_TOKEN"))
		}
		if tc.upgrade {
			r.Header.Set("Connection", "Upgrade")
			r.Header.Set("Upgrade", "websocket")
			r.Header.Set("Origin", "https://forbidden.example")
		}
		w := httptest.NewRecorder()
		httpcontract.Middleware(handler).ServeHTTP(w, r)
		require.Equal(t, tc.status, w.Code)
		var e httpcontract.HTTPError
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &e))
		require.Equal(t, w.Header().Get(httpcontract.RequestIDHeader), e.Error.RequestID)
	}
}

func TestCompressedHTTPWatchErrorsAreSanitized(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Contains(t, r.Header.Get("Accept-Encoding"), "gzip")
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Encoding", "gzip")
		body := gzip.NewWriter(w)
		_, _ = io.WriteString(body, `{"type":"ERROR","object":{"kind":"Status","reason":"Expired","code":410,"message":"CANARY"}}`+"\n")
		_ = body.Close()
	}))
	defer backend.Close()
	handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
	require.NoError(t, err)
	request := httptest.NewRequest("GET", "/api/k8s/api/v1/pods?watch=true", nil)
	request.Header.Set("Accept-Encoding", "gzip")
	w := httptest.NewRecorder()
	httpcontract.Middleware(handler).ServeHTTP(w, request)
	require.Equal(t, 200, w.Code)
	require.Empty(t, w.Header().Get("Content-Encoding"))
	require.NotContains(t, w.Body.String(), "CANARY")
	require.Contains(t, w.Body.String(), `"code":410`)
	require.Contains(t, w.Body.String(), `"reason":"Expired"`)
}

func TestWebSocketDialFailureContract(t *testing.T) {
	for _, tc := range []struct {
		name   string
		cause  error
		status int
	}{
		{"timeout", &net.DNSError{Err: "CANARY", IsTimeout: true}, 504},
		{"unavailable", &net.OpError{Op: "dial", Err: syscall.ECONNREFUSED}, 503},
		{"transport", fmt.Errorf("CANARY: %w", io.ErrUnexpectedEOF), 502},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var logs bytes.Buffer
			logger := slog.New(slog.NewJSONHandler(&logs, nil))
			tracker := NewConnectionTracker(logger)
			defer tracker.Stop()
			cfg := testWsConfig("http://upstream.invalid", tracker)
			cfg.Logger = logger
			handler, err := NewWsProxyHandler(cfg)
			require.NoError(t, err)
			handler.(*wsProxy).netDialContext = func(context.Context, string, string) (net.Conn, error) { return nil, tc.cause }
			server := httptest.NewServer(httpcontract.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handler.ServeHTTP(w, r.WithContext(identityContext(r, "CANARY_TOKEN")))
			})))
			defer server.Close()
			c, resp, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/wss/k8s/api/v1/pods", nil)
			require.Error(t, err)
			require.Nil(t, c)
			require.NotNil(t, resp)
			defer resp.Body.Close()
			require.Equal(t, tc.status, resp.StatusCode)
			var body httpcontract.HTTPError
			require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
			require.Equal(t, resp.Header.Get(httpcontract.RequestIDHeader), body.Error.RequestID)
			require.Contains(t, logs.String(), body.Error.RequestID)
			require.NotContains(t, body.Error.Message+logs.String(), "CANARY")
		})
	}
}

func TestLongWebSocketRejectionsPreserveStatus(t *testing.T) {
	for _, secure := range []bool{false, true} {
		for _, tc := range []struct {
			code   int32
			reason metav1.StatusReason
		}{
			{410, metav1.StatusReasonExpired}, {422, metav1.StatusReasonInvalid}, {429, metav1.StatusReasonTooManyRequests},
		} {
			t.Run(fmt.Sprintf("tls=%v/status=%d", secure, tc.code), func(t *testing.T) {
				var requests atomic.Int32
				upstreamHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					requests.Add(1)
					w.Header().Set("Content-Type", "application/json")
					w.Header().Set(httpcontract.AuditIDHeader, "2895b0a0-7694-47d0-8cb4-869b93fe68be")
					w.WriteHeader(int(tc.code))
					_ = json.NewEncoder(w).Encode(metav1.Status{
						TypeMeta: metav1.TypeMeta{Kind: "Status", APIVersion: "v1"},
						Code:     tc.code, Status: metav1.StatusFailure, Reason: tc.reason,
						Message: strings.Repeat("CANARY ", 1000),
						Details: &metav1.StatusDetails{
							RetryAfterSeconds: 7,
							Causes:            []metav1.StatusCause{{Type: metav1.CauseTypeFieldValueInvalid, Field: "spec.containers[1].image", Message: "CANARY_VALUE"}},
						},
					})
				})
				upstream := httptest.NewUnstartedServer(upstreamHandler)
				if secure {
					upstream.StartTLS()
				} else {
					upstream.Start()
				}
				defer upstream.Close()
				tracker := NewConnectionTracker(testLogger())
				defer tracker.Stop()
				cfg := testWsConfig(upstream.URL, tracker)
				if secure {
					cfg.RootCAs = upstream.Client().Transport.(*http.Transport).TLSClientConfig.RootCAs
				}
				handler, err := NewWsProxyHandler(cfg)
				require.NoError(t, err)
				r := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods?watch=true", nil)
				r.Header.Set("Connection", "Upgrade")
				r.Header.Set("Upgrade", "websocket")
				r.Header.Set("Origin", "https://example.test")
				r = r.WithContext(identityContext(r, "test-token"))
				response := httptest.NewRecorder()
				httpcontract.Middleware(handler).ServeHTTP(response, r)
				var got metav1.Status
				require.NoError(t, json.Unmarshal(response.Body.Bytes(), &got))
				require.Equal(t, int(tc.code), response.Code)
				require.Equal(t, tc.reason, got.Reason)
				require.NotNil(t, got.Details)
				require.Equal(t, int32(7), got.Details.RetryAfterSeconds)
				require.Equal(t, "spec.containers[1].image", got.Details.Causes[0].Field)
				require.Equal(t, "7", response.Header().Get("Retry-After"))
				require.Equal(t, "2895b0a0-7694-47d0-8cb4-869b93fe68be", response.Header().Get(httpcontract.AuditIDHeader))
				require.NotContains(t, response.Body.String(), "CANARY")
				require.Equal(t, int32(1), requests.Load(), "the upgrade request must never be replayed")
			})
		}
	}
}

func TestProxyCancellationIsNotLoggedAsFailure(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, &slog.HandlerOptions{Level: slog.LevelDebug}))
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	request := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods", nil).WithContext(ctx)
	response := httptest.NewRecorder()
	handler := ProxyConfig{Logger: logger}.errorHandler()
	require.PanicsWithValue(t, http.ErrAbortHandler, func() { handler(response, request, context.Canceled) })
	require.Empty(t, response.Body.String())
	require.Contains(t, logs.String(), `"level":"DEBUG"`)
	require.Contains(t, logs.String(), `"code":"CANCELED"`)
	require.NotContains(t, logs.String(), `"level":"ERROR"`)
}

func TestHTTPWatchNegotiatesJSONAndRejectsUnsupportedMediaTypes(t *testing.T) {
	const protobuf = "application/vnd.kubernetes.protobuf"
	for _, contentType := range []string{protobuf, "application/json-seq", "text/plain", "", "application/json; charset=utf-8"} {
		t.Run(contentType, func(t *testing.T) {
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				require.Equal(t, constants.ContentTypeJSON, r.Header.Get(constants.HeaderAccept))
				w.Header()[constants.HeaderContentType] = []string{contentType}
				_, _ = io.WriteString(w, `{"type":"ERROR","object":{"code":410,"message":"CANARY_SECRET"}}`+"\n")
			}))
			defer upstream.Close()
			handler, err := NewK8sProxyHandler(testK8sProxyConfig(upstream.URL))
			require.NoError(t, err)
			request := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods?watch=true", nil)
			request.Header.Set(constants.HeaderAccept, protobuf)
			request = request.WithContext(identityContext(request, "test-token"))
			response := httptest.NewRecorder()
			httpcontract.Middleware(handler, slog.Default()).ServeHTTP(response, request)
			if contentType == "application/json; charset=utf-8" {
				require.Equal(t, http.StatusOK, response.Code)
				require.Contains(t, response.Body.String(), `"code":410`)
			} else {
				require.Equal(t, http.StatusBadGateway, response.Code)
				var status metav1.Status
				require.NoError(t, json.Unmarshal(response.Body.Bytes(), &status))
				require.Equal(t, metav1.StatusReason("DashboardProxyError"), status.Reason)
				require.Equal(t, metav1.CauseType("BAD_GATEWAY"), status.Details.Causes[0].Type)
			}
			require.NotContains(t, response.Body.String(), "CANARY")
		})
	}
}

func TestNonWatchAcceptHeaderIsPreserved(t *testing.T) {
	const protobuf = "application/vnd.kubernetes.protobuf"
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, protobuf, r.Header.Get(constants.HeaderAccept))
		w.Header().Set(constants.HeaderContentType, protobuf)
		_, _ = io.WriteString(w, "resource bytes")
	}))
	defer upstream.Close()
	handler, err := NewK8sProxyHandler(testK8sProxyConfig(upstream.URL))
	require.NoError(t, err)
	request := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods?watch=false", nil)
	request.Header.Set(constants.HeaderAccept, protobuf)
	request = request.WithContext(identityContext(request, "test-token"))
	response := httptest.NewRecorder()
	httpcontract.Middleware(handler, slog.Default()).ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code)
	require.Equal(t, "resource bytes", response.Body.String())
}
