package httpcontract

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"regexp"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"k8s.io/apimachinery/pkg/util/validation/field"
)

const (
	maxProxyDiagnosticBytes = 8192
	// Short values are ambiguous in prose. Redact them only in credential contexts.
	minOpaqueCredentialBytes   = 16
	redactionPlaceholder       = "[redacted credential]"
	knownCredentialPlaceholder = "[redacted]"
	pemBeginPrefix             = "-----BEGIN "
)

// Diagnostic text supports known request credentials, Bearer/Basic credentials,
// Kubernetes bearer subprotocols and name=value or name: value assignments.
// Credential names ignore case, hyphens and underscores, including service prefixes.
// Kubernetes validation fields can include terminal map keys and array indices;
// their labels and paths are retained while echoed credential values are redacted.
//
// Values may be single/double quoted (including repeated JSON escaping), JSON
// objects/arrays, PEM blocks/chains, or bare scalars ending at whitespace, comma
// or semicolon. Missing closing quotes, malformed JSON/PEM and YAML block scalars
// suppress the remainder: their extent cannot be safely inferred from free text.
// Only these explicit contexts are recognized, not arbitrary sensitive prose.
// Input and output over 8 KiB return an empty result to select the strict fallback.
var credentialText = regexp.MustCompile(`(?i)\b(?:bearer|basic)\s+[a-z0-9._~+/=-]+`)
var bearerSubprotocolText = regexp.MustCompile(`(?i)base64url\.bearer\.authorization\.k8s\.io\.[a-z0-9_-]+`)

// The captures are the credential name and its optional map-key/index suffix.
// A closing quote alone belongs to a JSON property, not a validation field path.
var credentialAssignment = regexp.MustCompile(`(?i)(?:\\*["'])?\b([a-z0-9_-]+)(?:\\*["'])?(\]?(?:\[[0-9]{1,10}\])*)\s*[:=]\s*(?:(?:bearer|basic)\s+)?`)

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

func isCredentialField(path string) bool {
	for strings.HasSuffix(path, "]") {
		start := strings.LastIndexByte(path, '[')
		if start < 0 {
			return false
		}
		if !arrayIndex.MatchString(path[start:]) {
			return isKnownCredentialName(strings.Trim(path[start+1:len(path)-1], `"'`))
		}
		path = path[:start]
	}
	return isKnownCredentialName(path[strings.LastIndexByte(path, '.')+1:])
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
		delimiter := match[3]
		if match[4] < match[5] {
			delimiter = match[5] // Map-key closing brackets and array indices belong to the field path.
		}
		if delimiter < len(value) && value[delimiter] == ':' {
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
	if start == len(value) {
		return start
	}
	if strings.HasPrefix(value[start:], knownCredentialPlaceholder) {
		return start + len(knownCredentialPlaceholder)
	}
	if value[start] == '{' || value[start] == '[' {
		decoder := json.NewDecoder(strings.NewReader(value[start:]))
		var raw json.RawMessage
		if decoder.Decode(&raw) == nil {
			return start + int(decoder.InputOffset())
		}
		return len(value) // Do not forward a fragment of an unparseable structured value.
	}
	if strings.HasPrefix(value[start:], pemBeginPrefix) {
		remaining := []byte(value[start:])
		for {
			block, rest := pem.Decode(remaining)
			if block == nil {
				return len(value)
			}
			end := len(value) - len(rest)
			remaining = bytes.TrimLeft(rest, " \t\r\n")
			if bytes.HasPrefix(remaining, []byte(pemBeginPrefix)) {
				continue
			}
			for end > start && (value[end-1] == '\r' || value[end-1] == '\n') {
				end--
			}
			return end
		}
	}
	if value[start] == '|' || value[start] == '>' {
		// YAML block boundaries depend on indentation outside this diagnostic.
		return len(value)
	}
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

// Match complete known values, preserving larger words/resource names such as
// token.example. Slashes, equals signs and sentence-ending periods delimit values.
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
			out.WriteString(knownCredentialPlaceholder)
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
