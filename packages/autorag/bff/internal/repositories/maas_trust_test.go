package repositories

import (
	"context"
	"errors"
	"net/url"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type repositoryGatewayResolver struct {
	origin maas.MaaSOrigin
	err    error
}

func (r repositoryGatewayResolver) Resolve(context.Context) (maas.MaaSOrigin, error) {
	return r.origin, r.err
}

func TestTrustedMaaSContextRequiresExactDiscoveredOrigin(t *testing.T) {
	parsed, err := url.Parse("https://maas.apps.example.com/maas-api")
	require.NoError(t, err)
	discovered := maas.MaaSOrigin{Host: "maas.apps.example.com", Port: "443"}

	trusted := trustedMaaSContext(context.Background(), parsed, repositoryGatewayResolver{origin: discovered}, nil)
	got, ok := maas.TrustedMaaSOriginFromContext(trusted)
	require.True(t, ok)
	assert.Equal(t, discovered, got)

	mismatch := trustedMaaSContext(context.Background(), parsed, repositoryGatewayResolver{
		origin: maas.MaaSOrigin{Host: "other.apps.example.com", Port: "443"},
	}, nil)
	_, ok = maas.TrustedMaaSOriginFromContext(mismatch)
	assert.False(t, ok)

	failed := trustedMaaSContext(context.Background(), parsed, repositoryGatewayResolver{err: errors.New("unavailable")}, nil)
	_, ok = maas.TrustedMaaSOriginFromContext(failed)
	assert.False(t, ok)
}
