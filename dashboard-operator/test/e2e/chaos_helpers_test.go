package e2e

import (
	"errors"
	"testing"

	chaosv1alpha1 "github.com/opendatahub-io/operator-chaos/api/v1alpha1"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	policyv1 "k8s.io/api/policy/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func TestDeploymentSelectorString(t *testing.T) {
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "dashboard-operator", Namespace: "test"},
		Spec: appsv1.DeploymentSpec{Selector: &metav1.LabelSelector{MatchLabels: map[string]string{
			"z.example/key": "last",
			"app":           "dashboard-operator",
		}}},
	}

	selector, err := deploymentSelectorString(deployment)
	require.NoError(t, err)
	require.Equal(t, "app=dashboard-operator,z.example/key=last", selector)

	deployment.Spec.Selector.MatchExpressions = []metav1.LabelSelectorRequirement{{Key: "app", Operator: metav1.LabelSelectorOpExists}}
	_, err = deploymentSelectorString(deployment)
	require.ErrorContains(t, err, "matchExpressions")
}

func TestConfigureChaosExperiment(t *testing.T) {
	twoReplicas := int32(2)
	experiment := &chaosv1alpha1.ChaosExperiment{
		Spec: chaosv1alpha1.ChaosExperimentSpec{
			Target: chaosv1alpha1.TargetSpec{Resource: "Deployment/odh-dashboard"},
			SteadyState: chaosv1alpha1.SteadyStateSpec{Checks: []chaosv1alpha1.SteadyStateCheck{{
				Kind: "Deployment", Name: "odh-dashboard", Namespace: "opendatahub",
			}}},
			Injection:   chaosv1alpha1.InjectionSpec{Parameters: map[string]string{"labelSelector": "deployment=odh-dashboard"}},
			BlastRadius: chaosv1alpha1.BlastRadiusSpec{MaxPodsAffected: 1},
		},
	}
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "dashboard-operator"},
		Spec:       appsv1.DeploymentSpec{Replicas: &twoReplicas},
	}

	configureChaosExperiment(experiment, "test-ns", deployment, "app=dashboard-operator")
	require.Equal(t, "Deployment/dashboard-operator", experiment.Spec.Target.Resource)
	require.Equal(t, "app=dashboard-operator", experiment.Spec.Injection.Parameters["labelSelector"])
	require.Equal(t, []string{"test-ns"}, experiment.Spec.BlastRadius.AllowedNamespaces)
	require.Equal(t, int32(1), experiment.Spec.BlastRadius.MaxPodsAffected)
	require.Equal(t, "dashboard-operator", experiment.Spec.SteadyState.Checks[0].Name)
	require.Equal(t, "test-ns", experiment.Spec.SteadyState.Checks[0].Namespace)
}

func TestValidateDeploymentBlastRadius(t *testing.T) {
	twoReplicas := int32(2)
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "dashboard-operator", Namespace: "operator-ns"},
		Spec:       appsv1.DeploymentSpec{Replicas: &twoReplicas},
	}

	require.NoError(t, validateDeploymentBlastRadius(deployment, 2))
	require.ErrorContains(t, validateDeploymentBlastRadius(deployment, 1), "exceeding experiment maxPodsAffected 1")
}

func TestConfigureChaosExperimentInitializesParameters(t *testing.T) {
	experiment := &chaosv1alpha1.ChaosExperiment{}
	deployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "dashboard-operator"}}

	configureChaosExperiment(experiment, "test-ns", deployment, "app=dashboard-operator")
	require.Equal(t, "app=dashboard-operator", experiment.Spec.Injection.Parameters["labelSelector"])
}

func TestInjectionTargetedBaselinePod(t *testing.T) {
	baselineNames := map[string]struct{}{"dashboard-operator-abc": {}, "dashboard-operator-def": {}}
	events := []chaosv1alpha1.InjectionEvent{{Type: chaosv1alpha1.PodKill, Target: "dashboard-operator-def", Action: "deleted"}}
	require.True(t, injectionTargetedBaselinePod(events, baselineNames))
	events[0].Target = "another-pod"
	require.False(t, injectionTargetedBaselinePod(events, baselineNames))
}

func TestEvictionBlocked(t *testing.T) {
	blocked := apierrors.NewTooManyRequests("blocked by disruption budget", 0)
	blocked.ErrStatus.Details = &metav1.StatusDetails{Causes: []metav1.StatusCause{{Type: policyv1.DisruptionBudgetCause}}}
	require.True(t, evictionBlocked(blocked))
	require.False(t, evictionBlocked(apierrors.NewTooManyRequests("API priority and fairness throttle", 1)))
	require.False(t, evictionBlocked(errors.New("connection refused")))
	require.False(t, evictionBlocked(apierrors.NewForbidden(
		schema.GroupResource{Group: "policy", Resource: "pods/eviction"}, "pod", errors.New("forbidden"),
	)))
}
