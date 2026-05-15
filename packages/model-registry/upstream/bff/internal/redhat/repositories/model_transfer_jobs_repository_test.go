package repositories

import (
	"context"
	"strings"
	"testing"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	batchv1client "k8s.io/client-go/kubernetes/typed/batch/v1"
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
