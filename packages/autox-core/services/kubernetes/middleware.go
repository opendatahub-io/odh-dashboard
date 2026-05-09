package kubernetes

import (
	"context"
	"net/http"
)

// InjectRequestIdentityConfig configures the identity injection middleware
type InjectRequestIdentityConfig struct {
	// Extractor extracts identity from HTTP headers
	Extractor IdentityExtractor
	// ContextKey is the key used to store identity in request context
	ContextKey any
	// SkipPaths are URL path prefixes that should skip identity extraction
	// Example: []string{"/healthcheck", "/static"}
	SkipPaths []string
	// OnError is called when identity extraction fails (optional)
	// If nil, a default 400 Bad Request response is returned
	OnError func(w http.ResponseWriter, r *http.Request, err error)
}

// InjectRequestIdentity is a generic middleware that extracts user identity from HTTP headers
// and injects it into the request context. Use this across all BFFs to avoid duplication.
//
// Example usage:
//   middleware := corek8s.InjectRequestIdentity(corek8s.InjectRequestIdentityConfig{
//       Extractor: identityExtractor,
//       ContextKey: constants.RequestIdentityKey,
//       SkipPaths: []string{"/healthcheck"},
//       OnError: app.badRequestResponse,
//   })
//   router.Use(middleware)
func InjectRequestIdentity(cfg InjectRequestIdentityConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check if path should be skipped
			for _, prefix := range cfg.SkipPaths {
				if len(r.URL.Path) >= len(prefix) && r.URL.Path[:len(prefix)] == prefix {
					next.ServeHTTP(w, r)
					return
				}
			}

			// Extract identity from headers
			identity, err := cfg.Extractor.Extract(r.Header)
			if err != nil {
				if cfg.OnError != nil {
					cfg.OnError(w, r, err)
				} else {
					// Default error response
					http.Error(w, err.Error(), http.StatusBadRequest)
				}
				return
			}

			// Inject identity into context
			ctx := context.WithValue(r.Context(), cfg.ContextKey, identity)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
