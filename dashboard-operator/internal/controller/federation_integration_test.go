//go:build integration

package controller_test

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

// allModuleSlugs lists every module's ManifestSlug — used to build a full manifest
// tree for the all-modules-enabled federation test.
var allModuleSlugs = []string{
	"model-registry", "gen-ai", "mlflow", "maas", "eval-hub",
	"automl", "autorag", "agent-ops", "notebooks",
}

// TestIntegration_AddInterBFFParams verifies the reconciler injects service-discovery
// env vars into a module's params.env for its inter-BFF dependencies: gen-ai depends
// on maas, so gen-ai's params.env must gain BFF_MAAS_SERVICE_NAME/PORT while maas —
// which has no such dependency — must not.
//
// This asserts on the operator's rendered params.env (the source the module's
// ConfigMap is generated from), not on a running pod's environment — envtest schedules
// no kubelet. It exercises the addInterBFFParams write/clear path only; whether a
// module actually consumes those keys is up to that module's kustomization. (RHOAIENG-83649)
func TestIntegration_AddInterBFFParams(t *testing.T) {
	manifests := createIntegrationManifests(t, []string{"gen-ai", "maas"})
	r := newManifestReconciler(manifests)

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept("genAi", "maas"),
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	// gen-ai depends on maas — its params.env gets the maas service coordinates.
	genAiParams := readParamsEnv(t, filepath.Join(manifests, "modules", "gen-ai", "params.env"))
	assert.Equal(t, "odh-dashboard-maas-ui", genAiParams["BFF_MAAS_SERVICE_NAME"])
	assert.Equal(t, "8243", genAiParams["BFF_MAAS_SERVICE_PORT"])

	// maas has no inter-BFF dependency — no BFF_MAAS_* keys should be written.
	maasParams := readParamsEnv(t, filepath.Join(manifests, "modules", "maas", "params.env"))
	assert.NotContains(t, maasParams, "BFF_MAAS_SERVICE_NAME")
	assert.NotContains(t, maasParams, "BFF_MAAS_SERVICE_PORT")

	// Disable maas and reconcile again. gen-ai stays deployed (it has no hard
	// dependency on maas), so its params.env is rewritten — the now-stale maas
	// service coordinates must be removed rather than lingering.
	dashboard = getDashboard(t)
	dashboard.Spec.Modules = disableAllModulesExcept("genAi")
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	genAiParams = readParamsEnv(t, filepath.Join(manifests, "modules", "gen-ai", "params.env"))
	assert.NotContains(t, genAiParams, "BFF_MAAS_SERVICE_NAME",
		"stale maas coordinates should be removed once maas is disabled")
	assert.NotContains(t, genAiParams, "BFF_MAAS_SERVICE_PORT",
		"stale maas coordinates should be removed once maas is disabled")
}

// TestIntegration_FederationConfigMap_AllModulesEnabled verifies that with all
// modules enabled (DSC gates satisfied), the federation ConfigMap lists every
// module plus the synthetic coreBff and mlflowEmbedded entries, and omits perses
// when observability is off. (RHOAIENG-83649)
func TestIntegration_FederationConfigMap_AllModulesEnabled(t *testing.T) {
	manifests := createIntegrationManifests(t, allModuleSlugs)
	r := newManifestReconciler(manifests)

	// Satisfy every module's RequiredDSCComponents so none are gated off.
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Components: map[string]v1alpha1.ComponentAvailability{
			"modelregistry":  {ManagementState: "Managed"},
			"mlflowoperator": {ManagementState: "Managed"},
			"trustyai":       {ManagementState: "Managed"},
			"aipipelines":    {ManagementState: "Managed"},
		},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	entries := parseFederationEntries(t, getConfigMap(t, "federation-config"))

	// Every registered module has a federation entry.
	for _, name := range ctrlpkg.ModuleNames() {
		assert.NotNil(t, findFederationEntry(entries, name), "module %s should be in federation config", name)
	}

	// Synthetic entries that always/conditionally accompany the modules.
	assert.NotNil(t, findFederationEntry(entries, "coreBff"), "coreBff entry should always be present")
	assert.NotNil(t, findFederationEntry(entries, "mlflowEmbedded"), "mlflowEmbedded should be present when mlflow is deployed")

	// Observability is off, so there must be no perses entry.
	assert.Nil(t, findFederationEntry(entries, "perses"), "perses should be absent when observability is disabled")
}

// TestIntegration_FederationConfigMap_HashAnnotation verifies the reconciler stamps
// the main dashboard Deployment's pod template with a federation-config hash and that
// the hash changes when the set of enabled modules changes — the mechanism that
// triggers a rolling restart when federation config drifts. (RHOAIENG-83649)
func TestIntegration_FederationConfigMap_HashAnnotation(t *testing.T) {
	manifests := createIntegrationManifests(t, []string{"model-registry"})
	r := newManifestReconciler(manifests)

	ctx := context.Background()

	// The main dashboard Deployment is not part of the minimal core manifests, so
	// pre-create it (labeled part-of=dashboard so cleanupModuleResources removes it).
	deployName := ctrlpkg.MainDashboardDeploymentName(cluster.OpenDataHub)
	mainDeploy := newMainDashboardDeployment(deployName)
	require.NoError(t, k8sClient.Create(ctx, mainDeploy))

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept("modelRegistry"),
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	hash1 := federationHashOf(t, deployName)
	require.NotEmpty(t, hash1, "federation hash annotation should be set after reconcile")

	// Disable all modules — the federation config (and thus its hash) must change.
	dashboard = getDashboard(t)
	dashboard.Spec.Modules = disableAllModulesExcept()
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	hash2 := federationHashOf(t, deployName)
	require.NotEmpty(t, hash2)
	assert.NotEqual(t, hash1, hash2, "federation hash should change when the enabled module set changes")
}

// newMainDashboardDeployment returns a minimal Deployment carrying the
// part-of=dashboard label so the reconciler can patch its federation-config hash.
func newMainDashboardDeployment(name string) *appsv1.Deployment {
	replicas := int32(1)
	labelSet := map[string]string{"app": name}

	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: integrationNamespace,
			Labels:    map[string]string{labels.PlatformPartOf: "dashboard"},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{MatchLabels: labelSet},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labelSet},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{
						Name:  name,
						Image: "registry.example.com/dashboard:latest",
					}},
				},
			},
		},
	}
}

// federationHashOf reads the federation-config hash annotation from a Deployment's
// pod template.
func federationHashOf(t *testing.T, name string) string {
	t.Helper()
	dep := &appsv1.Deployment{}
	require.NoError(t, k8sClient.Get(context.Background(), types.NamespacedName{
		Name:      name,
		Namespace: integrationNamespace,
	}, dep))

	return dep.Spec.Template.Annotations[ctrlpkg.FederationHashAnnotation]
}
