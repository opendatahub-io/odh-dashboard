package kubernetes

import (
	"fmt"
	"net/http"
	"strings"
)

// IdentityExtractor extracts user identity from HTTP headers based on authentication method
type IdentityExtractor interface {
	Extract(headers http.Header) (*RequestIdentity, error)
}

// mockIdentityExtractor returns a fixed identity for disabled auth (testing/development)
type mockIdentityExtractor struct{}

func (e *mockIdentityExtractor) Extract(headers http.Header) (*RequestIdentity, error) {
	return &RequestIdentity{
		UserID: "user@example.com",
		Groups: []string{"system:masters"},
	}, nil
}

// kubeflowHeaderExtractor extracts identity from Kubeflow headers (internal auth)
type kubeflowHeaderExtractor struct {
	UserIDHeader     string
	UserGroupsHeader string
}

func (e *kubeflowHeaderExtractor) Extract(headers http.Header) (*RequestIdentity, error) {
	userID := headers.Get(e.UserIDHeader)
	if userID == "" {
		return nil, fmt.Errorf("missing required header: %s", e.UserIDHeader)
	}

	// Extract groups from comma-separated header
	groups := []string{}
	userGroupsHeader := headers.Get(e.UserGroupsHeader)
	if userGroupsHeader != "" {
		for _, g := range strings.Split(userGroupsHeader, ",") {
			groups = append(groups, strings.TrimSpace(g))
		}
	}

	return &RequestIdentity{
		UserID: userID,
		Groups: groups,
	}, nil
}

// tokenHeaderExtractor extracts bearer token from Authorization header (user_token auth)
type tokenHeaderExtractor struct {
	Header string
	Prefix string
}

func (e *tokenHeaderExtractor) Extract(headers http.Header) (*RequestIdentity, error) {
	raw := headers.Get(e.Header)
	if raw == "" {
		return nil, fmt.Errorf("missing required header: %s", e.Header)
	}

	token := raw
	if e.Prefix != "" {
		if !strings.HasPrefix(raw, e.Prefix) {
			return nil, fmt.Errorf("expected token header %s to start with prefix %q", e.Header, e.Prefix)
		}
		token = strings.TrimPrefix(raw, e.Prefix)
	}

	return &RequestIdentity{
		Token: strings.TrimSpace(token),
	}, nil
}

// NewIdentityExtractor creates the appropriate extractor based on auth method
func NewIdentityExtractor(authMethod, tokenHeader, tokenPrefix, userIDHeader, userGroupsHeader string) (IdentityExtractor, error) {
	switch authMethod {
	case "disabled":
		return &mockIdentityExtractor{}, nil
	case "internal":
		return &kubeflowHeaderExtractor{
			UserIDHeader:     userIDHeader,
			UserGroupsHeader: userGroupsHeader,
		}, nil
	case "user_token":
		return &tokenHeaderExtractor{
			Header: tokenHeader,
			Prefix: tokenPrefix,
		}, nil
	default:
		// Don't expose auth method to client - this is a configuration error
		// The actual auth method should be logged server-side during startup
		return nil, fmt.Errorf("%w: unsupported auth method", ErrInvalid)
	}
}
