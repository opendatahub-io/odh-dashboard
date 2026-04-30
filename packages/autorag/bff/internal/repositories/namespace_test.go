package repositories

import (
	"testing"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestFilterAvailableNamespaces(t *testing.T) {
	t.Run("should filter out system namespaces with openshift- prefix", func(t *testing.T) {
		namespaces := []corev1.Namespace{
			{ObjectMeta: metav1.ObjectMeta{Name: "openshift-monitoring"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "openshift-operators"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "user-project"}},
		}

		filtered := filterAvailableNamespaces(namespaces)

		assert.Len(t, filtered, 1)
		assert.Equal(t, "user-project", filtered[0].Name)
	})

	t.Run("should filter out system namespaces with kube- prefix", func(t *testing.T) {
		namespaces := []corev1.Namespace{
			{ObjectMeta: metav1.ObjectMeta{Name: "kube-system"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "kube-public"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "user-project"}},
		}

		filtered := filterAvailableNamespaces(namespaces)

		assert.Len(t, filtered, 1)
		assert.Equal(t, "user-project", filtered[0].Name)
	})

	t.Run("should filter out exact match system namespaces", func(t *testing.T) {
		namespaces := []corev1.Namespace{
			{ObjectMeta: metav1.ObjectMeta{Name: "default"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "system"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "openshift"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "opendatahub"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "user-project"}},
		}

		filtered := filterAvailableNamespaces(namespaces)

		assert.Len(t, filtered, 1)
		assert.Equal(t, "user-project", filtered[0].Name)
	})

	t.Run("should include user namespaces", func(t *testing.T) {
		namespaces := []corev1.Namespace{
			{ObjectMeta: metav1.ObjectMeta{Name: "my-project"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "test-namespace"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "prod-env"}},
		}

		filtered := filterAvailableNamespaces(namespaces)

		assert.Len(t, filtered, 3)
		assert.Equal(t, "my-project", filtered[0].Name)
		assert.Equal(t, "test-namespace", filtered[1].Name)
		assert.Equal(t, "prod-env", filtered[2].Name)
	})

	t.Run("should handle empty namespace list", func(t *testing.T) {
		namespaces := []corev1.Namespace{}

		filtered := filterAvailableNamespaces(namespaces)

		assert.Len(t, filtered, 0)
	})

	t.Run("should filter out all namespaces when all are system namespaces", func(t *testing.T) {
		namespaces := []corev1.Namespace{
			{ObjectMeta: metav1.ObjectMeta{Name: "openshift-monitoring"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "kube-system"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "default"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "opendatahub"}},
		}

		filtered := filterAvailableNamespaces(namespaces)

		assert.Len(t, filtered, 0)
	})

	t.Run("should preserve namespace metadata and annotations", func(t *testing.T) {
		namespaces := []corev1.Namespace{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name: "user-project",
					Annotations: map[string]string{
						"openshift.io/display-name": "User Project Display Name",
						"custom-annotation":         "custom-value",
					},
					Labels: map[string]string{
						"environment": "production",
					},
				},
			},
		}

		filtered := filterAvailableNamespaces(namespaces)

		assert.Len(t, filtered, 1)
		assert.Equal(t, "user-project", filtered[0].Name)
		assert.Equal(t, "User Project Display Name", filtered[0].Annotations["openshift.io/display-name"])
		assert.Equal(t, "custom-value", filtered[0].Annotations["custom-annotation"])
		assert.Equal(t, "production", filtered[0].Labels["environment"])
	})

	t.Run("should not filter namespaces containing but not starting with system prefixes", func(t *testing.T) {
		namespaces := []corev1.Namespace{
			{ObjectMeta: metav1.ObjectMeta{Name: "my-openshift-project"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "user-kube-app"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "test-default-namespace"}},
		}

		filtered := filterAvailableNamespaces(namespaces)

		assert.Len(t, filtered, 3)
		assert.Equal(t, "my-openshift-project", filtered[0].Name)
		assert.Equal(t, "user-kube-app", filtered[1].Name)
		assert.Equal(t, "test-default-namespace", filtered[2].Name)
	})

	t.Run("should handle mixed system and user namespaces", func(t *testing.T) {
		namespaces := []corev1.Namespace{
			{ObjectMeta: metav1.ObjectMeta{Name: "openshift-monitoring"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "user-project-1"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "kube-system"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "user-project-2"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "default"}},
			{ObjectMeta: metav1.ObjectMeta{Name: "user-project-3"}},
		}

		filtered := filterAvailableNamespaces(namespaces)

		assert.Len(t, filtered, 3)
		assert.Equal(t, "user-project-1", filtered[0].Name)
		assert.Equal(t, "user-project-2", filtered[1].Name)
		assert.Equal(t, "user-project-3", filtered[2].Name)
	})
}
