package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const maasConsumerPortalFederationConfigMapName = "maas-consumer-portal-federation-config"

const maasConsumerPortalFederationHashAnnotation = "dashboard.opendatahub.io/maas-consumer-portal-federation-config-hash"

// modulePresent means a module's deployed resources remain usable for lifecycle
// and federation purposes. A degraded module is present but not healthy.
func modulePresent(phase v1alpha1.ModulePhase) bool {
	return phase == v1alpha1.ModulePhaseDeployed || phase == v1alpha1.ModulePhaseDegraded
}

func moduleHealthy(phase v1alpha1.ModulePhase) bool {
	return phase == v1alpha1.ModulePhaseDeployed
}

func maasConsumerPortalRequiredModuleNames() []string {
	names := make([]string, 0, len(moduleRegistry))
	for name, module := range moduleRegistry {
		if module.RequiredByMaaSConsumerPortal {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	return names
}

func maasConsumerPortalRequiredModuleSlugs(spec *v1alpha1.DashboardSpec, statuses map[string]v1alpha1.ModuleStatus) map[string]bool {
	requiredModules := make(map[string]bool)
	if spec.MaaSConsumerPortal == nil || spec.MaaSConsumerPortal.ManagementState != "Managed" {
		return requiredModules
	}

	for _, name := range maasConsumerPortalRequiredModuleNames() {
		module := moduleRegistry[name]
		status := statuses[name]
		if modulePresent(status.Phase) {
			requiredModules[module.ManifestSlug] = true
		}
	}
	return requiredModules
}

// patchMaaSConsumerPortalDeploymentFederationHash triggers a rollout only when
// the MaaS Consumer Portal remote configuration changes. An absent portal
// Deployment is expected while its bundle has not yet been applied.
func (r *DashboardReconciler) patchMaaSConsumerPortalDeploymentFederationHash(ctx context.Context, configData string) error {
	var deployment appsv1.Deployment
	key := client.ObjectKey{Name: maasConsumerPortalDeploymentName, Namespace: r.ApplicationsNamespace}
	if err := r.Get(ctx, key, &deployment); err != nil {
		if apierrors.IsNotFound(err) {
			return nil
		}
		return fmt.Errorf("getting MaaS Consumer Portal deployment: %w", err)
	}

	hash := computeFederationConfigHash(configData)
	if deployment.Spec.Template.Annotations != nil &&
		deployment.Spec.Template.Annotations[maasConsumerPortalFederationHashAnnotation] == hash {
		return nil
	}
	patch := client.MergeFrom(deployment.DeepCopy())
	if deployment.Spec.Template.Annotations == nil {
		deployment.Spec.Template.Annotations = map[string]string{}
	}
	deployment.Spec.Template.Annotations[maasConsumerPortalFederationHashAnnotation] = hash
	if err := r.Patch(ctx, &deployment, patch); err != nil {
		return fmt.Errorf("patching MaaS Consumer Portal deployment with federation hash: %w", err)
	}
	return nil
}

// buildMaaSConsumerPortalFederationConfigMap contains only services required by the
// standalone MaaS Consumer Portal. The proxy paths are registry-owned; portal-specific
// ingress rewriting remains outside aggregate module orchestration.
func (r *DashboardReconciler) buildMaaSConsumerPortalFederationConfigMap(
	statuses map[string]v1alpha1.ModuleStatus,
) (*corev1.ConfigMap, error) {
	entries := make([]federationEntry, 0, 2)
	for _, name := range maasConsumerPortalRequiredModuleNames() {
		mod := moduleRegistry[name]
		status := statuses[name]
		if !modulePresent(status.Phase) {
			continue
		}
		entries = append(entries, r.moduleFederationEntry(name, mod))
	}
	data, err := json.MarshalIndent(entries, "    ", "  ")
	if err != nil {
		return nil, fmt.Errorf("marshalling MaaS Consumer Portal federation config: %w", err)
	}
	return &corev1.ConfigMap{
		TypeMeta: metav1.TypeMeta{APIVersion: "v1", Kind: "ConfigMap"},
		ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalFederationConfigMapName, Namespace: r.ApplicationsNamespace,
			Labels: map[string]string{labels.PlatformPartOf: maasConsumerPortalPartOf,
				"app.kubernetes.io/part-of": maasConsumerPortalPartOf, moduleComponentLabel: maasConsumerPortalPartOf}},
		Data: map[string]string{federationConfigKey: string(data)},
	}, nil
}

func (r *DashboardReconciler) deployMaaSConsumerPortalFederationConfigMap(ctx context.Context, dashboard *v1alpha1.Dashboard, statuses map[string]v1alpha1.ModuleStatus) error {
	if dashboard.Spec.MaaSConsumerPortal == nil || dashboard.Spec.MaaSConsumerPortal.ManagementState != "Managed" || !maasConsumerPortalSupportedPlatform(r.Platform) {
		configMap := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalFederationConfigMapName, Namespace: r.ApplicationsNamespace}}
		if err := r.Delete(ctx, configMap); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting MaaS Consumer Portal federation ConfigMap: %w", err)
		}
		return nil
	}
	configMap, err := r.buildMaaSConsumerPortalFederationConfigMap(statuses)
	if err != nil {
		return err
	}
	resource, err := configMapToUnstructured(configMap)
	if err != nil {
		return fmt.Errorf("converting MaaS Consumer Portal federation ConfigMap: %w", err)
	}
	deployer := deploy.NewDeployer(deploy.WithFieldOwner("dashboard-operator"),
		deploy.WithLabel(labels.PlatformPartOf, maasConsumerPortalPartOf),
		deploy.WithLabel("app.kubernetes.io/part-of", maasConsumerPortalPartOf),
		deploy.WithLabel(moduleComponentLabel, maasConsumerPortalPartOf))
	if err := deployer.Deploy(ctx, deploy.DeployInput{Client: r.Client, Owner: dashboard,
		Release: deploy.ReleaseInfo{Type: string(r.Platform)}, Resources: []unstructured.Unstructured{resource}}); err != nil {
		return fmt.Errorf("deploying MaaS Consumer Portal federation ConfigMap: %w", err)
	}
	return nil
}
