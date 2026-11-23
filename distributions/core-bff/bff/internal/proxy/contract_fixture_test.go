//go:build contract

package proxy

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/scheme"
)

const contractFixtureAuditID = "2895b0a0-7694-47d0-8cb4-869b93fe68be"

// TestContractFixtureServer is an opt-in HTTP fixture for the central Jest runner.
// Ordinary Go test runs skip it; contract builds contain no production entry point.
func TestContractFixtureServer(t *testing.T) {
	if os.Getenv("CONTRACT_FIXTURE_SERVER") != "true" {
		t.Skip("managed by the central contract runner")
	}
	logger := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	upstream := httptest.NewServer(http.HandlerFunc(contractUpstreamResponse))
	t.Cleanup(upstream.Close)
	cfg := testK8sProxyConfig(upstream.URL)
	cfg.Logger = logger
	cfg.AuthTokenHeader = "X-Test-Auth"
	handler, err := NewK8sProxyHandler(cfg)
	require.NoError(t, err)
	injectFailures := func(reverse *httputil.ReverseProxy) {
		correlationTransport := reverse.Transport.(httpcontract.Transport)
		transport := correlationTransport.Base.(*http.Transport)
		t.Cleanup(transport.CloseIdleConnections)
		correlationTransport.Base = contractFixtureTransport{base: transport}
		reverse.Transport = correlationTransport
	}
	injectFailures(handler.(*httputil.ReverseProxy))
	target, err := url.Parse(upstream.URL)
	require.NoError(t, err)
	modelServing, err := NewReverseProxy(ProxyConfig{
		TargetURL: target, AllowHTTP: true, Logger: logger,
		PathRewriteFn: func(r *http.Request) string {
			return strings.TrimPrefix(r.URL.Path, "/api/service/model-serving")
		},
	})
	require.NoError(t, err)
	injectFailures(modelServing)
	tracker := NewConnectionTracker(logger)
	t.Cleanup(tracker.Stop)
	wsCfg := testWsConfig(upstream.URL, tracker)
	wsCfg.Logger = logger
	ws, err := NewWsProxyHandler(wsCfg)
	require.NoError(t, err)
	mux := http.NewServeMux()
	mux.Handle("/api/service/model-serving/", modelServing)
	mux.Handle("/api/k8s/", handler)
	mux.Handle("/core-bff/api/k8s/", http.StripPrefix("/core-bff", handler))
	mux.Handle("/wss/k8s/", ws)
	mux.Handle("/core-bff/wss/k8s/", http.StripPrefix("/core-bff", ws))
	mux.HandleFunc("GET /healthcheck", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	// Identity is a fixture input; these cases verify failure representation, not token validation.
	fixture := httpcontract.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mux.ServeHTTP(w, r.WithContext(identityContext(r, "contract-fixture-token")))
	}), logger)
	server := httptest.NewServer(fixture)
	t.Cleanup(server.Close)
	// Jest reads the URL, checks /healthcheck, and sends SIGTERM during teardown.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	fmt.Println(server.URL)
	<-ctx.Done()
}

type contractFixtureTransport struct {
	base http.RoundTripper
}

func (t contractFixtureTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	switch r.URL.Path {
	case "/transport/timeout":
		return nil, &net.DNSError{Err: "fixture timeout", IsTimeout: true}
	case "/transport/unavailable":
		return nil, &net.OpError{Op: "dial", Net: "tcp", Err: syscall.ECONNREFUSED}
	case "/transport/bad-gateway":
		return nil, io.ErrUnexpectedEOF
	default:
		return t.base.RoundTrip(r)
	}
}

func contractUpstreamResponse(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/apis/example.io/v1/namespaces/project/widgets/") {
		contractCompatibilityResponse(w, r)
		return
	}
	if strings.HasPrefix(r.URL.Path, "/upstream-failure/") {
		code, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/upstream-failure/"))
		if err != nil || (code != http.StatusServiceUnavailable && code != http.StatusGatewayTimeout) {
			http.NotFound(w, r)
			return
		}
		body := `{"detail":"upstream service failure"}`
		contentType := constants.ContentTypeJSON
		if r.URL.Query().Get("format") == "text" {
			body = "upstream service failure"
			contentType = "text/plain"
		}
		w.Header().Set(constants.HeaderContentType, contentType)
		w.WriteHeader(code)
		_, _ = io.WriteString(w, body)
		return
	}
	if r.URL.Path == "/diagnostics/webhook" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(metav1.Status{
			TypeMeta: metav1.TypeMeta{APIVersion: "v1", Kind: "Status"},
			Status:   metav1.StatusFailure, Code: 403, Reason: metav1.StatusReasonForbidden,
			Message: "webhook denied: CANARY_ONLY_UPSTREAM_SECRET",
		})
		return
	}
	if r.URL.Path == "/diagnostics/validation" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		_ = json.NewEncoder(w).Encode(metav1.Status{
			TypeMeta: metav1.TypeMeta{APIVersion: "v1", Kind: "Status"},
			Status:   metav1.StatusFailure, Code: 422, Reason: metav1.StatusReasonInvalid,
			Message: "spec.replicas is invalid: CANARY_ONLY_UPSTREAM_SECRET",
			Details: &metav1.StatusDetails{Name: "CANARY_NAME", Causes: []metav1.StatusCause{
				{Type: metav1.CauseTypeFieldValueInvalid, Field: "spec.replicas", Message: "CANARY_ONLY_UPSTREAM_SECRET"},
				{Type: metav1.CauseTypeFieldValueRequired, Field: "spec.image", Message: "CANARY_ONLY_UPSTREAM_SECRET"},
			}},
		})
		return
	}
	if r.URL.Path == "/watch" || strings.HasPrefix(r.URL.Path, "/api/v1/watch/") || strings.HasPrefix(r.URL.Path, "/apis/example.io/v1/watch/") {
		if r.Header.Get(constants.HeaderAccept) != constants.ContentTypeJSON {
			http.Error(w, "expected JSON negotiation", http.StatusBadRequest)
			return
		}
		if r.URL.Query().Get("media") == "protobuf" {
			w.Header().Set(constants.HeaderContentType, "application/vnd.kubernetes.protobuf")
			_, _ = io.WriteString(w, "CANARY_UNSUPPORTED_WATCH_BODY")
			return
		}
		w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
		eventType := "ERROR"
		if r.URL.Query().Get("escaped") == "true" {
			eventType = `\u0045RROR`
		}
		_, _ = io.WriteString(w, `{"type":"`+eventType+`","object":{"kind":"Status","apiVersion":"v1","code":410,"reason":"Expired","message":"CANARY_SECRET","details":{"name":"CANARY_NAME","causes":[{"reason":"FieldValueInvalid","message":"CANARY_VALUE"}]}}}`+"\n")
		return
	}
	code, err := strconv.ParseInt(strings.TrimPrefix(r.URL.Path, "/status/"), 10, 32)
	reasons := map[int64]metav1.StatusReason{
		401: metav1.StatusReasonUnauthorized, 403: metav1.StatusReasonForbidden,
		404: metav1.StatusReasonNotFound, 405: metav1.StatusReasonMethodNotAllowed,
		409: metav1.StatusReasonConflict, 410: metav1.StatusReasonExpired,
		422: metav1.StatusReasonInvalid, 429: metav1.StatusReasonTooManyRequests,
		500: metav1.StatusReasonInternalError, 502: metav1.StatusReasonInternalError,
		503: metav1.StatusReasonServiceUnavailable, 504: metav1.StatusReasonTimeout,
	}
	reason, ok := reasons[code]
	if err != nil || !ok || code < 400 || code > 599 {
		http.NotFound(w, r)
		return
	}
	status := metav1.Status{
		TypeMeta: metav1.TypeMeta{APIVersion: "v1", Kind: "Status"}, Status: metav1.StatusFailure,
		Code: int32(code), Reason: reason, Message: strings.Repeat("CANARY credential, Secret value and unrelated identity ", 100),
		Details: &metav1.StatusDetails{Name: "CANARY_RESOURCE", UID: "CANARY_UID"},
	}
	if code == 422 {
		status.Details.Causes = []metav1.StatusCause{
			{Type: metav1.CauseTypeFieldValueRequired, Field: "data[CANARY_KEY]", Message: "CANARY_SECRET"},
			{Type: metav1.CauseTypeFieldValueInvalid, Field: "spec.containers[1].image", Message: "CANARY_VALUE"},
		}
	}
	if code == 429 || code == 503 || code == 504 {
		status.Details.RetryAfterSeconds = 7
		w.Header().Set("Retry-After", "7")
	}
	contentType := constants.ContentTypeJSON
	var body []byte
	if r.Header.Get(constants.HeaderAccept) == runtime.ContentTypeProtobuf {
		contentType = runtime.ContentTypeProtobuf
		if code == http.StatusConflict {
			status.Reason = metav1.StatusReasonAlreadyExists
		}
		serializer, _ := runtime.SerializerInfoForMediaType(scheme.Codecs.SupportedMediaTypes(), contentType)
		body, err = runtime.Encode(serializer.Serializer, &status)
	} else {
		body, err = json.Marshal(status)
	}
	if err != nil {
		http.Error(w, "fixture encoding failed", http.StatusInternalServerError)
		return
	}
	if r.URL.Query().Get("gzip") == "true" {
		var compressed bytes.Buffer
		writer := gzip.NewWriter(&compressed)
		_, err = writer.Write(body)
		if err != nil || writer.Close() != nil {
			http.Error(w, "fixture compression failed", http.StatusInternalServerError)
			return
		}
		body = compressed.Bytes()
		w.Header().Set(constants.HeaderContentEncoding, "gzip")
	}
	w.Header().Set(constants.HeaderContentType, contentType)
	w.Header().Set(httpcontract.AuditIDHeader, contractFixtureAuditID)
	w.Header().Set("X-Upstream-Request-ID", r.Header.Get(httpcontract.RequestIDHeader))
	w.Header().Set("X-Test-Auth", "CANARY_TOKEN")
	w.Header().Set("Set-Cookie", "CANARY_COOKIE")
	w.WriteHeader(int(code))
	if _, err := w.Write(body); err != nil && !errors.Is(err, context.Canceled) {
		slog.Error("fixture response failed", "error", err)
	}
}

func contractCompatibilityResponse(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimPrefix(r.URL.Path, "/apis/example.io/v1/namespaces/project/widgets/")
	cases := map[string]struct {
		code    int
		reason  metav1.StatusReason
		message string
	}{
		"not-found":      {404, metav1.StatusReasonNotFound, `widgets.example.io "example" not found`},
		"already-exists": {409, metav1.StatusReasonAlreadyExists, `widgets.example.io "example" already exists`},
		"validation":     {422, metav1.StatusReasonInvalid, "spec.replicas: Invalid value: -1: must be greater than or equal to 0"},
		"quota":          {403, metav1.StatusReasonForbidden, "exceeded quota: compute, requested: requests.cpu=2, used: requests.cpu=3, limited: requests.cpu=4"},
		"admission":      {403, metav1.StatusReasonForbidden, `admission webhook "policy.example.io" denied the request: select an approved hardware profile`},
	}
	fixture, ok := cases[name]
	if !ok {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(fixture.code)
	status := metav1.Status{
		TypeMeta: metav1.TypeMeta{Kind: "Status", APIVersion: "v1"},
		Status:   metav1.StatusFailure, Code: int32(fixture.code), Reason: fixture.reason, Message: fixture.message,
		Details: &metav1.StatusDetails{Name: "example", Kind: "widgets", Group: "example.io"},
	}
	if name == "validation" {
		status.Details.Causes = []metav1.StatusCause{{Type: metav1.CauseTypeFieldValueInvalid, Field: "spec.replicas", Message: "must be greater than or equal to 0"}}
	}
	_ = json.NewEncoder(w).Encode(status)
}
