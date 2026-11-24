package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

// Review (RHOAIENG-101218): on xKS, PUT /api/cluster-settings surfaces an
// authorization denial as 403 through the error contract, and a caller denied
// any planned write is refused before the first one.

type callerSettingsFixture struct {
	app    *App
	typed  *fake.Clientset
	dyn    *dynamicfake.FakeDynamicClient
	saDyn  *dynamicfake.FakeDynamicClient
	denyCM bool
}

func newCallerSettingsFixture(t *testing.T) *callerSettingsFixture {
	t.Helper()
	notebookController := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "notebook-controller-deployment", Namespace: "dash-ns"}}
	f := &callerSettingsFixture{typed: fake.NewSimpleClientset(notebookController), dyn: newFakeDynWithDashboardCR(), saDyn: newFakeDynWithDashboardCR()}
	f.typed.PrependReactor("create", "selfsubjectaccessreviews", func(a k8stesting.Action) (bool, runtime.Object, error) {
		review := a.(k8stesting.CreateAction).GetObject().(*authv1.SelfSubjectAccessReview)
		review.Status.Allowed = !f.denyCM || review.Spec.ResourceAttributes.Resource != "configmaps"
		return true, review, nil
	})
	f.app = newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
		a.config.DashboardConfigName = "odh-dashboard-config"
		a.repositories = repositories.NewRepositories(repositories.RepositoriesConfig{
			Platform:          config.PlatformXKS,
			PlatformConfirmed: true,
			SADynClient:       f.saDyn,
			SAClientset:       fake.NewSimpleClientset(),
			CallerClients: func(context.Context) (kubernetes.Interface, dynamic.Interface, error) {
				return f.typed, f.dyn, nil
			},
		})
	})
	return f
}

func (f *callerSettingsFixture) put(t *testing.T) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(models.ClusterSettings{PVCSize: 20, CullerTimeout: 3600})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPut, "/api/cluster-settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{UserID: "caller", Token: k8s.NewBearerToken("caller-token")})
	rr := httptest.NewRecorder()
	f.app.UpdateClusterSettingsHandler(rr, req, nil)
	return rr
}

func (f *callerSettingsFixture) dashboardConfigPatched() bool {
	for _, a := range f.dyn.Actions() {
		if a.GetVerb() == "patch" {
			return true
		}
	}
	return false
}

func TestUpdateClusterSettings_CallerDeniedLaterWrite_403BeforeAnyWrite(t *testing.T) {
	f := newCallerSettingsFixture(t)
	f.denyCM = true

	rr := f.put(t)
	assert.Equal(t, http.StatusForbidden, rr.Code, rr.Body.String())
	assert.False(t, f.dashboardConfigPatched(), "the OdhDashboardConfig patch must not run when a later write is denied")
}

func TestUpdateClusterSettings_APIServerDenial_Is403(t *testing.T) {
	f := newCallerSettingsFixture(t)
	f.dyn.PrependReactor("patch", "odhdashboardconfigs", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(models.DashboardConfigGVR.GroupResource(), "odh-dashboard-config", errors.New("denied"))
	})

	rr := f.put(t)
	assert.Equal(t, http.StatusForbidden, rr.Code, "a denial from the write itself is not folded into 200 success=false")
}

func TestUpdateClusterSettings_CallerNonAuthFailure_KeepsLegacyShape(t *testing.T) {
	f := newCallerSettingsFixture(t)
	f.dyn.PrependReactor("patch", "odhdashboardconfigs", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewConflict(models.DashboardConfigGVR.GroupResource(), "odh-dashboard-config", errors.New("conflict"))
	})

	rr := f.put(t)
	require.Equal(t, http.StatusOK, rr.Code)
	var result models.MutationResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &result))
	assert.False(t, result.Success)
}

func TestUpdateClusterSettings_CallerAllowed_Succeeds(t *testing.T) {
	f := newCallerSettingsFixture(t)
	rr := f.put(t)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	var result models.MutationResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &result))
	assert.True(t, result.Success, result.Error)
	assert.True(t, f.dashboardConfigPatched())
}

// Review (RHOAIENG-96081): a caller allowed to create the culler ConfigMap but
// not to update it is checked for create. If the ConfigMap appears after the
// preflight, the handler must not switch to an unchecked update: the planned
// create fails (a conflict, not a 403) and no ConfigMap update is attempted.
func TestUpdateClusterSettings_CullerAppearsAfterPreflight_NoUncheckedUpdate(t *testing.T) {
	f := newCallerSettingsFixture(t)
	f.typed.PrependReactor("create", "selfsubjectaccessreviews", func(a k8stesting.Action) (bool, runtime.Object, error) {
		review := a.(k8stesting.CreateAction).GetObject().(*authv1.SelfSubjectAccessReview)
		attrs := review.Spec.ResourceAttributes
		review.Status.Allowed = attrs.Resource != "configmaps" || attrs.Verb != "update"
		return true, review, nil
	})
	// The culler ConfigMap is created by someone else once the preflight passed.
	f.dyn.PrependReactor("patch", "odhdashboardconfigs", func(k8stesting.Action) (bool, runtime.Object, error) {
		cm := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "notebook-controller-culler-config", Namespace: "dash-ns"}}
		require.NoError(t, f.typed.Tracker().Add(cm))
		return false, nil, nil
	})

	rr := f.put(t)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	var result models.MutationResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &result))
	assert.False(t, result.Success)
	assert.Contains(t, result.Error, "already exists")
	for _, a := range f.typed.Actions() {
		if a.GetResource().Resource == "configmaps" {
			assert.NotEqual(t, "update", a.GetVerb(), "the update the preflight did not check must not run")
		}
	}
}

func forbidden(resource string) k8stesting.ReactionFunc {
	return func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(models.DashboardConfigGVR.GroupResource(), resource, errors.New("denied"))
	}
}

// The write is computed from the caller's own read of the configuration, so
// reduced service-account RBAC (which makes the bootstrap read fall back to
// defaults) does not change what the caller writes.
func TestUpdateClusterSettings_CallerReadsConfig_NotServiceAccount(t *testing.T) {
	f := newCallerSettingsFixture(t)
	f.saDyn.PrependReactor("get", "odhdashboardconfigs", forbidden("odh-dashboard-config"))

	rr := f.put(t)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	var result models.MutationResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &result))
	assert.True(t, result.Success, result.Error)
	callerRead := false
	for _, a := range f.dyn.Actions() {
		callerRead = callerRead || (a.GetVerb() == "get" && a.GetResource().Resource == "odhdashboardconfigs")
	}
	assert.True(t, callerRead, "the current configuration must be read with the caller's credentials")
}

func TestUpdateClusterSettings_CallerCannotReadConfig_403BeforeAnyWrite(t *testing.T) {
	f := newCallerSettingsFixture(t)
	f.dyn.PrependReactor("get", "odhdashboardconfigs", forbidden("odh-dashboard-config"))

	rr := f.put(t)
	assert.Equal(t, http.StatusForbidden, rr.Code, rr.Body.String())
	assert.False(t, f.dashboardConfigPatched(), "no write may be computed from defaults the caller could not read")
}

func TestGetClusterSettings_CallerDeniedSegmentKey_Is403(t *testing.T) {
	f := newCallerSettingsFixture(t)
	// Tracking is disabled by default; the segment key is read only when it is on.
	_, err := f.dyn.Resource(models.DashboardConfigGVR).Namespace("dash-ns").Patch(context.Background(),
		"odh-dashboard-config", types.MergePatchType, []byte(`{"spec":{"dashboardConfig":{"disableTracking":false}}}`), metav1.PatchOptions{})
	require.NoError(t, err)
	f.typed.PrependReactor("get", "configmaps", func(a k8stesting.Action) (bool, runtime.Object, error) {
		if a.(k8stesting.GetAction).GetName() != "odh-segment-key-config" {
			return false, nil, nil
		}
		return true, nil, k8serrors.NewForbidden(appsv1.Resource("configmaps"), "odh-segment-key-config", errors.New("denied"))
	})

	req := httptest.NewRequest(http.MethodGet, "/api/cluster-settings", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{UserID: "caller", Token: k8s.NewBearerToken("caller-token")})
	rr := httptest.NewRecorder()
	f.app.GetClusterSettingsHandler(rr, req, nil)
	assert.Equal(t, http.StatusForbidden, rr.Code, "a caller denial is not folded into tracking disabled")
}

// On xKS the PATCH response is built from the object the caller's patch
// returned. Re-reading through the service-account bootstrap path could fall
// back to defaults and hide the change.
func TestPatchConfig_Caller_ResponseReflectsPatch(t *testing.T) {
	f := newCallerSettingsFixture(t)
	f.saDyn.PrependReactor("get", "odhdashboardconfigs", forbidden("odh-dashboard-config"))

	req := httptest.NewRequest(http.MethodPatch, ConfigPath,
		bytes.NewReader([]byte(`{"spec":{"dashboardConfig":{"disableKServe":true}}}`)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{UserID: "caller", Token: k8s.NewBearerToken("caller-token")})
	rr := httptest.NewRecorder()
	f.app.PatchConfigHandler(rr, req, nil)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	var body map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
	dc := body["spec"].(map[string]any)["dashboardConfig"].(map[string]any)
	assert.Equal(t, true, dc["disableKServe"])
}

// Review (RHOAIENG-96081): GET uses the same caller-scoped read as PUT, so the
// form shows the stored settings even when the service account cannot read
// them, and saving it does not write the defaults back.
func TestGetClusterSettings_CallerReadsConfig_NotServiceAccountDefaults(t *testing.T) {
	f := newCallerSettingsFixture(t)
	f.saDyn.PrependReactor("get", "odhdashboardconfigs", forbidden("odh-dashboard-config"))
	_, err := f.dyn.Resource(models.DashboardConfigGVR).Namespace("dash-ns").Patch(context.Background(),
		"odh-dashboard-config", types.MergePatchType, []byte(`{"spec":{"notebookController":{"enabled":true,"pvcSize":"75Gi"}}}`), metav1.PatchOptions{})
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/api/cluster-settings", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{UserID: "caller", Token: k8s.NewBearerToken("caller-token")})
	rr := httptest.NewRecorder()
	f.app.GetClusterSettingsHandler(rr, req, nil)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	var settings models.ClusterSettings
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &settings))
	assert.Equal(t, 75, settings.PVCSize, "the stored value, not the 20Gi default")
}

func TestGetClusterSettings_CallerCannotReadConfig_Is403(t *testing.T) {
	f := newCallerSettingsFixture(t)
	f.dyn.PrependReactor("get", "odhdashboardconfigs", forbidden("odh-dashboard-config"))

	req := httptest.NewRequest(http.MethodGet, "/api/cluster-settings", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{UserID: "caller", Token: k8s.NewBearerToken("caller-token")})
	rr := httptest.NewRecorder()
	f.app.GetClusterSettingsHandler(rr, req, nil)
	assert.Equal(t, http.StatusForbidden, rr.Code, "no defaults are shown to a caller who cannot read the settings")
}

func TestGetClusterSettings_CallerNoInstance_ShowsDefaults(t *testing.T) {
	f := newCallerSettingsFixture(t)
	require.NoError(t, f.dyn.Resource(models.DashboardConfigGVR).Namespace("dash-ns").Delete(context.Background(), "odh-dashboard-config", metav1.DeleteOptions{}))

	req := httptest.NewRequest(http.MethodGet, "/api/cluster-settings", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{UserID: "caller", Token: k8s.NewBearerToken("caller-token")})
	rr := httptest.NewRecorder()
	f.app.GetClusterSettingsHandler(rr, req, nil)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	var settings models.ClusterSettings
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &settings))
	assert.Equal(t, 20, settings.PVCSize)
}

// Review 6037661521 item 4: once the caller's read found no instance, the
// defaults are built directly; the service account is not asked again, so its
// failure cannot turn the defaults into an error.
func TestGetClusterSettings_CallerNoInstance_NoServiceAccountRead(t *testing.T) {
	f := newCallerSettingsFixture(t)
	require.NoError(t, f.dyn.Resource(models.DashboardConfigGVR).Namespace("dash-ns").Delete(context.Background(), "odh-dashboard-config", metav1.DeleteOptions{}))
	f.saDyn.PrependReactor("*", "*", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewServiceUnavailable("service account read")
	})
	f.saDyn.ClearActions()

	req := httptest.NewRequest(http.MethodGet, "/api/cluster-settings", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{UserID: "caller", Token: k8s.NewBearerToken("caller-token")})
	rr := httptest.NewRecorder()
	f.app.GetClusterSettingsHandler(rr, req, nil)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	assert.Empty(t, f.saDyn.Actions(), "no service-account read")
}

// putSettings sends PUT /api/cluster-settings as the caller.
func (f *callerSettingsFixture) putSettings(t *testing.T, s models.ClusterSettings) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(s)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPut, "/api/cluster-settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{UserID: "caller", Token: k8s.NewBearerToken("caller-token")})
	rr := httptest.NewRecorder()
	f.app.UpdateClusterSettingsHandler(rr, req, nil)
	return rr
}

func (f *callerSettingsFixture) storedConfig(t *testing.T) map[string]any {
	t.Helper()
	obj, err := f.dyn.Resource(models.DashboardConfigGVR).Namespace("dash-ns").Get(context.Background(), "odh-dashboard-config", metav1.GetOptions{})
	require.NoError(t, err)
	return obj.Object
}

// enforcePatchResourceVersion makes the fake API server reject a merge patch
// whose metadata.resourceVersion is not the stored one, as a real one does.
func (f *callerSettingsFixture) enforcePatchResourceVersion() {
	f.dyn.PrependReactor("patch", "odhdashboardconfigs", func(a k8stesting.Action) (bool, runtime.Object, error) {
		var patch struct {
			Metadata struct {
				ResourceVersion string `json:"resourceVersion"`
			} `json:"metadata"`
		}
		_ = json.Unmarshal(a.(k8stesting.PatchAction).GetPatch(), &patch)
		obj, err := f.dyn.Tracker().Get(models.DashboardConfigGVR, "dash-ns", "odh-dashboard-config")
		if err != nil {
			return false, nil, nil
		}
		stored, _ := obj.(interface{ GetResourceVersion() string })
		if patch.Metadata.ResourceVersion != "" && stored != nil && stored.GetResourceVersion() != patch.Metadata.ResourceVersion {
			return true, nil, k8serrors.NewConflict(models.DashboardConfigGVR.GroupResource(), "odh-dashboard-config", errors.New("the object has been modified"))
		}
		return false, nil, nil
	})
}

// Review 6041827828 item 1: a save computed from an older OdhDashboardConfig
// must not undo another admin's change made while it was planning.
func TestUpdateClusterSettings_ConcurrentConfigChange_Conflict(t *testing.T) {
	f := newCallerSettingsFixture(t)
	cr, err := f.dyn.Resource(models.DashboardConfigGVR).Namespace("dash-ns").Get(context.Background(), "odh-dashboard-config", metav1.GetOptions{})
	require.NoError(t, err)
	cr.SetResourceVersion("1")
	require.NoError(t, f.dyn.Tracker().Update(models.DashboardConfigGVR, cr, "dash-ns"))
	f.enforcePatchResourceVersion()

	// While this save checks the ConfigMaps, a second admin disables KServe.
	once := false
	f.typed.PrependReactor("get", "configmaps", func(k8stesting.Action) (bool, runtime.Object, error) {
		if !once {
			once = true
			other := cr.DeepCopy()
			require.NoError(t, unstructured.SetNestedField(other.Object, true, "spec", "dashboardConfig", "disableKServe"))
			other.SetResourceVersion("2")
			require.NoError(t, f.dyn.Tracker().Update(models.DashboardConfigGVR, other, "dash-ns"))
		}
		return false, nil, nil
	})

	s := models.ClusterSettings{PVCSize: 20, CullerTimeout: 3600}
	s.ModelServingPlatformEnabled.KServe = true
	rr := f.putSettings(t, s)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	var result models.MutationResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &result))
	assert.False(t, result.Success, "a stale save is a conflict, not success")
	spec := f.storedConfig(t)["spec"].(map[string]any)["dashboardConfig"].(map[string]any)
	assert.Equal(t, true, spec["disableKServe"], "the other admin's change is kept")
}
