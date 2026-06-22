package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestRemoveComponentHandler_Success(t *testing.T) {
	ns := "ct-remove"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
		a.config.EnabledAppsCM = "enabled-apps"
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)

	// Pre-create the enabled-apps ConfigMap with an app entry
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: "enabled-apps", Namespace: ns},
		Data:       map[string]string{"my-app": "true", "other-app": "true"},
	}
	cleanupTestCM(t, ns, "enabled-apps")
	_, err := testSAClientset.CoreV1().ConfigMaps(ns).Create(context.Background(), cm, metav1.CreateOptions{})
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ComponentsRemovePath+"?appName=my-app", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.RemoveComponentHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result models.MutationResponse
	err = json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	assert.True(t, result.Success)

	// Verify the entry was removed
	updated, err := testSAClientset.CoreV1().ConfigMaps(ns).Get(context.Background(), "enabled-apps", metav1.GetOptions{})
	require.NoError(t, err)
	assert.NotContains(t, updated.Data, "my-app")
	assert.Contains(t, updated.Data, "other-app")
}

func TestRemoveComponentHandler_MissingAppName_Returns400(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ComponentsRemovePath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.RemoveComponentHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetComponentsHandler_InvalidToken_Returns401(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ComponentsPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "attacker",
		Token:  k8s.NewBearerToken("garbage-token-abc123"),
	})

	app.GetComponentsHandler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestRemoveComponentHandler_CMNotFound_ReturnsSuccessFalse(t *testing.T) {
	ns := "ct-remove-notfound"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
		a.config.EnabledAppsCM = "enabled-apps"
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ComponentsRemovePath+"?appName=my-app", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.RemoveComponentHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result models.MutationResponse
	err := json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	assert.False(t, result.Success)
	assert.NotEmpty(t, result.Error)
}

func TestGetComponentsHandler_CRDAbsent_ReturnsEmptyArray(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ComponentsPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.GetComponentsHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body []any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Empty(t, body)
}
