package controller

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
)

func TestDeploymentGVK(t *testing.T) {
	expected := schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "Deployment"}
	if deploymentGVK != expected {
		t.Errorf("deploymentGVK = %v, want %v", deploymentGVK, expected)
	}
}

func TestMergeDeployments_PreservesReplicas(t *testing.T) {
	existing := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata":   map[string]interface{}{"name": "test-deploy"},
			"spec": map[string]interface{}{
				"replicas": int64(3),
				"template": map[string]interface{}{
					"spec": map[string]interface{}{
						"containers": []interface{}{
							map[string]interface{}{
								"name":  "main",
								"image": "old-image:v1",
							},
						},
					},
				},
			},
		},
	}

	desired := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata":   map[string]interface{}{"name": "test-deploy"},
			"spec": map[string]interface{}{
				"replicas": int64(1),
				"template": map[string]interface{}{
					"spec": map[string]interface{}{
						"containers": []interface{}{
							map[string]interface{}{
								"name":  "main",
								"image": "new-image:v2",
							},
						},
					},
				},
			},
		},
	}

	if err := deploy.MergeDeployments(existing, desired); err != nil {
		t.Fatalf("MergeDeployments returned error: %v", err)
	}

	replicas, found, err := unstructured.NestedInt64(desired.Object, "spec", "replicas")
	if err != nil {
		t.Fatalf("failed to get replicas: %v", err)
	}
	if !found {
		t.Fatal("replicas field not found after merge")
	}
	if replicas != 3 {
		t.Errorf("replicas = %d, want 3 (user-configured value should be preserved)", replicas)
	}
}

func TestMergeDeployments_PreservesContainerResources(t *testing.T) {
	existing := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata":   map[string]interface{}{"name": "test-deploy"},
			"spec": map[string]interface{}{
				"replicas": int64(1),
				"template": map[string]interface{}{
					"spec": map[string]interface{}{
						"containers": []interface{}{
							map[string]interface{}{
								"name":  "odh-dashboard",
								"image": "dashboard:v1",
								"resources": map[string]interface{}{
									"requests": map[string]interface{}{
										"memory": "512Mi",
										"cpu":    "500m",
									},
									"limits": map[string]interface{}{
										"memory": "2Gi",
									},
								},
							},
							map[string]interface{}{
								"name":  "kube-rbac-proxy",
								"image": "rbac-proxy:v1",
								"resources": map[string]interface{}{
									"requests": map[string]interface{}{
										"memory": "64Mi",
									},
								},
							},
						},
					},
				},
			},
		},
	}

	desired := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata":   map[string]interface{}{"name": "test-deploy"},
			"spec": map[string]interface{}{
				"replicas": int64(1),
				"template": map[string]interface{}{
					"spec": map[string]interface{}{
						"containers": []interface{}{
							map[string]interface{}{
								"name":  "odh-dashboard",
								"image": "dashboard:v2",
								"resources": map[string]interface{}{
									"requests": map[string]interface{}{
										"memory": "256Mi",
										"cpu":    "200m",
									},
								},
							},
							map[string]interface{}{
								"name":  "kube-rbac-proxy",
								"image": "rbac-proxy:v2",
								"resources": map[string]interface{}{
									"requests": map[string]interface{}{
										"memory": "32Mi",
									},
								},
							},
						},
					},
				},
			},
		},
	}

	if err := deploy.MergeDeployments(existing, desired); err != nil {
		t.Fatalf("MergeDeployments returned error: %v", err)
	}

	containers, found, err := unstructured.NestedSlice(desired.Object, "spec", "template", "spec", "containers")
	if err != nil || !found {
		t.Fatalf("failed to get containers: found=%v, err=%v", found, err)
	}

	for _, c := range containers {
		cMap := c.(map[string]interface{})
		name := cMap["name"].(string)
		resources, ok := cMap["resources"].(map[string]interface{})

		switch name {
		case "odh-dashboard":
			if !ok {
				t.Fatal("odh-dashboard container should have resources after merge")
			}
			requests := resources["requests"].(map[string]interface{})
			if requests["memory"] != "512Mi" {
				t.Errorf("odh-dashboard memory request = %v, want 512Mi (user value)", requests["memory"])
			}
			if requests["cpu"] != "500m" {
				t.Errorf("odh-dashboard cpu request = %v, want 500m (user value)", requests["cpu"])
			}
			limits, ok := resources["limits"].(map[string]interface{})
			if !ok {
				t.Fatal("odh-dashboard should have limits preserved from existing")
			}
			if limits["memory"] != "2Gi" {
				t.Errorf("odh-dashboard memory limit = %v, want 2Gi (user value)", limits["memory"])
			}

		case "kube-rbac-proxy":
			if !ok {
				t.Fatal("kube-rbac-proxy container should have resources after merge")
			}
			requests := resources["requests"].(map[string]interface{})
			if requests["memory"] != "64Mi" {
				t.Errorf("kube-rbac-proxy memory request = %v, want 64Mi (user value)", requests["memory"])
			}
		}
	}
}

func TestMergeDeployments_MatchesByContainerName(t *testing.T) {
	existing := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata":   map[string]interface{}{"name": "sidecar-deploy"},
			"spec": map[string]interface{}{
				"replicas": int64(2),
				"template": map[string]interface{}{
					"spec": map[string]interface{}{
						"containers": []interface{}{
							map[string]interface{}{
								"name":  "odh-dashboard",
								"image": "dashboard:v1",
								"resources": map[string]interface{}{
									"requests": map[string]interface{}{"memory": "1Gi"},
								},
							},
							map[string]interface{}{
								"name":  "model-registry-bff",
								"image": "mr-bff:v1",
								"resources": map[string]interface{}{
									"requests": map[string]interface{}{"memory": "256Mi"},
								},
							},
							map[string]interface{}{
								"name":  "gen-ai-bff",
								"image": "genai-bff:v1",
							},
						},
					},
				},
			},
		},
	}

	desired := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata":   map[string]interface{}{"name": "sidecar-deploy"},
			"spec": map[string]interface{}{
				"replicas": int64(1),
				"template": map[string]interface{}{
					"spec": map[string]interface{}{
						"containers": []interface{}{
							map[string]interface{}{
								"name":  "odh-dashboard",
								"image": "dashboard:v2",
								"resources": map[string]interface{}{
									"requests": map[string]interface{}{"memory": "512Mi"},
								},
							},
							map[string]interface{}{
								"name":  "model-registry-bff",
								"image": "mr-bff:v2",
								"resources": map[string]interface{}{
									"requests": map[string]interface{}{"memory": "128Mi"},
								},
							},
							map[string]interface{}{
								"name":  "gen-ai-bff",
								"image": "genai-bff:v2",
								"resources": map[string]interface{}{
									"requests": map[string]interface{}{"memory": "64Mi"},
								},
							},
						},
					},
				},
			},
		},
	}

	if err := deploy.MergeDeployments(existing, desired); err != nil {
		t.Fatalf("MergeDeployments returned error: %v", err)
	}

	replicas, _, _ := unstructured.NestedInt64(desired.Object, "spec", "replicas")
	if replicas != 2 {
		t.Errorf("replicas = %d, want 2", replicas)
	}

	containers, _, _ := unstructured.NestedSlice(desired.Object, "spec", "template", "spec", "containers")

	for _, c := range containers {
		cMap := c.(map[string]interface{})
		name := cMap["name"].(string)

		switch name {
		case "odh-dashboard":
			res := cMap["resources"].(map[string]interface{})
			req := res["requests"].(map[string]interface{})
			if req["memory"] != "1Gi" {
				t.Errorf("odh-dashboard memory = %v, want 1Gi", req["memory"])
			}

		case "model-registry-bff":
			res := cMap["resources"].(map[string]interface{})
			req := res["requests"].(map[string]interface{})
			if req["memory"] != "256Mi" {
				t.Errorf("model-registry-bff memory = %v, want 256Mi", req["memory"])
			}

		case "gen-ai-bff":
			if _, ok := cMap["resources"]; ok {
				t.Error("gen-ai-bff should have no resources (existing had none)")
			}
		}
	}
}

func TestMergeDeployments_DefaultsAppliedOnFirstDeploy(t *testing.T) {
	existing := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata":   map[string]interface{}{"name": "new-deploy"},
			"spec": map[string]interface{}{
				"template": map[string]interface{}{
					"spec": map[string]interface{}{
						"containers": []interface{}{
							map[string]interface{}{
								"name":  "main",
								"image": "image:v1",
							},
						},
					},
				},
			},
		},
	}

	desired := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata":   map[string]interface{}{"name": "new-deploy"},
			"spec": map[string]interface{}{
				"replicas": int64(2),
				"template": map[string]interface{}{
					"spec": map[string]interface{}{
						"containers": []interface{}{
							map[string]interface{}{
								"name":  "main",
								"image": "image:v1",
								"resources": map[string]interface{}{
									"requests": map[string]interface{}{
										"memory": "256Mi",
									},
								},
							},
						},
					},
				},
			},
		},
	}

	if err := deploy.MergeDeployments(existing, desired); err != nil {
		t.Fatalf("MergeDeployments returned error: %v", err)
	}

	_, found, _ := unstructured.NestedInt64(desired.Object, "spec", "replicas")
	if found {
		t.Error("replicas should be removed when existing has no replicas set (K8s default)")
	}

	containers, _, _ := unstructured.NestedSlice(desired.Object, "spec", "template", "spec", "containers")
	cMap := containers[0].(map[string]interface{})
	if _, ok := cMap["resources"]; ok {
		t.Error("resources should be removed when existing container had no resources (first deploy scenario)")
	}
}
