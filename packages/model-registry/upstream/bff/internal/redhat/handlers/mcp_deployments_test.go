package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/model-registry/ui/bff/internal/api"
	"github.com/kubeflow/model-registry/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/model-registry/ui/bff/internal/redhat/repositories"
)

type mockMcpDeploymentRepo struct {
	listFn   func(namespace string, pageSize int32, nextPageToken string) (models.McpDeploymentList, error)
	getFn    func(namespace string, name string) (models.McpDeployment, error)
	createFn func(namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error)
	updateFn func(namespace string, name string, req models.McpDeploymentUpdateRequest) (models.McpDeployment, error)
	deleteFn func(namespace string, name string) error
}

func (m *mockMcpDeploymentRepo) List(namespace string, pageSize int32, nextPageToken string) (models.McpDeploymentList, error) {
	if m.listFn == nil {
		return models.McpDeploymentList{}, nil
	}
	return m.listFn(namespace, pageSize, nextPageToken)
}

func (m *mockMcpDeploymentRepo) Get(namespace string, name string) (models.McpDeployment, error) {
	if m.getFn == nil {
		return models.McpDeployment{}, nil
	}
	return m.getFn(namespace, name)
}

func (m *mockMcpDeploymentRepo) Create(namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
	if m.createFn == nil {
		return models.McpDeployment{}, nil
	}
	return m.createFn(namespace, req)
}

func (m *mockMcpDeploymentRepo) Update(namespace string, name string, req models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
	if m.updateFn == nil {
		return models.McpDeployment{}, nil
	}
	return m.updateFn(namespace, name, req)
}

func (m *mockMcpDeploymentRepo) Delete(namespace string, name string) error {
	if m.deleteFn == nil {
		return nil
	}
	return m.deleteFn(namespace, name)
}

func withMcpDeploymentRepo(t *testing.T, repo mcpDeploymentRepository) {
	t.Helper()
	originalFactory := newMcpDeploymentRepository
	originalShared := sharedMcpDeploymentRepo
	newMcpDeploymentRepository = func() mcpDeploymentRepository {
		return repo
	}
	sharedMcpDeploymentRepo = nil
	t.Cleanup(func() {
		newMcpDeploymentRepository = originalFactory
		sharedMcpDeploymentRepo = originalShared
	})
}

func TestMcpDeploymentListReturnsDeployments(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		listFn: func(namespace string, pageSize int32, _ string) (models.McpDeploymentList, error) {
			if namespace != "test-ns" {
				t.Fatalf("unexpected namespace %s", namespace)
			}
			if pageSize != 10 {
				t.Fatalf("expected pageSize 10, got %d", pageSize)
			}
			return models.McpDeploymentList{
				Items: []models.McpDeployment{
					{Name: "kubernetes-mcp", Phase: models.McpDeploymentPhaseRunning},
					{Name: "slack-mcp", Phase: models.McpDeploymentPhasePending},
				},
				Size:     2,
				PageSize: pageSize,
			}, nil
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentList(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentListPath+"?namespace=test-ns&pageSize=10", nil)
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
		listFn: func(namespace string, pageSize int32, _ string) (models.McpDeploymentList, error) {
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

func TestMcpDeploymentListRejectsBadPageSize(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	handler := overrideMcpDeploymentList(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentListPath+"?namespace=test-ns&pageSize=-1", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}

func TestMcpDeploymentDeleteReturnsNoContent(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	deletedName := ""
	repo := &mockMcpDeploymentRepo{
		deleteFn: func(namespace string, name string) error {
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
		deleteFn: func(namespace string, name string) error {
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
		createFn: func(namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
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
				Port:              8080,
				Phase:             models.McpDeploymentPhasePending,
			}, nil
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentCreate(app, failDefault(t))

	body := `{"data":{"name":"github-mcp","image":"quay.io/mcp-servers/github:1.0.0","port":8080}}`
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

func TestMcpDeploymentCreateInvalidPort(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	handler := overrideMcpDeploymentCreate(app, failDefault(t))

	body := `{"data":{"image":"quay.io/test:1.0","port":70000}}`
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
		createFn: func(namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
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
}

func TestMcpDeploymentCreateReturnsServerErrorOnRepoFailure(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		createFn: func(namespace string, req models.McpDeploymentCreateRequest) (models.McpDeployment, error) {
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
	var newPort int32 = 9090

	repo := &mockMcpDeploymentRepo{
		updateFn: func(namespace string, name string, req models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
			if namespace != "test-ns" {
				t.Fatalf("unexpected namespace %s", namespace)
			}
			if name != "kubernetes-mcp" {
				t.Fatalf("unexpected name %s", name)
			}
			if req.Image == nil || *req.Image != newImage {
				t.Fatalf("unexpected image %v", req.Image)
			}
			if req.Port == nil || *req.Port != newPort {
				t.Fatalf("unexpected port %v", req.Port)
			}
			return models.McpDeployment{
				Name:              name,
				Namespace:         namespace,
				CreationTimestamp: "2026-03-10T14:30:00Z",
				Image:             *req.Image,
				Port:              *req.Port,
				Phase:             models.McpDeploymentPhaseRunning,
			}, nil
		},
	}

	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentUpdate(app, failDefault(t))

	body := fmt.Sprintf(`{"data":{"image":"%s","port":%d}}`, newImage, newPort)
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
	if resp.Data.Port != newPort {
		t.Fatalf("expected port %d, got %d", newPort, resp.Data.Port)
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
		updateFn: func(namespace string, name string, req models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
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

func TestMcpDeploymentUpdateEmptyImage(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	handler := overrideMcpDeploymentUpdate(app, failDefault(t))

	body := `{"data":{"image":""}}`
	req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "kubernetes-mcp"}})

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}

func TestMcpDeploymentUpdateInvalidPort(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	handler := overrideMcpDeploymentUpdate(app, failDefault(t))

	body := `{"data":{"port":0}}`
	req := httptest.NewRequest(http.MethodPatch, api.McpDeploymentPath+"?namespace=test-ns", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "kubernetes-mcp"}})

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}

func TestMcpDeploymentUpdateReturnsServerErrorOnRepoFailure(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		updateFn: func(namespace string, name string, req models.McpDeploymentUpdateRequest) (models.McpDeployment, error) {
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
		getFn: func(namespace string, name string) (models.McpDeployment, error) {
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
				Port:              8080,
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
		getFn: func(namespace string, name string) (models.McpDeployment, error) {
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

func TestMcpDeploymentGetReturnsServerErrorOnRepoFailure(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpDeploymentRepo{
		getFn: func(namespace string, name string) (models.McpDeployment, error) {
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
