package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/model-registry/ui/bff/internal/api"
	"github.com/kubeflow/model-registry/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/model-registry/ui/bff/internal/redhat/repositories"
)

type mockMcpDeploymentRepo struct {
	listFn   func(namespace string, pageSize int32, nextPageToken string) (models.McpDeploymentList, error)
	deleteFn func(namespace string, name string) error
}

func (m *mockMcpDeploymentRepo) List(namespace string, pageSize int32, nextPageToken string) (models.McpDeploymentList, error) {
	if m.listFn == nil {
		return models.McpDeploymentList{}, nil
	}
	return m.listFn(namespace, pageSize, nextPageToken)
}

func (m *mockMcpDeploymentRepo) Delete(namespace string, name string) error {
	if m.deleteFn == nil {
		return nil
	}
	return m.deleteFn(namespace, name)
}

func withMcpDeploymentRepo(t *testing.T, repo mcpDeploymentRepository) {
	t.Helper()
	original := newMcpDeploymentRepository
	newMcpDeploymentRepository = func() mcpDeploymentRepository {
		return repo
	}
	t.Cleanup(func() {
		newMcpDeploymentRepository = original
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
