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
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
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

func TestGetStatusReviewFailuresPreserveAuthenticatedSession(t *testing.T) {
	for _, tc := range []struct {
		name                 string
		adminErr, allowedErr error
		allowed              bool
	}{
		{name: "admin failed, user allowed", adminErr: errors.New("CANARY_ADMIN"), allowed: true},
		{name: "admin failed, user denied", adminErr: errors.New("CANARY_ADMIN")},
		{name: "both reviews failed", adminErr: errors.New("CANARY_ADMIN"), allowedErr: errors.New("CANARY_ALLOWED"), allowed: true},
		{name: "allowed review failed", allowedErr: errors.New("CANARY_ALLOWED"), allowed: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			client := &statusReviewClient{adminErr: tc.adminErr, mockUserAllowedClient: mockUserAllowedClient{allowed: tc.allowed, err: tc.allowedErr}}
			repo := NewStatusRepository(nil, "test", NewAuthRepository(newFakeDynClientWithAuth(nil)))
			status, err := repo.GetStatus(context.Background(), client, &k8s.RequestIdentity{}, statusClusterInfo{})
			require.NoError(t, err)
			require.Equal(t, "user", status.Kube.UserName)
			require.False(t, status.Kube.IsAdmin)
			require.Equal(t, tc.allowed && tc.allowedErr == nil, status.Kube.IsAllowed)
			require.Equal(t, 1, client.calls)
		})
	}
}

type statusClusterInfo struct{}

func (statusClusterInfo) GetClusterID() string       { return "cluster" }
func (statusClusterInfo) GetClusterBranding() string { return "test" }
func (statusClusterInfo) GetServerURL() string       { return "https://cluster.example" }
func (statusClusterInfo) GetCurrentContext() string  { return "test" }

func TestGetStatusAuthFailureFallsBackToSSAR(t *testing.T) {
	for _, auth := range []struct {
		name    string
		failure error
	}{
		{"forbidden", k8serrors.NewForbidden(models.AuthGVR.GroupResource(), models.AuthInstanceName, errors.New("CANARY_AUTH"))},
		{"unavailable", k8serrors.NewServiceUnavailable("CANARY_AUTH")},
		{"malformed", nil},
	} {
		for _, review := range []struct {
			name    string
			allowed bool
			failure error
		}{
			{"allowed", true, nil},
			{"denied", false, nil},
			{"failed", false, errors.New("CANARY_REVIEW")},
		} {
			t.Run(auth.name+"/"+review.name, func(t *testing.T) {
				dynamicClient := newFakeDynClientWithAuth(nil)
				dynamicClient.PrependReactor("get", "auths", func(k8stesting.Action) (bool, runtime.Object, error) {
					return true, &unstructured.Unstructured{Object: map[string]any{"spec": "invalid"}}, auth.failure
				})
				client := &statusReviewClient{mockUserAllowedClient: mockUserAllowedClient{allowed: review.allowed, err: review.failure}}
				repo := NewStatusRepository(nil, "test", NewAuthRepository(dynamicClient))
				status, err := repo.GetStatus(context.Background(), client, &k8s.RequestIdentity{}, statusClusterInfo{})
				require.Equal(t, 1, client.calls, "Auth failures must reach the caller's SSAR")
				require.NoError(t, err)
				require.Equal(t, review.allowed && review.failure == nil, status.Kube.IsAllowed)
				require.False(t, status.Kube.IsAdmin)
			})
		}
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
