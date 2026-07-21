package openshell

import (
	"context"
	"strings"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/constants"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
)

// contextAuthProvider implements grpc.PerRPCCredentials by extracting the
// user's Bearer token from the request context on every gRPC call. This
// allows a single shared gRPC connection to carry per-user identity.
//
// Only forwards OIDC JWTs (eyJ... prefix). OpenShift opaque tokens (sha256~)
// are not forwarded — the Gateway can't validate them and rejects them even
// when allowUnauthenticatedUsers is enabled (it tries JWT validation first).
type contextAuthProvider struct {
	insecure bool
}

func NewContextAuthProvider(insecure bool) *contextAuthProvider {
	return &contextAuthProvider{insecure: insecure}
}

func (p *contextAuthProvider) GetRequestMetadata(ctx context.Context, _ ...string) (map[string]string, error) {
	val := ctx.Value(constants.RequestIdentityKey)
	if val == nil {
		return nil, nil
	}

	identity, ok := val.(*k8s.RequestIdentity)
	if !ok || identity.Token == "" {
		return nil, nil
	}

	token := identity.Token
	if strings.HasPrefix(token, "sha256~") {
		return nil, nil
	}

	return map[string]string{
		"authorization": "Bearer " + token,
	}, nil
}

func (p *contextAuthProvider) RequireTransportSecurity() bool {
	return !p.insecure
}
