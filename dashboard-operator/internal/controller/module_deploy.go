package controller

import (
	"context"
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

// --- Module proxy configuration (static data needed for federation ConfigMap) ---

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
	Enabled      bool                `json:"enabled"`
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

var moduleProxyPaths = map[string][]proxyRoute{
	"modelRegistry": {{Path: "/model-registry/api", PathRewrite: "/api"}},
	"genAi":         {{Path: "/gen-ai/api", PathRewrite: "/api"}},
	"maas":          {{Path: "/maas/api", PathRewrite: "/api"}},
	"mlflow":        {{Path: "/_bff/mlflow/api", PathRewrite: "/api"}},
	"evalHub":       {{Path: "/eval-hub/api", PathRewrite: "/api"}},
	"automl":        {{Path: "/automl/api", PathRewrite: "/api"}},
	"autorag":       {{Path: "/autorag/api", PathRewrite: "/api"}},
	"agentOps": {
		{Path: "/agent-ops/api", PathRewrite: "/api"},
		{Path: "/agent-ops/healthcheck", PathRewrite: "/healthcheck"},
	},
}

// --- Service discovery env vars (inter-BFF injection) ---

type interBFFDependency struct {
	EnvServiceName string
	EnvServicePort string
	TargetModule   string
}

var interBFFDependencies = map[string][]interBFFDependency{
	"genAi": {
		{
			EnvServiceName: "BFF_MAAS_SERVICE_NAME",
			EnvServicePort: "BFF_MAAS_SERVICE_PORT",
			TargetModule:   "maas",
		},
	},
}

// --- Platform-aware service name resolution ---

func standaloneServiceName(platform cluster.Platform, slug string) string {
	prefix := "odh-dashboard"
	if platform == cluster.SelfManagedRhoai || platform == cluster.ManagedRhoai {
		prefix = "rhods-dashboard"
	}
	return prefix + "-" + slug + "-ui"
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

		modulePath := filepath.Join(r.ManifestsBasePath, "modular-architecture", "modules", mod.ManifestSlug)

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

func addInterBFFParams(params map[string]string, moduleName string, statuses map[string]v1alpha1.ModuleStatus, platform cluster.Platform) {
	deps, ok := interBFFDependencies[moduleName]
	if !ok {
		return
	}
	for _, dep := range deps {
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

		svcName := standaloneServiceName(r.Platform, mod.ManifestSlug)
		enabled := status.Phase == v1alpha1.ModulePhaseDeployed

		entry := federationEntry{
			Name:        name,
			RemoteEntry: "/remoteEntry.js",
			Authorize:   true,
			TLS:         true,
			Enabled:     enabled,
			Proxy:       moduleProxyPaths[name],
			Service: &serviceRef{
				Name:      svcName,
				Namespace: r.ApplicationsNamespace,
				Port:      mod.Port,
			},
		}
		entries = append(entries, entry)
	}

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
			Enabled:     s.Phase == v1alpha1.ModulePhaseDeployed,
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
) error {
	fedCM, err := r.buildFederationConfigMap(statuses, dashboard)
	if err != nil {
		return fmt.Errorf("building federation ConfigMap: %w", err)
	}

	fedResources, err := configMapToUnstructured(fedCM)
	if err != nil {
		return fmt.Errorf("converting federation ConfigMap: %w", err)
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
		return fmt.Errorf("deploying federation ConfigMap: %w", err)
	}

	return nil
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
