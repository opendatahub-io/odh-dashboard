package kubernetes

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/constants"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFactory_GetClientNilK8sFactory(t *testing.T) {
	factory := NewFactory(nil, slog.New(slog.NewTextHandler(io.Discard, nil)))

	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &k8s.RequestIdentity{UserID: "user@test.com"})
	_, err := factory.GetClient(ctx)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "kubernetes client factory is not configured")
}
