package repositories

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	k8stesting "k8s.io/client-go/testing"
)

// mockUserAllowedClient implements a minimal KubernetesClientInterface for
// testing the admission contract.
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

func admit(
	client k8s.KubernetesClientInterface, authRepo *AuthRepository, mode config.AdmissionMode, isAdmin bool,
) admissionDecision {
	return resolveAdmission(context.Background(), mode, isAdmin, client, &k8s.RequestIdentity{}, authRepo)
}

func TestResolveAdmission_AuthResourceMode(t *testing.T) {
	t.Run("CRD absent admits everyone", func(t *testing.T) {
		client := &mockUserAllowedClient{allowed: false}
		got := admit(client, NewAuthRepository(newFakeDynClientCRDAbsent()), config.AdmissionModeAuthResource, false)

		assert.True(t, got.Admitted)
		assert.Equal(t, CodeAdmissionCRDAbsent, got.Code)
		assert.Zero(t, client.calls, "no access review is needed when there is no group restriction")
	})

	t.Run("system:authenticated admits everyone", func(t *testing.T) {
		client := &mockUserAllowedClient{allowed: false}
		authRepo := NewAuthRepository(newFakeDynClientWithAuth([]string{models.SystemAuthenticated}))

		got := admit(client, authRepo, config.AdmissionModeAuthResource, false)

		assert.True(t, got.Admitted)
		assert.Equal(t, CodeAdmissionSystemAuthenticated, got.Code)
		assert.Zero(t, client.calls)
	})

	t.Run("a restricted group defers to the access review", func(t *testing.T) {
		for _, granted := range []bool{true, false} {
			client := &mockUserAllowedClient{allowed: granted}
			authRepo := NewAuthRepository(newFakeDynClientWithAuth([]string{"restricted-group"}))

			got := admit(client, authRepo, config.AdmissionModeAuthResource, false)

			assert.Equal(t, granted, got.Admitted)
			assert.Equal(t, CodeAdmissionReview, got.Code)
			assert.Equal(t, 1, client.calls)
		}
	})

	t.Run("an admin is admitted without a second review", func(t *testing.T) {
		client := &mockUserAllowedClient{allowed: false}
		authRepo := NewAuthRepository(newFakeDynClientWithAuth([]string{"restricted-group"}))

		got := admit(client, authRepo, config.AdmissionModeAuthResource, true)

		assert.True(t, got.Admitted)
		assert.Equal(t, CodeAdmissionAdmin, got.Code)
		assert.Zero(t, client.calls)
	})

	t.Run("a failed review is not success", func(t *testing.T) {
		client := &mockUserAllowedClient{allowed: true, err: fmt.Errorf("CANARY review failure")}
		authRepo := NewAuthRepository(newFakeDynClientWithAuth([]string{"restricted-group"}))

		got := admit(client, authRepo, config.AdmissionModeAuthResource, false)

		assert.False(t, got.Admitted)
		assert.Equal(t, CodeAdmissionReviewUnavailable, got.Code)
	})
}

// Each Auth failure mode defers to the caller's own review rather than denying
// outright, and reports a distinct code so the cause is visible in logs.
func TestResolveAdmission_AuthFailureModesDeferToTheReview(t *testing.T) {
	authGR := models.AuthGVR.GroupResource()

	cases := []struct {
		name     string
		authRepo func() *AuthRepository
		wantCode string
	}{
		{
			name:     "instance not provisioned",
			authRepo: func() *AuthRepository { return NewAuthRepository(newFakeDynClientInstanceAbsent()) },
			wantCode: CodeAdmissionAuthInstanceMissing,
		},
		{
			name: "service account forbidden",
			authRepo: func() *AuthRepository {
				return NewAuthRepository(newFakeDynClientFailingWith(
					k8serrors.NewForbidden(authGR, models.AuthInstanceName, errors.New("CANARY_AUTH"))))
			},
			wantCode: CodeAdmissionAuthForbidden,
		},
		{
			name: "upstream unavailable",
			authRepo: func() *AuthRepository {
				return NewAuthRepository(newFakeDynClientFailingWith(k8serrors.NewServiceUnavailable("CANARY_AUTH")))
			},
			wantCode: CodeAdmissionAuthUnavailable,
		},
		{
			// 405 does not establish CRD absence, so it must not take the
			// admit-without-review path that CRD absence takes.
			name: "method not supported",
			authRepo: func() *AuthRepository {
				return NewAuthRepository(newFakeDynClientFailingWith(k8serrors.NewMethodNotSupported(authGR, "get")))
			},
			wantCode: CodeAdmissionAuthUnavailable,
		},
	}

	for _, tc := range cases {
		for _, granted := range []bool{true, false} {
			t.Run(fmt.Sprintf("%s/review=%v", tc.name, granted), func(t *testing.T) {
				client := &mockUserAllowedClient{allowed: granted}

				got := admit(client, tc.authRepo(), config.AdmissionModeAuthResource, false)

				assert.Equal(t, granted, got.Admitted, "the caller's own review decides")
				assert.Equal(t, tc.wantCode, got.Code)
				assert.Equal(t, 1, client.calls)
			})
		}
	}
}

// AC: authorized non-admin users bootstrap with the agreed minimal permissions,
// including deployments where the Auth resource is outside the profile.
func TestResolveAdmission_AuthenticatedModeNeedsNoAuthResourcePermissions(t *testing.T) {
	cases := []struct {
		name     string
		authRepo *AuthRepository
	}{
		{"CRD absent", NewAuthRepository(newFakeDynClientCRDAbsent())},
		{"instance not provisioned", NewAuthRepository(newFakeDynClientInstanceAbsent())},
		{"restricted group", NewAuthRepository(newFakeDynClientWithAuth([]string{"restricted-group"}))},
		{"no dynamic client at all", NewAuthRepository(nil)},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// A review that would deny, to prove it is never consulted.
			client := &mockUserAllowedClient{allowed: false, err: errors.New("CANARY_REVIEW")}

			got := admit(client, tc.authRepo, config.AdmissionModeAuthenticated, false)

			assert.True(t, got.Admitted)
			assert.Equal(t, CodeAdmissionAuthenticated, got.Code)
			assert.Zero(t, client.calls, "authenticated mode must not depend on an Auth-resource review")
		})
	}
}

type statusReviewClient struct {
	mockUserAllowedClient
	adminErr error
	isAdmin  bool
}

func (m *statusReviewClient) GetUser(context.Context, *k8s.RequestIdentity) (string, error) {
	return "user", nil
}

func (m *statusReviewClient) IsUserAdmin(context.Context, *k8s.RequestIdentity) (bool, error) {
	return m.isAdmin, m.adminErr
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
			repo := NewStatusRepository(nil, "test", NewAuthRepository(newFakeDynClientWithAuth(nil)), config.AdmissionModeAuthResource)

			status, err := repo.GetStatus(context.Background(), client, &k8s.RequestIdentity{}, statusClusterInfo{})

			require.NoError(t, err)
			require.Equal(t, "user", status.Kube.UserName)
			require.False(t, status.Kube.IsAdmin)
			require.Equal(t, tc.allowed && tc.allowedErr == nil, status.Kube.IsAllowed)
			require.Equal(t, 1, client.calls)
		})
	}
}

// AC: errors do not silently grant access or unexpectedly lock out otherwise
// authorized users. On xKS a non-admin bootstraps even when every Auth-resource
// path fails, while admin capability still degrades to false.
func TestGetStatus_XKSNonAdminBootstrapsWithoutAuthResource(t *testing.T) {
	client := &statusReviewClient{
		adminErr:              errors.New("CANARY_ADMIN"),
		mockUserAllowedClient: mockUserAllowedClient{allowed: false, err: errors.New("CANARY_ALLOWED")},
	}
	repo := NewStatusRepository(nil, "rhaii", NewAuthRepository(newFakeDynClientCRDAbsent()), config.AdmissionModeAuthenticated)

	status, err := repo.GetStatus(context.Background(), client, &k8s.RequestIdentity{}, statusClusterInfo{})

	require.NoError(t, err)
	assert.Equal(t, "user", status.Kube.UserName)
	assert.True(t, status.Kube.IsAllowed, "admission must not depend on the Auth resource")
	assert.False(t, status.Kube.IsAdmin, "an unavailable admin review degrades the UI capability, not admission")
	assert.Zero(t, client.calls)
}

// Identity is the one hard requirement: no identity means no session to report.
func TestGetStatus_UnresolvedIdentityFailsTheRequest(t *testing.T) {
	repo := NewStatusRepository(nil, "test", NewAuthRepository(newFakeDynClientCRDAbsent()), config.AdmissionModeAuthenticated)

	_, err := repo.GetStatus(context.Background(), &identityFailureClient{}, &k8s.RequestIdentity{}, statusClusterInfo{})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get user")
}

type identityFailureClient struct {
	mockUserAllowedClient
}

func (identityFailureClient) GetUser(context.Context, *k8s.RequestIdentity) (string, error) {
	return "", errors.New("CANARY_IDENTITY")
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
				repo := NewStatusRepository(nil, "test", NewAuthRepository(dynamicClient), config.AdmissionModeAuthResource)

				status, err := repo.GetStatus(context.Background(), client, &k8s.RequestIdentity{}, statusClusterInfo{})

				require.Equal(t, 1, client.calls, "Auth failures must reach the caller's SSAR")
				require.NoError(t, err)
				require.Equal(t, review.allowed && review.failure == nil, status.Kube.IsAllowed)
				require.False(t, status.Kube.IsAdmin)
			})
		}
	}
}
