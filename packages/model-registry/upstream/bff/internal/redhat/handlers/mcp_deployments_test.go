package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/config"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
)

type mockMcpDeploymentRepo struct {
	listFn   func(ctx context.Context, client k8s.KubernetesClientInterface, namespace string) (models.McpDeploymentList, error)
	getFn    func(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, name string) (models.McpDeployment, error)
	createFn func(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error)
	updateFn func(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, name string, req models.McpDeploymentUpdateRequest) (models.McpDeployment, error)
	deleteFn func(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, name string) error
}

func (m *mockMcpDeploymentRepo) List(ctx context.Context, client k8s.KubernetesClientInterface, namespace string) (models.McpDeploymentList, error) {
	if m.listFn == nil {
		return models.McpDeploymentList{}, nil
	}
	return m.listFn(ctx, client, namespace)
}

func (m *mockMcpDeploymentRepo) Get(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, name string) (models.McpDeployment, error) {
	if m.getFn == nil {
		return models.McpDeployment{}, nil
	}
	return m.getFn(ctx, client, namespace, name)
}

func (m *mockMcpDeploymentRepo) Create(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
	if m.createFn == nil {
		return models.McpDeployment{}, nil
	}
	return m.createFn(ctx, client, namespace, req)
}

func (m *mockMcpDeploymentRepo) Update(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, name string, req models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
	if m.updateFn == nil {
		return models.McpDeployment{}, nil
	}
	return m.updateFn(ctx, client, namespace, name, req)
}

func (m *mockMcpDeploymentRepo) Delete(ctx context.Context, client k8s.KubernetesClientInterface, namespace string, name string) error {
	if m.deleteFn == nil {
		return nil
	}
	return m.deleteFn(ctx, client, namespace, name)
}

func withMcpDeploymentRepo(t *testing.T, repo mcpDeploymentRepository) {
	t.Helper()
	originalFactory := newMcpDeploymentRepository
	newMcpDeploymentRepository = func(_ *api.App) mcpDeploymentRepository {
		return repo
	}
	t.Cleanup(func() {
		newMcpDeploymentRepository = originalFactory
	})
}

func TestMcpDeploymentListReturnsDeployments(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		listFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string) (models.McpDeploymentList, error) {
			if namespace != "test-ns" {
				t.Fatalf("unexpected namespace %s", namespace)
			}
			return models.McpDeploymentList{
				Items: []models.McpDeployment{
					{Name: "kubernetes-mcp", Phase: models.McpDeploymentPhaseRunning},
					{Name: "slack-mcp", Phase: models.McpDeploymentPhasePending},
				},
				Size: 2,
			}, nil
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentList(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentListPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp McpDeploymentListEnvelope
	decodeResponse(t, rr, &resp)

	if len(resp.Data.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(resp.Data.Items))
	}
	if resp.Data.Items[0].Name != "kubernetes-mcp" {
		t.Fatalf("unexpected first item name: %s", resp.Data.Items[0].Name)
	}
}

func TestMcpDeploymentListReturnsServerErrorOnRepoFailure(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		listFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string) (models.McpDeploymentList, error) {
			return models.McpDeploymentList{}, errors.New("connection refused")
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentList(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentListPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", rr.Code)
	}
}

func TestMcpDeploymentDeleteReturnsNoContent(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	deletedName := ""
	repo := &mockMcpDeploymentRepo{
		deleteFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string, name string) error {
			if namespace != "test-ns" {
				t.Fatalf("unexpected namespace %s", namespace)
			}
			deletedName = name
			return nil
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentDelete(app, failDefault(t))

	req := httptest.NewRequest(http.MethodDelete, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "kubernetes-mcp"}})

	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rr.Code)
	}
	if deletedName != "kubernetes-mcp" {
		t.Fatalf("expected deleted name 'kubernetes-mcp', got %q", deletedName)
	}
}

func TestMcpDeploymentDeleteMissingName(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	handler := overrideMcpDeploymentDelete(app, failDefault(t))

	req := httptest.NewRequest(http.MethodDelete, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: ""}})

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}

func TestMcpDeploymentDeleteNotFoundReturns404(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		deleteFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string, name string) error {
			return fmt.Errorf("%w: %q in namespace %q", redhatrepos.ErrMcpDeploymentNotFound, name, namespace)
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentDelete(app, failDefault(t))

	req := httptest.NewRequest(http.MethodDelete, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "does-not-exist"}})

	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", rr.Code)
	}

	var errResp api.ErrorEnvelope
	decodeResponse(t, rr, &errResp)
	if errResp.Error == nil {
		t.Fatalf("expected error envelope, got nil")
	}
	if errResp.Error.Code != strconv.Itoa(http.StatusNotFound) {
		t.Fatalf("expected error code %q, got %q", strconv.Itoa(http.StatusNotFound), errResp.Error.Code)
	}
	if errResp.Error.Message != "the requested resource could not be found" {
		t.Fatalf("unexpected error message: %s", errResp.Error.Message)
	}
}

// --- POST /api/v1/mcp_deployments tests ---

func TestMcpDeploymentCreateReturnsCreated(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		createFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
			if namespace != "test-ns" {
				t.Fatalf("unexpected namespace %s", namespace)
			}
			if req.Image != "quay.io/mcp-servers/github:1.0.0" {
				t.Fatalf("unexpected image %s", req.Image)
			}
			if req.Name != "github-mcp" {
				t.Fatalf("unexpected name %s", req.Name)
			}
			return models.McpDeployment{
				Name:              req.Name,
				Namespace:         namespace,
				CreationTimestamp: "2026-03-26T10:00:00Z",
				Image:             req.Image,
				Phase:             models.McpDeploymentPhasePending,
			}, nil
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentCreate(app, failDefault(t))

	body := `{"data":{"name":"github-mcp","image":"quay.io/mcp-servers/github:1.0.0"}}`
	req := httptest.NewRequest(http.MethodPost, api.McpDeploymentListPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", rr.Code)
	}

	var resp McpDeploymentEnvelope
	decodeResponse(t, rr, &resp)

	if resp.Data.Name != "github-mcp" {
		t.Fatalf("expected name 'github-mcp', got %q", resp.Data.Name)
	}
	if resp.Data.Phase != models.McpDeploymentPhasePending {
		t.Fatalf("expected phase Pending, got %q", resp.Data.Phase)
	}
}

func TestMcpDeploymentCreateMissingImage(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		createFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string, _ models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
			return models.McpDeployment{}, fmt.Errorf("%w: image is required", redhatrepos.ErrMcpDeploymentValidation)
		},
	}

	withMcpDeploymentRepo(t, repo)
	handler := overrideMcpDeploymentCreate(app, failDefault(t))

	body := `{"data":{"name":"github-mcp"}}`
	req := httptest.NewRequest(http.MethodPost, api.McpDeploymentListPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}

func TestMcpDeploymentCreateInvalidName(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		createFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string, _ models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
			return models.McpDeployment{}, fmt.Errorf("%w: invalid name", redhatrepos.ErrMcpDeploymentValidation)
		},
	}

	withMcpDeploymentRepo(t, repo)
	handler := overrideMcpDeploymentCreate(app, failDefault(t))

	body := `{"data":{"name":"INVALID_NAME!","image":"quay.io/test:1.0"}}`
	req := httptest.NewRequest(http.MethodPost, api.McpDeploymentListPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}

func TestMcpDeploymentCreateConflictReturns409(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		createFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
			return models.McpDeployment{}, fmt.Errorf("%w: %q in namespace %q", redhatrepos.ErrMcpDeploymentConflict, req.Name, namespace)
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentCreate(app, failDefault(t))

	body := `{"data":{"name":"kubernetes-mcp","image":"quay.io/test:1.0"}}`
	req := httptest.NewRequest(http.MethodPost, api.McpDeploymentListPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d", rr.Code)
	}

	var errResp api.ErrorEnvelope
	decodeResponse(t, rr, &errResp)
	if errResp.Error == nil {
		t.Fatal("expected error envelope, got nil")
	}
	if errResp.Error.Code != strconv.Itoa(http.StatusConflict) {
		t.Fatalf("expected error code %q, got %q", strconv.Itoa(http.StatusConflict), errResp.Error.Code)
	}
}

func TestMcpDeploymentCreateReturnsServerErrorOnRepoFailure(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		createFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string, _ models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
			return models.McpDeployment{}, errors.New("storage failure")
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentCreate(app, failDefault(t))

	body := `{"data":{"image":"quay.io/test:1.0"}}`
	req := httptest.NewRequest(http.MethodPost, api.McpDeploymentListPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", rr.Code)
	}
}

func TestMcpDeploymentCreateInvalidJSON(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	handler := overrideMcpDeploymentCreate(app, failDefault(t))

	body := `{invalid json`
	req := httptest.NewRequest(http.MethodPost, api.McpDeploymentListPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}

// --- PATCH /api/v1/mcp_deployments/:name tests ---

func TestMcpDeploymentUpdateReturnsOK(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	newImage := "quay.io/mcp-servers/kubernetes:2.0.0"

	repo := &mockMcpDeploymentRepo{
		updateFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string, name string, req models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
			if namespace != "test-ns" {
				t.Fatalf("unexpected namespace %s", namespace)
			}
			if name != "kubernetes-mcp" {
				t.Fatalf("unexpected name %s", name)
			}
			if req.Image == nil || *req.Image != newImage {
				t.Fatalf("unexpected image %v", req.Image)
			}
			return models.McpDeployment{
				Name:              name,
				Namespace:         namespace,
				CreationTimestamp: "2026-03-10T14:30:00Z",
				Image:             *req.Image,
				Phase:             models.McpDeploymentPhaseRunning,
			}, nil
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentUpdate(app, failDefault(t))

	body := fmt.Sprintf(`{"data":{"image":"%s"}}`, newImage)
	req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "kubernetes-mcp"}})

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp McpDeploymentEnvelope
	decodeResponse(t, rr, &resp)

	if resp.Data.Image != newImage {
		t.Fatalf("expected image %q, got %q", newImage, resp.Data.Image)
	}
}

func TestMcpDeploymentUpdateMissingName(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	handler := overrideMcpDeploymentUpdate(app, failDefault(t))

	body := `{"data":{"image":"quay.io/test:2.0"}}`
	req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: ""}})

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}

func TestMcpDeploymentUpdateNotFoundReturns404(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		updateFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string, name string, _ models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
			return models.McpDeployment{}, fmt.Errorf("%w: %q in namespace %q", redhatrepos.ErrMcpDeploymentNotFound, name, namespace)
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentUpdate(app, failDefault(t))

	body := `{"data":{"image":"quay.io/test:2.0"}}`
	req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "does-not-exist"}})

	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", rr.Code)
	}
}

func TestMcpDeploymentUpdateForbiddenReturns403(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		updateFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string, _ string, _ models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
			return models.McpDeployment{}, fmt.Errorf("failed to update MCPServer: %w", newForbiddenError())
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentUpdate(app, failDefault(t))

	body := `{"data":{"image":"quay.io/test:2.0"}}`
	req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "test-mcp"}})

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", rr.Code)
	}
}

func TestMcpDeploymentUpdateReturnsServerErrorOnRepoFailure(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		updateFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string, _ string, _ models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
			return models.McpDeployment{}, errors.New("storage failure")
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentUpdate(app, failDefault(t))

	body := `{"data":{"image":"quay.io/test:2.0"}}`
	req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "kubernetes-mcp"}})

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", rr.Code)
	}
}

func TestMcpDeploymentUpdateInvalidJSON(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	handler := overrideMcpDeploymentUpdate(app, failDefault(t))

	body := `{invalid`
	req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "kubernetes-mcp"}})

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}

// --- GET /api/v1/mcp_deployments/:name tests ---

func TestMcpDeploymentGetReturnsDeployment(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		getFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string, name string) (models.McpDeployment, error) {
			if namespace != "test-ns" {
				t.Fatalf("unexpected namespace %s", namespace)
			}
			if name != "kubernetes-mcp" {
				t.Fatalf("unexpected name %s", name)
			}
			return models.McpDeployment{
				Name:              "kubernetes-mcp",
				Namespace:         namespace,
				UID:               "abc-123",
				CreationTimestamp: "2026-03-10T14:30:00Z",
				Image:             "quay.io/mcp-servers/kubernetes:1.0.0",
				Phase:             models.McpDeploymentPhaseRunning,
			}, nil
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentGet(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "kubernetes-mcp"}})

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp McpDeploymentEnvelope
	decodeResponse(t, rr, &resp)

	if resp.Data.Name != "kubernetes-mcp" {
		t.Fatalf("expected name 'kubernetes-mcp', got %q", resp.Data.Name)
	}
	if resp.Data.Image != "quay.io/mcp-servers/kubernetes:1.0.0" {
		t.Fatalf("expected image 'quay.io/mcp-servers/kubernetes:1.0.0', got %q", resp.Data.Image)
	}
}

func TestMcpDeploymentGetMissingName(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	handler := overrideMcpDeploymentGet(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: ""}})

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}

func TestMcpDeploymentGetNotFoundReturns404(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		getFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string, name string) (models.McpDeployment, error) {
			return models.McpDeployment{}, fmt.Errorf("%w: %q in namespace %q", redhatrepos.ErrMcpDeploymentNotFound, name, namespace)
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentGet(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "does-not-exist"}})

	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", rr.Code)
	}
}

func TestMcpDeploymentGetForbiddenReturns403(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		getFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string, _ string) (models.McpDeployment, error) {
			return models.McpDeployment{}, fmt.Errorf("failed to get MCPServer: %w", newForbiddenError())
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentGet(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "test-mcp"}})

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", rr.Code)
	}
}

func TestMcpDeploymentGetReturnsServerErrorOnRepoFailure(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		getFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string, _ string) (models.McpDeployment, error) {
			return models.McpDeployment{}, errors.New("connection refused")
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentGet(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "kubernetes-mcp"}})

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", rr.Code)
	}
}

func newForbiddenError() error {
	return apierrors.NewForbidden(schema.GroupResource{Group: "mcp.x-k8s.io", Resource: "mcpservers"}, "", fmt.Errorf("forbidden"))
}

func TestMcpDeploymentListForbiddenReturns403(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		listFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string) (models.McpDeploymentList, error) {
			return models.McpDeploymentList{}, fmt.Errorf("failed to list MCPServer resources: %w", newForbiddenError())
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentList(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentListPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", rr.Code)
	}
}

func TestMcpDeploymentCreateForbiddenReturns403(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		createFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string, _ models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
			return models.McpDeployment{}, fmt.Errorf("failed to create MCPServer: %w", newForbiddenError())
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentCreate(app, failDefault(t))

	body := `{"data":{"image":"quay.io/test:1.0"}}`
	req := httptest.NewRequest(http.MethodPost, api.McpDeploymentListPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", rr.Code)
	}
}

func TestMcpDeploymentDeleteReturnsServerErrorOnRepoFailure(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		deleteFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string, _ string) error {
			return errors.New("storage failure")
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentDelete(app, failDefault(t))

	req := httptest.NewRequest(http.MethodDelete, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "test-mcp"}})

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", rr.Code)
	}
}

func TestMcpDeploymentDeleteForbiddenReturns403(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		deleteFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string, _ string) error {
			return fmt.Errorf("failed to delete MCPServer: %w", newForbiddenError())
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentDelete(app, failDefault(t))

	req := httptest.NewRequest(http.MethodDelete, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "test-mcp"}})

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", rr.Code)
	}
}

func TestMcpDeploymentRequireAccessSkipsSARWhenAuthNotInternal(t *testing.T) {
	tests := []struct {
		name       string
		authMethod string
	}{
		{"user_token", config.AuthMethodUser},
		{"empty_auth_treated_as_non_internal", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := config.EnvConfig{AuthMethod: tt.authMethod, MockK8Client: true}
			app := api.NewTestApp(cfg, noopLogger(), &fakeKubeFactory{}, nil)
			rr := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if !requireMcpDeploymentAccess(app, rr, req, "test-ns", "list") {
				t.Fatal("expected true when auth is not internal")
			}
			if rr.Body.Len() != 0 {
				t.Fatalf("expected no response body when SAR is skipped, got %q", rr.Body.String())
			}
		})
	}
}

// TestMcpDeploymentListUserTokenSkipsSAR verifies list still succeeds with user_token auth
// when RequestIdentity is not injected — SAR is not performed in that mode.
func TestMcpDeploymentListUserTokenSkipsSAR(t *testing.T) {
	factory := &fakeKubeFactory{}
	cfg := config.EnvConfig{AuthMethod: config.AuthMethodUser}
	app := api.NewTestApp(cfg, noopLogger(), factory, nil)

	repo := &mockMcpDeploymentRepo{
		listFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string) (models.McpDeploymentList, error) {
			if namespace != "test-ns" {
				t.Fatalf("unexpected namespace %s", namespace)
			}
			return models.McpDeploymentList{Items: []models.McpDeployment{{Name: "mcp-a"}}, Size: 1}, nil
		},
	}
	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentList(app, failDefault(t))
	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentListPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}
	var resp McpDeploymentListEnvelope
	decodeResponse(t, rr, &resp)
	if len(resp.Data.Items) != 1 || resp.Data.Items[0].Name != "mcp-a" {
		t.Fatalf("unexpected list payload: %+v", resp.Data)
	}
}
