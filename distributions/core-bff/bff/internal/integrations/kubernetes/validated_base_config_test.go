package kubernetes

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/client-go/rest"
)

// Startup validates one kubeconfig. A kubeconfig rewritten afterwards, here to
// skip certificate verification against another server, must not reach the
// clients built for callers.
func TestKubernetesClientFactory_CallerClientsUseTheValidatedBaseConfig(t *testing.T) {
	insecure := "apiVersion: v1\nkind: Config\n" +
		"clusters:\n- name: c\n  cluster:\n    server: https://swapped.example:6443\n    insecure-skip-tls-verify: true\n" +
		"users:\n- name: u\n  user:\n    token: kubeconfig-token\n" +
		"contexts:\n- name: ctx\n  context:\n    cluster: c\n    user: u\n" +
		"current-context: ctx\n"
	path := filepath.Join(t.TempDir(), "kubeconfig")
	require.NoError(t, os.WriteFile(path, []byte(insecure), 0600))
	t.Setenv("KUBECONFIG", path)

	validated := &rest.Config{Host: "https://api.cluster.example:6443"}
	factory, err := NewKubernetesClientFactory(config.EnvConfig{
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: constants.HeaderAuthorization,
	}, slog.Default(), validated)
	require.NoError(t, err)

	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey,
		&RequestIdentity{Token: NewBearerToken("caller-token")})
	client, err := factory.GetClient(ctx)
	require.NoError(t, err)

	restConfig := client.(*TokenKubernetesClient).RestConfig
	assert.Equal(t, validated.Host, restConfig.Host)
	assert.False(t, restConfig.Insecure, "the rewritten kubeconfig must not disable verification")
	assert.Equal(t, "caller-token", restConfig.BearerToken)
	assert.Empty(t, validated.BearerToken, "the shared base config is never modified")
}
