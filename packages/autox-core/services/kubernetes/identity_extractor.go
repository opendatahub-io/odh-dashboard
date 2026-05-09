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

// MockIdentityExtractor returns a fixed identity for disabled auth (testing/development)
type MockIdentityExtractor struct{}

func (e *MockIdentityExtractor) Extract(headers http.Header) (*RequestIdentity, error) {
	return &RequestIdentity{
		UserID: "user@example.com",
		Groups: []string{"system:masters"},
	}, nil
}

// KubeflowHeaderExtractor extracts identity from Kubeflow headers (internal auth)
type KubeflowHeaderExtractor struct {
	UserIDHeader     string
	UserGroupsHeader string
}

func (e *KubeflowHeaderExtractor) Extract(headers http.Header) (*RequestIdentity, error) {
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

// TokenHeaderExtractor extracts bearer token from Authorization header (user_token auth)
type TokenHeaderExtractor struct {
	Header string
	Prefix string
}

func (e *TokenHeaderExtractor) Extract(headers http.Header) (*RequestIdentity, error) {
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
		return &MockIdentityExtractor{}, nil
	case "internal":
		return &KubeflowHeaderExtractor{
			UserIDHeader:     userIDHeader,
			UserGroupsHeader: userGroupsHeader,
		}, nil
	case "user_token":
		return &TokenHeaderExtractor{
			Header: tokenHeader,
			Prefix: tokenPrefix,
		}, nil
	default:
		return nil, fmt.Errorf("unsupported auth method: %s", authMethod)
	}
}
