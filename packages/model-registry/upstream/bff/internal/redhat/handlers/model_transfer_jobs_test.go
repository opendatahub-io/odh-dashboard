package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/config"
	"github.com/kubeflow/hub/ui/bff/internal/constants"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/repositories"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	batchv1client "k8s.io/client-go/kubernetes/typed/batch/v1"
)

// --- Fakes for transfer jobs handler tests ---

// fakeTransferJobsKubeClient satisfies KubernetesClientInterface for the handler.
// Only BearerToken is used before the scoped client takes over.
// Unoverridden methods will panic (embedded nil interface) — this is intentional
// so tests fail fast if unexpected methods are called.
type fakeTransferJobsKubeClient struct {
	k8s.KubernetesClientInterface
	token string
}

func (f *fakeTransferJobsKubeClient) BearerToken() (string, error) {
	return f.token, nil
}

// fakeTransferJobsScopedClient is returned by the mocked createScopedClient.
// It implements the methods called by the repository's GetAllModelTransferJobs.
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

// --- Helpers ---

func newTransferJobsTestApp(factory k8s.KubernetesClientFactory) *api.App {
	cfg := config.EnvConfig{AuthMethod: config.AuthMethodUser}
	repos := repositories.NewRepositories(nil, nil)
	return api.NewTestApp(cfg, noopLogger(), factory, repos)
}

func withListProjects(t *testing.T, fn func(ctx context.Context, bearerToken string) ([]string, error)) {
	t.Helper()
	original := listProjects
	listProjects = fn
	t.Cleanup(func() {
		listProjects = original
	})
}

func withCreateScopedClient(t *testing.T, fn func(original k8s.KubernetesClientInterface, bearerToken string, namespaces []string) (k8s.KubernetesClientInterface, error)) {
	t.Helper()
	original := createScopedClient
	createScopedClient = fn
	t.Cleanup(func() {
		createScopedClient = original
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

func makeJob(name, namespace string) batchv1.Job {
	return batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels: map[string]string{
				"modelregistry.kubeflow.org/job-type":            "async-upload",
				"modelregistry.kubeflow.org/model-registry-name": "test-registry",
			},
		},
		Spec: batchv1.JobSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers:    []corev1.Container{{Name: "upload", Image: "test-image"}},
					RestartPolicy: corev1.RestartPolicyNever,
				},
			},
		},
	}
}

// --- Tests ---

func TestTransferJobsOverrideFallsBackInMockMode(t *testing.T) {
	// When MockK8Client is true, shouldUseRedHatOverrides returns false,
	// so the override should fall back to the default handler.
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

	// Mock listProjects to return an error (simulating non-OpenShift cluster).
	withListProjects(t, func(_ context.Context, _ string) ([]string, error) {
		return nil, fmt.Errorf("projects API not available")
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

	withListProjects(t, func(_ context.Context, bearerToken string) ([]string, error) {
		if bearerToken != "test-token" {
			t.Fatalf("expected bearer token 'test-token', got '%s'", bearerToken)
		}
		return []string{"ns-a", "ns-b", "ns-c"}, nil
	})

	jobs := &batchv1.JobList{
		Items: []batchv1.Job{
			makeJob("job-1", "ns-a"),
			makeJob("job-2", "ns-b"),
		},
	}

	withCreateScopedClient(t, func(original k8s.KubernetesClientInterface, _ string, namespaces []string) (k8s.KubernetesClientInterface, error) {
		if len(namespaces) != 3 {
			t.Fatalf("expected 3 namespaces, got %d", len(namespaces))
		}
		return &fakeTransferJobsScopedClient{
			KubernetesClientInterface: original,
			jobs:                      jobs,
		}, nil
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

	withListProjects(t, func(_ context.Context, _ string) ([]string, error) {
		return []string{}, nil
	})

	withCreateScopedClient(t, func(original k8s.KubernetesClientInterface, _ string, namespaces []string) (k8s.KubernetesClientInterface, error) {
		if len(namespaces) != 0 {
			t.Fatalf("expected 0 namespaces, got %d", len(namespaces))
		}
		return &fakeTransferJobsScopedClient{
			KubernetesClientInterface: original,
			jobs:                      &batchv1.JobList{},
		}, nil
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

	// Create request WITHOUT namespace in context.
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
	// Empty model registry ID param.
	ps := httprouter.Params{
		{Key: api.ModelRegistryId, Value: ""},
	}
	rr := httptest.NewRecorder()

	handler(rr, req, ps)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d: %s", rr.Code, rr.Body.String())
	}
}

// --- Test for projectScopedClient.GetAllModelTransferJobs ---

func TestProjectScopedClientCombinesJobsFromNamespaces(t *testing.T) {
	// Create a fake K8s clientset using the kubernetes fake package.
	fakeClientset := newFakeClientsetWithJobs(map[string][]batchv1.Job{
		"ns-a": {makeJob("job-1", "ns-a")},
		"ns-b": {makeJob("job-2", "ns-b"), makeJob("job-3", "ns-b")},
		"ns-c": {}, // empty namespace
	})

	scopedClient := &projectScopedClient{
		userClientset: fakeClientset,
		namespaces:    []string{"ns-a", "ns-b", "ns-c"},
	}

	jobList, err := scopedClient.GetAllModelTransferJobs(context.Background(), "ignored-ns", "test-registry", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(jobList.Items) != 3 {
		t.Fatalf("expected 3 jobs, got %d", len(jobList.Items))
	}
}

func TestProjectScopedClientSkipsInaccessibleNamespaces(t *testing.T) {
	// Create a clientset that has jobs only in ns-a. ns-b will return an error
	// because the fake clientset doesn't have any reactors for it — but actually
	// the fake clientset returns empty lists for unknown namespaces.
	// So we test that empty namespaces are handled gracefully.
	fakeClientset := newFakeClientsetWithJobs(map[string][]batchv1.Job{
		"ns-a": {makeJob("job-1", "ns-a")},
	})

	scopedClient := &projectScopedClient{
		userClientset: fakeClientset,
		namespaces:    []string{"ns-a", "ns-b"},
	}

	jobList, err := scopedClient.GetAllModelTransferJobs(context.Background(), "ignored-ns", "test-registry", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(jobList.Items) != 1 {
		t.Fatalf("expected 1 job, got %d", len(jobList.Items))
	}
	if jobList.Items[0].Name != "job-1" {
		t.Fatalf("expected job name 'job-1', got '%s'", jobList.Items[0].Name)
	}
}

func TestProjectScopedClientReturnsEmptyForEmptyModelRegistryID(t *testing.T) {
	scopedClient := &projectScopedClient{
		namespaces: []string{"ns-a"},
	}

	jobList, err := scopedClient.GetAllModelTransferJobs(context.Background(), "ns", "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(jobList.Items) != 0 {
		t.Fatalf("expected 0 jobs, got %d", len(jobList.Items))
	}
}

// --- Fake Kubernetes clientset helper ---

func newFakeClientsetWithJobs(jobsByNamespace map[string][]batchv1.Job) *fakeBatchClientset {
	return &fakeBatchClientset{jobs: jobsByNamespace}
}

// fakeBatchClientset is a minimal fake kubernetes.Interface that only supports
// listing batch/v1 Jobs per namespace with label filtering.
type fakeBatchClientset struct {
	kubernetes.Interface
	jobs map[string][]batchv1.Job
}

func (f *fakeBatchClientset) BatchV1() batchv1client.BatchV1Interface {
	return &fakeBatchV1{jobs: f.jobs}
}

type fakeBatchV1 struct {
	batchv1client.BatchV1Interface
	jobs map[string][]batchv1.Job
}

func (f *fakeBatchV1) Jobs(namespace string) batchv1client.JobInterface {
	return &fakeJobClient{jobs: f.jobs[namespace]}
}

type fakeJobClient struct {
	batchv1client.JobInterface
	jobs []batchv1.Job
}

func (f *fakeJobClient) List(_ context.Context, opts metav1.ListOptions) (*batchv1.JobList, error) {
	if opts.LabelSelector == "" {
		return &batchv1.JobList{Items: f.jobs}, nil
	}
	// Filter jobs by label selector (simplified: just check all selector labels exist on job).
	var filtered []batchv1.Job
	for _, job := range f.jobs {
		if matchesLabelSelector(job.Labels, opts.LabelSelector) {
			filtered = append(filtered, job)
		}
	}
	return &batchv1.JobList{Items: filtered}, nil
}

// --- Test for filterSystemNamespaces ---

func TestFilterSystemNamespaces(t *testing.T) {
	input := []string{
		"my-project",
		"openshift",
		"openshift-monitoring",
		"openshift-operators",
		"kube-system",
		"kube-public",
		"default",
		"system",
		"opendatahub",
		"user-ns-a",
		"user-ns-b",
	}

	result := filterSystemNamespaces(input)

	expected := []string{"my-project", "user-ns-a", "user-ns-b"}
	if len(result) != len(expected) {
		t.Fatalf("expected %d namespaces, got %d: %v", len(expected), len(result), result)
	}
	for i, ns := range expected {
		if result[i] != ns {
			t.Fatalf("expected namespace %d to be '%s', got '%s'", i, ns, result[i])
		}
	}
}

func TestFilterSystemNamespacesEmpty(t *testing.T) {
	result := filterSystemNamespaces([]string{})
	if len(result) != 0 {
		t.Fatalf("expected 0 namespaces, got %d", len(result))
	}
}

// matchesLabelSelector does a simplified label selector match (comma-separated key=value pairs).
func matchesLabelSelector(labels map[string]string, selector string) bool {
	for _, part := range strings.Split(selector, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}
		if labels[kv[0]] != kv[1] {
			return false
		}
	}
	return true
}
