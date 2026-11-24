// Package callerauth resolves the caller's credential from an inbound request.
//
// It is the single place Core BFF decides which header carries the caller's
// token, so every transport (REST handlers, the Kubernetes HTTP and WebSocket
// proxies, the model-serving and module proxies) authenticates the same caller
// the same way. It deliberately knows nothing about Kubernetes: it returns a raw
// token and the header it came from, and the identity type that wraps it can be
// swapped without touching this package.
//
// The precedence and failure rules are documented in
// distributions/core-bff/docs/runtime-contract.md ("Caller credentials").
package callerauth

import (
	"crypto/subtle"
	"fmt"
	"net/http"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
)

// bearerScheme is the RFC 6750 scheme. Scheme matching is case-insensitive
// (RFC 7235 §2.1); the outbound header is always rebuilt as "Bearer <token>".
const bearerScheme = "bearer"

// Extractor reads the caller credential from request headers.
//
// The zero value is not usable; build one with New or Legacy.
type Extractor struct {
	// headers is the ordered list of credential headers, canonicalized.
	headers []string
	// legacyPrefix is the AUTH_TOKEN_PREFIX applied in single-header mode.
	legacyPrefix string
	// ordered is true when AUTH_TOKEN_HEADERS configured an ordered list.
	ordered bool
}

// New builds the extractor for a resolved configuration.
//
// When AUTH_TOKEN_HEADERS is set it wins and the ordered multi-header rules
// apply. Otherwise the single AUTH_TOKEN_HEADER / AUTH_TOKEN_PREFIX pair is used
// exactly as before, which keeps the OpenShift contract unchanged.
func New(cfg config.EnvConfig) Extractor {
	if len(cfg.AuthTokenHeaders) > 0 {
		return Ordered(cfg.AuthTokenHeaders...)
	}
	return Legacy(cfg.AuthTokenHeader, cfg.AuthTokenPrefix)
}

// Legacy is the single-header extractor: one configured header, an optional
// prefix that must be present when configured.
// Surrounding whitespace in the header name is dropped, as for Ordered, so a
// value that passes startup validation also matches incoming requests.
func Legacy(header, prefix string) Extractor {
	return Extractor{headers: []string{http.CanonicalHeaderKey(strings.TrimSpace(header))}, legacyPrefix: prefix}
}

// Ordered is the multi-header extractor. Headers are consulted in the given
// order. Authorization must use the Bearer scheme; any other header carries the
// bare token.
func Ordered(headers ...string) Extractor {
	canon := make([]string, 0, len(headers))
	for _, h := range headers {
		canon = append(canon, http.CanonicalHeaderKey(strings.TrimSpace(h)))
	}
	return Extractor{headers: canon, ordered: true}
}

// Headers returns the credential header names this extractor reads, in
// precedence order. Callers use it to strip inbound credentials before
// proxying, to redact logs, to list CORS request headers and to build Vary.
func (e Extractor) Headers() []string {
	return append([]string(nil), e.headers...)
}

// Credential is a resolved caller credential.
type Credential struct {
	// Token is the raw bearer token. Never log it.
	Token string
	// Header is the canonical name of the header the token was taken from.
	Header string
}

// Sent reports whether the request carries any configured credential header
// at all, even with an empty value. Only a request for which it is false has
// no credential; DEV_MODE substitutes its kubeconfig identity only then.
func (e Extractor) Sent(h http.Header) bool {
	for _, header := range e.headers {
		if _, ok := h[header]; ok {
			return true
		}
	}
	return false
}

// Extract resolves the caller credential.
//
// Errors wrap httpcontract.ErrCredentialsMissing (no credential header present)
// or httpcontract.ErrCredentialsInvalid (present but unusable). Error text names
// headers but never contains a header value.
func (e Extractor) Extract(h http.Header) (Credential, error) {
	if len(e.headers) == 0 || e.headers[0] == "" {
		return Credential{}, fmt.Errorf("no credential header configured: %w", httpcontract.ErrCredentialsMissing)
	}
	if !e.ordered {
		return e.extractLegacy(h)
	}
	return e.extractOrdered(h)
}

// extractLegacy is the pre-existing single-header behaviour, kept byte-for-byte
// compatible: first value only, empty means missing, prefix enforced when set.
func (e Extractor) extractLegacy(h http.Header) (Credential, error) {
	header := e.headers[0]
	raw := h.Get(header)
	if raw == "" {
		return Credential{}, fmt.Errorf("missing required header: %s: %w", header, httpcontract.ErrCredentialsMissing)
	}

	token := raw
	if e.legacyPrefix != "" {
		if !strings.HasPrefix(raw, e.legacyPrefix) {
			return Credential{}, fmt.Errorf("malformed credential: %w", httpcontract.ErrCredentialsInvalid)
		}
		token = strings.TrimPrefix(raw, e.legacyPrefix)
	}

	token = strings.TrimSpace(token)
	if token == "" {
		return Credential{}, httpcontract.ErrCredentialsInvalid
	}
	return Credential{Token: token, Header: header}, nil
}

// extractOrdered applies the multi-header rules:
//
//   - A header that is absent, or present with an empty value, is skipped.
//     net/http trims header whitespace, so a whitespace-only value sent on
//     the wire also arrives empty and is skipped. (DEV_MODE still treats such
//     a request as having sent a credential; see Sent.)
//   - A header that is present must be well formed. A malformed header fails
//     the request; it never falls through to the next header, because the
//     edge may have authenticated exactly that header.
//   - A header repeated with several values is rejected.
//   - Every credential presented must carry the same token. The first header
//     in precedence order is reported as the source. Two different tokens
//     fail closed: Core BFF cannot tell which one the edge authenticated.
//   - No header present at all is ErrCredentialsMissing.
func (e Extractor) extractOrdered(h http.Header) (Credential, error) {
	var found Credential
	for _, header := range e.headers {
		values := h.Values(header)
		if len(values) == 0 || (len(values) == 1 && values[0] == "") {
			continue
		}
		if len(values) > 1 {
			return Credential{}, fmt.Errorf("credential header %s is repeated: %w", header, httpcontract.ErrCredentialsInvalid)
		}

		token, err := parseValue(header, values[0])
		if err != nil {
			return Credential{}, err
		}

		if found.Token == "" {
			found = Credential{Token: token, Header: header}
			continue
		}
		// Constant-time, so the comparison does not reveal how much of one
		// token matches the other.
		if subtle.ConstantTimeCompare([]byte(token), []byte(found.Token)) != 1 {
			return Credential{}, fmt.Errorf("credential headers %s and %s carry different tokens: %w", found.Header, header, httpcontract.ErrCredentialsInvalid)
		}
	}

	if found.Token == "" {
		return Credential{}, fmt.Errorf("missing required header: one of %s: %w", strings.Join(e.headers, ", "), httpcontract.ErrCredentialsMissing)
	}
	return found, nil
}

func parseValue(header, value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", fmt.Errorf("credential header %s is blank: %w", header, httpcontract.ErrCredentialsInvalid)
	}

	if strings.EqualFold(header, constants.HeaderAuthorization) {
		scheme, token, ok := strings.Cut(value, " ")
		if !ok || !strings.EqualFold(scheme, bearerScheme) {
			return "", fmt.Errorf("credential header %s does not use the Bearer scheme: %w", header, httpcontract.ErrCredentialsInvalid)
		}
		value = strings.TrimSpace(token)
		if value == "" {
			return "", fmt.Errorf("credential header %s has an empty bearer token: %w", header, httpcontract.ErrCredentialsInvalid)
		}
	}

	// A bearer token is a single token68 value. Embedded whitespace or a comma
	// means the header carries something else (a second scheme, a list joined
	// by a proxy, a typo).
	if strings.ContainsAny(value, " \t\r\n,") {
		return "", fmt.Errorf("credential header %s is malformed: %w", header, httpcontract.ErrCredentialsInvalid)
	}
	return value, nil
}
