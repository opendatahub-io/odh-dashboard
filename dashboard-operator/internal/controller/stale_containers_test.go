package controller

import (
	"context"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func deploymentWithContainers(name, namespace string, containers []interface{}) *unstructured.Unstructured {
	return &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata": map[string]interface{}{
				"name":      name,
				"namespace": namespace,
			},
			"spec": map[string]interface{}{
				"selector": map[string]interface{}{
					"matchLabels": map[string]interface{}{"app": name},
				},
				"template": map[string]interface{}{
					"metadata": map[string]interface{}{
						"labels": map[string]interface{}{"app": name},
					},
					"spec": map[string]interface{}{
						"containers": containers,
					},
				},
			},
		},
	}
}

func containerEntry(name string) map[string]interface{} {
	return map[string]interface{}{
		"name":  name,
		"image": name + ":latest",
	}
}

func newScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	s := runtime.NewScheme()
	if err := appsv1.AddToScheme(s); err != nil {
		t.Fatal(err)
	}
	return s
}

func TestRemoveStaleContainers_NoLiveDeployment(t *testing.T) {
	s := newScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).Build()

	desired := deploymentWithContainers("test", "ns", []interface{}{
		containerEntry("main"),
	})

	err := removeStaleContainers(context.Background(), cli, []unstructured.Unstructured{*desired})
	if err != nil {
		t.Fatalf("expected no error for missing deployment, got: %v", err)
	}
}

func TestRemoveStaleContainers_NoStaleContainers(t *testing.T) {
	s := newScheme(t)

	live := deploymentWithContainers("dashboard", "ns", []interface{}{
		containerEntry("rhods-dashboard"),
		containerEntry("kube-rbac-proxy"),
	})

	cli := fake.NewClientBuilder().WithScheme(s).WithRuntimeObjects(live).Build()

	desired := deploymentWithContainers("dashboard", "ns", []interface{}{
		containerEntry("rhods-dashboard"),
		containerEntry("kube-rbac-proxy"),
	})

	err := removeStaleContainers(context.Background(), cli, []unstructured.Unstructured{*desired})
	if err != nil {
		t.Fatalf("expected no error when containers match, got: %v", err)
	}

	got := &unstructured.Unstructured{}
	got.SetGroupVersionKind(live.GroupVersionKind())
	if err := cli.Get(context.Background(), keyFromUnstructured(live), got); err != nil {
		t.Fatal(err)
	}
	containers, _, _ := unstructured.NestedSlice(got.Object, "spec", "template", "spec", "containers")
	if len(containers) != 2 {
		t.Errorf("expected 2 containers, got %d", len(containers))
	}
}

func TestRemoveStaleContainers_RemovesOAuthProxy(t *testing.T) {
	s := newScheme(t)

	live := deploymentWithContainers("rhods-dashboard", "redhat-ods-applications", []interface{}{
		containerEntry("rhods-dashboard"),
		containerEntry("oauth-proxy"),
		containerEntry("model-registry-ui"),
		containerEntry("kube-rbac-proxy"),
		containerEntry("core-bff"),
	})

	cli := fake.NewClientBuilder().WithScheme(s).WithRuntimeObjects(live).Build()

	desired := deploymentWithContainers("rhods-dashboard", "redhat-ods-applications", []interface{}{
		containerEntry("rhods-dashboard"),
		containerEntry("model-registry-ui"),
		containerEntry("kube-rbac-proxy"),
		containerEntry("core-bff"),
	})

	err := removeStaleContainers(context.Background(), cli, []unstructured.Unstructured{*desired})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	got := &unstructured.Unstructured{}
	got.SetGroupVersionKind(live.GroupVersionKind())
	if err := cli.Get(context.Background(), keyFromUnstructured(live), got); err != nil {
		t.Fatal(err)
	}

	containers, _, _ := unstructured.NestedSlice(got.Object, "spec", "template", "spec", "containers")
	if len(containers) != 4 {
		t.Fatalf("expected 4 containers after removing oauth-proxy, got %d", len(containers))
	}

	for _, c := range containers {
		cMap := c.(map[string]interface{})
		if cMap["name"] == "oauth-proxy" {
			t.Error("oauth-proxy should have been removed")
		}
	}
}

func TestRemoveStaleContainers_RemovesMultiple(t *testing.T) {
	s := newScheme(t)

	live := deploymentWithContainers("dashboard", "ns", []interface{}{
		containerEntry("main"),
		containerEntry("stale-a"),
		containerEntry("stale-b"),
	})

	cli := fake.NewClientBuilder().WithScheme(s).WithRuntimeObjects(live).Build()

	desired := deploymentWithContainers("dashboard", "ns", []interface{}{
		containerEntry("main"),
	})

	err := removeStaleContainers(context.Background(), cli, []unstructured.Unstructured{*desired})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	got := &unstructured.Unstructured{}
	got.SetGroupVersionKind(live.GroupVersionKind())
	if err := cli.Get(context.Background(), keyFromUnstructured(live), got); err != nil {
		t.Fatal(err)
	}

	containers, _, _ := unstructured.NestedSlice(got.Object, "spec", "template", "spec", "containers")
	if len(containers) != 1 {
		t.Fatalf("expected 1 container, got %d", len(containers))
	}

	cMap := containers[0].(map[string]interface{})
	if cMap["name"] != "main" {
		t.Errorf("expected remaining container to be 'main', got %v", cMap["name"])
	}
}

func TestRemoveStaleContainers_SkipsNonDeployments(t *testing.T) {
	s := newScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).Build()

	svc := unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "v1",
			"kind":       "Service",
			"metadata": map[string]interface{}{
				"name":      "test-svc",
				"namespace": "ns",
			},
		},
	}

	err := removeStaleContainers(context.Background(), cli, []unstructured.Unstructured{svc})
	if err != nil {
		t.Fatalf("expected no error for non-deployment resources, got: %v", err)
	}
}

func TestRemoveStaleContainers_DesiredHasNewContainers(t *testing.T) {
	s := newScheme(t)

	live := deploymentWithContainers("dashboard", "ns", []interface{}{
		containerEntry("main"),
	})

	cli := fake.NewClientBuilder().WithScheme(s).WithRuntimeObjects(live).Build()

	desired := deploymentWithContainers("dashboard", "ns", []interface{}{
		containerEntry("main"),
		containerEntry("new-sidecar"),
	})

	err := removeStaleContainers(context.Background(), cli, []unstructured.Unstructured{*desired})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	got := &unstructured.Unstructured{}
	got.SetGroupVersionKind(live.GroupVersionKind())
	if err := cli.Get(context.Background(), keyFromUnstructured(live), got); err != nil {
		t.Fatal(err)
	}

	containers, _, _ := unstructured.NestedSlice(got.Object, "spec", "template", "spec", "containers")
	if len(containers) != 1 {
		t.Fatalf("expected 1 container (live unchanged), got %d", len(containers))
	}
}

func TestBuildStaleContainerPatch_ReturnsNilWhenNoStale(t *testing.T) {
	live := deploymentWithContainers("d", "ns", []interface{}{
		containerEntry("a"),
		containerEntry("b"),
	})
	desired := deploymentWithContainers("d", "ns", []interface{}{
		containerEntry("a"),
		containerEntry("b"),
	})

	patch, err := buildStaleContainerPatch(live, desired)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if patch != nil {
		t.Errorf("expected nil patch when no stale containers, got %v", patch)
	}
}

func TestBuildStaleContainerPatch_BuildsDeleteEntries(t *testing.T) {
	live := deploymentWithContainers("d", "ns", []interface{}{
		containerEntry("keep"),
		containerEntry("remove-me"),
	})
	desired := deploymentWithContainers("d", "ns", []interface{}{
		containerEntry("keep"),
	})

	patch, err := buildStaleContainerPatch(live, desired)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if patch == nil {
		t.Fatal("expected non-nil patch")
	}

	spec := patch["spec"].(map[string]interface{})
	template := spec["template"].(map[string]interface{})
	podSpec := template["spec"].(map[string]interface{})
	containers := podSpec["containers"].([]interface{})

	if len(containers) != 1 {
		t.Fatalf("expected 1 delete entry, got %d", len(containers))
	}

	entry := containers[0].(map[string]interface{})
	if entry["$patch"] != "delete" {
		t.Errorf("expected $patch=delete, got %v", entry["$patch"])
	}
	if entry["name"] != "remove-me" {
		t.Errorf("expected name=remove-me, got %v", entry["name"])
	}
}

func TestBuildStaleContainerPatch_ErrorsOnEmptyDesiredContainers(t *testing.T) {
	live := deploymentWithContainers("d", "ns", []interface{}{
		containerEntry("main"),
	})
	desired := deploymentWithContainers("d", "ns", []interface{}{})

	_, err := buildStaleContainerPatch(live, desired)
	if err == nil {
		t.Fatal("expected error when desired has no containers")
	}
}

func TestBuildStaleContainerPatch_ErrorsOnMissingDesiredContainers(t *testing.T) {
	live := deploymentWithContainers("d", "ns", []interface{}{
		containerEntry("main"),
	})
	desired := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata":   map[string]interface{}{"name": "d", "namespace": "ns"},
			"spec": map[string]interface{}{
				"template": map[string]interface{}{
					"spec": map[string]interface{}{},
				},
			},
		},
	}

	_, err := buildStaleContainerPatch(live, desired)
	if err == nil {
		t.Fatal("expected error when desired has no containers field")
	}
}

func TestBuildStaleContainerPatch_NilWhenLiveHasNoContainers(t *testing.T) {
	live := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata":   map[string]interface{}{"name": "d", "namespace": "ns"},
			"spec": map[string]interface{}{
				"template": map[string]interface{}{
					"spec": map[string]interface{}{},
				},
			},
		},
	}
	desired := deploymentWithContainers("d", "ns", []interface{}{
		containerEntry("main"),
	})

	patch, err := buildStaleContainerPatch(live, desired)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if patch != nil {
		t.Errorf("expected nil patch when live has no containers, got %v", patch)
	}
}
