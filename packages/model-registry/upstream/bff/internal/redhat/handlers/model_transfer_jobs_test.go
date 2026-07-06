package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/config"
	"github.com/kubeflow/hub/ui/bff/internal/constants"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
	"github.com/kubeflow/hub/ui/bff/internal/repositories"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// --- Fakes ---

// fakeTransferJobsKubeClient satisfies KubernetesClientInterface for the handler.
// Only BearerToken is used before the repository takes over.
type fakeTransferJobsKubeClient struct {
	k8s.KubernetesClientInterface
	token string
}

func (f *fakeTransferJobsKubeClient) BearerToken() (string, error) {
	return f.token, nil
}

// fakeTransferJobsScopedClient is returned by the mock repository's CreateScopedClient.
// It implements the methods called by the upstream repository's GetAllModelTransferJobs.
type fakeTransferJobsScopedClient struct {
	k8s.KubernetesClientInterface
	jobs *batchv1.JobList
}

func (f *fakeTransferJobsScopedClient) GetAllModelTransferJobs(_ context.Context, _ string, _ string, _ string) (*batchv1.JobList, error) {
	return f.jobs, nil
}

func (f *fakeTransferJobsScopedClient) GetTransferJobPods(_ context.Context, _ string, _ []string) (*corev1.PodList, error) {
	return &corev1.PodList{}, nil
}

func (f *fakeTransferJobsScopedClient) GetEventsForPods(_ context.Context, _ string, _ []string) (*corev1.EventList, error) {
	return &corev1.EventList{}, nil
}

// fakeTransferJobsKubeFactory returns a controllable K8s client.
type fakeTransferJobsKubeFactory struct {
	client k8s.KubernetesClientInterface
}

func (f *fakeTransferJobsKubeFactory) GetClient(_ context.Context) (k8s.KubernetesClientInterface, error) {
	return f.client, nil
}

func (f *fakeTransferJobsKubeFactory) ExtractRequestIdentity(http.Header) (*k8s.RequestIdentity, error) {
	return nil, nil
}

func (f *fakeTransferJobsKubeFactory) ValidateRequestIdentity(*k8s.RequestIdentity) error {
	return nil
}

// mockTransferJobsRepo implements modelTransferJobsRepository for handler tests.
type mockTransferJobsRepo struct {
	createScopedClientFn func(ctx context.Context, client k8s.KubernetesClientInterface, bearerToken string) (k8s.KubernetesClientInterface, error)
}

func (m *mockTransferJobsRepo) CreateScopedClient(ctx context.Context, client k8s.KubernetesClientInterface, bearerToken string) (k8s.KubernetesClientInterface, error) {
	if m.createScopedClientFn == nil {
		return nil, fmt.Errorf("CreateScopedClient not implemented")
	}
	return m.createScopedClientFn(ctx, client, bearerToken)
}

// --- Helpers ---

func newTransferJobsTestApp(factory k8s.KubernetesClientFactory) *api.App {
	cfg := config.EnvConfig{AuthMethod: config.AuthMethodUser}
	repos := repositories.NewRepositories(nil, nil)
	return api.NewTestApp(cfg, noopLogger(), factory, repos)
}

func withTransferJobsRepository(t *testing.T, repo modelTransferJobsRepository) {
	t.Helper()
	original := newModelTransferJobsRepository
	newModelTransferJobsRepository = func(*api.App) modelTransferJobsRepository {
		return repo
	}
	t.Cleanup(func() {
		newModelTransferJobsRepository = original
	})
}

func transferJobsRequest(namespace, modelRegistryID string) (*http.Request, httprouter.Params) {
	path := fmt.Sprintf("/api/v1/model_registry/%s/model_transfer_jobs", modelRegistryID)
	req := httptest.NewRequest(http.MethodGet, path, nil)
	ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, namespace)
	req = req.WithContext(ctx)
	ps := httprouter.Params{
		{Key: api.ModelRegistryId, Value: modelRegistryID},
	}
	return req, ps
}

// --- Tests ---

func TestTransferJobsOverrideFallsBackInMockMode(t *testing.T) {
	cfg := config.EnvConfig{AuthMethod: config.AuthMethodUser, MockK8Client: true}
	app := api.NewTestApp(cfg, noopLogger(), &fakeKubeFactory{}, nil)

	defaultCalled := false
	buildDefault := func() httprouter.Handle {
		return func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
			defaultCalled = true
			w.WriteHeader(http.StatusOK)
		}
	}

	handler := overrideModelTransferJobsList(app, buildDefault)
	req, ps := transferJobsRequest("test-ns", "test-registry")
	rr := httptest.NewRecorder()

	handler(rr, req, ps)

	if !defaultCalled {
		t.Fatal("expected default handler to be called in mock mode")
	}
}

func TestTransferJobsOverrideFallsBackWhenProjectsAPIUnavailable(t *testing.T) {
	client := &fakeTransferJobsKubeClient{token: "test-token"}
	factory := &fakeTransferJobsKubeFactory{client: client}
	app := newTransferJobsTestApp(factory)

	withTransferJobsRepository(t, &mockTransferJobsRepo{
		createScopedClientFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string) (k8s.KubernetesClientInterface, error) {
			return nil, fmt.Errorf("%w: projects API not available", redhatrepos.ErrProjectsAPIUnavailable)
		},
	})

	defaultCalled := false
	buildDefault := func() httprouter.Handle {
		return func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
			defaultCalled = true
			w.WriteHeader(http.StatusOK)
		}
	}

	handler := overrideModelTransferJobsList(app, buildDefault)
	req, ps := transferJobsRequest("test-ns", "test-registry")
	rr := httptest.NewRecorder()

	handler(rr, req, ps)

	if !defaultCalled {
		t.Fatal("expected default handler to be called when Projects API is unavailable")
	}
}

func TestTransferJobsOverrideReturnsJobsFromMultipleNamespaces(t *testing.T) {
	client := &fakeTransferJobsKubeClient{token: "test-token"}
	factory := &fakeTransferJobsKubeFactory{client: client}
	app := newTransferJobsTestApp(factory)

	jobs := &batchv1.JobList{
		Items: []batchv1.Job{
			{ObjectMeta: metav1.ObjectMeta{Name: "job-1", Namespace: "ns-a"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "job-2", Namespace: "ns-b"}},
		},
	}

	withTransferJobsRepository(t, &mockTransferJobsRepo{
		createScopedClientFn: func(_ context.Context, original k8s.KubernetesClientInterface, bearerToken string) (k8s.KubernetesClientInterface, error) {
			if bearerToken != "test-token" {
				t.Fatalf("expected bearer token 'test-token', got '%s'", bearerToken)
			}
			return &fakeTransferJobsScopedClient{
				KubernetesClientInterface: original,
				jobs:                      jobs,
			}, nil
		},
	})

	handler := overrideModelTransferJobsList(app, failDefault(t))
	req, ps := transferJobsRequest("test-ns", "test-registry")
	rr := httptest.NewRecorder()

	handler(rr, req, ps)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp api.ModelTransferJobListEnvelope
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Data == nil {
		t.Fatal("expected non-nil response data")
	}
	if len(resp.Data.Items) != 2 {
		t.Fatalf("expected 2 jobs, got %d", len(resp.Data.Items))
	}
}

func TestTransferJobsOverrideReturnsEmptyListWhenNoProjects(t *testing.T) {
	client := &fakeTransferJobsKubeClient{token: "test-token"}
	factory := &fakeTransferJobsKubeFactory{client: client}
	app := newTransferJobsTestApp(factory)

	withTransferJobsRepository(t, &mockTransferJobsRepo{
		createScopedClientFn: func(_ context.Context, original k8s.KubernetesClientInterface, _ string) (k8s.KubernetesClientInterface, error) {
			return &fakeTransferJobsScopedClient{
				KubernetesClientInterface: original,
				jobs:                      &batchv1.JobList{},
			}, nil
		},
	})

	handler := overrideModelTransferJobsList(app, failDefault(t))
	req, ps := transferJobsRequest("test-ns", "test-registry")
	rr := httptest.NewRecorder()

	handler(rr, req, ps)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp api.ModelTransferJobListEnvelope
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Data == nil {
		t.Fatal("expected non-nil response data")
	}
	if len(resp.Data.Items) != 0 {
		t.Fatalf("expected 0 jobs, got %d", len(resp.Data.Items))
	}
}

func TestTransferJobsOverrideBadRequestOnMissingNamespace(t *testing.T) {
	client := &fakeTransferJobsKubeClient{token: "test-token"}
	factory := &fakeTransferJobsKubeFactory{client: client}
	app := newTransferJobsTestApp(factory)

	handler := overrideModelTransferJobsList(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/model_registry/test-registry/model_transfer_jobs", nil)
	ps := httprouter.Params{
		{Key: api.ModelRegistryId, Value: "test-registry"},
	}
	rr := httptest.NewRecorder()

	handler(rr, req, ps)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestTransferJobsOverrideBadRequestOnMissingModelRegistryID(t *testing.T) {
	client := &fakeTransferJobsKubeClient{token: "test-token"}
	factory := &fakeTransferJobsKubeFactory{client: client}
	app := newTransferJobsTestApp(factory)

	handler := overrideModelTransferJobsList(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/model_registry//model_transfer_jobs", nil)
	ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-ns")
	req = req.WithContext(ctx)
	ps := httprouter.Params{
		{Key: api.ModelRegistryId, Value: ""},
	}
	rr := httptest.NewRecorder()

	handler(rr, req, ps)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestTransferJobsOverrideServerErrorOnRepoFailure(t *testing.T) {
	client := &fakeTransferJobsKubeClient{token: "test-token"}
	factory := &fakeTransferJobsKubeFactory{client: client}
	app := newTransferJobsTestApp(factory)

	withTransferJobsRepository(t, &mockTransferJobsRepo{
		createScopedClientFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _ string) (k8s.KubernetesClientInterface, error) {
			return nil, fmt.Errorf("unexpected repository error")
		},
	})

	handler := overrideModelTransferJobsList(app, failDefault(t))
	req, ps := transferJobsRequest("test-ns", "test-registry")
	rr := httptest.NewRecorder()

	handler(rr, req, ps)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d: %s", rr.Code, rr.Body.String())
	}
}
