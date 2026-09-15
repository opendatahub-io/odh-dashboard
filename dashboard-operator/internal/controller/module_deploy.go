package controller

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"os"
	"path/filepath"
	"sort"
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/deploy"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const (
	federationConfigMapName = "federation-config"
	federationConfigKey     = "module-federation-config.json"
	moduleComponentLabel    = "app.kubernetes.io/component"
)

// --- Module proxy and federation types ---

type proxyRoute struct {
	Path        string `json:"path"`
	PathRewrite string `json:"pathRewrite"`
}

type serviceRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Port      int32  `json:"port"`
}

type federationEntry struct {
	Name         string              `json:"name"`
	RemoteEntry  string              `json:"remoteEntry,omitempty"`
	Authorize    bool                `json:"authorize"`
	TLS          bool                `json:"tls"`
	Proxy        []proxyRoute        `json:"proxy,omitempty"`
	Service      *serviceRef         `json:"service,omitempty"`
	ProxyService []proxyServiceEntry `json:"proxyService,omitempty"`
}

type proxyServiceEntry struct {
	Authorize   bool       `json:"authorize"`
	Path        string     `json:"path"`
	PathRewrite string     `json:"pathRewrite"`
	TLS         bool       `json:"tls"`
	Service     serviceRef `json:"service"`
}

// --- Service discovery env vars (inter-BFF injection) ---

type interBFFDependency struct {
	EnvServiceName string
	EnvServicePort string
	TargetModule   string
}

// proxyPathsFor returns the proxy routes for a module. If the module has
// explicit ProxyPaths set, those are returned. Otherwise the standard
// convention /<slug>/api → /api is used.
func proxyPathsFor(mod ModuleDefinition) []proxyRoute {
	if mod.ProxyPaths != nil {
		return mod.ProxyPaths
	}
	return []proxyRoute{{
		Path:        "/" + mod.ManifestSlug + "/api",
		PathRewrite: "/api",
	}}
}

// moduleFederationEntry builds the common remote-module entry used by each
// federation ConfigMap. The module registry is the source of service, TLS, and
// proxy-route configuration for every consumer.
func (r *DashboardReconciler) moduleFederationEntry(name string, mod ModuleDefinition) federationEntry {
	return federationEntry{
		Name:        name,
		RemoteEntry: "/remoteEntry.js",
		Authorize:   true,
		TLS:         mod.TLS,
		Proxy:       proxyPathsFor(mod),
		Service: &serviceRef{
			Name:      standaloneServiceName(r.Platform, mod.ManifestSlug),
			Namespace: r.ApplicationsNamespace,
			Port:      mod.Port,
		},
	}
}

// coreBffPort is the port core-bff listens on within the main dashboard pod/service.
const coreBffPort = 8943

// mainDashboardServiceName returns the platform-specific name of the main
// dashboard Service that exposes the core-bff port (8943).
func mainDashboardServiceName(platform cluster.Platform) string {
	if platform == cluster.SelfManagedRhoai || platform == cluster.ManagedRhoai {
		return "rhods-dashboard"
	}
	return "odh-dashboard"
}

// --- Platform-aware service name resolution ---

// standaloneServiceName returns the Kubernetes Service name for a standalone module pod.
// Module manifests (manifests/modules/*/service.yaml) always use the odh-dashboard- prefix
// regardless of platform, so we do the same here for consistency.
func standaloneServiceName(_ cluster.Platform, slug string) string {
	return "odh-dashboard-" + slug + "-ui"
}

func mainDashboardDeploymentName(platform cluster.Platform) string {
	if platform == cluster.SelfManagedRhoai || platform == cluster.ManagedRhoai {
		return "rhods-dashboard"
	}
	return "odh-dashboard"
}

// --- Federation config hash for rolling restart ---

const federationHashAnnotation = "dashboard.opendatahub.io/federation-config-hash"

func computeFederationConfigHash(data string) string {
	h := sha256.Sum256([]byte(data))
	return hex.EncodeToString(h[:])
}

func (r *DashboardReconciler) patchDeploymentFederationHash(
	ctx context.Context,
	configData string,
) error {
	hash := computeFederationConfigHash(configData)

	deployName := mainDashboardDeploymentName(r.Platform)
	var deploy appsv1.Deployment
	key := client.ObjectKey{Name: deployName, Namespace: r.ApplicationsNamespace}
	if err := r.Get(ctx, key, &deploy); err != nil {
		if apierrors.IsNotFound(err) {
			log.FromContext(ctx).Info("Dashboard deployment not found, skipping federation hash patch", "deployment", deployName)
			return nil
		}
		return fmt.Errorf("getting deployment %s: %w", deployName, err)
	}

	current := ""
	if deploy.Spec.Template.Annotations != nil {
		current = deploy.Spec.Template.Annotations[federationHashAnnotation]
	}
	if current == hash {
		return nil
	}

	patch := client.MergeFrom(deploy.DeepCopy())
	if deploy.Spec.Template.Annotations == nil {
		deploy.Spec.Template.Annotations = map[string]string{}
	}
	deploy.Spec.Template.Annotations[federationHashAnnotation] = hash

	if err := r.Patch(ctx, &deploy, patch); err != nil {
		return fmt.Errorf("patching deployment %s with federation hash: %w", deployName, err)
	}

	log.FromContext(ctx).Info("Patched federation config hash on deployment",
		"deployment", deployName, "hash", hash)
	return nil
}

// --- Deploy individual module manifests ---

func (r *DashboardReconciler) deployModuleManifests(
	ctx context.Context,
	dashboard *v1alpha1.Dashboard,
	statuses map[string]v1alpha1.ModuleStatus,
) error {
	logger := log.FromContext(ctx)

	computed := computeKustomizeVariables(dashboard, r.Platform)
	maps.Copy(computed, resolveImageParams())

	for name, mod := range moduleRegistry {
		status := statuses[name]
		if status.Phase != v1alpha1.ModulePhaseDeployed {
			continue
		}

		modulePath := filepath.Join(r.ManifestsBasePath, "modules", mod.ManifestSlug)

		if _, err := os.Stat(modulePath); os.IsNotExist(err) {
			logger.Info("Module manifest directory not found, skipping standalone deployment", "module", name, "path", modulePath)
			continue
		}

		params := readExistingParams(filepath.Join(modulePath, "params.env"))
		maps.Copy(params, computed)
		addInterBFFParams(params, name, statuses, r.Platform)
		if err := writeParamsEnv(modulePath, params); err != nil {
			return fmt.Errorf("failed to write params.env for module %s: %w", name, err)
		}

		engine := kustomize.NewEngine()
		rendered, err := engine.Render(modulePath, kustomize.WithNamespace(r.ApplicationsNamespace))
		if err != nil {
			logger.Error(err, "Failed to render module manifests", "module", name)
			return fmt.Errorf("failed to render manifests for module %s: %w", name, err)
		}

		deployer := deploy.NewDeployer(
			deploy.WithFieldOwner("dashboard-operator"),
			deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
			deploy.WithLabel(moduleComponentLabel, mod.ManifestSlug),
			deploy.WithApplyOrder(),
			deploy.WithMergeStrategy(deploymentGVK, deploy.MergeDeployments),
		)

		if err := deployer.Deploy(ctx, deploy.DeployInput{
			Client:    r.Client,
			Owner:     dashboard,
			Release:   deploy.ReleaseInfo{Type: string(r.Platform)},
			Resources: rendered,
		}); err != nil {
			return fmt.Errorf("failed to deploy module %s: %w", name, err)
		}

		logger.Info("Deployed module", "module", name, "slug", mod.ManifestSlug)
	}

	return nil
}

// --- Delete disabled module resources ---

func (r *DashboardReconciler) deleteModuleResources(
	ctx context.Context,
	statuses map[string]v1alpha1.ModuleStatus,
) error {
	logger := log.FromContext(ctx)
	var errs []error

	for name, mod := range moduleRegistry {
		status := statuses[name]
		if status.Phase == v1alpha1.ModulePhaseDeployed || status.Phase == v1alpha1.ModulePhaseDegraded {
			continue
		}

		matchLabels := client.MatchingLabels{
			labels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind),
			moduleComponentLabel:  mod.ManifestSlug,
		}
		inNamespace := client.InNamespace(r.ApplicationsNamespace)

		deleted := false

		var deployments appsv1.DeploymentList
		if err := r.List(ctx, &deployments, matchLabels, inNamespace); err != nil {
			errs = append(errs, fmt.Errorf("listing deployments for module %s: %w", name, err))
		} else {
			for i := range deployments.Items {
				if err := r.Delete(ctx, &deployments.Items[i]); client.IgnoreNotFound(err) != nil {
					errs = append(errs, fmt.Errorf("deleting deployment for module %s: %w", name, err))
				} else {
					deleted = true
				}
			}
		}

		var configMaps corev1.ConfigMapList
		if err := r.List(ctx, &configMaps, matchLabels, inNamespace); err != nil {
			errs = append(errs, fmt.Errorf("listing configmaps for module %s: %w", name, err))
		} else {
			for i := range configMaps.Items {
				if err := r.Delete(ctx, &configMaps.Items[i]); client.IgnoreNotFound(err) != nil {
					errs = append(errs, fmt.Errorf("deleting configmap for module %s: %w", name, err))
				} else {
					deleted = true
				}
			}
		}

		var services corev1.ServiceList
		if err := r.List(ctx, &services, matchLabels, inNamespace); err != nil {
			errs = append(errs, fmt.Errorf("listing services for module %s: %w", name, err))
		} else {
			for i := range services.Items {
				if err := r.Delete(ctx, &services.Items[i]); client.IgnoreNotFound(err) != nil {
					errs = append(errs, fmt.Errorf("deleting service for module %s: %w", name, err))
				} else {
					deleted = true
				}
			}
		}

		var serviceAccounts corev1.ServiceAccountList
		if err := r.List(ctx, &serviceAccounts, matchLabels, inNamespace); err != nil {
			errs = append(errs, fmt.Errorf("listing serviceaccounts for module %s: %w", name, err))
		} else {
			for i := range serviceAccounts.Items {
				if err := r.Delete(ctx, &serviceAccounts.Items[i]); client.IgnoreNotFound(err) != nil {
					errs = append(errs, fmt.Errorf("deleting serviceaccount for module %s: %w", name, err))
				} else {
					deleted = true
				}
			}
		}

		var netpols networkingv1.NetworkPolicyList
		if err := r.List(ctx, &netpols, matchLabels, inNamespace); err != nil {
			errs = append(errs, fmt.Errorf("listing networkpolicies for module %s: %w", name, err))
		} else {
			for i := range netpols.Items {
				if err := r.Delete(ctx, &netpols.Items[i]); client.IgnoreNotFound(err) != nil {
					errs = append(errs, fmt.Errorf("deleting networkpolicy for module %s: %w", name, err))
				} else {
					deleted = true
				}
			}
		}

		var clusterRoles rbacv1.ClusterRoleList
		if err := r.List(ctx, &clusterRoles, matchLabels); err != nil {
			errs = append(errs, fmt.Errorf("listing clusterroles for module %s: %w", name, err))
		} else {
			for i := range clusterRoles.Items {
				if err := r.Delete(ctx, &clusterRoles.Items[i]); client.IgnoreNotFound(err) != nil {
					errs = append(errs, fmt.Errorf("deleting clusterrole for module %s: %w", name, err))
				} else {
					deleted = true
				}
			}
		}

		var clusterRoleBindings rbacv1.ClusterRoleBindingList
		if err := r.List(ctx, &clusterRoleBindings, matchLabels); err != nil {
			errs = append(errs, fmt.Errorf("listing clusterrolebindings for module %s: %w", name, err))
		} else {
			for i := range clusterRoleBindings.Items {
				if err := r.Delete(ctx, &clusterRoleBindings.Items[i]); client.IgnoreNotFound(err) != nil {
					errs = append(errs, fmt.Errorf("deleting clusterrolebinding for module %s: %w", name, err))
				} else {
					deleted = true
				}
			}
		}

		if deleted {
			logger.Info("Cleaned up resources for disabled module", "module", name)
		}
	}

	return errors.Join(errs...)
}

// --- Inter-BFF env var params ---

// addInterBFFParams writes each inter-BFF dependency's service coordinates into the
// module's params.env (rendered into that module's generated <slug>-params ConfigMap).
//
// These BFF_*_SERVICE_NAME/PORT keys are operator-owned: the operator adds them only when
// the target module is deployed and clears them when it is not, so their presence in the
// ConfigMap is not stable across reconciles. A consuming module MUST therefore:
//   - NOT ship static defaults for these keys in its own params.env (the operator overwrites
//     or deletes them), and
//   - consume them at runtime via envFrom on the generated <slug>-params ConfigMap, NOT via a
//     build-time kustomize `replacement` sourcing one of these keys — a replacement referencing
//     a key that has been cleared (dependency disabled) fails manifest rendering.
//
// gen-ai, the only current consumer, still hardcodes the maas coordinates in its Deployment, so
// these keys are inert for it today; keeping the write/clear logic correct means the ConfigMap is
// right whenever a module starts consuming it via envFrom.
func addInterBFFParams(params map[string]string, moduleName string, statuses map[string]v1alpha1.ModuleStatus, platform cluster.Platform) {
	mod := moduleRegistry[moduleName]
	if mod.InterBFFDeps == nil {
		return
	}
	for _, dep := range mod.InterBFFDeps {
		// Clear any previously written coordinates first. params.env persists across
		// reconciles, so a dependency that is no longer deployed must not leave stale
		// service coordinates behind.
		delete(params, dep.EnvServiceName)
		delete(params, dep.EnvServicePort)

		targetMod, ok := moduleRegistry[dep.TargetModule]
		if !ok {
			continue
		}
		ts := statuses[dep.TargetModule]
		if ts.Phase != v1alpha1.ModulePhaseDeployed && ts.Phase != v1alpha1.ModulePhaseDegraded {
			continue
		}
		svcName := standaloneServiceName(platform, targetMod.ManifestSlug)
		params[dep.EnvServiceName] = svcName
		params[dep.EnvServicePort] = fmt.Sprintf("%d", targetMod.Port)
	}
}

// --- Build dynamic federation ConfigMap ---

func (r *DashboardReconciler) buildFederationConfigMap(
	statuses map[string]v1alpha1.ModuleStatus,
	dashboard *v1alpha1.Dashboard,
) (*corev1.ConfigMap, error) {
	var entries []federationEntry

	for name, mod := range moduleRegistry {
		status := statuses[name]
		if status.Phase != v1alpha1.ModulePhaseDeployed && status.Phase != v1alpha1.ModulePhaseDegraded {
			continue
		}

		entries = append(entries, r.moduleFederationEntry(name, mod))
	}

	// Add coreBff entry — core-bff is always present when the dashboard is deployed
	// (it is a core container in the main pod, not a module). The Fastify backend
	// uses this proxyService entry to route /core-bff/api/* requests to port 8943.
	entries = append(entries, federationEntry{
		Name: "coreBff",
		ProxyService: []proxyServiceEntry{{
			Authorize:   true,
			Path:        "/core-bff/api",
			PathRewrite: "/api",
			TLS:         true,
			Service: serviceRef{
				Name:      mainDashboardServiceName(r.Platform),
				Namespace: r.ApplicationsNamespace,
				Port:      coreBffPort,
			},
		}},
	})

	// Add perses entry if observability is enabled
	if dashboard.Spec.Observability != nil && dashboard.Spec.Observability.Enabled &&
		dashboard.Spec.Observability.PersesService != nil {
		ps := dashboard.Spec.Observability.PersesService
		entries = append(entries, federationEntry{
			Name: "perses",
			ProxyService: []proxyServiceEntry{{
				Authorize:   true,
				Path:        "/perses/api",
				PathRewrite: "",
				TLS:         false,
				Service: serviceRef{
					Name:      ps.Name,
					Namespace: ps.Namespace,
					Port:      ps.Port,
				},
			}},
		})
	}

	// Add mlflowEmbedded entry if mlflow is deployed
	if s, ok := statuses["mlflow"]; ok && (s.Phase == v1alpha1.ModulePhaseDeployed || s.Phase == v1alpha1.ModulePhaseDegraded) {
		entries = append(entries, federationEntry{
			Name:        "mlflowEmbedded",
			RemoteEntry: "/mlflow/static-files/federated/remoteEntry.js",
			Authorize:   true,
			TLS:         true,
			Service: &serviceRef{
				Name:      "mlflow",
				Namespace: r.ApplicationsNamespace,
				Port:      8443,
			},
		})
	}

	// Sort entries by name for deterministic output
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name < entries[j].Name
	})

	data, err := json.MarshalIndent(entries, "    ", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal federation config: %w", err)
	}

	cm := &corev1.ConfigMap{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "ConfigMap",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      federationConfigMapName,
			Namespace: r.ApplicationsNamespace,
		},
		Data: map[string]string{
			federationConfigKey: string(data),
		},
	}

	return cm, nil
}

// --- Standalone readiness overlay ---

func (r *DashboardReconciler) overlayStandaloneReadiness(
	ctx context.Context,
	statuses map[string]v1alpha1.ModuleStatus,
) {
	now := metav1.Now()

	for name, mod := range moduleRegistry {
		s, ok := statuses[name]
		if !ok || s.Phase != v1alpha1.ModulePhaseDeployed {
			continue
		}

		var deployList appsv1.DeploymentList
		if err := r.List(ctx, &deployList,
			client.InNamespace(r.ApplicationsNamespace),
			client.MatchingLabels{
				labels.PlatformPartOf: strings.ToLower(v1alpha1.DashboardKind),
				moduleComponentLabel:  mod.ManifestSlug,
			},
		); err != nil {
			statuses[name] = v1alpha1.ModuleStatus{
				Phase:              v1alpha1.ModulePhaseDegraded,
				Reason:             "ListFailed",
				Message:            fmt.Sprintf("Failed to list deployments for module %s: %v", name, err),
				LastTransitionTime: now,
			}
			continue
		}

		if len(deployList.Items) == 0 {
			statuses[name] = v1alpha1.ModuleStatus{
				Phase:              v1alpha1.ModulePhaseNotDeployed,
				Reason:             "DeploymentNotFound",
				Message:            fmt.Sprintf("No Deployment found for module %s", name),
				LastTransitionTime: now,
			}
			continue
		}

		for _, dep := range deployList.Items {
			desired := int32(1)
			if dep.Spec.Replicas != nil {
				desired = *dep.Spec.Replicas
			}

			if dep.Status.ReadyReplicas < desired {
				reason := "ReplicasNotReady"
				msg := fmt.Sprintf("Module %s: %d/%d replicas ready", name, dep.Status.ReadyReplicas, desired)

				for _, cond := range dep.Status.Conditions {
					if cond.Type == appsv1.DeploymentAvailable && cond.Status != "True" {
						reason = cond.Reason
						msg = cond.Message
						break
					}
				}

				statuses[name] = v1alpha1.ModuleStatus{
					Phase:              v1alpha1.ModulePhaseDegraded,
					Reason:             reason,
					Message:            msg,
					LastTransitionTime: now,
				}
				break
			}
		}
	}
}

// --- Deploy federation ConfigMap ---

func (r *DashboardReconciler) deployFederationConfigMap(
	ctx context.Context,
	statuses map[string]v1alpha1.ModuleStatus,
	dashboard *v1alpha1.Dashboard,
) (string, error) {
	fedCM, err := r.buildFederationConfigMap(statuses, dashboard)
	if err != nil {
		return "", fmt.Errorf("building federation ConfigMap: %w", err)
	}

	fedResources, err := configMapToUnstructured(fedCM)
	if err != nil {
		return "", fmt.Errorf("converting federation ConfigMap: %w", err)
	}

	fedDeployer := deploy.NewDeployer(
		deploy.WithFieldOwner("dashboard-operator"),
		deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
	)

	if err := fedDeployer.Deploy(ctx, deploy.DeployInput{
		Client:    r.Client,
		Owner:     dashboard,
		Release:   deploy.ReleaseInfo{Type: string(r.Platform)},
		Resources: []unstructured.Unstructured{fedResources},
	}); err != nil {
		return "", fmt.Errorf("deploying federation ConfigMap: %w", err)
	}

	return fedCM.Data[federationConfigKey], nil
}

// reconcileModuleDemand deploys and removes shared BFFs based on both operand
// lifecycles. Shared modules retain the dashboard ownership label because they
// are common dependencies rather than resources owned by a single operand.
func (r *DashboardReconciler) reconcileModuleDemand(ctx context.Context, dashboard *v1alpha1.Dashboard) (map[string]v1alpha1.ModuleStatus, error) {
	statuses := resolveModuleStatuses(&dashboard.Spec)
	// The MaaS Consumer Portal is a RHOAI-only operand. Do not let an unsupported
	// MaaS Consumer Portal request create MaaS/GenAI demand when the core dashboard is removed.
	if !maasConsumerPortalSupportedPlatform(r.Platform) && dashboard.Spec.ManagementState == "Removed" && dashboard.Spec.MaaSConsumerPortal != nil && dashboard.Spec.MaaSConsumerPortal.ManagementState == "Managed" {
		for _, name := range maasConsumerPortalRequiredModuleNames() {
			if statuses[name].Reason != "ExplicitOverride" {
				statuses[name] = v1alpha1.ModuleStatus{Phase: v1alpha1.ModulePhaseNotDeployed, Reason: "UnsupportedPlatform", Message: "MaaS Consumer Portal is supported only on RHOAI", LastTransitionTime: metav1.Now()}
			}
		}
	}
	if err := r.deployModuleManifests(ctx, dashboard, statuses); err != nil {
		return nil, err
	}
	if err := r.deleteModuleResources(ctx, statuses); err != nil {
		return nil, err
	}
	r.overlayStandaloneReadiness(ctx, statuses)
	return statuses, nil
}

// --- Helper: ConfigMap to Unstructured ---

func configMapToUnstructured(cm *corev1.ConfigMap) (unstructured.Unstructured, error) {
	data, err := json.Marshal(cm)
	if err != nil {
		return unstructured.Unstructured{}, fmt.Errorf("failed to marshal ConfigMap: %w", err)
	}
	var obj map[string]interface{}
	if err := json.Unmarshal(data, &obj); err != nil {
		return unstructured.Unstructured{}, fmt.Errorf("failed to unmarshal ConfigMap: %w", err)
	}
	return unstructured.Unstructured{Object: obj}, nil
}
