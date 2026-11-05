package repositories

import (
	"context"
	"errors"
	"fmt"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	k8stesting "k8s.io/client-go/testing"
)

// mockUserAllowedClient implements a minimal KubernetesClientInterface for testing resolveIsAllowed.
type mockUserAllowedClient struct {
	k8s.KubernetesClientInterface
	allowed bool
	calls   int
	err     error
}

func (m *mockUserAllowedClient) IsUserAllowed(_ context.Context, _ *k8s.RequestIdentity) (bool, error) {
	m.calls++
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
	authRepo := NewAuthRepository(newFakeDynClientWithAuth([]string{models.SystemAuthenticated}))
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

func TestResolveIsAllowed_FailedReviewIsNotSuccess(t *testing.T) {
	authRepo := NewAuthRepository(newFakeDynClientWithAuth([]string{"restricted-group"}))
	client := &mockUserAllowedClient{allowed: true, err: fmt.Errorf("CANARY review failure")}
	allowed, err := resolveIsAllowed(context.Background(), client, &k8s.RequestIdentity{}, authRepo)
	require.Error(t, err)
	assert.False(t, allowed)
}

type statusReviewClient struct {
	mockUserAllowedClient
	adminErr error
}

func (m *statusReviewClient) GetUser(context.Context, *k8s.RequestIdentity) (string, error) {
	return "user", nil
}

func (m *statusReviewClient) IsUserAdmin(context.Context, *k8s.RequestIdentity) (bool, error) {
	return false, m.adminErr
}

func TestGetStatusAdminReviewFailure(t *testing.T) {
	failure := errors.New("review unavailable")
	client := &statusReviewClient{adminErr: failure}
	repo := NewStatusRepository(nil, "test", NewAuthRepository(newFakeDynClientWithAuth(nil)))
	status, err := repo.GetStatus(context.Background(), client, &k8s.RequestIdentity{}, nil)
	require.ErrorIs(t, err, failure)
	require.Nil(t, status)
	require.Zero(t, client.calls)
}

func TestGetStatusAuthReadFailure(t *testing.T) {
	for _, failure := range []error{
		k8serrors.NewForbidden(models.AuthGVR.GroupResource(), models.AuthInstanceName, errors.New("denied")),
		k8serrors.NewServiceUnavailable("unavailable"),
	} {
		t.Run(failure.Error(), func(t *testing.T) {
			dynamicClient := newFakeDynClientWithAuth(nil)
			dynamicClient.PrependReactor("get", "auths", func(k8stesting.Action) (bool, runtime.Object, error) {
				return true, nil, failure
			})
			authRepo := NewAuthRepository(dynamicClient)
			client := &statusReviewClient{mockUserAllowedClient: mockUserAllowedClient{allowed: true}}
			allowed, err := resolveIsAllowed(context.Background(), client, &k8s.RequestIdentity{}, authRepo)
			require.ErrorIs(t, err, failure)
			require.False(t, allowed)
			repo := NewStatusRepository(nil, "test", authRepo)
			status, err := repo.GetStatus(context.Background(), client, &k8s.RequestIdentity{}, nil)
			require.ErrorIs(t, err, failure)
			require.Nil(t, status)
			require.Zero(t, client.calls, "Auth read failures must not fall back to SSAR")
		})
	}
}

func TestResolveIsAllowedMissingAuthInstanceFallsBackToSSAR(t *testing.T) {
	for _, granted := range []bool{false, true} {
		client := &mockUserAllowedClient{allowed: granted}
		allowed, err := resolveIsAllowed(context.Background(), client, &k8s.RequestIdentity{}, NewAuthRepository(newFakeDynClientInstanceAbsent()))
		require.NoError(t, err)
		require.Equal(t, granted, allowed)
		require.Equal(t, 1, client.calls)
	}
}
