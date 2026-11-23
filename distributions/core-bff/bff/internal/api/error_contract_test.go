package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path"
	"strings"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/google/uuid"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8sclient "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

func TestProductionAuthFailureContract(t *testing.T) {
	spec, err := openapi3.NewLoader().LoadFromFile("../../openapi/src/core-bff.yaml")
	require.NoError(t, err)
	for _, tc := range []struct {
		path                           string
		upstreamStatus, responseStatus int
	}{
		{"/api/v1/user", 401, 401},
		{"/api/v1/user", 403, 403},
		{"/api/v1/user", 429, 429},
		{"/api/v1/user", 500, 500},
		{"/api/v1/user", 503, 503},
		{"/api/v1/user", 504, 504},
		{"/api/components", 403, 403},
		{"/api/components", 429, 429},
		{"/api/v1/user", 201, 401},
	} {
		t.Run(fmt.Sprintf("%s/upstream=%d", tc.path, tc.upstreamStatus), func(t *testing.T) {
			status := tc.upstreamStatus
			audit := uuid.NewString()
			var outboundID string
			upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				require.Equal(t, "/apis/authentication.k8s.io/v1/selfsubjectreviews", r.URL.Path)
				require.Equal(t, "Bearer CANARY_TOKEN", r.Header.Get("Authorization"))
				outboundID = r.Header.Get(httpcontract.RequestIDHeader)
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set(httpcontract.AuditIDHeader, audit)
				w.WriteHeader(status)
				if status == http.StatusCreated {
					_, _ = w.Write([]byte(`{"apiVersion":"authentication.k8s.io/v1","kind":"SelfSubjectReview","status":{"userInfo":{"groups":["CANARY_GROUP"]}}}`))
					return
				}
				_, _ = fmt.Fprintf(w, `{"kind":"Status","apiVersion":"v1","status":"Failure","code":%d,"message":"CANARY_TOKEN CANARY_SECRET unrelated-user","reason":"%s"}`, status, map[int]string{401: "Unauthorized", 403: "Forbidden", 429: "TooManyRequests", 500: "InternalError", 503: "ServiceUnavailable", 504: "Timeout"}[status])
			}))
			defer upstream.Close()
			var logs bytes.Buffer
			logger := slog.New(slog.NewJSONHandler(&logs, &slog.HandlerOptions{Level: slog.LevelDebug}))
			factory := k8s.NewTokenClientFactory(logger, config.EnvConfig{AuthTokenHeader: "X-Custom-Credential"}).(*k8s.TokenClientFactory) //nolint:gosec // G101: header name, not a credential.
			// The only injected boundary is the upstream location/TLS transport. Identity extraction,
			// SSR implementation, typed REST decoding and production auth middleware are real.
			factory.NewTokenKubernetesClientFn = func(ctx context.Context, token string, l *slog.Logger) (k8s.KubernetesClientInterface, error) {
				cfg := &rest.Config{Host: upstream.URL, BearerToken: token, Transport: upstream.Client().Transport}
				cfg.Wrap(httpcontract.WrapTransport)
				client, err := k8sclient.NewForConfig(cfg)
				return &k8s.TokenKubernetesClient{SharedClientLogic: k8s.SharedClientLogic{Client: client, Logger: l, RestConfig: cfg}}, err
			}
			app := newTestApp(func(a *App) {
				a.logger = logger
				a.kubernetesClientFactory = factory
				a.config.AuthTokenHeader = "X-Custom-Credential"
				a.config.AuthMethod = config.AuthMethodUser
			})
			r := httptest.NewRequest("GET", tc.path+"?token=CANARY_QUERY", nil)
			r.Header.Set("X-Custom-Credential", "CANARY_TOKEN")
			r.Header.Set("Cookie", "CANARY_COOKIE")
			r.Header.Set("Sec-WebSocket-Protocol", "CANARY_SUBPROTOCOL")
			w := httptest.NewRecorder()
			app.Routes().ServeHTTP(w, r)
			require.Equal(t, tc.responseStatus, w.Code)
			if status == http.StatusCreated {
				// Unresolved identity is unauthorized; actual SSR request failures retain their cause.
				var failure HTTPError
				require.NoError(t, json.Unmarshal(w.Body.Bytes(), &failure))
				require.Equal(t, "UNAUTHORIZED", failure.Error.Code)
			} else if strings.HasPrefix(tc.path, constants.VersionedAPIPrefix) {
				// Versioned endpoints keep the BFF envelope while preserving upstream
				// status; versioned clients cannot parse a bare Kubernetes Status.
				var failure HTTPError
				require.NoError(t, json.Unmarshal(w.Body.Bytes(), &failure))
				require.Equal(t, map[int]string{401: "UNAUTHORIZED", 403: "FORBIDDEN", 429: "TOO_MANY_REQUESTS", 500: "INTERNAL_SERVER_ERROR", 503: "SERVICE_UNAVAILABLE", 504: "GATEWAY_TIMEOUT"}[status], failure.Error.Code)
				require.Equal(t, w.Header().Get(httpcontract.RequestIDHeader), failure.Error.RequestID)
			} else {
				var failure metav1.Status
				require.NoError(t, json.Unmarshal(w.Body.Bytes(), &failure))
				require.Equal(t, "Status", failure.Kind)
				require.NotEmpty(t, failure.Message)
			}
			operationResponse := spec.Paths.Value(tc.path).Get.Responses.Status(tc.responseStatus)
			require.NotNil(t, operationResponse, "the operation must document the upstream status")
			var body any
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			require.NoError(t, operationResponse.Value.Content.Get("application/json").Schema.Value.VisitJSON(body))
			require.Equal(t, audit, w.Header().Get(httpcontract.AuditIDHeader))
			require.Equal(t, outboundID, w.Header().Get(httpcontract.RequestIDHeader))
			require.Contains(t, logs.String(), outboundID)
			require.NotContains(t, w.Body.String()+logs.String(), "CANARY")
			require.NotContains(t, w.Body.String()+logs.String(), "unrelated-user")
		})
	}
}

func TestPersesProxyFailuresRemainDisplayable(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_, _ = io.WriteString(w, `{"error":"upstream Perses denial"}`)
	}))
	defer upstream.Close()
	app := newTestApp()
	app.moduleProxies = []moduleProxyHandler{{
		path:    "/perses/api",
		handler: createTestProxy(t, app, upstream.URL, "/perses/api", "", true, false, nil),
	}}
	routes := app.Routes()
	response := httptest.NewRecorder()
	routes.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/perses/api/api/v1/projects", nil))
	require.Equal(t, http.StatusForbidden, response.Code)
	require.Equal(t, `{"error":"upstream Perses denial"}`, response.Body.String())

	upstream.Close()
	for _, prefix := range []string{"", PathPrefix} {
		for _, authenticated := range []bool{true, false} {
			app.config.AuthMethod = config.AuthMethodDisabled
			wantStatus := http.StatusServiceUnavailable
			if !authenticated {
				app.config.AuthMethod = config.AuthMethodUser
				wantStatus = http.StatusUnauthorized
			}
			response = httptest.NewRecorder()
			app.Routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, prefix+"/perses/api/api/v1/projects", nil))
			require.Equal(t, wantStatus, response.Code)
			var body map[string]string
			require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
			require.NotEmpty(t, body["error"])
			require.Equal(t, body["message"], body["error"])
			require.Equal(t, response.Header().Get(httpcontract.RequestIDHeader), body["requestId"])
		}
	}
}

func TestNativeLocalFailuresRemainDisplayable(t *testing.T) {
	app := newTestApp()
	for _, prefix := range []string{"", PathPrefix} {
		t.Run(prefix+"/api/cluster-settings", func(t *testing.T) {
			response := httptest.NewRecorder()
			app.UpdateClusterSettingsHandler(response, httptest.NewRequest(http.MethodPut,
				prefix+ClusterSettingsPath, strings.NewReader(`{"pvcSize":0}`)), nil)
			require.Equal(t, http.StatusBadRequest, response.Code)
			var body map[string]string
			require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
			// updateClusterSettings reads response.data.message without a fallback.
			require.Equal(t, "invalid request", body["message"])
			require.Equal(t, response.Header().Get(httpcontract.RequestIDHeader), body["requestId"])
		})
		t.Run(prefix+"/api/components/remove", func(t *testing.T) {
			response := httptest.NewRecorder()
			app.RemoveComponentHandler(response, httptest.NewRequest(http.MethodGet,
				prefix+ComponentsRemovePath, nil), nil)
			require.Equal(t, http.StatusBadRequest, response.Code)
			var body map[string]string
			require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
			// removeComponent constructs an Error directly from response.data.error.
			require.Equal(t, "invalid request", body["error"])
		})
	}
}

func TestEarlyErrorsAndPanicHaveCorrelation(t *testing.T) {
	app := newTestApp()
	for _, path := range []string{"/api", "/core-bff", "/core-bff/api", "/api/unknown", "/core-bff/api/unknown"} {
		w := httptest.NewRecorder()
		app.Routes().ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		require.NotEmpty(t, w.Header().Get(httpcontract.RequestIDHeader))
		var body map[string]any
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
		payload := body
		if nested, ok := body["error"].(map[string]any); ok {
			payload = nested
		}
		require.Equal(t, w.Header().Get(httpcontract.RequestIDHeader), payload["requestId"])
	}
	h := httpcontract.Middleware(app.EnableTelemetry(app.RecoverPanic(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("CANARY") }))))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	require.Equal(t, 500, w.Code)
	require.Contains(t, w.Body.String(), w.Header().Get(httpcontract.RequestIDHeader))
	require.NotContains(t, w.Body.String(), "CANARY")
}

func TestStreamingPanicAbortsWithoutAppendingJSON(t *testing.T) {
	app := newTestApp()
	h := httpcontract.Middleware(app.RecoverPanic(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("event\n")); panic("CANARY") })))
	w := httptest.NewRecorder()
	require.PanicsWithValue(t, http.ErrAbortHandler, func() { h.ServeHTTP(w, httptest.NewRequest("GET", "/", nil)) })
	require.Equal(t, "event\n", w.Body.String())
	h = httpcontract.Middleware(app.RecoverPanic(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic(http.ErrAbortHandler) })))
	require.PanicsWithValue(t, http.ErrAbortHandler, func() { h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/", nil)) })
}

func TestCorrelationCORSAndMissingCredentials(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AllowedOrigins = []string{"https://browser.example"}
		a.config.AuthMethod = config.AuthMethodUser
	})
	for _, credential := range []string{"", " ", "\t"} {
		r := httptest.NewRequest("GET", "/api/config", nil)
		r.Header.Set("Origin", "https://browser.example")
		r.Header.Set(app.config.AuthTokenHeader, credential)
		w := httptest.NewRecorder()
		app.Routes().ServeHTTP(w, r)
		require.Equal(t, 401, w.Code)
		require.Contains(t, w.Header().Get("Access-Control-Expose-Headers"), "X-Request-Id")
		require.Contains(t, w.Header().Get("Access-Control-Expose-Headers"), "Audit-Id")
	}
}

// Keep a real truncated upstream body test separate from recorder-only commitment tests.
func TestProxyStreamFailureThroughRecovery(t *testing.T) {
	first := "{\"type\":\"BOOKMARK\",\"object\":{}}\n"
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "999")
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, first+`{"type":"ERROR","object":{"message":"CANARY_SECRET"`)
		w.(http.Flusher).Flush()
	}))
	defer upstream.Close()
	app := newTestApp()
	handler, err := proxy.NewK8sProxyHandler(proxy.K8sProxyConfig{K8sHost: upstream.URL, AllowHTTP: true, Logger: app.logger})
	require.NoError(t, err)
	server := httptest.NewServer(httpcontract.Middleware(app.RecoverPanic(handler)))
	defer server.Close()
	resp, err := server.Client().Get(server.URL + "/api/k8s/api/v1/pods?watch=true")
	require.NoError(t, err)
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	require.ErrorIs(t, err, io.ErrUnexpectedEOF)
	require.Equal(t, first, string(b))
	require.Equal(t, 200, resp.StatusCode)
}

func TestEncodedDotSegmentsKeepProxyErrorsConservative(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/api/v1/namespaces/project/secrets", path.Clean(r.URL.Path))
		w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = io.WriteString(w, `{"kind":"Status","apiVersion":"v1","status":"Failure","code":422,"reason":"Invalid","message":"CANARY_SECRET","details":{"name":"CANARY_NAME","causes":[{"reason":"FieldValueInvalid","field":"data[CANARY_KEY]","message":"CANARY_SECRET"}]}}`)
	}))
	defer upstream.Close()
	app := newTestApp()
	var err error
	app.k8sProxy, err = proxy.NewK8sProxyHandler(proxy.K8sProxyConfig{K8sHost: upstream.URL, AllowHTTP: true, Logger: app.logger})
	require.NoError(t, err)
	routes := app.Routes()
	for _, prefix := range []string{"", constants.BFFPathPrefix} {
		for _, encodedPath := range []string{
			"/api/k8s/api/v1/%2e/namespaces/project/secrets",
			"/api/k8s/api/v1/namespaces/project/pods/%2E%2E/secrets",
		} {
			t.Run(prefix+encodedPath, func(t *testing.T) {
				request := httptest.NewRequest(http.MethodGet, prefix+encodedPath, nil)
				require.NotEmpty(t, request.URL.RawPath)
				response := httptest.NewRecorder()
				routes.ServeHTTP(response, request)
				require.Equal(t, http.StatusUnprocessableEntity, response.Code)
				require.NotContains(t, response.Body.String(), "CANARY")
				var status metav1.Status
				require.NoError(t, json.Unmarshal(response.Body.Bytes(), &status))
				require.Equal(t, metav1.StatusReasonInvalid, status.Reason)
				require.Equal(t, "data", status.Details.Causes[0].Field)
			})
		}
	}
}

func TestRoutineRejectionsLogAtWarn(t *testing.T) {
	for _, status := range []int{400, 401, 403} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			var logs bytes.Buffer
			logger := slog.New(slog.NewJSONHandler(&logs, nil))
			app := newTestApp(func(a *App) { a.logger = logger })
			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/api/config", nil)
			err := fmt.Errorf("CANARY_SECRET")
			switch status {
			case 400:
				app.badRequestResponse(response, request, err)
			case 401:
				app.unauthorizedResponse(response, request, err)
			case 403:
				app.forbiddenResponse(response, request, err)
			}
			require.Equal(t, status, response.Code)
			require.Contains(t, logs.String(), `"level":"WARN"`)
			require.NotContains(t, logs.String(), `"level":"ERROR"`)
			require.NotContains(t, logs.String()+response.Body.String(), "CANARY")
		})
	}
}

func TestRequestLogSeverityFollowsCause(t *testing.T) {
	for _, tc := range []struct {
		name     string
		cause    error
		canceled bool
		level    string
	}{
		{"upstream denial", k8serrors.NewForbidden(schema.GroupResource{Resource: "secrets"}, "CANARY_NAME", fmt.Errorf("CANARY_SECRET")), false, "WARN"},
		{"credential failure", httpcontract.ErrCredentialsInvalid, false, "WARN"},
		{"unexpected", fmt.Errorf("CANARY_SECRET"), false, "ERROR"},
		{"cancellation", context.Canceled, false, "DEBUG"},
		{"disconnected request", fmt.Errorf("CANARY_SECRET"), true, "DEBUG"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var logs bytes.Buffer
			logger := slog.New(slog.NewJSONHandler(&logs, &slog.HandlerOptions{Level: slog.LevelDebug}))
			app := newTestApp(func(a *App) { a.logger = logger })
			request := httptest.NewRequest(http.MethodGet, "/api/config", nil)
			if tc.canceled {
				ctx, cancel := context.WithCancel(request.Context())
				cancel()
				request = request.WithContext(ctx)
			}
			app.LogError(request, tc.cause)
			require.Contains(t, logs.String(), `"level":"`+tc.level+`"`)
			require.NotContains(t, logs.String(), "CANARY")
		})
	}
}

func TestPanicDiagnosticsAreBoundedAndSafe(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	app := newTestApp(func(a *App) { a.logger = logger })
	handler := httpcontract.Middleware(app.RecoverPanic(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("CANARY_SECRET") })), logger)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))
	require.Equal(t, 500, response.Code)
	var event struct {
		Level     string   `json:"level"`
		Stack     []string `json:"stack_trace"`
		RequestID string   `json:"request_id"`
	}
	require.NoError(t, json.Unmarshal(logs.Bytes(), &event))
	require.Equal(t, "ERROR", event.Level)
	require.NotEmpty(t, event.Stack)
	require.LessOrEqual(t, len(event.Stack), maxPanicStackFrames)
	require.Contains(t, strings.Join(event.Stack, "\n"), "TestPanicDiagnosticsAreBoundedAndSafe")
	require.Equal(t, response.Header().Get(httpcontract.RequestIDHeader), event.RequestID)
	require.NotContains(t, logs.String()+response.Body.String(), "CANARY")
}

func TestCORSPreflightsCoverPublicAndEarlyErrors(t *testing.T) {
	app := newTestApp(func(a *App) { a.config.AllowedOrigins = []string{"https://browser.example"} })
	for _, path := range []string{"/healthcheck", "/core-bff/openapi.json", "/navigation", "/api", "/core-bff", "/core-bff/api"} {
		t.Run(path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodOptions, path, nil)
			request.Header.Set("Origin", "https://browser.example")
			request.Header.Set("Access-Control-Request-Method", http.MethodGet)
			response := httptest.NewRecorder()
			app.Routes().ServeHTTP(response, request)
			require.Equal(t, http.StatusNoContent, response.Code)
			require.Equal(t, "https://browser.example", response.Header().Get("Access-Control-Allow-Origin"))
			require.NotEmpty(t, response.Header().Get(httpcontract.RequestIDHeader))
		})
	}
	app = newTestApp()
	request := httptest.NewRequest(http.MethodOptions, "/api", nil)
	request.Header.Set("Origin", "https://browser.example")
	request.Header.Set("Access-Control-Request-Method", http.MethodGet)
	response := httptest.NewRecorder()
	app.Routes().ServeHTTP(response, request)
	require.Equal(t, http.StatusNotFound, response.Code)
	require.Empty(t, response.Header().Get("Access-Control-Allow-Origin"))
}
