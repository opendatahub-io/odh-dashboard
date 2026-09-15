package controller_test

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

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

func TestReconcileModuleDemand_WhenNeitherOperandRequiresModules(t *testing.T) {
	scheme := testScheme(t)
	reconciler := &ctrlpkg.DashboardReconciler{
		Client:                fake.NewClientBuilder().WithScheme(scheme).Build(),
		Scheme:                scheme,
		ManifestsBasePath:     t.TempDir(),
		Platform:              cluster.OpenDataHub,
		ApplicationsNamespace: testNamespace,
	}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{
		ManagementSpec:     common.ManagementSpec{ManagementState: "Removed"},
		MaaSConsumerPortal: &v1alpha1.MaaSConsumerPortalSpec{ManagementState: "Removed"},
	}}

	statuses, err := reconciler.ReconcileModuleDemand(context.Background(), dashboard)
	require.NoError(t, err)
	for module, status := range statuses {
		assert.Equalf(t, v1alpha1.ModulePhaseNotDeployed, status.Phase, "%s should not be deployed", module)
		assert.Equalf(t, "NotRequired", status.Reason, "%s should be marked not required", module)
	}
}

func TestReconcileModuleDemand_ExplicitDisableRemovesExistingResources(t *testing.T) {
	scheme := testScheme(t)
	resourceLabels := map[string]string{labels.PlatformPartOf: "dashboard", "app.kubernetes.io/component": "maas"}
	deployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "maas-ui", Namespace: testNamespace, Labels: resourceLabels}}
	service := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "maas-ui", Namespace: testNamespace, Labels: resourceLabels}}
	reconciler := &ctrlpkg.DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(scheme).WithObjects(deployment, service).Build(), Scheme: scheme, ManifestsBasePath: t.TempDir(), Platform: cluster.OpenDataHub, ApplicationsNamespace: testNamespace}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{Modules: map[string]v1alpha1.ModuleOverride{"maas": {State: v1alpha1.ModuleDisabled}}}}

	statuses, err := reconciler.ReconcileModuleDemand(context.Background(), dashboard)
	require.NoError(t, err)
	assert.Equal(t, v1alpha1.ModulePhaseDisabled, statuses["maas"].Phase)
	assert.Equal(t, "ExplicitOverride", statuses["maas"].Reason)
	assert.Error(t, reconciler.Get(context.Background(), types.NamespacedName{Name: "maas-ui", Namespace: testNamespace}, &appsv1.Deployment{}))
	assert.Error(t, reconciler.Get(context.Background(), types.NamespacedName{Name: "maas-ui", Namespace: testNamespace}, &corev1.Service{}))
}

func TestReconcileModuleDemand_ReturnsCleanupError(t *testing.T) {
	scheme := testScheme(t)
	resourceLabels := map[string]string{labels.PlatformPartOf: "dashboard", "app.kubernetes.io/component": "maas"}
	deployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "maas-ui", Namespace: testNamespace, Labels: resourceLabels}}
	reconciler := &ctrlpkg.DashboardReconciler{
		Client: fake.NewClientBuilder().WithScheme(scheme).WithObjects(deployment).WithInterceptorFuncs(interceptor.Funcs{
			Delete: func(context.Context, client.WithWatch, client.Object, ...client.DeleteOption) error {
				return errors.New("simulated delete failure")
			},
		}).Build(),
		Scheme: scheme, ManifestsBasePath: t.TempDir(), Platform: cluster.OpenDataHub, ApplicationsNamespace: testNamespace,
	}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{Modules: map[string]v1alpha1.ModuleOverride{"maas": {State: v1alpha1.ModuleDisabled}}}}

	statuses, err := reconciler.ReconcileModuleDemand(context.Background(), dashboard)
	assert.Nil(t, statuses)
	require.ErrorContains(t, err, "deleting deployment for module maas: simulated delete failure")
}

func TestReconcileModuleDemand_OverlaysStandaloneReadiness(t *testing.T) {
	scheme := testScheme(t)
	resourceLabels := map[string]string{labels.PlatformPartOf: "dashboard", "app.kubernetes.io/component": "maas"}
	replicas := int32(1)
	deployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "maas-ui", Namespace: testNamespace, Labels: resourceLabels}, Spec: appsv1.DeploymentSpec{Replicas: &replicas}}
	reconciler := &ctrlpkg.DashboardReconciler{Client: fake.NewClientBuilder().WithScheme(scheme).WithObjects(deployment).Build(), Scheme: scheme, ManifestsBasePath: t.TempDir(), Platform: cluster.OpenDataHub, ApplicationsNamespace: testNamespace}
	dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{Modules: map[string]v1alpha1.ModuleOverride{"modelRegistry": {State: v1alpha1.ModuleDisabled}, "genAi": {State: v1alpha1.ModuleDisabled}, "mlflow": {State: v1alpha1.ModuleDisabled}, "evalHub": {State: v1alpha1.ModuleDisabled}, "automl": {State: v1alpha1.ModuleDisabled}, "autorag": {State: v1alpha1.ModuleDisabled}, "agentOps": {State: v1alpha1.ModuleDisabled}, "notebooks": {State: v1alpha1.ModuleDisabled}}}}

	statuses, err := reconciler.ReconcileModuleDemand(context.Background(), dashboard)
	require.NoError(t, err)
	assert.Equal(t, v1alpha1.ModulePhaseDegraded, statuses["maas"].Phase)
	assert.Equal(t, "ReplicasNotReady", statuses["maas"].Reason)
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
	var entries []map[string]interface{}
	require.NoError(t, json.Unmarshal([]byte(data), &entries))

	names := make(map[string]bool)
	for _, entry := range entries {
		if name, ok := entry["name"].(string); ok {
			names[name] = true
		}
	}
	assert.False(t, names["genAi"], "disabled module must be excluded")
	assert.False(t, names["maas"], "not-deployed module must be excluded")
	assert.True(t, names["modelRegistry"], "deployed module must be included")
}

func TestBuildFederationConfigMap_TLS(t *testing.T) {
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

	expected := map[string]bool{
		"notebooks":     true,
		"modelRegistry": true,
		"genAi":         true,
		"mlflow":        true,
		"maas":          true,
		"evalHub":       true,
		"automl":        true,
		"autorag":       true,
		"agentOps":      true,
	}

	found := make(map[string]bool)
	for _, entry := range entries {
		name, _ := entry["name"].(string)
		tls, _ := entry["tls"].(bool)
		if wantTLS, ok := expected[name]; ok {
			found[name] = true
			if wantTLS {
				assert.True(t, tls, "%s must have tls=true", name)
			} else {
				assert.False(t, tls, "%s must have tls=false", name)
			}
		}
	}

	for name := range expected {
		assert.True(t, found[name], "expected module %s must be present in federation config", name)
	}
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

func TestBuildFederationConfigMap_NamespaceValues(t *testing.T) {
	s := testScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).Build()

	const appNS = "apps-ns"
	const operatorNS = "operator-ns"
	const persesNS = "observability-ns"

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		Platform:              cluster.OpenDataHub,
		Namespace:             operatorNS,
		ApplicationsNamespace: appNS,
	}

	dashboard := &v1alpha1.Dashboard{
		Spec: v1alpha1.DashboardSpec{
			Observability: &v1alpha1.ObservabilitySpec{
				Enabled: true,
				PersesService: &v1alpha1.ServiceTarget{
					Name:      "perses",
					Namespace: persesNS,
					Port:      8080,
				},
			},
		},
	}

	statuses := allDeployedStatuses()
	cm, err := ctrlpkg.BuildFederationConfigMap(r, statuses, dashboard)
	require.NoError(t, err)

	assert.Equal(t, appNS, cm.Namespace,
		"ConfigMap metadata.namespace must match ApplicationsNamespace")

	data := cm.Data["module-federation-config.json"]
	var entries []map[string]interface{}
	require.NoError(t, json.Unmarshal([]byte(data), &entries))

	seen := make(map[string]bool)
	for _, entry := range entries {
		name, _ := entry["name"].(string)
		seen[name] = true

		switch name {
		case "perses":
			proxyServices, _ := entry["proxyService"].([]interface{})
			require.NotEmpty(t, proxyServices, "perses must have proxyService entries")
			ps, _ := proxyServices[0].(map[string]interface{})
			svc, _ := ps["service"].(map[string]interface{})
			assert.Equal(t, persesNS, svc["namespace"],
				"perses must use PersesService.Namespace, not ApplicationsNamespace")

		case "coreBff":
			proxyServices, _ := entry["proxyService"].([]interface{})
			require.NotEmpty(t, proxyServices, "coreBff must have proxyService entries")
			ps, _ := proxyServices[0].(map[string]interface{})
			svc, _ := ps["service"].(map[string]interface{})
			assert.Equal(t, appNS, svc["namespace"],
				"coreBff proxyService.service.namespace must match ApplicationsNamespace")

		default:
			svc, ok := entry["service"].(map[string]interface{})
			require.Truef(t, ok, "%s must have a service entry", name)
			assert.Equalf(t, appNS, svc["namespace"],
				"%s service.namespace must match ApplicationsNamespace", name)
		}
	}
	require.True(t, seen["perses"], "perses entry must be present")
	require.True(t, seen["coreBff"], "coreBff entry must be present")
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

func TestPatchDeploymentFederationHash_DeploymentNotFound(t *testing.T) {
	s := testScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).Build()

	r := &ctrlpkg.DashboardReconciler{
		Client:                cli,
		Scheme:                s,
		Platform:              cluster.OpenDataHub,
		Namespace:             testNamespace,
		ApplicationsNamespace: testNamespace,
	}

	err := r.PatchDeploymentFederationHash(context.Background(), `[{"name":"genAi"}]`)
	require.NoError(t, err, "NotFound should be a no-op, not an error")
}

func TestDeleteModuleResources_ConfigMaps(t *testing.T) {
	tests := []struct {
		name       string
		phase      v1alpha1.ModulePhase
		wantDelete bool
	}{
		{name: "disabled module", phase: v1alpha1.ModulePhaseDisabled, wantDelete: true},
		{name: "not-deployed module", phase: v1alpha1.ModulePhaseNotDeployed, wantDelete: true},
		{name: "deployed module", phase: v1alpha1.ModulePhaseDeployed, wantDelete: false},
		{name: "degraded module", phase: v1alpha1.ModulePhaseDegraded, wantDelete: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := testScheme(t)
			moduleConfigMap := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
				Name:      "mlflow-params",
				Namespace: testNamespace,
				Labels: map[string]string{
					labels.PlatformPartOf:         "dashboard",
					"app.kubernetes.io/component": "mlflow",
				},
			}}
			coreConfigMap := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
				Name:      "dashboard-core-config",
				Namespace: testNamespace,
				Labels: map[string]string{
					labels.PlatformPartOf: "dashboard",
				},
			}}
			otherModuleConfigMap := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
				Name:      "gen-ai-params",
				Namespace: testNamespace,
				Labels: map[string]string{
					labels.PlatformPartOf:         "dashboard",
					"app.kubernetes.io/component": "gen-ai",
				},
			}}
			otherNamespaceConfigMap := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{
				Name:      "mlflow-params",
				Namespace: "other-ns",
				Labels: map[string]string{
					labels.PlatformPartOf:         "dashboard",
					"app.kubernetes.io/component": "mlflow",
				},
			}}

			cli := fake.NewClientBuilder().WithScheme(s).WithObjects(
				moduleConfigMap,
				coreConfigMap,
				otherModuleConfigMap,
				otherNamespaceConfigMap,
			).Build()
			r := &ctrlpkg.DashboardReconciler{
				Client:                cli,
				Scheme:                s,
				ApplicationsNamespace: testNamespace,
			}

			statuses := allDeployedStatuses()
			statuses["mlflow"] = v1alpha1.ModuleStatus{Phase: tt.phase}
			require.NoError(t, r.DeleteModuleResources(context.Background(), statuses))

			err := cli.Get(context.Background(), types.NamespacedName{
				Name: moduleConfigMap.Name, Namespace: moduleConfigMap.Namespace,
			}, &corev1.ConfigMap{})
			if tt.wantDelete {
				assert.True(t, apierrors.IsNotFound(err), "module ConfigMap should be deleted")
				require.NoError(t, r.DeleteModuleResources(context.Background(), statuses), "cleanup should be idempotent")
			} else {
				require.NoError(t, err, "module ConfigMap should be retained")
			}

			for _, retained := range []*corev1.ConfigMap{coreConfigMap, otherModuleConfigMap, otherNamespaceConfigMap} {
				err := cli.Get(context.Background(), types.NamespacedName{
					Name: retained.Name, Namespace: retained.Namespace,
				}, &corev1.ConfigMap{})
				require.NoErrorf(t, err, "ConfigMap %s/%s should be retained", retained.Namespace, retained.Name)
			}
		})
	}
}
