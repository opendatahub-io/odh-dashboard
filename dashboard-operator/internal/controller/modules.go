package controller

import (
	"fmt"
	"sort"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// ModuleType classifies how a module is deployed.
type ModuleType string

const (
	ModuleTypeBFF          ModuleType = "BFF"
	ModuleTypeEmbedded     ModuleType = "Embedded"
	ModuleTypeProxyService ModuleType = "ProxyService"
)

// ModuleDefinition describes a module's static properties.
// This is compiled into the binary and is the authoritative source of
// truth for module metadata. The CR only carries override intent and
// external dependency signals.
type ModuleDefinition struct {
	Name          string
	Type          ModuleType
	ContainerName string
	Port          int32
	ImageEnvVar   string
	// Empty means the module is always deployed (opt-in by default).
	RequiredComponents []string
	RequiredModules    []string
}

var moduleRegistry = map[string]ModuleDefinition{
	"modelRegistry": {
		Name: "modelRegistry", Type: ModuleTypeBFF,
		ContainerName: "model-registry-ui", Port: 8043,
		ImageEnvVar:        "RELATED_IMAGE_ODH_MOD_ARCH_MODEL_REGISTRY_IMAGE",
		RequiredComponents: []string{"modelregistry"},
	},
	"genAi": {
		Name: "genAi", Type: ModuleTypeBFF,
		ContainerName: "gen-ai-ui", Port: 8143,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE",
	},
	"mlflow": {
		Name: "mlflow", Type: ModuleTypeBFF,
		ContainerName: "mlflow-ui", Port: 8343,
		ImageEnvVar:        "RELATED_IMAGE_ODH_MOD_ARCH_MLFLOW_IMAGE",
		RequiredComponents: []string{"mlflowoperator"},
	},
	"mlflowEmbedded": {
		Name: "mlflowEmbedded", Type: ModuleTypeEmbedded,
		RequiredComponents: []string{"mlflowoperator"},
		RequiredModules:    []string{"mlflow"},
	},
	"maas": {
		Name: "maas", Type: ModuleTypeBFF,
		ContainerName: "maas-ui", Port: 8243,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_MAAS_IMAGE",
	},
	"evalHub": {
		Name: "evalHub", Type: ModuleTypeBFF,
		ContainerName: "eval-hub-ui", Port: 8443,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_EVAL_HUB_IMAGE",
	},
	"automl": {
		Name: "automl", Type: ModuleTypeBFF,
		ContainerName: "automl-ui", Port: 8543,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_AUTOML_IMAGE",
	},
	"autorag": {
		Name: "autorag", Type: ModuleTypeBFF,
		ContainerName: "autorag-ui", Port: 8643,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_AUTORAG_IMAGE",
	},
	"perses": {
		Name: "perses", Type: ModuleTypeProxyService,
	},
}

func isComponentAvailable(components map[string]v1alpha1.ComponentAvailability, name string) bool {
	comp, exists := components[name]
	if !exists {
		return false
	}

	return comp.ManagementState == "Managed" || comp.ManagementState == "Unmanaged"
}

// resolveModuleStatuses runs a two-pass dependency resolution algorithm
// to determine which modules should be deployed based on spec.Components,
// spec.Modules overrides, and spec.Observability.
func resolveModuleStatuses(spec *v1alpha1.DashboardSpec) map[string]v1alpha1.ModuleStatus {
	now := metav1.Now()
	result := make(map[string]v1alpha1.ModuleStatus, len(moduleRegistry))

	// Pass 1: Evaluate each module against overrides and DSC component deps.
	// Modules with inter-module deps that pass all other checks are deferred.
	pendingModuleDeps := map[string][]string{}

	for name, mod := range moduleRegistry {
		if mod.Type == ModuleTypeProxyService {
			result[name] = resolveProxyServiceModule(spec, now)
			continue
		}

		if override, ok := spec.Modules[name]; ok {
			if override.State == v1alpha1.ModuleDisabled {
				result[name] = v1alpha1.ModuleStatus{
					Phase:              v1alpha1.ModulePhaseDisabled,
					Reason:             "ExplicitOverride",
					Message:            "Module explicitly disabled via spec.modules override",
					LastTransitionTime: now,
				}

				continue
			}

			if override.State == v1alpha1.ModuleEnabled {
				if len(mod.RequiredModules) > 0 {
					pendingModuleDeps[name] = mod.RequiredModules
				} else {
					result[name] = v1alpha1.ModuleStatus{
						Phase:              v1alpha1.ModulePhaseDeployed,
						Reason:             "ExplicitOverride",
						Message:            "Module explicitly enabled via spec.modules override",
						LastTransitionTime: now,
					}
				}

				continue
			}
		}

		if missing := findMissingComponent(spec.Components, mod.RequiredComponents); missing != "" {
			result[name] = v1alpha1.ModuleStatus{
				Phase:              v1alpha1.ModulePhaseNotDeployed,
				Reason:             "ComponentNotAvailable",
				Message:            fmt.Sprintf("Required DSC component %q is not available", missing),
				LastTransitionTime: now,
			}

			continue
		}

		if len(mod.RequiredModules) > 0 {
			pendingModuleDeps[name] = mod.RequiredModules
		} else {
			result[name] = v1alpha1.ModuleStatus{
				Phase:              v1alpha1.ModulePhaseDeployed,
				Reason:             "DependenciesSatisfied",
				Message:            "All dependencies satisfied",
				LastTransitionTime: now,
			}
		}
	}

	// Pass 2: Resolve inter-module dependencies. Iterate until stable.
	for range len(moduleRegistry) {
		changed := false

		for name, deps := range pendingModuleDeps {
			allMet := true

			for _, dep := range deps {
				if s, resolved := result[dep]; resolved {
					if s.Phase != v1alpha1.ModulePhaseDeployed {
						result[name] = v1alpha1.ModuleStatus{
							Phase:              v1alpha1.ModulePhaseNotDeployed,
							Reason:             "ModuleDependencyNotSatisfied",
							Message:            fmt.Sprintf("Required module %q is not deployed", dep),
							LastTransitionTime: now,
						}
						delete(pendingModuleDeps, name)
						changed = true
						allMet = false

						break
					}
				} else {
					allMet = false

					break
				}
			}

			if allMet {
				result[name] = v1alpha1.ModuleStatus{
					Phase:              v1alpha1.ModulePhaseDeployed,
					Reason:             "DependenciesSatisfied",
					Message:            "All dependencies satisfied",
					LastTransitionTime: now,
				}
				delete(pendingModuleDeps, name)
				changed = true
			}
		}

		if !changed {
			break
		}
	}

	for name := range pendingModuleDeps {
		result[name] = v1alpha1.ModuleStatus{
			Phase:              v1alpha1.ModulePhaseNotDeployed,
			Reason:             "UnresolvableDependency",
			Message:            "Module dependencies could not be resolved (possible cycle)",
			LastTransitionTime: now,
		}
	}

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

func resolveProxyServiceModule(spec *v1alpha1.DashboardSpec, now metav1.Time) v1alpha1.ModuleStatus {
	if spec.Observability == nil || !spec.Observability.Enabled {
		return v1alpha1.ModuleStatus{
			Phase:              v1alpha1.ModulePhaseNotDeployed,
			Reason:             "ObservabilityDisabled",
			Message:            "Observability is not enabled in spec",
			LastTransitionTime: now,
		}
	}

	if spec.Observability.PersesService == nil {
		return v1alpha1.ModuleStatus{
			Phase:              v1alpha1.ModulePhaseNotDeployed,
			Reason:             "MissingPersesServiceConfig",
			Message:            "Observability is enabled but persesService is not configured",
			LastTransitionTime: now,
		}
	}

	return v1alpha1.ModuleStatus{
		Phase:  v1alpha1.ModulePhaseDeployed,
		Reason: "ObservabilityEnabled",
		Message: fmt.Sprintf("Proxying to %s.%s:%d",
			spec.Observability.PersesService.Name,
			spec.Observability.PersesService.Namespace,
			spec.Observability.PersesService.Port),
		LastTransitionTime: now,
	}
}

func findMissingComponent(components map[string]v1alpha1.ComponentAvailability, required []string) string {
	for _, name := range required {
		if !isComponentAvailable(components, name) {
			return name
		}
	}

	return ""
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
