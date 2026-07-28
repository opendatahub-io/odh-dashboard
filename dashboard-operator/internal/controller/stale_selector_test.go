package controller_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

func TestSelectorLabelsMatch(t *testing.T) {
	tests := []struct {
		name     string
		existing map[string]string
		desired  map[string]string
		want     bool
	}{
		{
			name:     "identical labels",
			existing: map[string]string{"app": "dashboard", "deployment": "dashboard"},
			desired:  map[string]string{"app": "dashboard", "deployment": "dashboard"},
			want:     true,
		},
		{
			name:     "extra label in existing (stale upgrade scenario)",
			existing: map[string]string{"app": "dashboard", "deployment": "dashboard", "app.opendatahub.io/rhods-dashboard": "true"},
			desired:  map[string]string{"app": "dashboard", "deployment": "dashboard"},
			want:     false,
		},
		{
			name:     "extra label in desired",
			existing: map[string]string{"app": "dashboard"},
			desired:  map[string]string{"app": "dashboard", "deployment": "dashboard"},
			want:     false,
		},
		{
			name:     "different values",
			existing: map[string]string{"app": "old"},
			desired:  map[string]string{"app": "new"},
			want:     false,
		},
		{
			name:     "both empty",
			existing: map[string]string{},
			desired:  map[string]string{},
			want:     true,
		},
		{
			name:     "both nil",
			existing: nil,
			desired:  nil,
			want:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ctrlpkg.SelectorLabelsMatch(tt.existing, tt.desired)
			assert.Equal(t, tt.want, got)
		})
	}
}

func makeDeploymentUnstructured(name, namespace string, selectorLabels map[string]string) unstructured.Unstructured {
	matchLabels := map[string]interface{}{}
	for k, v := range selectorLabels {
		matchLabels[k] = v
	}

	return unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata": map[string]interface{}{
				"name":      name,
				"namespace": namespace,
			},
			"spec": map[string]interface{}{
				"selector": map[string]interface{}{
					"matchLabels": matchLabels,
				},
			},
		},
	}
}

func TestDeleteDeploymentsWithStaleSelectorLabels(t *testing.T) {
	tests := []struct {
		name             string
		existingSelector map[string]string
		desiredSelector  map[string]string
		wantDeleted      bool
	}{
		{
			name: "matching selectors — no deletion",
			existingSelector: map[string]string{
				"app":                            "rhods-dashboard",
				"app.kubernetes.io/part-of":      "rhods-dashboard",
				"deployment":                     "rhods-dashboard",
			},
			desiredSelector: map[string]string{
				"app":                            "rhods-dashboard",
				"app.kubernetes.io/part-of":      "rhods-dashboard",
				"deployment":                     "rhods-dashboard",
			},
			wantDeleted: false,
		},
		{
			name: "stale label in existing — deletion required",
			existingSelector: map[string]string{
				"app":                                      "rhods-dashboard",
				"app.kubernetes.io/part-of":                "rhods-dashboard",
				"app.opendatahub.io/rhods-dashboard":       "true",
				"deployment":                               "rhods-dashboard",
			},
			desiredSelector: map[string]string{
				"app":                            "rhods-dashboard",
				"app.kubernetes.io/part-of":      "rhods-dashboard",
				"deployment":                     "rhods-dashboard",
			},
			wantDeleted: true,
		},
		{
			name: "new label added in desired — deletion required",
			existingSelector: map[string]string{
				"app":        "rhods-dashboard",
				"deployment": "rhods-dashboard",
			},
			desiredSelector: map[string]string{
				"app":                            "rhods-dashboard",
				"app.kubernetes.io/part-of":      "rhods-dashboard",
				"deployment":                     "rhods-dashboard",
			},
			wantDeleted: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := testScheme(t)

			existingDep := &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "rhods-dashboard",
					Namespace: testNamespace,
				},
				Spec: appsv1.DeploymentSpec{
					Selector: &metav1.LabelSelector{
						MatchLabels: tt.existingSelector,
					},
					Template: corev1PodTemplateSpec(tt.existingSelector),
				},
			}

			cli := fake.NewClientBuilder().
				WithScheme(s).
				WithObjects(existingDep).
				Build()

			r := &ctrlpkg.DashboardReconciler{
				Client:                cli,
				Scheme:                s,
				ManifestsBasePath:     t.TempDir(),
				Platform:              cluster.SelfManagedRhoai,
				Namespace:             testNamespace,
				ApplicationsNamespace: testNamespace,
			}

			resources := []unstructured.Unstructured{
				makeDeploymentUnstructured("rhods-dashboard", testNamespace, tt.desiredSelector),
			}

			err := r.DeleteDeploymentsWithStaleSelectorLabels(context.Background(), resources)
			require.NoError(t, err)

			dep := &appsv1.Deployment{}
			getErr := cli.Get(context.Background(), types.NamespacedName{
				Name:      "rhods-dashboard",
				Namespace: testNamespace,
			}, dep)

			if tt.wantDeleted {
				assert.Error(t, getErr, "deployment should have been deleted")
			} else {
				assert.NoError(t, getErr, "deployment should still exist")
			}
		})
	}
}

func TestDeleteDeploymentsWithStaleSelectorLabels_NoExisting(t *testing.T) {
	s := testScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		ManifestsBasePath:     t.TempDir(),
		Platform:              cluster.OpenDataHub,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	resources := []unstructured.Unstructured{
		makeDeploymentUnstructured("odh-dashboard", testNamespace, map[string]string{"app": "odh-dashboard"}),
	}

	err := r.DeleteDeploymentsWithStaleSelectorLabels(context.Background(), resources)
	require.NoError(t, err, "should succeed when no existing deployment exists")
}

func TestDeleteDeploymentsWithStaleSelectorLabels_NonDeploymentIgnored(t *testing.T) {
	s := testScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		ManifestsBasePath:     t.TempDir(),
		Platform:              cluster.OpenDataHub,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	configMap := unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "v1",
			"kind":       "ConfigMap",
			"metadata": map[string]interface{}{
				"name":      "test-config",
				"namespace": testNamespace,
			},
		},
	}

	err := r.DeleteDeploymentsWithStaleSelectorLabels(context.Background(), []unstructured.Unstructured{configMap})
	require.NoError(t, err, "non-Deployment resources should be ignored")
}

func TestDeleteDeploymentsWithStaleSelectorLabels_FallbackNamespace(t *testing.T) {
	s := testScheme(t)

	existingDep := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "odh-dashboard",
			Namespace: testNamespace,
		},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app":        "odh-dashboard",
					"stale-key":  "stale-value",
				},
			},
			Template: corev1PodTemplateSpec(map[string]string{
				"app":        "odh-dashboard",
				"stale-key":  "stale-value",
			}),
		},
	}

	cli := fake.NewClientBuilder().
		WithScheme(s).
		WithObjects(existingDep).
		Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		ManifestsBasePath:     t.TempDir(),
		Platform:              cluster.OpenDataHub,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	depNoNS := makeDeploymentUnstructured("odh-dashboard", "", map[string]string{"app": "odh-dashboard"})

	err := r.DeleteDeploymentsWithStaleSelectorLabels(context.Background(), []unstructured.Unstructured{depNoNS})
	require.NoError(t, err)

	dep := &appsv1.Deployment{}
	getErr := cli.Get(context.Background(), types.NamespacedName{
		Name:      "odh-dashboard",
		Namespace: testNamespace,
	}, dep)
	assert.Error(t, getErr, "deployment should have been deleted using fallback namespace")
}

func TestDeleteDeploymentsWithStaleSelectorLabels_MultipleDeployments(t *testing.T) {
	s := testScheme(t)

	staleDep := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "rhods-dashboard",
			Namespace: testNamespace,
		},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app":                                "rhods-dashboard",
					"app.opendatahub.io/rhods-dashboard": "true",
				},
			},
			Template: corev1PodTemplateSpec(map[string]string{
				"app":                                "rhods-dashboard",
				"app.opendatahub.io/rhods-dashboard": "true",
			}),
		},
	}

	goodDep := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "other-deployment",
			Namespace: testNamespace,
		},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": "other"},
			},
			Template: corev1PodTemplateSpec(map[string]string{"app": "other"}),
		},
	}

	cli := fake.NewClientBuilder().
		WithScheme(s).
		WithObjects(staleDep, goodDep).
		Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		ManifestsBasePath:     t.TempDir(),
		Platform:              cluster.SelfManagedRhoai,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	resources := []unstructured.Unstructured{
		makeDeploymentUnstructured("rhods-dashboard", testNamespace, map[string]string{"app": "rhods-dashboard"}),
		makeDeploymentUnstructured("other-deployment", testNamespace, map[string]string{"app": "other"}),
	}

	err := r.DeleteDeploymentsWithStaleSelectorLabels(context.Background(), resources)
	require.NoError(t, err)

	staleResult := &appsv1.Deployment{}
	assert.Error(t, cli.Get(context.Background(), types.NamespacedName{
		Name: "rhods-dashboard", Namespace: testNamespace,
	}, staleResult), "stale deployment should be deleted")

	goodResult := &appsv1.Deployment{}
	assert.NoError(t, cli.Get(context.Background(), types.NamespacedName{
		Name: "other-deployment", Namespace: testNamespace,
	}, goodResult), "matching deployment should remain")
}

func corev1PodTemplateSpec(labels map[string]string) corev1.PodTemplateSpec {
	return corev1.PodTemplateSpec{
		ObjectMeta: metav1.ObjectMeta{Labels: labels},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{{
				Name:  "dashboard",
				Image: "registry.example.com/dashboard:latest",
			}},
		},
	}
}

