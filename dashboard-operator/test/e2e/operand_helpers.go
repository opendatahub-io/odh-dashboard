package e2e

import (
	"fmt"
	"sort"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	policyv1 "k8s.io/api/policy/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/types"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

type moduleOperand struct {
	name       string
	deployment string
	service    string
}

type bffTarget struct {
	name    string
	service string
	port    int32
}

type operandInventory struct {
	deployments []appsv1.Deployment
	services    []corev1.Service
}

var expectedModuleOperands = []moduleOperand{
	{name: "modelRegistry", deployment: "model-registry-ui", service: "odh-dashboard-model-registry-ui"},
	{name: "genAi", deployment: "gen-ai-ui", service: "odh-dashboard-gen-ai-ui"},
	{name: "mlflow", deployment: "mlflow-ui", service: "odh-dashboard-mlflow-ui"},
	{name: "maas", deployment: "maas-ui", service: "odh-dashboard-maas-ui"},
	{name: "evalHub", deployment: "eval-hub-ui", service: "odh-dashboard-eval-hub-ui"},
	{name: "automl", deployment: "automl-ui", service: "odh-dashboard-automl-ui"},
	{name: "autorag", deployment: "autorag-ui", service: "odh-dashboard-autorag-ui"},
	{name: "agentOps", deployment: "agent-ops-ui", service: "odh-dashboard-agent-ops-ui"},
	{name: "notebooks", deployment: "notebooks-ui", service: "odh-dashboard-notebooks-ui"},
	{name: "dataRegistry", deployment: "data-registry-ui", service: "odh-dashboard-data-registry-ui"},
}

var bffTargets = []bffTarget{
	// notebooks and dataRegistry are inventory operands, but their current BFFs
	// do not implement the common HTTPS /healthcheck contract exercised here.
	{name: "modelRegistry", service: "odh-dashboard-model-registry-ui", port: 8043},
	{name: "genAi", service: "odh-dashboard-gen-ai-ui", port: 8143},
	{name: "mlflow", service: "odh-dashboard-mlflow-ui", port: 8343},
	{name: "maas", service: "odh-dashboard-maas-ui", port: 8243},
	{name: "evalHub", service: "odh-dashboard-eval-hub-ui", port: 8543},
	{name: "automl", service: "odh-dashboard-automl-ui", port: 8643},
	{name: "autorag", service: "odh-dashboard-autorag-ui", port: 8743},
	{name: "agentOps", service: "odh-dashboard-agent-ops-ui", port: 8843},
}

func deploymentReady(deployment *appsv1.Deployment) bool {
	desiredReplicas := int32(1)
	if deployment.Spec.Replicas != nil {
		desiredReplicas = *deployment.Spec.Replicas
	}
	if deployment.Status.ObservedGeneration < deployment.Generation ||
		deployment.Status.UpdatedReplicas != desiredReplicas ||
		deployment.Status.ReadyReplicas != desiredReplicas {
		return false
	}

	for _, condition := range deployment.Status.Conditions {
		if condition.Type == appsv1.DeploymentAvailable && condition.Status == corev1.ConditionTrue {
			return true
		}
	}

	return false
}

//nolint:staticcheck // The E2E framework intentionally verifies the legacy Endpoints published for Dashboard Services.
func endpointsReady(endpoints *corev1.Endpoints) bool {
	for _, subset := range endpoints.Subsets {
		if len(subset.Addresses) > 0 {
			return true
		}
	}

	return false
}

func ownedByUID(object metav1.Object, ownerUID types.UID) bool {
	if ownerUID == "" {
		return false
	}
	for _, reference := range object.GetOwnerReferences() {
		if reference.UID == ownerUID {
			return true
		}
	}

	return false
}

func httpRouteAdmitted(route *gatewayv1.HTTPRoute) bool {
	for _, parent := range route.Status.Parents {
		accepted := false
		resolvedRefs := false
		for _, condition := range parent.Conditions {
			if condition.ObservedGeneration != route.Generation || condition.Status != metav1.ConditionTrue {
				continue
			}
			switch condition.Type {
			case string(gatewayv1.RouteConditionAccepted):
				accepted = true
			case string(gatewayv1.RouteConditionResolvedRefs):
				resolvedRefs = true
			}
		}
		if accepted && resolvedRefs {
			return true
		}
	}

	return false
}

func pdbSelectsDeployment(pdb *policyv1.PodDisruptionBudget, deployment *appsv1.Deployment) (bool, error) {
	if pdb.Spec.Selector == nil {
		return false, nil
	}
	selector, err := metav1.LabelSelectorAsSelector(pdb.Spec.Selector)
	if err != nil {
		return false, fmt.Errorf("convert PDB selector: %w", err)
	}

	return selector.Matches(labels.Set(deployment.Spec.Template.Labels)), nil
}

func resolveServiceTargetPort(service *corev1.Service, pod *corev1.Pod, servicePort int32) (int32, error) {
	for _, port := range service.Spec.Ports {
		if port.Port != servicePort {
			continue
		}
		if port.TargetPort.IntVal > 0 {
			return port.TargetPort.IntVal, nil
		}
		if port.TargetPort.StrVal == "" {
			return port.Port, nil
		}
		for _, container := range pod.Spec.Containers {
			for _, containerPort := range container.Ports {
				if containerPort.Name == port.TargetPort.StrVal {
					return containerPort.ContainerPort, nil
				}
			}
		}
		return 0, fmt.Errorf("target port %q is not declared by pod %s", port.TargetPort.StrVal, pod.Name)
	}

	return 0, fmt.Errorf("service %s does not expose port %d", service.Name, servicePort)
}

func routeResponseHealthy(statusCode int) bool {
	switch statusCode {
	case 200, 302, 303, 401, 403:
		return true
	default:
		return false
	}
}

func missingOperandResources(inventory operandInventory) []string {
	deployments := make(map[string]struct{}, len(inventory.deployments))
	for i := range inventory.deployments {
		deployments[inventory.deployments[i].Name] = struct{}{}
	}
	services := make(map[string]struct{}, len(inventory.services))
	for i := range inventory.services {
		services[inventory.services[i].Name] = struct{}{}
	}

	missing := make([]string, 0)
	for _, operand := range expectedModuleOperands {
		if _, found := deployments[operand.deployment]; !found {
			missing = append(missing, "Deployment/"+operand.deployment)
		}
		if _, found := services[operand.service]; !found {
			missing = append(missing, "Service/"+operand.service)
		}
	}
	odhCorePair := contains(deployments, "odh-dashboard") && contains(services, "odh-dashboard")
	rhodsCorePair := contains(deployments, "rhods-dashboard") && contains(services, "rhods-dashboard")
	if !odhCorePair && !rhodsCorePair {
		missing = append(missing, "Deployment/{odh-dashboard,rhods-dashboard}")
		missing = append(missing, "Service/{odh-dashboard,rhods-dashboard}")
	}
	sort.Strings(missing)
	return missing
}

func contains(items map[string]struct{}, name string) bool {
	_, found := items[name]
	return found
}

func findCoreDeployment(deployments []appsv1.Deployment) (*appsv1.Deployment, error) {
	for i := range deployments {
		if deployments[i].Name == "odh-dashboard" || deployments[i].Name == "rhods-dashboard" {
			return &deployments[i], nil
		}
	}
	return nil, fmt.Errorf("owned core Dashboard Deployment was not found")
}

func anyReadyPod(pods []corev1.Pod) bool {
	for i := range pods {
		for _, condition := range pods[i].Status.Conditions {
			if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionTrue {
				return true
			}
		}
	}
	return false
}
