package openshell

import (
	"context"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/constants"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
)

// contextAuthProvider implements grpc.PerRPCCredentials by extracting the
// user's Bearer token from the request context on every gRPC call. This
// allows a single shared gRPC connection to carry per-user identity.
//
// The token is placed in context by the InjectRequestIdentity middleware
// and flows through: HTTP handler → repository → agents.Client → SDK →
// gRPC call → GetRequestMetadata(ctx) → authorization header.
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

	return map[string]string{
		"authorization": "Bearer " + identity.Token,
	}, nil
}

func (p *contextAuthProvider) RequireTransportSecurity() bool {
	return !p.insecure
}
