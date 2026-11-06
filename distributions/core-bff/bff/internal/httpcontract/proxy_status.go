package httpcontract

import (
	"net/http"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ProxyStatus preserves diagnostics that Kubernetes returned using the caller's
// credentials. Native handlers must use SanitizeStatus instead: their upstream
// calls can use the BFF's service account. Secret operations stay conservative.
func ProxyStatus(in metav1.Status, code int, r *http.Request) metav1.Status {
	out := SanitizeStatus(in, code)
	if in.Kind != "Status" || !proxyDiagnosticsAllowed(r) {
		return out
	}
	redact := proxyDiagnosticRedactor(r)
	if message := redact(in.Message); message != "" {
		out.Message = message
	}
	// Consumers historically recognize 404s from text as well as structured codes.
	if code == http.StatusNotFound && !strings.Contains(out.Message, "404") {
		out.Message = "404: " + out.Message
	}
	if in.Details != nil {
		if len(in.Details.Name) <= 253 {
			out.Details.Name = redact(in.Details.Name)
		}
		out.Details.Group = safeSchemaName(redact(out.Details.Group))
		out.Details.Kind = safeSchemaName(redact(out.Details.Kind))
		for i, cause := range in.Details.Causes {
			if len(cause.Message) <= maxProxyDiagnosticBytes && isCredentialField(cause.Field) {
				if start, ok := credentialValidationValueStart(cause.Message); ok && start > 0 {
					end := credentialValidationValueEnd(cause.Message, start)
					cause.Message = cause.Message[:start] + redactionPlaceholder + cause.Message[end:]
				}
			}
			if message := redact(cause.Message); message != "" {
				out.Details.Causes[i].Message = message
			}
			out.Details.Causes[i].Field = redact(cause.Field)
			if reason := safeSchemaName(redact(string(cause.Type))); reason != "" {
				out.Details.Causes[i].Type = metav1.CauseType(reason)
			}
		}
	}
	return out
}
