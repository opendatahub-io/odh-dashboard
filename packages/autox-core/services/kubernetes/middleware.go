package kubernetes

import (
	"context"
	"net/http"
	"path"
	"strings"
)

// InjectRequestIdentityConfig configures the identity injection middleware
type InjectRequestIdentityConfig struct {
	// Extractor extracts identity from HTTP headers
	Extractor IdentityExtractor
	// SkipPaths are URL path prefixes that should skip identity extraction
	// Example: []string{"/healthcheck", "/static"}
	SkipPaths []string
	// OnError is called when identity extraction fails (optional)
	// If nil, a default 400 Bad Request response is returned
	OnError func(w http.ResponseWriter, r *http.Request, err error)
	// ContextKey is an optional fallback for backward compatibility
	// If provided, identity will be stored in both the typed context (via ContextWithIdentity)
	// and using this string key (for legacy code that expects a specific key)
	// Deprecated: New code should use IdentityFromContext instead
	ContextKey any
}

// InjectRequestIdentity is a generic middleware that extracts user identity from HTTP headers
// and injects it into the request context using ContextWithIdentity.
// Use this across all BFFs to avoid duplication.
//
// Example usage:
//
//	middleware := corek8s.InjectRequestIdentity(corek8s.InjectRequestIdentityConfig{
//	    Extractor: identityExtractor,
//	    SkipPaths: []string{"/healthcheck"},
//	    OnError: app.badRequestResponse,
//	})
//	router.Use(middleware)
func InjectRequestIdentity(cfg InjectRequestIdentityConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Clean the path to prevent traversal attacks (e.g., /./healthcheck, //healthcheck)
			cleanPath := path.Clean(r.URL.Path)
			// Check if path should be skipped
			for _, prefix := range cfg.SkipPaths {
				if strings.HasPrefix(cleanPath, prefix) {
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

			// Inject identity into context using standard helper
			ctx := ContextWithIdentity(r.Context(), identity)

			// BACKWARD COMPATIBILITY: Also store using legacy context key if provided
			// This allows old code that expects identity at a specific string key to keep working
			if cfg.ContextKey != "" {
				ctx = context.WithValue(ctx, cfg.ContextKey, identity)
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
