package kubernetes

import (
	"context"
	"fmt"
)

type requestIdentityContextKey struct{}

// ContextWithIdentity stores the authenticated request identity where Kubernetes
// transports can retrieve it before sending a request.
func ContextWithIdentity(ctx context.Context, identity *RequestIdentity) context.Context {
	return context.WithValue(ctx, requestIdentityContextKey{}, identity)
}

func identityFromContext(ctx context.Context) (*RequestIdentity, error) {
	identity, ok := ctx.Value(requestIdentityContextKey{}).(*RequestIdentity)
	if !ok || identity == nil {
		return nil, fmt.Errorf("missing RequestIdentity in context")
	}

	return identity, nil
}
