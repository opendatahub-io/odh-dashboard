package kubernetes

import (
	"context"
	"log/slog"
	"testing"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	kubernetesfake "k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

func TestTokenKubernetesClientGetNamespacesUsesVisibleProjectsWhenNamespaceListIsForbidden(t *testing.T) {
	projectObjects := []runtime.Object{
		&unstructured.Unstructured{Object: map[string]interface{}{
			"apiVersion": "project.openshift.io/v1",
			"kind":       "Project",
			"metadata": map[string]interface{}{
				"name": "visible-project",
			},
		}},
		&unstructured.Unstructured{Object: map[string]interface{}{
			"apiVersion": "project.openshift.io/v1",
			"kind":       "Project",
			"metadata": map[string]interface{}{
				"labels": map[string]interface{}{
					"dataregistry.opendatahub.io/enabled": "true",
				},
				"name": "data-registry-system",
			},
		}},
	}

	dynamicClient := dynamicfake.NewSimpleDynamicClient(runtime.NewScheme(), projectObjects...)
	clientset := kubernetesfake.NewSimpleClientset()
	clientset.PrependReactor("list", "namespaces", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(schema.GroupResource{Resource: "namespaces"}, "", nil)
	})

	client := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client:        clientset,
			DynamicClient: dynamicClient,
			Logger:        slog.Default(),
		},
	}

	namespaces, err := client.GetNamespaces(context.Background(), nil)
	if err != nil {
		t.Fatalf("GetNamespaces() returned an error: %v", err)
	}

	if len(namespaces) != 2 {
		t.Fatalf("GetNamespaces() = %#v, want all visible projects", namespaces)
	}

	names := map[string]bool{}
	for _, namespace := range namespaces {
		names[namespace.Name] = true
	}
	if !names["visible-project"] || !names["data-registry-system"] {
		t.Fatalf("GetNamespaces() = %#v, want all visible projects", namespaces)
	}
}
