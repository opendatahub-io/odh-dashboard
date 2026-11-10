package httpcontract

// These fuzz tests exercise malformed diagnostic text and credential values,
// checking for panics, invalid parser bounds, oversized output and changes on
// repeated redaction. Their seed cases also run during ordinary go test runs.

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func FuzzProxyDiagnosticRedactor(f *testing.F) {
	for _, seed := range []string{
		"", "\xff\x00", "ordinary diagnostic; spec.replicas must be positive",
		"REQUEST_CREDENTIAL_123456.", "https://REQUEST_CREDENTIAL_123456@example.test",
		"Bearer REQUEST_CREDENTIAL_123456", "Basic dTpw", "Cookie: session=short",
		"base64url.bearer.authorization.k8s.io.c2hvcnQ",
		`password="SHORT secret, with spaces"; spec.replicas must be positive`,
		`password="unterminated`, `password={"first":"secret", "second":["another"]}`,
		`token=["unfinished`, "private_key: |\n  secret", "private_key: -----BEGIN PRIVATE KEY-----\nsecret",
		`spec.credentials[password]: Invalid value: "short": rejected`,
		`spec.token[0]: Invalid value: "short": rejected`, "spec.apiKey: Required value",
		"password=[redacted]; constraint retained", "password=[redacted credential]; constraint retained",
		strings.Repeat("\\", maxProxyDiagnosticBytes), strings.Repeat("x", maxProxyDiagnosticBytes+1),
	} {
		f.Add(seed)
	}
	assignment := `{"DB_PASSWORD":"SHORT \"quoted\" secret"}`
	for level := 0; level < 3; level++ {
		f.Add(assignment)
		encoded, err := json.Marshal(assignment)
		if err != nil {
			f.Fatal(err)
		}
		assignment = string(encoded[1 : len(encoded)-1])
	}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/pods", nil)
	request.Header.Set("Authorization", "Bearer REQUEST_CREDENTIAL_123456")
	request.Header.Set("Cookie", "session=short")
	redact := proxyDiagnosticRedactor(request)
	f.Fuzz(func(t *testing.T, message string) {
		out := redact(message)
		if len(out) > maxProxyDiagnosticBytes {
			t.Fatalf("output exceeds diagnostic bound: %d bytes", len(out))
		}
		if again := redact(out); again != out {
			t.Fatalf("redaction is not idempotent: input=%q first=%q second=%q", message, out, again)
		}
	})
}

func FuzzCredentialValueEnd(f *testing.F) {
	for _, seed := range []string{
		"", "\xff\x00", `"quoted"; constraint`, `'unterminated`, `\"escaped\"`,
		`{"nested":["secret", {"other":"value"}]}; constraint`, `["unfinished`,
		"|\n  secret", "-----BEGIN PRIVATE KEY-----\nsecret", "[redacted]", "bare; constraint",
		strings.Repeat("\\", maxProxyDiagnosticBytes),
	} {
		f.Add(seed, uint16(0))
	}
	f.Fuzz(func(t *testing.T, value string, offset uint16) {
		start := int(offset) % (len(value) + 1)
		end := credentialValueEnd(value, start)
		if end < start || end > len(value) {
			t.Fatalf("value extent outside input: start=%d end=%d length=%d", start, end, len(value))
		}
	})
}
