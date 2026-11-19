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
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
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
	denyCM bool
}

func newCallerSettingsFixture(t *testing.T) *callerSettingsFixture {
	t.Helper()
	notebookController := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "notebook-controller-deployment", Namespace: "dash-ns"}}
	f := &callerSettingsFixture{typed: fake.NewSimpleClientset(notebookController), dyn: newFakeDynWithDashboardCR()}
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
			SADynClient:       newFakeDynWithDashboardCR(),
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
