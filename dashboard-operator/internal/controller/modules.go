package controller

import (
	"fmt"
	"sort"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// ModuleDefinition describes a module's static properties.
// It is the single source of truth for module configuration — all module-specific
// data (proxy paths, image map entries, inter-BFF deps) is consolidated here
// instead of being scattered across multiple maps in different files.
// ProxyPaths nil means use the default proxy path (/<ManifestSlug>/api → /api).
type ModuleDefinition struct {
	Name                  string
	ContainerName         string
	Port                  int32
	ImageEnvVar           string
	RequiredDSCComponents []string
	// InterModuleDependencies gates deployment: module won't deploy if these aren't running.
	InterModuleDependencies []string
	ManifestSlug            string
	TLS                     bool
	ProxyPaths              []proxyRoute
	// InterBFFDeps injects service-discovery env vars into this module's container.
	InterBFFDeps []interBFFDependency
	// RequiredByMaaSConsumerPortal identifies the modules required when the
	// MaaS Consumer Portal operand is managed independently of the dashboard.
	RequiredByMaaSConsumerPortal bool
}

var moduleRegistry = map[string]ModuleDefinition{
	"modelRegistry": {
		Name:                  "modelRegistry",
		ContainerName:         "model-registry-ui",
		Port:                  8043,
		ImageEnvVar:           "RELATED_IMAGE_ODH_MOD_ARCH_MODEL_REGISTRY_IMAGE",
		ManifestSlug:          "model-registry",
		TLS:                   true,
		RequiredDSCComponents: []string{"modelregistry"},
	},
	"genAi": {
		Name:                         "genAi",
		ContainerName:                "gen-ai-ui",
		Port:                         8143,
		ImageEnvVar:                  "RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE",
		ManifestSlug:                 "gen-ai",
		TLS:                          true,
		RequiredByMaaSConsumerPortal: true,
		InterBFFDeps: []interBFFDependency{{
			EnvServiceName: "BFF_MAAS_SERVICE_NAME",
			EnvServicePort: "BFF_MAAS_SERVICE_PORT",
			TargetModule:   "maas",
		}},
	},
	"mlflow": {
		Name:                  "mlflow",
		ContainerName:         "mlflow-ui",
		Port:                  8343,
		ImageEnvVar:           "RELATED_IMAGE_ODH_MOD_ARCH_MLFLOW_IMAGE",
		ManifestSlug:          "mlflow",
		TLS:                   true,
		RequiredDSCComponents: []string{"mlflowoperator"},
		ProxyPaths:            []proxyRoute{{Path: "/_bff/mlflow/api", PathRewrite: "/api"}},
	},
	"maas": {
		Name:                         "maas",
		ContainerName:                "maas-ui",
		Port:                         8243,
		ImageEnvVar:                  "RELATED_IMAGE_ODH_MOD_ARCH_MAAS_IMAGE",
		ManifestSlug:                 "maas",
		TLS:                          true,
		RequiredByMaaSConsumerPortal: true,
	},
	"evalHub": {
		Name:                  "evalHub",
		ContainerName:         "eval-hub-ui",
		Port:                  8543,
		ImageEnvVar:           "RELATED_IMAGE_ODH_MOD_ARCH_EVAL_HUB_IMAGE",
		ManifestSlug:          "eval-hub",
		TLS:                   true,
		RequiredDSCComponents: []string{"trustyai"},
	},
	"automl": {
		Name:                  "automl",
		ContainerName:         "automl-ui",
		Port:                  8643,
		ImageEnvVar:           "RELATED_IMAGE_ODH_MOD_ARCH_AUTOML_IMAGE",
		ManifestSlug:          "automl",
		TLS:                   true,
		RequiredDSCComponents: []string{"aipipelines"},
	},
	"autorag": {
		Name:                    "autorag",
		ContainerName:           "autorag-ui",
		Port:                    8743,
		ImageEnvVar:             "RELATED_IMAGE_ODH_MOD_ARCH_AUTORAG_IMAGE",
		ManifestSlug:            "autorag",
		TLS:                     true,
		RequiredDSCComponents:   []string{"aipipelines"},
		InterModuleDependencies: []string{"genAi"},
	},
	"agentOps": {
		Name:          "agentOps",
		ContainerName: "agent-ops-ui",
		Port:          8843,
		ImageEnvVar:   "RELATED_IMAGE_ODH_MOD_ARCH_AGENT_OPS_IMAGE",
		ManifestSlug:  "agent-ops",
		TLS:           true,
		ProxyPaths: []proxyRoute{
			{Path: "/agent-ops/api", PathRewrite: "/api"},
			{Path: "/agent-ops/healthcheck", PathRewrite: "/healthcheck"},
		},
	},
	"notebooks": {
		Name:          "notebooks",
		ContainerName: "notebooks-ui",
		Port:          9043,
		ImageEnvVar:   "RELATED_IMAGE_ODH_MOD_ARCH_NOTEBOOKS_IMAGE",
		ManifestSlug:  "notebooks",
		TLS:           true,
	},
}

// resolveModuleStatuses determines the status of each module based on
// aggregate operand demand, DSC component availability, spec overrides, and
// inter-module dependencies.
// It uses a three-pass algorithm:
//
//	Pass 1: aggregate demand + DSC component gate + explicit CR overrides
//	Pass 2: Inter-module dependency resolution (transitive propagation)
//	Pass 3: Unknown module detection
func resolveModuleStatuses(spec *v1alpha1.DashboardSpec) map[string]v1alpha1.ModuleStatus {
	now := metav1.Now()
	result := make(map[string]v1alpha1.ModuleStatus, len(moduleRegistry))

	coreRequiresModules := spec.ManagementState != "Removed"
	maasConsumerPortalRequiresModules := spec.MaaSConsumerPortal != nil &&
		spec.MaaSConsumerPortal.ManagementState == "Managed"

	// Pass 1: aggregate demand + DSC component gate + explicit CR overrides
	for name, mod := range moduleRegistry {
		// Explicit user configuration takes precedence over either operand's
		// demand and must retain the ExplicitOverride status reason.
		if override, ok := spec.Modules[name]; ok && override.State == v1alpha1.ModuleDisabled {
			result[name] = v1alpha1.ModuleStatus{
				Phase:              v1alpha1.ModulePhaseDisabled,
				Reason:             "ExplicitOverride",
				Message:            "Module explicitly disabled via spec.modules override",
				LastTransitionTime: now,
			}
			continue
		}

		if !coreRequiresModules && (!maasConsumerPortalRequiresModules || !mod.RequiredByMaaSConsumerPortal) {
			result[name] = v1alpha1.ModuleStatus{
				Phase:              v1alpha1.ModulePhaseNotDeployed,
				Reason:             "NotRequired",
				Message:            "Module is not required by a managed operand",
				LastTransitionTime: now,
			}
			continue
		}

		// Check DSC component dependencies (only when Components map is non-nil)
		if len(mod.RequiredDSCComponents) > 0 && spec.Components != nil {
			disabled := false
			for _, comp := range mod.RequiredDSCComponents {
				ca, exists := spec.Components[comp]
				if !exists || (ca.ManagementState != "Managed" && ca.ManagementState != "Unmanaged") {
					result[name] = v1alpha1.ModuleStatus{
						Phase:              v1alpha1.ModulePhaseDisabled,
						Reason:             "ComponentNotAvailable",
						Message:            fmt.Sprintf("Required DSC component %q is not available", comp),
						LastTransitionTime: now,
					}
					disabled = true

					break
				}
			}

			if disabled {
				continue
			}
		}

		// Tentatively enabled
		result[name] = v1alpha1.ModuleStatus{
			Phase:              v1alpha1.ModulePhaseDeployed,
			Reason:             "Deployed",
			Message:            "Module container deployed",
			LastTransitionTime: now,
		}
	}

	// Pass 2: Inter-module dependency resolution (propagate transitively)
	changed := true
	for changed {
		changed = false

		for name, mod := range moduleRegistry {
			s := result[name]
			if s.Phase != v1alpha1.ModulePhaseDeployed {
				continue
			}

			for _, dep := range mod.InterModuleDependencies {
				depStatus, ok := result[dep]
				if !ok || depStatus.Phase == v1alpha1.ModulePhaseDisabled || depStatus.Phase == v1alpha1.ModulePhaseNotDeployed {
					result[name] = v1alpha1.ModuleStatus{
						Phase:              v1alpha1.ModulePhaseDisabled,
						Reason:             "DependencyNotMet",
						Message:            fmt.Sprintf("Required module %q is not available", dep),
						LastTransitionTime: now,
					}
					changed = true

					break
				}
			}
		}
	}

	// Pass 3: Unknown module detection
	for name := range spec.Modules {
		if _, known := moduleRegistry[name]; !known {
			result[name] = v1alpha1.ModuleStatus{
				Phase:              v1alpha1.ModulePhaseNotDeployed,
				Reason:             "UnknownModule",
				Message:            fmt.Sprintf("Module %q is not in the controller's registry (possible typo)", name),
				LastTransitionTime: now,
			}
		}
	}

	return result
}

func preserveModuleStatusTransitionTimes(previous, next map[string]v1alpha1.ModuleStatus) {
	for name, status := range next {
		if prior, ok := previous[name]; ok && prior.Phase == status.Phase && prior.Reason == status.Reason && prior.Message == status.Message {
			status.LastTransitionTime = prior.LastTransitionTime
			next[name] = status
		}
	}
}

// overlayContainerReadiness inspects the pods backing the dashboard
// Deployment and marks modules as Degraded when their container is not
// ready (e.g. ImagePullBackOff, CrashLoopBackOff).
func overlayContainerReadiness(statuses map[string]v1alpha1.ModuleStatus, pods []corev1.Pod) {
	if len(pods) == 0 {
		return
	}

	now := metav1.Now()

	containerByName := map[string]*corev1.ContainerStatus{}
	for i := range pods {
		for j := range pods[i].Status.ContainerStatuses {
			cs := &pods[i].Status.ContainerStatuses[j]
			if existing, ok := containerByName[cs.Name]; ok && !existing.Ready {
				continue
			}
			containerByName[cs.Name] = cs
		}
	}

	for name, mod := range moduleRegistry {
		s, ok := statuses[name]
		if !ok || s.Phase != v1alpha1.ModulePhaseDeployed {
			continue
		}

		cs, found := containerByName[mod.ContainerName]
		if !found {
			statuses[name] = v1alpha1.ModuleStatus{
				Phase:              v1alpha1.ModulePhaseNotDeployed,
				Reason:             "ContainerNotFound",
				Message:            fmt.Sprintf("Container %q not found in any dashboard pod", mod.ContainerName),
				LastTransitionTime: now,
			}

			continue
		}

		if cs.Ready {
			continue
		}

		msg := fmt.Sprintf("Container %q is not ready", mod.ContainerName)
		reason := "ContainerNotReady"

		if cs.State.Waiting != nil {
			reason = cs.State.Waiting.Reason
			if cs.State.Waiting.Message != "" {
				msg = cs.State.Waiting.Message
			} else {
				msg = fmt.Sprintf("Container %q is waiting: %s", mod.ContainerName, reason)
			}
		}

		statuses[name] = v1alpha1.ModuleStatus{
			Phase:              v1alpha1.ModulePhaseDegraded,
			Reason:             reason,
			Message:            msg,
			LastTransitionTime: now,
		}
	}
}

// ModuleNames returns the sorted list of module names from the registry.
func ModuleNames() []string {
	names := make([]string, 0, len(moduleRegistry))
	for name := range moduleRegistry {
		names = append(names, name)
	}

	sort.Strings(names)

	return names
}
