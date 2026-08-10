package kubernetes

import (
	"context"
	"errors"
)

// identityKey is the context key for storing the RequestIdentity
type identityKey struct{}

// ContextWithIdentity returns a new context with the RequestIdentity stored
func ContextWithIdentity(ctx context.Context, identity *RequestIdentity) context.Context {
	return context.WithValue(ctx, identityKey{}, identity)
}

// IdentityFromContext retrieves the RequestIdentity from the context.
// Returns an error if the identity is missing.
func IdentityFromContext(ctx context.Context) (*RequestIdentity, error) {
	identity, ok := ctx.Value(identityKey{}).(*RequestIdentity)
	if !ok || identity == nil {
		return nil, errors.New("missing request identity in context")
	}
	return identity, nil
}
