package e2e

import (
	"fmt"
	"sort"
	"strings"

	chaosv1alpha1 "github.com/opendatahub-io/operator-chaos/api/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	policyv1 "k8s.io/api/policy/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

func deploymentSelectorString(deployment *appsv1.Deployment) (string, error) {
	if deployment.Spec.Selector == nil || len(deployment.Spec.Selector.MatchLabels) == 0 {
		return "", fmt.Errorf("deployment %s/%s has no matchLabels selector", deployment.Namespace, deployment.Name)
	}
	if len(deployment.Spec.Selector.MatchExpressions) > 0 {
		return "", fmt.Errorf("deployment %s/%s uses matchExpressions, which NetworkPartition and PDBBlock cannot represent", deployment.Namespace, deployment.Name)
	}

	keys := make([]string, 0, len(deployment.Spec.Selector.MatchLabels))
	for key := range deployment.Spec.Selector.MatchLabels {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, key+"="+deployment.Spec.Selector.MatchLabels[key])
	}
	return strings.Join(parts, ","), nil
}

func configureChaosExperiment(
	experiment *chaosv1alpha1.ChaosExperiment,
	namespace string,
	deployment *appsv1.Deployment,
	selector string,
) {
	experiment.Namespace = namespace
	experiment.Spec.Target.Resource = "Deployment/" + deployment.Name
	if experiment.Spec.Injection.Parameters == nil {
		experiment.Spec.Injection.Parameters = map[string]string{}
	}
	experiment.Spec.Injection.Parameters["labelSelector"] = selector
	experiment.Spec.BlastRadius.AllowedNamespaces = []string{namespace}

	for i := range experiment.Spec.SteadyState.Checks {
		check := &experiment.Spec.SteadyState.Checks[i]
		if check.Kind == "Deployment" {
			check.Name = deployment.Name
			check.Namespace = namespace
		}
	}
}

func validateDeploymentBlastRadius(deployment *appsv1.Deployment, maxPodsAffected int32) error {
	desiredReplicas := int32(1)
	if deployment.Spec.Replicas != nil && *deployment.Spec.Replicas > 0 {
		desiredReplicas = *deployment.Spec.Replicas
	}
	if desiredReplicas > maxPodsAffected {
		return fmt.Errorf(
			"deployment %s/%s has %d replicas, exceeding experiment maxPodsAffected %d",
			deployment.Namespace, deployment.Name, desiredReplicas, maxPodsAffected,
		)
	}
	return nil
}

func injectionTargetedBaselinePod(events []chaosv1alpha1.InjectionEvent, baselineNames map[string]struct{}) bool {
	for _, event := range events {
		_, existed := baselineNames[event.Target]
		if event.Type == chaosv1alpha1.PodKill && event.Action == "deleted" && existed {
			return true
		}
	}
	return false
}

func evictionBlocked(err error) bool {
	return apierrors.IsTooManyRequests(err) && apierrors.HasStatusCause(err, policyv1.DisruptionBudgetCause)
}
