package httpcontract

import (
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/validation/field"
)

func TestKnownCredentialNames(t *testing.T) {
	for _, name := range []string{
		"password", "DB_PASSWORD", "OPENAI_API_KEY", "X-Forwarded-Access-Token", "AWS_SECRET_ACCESS_KEY",
		"ProxyAuthorization", "PROXY_AUTHORIZATION", "api__KEY", "t_o_k_e_n", "PREFIX-PRIVATE_KEY",
		strings.Repeat("a_", 4000) + "CLIENT_SECRET",
	} {
		require.True(t, isKnownCredentialName(name), name)
	}
	for _, name := range []string{
		"", "password_policy", "api_key_format", "token_endpoint", "nottoken", "token_suffix",
		strings.Repeat("a_", 4000), strings.Repeat("a", 8000),
	} {
		require.False(t, isKnownCredentialName(name), name)
	}
}

func BenchmarkProxyDiagnosticsSeparatorHeavyAssignment(b *testing.B) {
	redact := proxyDiagnosticRedactor(httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil))
	for _, size := range []int{1000, 2000, 4000, 8000} {
		assignment := strings.Repeat("a_", (size-2)/2) + "=x"
		b.Run(strconv.Itoa(size), func(b *testing.B) {
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				_ = redact(assignment)
			}
		})
	}
}

func TestProxyStatusPreservesCredentialValidationDiagnostics(t *testing.T) {
	path := field.NewPath("spec", "token")
	for _, validation := range []*field.Error{
		field.Required(field.NewPath("spec", "apiKey"), ""),
		field.Invalid(path, "x", "must be 16 bytes"),
		field.Invalid(path, "SHORT secret, with spaces", "must be 16 bytes"),
		field.Invalid(path, map[string]string{"nested": "OBJECT_CANARY secret"}, "must be a string"),
		field.TypeInvalid(path, []string{"ARRAY_CANARY"}, "must be a string"),
		field.Invalid(path, 17, "must be 16"),
		field.Invalid(field.NewPath("spec", "credentials").Key("password"), "PRIVATE_CANARY", "rejected"),
		field.Invalid(field.NewPath("spec", "credentials").Key("DB_PASSWORD"), "x", "must be 16 bytes"),
		field.Required(field.NewPath("spec", "credentials").Key("apiKey"), ""),
		field.Invalid(field.NewPath("spec", "credentials").Key(`"password"`), "QUOTED_CANARY", "rejected"),
		field.Invalid(path.Index(0), "INDEX_CANARY", "rejected"),
		field.Invalid(field.NewPath("spec", "credentials").Key("password").Index(0), "INDEX_CANARY", "rejected"),
		field.NotSupported(path, "UNSUPPORTED_CANARY", []string{"opaque", "jwt"}),
		field.Duplicate(path, "DUPLICATE_CANARY"),
		field.NotFound(path, "MISSING_CANARY"),
		field.Forbidden(path, "policy forbids this field"),
		field.TooLong(path, "ignored", 16),
		field.TooMany(path, 17, 16),
	} {
		t.Run(validation.Error(), func(t *testing.T) {
			in := k8serrors.NewInvalid(schema.GroupKind{Group: "example.io", Kind: "Widget"}, "example", field.ErrorList{validation}).Status()
			in.Kind = "Status"
			request := httptest.NewRequest(http.MethodPost, "/apis/example.io/v1/widgets", nil)
			out := ProxyStatus(in, http.StatusUnprocessableEntity, request)
			require.Contains(t, out.Message, validation.Field)
			require.Equal(t, validation.Field, out.Details.Causes[0].Field)
			for _, message := range []string{out.Message, out.Details.Causes[0].Message} {
				require.Contains(t, message, validation.Type.String())
				if validation.Detail != "" {
					require.Contains(t, message, validation.Detail)
				}
				switch validation.Type {
				case field.ErrorTypeRequired, field.ErrorTypeForbidden, field.ErrorTypeTooLong, field.ErrorTypeTooMany:
					require.Contains(t, message, validation.ErrorBody())
				default:
					encoded, err := json.Marshal(validation.BadValue)
					require.NoError(t, err)
					require.NotContains(t, message, string(encoded))
					require.Contains(t, message, redactionPlaceholder)
				}
			}
			require.Equal(t, out, ProxyStatus(out, http.StatusUnprocessableEntity, request))
		})
	}
}

func TestValidationDiagnosticsDoNotBypassAssignmentRedaction(t *testing.T) {
	redact := proxyDiagnosticRedactor(httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil))
	for _, assignment := range []string{
		`password="Required value: CANARY"`, `password="Invalid value: CANARY"`,
		`{"spec.token":"Invalid value: CANARY"}`, `token=CANARY`,
		`spec.token: Invalid value: "CANARY": must be 16 bytes; password=CANARY`,
		`spec.token: Invalid value: 12CANARY: must be 16 bytes`,
	} {
		result := redact(assignment)
		require.NotContains(t, result, "CANARY")
		require.Equal(t, result, redact(result))
	}
	require.Equal(t, "spec.apiKey: Required value", redact("spec.apiKey: Required value"))
	require.Equal(t, "spec.token: Invalid value: "+redactionPlaceholder+": must be 16 bytes", redact(`spec.token: Invalid value: "x": must be 16 bytes`))
	require.Equal(t, "[spec.apiKey: Required value, spec.token: Invalid value: "+redactionPlaceholder+": must be 16 bytes]",
		redact(`[spec.apiKey: Required value, spec.token: Invalid value: "x": must be 16 bytes]`))
}

func TestProxyStatusRedactsCompleteStructuredCredentials(t *testing.T) {
	keyBytes := []byte("PRIVATE_KEY_CANARY")
	key := string(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyBytes}))
	for _, tc := range []struct {
		name, assignment string
		preserveDetail   bool
	}{
		{"JSON object", `password={"first": "FIRST_CANARY", "second": "SECOND_CANARY"}`, true},
		{"JSON array", `token=["FIRST_CANARY", "SECOND_CANARY"]`, true},
		{"multiline JSON", "password={\n  \"first\": \"FIRST_CANARY\",\n  \"nested\": [\"SECOND_CANARY\"]\n}", true},
		{"malformed JSON", `password={"first": "FIRST_CANARY", "second": "SECOND_CANARY"`, false},
		{"escaped JSON", `password={\"first\": \"FIRST_CANARY\", \"second\": \"SECOND_CANARY\"}`, false},
		{"literal YAML", "private_key: |\n  FIRST_CANARY\n  SECOND_CANARY", false},
		{"folded YAML", "private_key: >\n  FIRST_CANARY\n  SECOND_CANARY", false},
		{"YAML indentation indicator", "private_key: |2-\n  FIRST_CANARY\n  SECOND_CANARY", false},
		{"PEM", "private_key: " + key, true},
		{"PEM chain", "private_key: " + key + key, true},
		{"malformed PEM", "private_key: -----BEGIN PRIVATE KEY-----\nPRIVATE_KEY_CANARY\n-----END PRIVATE KEY-----", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			message := "admission denied: " + tc.assignment + "\nspec.replicas must be positive"
			in := metav1.Status{TypeMeta: metav1.TypeMeta{Kind: "Status"}, Code: http.StatusForbidden, Reason: metav1.StatusReasonForbidden,
				Message: message, Details: &metav1.StatusDetails{Causes: []metav1.StatusCause{{Message: message}}}}
			request := httptest.NewRequest(http.MethodPost, "/api/k8s/api/v1/pods", nil)
			out := ProxyStatus(in, http.StatusForbidden, request)
			for _, text := range []string{out.Message, out.Details.Causes[0].Message} {
				require.NotContains(t, text, "CANARY")
				require.NotContains(t, text, base64.StdEncoding.EncodeToString(keyBytes))
				require.Contains(t, text, redactionPlaceholder)
				if tc.preserveDetail {
					require.Contains(t, text, "spec.replicas must be positive")
				} else {
					require.NotContains(t, text, "spec.replicas must be positive")
				}
			}
			require.Equal(t, out, ProxyStatus(out, http.StatusForbidden, request))
			event, err := json.Marshal(map[string]any{"type": "ERROR", "object": in})
			require.NoError(t, err)
			var clean struct{ Object metav1.Status }
			require.NoError(t, json.Unmarshal(ProxyWatchEvent(event, request), &clean))
			require.Equal(t, out, clean.Object)
		})
	}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
	request.Header.Set("Authorization", "Bearer LONG_REQUEST_TOKEN_123456")
	result := proxyDiagnosticRedactor(request)("password=LONG_REQUEST_TOKEN_123456; spec.replicas must be positive")
	require.Contains(t, result, "spec.replicas must be positive")
	require.NotContains(t, result, "LONG_REQUEST_TOKEN")
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

func TestKnownCredentialRedactionRespectsBoundaries(t *testing.T) {
	const token = "OPAQUE_CREDENTIAL_123456" //nolint:gosec // G101: synthetic value used only to test credential redaction.
	request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	redact := proxyDiagnosticRedactor(request)
	require.Equal(t, "prefix"+token+"suffix", redact("prefix"+token+"suffix"))
	require.Equal(t, "[redacted] [redacted]", redact(token+" "+token))
	for _, suffix := range []string{".", ". Please retry.", "...", ".\nPlease retry.", `.)`, `."`} {
		require.Equal(t, "authentication failed for [redacted]"+suffix, redact("authentication failed for "+token+suffix))
	}
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
