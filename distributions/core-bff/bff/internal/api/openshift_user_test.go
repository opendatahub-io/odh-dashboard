package api

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8stesting "k8s.io/client-go/testing"

	dynamicfake "k8s.io/client-go/dynamic/fake"
)

// ─── unstructuredString tests ───────────────────────────────────────────────

func TestUnstructuredString_TopLevelKey(t *testing.T) {
	obj := map[string]any{
		"name": "test-user",
	}
	val, ok := unstructuredString(obj, "name")
	assert.True(t, ok)
	assert.Equal(t, "test-user", val)
}

func TestUnstructuredString_NestedKey(t *testing.T) {
	obj := map[string]any{
		"metadata": map[string]any{
			"name": "test-user",
		},
	}
	val, ok := unstructuredString(obj, "metadata", "name")
	assert.True(t, ok)
	assert.Equal(t, "test-user", val)
}

func TestUnstructuredString_MissingKey(t *testing.T) {
	obj := map[string]any{
		"metadata": map[string]any{},
	}
	val, ok := unstructuredString(obj, "metadata", "name")
	assert.False(t, ok)
	assert.Equal(t, "", val)
}

func TestUnstructuredString_MissingIntermediateKey(t *testing.T) {
	obj := map[string]any{
		"other": "value",
	}
	val, ok := unstructuredString(obj, "metadata", "name")
	assert.False(t, ok)
	assert.Equal(t, "", val)
}

func TestUnstructuredString_NonStringValue(t *testing.T) {
	obj := map[string]any{
		"count": 42,
	}
	val, ok := unstructuredString(obj, "count")
	assert.False(t, ok)
	assert.Equal(t, "", val)
}

func TestUnstructuredString_EmptyKeys(t *testing.T) {
	obj := map[string]any{
		"name": "test",
	}
	val, ok := unstructuredString(obj)
	assert.False(t, ok)
	assert.Equal(t, "", val)
}

// ─── unstructuredStringSlice tests ──────────────────────────────────────────

func TestUnstructuredStringSlice_ValidSlice(t *testing.T) {
	obj := map[string]any{
		"groups": []any{"admin", "users", "editors"},
	}
	result := unstructuredStringSlice(obj, "groups")
	assert.Equal(t, []string{"admin", "users", "editors"}, result)
}

func TestUnstructuredStringSlice_MissingKey(t *testing.T) {
	obj := map[string]any{}
	result := unstructuredStringSlice(obj, "groups")
	assert.Nil(t, result)
}

func TestUnstructuredStringSlice_NotASlice(t *testing.T) {
	obj := map[string]any{
		"groups": "not-a-slice",
	}
	result := unstructuredStringSlice(obj, "groups")
	assert.Nil(t, result)
}

func TestUnstructuredStringSlice_MixedTypes(t *testing.T) {
	obj := map[string]any{
		"groups": []any{"admin", 42, "users", true},
	}
	result := unstructuredStringSlice(obj, "groups")
	assert.Equal(t, []string{"admin", "users"}, result)
}

func TestUnstructuredStringSlice_EmptySlice(t *testing.T) {
	obj := map[string]any{
		"groups": []any{},
	}
	result := unstructuredStringSlice(obj, "groups")
	assert.Equal(t, []string{}, result)
}

// ─── resolveUserViaOpenShiftAPI tests ───────────────────────────────────────

func TestResolveUserViaOpenShiftAPI_XKSReturnsEarly(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformXKS
	})

	username, groups, err := app.resolveUserViaOpenShiftAPI(t.Context(), nil)
	assert.NoError(t, err)
	assert.Equal(t, "", username)
	assert.Nil(t, groups)
}

// The production code queries "~" which OpenShift resolves server-side to the
// current user. The fake dynamic client does a literal name lookup, so the
// object must be named "~". This still exercises the full code path (GVR
// construction, dynamic Get, unstructured parsing of username and groups).
func TestResolveUserViaOpenShiftAPI_OpenShiftResolvesUser(t *testing.T) {
	userObj := &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": "user.openshift.io/v1",
			"kind":       "User",
			"metadata": map[string]any{
				"name": "~",
			},
			"groups": []any{"dev-team", "editors"},
		},
	}

	scheme := runtime.NewScheme()
	fakeDyn := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		scheme,
		map[schema.GroupVersionResource]string{models.OpenShiftUserGVR: "UserList"},
		userObj,
	)

	client := &stubDynClient{dyn: fakeDyn}

	app := newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformOpenShift
	})

	username, groups, err := app.resolveUserViaOpenShiftAPI(t.Context(), client)
	require.NoError(t, err)
	assert.Equal(t, "~", username)
	assert.Equal(t, []string{"dev-team", "editors"}, groups)
}

func TestResolveUserViaOpenShiftAPI_DiscoveryErrorReturnsNil(t *testing.T) {
	scheme := runtime.NewScheme()
	fakeDyn := dynamicfake.NewSimpleDynamicClient(scheme)
	fakeDyn.PrependReactor("get", "users", func(_ k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, &k8serrors.StatusError{ErrStatus: metav1.Status{
			Code:   http.StatusNotFound,
			Reason: metav1.StatusReasonNotFound,
		}}
	})

	client := &stubDynClient{dyn: fakeDyn}
	app := newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformOpenShift
	})

	username, groups, err := app.resolveUserViaOpenShiftAPI(t.Context(), client)
	assert.NoError(t, err)
	assert.Equal(t, "", username)
	assert.Nil(t, groups)
}

func TestResolveUserViaOpenShiftAPI_ForbiddenErrorPropagates(t *testing.T) {
	scheme := runtime.NewScheme()
	fakeDyn := dynamicfake.NewSimpleDynamicClient(scheme)
	fakeDyn.PrependReactor("get", "users", func(_ k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(
			schema.GroupResource{Group: "user.openshift.io", Resource: "users"},
			"~",
			fmt.Errorf("access denied"),
		)
	})

	client := &stubDynClient{dyn: fakeDyn}
	app := newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformOpenShift
	})

	username, groups, err := app.resolveUserViaOpenShiftAPI(t.Context(), client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to query OpenShift User API")
	assert.Equal(t, "", username)
	assert.Nil(t, groups)
}
