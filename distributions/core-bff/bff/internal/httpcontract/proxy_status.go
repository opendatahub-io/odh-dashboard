package httpcontract

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/validation/field"
)

const (
	maxProxyDiagnosticBytes = 8192
	// Short values are ambiguous in prose. Redact them only in credential contexts.
	minOpaqueCredentialBytes = 16
	redactionPlaceholder     = "[redacted credential]"
)

var credentialText = regexp.MustCompile(`(?i)\b(?:bearer|basic)\s+[a-z0-9._~+/=-]+`)
var bearerSubprotocolText = regexp.MustCompile(`(?i)base64url\.bearer\.authorization\.k8s\.io\.[a-z0-9_-]+`)
var credentialAssignment = regexp.MustCompile(`(?i)(?:\\*["'])?\b([a-z0-9_-]+)(?:\\*["'])?\s*[:=]\s*(?:(?:bearer|basic)\s+)?`)

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
			if len(cause.Message) <= maxProxyDiagnosticBytes && isKnownCredentialName(cause.Field[strings.LastIndex(cause.Field, ".")+1:]) {
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
				return redactionPlaceholder + strings.TrimPrefix(parts[1], token)
			}
			return match
		})
		value = bearerSubprotocolText.ReplaceAllString(value, redactionPlaceholder)
		value = redactCredentialAssignments(value)
		if len(value) > maxProxyDiagnosticBytes {
			return ""
		}
		return value
	}
}

// isKnownCredentialName recognizes explicit credential contexts; it is not a complete secret detector.
func isKnownCredentialName(name string) bool {
	// The assignment matcher admits ASCII names. Bound normalization to the
	// longest known name instead of repeatedly copying every service prefix.
	var suffix [len("proxyauthorization")]byte
	start := len(suffix)
	for i := len(name) - 1; i >= -1; i-- {
		if i >= 0 && name[i] != '_' && name[i] != '-' {
			if start == 0 {
				return false
			}
			start--
			suffix[start] = name[i]
			if suffix[start] >= 'A' && suffix[start] <= 'Z' {
				suffix[start] += 'a' - 'A'
			}
			continue
		}
		// Check only whole names or suffixes following a service-prefix separator.
		switch string(suffix[start:]) {
		case "authorization", "proxyauthorization", "token", "accesstoken", "refreshtoken", "clientsecret", "password", "apikey",
			"secret", "secretkey", "secretaccesskey", "privatekey", "session", "sessionid", "sessiontoken", "sessionkey":
			return true
		}
	}
	return false
}

// A zero offset identifies a diagnostic without an echoed credential value.
func credentialValidationValueStart(message string) (int, bool) {
	for _, kind := range []field.ErrorType{
		field.ErrorTypeRequired, field.ErrorTypeForbidden, field.ErrorTypeTooLong, field.ErrorTypeInternal,
		field.ErrorTypeTooMany, field.ErrorTypeInvalid, field.ErrorTypeNotSupported, field.ErrorTypeNotFound, field.ErrorTypeDuplicate,
	} {
		rest, ok := strings.CutPrefix(message, kind.String())
		if !ok || rest != "" && !strings.ContainsRune(":,]", rune(rest[0])) {
			continue
		}
		switch kind {
		case field.ErrorTypeRequired, field.ErrorTypeForbidden, field.ErrorTypeTooLong, field.ErrorTypeInternal, field.ErrorTypeTooMany:
			return 0, true
		}
		if strings.HasPrefix(rest, ": ") {
			return len(message) - len(rest) + 2, true
		}
		return 0, true
	}
	return 0, false
}

func credentialValidationValueEnd(value string, start int) int {
	if strings.HasPrefix(value[start:], redactionPlaceholder) {
		return start + len(redactionPlaceholder)
	}
	decoder := json.NewDecoder(strings.NewReader(value[start:]))
	var raw json.RawMessage
	if decoder.Decode(&raw) == nil {
		end := start + int(decoder.InputOffset())
		if end == len(value) || strings.ContainsRune(":,]", rune(value[end])) {
			return end
		}
	}
	return credentialValueEnd(value, start)
}

func redactCredentialAssignments(value string) string {
	var out strings.Builder
	cursor := 0
	for _, match := range credentialAssignment.FindAllStringSubmatchIndex(value, -1) {
		if match[0] < cursor || !isKnownCredentialName(value[match[2]:match[3]]) {
			continue
		}
		if strings.HasPrefix(value[match[1]:], redactionPlaceholder) {
			continue
		}
		// Kubernetes field diagnostics use an unquoted name followed by a colon.
		if match[3] < len(value) && value[match[3]] == ':' {
			if start, ok := credentialValidationValueStart(value[match[1]:]); ok {
				if start == 0 {
					continue
				}
				start += match[1]
				end := credentialValidationValueEnd(value, start)
				out.WriteString(value[cursor:start])
				out.WriteString(redactionPlaceholder)
				cursor = end
				continue
			}
		}
		end := credentialValueEnd(value, match[1])
		if end == match[1] {
			continue
		}
		out.WriteString(value[cursor:match[0]])
		out.WriteString(redactionPlaceholder)
		cursor = end
	}
	out.WriteString(value[cursor:])
	return out.String()
}

func credentialValueEnd(value string, start int) int {
	quoteAt := start
	for quoteAt < len(value) && value[quoteAt] == '\\' {
		quoteAt++
	}
	if quoteAt < len(value) && (value[quoteAt] == '"' || value[quoteAt] == '\'') {
		escapes := quoteAt - start
		slashes := 0
		for i := quoteAt + 1; i < len(value); i++ {
			if value[i] == '\\' {
				slashes++
				continue
			}
			// JSON encoding turns a quote into \" and doubles existing backslashes.
			// At each encoding level, escaped inner quotes have a different parity.
			if value[i] == value[quoteAt] && slashes%(2*(escapes+1)) == escapes {
				return i + 1
			}
			slashes = 0
		}
		return len(value)
	}
	end := start
	for end < len(value) && !strings.ContainsRune(" \t\r\n\f,;", rune(value[end])) {
		end++
	}
	return end
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
		boundary := end
		for boundary < len(value) && value[boundary] == '.' {
			boundary++
		}
		if (start == 0 || !credentialByte(value[start-1])) && (boundary == len(value) || !credentialByte(value[boundary])) {
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
	// Slashes and equals signs delimit URL components and assignments.
	return b >= 'a' && b <= 'z' || b >= 'A' && b <= 'Z' || b >= '0' && b <= '9' || strings.ContainsRune("_.~+-", rune(b))
}
