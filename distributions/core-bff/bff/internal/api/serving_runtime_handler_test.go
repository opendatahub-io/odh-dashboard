package api

import (
	"bytes"
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
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestCreateServingRuntime_MissingMetadata(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "sr-missing-meta"
	})
	admin := k8mocks.DefaultTestUsers[0]

	body := map[string]any{
		"apiVersion": "serving.kserve.io/v1alpha1",
		"kind":       "ServingRuntime",
	}
	data, err := json.Marshal(body)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ServingRuntimesPath, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateServingRuntimeHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateServingRuntime_MissingNamespace(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "sr-missing-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	body := map[string]any{
		"apiVersion": "serving.kserve.io/v1alpha1",
		"kind":       "ServingRuntime",
		"metadata": map[string]any{
			"name": "test-runtime",
		},
	}
	data, err := json.Marshal(body)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ServingRuntimesPath, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateServingRuntimeHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateServingRuntime_DisallowedNamespace(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "sr-allowed-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	body := map[string]any{
		"apiVersion": "serving.kserve.io/v1alpha1",
		"kind":       "ServingRuntime",
		"metadata": map[string]any{
			"name":      "test-runtime",
			"namespace": "some-other-ns",
		},
	}
	data, err := json.Marshal(body)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ServingRuntimesPath, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateServingRuntimeHandler(rr, req, nil)

	assert.Equal(t, http.StatusForbidden, rr.Code)
}

func TestCreateServingRuntime_EmptyBody(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ServingRuntimesPath, bytes.NewReader([]byte("")))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateServingRuntimeHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateServingRuntime_InvalidJSON(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ServingRuntimesPath, bytes.NewReader([]byte("{invalid")))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateServingRuntimeHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateServingRuntime_EmptyNamespaceString(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.Namespace = "sr-empty-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	body := map[string]any{
		"apiVersion": "serving.kserve.io/v1alpha1",
		"kind":       "ServingRuntime",
		"metadata": map[string]any{
			"name":      "test-runtime",
			"namespace": "",
		},
	}
	data, err := json.Marshal(body)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ServingRuntimesPath, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateServingRuntimeHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateServingRuntime_Success(t *testing.T) {
	const ns = "sr-success"
	ensureNamespace(t, ns)

	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	body := map[string]any{
		"apiVersion": "serving.kserve.io/v1alpha1",
		"kind":       "ServingRuntime",
		"metadata": map[string]any{
			"name":      "test-runtime",
			"namespace": ns,
		},
		"spec": map[string]any{
			"supportedModelFormats": []any{
				map[string]any{"name": "openvino_ir", "version": "opset1"},
			},
		},
	}
	data, err := json.Marshal(body)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ServingRuntimesPath, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateServingRuntimeHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result map[string]any
	err = json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	meta, _ := result["metadata"].(map[string]any)
	assert.Equal(t, "test-runtime", meta["name"])
	assert.Equal(t, ns, meta["namespace"])
}

func TestCreateServingRuntime_DryRun(t *testing.T) {
	const ns = "sr-dryrun"
	ensureNamespace(t, ns)

	app := newTestApp(func(a *App) {
		a.config.Namespace = ns
	})
	admin := k8mocks.DefaultTestUsers[0]

	body := map[string]any{
		"apiVersion": "serving.kserve.io/v1alpha1",
		"kind":       "ServingRuntime",
		"metadata": map[string]any{
			"name":      "dryrun-runtime",
			"namespace": ns,
		},
		"spec": map[string]any{
			"supportedModelFormats": []any{
				map[string]any{"name": "openvino_ir", "version": "opset1"},
			},
		},
	}
	data, err := json.Marshal(body)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, ServingRuntimesPath+"?dryRun=All", bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.CreateServingRuntimeHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result map[string]any
	err = json.Unmarshal(rr.Body.Bytes(), &result)
	require.NoError(t, err)
	meta, _ := result["metadata"].(map[string]any)
	assert.Equal(t, "dryrun-runtime", meta["name"])

	// Verify the object was not actually persisted.
	_, err = testSADynClient.Resource(models.ServingRuntimeGVR).Namespace(ns).Get(context.Background(), "dryrun-runtime", metav1.GetOptions{})
	assert.True(t, apierrors.IsNotFound(err), "dry-run request must not persist the resource")
}

func TestExtractNamespaceFromBody(t *testing.T) {
	tests := []struct {
		name    string
		body    map[string]any
		want    string
		wantErr bool
	}{
		{
			name: "valid namespace",
			body: map[string]any{
				"metadata": map[string]any{"namespace": "test-ns"},
			},
			want: "test-ns",
		},
		{
			name:    "missing metadata",
			body:    map[string]any{},
			wantErr: true,
		},
		{
			name: "metadata not an object",
			body: map[string]any{
				"metadata": "not-a-map",
			},
			wantErr: true,
		},
		{
			name: "missing namespace key",
			body: map[string]any{
				"metadata": map[string]any{"name": "test"},
			},
			wantErr: true,
		},
		{
			name: "empty namespace string",
			body: map[string]any{
				"metadata": map[string]any{"namespace": ""},
			},
			wantErr: true,
		},
		{
			name: "namespace not a string",
			body: map[string]any{
				"metadata": map[string]any{"namespace": 123},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := extractNamespaceFromBody(tt.body)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}
