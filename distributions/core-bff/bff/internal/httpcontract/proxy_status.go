package httpcontract

import (
	"encoding/base64"
	"net/http"
	"regexp"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	maxProxyDiagnosticBytes = 8192
	// Short values are ambiguous in prose. Redact them only in credential contexts.
	minOpaqueCredentialBytes = 16
)

var credentialText = regexp.MustCompile(`(?i)\b(?:bearer|basic)\s+[a-z0-9._~+/=-]+`)
var bearerSubprotocolText = regexp.MustCompile(`(?i)base64url\.bearer\.authorization\.k8s\.io\.[a-z0-9_-]+`)
var credentialAssignment = regexp.MustCompile(`(?i)\b(?:authorization|proxy-authorization|token|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|api[_-]?key|(?:[a-z0-9]+[_-])*(?:secret(?:[_-]?(?:access[_-]?)?key)?|private[_-]?key|session(?:[_-]?(?:id|token|key))?))\s*[:=]\s*(?:(?:bearer|basic)\s+)?(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)`)

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

func proxyDiagnosticsAllowed(r *http.Request) bool {
	if r == nil || r.URL == nil {
		return false
	}
	path := r.URL.Path
	if rest, ok := strings.CutPrefix(path, constants.BFFPathPrefix+"/"); ok {
		path = "/" + rest
	}
	for _, prefix := range []string{constants.K8sProxyPrefix, constants.WssProxyPrefix} {
		if rest, ok := strings.CutPrefix(path, prefix); ok {
			path = "/" + rest
			break
		}
	}
	segments := strings.Split(strings.Trim(path, "/"), "/")
	// Unknown routes and discovery errors retain the strict fallback.
	coreResource := len(segments) >= 3 && strings.HasPrefix(path, constants.K8sCoreAPIPrefix)
	groupedResource := len(segments) >= 4 && strings.HasPrefix(path, constants.K8sGroupedAPIPrefix)
	if !coreResource && !groupedResource {
		return false
	}
	for _, segment := range segments {
		if segment == string(corev1.ResourceSecrets) {
			return false
		}
	}
	return true
}

func proxyDiagnosticRedactor(r *http.Request) func(string) string {
	var credentials []string
	knownTokens := map[string]bool{}
	for _, name := range []string{constants.HeaderAuthorization, constants.HeaderProxyAuthorization, constants.HeaderForwardedToken} {
		for _, value := range r.Header.Values(name) {
			token := value
			if _, raw, ok := strings.Cut(value, " "); ok {
				token = strings.TrimSpace(raw)
			}
			knownTokens[token] = true
			for _, candidate := range []string{token, base64.RawURLEncoding.EncodeToString([]byte(token))} {
				if len(candidate) >= minOpaqueCredentialBytes {
					credentials = append(credentials, candidate)
				}
			}
		}
	}
	for _, cookie := range r.Cookies() {
		// The name/value pair identifies a credential context even for short values.
		credentials = append(credentials, cookie.Name+"="+cookie.Value)
		if len(cookie.Value) >= minOpaqueCredentialBytes {
			credentials = append(credentials, cookie.Value)
		}
	}
	return func(value string) string {
		if len(value) > maxProxyDiagnosticBytes {
			return ""
		}
		for _, credential := range credentials {
			if credential != "" {
				value = replaceCredentialValue(value, credential)
			}
		}
		value = credentialText.ReplaceAllStringFunc(value, func(match string) string {
			parts := strings.Fields(match)
			token := strings.TrimRight(parts[1], ".")
			credential := knownTokens[parts[1]] || knownTokens[token]
			if strings.EqualFold(parts[0], "basic") {
				decoded, err := base64.StdEncoding.DecodeString(token)
				credential = credential || err == nil && strings.Contains(string(decoded), ":")
			} else {
				// JWTs and opaque digit-bearing values are credential-shaped; ordinary
				// words such as "basic configuration" and "bearer permissions" are not.
				credential = credential || strings.ContainsAny(token, "_+/=") ||
					len(token) >= minOpaqueCredentialBytes && (strings.HasPrefix(token, "eyJ") && strings.Count(token, ".") == 2 || strings.ContainsAny(token, "0123456789"))
			}
			if credential {
				return "[redacted credential]" + strings.TrimPrefix(parts[1], token)
			}
			return match
		})
		value = bearerSubprotocolText.ReplaceAllString(value, "[redacted credential]")
		value = credentialAssignment.ReplaceAllString(value, "[redacted credential]")
		if len(value) > maxProxyDiagnosticBytes {
			return ""
		}
		return value
	}
}

// Match a complete credential value, never a substring of a word or resource name.
func replaceCredentialValue(value, credential string) string {
	var out strings.Builder
	cursor := 0
	for offset := 0; offset < len(value); {
		index := strings.Index(value[offset:], credential)
		if index < 0 {
			break
		}
		start := offset + index
		end := start + len(credential)
		if (start == 0 || !credentialByte(value[start-1])) && (end == len(value) || !credentialByte(value[end])) {
			out.WriteString(value[cursor:start])
			out.WriteString("[redacted]")
			cursor = end
		}
		offset = end
	}
	out.WriteString(value[cursor:])
	return out.String()
}

func credentialByte(b byte) bool {
	return b >= 'a' && b <= 'z' || b >= 'A' && b <= 'Z' || b >= '0' && b <= '9' || strings.ContainsRune("_.~+/=-", rune(b))
}
