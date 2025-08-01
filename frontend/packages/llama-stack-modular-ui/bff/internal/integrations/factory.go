package integrations

import (
	"errors"
	"fmt"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	"log/slog"
	"net/http"
	"strings"
)

//
// ─── TOKEN FACTORY (USER TOKEN) ────────────────────────────────────────────────
// uses a user-provided Bearer token for client creation.
// each user has a separate client instance.
//

type TokenClientFactory struct {
	Logger *slog.Logger
	Header string
	Prefix string
}

func NewTokenClientFactory(logger *slog.Logger, cfg config.EnvConfig) *TokenClientFactory {
	return &TokenClientFactory{
		Logger: logger,
		Header: cfg.AuthTokenHeader,
		Prefix: cfg.AuthTokenPrefix,
	}
}

func (f *TokenClientFactory) ExtractRequestIdentity(httpHeader http.Header) (*RequestIdentity, error) {
	raw := httpHeader.Get(f.Header)
	if raw == "" {
		return nil, fmt.Errorf("missing required Header: %s", f.Header)
	}

	token := raw
	if f.Prefix != "" {
		if !strings.HasPrefix(raw, f.Prefix) {
			return nil, fmt.Errorf("expected token Header %s to start with Prefix %q", f.Header, f.Prefix)
		}
		token = strings.TrimPrefix(raw, f.Prefix)
	}

	return &RequestIdentity{
		Token: strings.TrimSpace(token),
	}, nil
}

func (f *TokenClientFactory) ValidateRequestIdentity(identity *RequestIdentity) error {

	if identity == nil {
		return errors.New("missing identity")
	}

	if identity.Token == "" {
		return errors.New("token is required for token-based authentication")
	}

	return nil
}
