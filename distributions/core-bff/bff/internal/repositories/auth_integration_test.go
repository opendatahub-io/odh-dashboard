package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	k8stesting "k8s.io/client-go/testing"
)

func newFakeDynClientWithAuth(allowedGroups []string) *dynamicfake.FakeDynamicClient {
	scheme := runtime.NewScheme()

	adminGroups := []any{"odh-admins"}
	allowed := make([]any, len(allowedGroups))
	for i, g := range allowedGroups {
		allowed[i] = g
	}

	authCR := &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": "services.platform.opendatahub.io/v1alpha1",
			"kind":       "Auth",
			"metadata": map[string]any{
				"name": "auth",
			},
			"spec": map[string]any{
				"adminGroups":   adminGroups,
				"allowedGroups": allowed,
			},
		},
	}

	return dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		scheme,
		map[schema.GroupVersionResource]string{
			models.AuthGVR: "AuthList",
		},
		authCR,
	)
}

func newFakeDynClientCRDAbsent() *dynamicfake.FakeDynamicClient {
	client := dynamicfake.NewSimpleDynamicClient(runtime.NewScheme())
	client.PrependReactor("get", "auths", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, &meta.NoKindMatchError{
			GroupKind:        schema.GroupKind{Group: "services.platform.opendatahub.io", Kind: "Auth"},
			SearchedVersions: []string{"v1alpha1"},
		}
	})
	return client
}

func newFakeDynClientInstanceAbsent() *dynamicfake.FakeDynamicClient {
	return dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		runtime.NewScheme(),
		map[schema.GroupVersionResource]string{
			models.AuthGVR: "AuthList",
		},
	)
}

func TestGetAuth_CRDPresent_ReturnsGroups(t *testing.T) {
	fakeDyn := newFakeDynClientWithAuth([]string{models.SystemAuthenticated, "allowed-group"})
	repo := NewAuthRepository(fakeDyn)

	auth, err := repo.GetAuth(context.Background())
	require.NoError(t, err)
	require.NotNil(t, auth)

	assert.Equal(t, []string{"odh-admins"}, auth.AdminGroups)
	assert.Equal(t, []string{models.SystemAuthenticated, "allowed-group"}, auth.AllowedGroups)
}

func TestGetAuth_CRDAbsent_ReturnsNil(t *testing.T) {
	fakeDyn := newFakeDynClientCRDAbsent()
	repo := NewAuthRepository(fakeDyn)

	auth, err := repo.GetAuth(context.Background())
	require.NoError(t, err)
	assert.Nil(t, auth)
}

func TestGetAuth_MalformedSpec_ReturnsError(t *testing.T) {
	scheme := runtime.NewScheme()
	cr := &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": "services.platform.opendatahub.io/v1alpha1",
			"kind":       "Auth",
			"metadata": map[string]any{
				"name": "auth",
			},
		},
	}
	fakeDyn := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		scheme,
		map[schema.GroupVersionResource]string{
			models.AuthGVR: "AuthList",
		},
		cr,
	)
	repo := NewAuthRepository(fakeDyn)

	auth, err := repo.GetAuth(context.Background())
	assert.Error(t, err)
	assert.Nil(t, auth)
	assert.Contains(t, err.Error(), "missing or invalid spec")
}

func TestGetAuth_InstanceAbsent_ReturnsError(t *testing.T) {
	fakeDyn := newFakeDynClientInstanceAbsent()
	repo := NewAuthRepository(fakeDyn)

	auth, err := repo.GetAuth(context.Background())
	assert.Error(t, err)
	assert.Nil(t, auth)
	assert.Contains(t, err.Error(), "auth instance not found")
}

func TestGetAuth_NilClient_ReturnsError(t *testing.T) {
	repo := NewAuthRepository(nil)

	auth, err := repo.GetAuth(context.Background())
	assert.Nil(t, auth)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "auth dynamic client unavailable")
}

func TestResolveIsAllowed_AuthPresent_SystemAuthenticated_ReturnsTrue(t *testing.T) {
	fakeDyn := newFakeDynClientWithAuth([]string{models.SystemAuthenticated})
	authRepo := NewAuthRepository(fakeDyn)

	auth, err := authRepo.GetAuth(context.Background())
	require.NoError(t, err)
	require.NotNil(t, auth)

	// system:authenticated escape hatch should short-circuit to true
	assert.True(t, hasSystemAuthenticatedGroup(auth))
}

func TestResolveIsAllowed_AuthPresent_NoEscapeHatch_FallsToSSAR(t *testing.T) {
	fakeDyn := newFakeDynClientWithAuth([]string{"restricted-group"})
	authRepo := NewAuthRepository(fakeDyn)

	auth, err := authRepo.GetAuth(context.Background())
	require.NoError(t, err)
	require.NotNil(t, auth)

	// No system:authenticated -> should fall to SSAR
	assert.False(t, hasSystemAuthenticatedGroup(auth))
}
