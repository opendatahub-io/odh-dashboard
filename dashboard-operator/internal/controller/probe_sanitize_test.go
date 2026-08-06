package controller

import (
	"context"
	"reflect"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func deploymentWithProbes(name, namespace string, containers []interface{}) *unstructured.Unstructured {
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

func TestSanitizeDeploymentProbes_NoLiveDeployment(t *testing.T) {
	s := runtime.NewScheme()
	if err := appsv1.AddToScheme(s); err != nil {
		t.Fatal(err)
	}

	cli := fake.NewClientBuilder().WithScheme(s).Build()

	desired := deploymentWithProbes("test-deploy", "test-ns", []interface{}{
		map[string]interface{}{
			"name":  "main",
			"image": "img:v1",
			"livenessProbe": map[string]interface{}{
				"exec": map[string]interface{}{
					"command": []interface{}{"/bin/sh", "-c", "curl -s http://localhost:8080/"},
				},
			},
		},
	})

	err := sanitizeDeploymentProbes(context.Background(), cli, []unstructured.Unstructured{*desired})
	if err != nil {
		t.Fatalf("expected no error for missing deployment, got: %v", err)
	}
}

func TestSanitizeDeploymentProbes_NoConflict(t *testing.T) {
	s := runtime.NewScheme()
	if err := appsv1.AddToScheme(s); err != nil {
		t.Fatal(err)
	}

	live := deploymentWithProbes("test-deploy", "test-ns", []interface{}{
		map[string]interface{}{
			"name":  "main",
			"image": "img:v1",
			"livenessProbe": map[string]interface{}{
				"exec": map[string]interface{}{
					"command": []interface{}{"/bin/sh", "-c", "curl -s http://localhost:8080/"},
				},
			},
		},
	})

	cli := fake.NewClientBuilder().WithScheme(s).WithRuntimeObjects(live).Build()

	desired := deploymentWithProbes("test-deploy", "test-ns", []interface{}{
		map[string]interface{}{
			"name":  "main",
			"image": "img:v2",
			"livenessProbe": map[string]interface{}{
				"exec": map[string]interface{}{
					"command": []interface{}{"/bin/sh", "-c", "curl -s http://localhost:8080/"},
				},
			},
		},
	})

	err := sanitizeDeploymentProbes(context.Background(), cli, []unstructured.Unstructured{*desired})
	if err != nil {
		t.Fatalf("expected no error when probe types match, got: %v", err)
	}

	// Verify the live deployment was NOT patched (probes unchanged)
	got := &unstructured.Unstructured{}
	got.SetGroupVersionKind(live.GroupVersionKind())
	if err := cli.Get(context.Background(), keyFromUnstructured(live), got); err != nil {
		t.Fatal(err)
	}

	containers, _, _ := unstructured.NestedSlice(got.Object, "spec", "template", "spec", "containers")
	c := containers[0].(map[string]interface{})
	lp := c["livenessProbe"].(map[string]interface{})
	if _, ok := lp["exec"]; !ok {
		t.Error("exec should still be present on live deployment")
	}
}

func TestSanitizeDeploymentProbes_TcpSocketToExec(t *testing.T) {
	s := runtime.NewScheme()
	if err := appsv1.AddToScheme(s); err != nil {
		t.Fatal(err)
	}

	live := deploymentWithProbes("rhods-dashboard", "redhat-ods-applications", []interface{}{
		map[string]interface{}{
			"name":  "rhods-dashboard",
			"image": "dashboard:v1",
			"livenessProbe": map[string]interface{}{
				"tcpSocket": map[string]interface{}{
					"port": int64(8080),
				},
			},
			"readinessProbe": map[string]interface{}{
				"httpGet": map[string]interface{}{
					"path":   "/api/health",
					"port":   int64(8080),
					"scheme": "HTTP",
				},
			},
		},
	})

	cli := fake.NewClientBuilder().WithScheme(s).WithRuntimeObjects(live).Build()

	desired := deploymentWithProbes("rhods-dashboard", "redhat-ods-applications", []interface{}{
		map[string]interface{}{
			"name":  "rhods-dashboard",
			"image": "dashboard:v2",
			"livenessProbe": map[string]interface{}{
				"exec": map[string]interface{}{
					"command": []interface{}{"/bin/sh", "-c", "curl -s http://localhost:8080/"},
				},
			},
			"readinessProbe": map[string]interface{}{
				"exec": map[string]interface{}{
					"command": []interface{}{"/bin/sh", "-c", "curl -s http://localhost:8080/api/health"},
				},
			},
		},
	})

	err := sanitizeDeploymentProbes(context.Background(), cli, []unstructured.Unstructured{*desired})
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	got := &unstructured.Unstructured{}
	got.SetGroupVersionKind(live.GroupVersionKind())
	if err := cli.Get(context.Background(), keyFromUnstructured(live), got); err != nil {
		t.Fatal(err)
	}

	containers, _, _ := unstructured.NestedSlice(got.Object, "spec", "template", "spec", "containers")
	c := containers[0].(map[string]interface{})

	lp, _ := c["livenessProbe"].(map[string]interface{})
	if _, ok := lp["tcpSocket"]; ok {
		t.Error("tcpSocket should have been removed from livenessProbe")
	}
	lpExec, ok := lp["exec"].(map[string]interface{})
	if !ok {
		t.Fatal("exec should have been added to livenessProbe")
	}
	wantLivenessCmd := []interface{}{"/bin/sh", "-c", "curl -s http://localhost:8080/"}
	if !reflect.DeepEqual(lpExec["command"], wantLivenessCmd) {
		t.Errorf("livenessProbe exec command = %v, want %v", lpExec["command"], wantLivenessCmd)
	}

	rp, _ := c["readinessProbe"].(map[string]interface{})
	if _, ok := rp["httpGet"]; ok {
		t.Error("httpGet should have been removed from readinessProbe")
	}
	rpExec, ok := rp["exec"].(map[string]interface{})
	if !ok {
		t.Fatal("exec should have been added to readinessProbe")
	}
	wantReadinessCmd := []interface{}{"/bin/sh", "-c", "curl -s http://localhost:8080/api/health"}
	if !reflect.DeepEqual(rpExec["command"], wantReadinessCmd) {
		t.Errorf("readinessProbe exec command = %v, want %v", rpExec["command"], wantReadinessCmd)
	}
}

func TestSanitizeDeploymentProbes_MultipleContainers(t *testing.T) {
	s := runtime.NewScheme()
	if err := appsv1.AddToScheme(s); err != nil {
		t.Fatal(err)
	}

	live := deploymentWithProbes("rhods-dashboard", "test-ns", []interface{}{
		map[string]interface{}{
			"name":  "rhods-dashboard",
			"image": "dashboard:v1",
			"livenessProbe": map[string]interface{}{
				"tcpSocket": map[string]interface{}{"port": int64(8080)},
			},
		},
		map[string]interface{}{
			"name":  "kube-rbac-proxy",
			"image": "rbac-proxy:v1",
			"livenessProbe": map[string]interface{}{
				"httpGet": map[string]interface{}{
					"path":   "/healthz",
					"port":   int64(8444),
					"scheme": "HTTPS",
				},
			},
		},
	})

	cli := fake.NewClientBuilder().WithScheme(s).WithRuntimeObjects(live).Build()

	desired := deploymentWithProbes("rhods-dashboard", "test-ns", []interface{}{
		map[string]interface{}{
			"name":  "rhods-dashboard",
			"image": "dashboard:v2",
			"livenessProbe": map[string]interface{}{
				"exec": map[string]interface{}{
					"command": []interface{}{"/bin/sh", "-c", "curl localhost:8080/"},
				},
			},
		},
		map[string]interface{}{
			"name":  "kube-rbac-proxy",
			"image": "rbac-proxy:v2",
			"livenessProbe": map[string]interface{}{
				"httpGet": map[string]interface{}{
					"path":   "/healthz",
					"port":   int64(8444),
					"scheme": "HTTPS",
				},
			},
		},
	})

	err := sanitizeDeploymentProbes(context.Background(), cli, []unstructured.Unstructured{*desired})
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	got := &unstructured.Unstructured{}
	got.SetGroupVersionKind(live.GroupVersionKind())
	if err := cli.Get(context.Background(), keyFromUnstructured(live), got); err != nil {
		t.Fatal(err)
	}

	containers, _, _ := unstructured.NestedSlice(got.Object, "spec", "template", "spec", "containers")

	for _, c := range containers {
		cMap := c.(map[string]interface{})
		name := cMap["name"].(string)
		lp, _ := cMap["livenessProbe"].(map[string]interface{})

		switch name {
		case "rhods-dashboard":
			if _, ok := lp["tcpSocket"]; ok {
				t.Error("rhods-dashboard: tcpSocket should have been removed")
			}
			execHandler, ok := lp["exec"].(map[string]interface{})
			if !ok {
				t.Fatal("rhods-dashboard: exec should have been added")
			}
			wantCmd := []interface{}{"/bin/sh", "-c", "curl localhost:8080/"}
			if !reflect.DeepEqual(execHandler["command"], wantCmd) {
				t.Errorf("rhods-dashboard: exec command = %v, want %v", execHandler["command"], wantCmd)
			}
		case "kube-rbac-proxy":
			if _, ok := lp["httpGet"]; !ok {
				t.Error("kube-rbac-proxy: httpGet should be preserved (no conflict)")
			}
		}
	}
}

func TestSanitizeDeploymentProbes_SkipsNonDeployments(t *testing.T) {
	s := runtime.NewScheme()
	if err := appsv1.AddToScheme(s); err != nil {
		t.Fatal(err)
	}

	cli := fake.NewClientBuilder().WithScheme(s).Build()

	svc := unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "v1",
			"kind":       "Service",
			"metadata": map[string]interface{}{
				"name":      "test-svc",
				"namespace": "test-ns",
			},
		},
	}

	err := sanitizeDeploymentProbes(context.Background(), cli, []unstructured.Unstructured{svc})
	if err != nil {
		t.Fatalf("expected no error for non-deployment resources, got: %v", err)
	}
}

func keyFromUnstructured(u *unstructured.Unstructured) client.ObjectKey {
	return client.ObjectKey{
		Name:      u.GetName(),
		Namespace: u.GetNamespace(),
	}
}
