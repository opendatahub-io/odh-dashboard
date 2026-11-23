package httpcontract

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestProxyStatusPreservesConsumerDiagnostics(t *testing.T) {
	for _, tc := range []struct {
		reason  metav1.StatusReason
		code    int32
		message string
	}{
		{metav1.StatusReasonNotFound, 404, `widgets.example.io "example" not found`},
		{metav1.StatusReasonAlreadyExists, 409, `widgets.example.io "example" already exists`},
		{metav1.StatusReasonConflict, 409, "the object has been modified; please apply your changes to the latest version"},
		{metav1.StatusReasonInvalid, 422, "spec.replicas: Invalid value: -1: must be greater than or equal to 0"},
		{metav1.StatusReasonForbidden, 403, `pods "example" is forbidden: exceeded quota: compute, requested: requests.cpu=2, used: requests.cpu=3, limited: requests.cpu=4`},
		{metav1.StatusReasonForbidden, 403, `admission webhook "policy.example.io" denied the request: select an approved hardware profile`},
	} {
		t.Run(string(tc.reason)+tc.message, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/k8s/apis/example.io/v1/namespaces/project/widgets", nil)
			in := metav1.Status{
				TypeMeta: metav1.TypeMeta{Kind: "Status", APIVersion: "v1"},
				Reason:   tc.reason, Code: tc.code, Status: metav1.StatusFailure, Message: tc.message,
				Details: &metav1.StatusDetails{Name: "example", Kind: "widgets", UID: "PRIVATE_UID", Causes: []metav1.StatusCause{
					{Type: metav1.CauseTypeFieldValueInvalid, Field: "spec.replicas", Message: "must be greater than or equal to 0"},
				}},
			}
			out := ProxyStatus(in, int(tc.code), request)
			require.Contains(t, out.Message, tc.message)
			require.Equal(t, tc.reason, out.Reason)
			require.Equal(t, in.Details.Name, out.Details.Name)
			require.Equal(t, in.Details.Causes, out.Details.Causes)
			require.Empty(t, out.Details.UID)
			require.Equal(t, out, ProxyStatus(out, int(tc.code), request), "handshake adapters must be idempotent")
			if tc.code == 404 {
				require.Contains(t, out.Message, "404", "KServe checks the numeric text")
				require.Contains(t, out.Message, "not found", "notification hooks check the text")
			}
			strict := SanitizeStatus(in, int(tc.code))
			require.Empty(t, strict.Details.Name, "native service-account handlers remain conservative")
			require.NotEqual(t, tc.message, strict.Message)
		})
	}
}

func TestProxyStatusKeepsSecretOperationsConservative(t *testing.T) {
	for _, path := range []string{
		"/api/v1/namespaces/project/secrets",
		"/api/k8s/api/v1/secrets/example",
		"/core-bff/api/k8s/api/v1/namespaces/project/secrets/example",
		"/wss/k8s/api/v1/secrets?watch=true",
		"/core-bff/wss/k8s/api/v1/watch/namespaces/project/secrets",
		"/api/k8s/api/v1/namespaces/project/%73ecrets/example",
		"/api/v1/watch/secrets",
		"/api/v1/proxy/namespaces/project/secrets/example",
		"/apis/example.io/v1/namespaces/project/secrets/example",
		"/api/v1//secrets",
		"/api/v1/./namespaces/project/secrets",
		"/api/v1/namespaces/project/pods/../secrets",
		"/api/k8s/api/v1/%2e/namespaces/project/secrets",
		"/core-bff/api/k8s/api/v1/namespaces/project/pods/%2e%2e/secrets",
		"/wss/k8s/api/v1/%2e/namespaces/project/secrets?watch=true",
		"/core-bff/wss/k8s/apis/example.io/v1/namespaces/project/widgets/%2E%2E/secrets",
	} {
		t.Run(path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, path, nil)
			in := metav1.Status{
				TypeMeta: metav1.TypeMeta{Kind: "Status"}, Reason: metav1.StatusReasonInvalid,
				Message: "CANARY_SECRET", Details: &metav1.StatusDetails{Name: "CANARY_NAME", Causes: []metav1.StatusCause{
					{Type: metav1.CauseTypeFieldValueInvalid, Field: "data[CANARY_KEY]", Message: "CANARY_SECRET"},
				}},
			}
			out := ProxyStatus(in, 422, request)
			body, err := json.Marshal(out)
			require.NoError(t, err)
			require.NotContains(t, string(body), "CANARY")
			require.Equal(t, "data", out.Details.Causes[0].Field)
		})
	}
}

func TestProxyDiagnosticsClassifyTheResourceSegment(t *testing.T) {
	in := metav1.Status{TypeMeta: metav1.TypeMeta{Kind: "Status"}, Code: http.StatusForbidden,
		Reason: metav1.StatusReasonForbidden, Message: "quota diagnostic retained"}
	event, err := json.Marshal(map[string]any{"type": "ERROR", "object": in})
	require.NoError(t, err)
	for _, prefix := range []string{"", "/api/k8s", "/core-bff/api/k8s", "/wss/k8s", "/core-bff/wss/k8s"} {
		for _, path := range []string{
			"/api/v1/namespaces/secrets",
			"/api/v1/namespaces/secrets/status",
			"/api/v1/namespaces/secrets/pods",
			"/api/v1/namespaces/project/pods/secrets",
			"/apis/apps/v1/namespaces/project/deployments/secrets",
			"/api/v1/watch/namespaces/secrets/pods",
			"/apis/apps/v1/watch/namespaces/secrets/deployments",
			"/api/v1/proxy/namespaces/secrets/pods/example",
		} {
			t.Run(prefix+path, func(t *testing.T) {
				request := httptest.NewRequest(http.MethodGet, prefix+path+"?watch=true", nil)
				require.Equal(t, in.Message, ProxyStatus(in, http.StatusForbidden, request).Message)
				require.Contains(t, string(ProxyWatchEvent(event, request)), in.Message)
			})
		}
	}
	for _, path := range []string{"/unknown", "/api/v1", "/apis/apps/v1", "/api/v1/watch", "/api//pods"} {
		require.NotEqual(t, in.Message, ProxyStatus(in, http.StatusForbidden, httptest.NewRequest(http.MethodGet, path, nil)).Message)
	}
}

func TestProxyDiagnosticBoundsAndFallback(t *testing.T) {
	in := metav1.Status{TypeMeta: metav1.TypeMeta{Kind: "Status"}, Reason: metav1.StatusReasonInvalid, Message: strings.Repeat("x", maxProxyDiagnosticBytes+1)}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
	require.Equal(t, reasonMessages[in.Reason], ProxyStatus(in, 422, request).Message)
	in.Message = "private explanation"
	require.Equal(t, reasonMessages[in.Reason], ProxyStatus(in, 422, nil).Message)
	require.Equal(t, reasonMessages[in.Reason], ProxyStatus(in, 422, httptest.NewRequest(http.MethodPost, "/unknown", nil)).Message)
	in.Kind = "OtherError"
	require.Equal(t, reasonMessages[in.Reason], ProxyStatus(in, 422, request).Message)
}

func TestProxyWatchDiagnosticsFollowResourceBoundary(t *testing.T) {
	event := []byte(`{"type":"ERROR","object":{"kind":"Status","code":410,"reason":"Expired","message":"too old resource version: 100 (200)"}}`)
	for _, resource := range []string{"pods", "secrets"} {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/"+resource+"?watch=true", nil)
		body := string(ProxyWatchEvent(event, request))
		if resource == "pods" {
			require.Contains(t, body, "too old resource version: 100 (200)")
		} else {
			require.NotContains(t, body, "too old resource version")
		}
		require.Contains(t, body, `"reason":"Expired"`)
	}
}
