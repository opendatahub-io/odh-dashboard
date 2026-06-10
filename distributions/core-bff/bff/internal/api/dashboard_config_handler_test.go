package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
)

func TestGetDashboardConfigByName_CRDAbsent_Returns404(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/dashboardConfig/dash-ns/test-name", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "namespace", Value: "dash-ns"},
		{Key: "name", Value: "test-name"},
	}
	app.GetDashboardConfigByNameHandler(rr, req, ps)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestPatchDashboardConfigByName_CRDAbsent_Returns404(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	patch := `[{"op":"replace","path":"/spec/dashboardConfig/disableKServe","value":true}]`

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/dashboardConfig/dash-ns/test-name", bytes.NewReader([]byte(patch)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "namespace", Value: "dash-ns"},
		{Key: "name", Value: "test-name"},
	}
	app.PatchDashboardConfigByNameHandler(rr, req, ps)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestPatchDashboardConfigByName_WrongNamespace_Returns403(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	patch := `[{"op":"replace","path":"/spec/dashboardConfig/disableKServe","value":true}]`

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/dashboardConfig/wrong-ns/test-name", bytes.NewReader([]byte(patch)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "namespace", Value: "wrong-ns"},
		{Key: "name", Value: "test-name"},
	}
	app.PatchDashboardConfigByNameHandler(rr, req, ps)

	assert.Equal(t, http.StatusForbidden, rr.Code)
}

func TestGetDashboardConfigByName_WorkbenchNamespace_Allowed(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
		a.config.WorkbenchNamespace = "wb-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/dashboardConfig/wb-ns/test-name", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "namespace", Value: "wb-ns"},
		{Key: "name", Value: "test-name"},
	}
	app.GetDashboardConfigByNameHandler(rr, req, ps)

	// Workbench namespace is allowed (not 403); resource absent in wb-ns yields 404.
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestGetDashboardConfigByName_WrongNamespace_Returns403(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/dashboardConfig/wrong-ns/test-name", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "namespace", Value: "wrong-ns"},
		{Key: "name", Value: "test-name"},
	}
	app.GetDashboardConfigByNameHandler(rr, req, ps)

	assert.Equal(t, http.StatusForbidden, rr.Code)
}

func newFakeDynWithDashboardCR() *dynamicfake.FakeDynamicClient {
	cr := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "opendatahub.io/v1alpha",
			"kind":       "OdhDashboardConfig",
			"metadata": map[string]interface{}{
				"name":      "odh-dashboard-config",
				"namespace": "dash-ns",
			},
			"spec": map[string]interface{}{
				"dashboardConfig": map[string]interface{}{
					"disableKServe": false,
				},
			},
		},
	}
	return dynamicfake.NewSimpleDynamicClientWithCustomListKinds(
		runtime.NewScheme(),
		map[schema.GroupVersionResource]string{
			models.DashboardConfigGVR: "OdhDashboardConfigList",
		},
		cr,
	)
}

func TestGetDashboardConfigByName_Success(t *testing.T) {
	fakeDyn := newFakeDynWithDashboardCR()
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
		a.repositories = repositories.NewRepositories(false, fakeDyn, testSAClientset, "")
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/dashboardConfig/dash-ns/odh-dashboard-config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "namespace", Value: "dash-ns"},
		{Key: "name", Value: "odh-dashboard-config"},
	}
	app.GetDashboardConfigByNameHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Equal(t, "OdhDashboardConfig", body["kind"])
}

func TestPatchDashboardConfigByName_Success(t *testing.T) {
	fakeDyn := newFakeDynWithDashboardCR()
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
		a.repositories = repositories.NewRepositories(false, fakeDyn, testSAClientset, "")
	})
	admin := k8mocks.DefaultTestUsers[0]

	patch := `[{"op":"replace","path":"/spec/dashboardConfig/disableKServe","value":true}]`

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/dashboardConfig/dash-ns/odh-dashboard-config", bytes.NewReader([]byte(patch)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{
		{Key: "namespace", Value: "dash-ns"},
		{Key: "name", Value: "odh-dashboard-config"},
	}
	app.PatchDashboardConfigByNameHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	spec := body["spec"].(map[string]interface{})
	dc := spec["dashboardConfig"].(map[string]interface{})
	assert.Equal(t, true, dc["disableKServe"])
}
