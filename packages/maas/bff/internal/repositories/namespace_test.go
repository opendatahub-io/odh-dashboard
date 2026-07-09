package repositories

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestFilterAvailableNamespaces(t *testing.T) {
	input := []corev1.Namespace{
		{ObjectMeta: metav1.ObjectMeta{Name: "my-project"}},
		{ObjectMeta: metav1.ObjectMeta{Name: "default"}},
		{ObjectMeta: metav1.ObjectMeta{Name: "openshift-ingress"}},
		{ObjectMeta: metav1.ObjectMeta{Name: "kube-system"}},
		{ObjectMeta: metav1.ObjectMeta{Name: "opendatahub"}},
		{ObjectMeta: metav1.ObjectMeta{Name: "dora-namespace", Annotations: map[string]string{
			DisplayNameAnnotation: "Dora Project",
		}}},
	}

	filtered := filterAvailableNamespaces(input)

	if len(filtered) != 2 {
		t.Fatalf("expected 2 namespaces, got %d", len(filtered))
	}

	if filtered[0].Name != "my-project" {
		t.Fatalf("expected first namespace my-project, got %s", filtered[0].Name)
	}
	if filtered[1].Name != "dora-namespace" {
		t.Fatalf("expected second namespace dora-namespace, got %s", filtered[1].Name)
	}
	if filtered[1].Annotations[DisplayNameAnnotation] != "Dora Project" {
		t.Fatalf("expected display name annotation to be preserved")
	}
}
