package controller_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

func TestComputeFederationConfigHash_Deterministic(t *testing.T) {
	input := `[{"name":"genAi","remoteEntry":"/remoteEntry.js"}]`
	h1 := ctrlpkg.ComputeFederationConfigHash(input)
	h2 := ctrlpkg.ComputeFederationConfigHash(input)
	assert.Equal(t, h1, h2, "same input must produce identical hash")
	assert.Len(t, h1, 64, "SHA256 hex digest must be 64 characters")
}

func TestComputeFederationConfigHash_DifferentInputs(t *testing.T) {
	h1 := ctrlpkg.ComputeFederationConfigHash(`[{"name":"genAi"}]`)
	h2 := ctrlpkg.ComputeFederationConfigHash(`[{"name":"maas"}]`)
	assert.NotEqual(t, h1, h2, "different inputs must produce different hashes")
}

func TestMainDashboardDeploymentName(t *testing.T) {
	tests := []struct {
		name     string
		platform cluster.Platform
		want     string
	}{
		{name: "OpenDataHub", platform: cluster.OpenDataHub, want: "odh-dashboard"},
		{name: "SelfManagedRhoai", platform: cluster.SelfManagedRhoai, want: "rhods-dashboard"},
		{name: "ManagedRhoai", platform: cluster.ManagedRhoai, want: "rhods-dashboard"},
		{name: "XKS falls back to ODH", platform: cluster.XKS, want: "odh-dashboard"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ctrlpkg.MainDashboardDeploymentName(tt.platform)
			assert.Equal(t, tt.want, got)
		})
	}
}

func allDeployedStatuses() map[string]v1alpha1.ModuleStatus {
	statuses := make(map[string]v1alpha1.ModuleStatus)
	for _, name := range ctrlpkg.ModuleNames() {
		statuses[name] = v1alpha1.ModuleStatus{
			Phase:              v1alpha1.ModulePhaseDeployed,
			Reason:             "Deployed",
			LastTransitionTime: metav1.Now(),
		}
	}
	return statuses
}

func TestBuildFederationConfigMap_ExcludesDisabledModules(t *testing.T) {
	s := testScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		Platform:              cluster.OpenDataHub,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	statuses := allDeployedStatuses()
	statuses["genAi"] = v1alpha1.ModuleStatus{
		Phase:  v1alpha1.ModulePhaseDisabled,
		Reason: "ExplicitOverride",
	}
	statuses["maas"] = v1alpha1.ModuleStatus{
		Phase:  v1alpha1.ModulePhaseNotDeployed,
		Reason: "ComponentNotAvailable",
	}

	cm, err := ctrlpkg.BuildFederationConfigMap(r, statuses, &v1alpha1.Dashboard{})
	require.NoError(t, err)

	data := cm.Data["module-federation-config.json"]
	assert.NotContains(t, data, `"genAi"`, "disabled module must be excluded")
	assert.NotContains(t, data, `"maas"`, "not-deployed module must be excluded")
	assert.Contains(t, data, `"modelRegistry"`, "deployed module must be included")
}

func TestBuildFederationConfigMap_NoEnabledField(t *testing.T) {
	s := testScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		Platform:              cluster.OpenDataHub,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	statuses := allDeployedStatuses()
	cm, err := ctrlpkg.BuildFederationConfigMap(r, statuses, &v1alpha1.Dashboard{})
	require.NoError(t, err)

	data := cm.Data["module-federation-config.json"]

	var entries []map[string]interface{}
	require.NoError(t, json.Unmarshal([]byte(data), &entries))
	for _, entry := range entries {
		_, hasEnabled := entry["enabled"]
		assert.False(t, hasEnabled, "entry %q must not have 'enabled' field", entry["name"])
	}
}

func TestPatchDeploymentFederationHash_CreatesAnnotation(t *testing.T) {
	s := testScheme(t)

	deploy := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "odh-dashboard",
			Namespace: testNamespace,
		},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": "dashboard"},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{"app": "dashboard"},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{Name: "dashboard", Image: "test:latest"}},
				},
			},
		},
	}

	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(deploy).Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		Platform:              cluster.OpenDataHub,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	configData := `[{"name":"genAi"}]`
	err := r.PatchDeploymentFederationHash(context.Background(), configData)
	require.NoError(t, err)

	var updated appsv1.Deployment
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: "odh-dashboard", Namespace: testNamespace}, &updated))

	hash := updated.Spec.Template.Annotations["dashboard.opendatahub.io/federation-config-hash"]
	assert.NotEmpty(t, hash, "annotation must be set")
	assert.Len(t, hash, 64, "must be a SHA256 hex digest")
}

func TestPatchDeploymentFederationHash_NoOpWhenUnchanged(t *testing.T) {
	s := testScheme(t)

	configData := `[{"name":"genAi"}]`
	expectedHash := ctrlpkg.ComputeFederationConfigHash(configData)

	deploy := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "odh-dashboard",
			Namespace: testNamespace,
		},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": "dashboard"},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{"app": "dashboard"},
					Annotations: map[string]string{
						"dashboard.opendatahub.io/federation-config-hash": expectedHash,
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{Name: "dashboard", Image: "test:latest"}},
				},
			},
		},
	}

	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(deploy).Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		Platform:              cluster.OpenDataHub,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	err := r.PatchDeploymentFederationHash(context.Background(), configData)
	require.NoError(t, err)

	var updated appsv1.Deployment
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: "odh-dashboard", Namespace: testNamespace}, &updated))
	assert.Equal(t, expectedHash, updated.Spec.Template.Annotations["dashboard.opendatahub.io/federation-config-hash"])
}

func TestPatchDeploymentFederationHash_UpdatesOnChange(t *testing.T) {
	s := testScheme(t)

	oldHash := strings.Repeat("a", 64)

	deploy := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "odh-dashboard",
			Namespace: testNamespace,
		},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": "dashboard"},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{"app": "dashboard"},
					Annotations: map[string]string{
						"dashboard.opendatahub.io/federation-config-hash": oldHash,
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{Name: "dashboard", Image: "test:latest"}},
				},
			},
		},
	}

	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(deploy).Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		Platform:              cluster.OpenDataHub,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	newConfigData := `[{"name":"genAi"},{"name":"maas"}]`
	err := r.PatchDeploymentFederationHash(context.Background(), newConfigData)
	require.NoError(t, err)

	var updated appsv1.Deployment
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{Name: "odh-dashboard", Namespace: testNamespace}, &updated))

	newHash := updated.Spec.Template.Annotations["dashboard.opendatahub.io/federation-config-hash"]
	assert.NotEqual(t, oldHash, newHash, "hash must be updated")
	assert.Equal(t, ctrlpkg.ComputeFederationConfigHash(newConfigData), newHash)
}
