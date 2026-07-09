package repositories

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
)

func TestFilterAvailableNamespaces(t *testing.T) {
	input := []corev1.Namespace{
		{ObjectMeta: metav1.ObjectMeta{Name: "my-project"}},
		{ObjectMeta: metav1.ObjectMeta{Name: "default"}},
		{ObjectMeta: metav1.ObjectMeta{Name: "openshift-ingress"}},
		{ObjectMeta: metav1.ObjectMeta{Name: "kube-system"}},
		{ObjectMeta: metav1.ObjectMeta{Name: "opendatahub"}},
		{ObjectMeta: metav1.ObjectMeta{Name: "dora-namespace", Annotations: map[string]string{
			constants.DisplayNameAnnotation: "Dora Project",
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
	if filtered[1].Annotations[constants.DisplayNameAnnotation] != "Dora Project" {
		t.Fatalf("expected display name annotation to be preserved")
	}
}

func TestNamespaceDisplayName(t *testing.T) {
	if got := namespaceDisplayName(nil); got != "" {
		t.Fatalf("expected empty display name for nil annotations, got %q", got)
	}
	if got := namespaceDisplayName(map[string]string{}); got != "" {
		t.Fatalf("expected empty display name for missing annotation, got %q", got)
	}
	if got := namespaceDisplayName(map[string]string{
		constants.DisplayNameAnnotation: "My Project",
	}); got != "My Project" {
		t.Fatalf("expected My Project, got %q", got)
	}
}
