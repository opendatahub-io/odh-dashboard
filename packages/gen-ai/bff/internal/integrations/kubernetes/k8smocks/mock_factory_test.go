package k8smocks

import (
	"log/slog"
	"net/http"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/client-go/rest"
)

func TestMockTokenFactoryDisablesRealClientBackgroundWork(t *testing.T) {
	t.Setenv("KUBECONFIG", t.TempDir()+"/kubeconfig")
	t.Setenv("KUBERNETES_SERVICE_HOST", "")
	t.Setenv("KUBERNETES_SERVICE_PORT", "")

	factory, err := NewTokenClientFactory(nil, &rest.Config{}, slog.Default())
	require.NoError(t, err)
	mockFactory := factory.(*MockedTokenClientFactory)
	realFactory := mockFactory.realK8sFactory.(*k8s.TokenClientFactory)
	t.Cleanup(realFactory.Stop)

	assert.True(t, realFactory.Config.MockK8sClient, "identity-only delegate must skip OTel retries")
	assert.Nil(t, realFactory.SAClient, "mock factory must not use a real service-account client")

	headers := http.Header{}
	headers.Set(config.DefaultAuthTokenHeader, config.DefaultAuthTokenPrefix+"test-token")
	identity, err := factory.ExtractRequestIdentity(headers)
	require.NoError(t, err)
	assert.Equal(t, "test-token", identity.Token)
	assert.NoError(t, factory.ValidateRequestIdentity(identity))
}
