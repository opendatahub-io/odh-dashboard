package controller

import (
	"fmt"
	"sort"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// ModuleDefinition describes a module's static properties.
type ModuleDefinition struct {
	Name          string
	ContainerName string
	Port          int32
	ImageEnvVar   string
}

var moduleRegistry = map[string]ModuleDefinition{
	"modelRegistry": {
		Name: "modelRegistry", ContainerName: "model-registry-ui", Port: 8043,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_MODEL_REGISTRY_IMAGE",
	},
	"genAi": {
		Name: "genAi", ContainerName: "gen-ai-ui", Port: 8143,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE",
	},
	"mlflow": {
		Name: "mlflow", ContainerName: "mlflow-ui", Port: 8343,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_MLFLOW_IMAGE",
	},
	"maas": {
		Name: "maas", ContainerName: "maas-ui", Port: 8243,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_MAAS_IMAGE",
	},
	"evalHub": {
		Name: "evalHub", ContainerName: "eval-hub-ui", Port: 8443,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_EVAL_HUB_IMAGE",
	},
	"automl": {
		Name: "automl", ContainerName: "automl-ui", Port: 8543,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_AUTOML_IMAGE",
	},
	"autorag": {
		Name: "autorag", ContainerName: "autorag-ui", Port: 8643,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_AUTORAG_IMAGE",
	},
	"agentOps": {
		Name: "agentOps", ContainerName: "agent-ops-ui", Port: 8843,
		ImageEnvVar: "RELATED_IMAGE_ODH_MOD_ARCH_AGENT_OPS_IMAGE",
	},
}

// resolveModuleStatuses determines the status of each module based on
// spec overrides. All registered modules are deployed by default unless
// explicitly disabled.
func resolveModuleStatuses(spec *v1alpha1.DashboardSpec) map[string]v1alpha1.ModuleStatus {
	now := metav1.Now()
	result := make(map[string]v1alpha1.ModuleStatus, len(moduleRegistry))

	for name := range moduleRegistry {
		if override, ok := spec.Modules[name]; ok && override.State == v1alpha1.ModuleDisabled {
			result[name] = v1alpha1.ModuleStatus{
				Phase:              v1alpha1.ModulePhaseDisabled,
				Reason:             "ExplicitOverride",
				Message:            "Module explicitly disabled via spec.modules override",
				LastTransitionTime: now,
			}

			continue
		}

		result[name] = v1alpha1.ModuleStatus{
			Phase:              v1alpha1.ModulePhaseDeployed,
			Reason:             "Deployed",
			Message:            "Module container deployed",
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
