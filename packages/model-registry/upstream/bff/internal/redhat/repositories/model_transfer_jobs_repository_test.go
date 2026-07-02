package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	batchv1client "k8s.io/client-go/kubernetes/typed/batch/v1"
	"k8s.io/client-go/rest"
)

// --- Helpers ---

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

// --- Fake Kubernetes clientset ---

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
	var filtered []batchv1.Job
	for _, job := range f.jobs {
		if matchesLabelSelector(job.Labels, opts.LabelSelector) {
			filtered = append(filtered, job)
		}
	}
	return &batchv1.JobList{Items: filtered}, nil
}

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

// --- projectScopedClient tests ---

func TestProjectScopedClientCombinesJobsFromNamespaces(t *testing.T) {
	fakeClientset := newFakeClientsetWithJobs(map[string][]batchv1.Job{
		"ns-a": {makeJob("job-1", "ns-a")},
		"ns-b": {makeJob("job-2", "ns-b"), makeJob("job-3", "ns-b")},
		"ns-c": {},
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

// --- FilterSystemNamespaces tests ---

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

	result := FilterSystemNamespaces(input)

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
	result := FilterSystemNamespaces([]string{})
	if len(result) != 0 {
		t.Fatalf("expected 0 namespaces, got %d", len(result))
	}
}

// --- listOpenShiftProjects error path tests ---

func TestListProjectsHTTPFailureTriggersFallback(t *testing.T) {
	repo := NewProjectScopedJobsRepository(nil)
	cfg := &rest.Config{Host: "http://127.0.0.1:1"}

	_, err := repo.listOpenShiftProjects(context.Background(), cfg, "token")
	if err == nil {
		t.Fatal("expected error for unreachable host")
	}
	if !errors.Is(err, ErrProjectsAPIUnavailable) {
		t.Fatalf("expected ErrProjectsAPIUnavailable, got: %v", err)
	}
}

func TestListProjectsNon200StatusTriggersFallback(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	repo := NewProjectScopedJobsRepository(nil)
	cfg := &rest.Config{Host: srv.URL}

	_, err := repo.listOpenShiftProjects(context.Background(), cfg, "token")
	if err == nil {
		t.Fatal("expected error for non-200 status")
	}
	if !errors.Is(err, ErrProjectsAPIUnavailable) {
		t.Fatalf("expected ErrProjectsAPIUnavailable, got: %v", err)
	}
}

func TestListProjectsDecodeFailureReturnsServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "not-json")
	}))
	defer srv.Close()

	repo := NewProjectScopedJobsRepository(nil)
	cfg := &rest.Config{Host: srv.URL}

	_, err := repo.listOpenShiftProjects(context.Background(), cfg, "token")
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
	if errors.Is(err, ErrProjectsAPIUnavailable) {
		t.Fatalf("decode failure should NOT carry ErrProjectsAPIUnavailable, got: %v", err)
	}
}

func TestListProjectsRequestCreationFailureReturnsServerError(t *testing.T) {
	repo := NewProjectScopedJobsRepository(nil)
	cfg := &rest.Config{Host: "://bad-scheme"}

	_, err := repo.listOpenShiftProjects(context.Background(), cfg, "token")
	if err == nil {
		t.Fatal("expected error for invalid URL")
	}
	if errors.Is(err, ErrProjectsAPIUnavailable) {
		t.Fatalf("request creation failure should NOT carry ErrProjectsAPIUnavailable, got: %v", err)
	}
}

// --- fakeK8sClient for CreateScopedClient tests ---

// fakeK8sClient satisfies KubernetesClientInterface and the restConfigProvider
// interface so restConfigForClient can extract a REST config without touching
// the real kubeconfig.
type fakeK8sClient struct {
	k8s.KubernetesClientInterface
	cfg *rest.Config
}

func (f *fakeK8sClient) RESTConfig() *rest.Config { return f.cfg }

func projectsAPIHandler(projects []string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		resp := projectListResponse{}
		for _, p := range projects {
			resp.Items = append(resp.Items, struct {
				Metadata struct {
					Name string `json:"name"`
				} `json:"metadata"`
			}{Metadata: struct {
				Name string `json:"name"`
			}{Name: p}})
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})
}

// --- CreateScopedClient tests ---

func TestCreateScopedClientHappyPath(t *testing.T) {
	srv := httptest.NewServer(projectsAPIHandler([]string{"user-ns-a", "user-ns-b", "openshift-monitoring"}))
	defer srv.Close()

	client := &fakeK8sClient{cfg: &rest.Config{Host: srv.URL}}
	repo := NewProjectScopedJobsRepository(nil)

	scopedClient, err := repo.CreateScopedClient(context.Background(), client, "test-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	sc, ok := scopedClient.(*projectScopedClient)
	if !ok {
		t.Fatal("expected *projectScopedClient")
	}

	expected := []string{"user-ns-a", "user-ns-b"}
	if len(sc.namespaces) != len(expected) {
		t.Fatalf("expected %d namespaces, got %d: %v", len(expected), len(sc.namespaces), sc.namespaces)
	}
	for i, ns := range expected {
		if sc.namespaces[i] != ns {
			t.Fatalf("expected namespace %d to be %q, got %q", i, ns, sc.namespaces[i])
		}
	}
}

func TestCreateScopedClientProjectsAPIUnavailablePropagatesSentinel(t *testing.T) {
	client := &fakeK8sClient{cfg: &rest.Config{Host: "http://127.0.0.1:1"}}
	repo := NewProjectScopedJobsRepository(nil)

	_, err := repo.CreateScopedClient(context.Background(), client, "test-token")
	if err == nil {
		t.Fatal("expected error when projects API is unreachable")
	}
	if !errors.Is(err, ErrProjectsAPIUnavailable) {
		t.Fatalf("expected ErrProjectsAPIUnavailable, got: %v", err)
	}
}

func TestCreateScopedClientPreservesOriginalClient(t *testing.T) {
	srv := httptest.NewServer(projectsAPIHandler([]string{"ns-a"}))
	defer srv.Close()

	original := &fakeK8sClient{cfg: &rest.Config{Host: srv.URL}}
	repo := NewProjectScopedJobsRepository(nil)

	scopedClient, err := repo.CreateScopedClient(context.Background(), original, "test-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	sc := scopedClient.(*projectScopedClient)
	if sc.KubernetesClientInterface != original {
		t.Fatal("scoped client should embed the original client for upstream enrichment methods")
	}
}
