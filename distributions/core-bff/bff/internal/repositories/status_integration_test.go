package repositories

import (
	"context"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockUserAllowedClient implements a minimal KubernetesClientInterface for testing resolveIsAllowed.
type mockUserAllowedClient struct {
	k8s.KubernetesClientInterface
	allowed bool
	err     error
}

func (m *mockUserAllowedClient) IsUserAllowed(_ context.Context, _ *k8s.RequestIdentity) (bool, error) {
	return m.allowed, m.err
}

func TestResolveIsAllowed_CRDAbsent_AllowsEveryone(t *testing.T) {
	authRepo := NewAuthRepository(newFakeDynClientCRDAbsent())
	client := &mockUserAllowedClient{allowed: false}

	allowed, err := resolveIsAllowed(context.Background(), client, &k8s.RequestIdentity{}, authRepo)
	require.NoError(t, err)
	assert.True(t, allowed)
}

func TestResolveIsAllowed_SystemAuthenticated_AllowsEveryone(t *testing.T) {
	authRepo := NewAuthRepository(newFakeDynClientWithAuth([]string{"system:authenticated"}))
	client := &mockUserAllowedClient{allowed: false}

	allowed, err := resolveIsAllowed(context.Background(), client, &k8s.RequestIdentity{}, authRepo)
	require.NoError(t, err)
	assert.True(t, allowed)
}

func TestResolveIsAllowed_NoEscapeHatch_FallsToSSAR_Allowed(t *testing.T) {
	authRepo := NewAuthRepository(newFakeDynClientWithAuth([]string{"restricted-group"}))
	client := &mockUserAllowedClient{allowed: true}

	allowed, err := resolveIsAllowed(context.Background(), client, &k8s.RequestIdentity{}, authRepo)
	require.NoError(t, err)
	assert.True(t, allowed)
}

func TestResolveIsAllowed_NoEscapeHatch_FallsToSSAR_Denied(t *testing.T) {
	authRepo := NewAuthRepository(newFakeDynClientWithAuth([]string{"restricted-group"}))
	client := &mockUserAllowedClient{allowed: false}

	allowed, err := resolveIsAllowed(context.Background(), client, &k8s.RequestIdentity{}, authRepo)
	require.NoError(t, err)
	assert.False(t, allowed)
}
