package httpcontract

import (
	"bytes"
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
	"strings"
	"sync"
	"syscall"
	"testing"
	"testing/iotest"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/validation/field"
)

func TestFailureClassificationAndRedaction(t *testing.T) {
	for _, tc := range []struct {
		name             string
		err              error
		fallback, status int
		code             string
	}{
		{"timeout", fmt.Errorf("secret: %w", context.DeadlineExceeded), 502, 504, "GATEWAY_TIMEOUT"},
		{"refused", &net.OpError{Op: "dial", Err: syscall.ECONNREFUSED}, 502, 503, "SERVICE_UNAVAILABLE"},
		{"dns", &net.DNSError{Err: "secret", Name: "secret"}, 502, 503, "SERVICE_UNAVAILABLE"},
		{"protocol", errors.New("secret"), 502, 502, "BAD_GATEWAY"},
		{"internal", errors.New("secret"), 500, 500, "INTERNAL_SERVER_ERROR"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			r := httptest.NewRequest("GET", "/", nil)
			WriteError(w, r, tc.err, tc.fallback)
			require.Equal(t, tc.status, w.Code)
			var e HTTPError
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &e))
			require.Equal(t, tc.code, e.Error.Code)
			require.Equal(t, w.Header().Get(RequestIDHeader), e.Error.RequestID)
			require.NotContains(t, w.Body.String(), "secret")
		})
	}
	for _, status := range []int{400, 401, 403, 404, 405, 409, 422, 500, 502, 503, 504} {
		w := httptest.NewRecorder()
		WriteLocal(w, httptest.NewRequest("GET", "/", nil), status)
		require.Equal(t, status, w.Code)
		require.NotEmpty(t, w.Header().Get(RequestIDHeader))
	}
}

func TestLocalErrorConsumerFormatsSurvivePathRewriting(t *testing.T) {
	spec, err := openapi3.NewLoader().LoadFromFile("../../openapi/src/core-bff.yaml")
	require.NoError(t, err)
	for _, tc := range []struct {
		path string
		flat bool
	}{
		{"/api/config", true},
		{"/api/cluster-settings", true},
		{"/api/components/remove", true},
		{"/perses/api/api/v1/projects", true},
		{"/api/v1/namespaces", false},
		{"/api/v1", false},
		{"/maas/api/v1/whoami", false},
		{"/gen-ai/api/v1/user", false},
		{"/api/service/model-serving/api/v1/models", false},
		{"/perses/api-other/projects", false},
		{"/api-other/config", false},
		{"/wss/k8s/api/v1/pods", false},
	} {
		for _, prefix := range []string{"", "/core-bff"} {
			t.Run(prefix+tc.path, func(t *testing.T) {
				w := httptest.NewRecorder()
				Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					// Module proxies may rewrite even a non-versioned path to /api/v1/*.
					r.URL.Path = "/api/v1/upstream"
					WriteError(w, r, errors.New("CANARY_TOKEN"), http.StatusBadGateway)
				})).ServeHTTP(w, httptest.NewRequest(http.MethodGet, prefix+tc.path, nil))
				require.Equal(t, http.StatusBadGateway, w.Code)
				var body map[string]any
				require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
				payload := body
				schema := "MessageErrorResponse"
				if tc.flat {
					// These are the exact property reads in unchanged Fastify/Perses clients.
					require.Equal(t, "upstream connection failed", body["message"])
					require.Equal(t, body["message"], body["error"])
				} else {
					payload = body["error"].(map[string]any)
					schema = "ErrorResponse"
				}
				require.Equal(t, "BAD_GATEWAY", payload["code"])
				require.Equal(t, w.Header().Get(RequestIDHeader), payload["requestId"])
				require.NoError(t, spec.Components.Schemas[schema].Value.VisitJSON(body))
				require.NotContains(t, w.Body.String(), "CANARY")
			})
		}
	}
}

func TestKubernetesStatusDecodesWithoutLeakingValues(t *testing.T) {
	errs := []error{
		k8serrors.NewUnauthorized("CANARY_TOKEN"),
		k8serrors.NewForbidden(schema.GroupResource{Resource: "secrets"}, "CANARY_NAME", errors.New("CANARY_IDENTITY")),
		k8serrors.NewNotFound(schema.GroupResource{Resource: "secrets"}, "CANARY_NAME"),
		k8serrors.NewConflict(schema.GroupResource{Resource: "secrets"}, "CANARY_NAME", errors.New("CANARY")),
		k8serrors.NewInvalid(schema.GroupKind{Kind: "Secret"}, "CANARY_NAME", field.ErrorList{field.Invalid(field.NewPath("data").Key("CANARY_KEY"), "CANARY_VALUE", "CANARY_MESSAGE")}),
		k8serrors.NewResourceExpired("CANARY"), k8serrors.NewTooManyRequests("CANARY", 7),
		k8serrors.NewServiceUnavailable("CANARY"), k8serrors.NewTimeoutError("CANARY", 3),
	}
	for _, err := range errs {
		w := httptest.NewRecorder()
		// Kubernetes proxy boundaries must receive a Kubernetes Status.
		r := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/namespaces/test/pods", nil)
		WriteError(w, r, fmt.Errorf("wrapped: %w", err), 500)
		require.NotContains(t, w.Body.String(), "CANARY")
		require.NotContains(t, w.Body.String(), `"error":`)
		var s metav1.Status
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &s))
		original := err.(k8serrors.APIStatus).Status()
		require.Equal(t, int(original.Code), w.Code)
		require.Equal(t, original.Reason, s.Reason)
		require.Equal(t, "Status", s.Kind)
		require.Equal(t, "v1", s.APIVersion)
		decoded := k8serrors.FromObject(&s).(k8serrors.APIStatus).Status()
		require.Equal(t, original.Reason, decoded.Reason)
		if s.Reason == metav1.StatusReasonInvalid {
			require.Equal(t, "data", s.Details.Causes[0].Field)
			require.Equal(t, metav1.CauseTypeFieldValueInvalid, s.Details.Causes[0].Type)
		}
		if s.Reason == metav1.StatusReasonTooManyRequests {
			require.Equal(t, int32(7), s.Details.RetryAfterSeconds)
			require.Equal(t, "7", w.Header().Get("Retry-After"))
		}
	}
}

func TestNativeUpstreamFailureKeepsEnvelopeAndStatus(t *testing.T) {
	for _, tc := range []struct {
		err        error
		status     int
		code       string
		retryAfter string
	}{
		{k8serrors.NewUnauthorized("CANARY_TOKEN"), 401, "UNAUTHORIZED", ""},
		{k8serrors.NewForbidden(schema.GroupResource{Resource: "secrets"}, "CANARY_NAME", errors.New("CANARY_IDENTITY")), 403, "FORBIDDEN", ""},
		{k8serrors.NewNotFound(schema.GroupResource{Resource: "secrets"}, "CANARY_NAME"), 404, "NOT_FOUND", ""},
		{k8serrors.NewResourceExpired("CANARY"), 410, "GONE", ""},
		{k8serrors.NewGenericServerResponse(http.StatusNotAcceptable, http.MethodGet, schema.GroupResource{}, "", "CANARY", 0, false), 406, "NOT_ACCEPTABLE", ""},
		{k8serrors.NewTooManyRequests("CANARY", 7), 429, "TOO_MANY_REQUESTS", "7"},
		{k8serrors.NewServiceUnavailable("CANARY"), 503, "SERVICE_UNAVAILABLE", ""},
	} {
		t.Run(tc.code, func(t *testing.T) {
			w := httptest.NewRecorder()
			// Native endpoints keep the BFF envelope so versioned clients parse failures.
			r := httptest.NewRequest(http.MethodGet, "/api/v1/namespaces", nil)
			WriteError(w, r, fmt.Errorf("wrapped: %w", tc.err), 500)
			require.Equal(t, tc.status, w.Code)
			require.Equal(t, tc.retryAfter, w.Header().Get("Retry-After"))
			var e HTTPError
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &e))
			require.Equal(t, tc.code, e.Error.Code)
			require.Equal(t, w.Header().Get(RequestIDHeader), e.Error.RequestID)
			// The envelope must not leak upstream identities, names or free text.
			require.NotContains(t, w.Body.String(), "CANARY")
			require.NotContains(t, w.Body.String(), "\"kind\":\"Status\"")
		})
	}
}

func TestUnversionedNativeFailuresKeepConsumerFields(t *testing.T) {
	for _, path := range []string{"/api/components", "/api/components/remove", "/core-bff/api/components", "/core-bff/api/components/remove"} {
		t.Run(path, func(t *testing.T) {
			w := httptest.NewRecorder()
			WriteError(w, httptest.NewRequest(http.MethodGet, path, nil), k8serrors.NewUnauthorized("CANARY"), http.StatusInternalServerError)
			var body map[string]any
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			require.Equal(t, http.StatusUnauthorized, w.Code)
			require.Equal(t, "Status", body["kind"])
			require.Equal(t, "authentication required", body["message"])
			// fetchComponents reads message; removeComponent must not receive an
			// object in error, which its unchanged consumer would stringify.
			require.NotContains(t, body, "error")
			require.NotContains(t, w.Body.String(), "CANARY")
		})
	}
}

func TestVersionedNativeErrorCodesMatchSchema(t *testing.T) {
	spec, err := openapi3.NewLoader().LoadFromFile("../../openapi/src/core-bff.yaml")
	require.NoError(t, err)
	for code := int32(http.StatusBadRequest); code <= 599; code++ {
		w := httptest.NewRecorder()
		upstream := &k8serrors.StatusError{ErrStatus: metav1.Status{Code: code}}
		WriteError(w, httptest.NewRequest(http.MethodGet, "/api/v1/namespaces", nil), upstream, http.StatusInternalServerError)
		var body any
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
		require.Equal(t, int(code), w.Code)
		require.NoError(t, spec.Components.Schemas["ErrorResponse"].Value.VisitJSON(body), "upstream HTTP %d", code)
	}
}

func TestVersionedNativeErrorsKeepSafeValidationDiagnostics(t *testing.T) {
	upstream := k8serrors.NewInvalid(schema.GroupKind{Kind: "Widget"}, "CANARY_NAME", field.ErrorList{
		field.Required(field.NewPath("spec", "image"), ""),
		field.Invalid(field.NewPath("data").Key("CANARY_KEY"), "CANARY_VALUE", "CANARY_MESSAGE"),
	})
	w := httptest.NewRecorder()
	WriteError(w, httptest.NewRequest(http.MethodPost, "/core-bff/api/v1/widgets", nil), upstream, http.StatusInternalServerError)
	var body HTTPError
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Equal(t, http.StatusUnprocessableEntity, w.Code)
	require.Equal(t, "VALIDATION_FAILED", body.Error.Code)
	require.Equal(t, "request validation failed: spec.image: required field; data: invalid field value", body.Error.Message)
	require.NotContains(t, w.Body.String(), "CANARY")
}

func TestCorrelationTransportAndConcurrentIsolation(t *testing.T) {
	audit := uuid.NewString()
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Empty(t, r.Header.Get(AuditIDHeader))
		w.Header().Set(AuditIDHeader, audit)
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte(r.Header.Get(RequestIDHeader))) //nolint:gosec // G705: controlled test server echoes an opaque ID as text/plain.
	}))
	defer upstream.Close()
	client := &http.Client{Transport: Transport{}}
	h := Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		req, _ := http.NewRequestWithContext(r.Context(), "GET", upstream.URL, nil)
		req.Header.Set(AuditIDHeader, "untrusted")
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()
		b, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		require.Equal(t, RequestID(r.Context()), string(b))
		WriteLocal(w, r, 403)
	}))
	var wg sync.WaitGroup
	var ids sync.Map
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := httptest.NewRequest("GET", "/", nil)
			r.Header[RequestIDHeader] = []string{strings.Repeat("CANARY", 1000), "duplicate"}
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			id := w.Header().Get(RequestIDHeader)
			u, err := uuid.Parse(id)
			require.NoError(t, err)
			require.Equal(t, uuid.Version(4), u.Version())
			_, loaded := ids.LoadOrStore(id, true)
			require.False(t, loaded)
			require.Equal(t, audit, w.Header().Get(AuditIDHeader))
			require.Contains(t, w.Body.String(), id)
		}()
	}
	wg.Wait()
}

func TestTransportSkipAuditCapture(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(AuditIDHeader, uuid.NewString())
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()
	client := &http.Client{Transport: Transport{SkipAuditCapture: true}}
	for _, tc := range []struct{ name, existingAudit string }{
		{"without-existing-audit", ""},
		{"with-existing-audit", uuid.NewString()},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if tc.existingAudit != "" {
					header := make(http.Header)
					header.Set(AuditIDHeader, tc.existingAudit)
					CaptureAudit(r.Context(), header)
				}
				req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, upstream.URL, nil)
				require.NoError(t, err)
				resp, err := client.Do(req)
				require.NoError(t, err)
				defer resp.Body.Close()
				require.Equal(t, tc.existingAudit, AuditID(r.Context()))
				w.WriteHeader(http.StatusOK)
			})).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
			require.Equal(t, tc.existingAudit, w.Header().Get(AuditIDHeader))
		})
	}
}

func TestInvalidAuditIdentifiersAreNotReflected(t *testing.T) {
	for _, v := range [][]string{
		{"CANARY"},
		{strings.Repeat("a", 1000)},
		{strings.Repeat("x", 36)},
		{"2895B0A0-7694-47D0-8CB4-869B93FE68BE"},
		{uuid.NewString(), uuid.NewString()},
	} {
		h := Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := make(http.Header)
			for _, value := range v {
				header.Add(AuditIDHeader, value)
			}
			require.Equal(t, v, header.Values(AuditIDHeader))
			CaptureAudit(r.Context(), header)
			require.Empty(t, header.Values(AuditIDHeader))
			require.Empty(t, AuditID(r.Context()))
			WriteLocal(w, r, 500)
		}))
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
		require.Empty(t, w.Header().Get(AuditIDHeader))
	}
}

func TestCommittedAndCanceledResponsesNeverAppendJSON(t *testing.T) {
	h := Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("event\n"))
		http.NewResponseController(w).Flush()
		WriteLocal(w, r, 500)
	}))
	w := httptest.NewRecorder()
	require.PanicsWithValue(t, http.ErrAbortHandler, func() { h.ServeHTTP(w, httptest.NewRequest("GET", "/", nil)) })
	require.Equal(t, "event\n", w.Body.String())
	require.Equal(t, 200, w.Code)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	w = httptest.NewRecorder()
	require.PanicsWithValue(t, http.ErrAbortHandler, func() { WriteLocal(w, httptest.NewRequest("GET", "/", nil).WithContext(ctx), 500) })
	require.Empty(t, w.Body.String())
}

func TestUpstreamKubernetesErrorBodyBoundAndSanitization(t *testing.T) {
	for _, body := range []string{`{"kind":"Status","reason":"Forbidden","message":"CANARY","details":{"name":"CANARY"}}`, "CANARY", strings.Repeat("x", maxErrorBody+1)} {
		resp := &http.Response{StatusCode: 403, Header: http.Header{"Content-Encoding": []string{"gzip"}, "Set-Cookie": []string{"CANARY"}}, Body: io.NopCloser(strings.NewReader(body))}
		require.NoError(t, KubernetesResponse(resp))
		b, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		require.NotContains(t, string(b), "CANARY")
		require.Contains(t, string(b), `"reason":"Forbidden"`)
		require.Empty(t, resp.Header.Get("Set-Cookie"))
		require.Empty(t, resp.Header.Get("Content-Encoding"))
	}
}

func TestSafeStructuredErrorLogs(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))
	h := Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		Log(logger, r).Error("request failed", "code", SafeErrorCode(errors.New("CANARY")))
		WriteLocal(w, r, 500)
	}))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/?token=CANARY", nil))
	require.Contains(t, buf.String(), w.Header().Get(RequestIDHeader))
	require.NotContains(t, buf.String(), "CANARY")
}

func TestWatchErrorsAreSanitizedWithoutChangingResourceEvents(t *testing.T) {
	success := []byte("{\"type\":\"ADDED\", \"object\":{\"data\":{\"authorized\":\"value\"}}}\n")
	failure := []byte(`{"type":"ERROR","object":{"kind":"Status","code":410,"reason":"Expired","message":"CANARY"}}` + "\n")
	require.Equal(t, success, SanitizeWatchEvent(success))
	clean := SanitizeWatchEvent(failure)
	require.NotContains(t, string(clean), "CANARY")
	require.Contains(t, string(clean), `"reason":"Expired"`)
	for _, body := range []string{string(success) + string(failure), string(success) + strings.TrimSuffix(string(failure), "\n")} {
		req := httptest.NewRequest("GET", "http://upstream/api/v1/secrets?watch=true", nil)
		resp := &http.Response{StatusCode: 200, Request: req, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(body))}
		require.NoError(t, KubernetesResponse(resp))
		result, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		require.True(t, bytes.HasPrefix(result, success))
		require.NotContains(t, string(result), "CANARY")
		require.Contains(t, string(result), `"code":410`)
	}
	malformed := SanitizeWatchEvent([]byte(`{"type":"ERROR","object":"CANARY"}`))
	require.NotContains(t, string(malformed), "CANARY")
	require.Contains(t, string(malformed), `"code":500`)
}

func TestSDKCauseSemanticsAndCredentialCategories(t *testing.T) {
	for _, cause := range []metav1.CauseType{metav1.CauseTypeResourceVersionTooLarge, metav1.CauseTypeFieldManagerConflict, metav1.CauseTypeInternal} {
		status := SanitizeStatus(metav1.Status{Reason: metav1.StatusReasonTimeout, Details: &metav1.StatusDetails{Causes: []metav1.StatusCause{{Type: cause, Message: "CANARY"}}}}, 504)
		require.Equal(t, cause, status.Details.Causes[0].Type)
	}
	for _, tc := range []struct {
		err  error
		code string
	}{{ErrCredentialsMissing, "CREDENTIALS_MISSING"}, {ErrCredentialsInvalid, "CREDENTIALS_INVALID"}, {ErrCredentialsExpired, "CREDENTIALS_EXPIRED"}} {
		wrapped := fmt.Errorf("wrapped: %w", tc.err)
		require.Equal(t, tc.code, SafeErrorCode(wrapped))
		require.Equal(t, 401, Classify(wrapped, 500).StatusCode)
		require.Equal(t, "UNAUTHORIZED", Classify(wrapped, 500).Error.Code)
	}
}

func TestRetryAfterMetadataValidation(t *testing.T) {
	for _, tc := range []struct{ in, want string }{{"7", "7"}, {"Wed, 21 Oct 2015 07:28:00 GMT", "Wed, 21 Oct 2015 07:28:00 GMT"}, {"CANARY", ""}, {"-1", ""}, {strings.Repeat("9", 100), ""}} {
		dst := http.Header{}
		src := http.Header{}
		src.Set("Retry-After", tc.in)
		CopyRetryAfter(dst, src)
		require.Equal(t, tc.want, dst.Get("Retry-After"))
	}
}

func TestValidationFieldPathsPreserveArrayPositionsAndRedactMapKeys(t *testing.T) {
	for _, tc := range []struct{ field, want string }{
		{"spec.containers[1].image", "spec.containers[1].image"},
		{"spec.containers[1].env[2].value", "spec.containers[1].env[2].value"},
		{"data[CANARY_KEY]", "data"},
		{".data.CANARY_KEY", ".data"},
		{".stringData.CANARY_KEY", ".stringData"},
		{".metadata.annotations.CANARY_KEY", ".metadata.annotations"},
		{".spec.template.metadata.labels.CANARY_KEY", ".spec.template.metadata.labels"},
		{"data[123]", "data"},
		{"stringData[123]", "stringData"},
		{"metadata.annotations[123]", "metadata.annotations"},
		{"spec.template.metadata.labels[123]", "spec.template.metadata.labels"},
		{"spec.selector[CANARY_KEY]", "spec.selector"},
		{"spec.containers[1].env[CANARY_KEY]", "spec.containers[1].env"},
		{"spec.containers[CANARY", ""},
		{strings.Repeat("a", 254), ""},
	} {
		t.Run(tc.field, func(t *testing.T) {
			causeType := metav1.CauseTypeFieldValueInvalid
			if strings.HasPrefix(tc.field, ".") {
				causeType = metav1.CauseTypeFieldManagerConflict
			}
			status := SanitizeStatus(metav1.Status{Reason: metav1.StatusReasonInvalid, Details: &metav1.StatusDetails{Causes: []metav1.StatusCause{{Type: causeType, Field: tc.field, Message: "CANARY_VALUE"}}}}, 422)
			require.Equal(t, tc.want, status.Details.Causes[0].Field)
			b, err := json.Marshal(status)
			require.NoError(t, err)
			require.NotContains(t, string(b), "CANARY")
		})
	}
}

func TestHTTPWatchQuerySemanticsMatchKubernetes(t *testing.T) {
	event := `{"type":"ERROR","object":{"kind":"Status","code":410,"reason":"Expired","message":"CANARY_SECRET","details":{"name":"CANARY_NAME","causes":[{"reason":"FieldValueInvalid","message":"CANARY_VALUE"}]}}}` + "\n"
	for _, tc := range []struct {
		query string
		watch bool
	}{
		{"watch=true", true}, {"watch=1", true}, {"watch=TRUE", true}, {"watch=True", true},
		{"watch=", true}, {"watch", true}, {"watch=anything", true}, {"watch=true&watch=false", true},
		{"", false}, {"watch=false", false}, {"watch=FALSE", false}, {"watch=0", false}, {"watch=false&watch=true", false},
	} {
		t.Run(tc.query, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "http://upstream/api/v1/secrets?"+tc.query, nil)
			response := &http.Response{StatusCode: 200, Request: request, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(event))}
			require.NoError(t, KubernetesResponse(response))
			body, err := io.ReadAll(response.Body)
			require.NoError(t, err)
			if tc.watch {
				require.NotContains(t, string(body), "CANARY")
				require.Contains(t, string(body), `"reason":"Expired"`)
			} else {
				require.Equal(t, event, string(body))
			}
		})
	}
}

func TestStreamCancellationLogsAtDebug(t *testing.T) {
	for _, canceled := range []bool{false, true} {
		t.Run(fmt.Sprintf("canceled=%v", canceled), func(t *testing.T) {
			var logs bytes.Buffer
			logger := slog.New(slog.NewJSONHandler(&logs, &slog.HandlerOptions{Level: slog.LevelDebug}))
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			if canceled {
				cancel()
			}
			body := &observedBody{ReadCloser: io.NopCloser(iotest.ErrReader(errors.New("CANARY_RAW_ERROR"))), ctx: ctx, logger: logger}
			_, err := body.Read(make([]byte, 1))
			require.Error(t, err)
			var event struct {
				Level string `json:"level"`
				Code  string `json:"code"`
			}
			require.NoError(t, json.Unmarshal(logs.Bytes(), &event))
			if canceled {
				require.Equal(t, "DEBUG", event.Level)
				require.Equal(t, "CANCELED", event.Code)
			} else {
				require.Equal(t, "ERROR", event.Level)
				require.Equal(t, "BAD_GATEWAY", event.Code)
			}
			require.NotContains(t, logs.String(), "CANARY")
		})
	}
}

func TestTransportPreservesUpgradeBodiesAndObservesOrdinaryResponses(t *testing.T) {
	audit := uuid.NewString()
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !websocket.IsWebSocketUpgrade(r) {
			_, _ = io.WriteString(w, "ordinary response")
			return
		}
		upgrader := websocket.Upgrader{}
		conn, err := upgrader.Upgrade(w, r, http.Header{AuditIDHeader: []string{audit}})
		if err != nil {
			return
		}
		defer conn.Close()
		kind, body, err := conn.ReadMessage()
		if err != nil {
			return
		}
		_ = conn.WriteMessage(kind, body)
	}))
	defer upstream.Close()
	target, err := url.Parse(upstream.URL)
	require.NoError(t, err)
	transport := Transport{Base: upstream.Client().Transport}
	t.Run("ordinary responses remain observed", func(t *testing.T) {
		request, err := http.NewRequest(http.MethodGet, upstream.URL, nil)
		require.NoError(t, err)
		response, err := transport.RoundTrip(request)
		require.NoError(t, err)
		defer response.Body.Close()
		require.IsType(t, &observedBody{}, response.Body)
		body, err := io.ReadAll(response.Body)
		require.NoError(t, err)
		require.Equal(t, "ordinary response", string(body))
	})
	t.Run("101 responses remain writable", func(t *testing.T) {
		proxy := httputil.NewSingleHostReverseProxy(target)
		proxy.Transport = transport
		server := httptest.NewServer(Middleware(proxy))
		defer server.Close()
		dialer := websocket.Dialer{HandshakeTimeout: 5 * time.Second}
		conn, response, err := dialer.Dial("ws"+strings.TrimPrefix(server.URL, "http"), nil)
		require.NoError(t, err)
		defer conn.Close()
		require.Equal(t, http.StatusSwitchingProtocols, response.StatusCode)
		require.Equal(t, audit, response.Header.Get(AuditIDHeader))
		_ = conn.SetReadDeadline(time.Now().Add(5 * time.Second))
		require.NoError(t, conn.WriteMessage(websocket.TextMessage, []byte("upgrade relay")))
		kind, body, err := conn.ReadMessage()
		require.NoError(t, err)
		require.Equal(t, websocket.TextMessage, kind)
		require.Equal(t, "upgrade relay", string(body))
	})
}

func TestKubernetesFallbackReasons(t *testing.T) {
	for _, tc := range []struct {
		status int
		reason metav1.StatusReason
	}{
		{http.StatusNotAcceptable, metav1.StatusReasonNotAcceptable},
		{http.StatusRequestEntityTooLarge, metav1.StatusReasonRequestEntityTooLarge},
		{http.StatusUnsupportedMediaType, metav1.StatusReasonUnsupportedMediaType},
	} {
		t.Run(string(tc.reason), func(t *testing.T) {
			for _, body := range []string{"CANARY_NON_JSON", `{"kind":"Status","message":"CANARY"}`} {
				response := &http.Response{StatusCode: tc.status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}
				require.NoError(t, KubernetesResponse(response))
				var status metav1.Status
				require.NoError(t, json.NewDecoder(response.Body).Decode(&status))
				require.Equal(t, tc.status, int(status.Code))
				require.Equal(t, tc.reason, status.Reason)
				require.NotContains(t, status.Message, "CANARY")
				require.Equal(t, reasonMessages[tc.reason], status.Message)
			}
		})
	}
}

func TestEscapedWatchEventTypes(t *testing.T) {
	for _, eventType := range []string{`ERROR`, `\u0045RROR`} {
		t.Run(eventType, func(t *testing.T) {
			event := fmt.Sprintf(`{"type":"%s","object":{"kind":"Status","code":410,"reason":"Expired","message":"CANARY","details":{"name":"CANARY","causes":[{"reason":"FieldValueInvalid","message":"CANARY"}]}}}`+"\n", eventType)
			response := &http.Response{StatusCode: 200, Request: httptest.NewRequest(http.MethodGet, "/api/v1/secrets?watch=true", nil), Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(event))}
			require.NoError(t, KubernetesResponse(response))
			body, err := io.ReadAll(response.Body)
			require.NoError(t, err)
			require.NotContains(t, string(body), "CANARY")
			require.Contains(t, string(body), `"reason":"Expired"`)
		})
	}
	event := []byte(`{"type":"\u0041DDED", "object":{"data":{"authorized":"value"}}}`)
	require.Equal(t, event, SanitizeWatchEvent(event))
}

func TestLocalKubernetesProxyFailuresRemainSDKStatus(t *testing.T) {
	for _, path := range []string{"/api/k8s", "/api/k8s/api/v1/pods", "/core-bff/api/k8s/api/v1/pods"} {
		for _, status := range []int{400, 401, 403, 404, 405, 500, 502, 503, 504} {
			t.Run(fmt.Sprintf("%s/%d", path, status), func(t *testing.T) {
				response := httptest.NewRecorder()
				WriteLocal(response, httptest.NewRequest(http.MethodGet, path, nil), status)
				var body metav1.Status
				require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
				require.Equal(t, "Status", body.Kind)
				require.Equal(t, metav1.StatusFailure, body.Status)
				require.Equal(t, status, int(body.Code))
				require.Equal(t, metav1.StatusReason("DashboardProxyError"), body.Reason)
				require.Equal(t, Local(status).Error.Code, string(body.Details.Causes[0].Type))
				require.NotEmpty(t, response.Header().Get(RequestIDHeader))
				require.NotContains(t, response.Body.String(), `"error"`)
			})
		}
	}
}

func TestKubernetesProxyFailureFormatSurvivesPathRewrite(t *testing.T) {
	handler := Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.URL.Path = "/api/v1/pods"
		WriteError(w, r, io.ErrUnexpectedEOF, http.StatusBadGateway)
	}))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/core-bff/api/k8s/api/v1/pods", nil))
	var body metav1.Status
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
	require.Equal(t, metav1.StatusReason("DashboardProxyError"), body.Reason)
	require.Equal(t, "BAD_GATEWAY", string(body.Details.Causes[0].Type))
}

func TestLegacyWatchDetection(t *testing.T) {
	for _, prefix := range []string{"", "/api/k8s", "/core-bff/api/k8s"} {
		for _, path := range []string{"/api/v1/watch/pods", "/api/v1/watch/namespaces/project/pods", "/apis/apps/v1/watch/deployments", "/apis/apps/v1/watch/namespaces/project/deployments"} {
			for _, query := range []string{"", "?watch=false"} {
				request := httptest.NewRequest(http.MethodGet, prefix+path+query, nil)
				require.True(t, IsWatchRequest(request), request.URL.String())
			}
		}
	}
	for _, path := range []string{"/api/v1/watch", "/apis/apps/v1/watch", "/api/v1/namespaces/watch/pods", "/apis/watch/v1/deployments", "/api/v1/pods/watch", "/api/k8sapi/v1/watch/pods", "/core-bffapi/v1/watch/pods"} {
		require.False(t, IsWatchRequest(httptest.NewRequest(http.MethodGet, path, nil)), path)
	}
	require.False(t, IsWatchRequest(nil))
}
