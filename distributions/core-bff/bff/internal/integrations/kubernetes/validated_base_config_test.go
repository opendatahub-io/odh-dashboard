package kubernetes

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
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

// The validated-base path must keep the shared caller-credential extractor, so
// the ordered AUTH_TOKEN_HEADERS list still applies (restack onto #10753).
func TestKubernetesClientFactory_ValidatedBaseKeepsCredentialHeaders(t *testing.T) {
	factory, err := NewKubernetesClientFactory(config.EnvConfig{
		AuthMethod:       config.AuthMethodUser,
		AuthTokenHeader:  config.DefaultAuthTokenHeader,
		AuthTokenHeaders: []string{"Authorization", "x-forwarded-access-token"},
	}, slog.Default(), &rest.Config{Host: "https://api.cluster.example:6443"})
	require.NoError(t, err)

	h := http.Header{}
	h.Set("Authorization", "Bearer caller-token")
	identity, err := factory.ExtractRequestIdentity(h)
	require.NoError(t, err, "a token in the first listed header is accepted")
	require.NotNil(t, identity)
	assert.Equal(t, "caller-token", identity.ResolveToken(""))
}

// The DEV_MODE fallback client runs on the kubeconfig's own credentials, and
// it too must use the copy validated at startup: a developer who switches
// context afterwards must not get REST calls on cluster B while the proxies
// stay on cluster A.
func TestKubernetesClientFactory_DevFallbackUsesTheValidatedBaseConfig(t *testing.T) {
	var aHits, bHits atomic.Int32
	a := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		aHits.Add(1)
		_, _ = w.Write([]byte(`{"major":"1","minor":"34"}`))
	}))
	defer a.Close()
	b := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bHits.Add(1)
		_, _ = w.Write([]byte(`{"major":"1","minor":"34"}`))
	}))
	defer b.Close()

	swapped := "apiVersion: v1\nkind: Config\n" +
		"clusters:\n- name: c\n  cluster:\n    server: " + b.URL + "\n" +
		"users:\n- name: u\n  user:\n    token: other\n" +
		"contexts:\n- name: ctx\n  context:\n    cluster: c\n    user: u\n" +
		"current-context: ctx\n"
	path := filepath.Join(t.TempDir(), "kubeconfig")
	require.NoError(t, os.WriteFile(path, []byte(swapped), 0600))
	t.Setenv("KUBECONFIG", path)

	factory, err := NewKubernetesClientFactory(config.EnvConfig{
		DevMode: true, AuthMethod: config.AuthMethodUser, AuthTokenHeader: constants.HeaderAuthorization,
	}, slog.Default(), &rest.Config{Host: a.URL, BearerToken: "developer"})
	require.NoError(t, err)

	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey,
		&RequestIdentity{Token: NewBearerToken("placeholder"), DevFallback: true})
	client, err := factory.GetClient(ctx)
	require.NoError(t, err)
	_, err = client.(*TokenKubernetesClient).Client.Discovery().ServerVersion()
	require.NoError(t, err)

	assert.Equal(t, int32(1), aHits.Load(), "the validated server")
	assert.Zero(t, bHits.Load(), "never the kubeconfig re-read after startup")
}
