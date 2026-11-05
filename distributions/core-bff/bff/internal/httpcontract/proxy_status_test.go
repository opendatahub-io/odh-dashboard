package httpcontract

import (
	"encoding/base64"
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

func TestProxyDiagnosticsRedactCredentials(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
	request.Header.Set("Authorization", "Bearer CANARY_BEARER_TOKEN")
	request.Header.Set("Cookie", "session=CANARY_SESSION_COOKIE")
	message := "quota explanation; CANARY_BEARER_TOKEN; " + base64.RawURLEncoding.EncodeToString([]byte("CANARY_BEARER_TOKEN")) +
		"; Bearer OTHER_OPAQUE_TOKEN_123456; Basic dTpw; password=CANARY_PASSWORD; api_key=CANARY_KEY; CANARY_SESSION_COOKIE; base64url.bearer.authorization.k8s.io.ENCODED_TOKEN"
	in := metav1.Status{TypeMeta: metav1.TypeMeta{Kind: "Status"}, Reason: metav1.StatusReasonForbidden, Message: message,
		Details: &metav1.StatusDetails{Name: "CANARY_BEARER_TOKEN", Causes: []metav1.StatusCause{{Type: metav1.CauseTypeForbidden, Field: "CANARY_BEARER_TOKEN", Message: message}}}}
	out := ProxyStatus(in, 403, request)
	body, err := json.Marshal(out)
	require.NoError(t, err)
	for _, credential := range []string{"CANARY", "OTHER_OPAQUE_TOKEN_123456", "dTpw", "ENCODED_TOKEN", base64.RawURLEncoding.EncodeToString([]byte("CANARY_BEARER_TOKEN"))} {
		require.NotContains(t, string(body), credential)
	}
	require.Contains(t, out.Message, "quota explanation")
	require.Contains(t, out.Message, "[redacted")
	require.Equal(t, out, ProxyStatus(out, 403, request))
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

func TestProxyStatusRedactsQuotedCredentialAssignments(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
	for _, assignment := range []string{
		`{"password":"SHORT secret, with spaces","client_secret":"SECOND secret"}`,
		`{"DB_PASSWORD":"SHORT secret","OPENAI_API_KEY":"SECOND secret","X-Forwarded-Access-Token":"THIRD secret"}`,
		`{'token': 'SHORT secret, with spaces', 'AWS_SECRET_ACCESS_KEY': 'SECOND secret'}`,
		`password="SHORT secret, with spaces"; token='SECOND secret'`,
		`{"password":"SHORT \"quoted\" secret","client_secret":"SECOND secret\\"}`,
	} {
		for level := 0; level < 3; level++ {
			t.Run(assignment, func(t *testing.T) {
				message := "admission denied: " + assignment + "; spec.replicas must be positive"
				in := metav1.Status{TypeMeta: metav1.TypeMeta{Kind: "Status"}, Reason: metav1.StatusReasonForbidden,
					Message: message, Details: &metav1.StatusDetails{Causes: []metav1.StatusCause{{Message: message}}}}
				out := ProxyStatus(in, http.StatusForbidden, request)
				for _, text := range []string{out.Message, out.Details.Causes[0].Message} {
					require.NotContains(t, text, "SHORT")
					require.NotContains(t, text, "SECOND")
					require.NotContains(t, text, "THIRD")
					require.NotContains(t, text, "secret")
					require.Contains(t, text, "[redacted credential]")
					require.Contains(t, text, "spec.replicas must be positive")
				}
				require.Equal(t, out, ProxyStatus(out, http.StatusForbidden, request))
			})
			encoded, err := json.Marshal(assignment)
			require.NoError(t, err)
			assignment = string(encoded[1 : len(encoded)-1])
		}
	}
}

func TestProxyDiagnosticsPreserveProseWithShortCredentials(t *testing.T) {
	for _, header := range []struct{ name, value string }{
		{"Cookie", "session=test"},
		{"Authorization", "Bearer test"},
		{"Proxy-Authorization", "Basic test"},
		{"X-Forwarded-Access-Token", "test"},
		{"Sec-WebSocket-Protocol", "test"},
	} {
		t.Run(header.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
			request.Header.Set(header.name, header.value)
			redact := proxyDiagnosticRedactor(request)
			for _, message := range []string{
				"the latest test run failed to schedule",
				"the basic configuration is invalid: spec.replicas must be a positive integer",
				"bearer permissions require administrator approval",
				"the basic configurationrequirements are invalid",
				"the private key and session configuration require a secret reference",
				"session_timeout=30, private_key_format=PEM, secret_reference=app",
				"password_policy=strong, api_key_format=opaque, token_endpoint=service",
			} {
				require.Equal(t, message, redact(message))
			}
		})
	}
}

func TestProxyStatusRedactsMultilineCredentialAssignments(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
	for _, newline := range []string{"\n", "\r\n", "\r"} {
		for _, quote := range []string{`"`, `'`} {
			assignment := "private_key=" + quote + "-----BEGIN PRIVATE KEY-----" + newline +
				"PRIVATE_KEY_CANARY" + newline + "-----END PRIVATE KEY-----" + quote
			for level := 0; level < 3; level++ {
				message := assignment + "; spec.replicas must be positive"
				in := metav1.Status{TypeMeta: metav1.TypeMeta{Kind: "Status"}, Message: message,
					Details: &metav1.StatusDetails{Causes: []metav1.StatusCause{{Message: message}}}}
				out := ProxyStatus(in, http.StatusForbidden, request)
				for _, text := range []string{out.Message, out.Details.Causes[0].Message} {
					require.NotContains(t, text, "PRIVATE_KEY_CANARY")
					require.Contains(t, text, redactionPlaceholder)
					require.Contains(t, text, "spec.replicas must be positive")
				}
				require.Equal(t, out, ProxyStatus(out, http.StatusForbidden, request))
				encoded, err := json.Marshal(assignment)
				require.NoError(t, err)
				assignment = string(encoded[1 : len(encoded)-1])
			}
		}
	}
	redact := proxyDiagnosticRedactor(request)
	require.Equal(t, redactionPlaceholder, redact("private_key=\"first line\nPRIVATE_KEY_CANARY"))
}

func TestProxyDiagnosticsRedactShortCredentialsInContext(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
	request.Header.Set("Authorization", "Bearer test")
	request.Header.Set("Cookie", "session=test")
	redact := proxyDiagnosticRedactor(request)
	for _, message := range []string{
		"upstream rejected Bearer test.",
		"upstream rejected Basic dTpw",
		"Authorization: Bearer test",
		"Proxy-Authorization: Basic dTpw",
		"Cookie: session=test",
		"password=test",
		"token=test",
		"DB_PASSWORD=test",
		"OPENAI_API_KEY=test",
		"X-Forwarded-Access-Token=test",
		"AWS_SECRET_ACCESS_KEY=test",
		"secret=test",
		"secret_access_key='test'",
		"privateKey: test",
		"TLS_PRIVATE_KEY=\"test\"",
		"session: test",
		"session_id=test",
		"AWS_SESSION_TOKEN=test",
		"base64url.bearer.authorization.k8s.io.dGVzdA",
	} {
		out := redact(message)
		require.NotContains(t, out, "test")
		require.NotContains(t, out, "dTpw")
		require.NotContains(t, out, "dGVzdA")
		require.Contains(t, out, "[redacted")
		require.Equal(t, out, redact(out))
	}
}

func TestProxyDiagnosticsPreserveCredentialPlaceholders(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
	request.Header.Set("Authorization", "Bearer test")
	redact := proxyDiagnosticRedactor(request)
	for _, tc := range []struct{ input, want string }{
		{"Authorization: [redacted credential]", "Authorization: [redacted credential]"},
		{"password=[redacted credential]; spec.replicas must be positive", "password=[redacted credential]; spec.replicas must be positive"},
		{"Authorization: Bearer test.", "Authorization: [redacted credential]."},
		{"Proxy-Authorization: Basic dTpw", "Proxy-Authorization: [redacted credential]"},
		{`password="[redacted credential] SHORT secret"`, "[redacted credential]"},
	} {
		out := redact(tc.input)
		require.Equal(t, tc.want, out)
		require.Equal(t, out, redact(out))
	}
}

func TestKnownCredentialRedactionDoesNotChangeLargerWords(t *testing.T) {
	const token = "OPAQUE_CREDENTIAL_123456" //nolint:gosec // G101: synthetic value used only to test credential redaction.
	request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	redact := proxyDiagnosticRedactor(request)
	require.Equal(t, "prefix"+token+"suffix", redact("prefix"+token+"suffix"))
	require.Equal(t, "[redacted] [redacted]", redact(token+" "+token))
	for _, suffix := range []string{"suffix", ".example", "-suffix", "_suffix"} {
		require.Equal(t, token+suffix, redact(token+suffix))
	}
}

func TestProxyStatusRedactsKnownCredentialsInURLs(t *testing.T) {
	const token = "OPAQUE_CREDENTIAL_123456" //nolint:gosec // G101: synthetic credential for regression coverage.
	request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	for _, url := range []string{
		"https://" + token + "@example.test/path",
		"https://user:" + token + "@example.test/path",
		"https://example.test/" + token,
		"https://example.test/" + token + "/child",
		"https://example.test/?value=" + token + "&other=1",
	} {
		t.Run(url, func(t *testing.T) {
			message := "callback " + url + " failed; spec.replicas must be positive"
			in := metav1.Status{TypeMeta: metav1.TypeMeta{Kind: "Status"}, Message: message,
				Details: &metav1.StatusDetails{Causes: []metav1.StatusCause{{Message: message}}}}
			out := ProxyStatus(in, http.StatusForbidden, request)
			for _, text := range []string{out.Message, out.Details.Causes[0].Message} {
				require.NotContains(t, text, token)
				require.Contains(t, text, "[redacted]")
				require.Contains(t, text, "spec.replicas must be positive")
			}
			require.Equal(t, out, ProxyStatus(out, http.StatusForbidden, request))
		})
	}
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
