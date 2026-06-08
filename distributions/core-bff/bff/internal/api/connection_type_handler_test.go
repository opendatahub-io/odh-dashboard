package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	k8serr "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sclient "k8s.io/client-go/kubernetes"
)

func createTestConnectionTypeCM(t *testing.T, app *App, admin k8mocks.TestUser, name string) {
	t.Helper()
	client, err := app.kubernetesClientFactory.GetClient(
		reqWithIdentity(
			httptest.NewRequest(http.MethodGet, "/", nil),
			&k8s.RequestIdentity{
				UserID: admin.UserName,
				Groups: admin.Groups,
				Token:  k8s.NewBearerToken(admin.Token),
			},
		).Context(),
	)
	require.NoError(t, err)

	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: app.config.Namespace,
			Labels: map[string]string{
				models.LabelDashboardResource: "true",
				models.LabelConnectionType:    "true",
			},
		},
		Data: map[string]string{
			"test-key": "test-value",
		},
	}
	_, err = client.CreateConfigMap(context.Background(), app.config.Namespace, cm)
	if err != nil && !k8serr.IsAlreadyExists(err) {
		require.NoError(t, err)
	}
}

func TestListConnectionTypes_Empty(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "ct-list-empty"
	})
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ConnectionTypesPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.ListConnectionTypesHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body []any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Empty(t, body)
}

func TestListConnectionTypes_WithItems(t *testing.T) {
	ns := "ct-list-items"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)
	cleanupTestCM(t, ns, "test-ct-1")
	createTestConnectionTypeCM(t, app, admin, "test-ct-1")

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ConnectionTypesPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.ListConnectionTypesHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body []any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Len(t, body, 1)
}

func TestCreateConnectionType_Success(t *testing.T) {
	ns := "ct-create"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)
	cleanupTestCM(t, ns, "new-ct")

	cm := corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name: "new-ct",
			Labels: map[string]string{
				models.LabelDashboardResource: "true",
				models.LabelConnectionType:    "true",
			},
		},
		Data: map[string]string{"key": "value"},
	}

	body, err := json.Marshal(cm)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTypesPath, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateConnectionTypeHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result models.MutationResponse
	err = json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	assert.True(t, result.Success)
}

func TestCreateConnectionType_InvalidLabels(t *testing.T) {
	ns := "ct-create-invalid"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)

	cm := corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:   "bad-ct",
			Labels: map[string]string{},
		},
		Data: map[string]string{"key": "value"},
	}

	body, err := json.Marshal(cm)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTypesPath, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateConnectionTypeHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result models.MutationResponse
	err = json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	assert.False(t, result.Success)
	assert.Contains(t, result.Error, "connection-type labels")
}

func TestDeleteConnectionType_Success(t *testing.T) {
	ns := "ct-delete"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)
	cleanupTestCM(t, ns, "ct-to-delete")
	createTestConnectionTypeCM(t, app, admin, "ct-to-delete")

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, "/api/connection-types/ct-to-delete", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "name", Value: "ct-to-delete"}}
	app.DeleteConnectionTypeHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result models.MutationResponse
	err := json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	assert.True(t, result.Success)
}

func TestUpdateConnectionType_EnforcesURLName(t *testing.T) {
	ns := "ct-update"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)
	cleanupTestCM(t, ns, "ct-to-update")
	createTestConnectionTypeCM(t, app, admin, "ct-to-update")

	cm := corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name: "different-name",
			Labels: map[string]string{
				models.LabelDashboardResource: "true",
				models.LabelConnectionType:    "true",
			},
		},
		Data: map[string]string{"key": "updated"},
	}

	body, err := json.Marshal(cm)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/connection-types/ct-to-update", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "name", Value: "ct-to-update"}}
	app.UpdateConnectionTypeHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result models.MutationResponse
	err = json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	assert.True(t, result.Success)
}

func TestUpdateConnectionType_NonConnectionType_Rejected(t *testing.T) {
	ns := "ct-update-reject"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)
	cleanupTestCM(t, ns, "plain-cm")

	// Create a plain ConfigMap (not a connection type)
	client, err := app.kubernetesClientFactory.GetClient(
		reqWithIdentity(
			httptest.NewRequest(http.MethodGet, "/", nil),
			&k8s.RequestIdentity{
				UserID: admin.UserName,
				Groups: admin.Groups,
				Token:  k8s.NewBearerToken(admin.Token),
			},
		).Context(),
	)
	require.NoError(t, err)
	plainCM := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: "plain-cm", Namespace: ns},
		Data:       map[string]string{"key": "value"},
	}
	_, err = client.CreateConfigMap(context.Background(), ns, plainCM)
	if err != nil && !k8serr.IsAlreadyExists(err) {
		require.NoError(t, err)
	}

	updateCM := corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name: "plain-cm",
			Labels: map[string]string{
				models.LabelDashboardResource: "true",
				models.LabelConnectionType:    "true",
			},
		},
		Data: map[string]string{"key": "hacked"},
	}
	body, err := json.Marshal(updateCM)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/connection-types/plain-cm", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "name", Value: "plain-cm"}}
	app.UpdateConnectionTypeHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result models.MutationResponse
	err = json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	assert.False(t, result.Success)
	assert.Contains(t, result.Error, "not a connection type")
}

func TestListConnectionTypes_InvalidToken_Returns401(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ConnectionTypesPath, nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "attacker",
		Token:  k8s.NewBearerToken("garbage-token-abc123"),
	})

	app.ListConnectionTypesHandler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestGetConnectionType_NotFound_Returns404(t *testing.T) {
	ns := "ct-get-notfound"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/connection-types/nonexistent", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "name", Value: "nonexistent"}}
	app.GetConnectionTypeHandler(rr, req, ps)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestDeleteConnectionType_NotFound_ReturnsSuccessFalse(t *testing.T) {
	ns := "ct-delete-notfound"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, "/api/connection-types/nonexistent", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "name", Value: "nonexistent"}}
	app.DeleteConnectionTypeHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result models.MutationResponse
	err := json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	assert.False(t, result.Success)
}

func TestPatchConnectionType_Success(t *testing.T) {
	ns := "ct-patch-success"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)
	cleanupTestCM(t, ns, "ct-to-patch")
	createTestConnectionTypeCM(t, app, admin, "ct-to-patch")

	patchData := `[{"op":"replace","path":"/data/test-key","value":"patched"}]`

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/connection-types/ct-to-patch", bytes.NewReader([]byte(patchData)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "name", Value: "ct-to-patch"}}
	app.PatchConnectionTypeHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result models.MutationResponse
	err := json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	assert.True(t, result.Success)
}

func TestPatchConnectionType_NonConnectionType_Rejected(t *testing.T) {
	ns := "ct-patch-reject"
	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	createTestNamespace(t, ns)
	cleanupTestCM(t, ns, "plain-cm-patch")

	client, err := app.kubernetesClientFactory.GetClient(
		reqWithIdentity(
			httptest.NewRequest(http.MethodGet, "/", nil),
			&k8s.RequestIdentity{
				UserID: admin.UserName,
				Groups: admin.Groups,
				Token:  k8s.NewBearerToken(admin.Token),
			},
		).Context(),
	)
	require.NoError(t, err)
	plainCM := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: "plain-cm-patch", Namespace: ns},
		Data:       map[string]string{"key": "value"},
	}
	_, err = client.CreateConfigMap(context.Background(), ns, plainCM)
	if err != nil && !k8serr.IsAlreadyExists(err) {
		require.NoError(t, err)
	}

	patchData := `[{"op":"replace","path":"/data/key","value":"hacked"}]`

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/connection-types/plain-cm-patch", bytes.NewReader([]byte(patchData)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "name", Value: "plain-cm-patch"}}
	app.PatchConnectionTypeHandler(rr, req, ps)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result models.MutationResponse
	err = json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	assert.False(t, result.Success)
	assert.Contains(t, result.Error, "not a connection type")
}

func TestPatchConnectionType_OversizedPayload_Rejected(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "dash-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	largePayload := "[" + strings.Repeat("x", 1_048_576) + "]"

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/connection-types/any", bytes.NewReader([]byte(largePayload)))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	ps := httprouter.Params{{Key: "name", Value: "any"}}
	app.PatchConnectionTypeHandler(rr, req, ps)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateConnectionType_InvalidToken_Returns401(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ConnectionTypesPath, bytes.NewReader([]byte(`{}`)))
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "attacker",
		Token:  k8s.NewBearerToken("garbage-token-abc123"),
	})

	app.CreateConnectionTypeHandler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestUpdateConnectionType_InvalidToken_Returns401(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/connection-types/any", bytes.NewReader([]byte(`{}`)))
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "attacker",
		Token:  k8s.NewBearerToken("garbage-token-abc123"),
	})

	ps := httprouter.Params{{Key: "name", Value: "any"}}
	app.UpdateConnectionTypeHandler(rr, req, ps)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestPatchConnectionType_InvalidToken_Returns401(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/connection-types/any", bytes.NewReader([]byte(`[]`)))
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "attacker",
		Token:  k8s.NewBearerToken("garbage-token-abc123"),
	})

	ps := httprouter.Params{{Key: "name", Value: "any"}}
	app.PatchConnectionTypeHandler(rr, req, ps)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestDeleteConnectionType_InvalidToken_Returns401(t *testing.T) {
	app := newTestApp()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, "/api/connection-types/any", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "attacker",
		Token:  k8s.NewBearerToken("garbage-token-abc123"),
	})

	ps := httprouter.Params{{Key: "name", Value: "any"}}
	app.DeleteConnectionTypeHandler(rr, req, ps)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

// cleanupTestCM deletes a ConfigMap if it exists, ensuring clean state for re-runs.
func cleanupTestCM(t *testing.T, ns, name string) {
	t.Helper()
	if testSAClientset == nil {
		return
	}
	_ = testSAClientset.CoreV1().ConfigMaps(ns).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// createTestNamespace creates a namespace in envtest for tests that need one.
// Idempotent - handles already-exists gracefully for re-runs.
func createTestNamespace(t *testing.T, ns string) {
	t.Helper()
	if testEnvInstance == nil || testEnvInstance.Config == nil {
		t.Fatal("testEnvInstance not initialized")
	}
	clientset, err := k8sclient.NewForConfig(testEnvInstance.Config)
	require.NoError(t, err)

	nsObj := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: ns},
	}
	_, err = clientset.CoreV1().Namespaces().Create(context.Background(), nsObj, metav1.CreateOptions{})
	if err != nil && !k8serr.IsAlreadyExists(err) {
		t.Fatalf("unexpected error creating namespace: %v", err)
	}
}
