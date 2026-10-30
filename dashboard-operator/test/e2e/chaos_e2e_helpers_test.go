//go:build e2e

package e2e

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	chaosv1alpha1 "github.com/opendatahub-io/operator-chaos/api/v1alpha1"
	"github.com/opendatahub-io/operator-chaos/pkg/experiment"
	"github.com/opendatahub-io/operator-chaos/pkg/injection"
	appsv1 "k8s.io/api/apps/v1"
	authorizationv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	policyv1 "k8s.io/api/policy/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	defaultOperatorDeployment = "dashboard-operator"
	chaosCleanupTimeout       = 1 * time.Minute
	chaosRecoveryTimeout      = 5 * time.Minute
	partitionObservationTime  = 10 * time.Second
	chaosExperimentDirEnvName = "TEST_CHAOS_EXPERIMENT_DIR"
)

type chaosTarget struct {
	namespace  string
	deployment *appsv1.Deployment
	selector   string
}

type activeChaosFault struct {
	injector   injection.Injector
	experiment *chaosv1alpha1.ChaosExperiment
	cleanup    injection.CleanupFunc
	namespace  string
	active     bool
}

type controllerPodBaseline struct {
	uids  map[types.UID]struct{}
	names map[string]struct{}
}

func discoverChaosTarget(ctx context.Context) (*chaosTarget, error) {
	namespace := os.Getenv("TEST_OPERATOR_NAMESPACE")
	if namespace == "" {
		return nil, errors.New("TEST_OPERATOR_NAMESPACE must name the namespace containing dashboard-operator")
	}
	name := os.Getenv("TEST_OPERATOR_DEPLOYMENT")
	if name == "" {
		name = defaultOperatorDeployment
	}
	if namespace == "default" || namespace == "openshift" || strings.HasPrefix(namespace, "kube-") || strings.HasPrefix(namespace, "openshift-") {
		return nil, fmt.Errorf("refuse to run chaos against protected namespace %q", namespace)
	}

	deployment := &appsv1.Deployment{}
	if err := k8sClient.Get(ctx, client.ObjectKey{Namespace: namespace, Name: name}, deployment); err != nil {
		return nil, fmt.Errorf("get controller Deployment %s/%s: %w", namespace, name, err)
	}
	selector, err := deploymentSelectorString(deployment)
	if err != nil {
		return nil, err
	}
	return &chaosTarget{namespace: namespace, deployment: deployment, selector: selector}, nil
}

func verifyChaosPermissions(ctx context.Context, operatorNamespace, operandNamespace string) error {
	checks := []authorizationv1.ResourceAttributes{
		{Namespace: operatorNamespace, Verb: "get", Group: "apps", Resource: "deployments"},
		{Namespace: operatorNamespace, Verb: "get", Resource: "pods"},
		{Namespace: operatorNamespace, Verb: "list", Resource: "pods"},
		{Namespace: operatorNamespace, Verb: "delete", Resource: "pods"},
		{Namespace: operatorNamespace, Verb: "get", Group: "networking.k8s.io", Resource: "networkpolicies"},
		{Namespace: operatorNamespace, Verb: "create", Group: "networking.k8s.io", Resource: "networkpolicies"},
		{Namespace: operatorNamespace, Verb: "delete", Group: "networking.k8s.io", Resource: "networkpolicies"},
		{Namespace: operatorNamespace, Verb: "get", Group: "policy", Resource: "poddisruptionbudgets"},
		{Namespace: operatorNamespace, Verb: "create", Group: "policy", Resource: "poddisruptionbudgets"},
		{Namespace: operatorNamespace, Verb: "update", Group: "policy", Resource: "poddisruptionbudgets"},
		{Namespace: operatorNamespace, Verb: "delete", Group: "policy", Resource: "poddisruptionbudgets"},
		{Namespace: operatorNamespace, Verb: "create", Resource: "pods", Subresource: "eviction"},
		{Namespace: operandNamespace, Verb: "patch", Group: "apps", Resource: "deployments"},
	}
	for _, attributes := range checks {
		resource := attributes.Resource
		if attributes.Subresource != "" {
			resource += "/" + attributes.Subresource
		}
		review := &authorizationv1.SelfSubjectAccessReview{Spec: authorizationv1.SelfSubjectAccessReviewSpec{ResourceAttributes: &attributes}}
		if err := k8sClient.Create(ctx, review); err != nil {
			return fmt.Errorf("check chaos permission %s %s: %w", attributes.Verb, resource, err)
		}
		if !review.Status.Allowed {
			return fmt.Errorf("chaos permission denied: %s %s in namespace %s: %s",
				attributes.Verb, resource, attributes.Namespace, review.Status.Reason)
		}
	}
	return nil
}

func loadLiveChaosExperiment(fileName string, target *chaosTarget) (*chaosv1alpha1.ChaosExperiment, error) {
	directory := os.Getenv(chaosExperimentDirEnvName)
	if directory == "" {
		directory = filepath.Join("..", "..", "..", "chaos", "experiments")
	}
	loaded, err := experiment.Load(filepath.Join(directory, fileName))
	if err != nil {
		return nil, fmt.Errorf("load chaos experiment %s: %w", fileName, err)
	}
	configureChaosExperiment(loaded, target.namespace, target.deployment, target.selector)
	if err := validateDeploymentBlastRadius(target.deployment, loaded.Spec.BlastRadius.MaxPodsAffected); err != nil {
		return nil, err
	}
	if validationErrors := experiment.Validate(loaded); len(validationErrors) > 0 {
		return nil, fmt.Errorf("validate chaos experiment %s: %v", fileName, validationErrors)
	}
	return loaded, nil
}

func injectorFor(experiment *chaosv1alpha1.ChaosExperiment) (injection.Injector, error) {
	switch experiment.Spec.Injection.Type {
	case chaosv1alpha1.PodKill:
		return injection.NewPodKillInjector(k8sClient), nil
	case chaosv1alpha1.NetworkPartition:
		return injection.NewNetworkPartitionInjector(k8sClient), nil
	case chaosv1alpha1.PDBBlock:
		return injection.NewPDBBlockInjector(k8sClient), nil
	default:
		return nil, fmt.Errorf("unsupported live chaos injection %q", experiment.Spec.Injection.Type)
	}
}

func startChaosFault(ctx context.Context, experiment *chaosv1alpha1.ChaosExperiment, namespace string) (*activeChaosFault, []chaosv1alpha1.InjectionEvent, error) {
	injector, err := injectorFor(experiment)
	if err != nil {
		return nil, nil, err
	}
	if err := injector.Validate(experiment.Spec.Injection, experiment.Spec.BlastRadius); err != nil {
		return nil, nil, fmt.Errorf("validate %s injector: %w", experiment.Spec.Injection.Type, err)
	}
	cleanup, events, err := injector.Inject(ctx, experiment.Spec.Injection, namespace)
	fault := &activeChaosFault{
		injector: injector, experiment: experiment, cleanup: cleanup, namespace: namespace, active: true,
	}
	if err != nil {
		return fault, events, fmt.Errorf("inject %s fault: %w", experiment.Spec.Injection.Type, err)
	}
	return fault, events, nil
}

func (fault *activeChaosFault) revert() error {
	if fault == nil || !fault.active {
		return nil
	}
	var cleanupErr error
	if fault.cleanup != nil {
		cleanupCtx, cancel := context.WithTimeout(context.Background(), chaosCleanupTimeout)
		cleanupErr = fault.cleanup(cleanupCtx)
		cancel()
	}
	revertCtx, cancel := context.WithTimeout(context.Background(), chaosCleanupTimeout)
	defer cancel()
	revertErr := fault.injector.Revert(revertCtx, fault.experiment.Spec.Injection, fault.namespace)
	err := errors.Join(cleanupErr, revertErr)
	if err == nil {
		fault.active = false
	}
	return err
}

func readyControllerPod(ctx context.Context, target *chaosTarget) (*corev1.Pod, error) {
	pods, err := controllerPods(ctx, target)
	if err != nil {
		return nil, err
	}
	for i := range pods {
		if podIsReady(&pods[i]) {
			return pods[i].DeepCopy(), nil
		}
	}
	return nil, fmt.Errorf("no Ready pod matches controller selector %q in namespace %q", target.selector, target.namespace)
}

func controllerPods(ctx context.Context, target *chaosTarget) ([]corev1.Pod, error) {
	selector, err := labels.Parse(target.selector)
	if err != nil {
		return nil, fmt.Errorf("parse controller selector: %w", err)
	}
	pods := &corev1.PodList{}
	if err := k8sClient.List(ctx, pods,
		client.InNamespace(target.namespace),
		client.MatchingLabelsSelector{Selector: selector},
	); err != nil {
		return nil, fmt.Errorf("list controller pods: %w", err)
	}
	return pods.Items, nil
}

func captureControllerPodBaseline(ctx context.Context, target *chaosTarget) (*controllerPodBaseline, error) {
	pods, err := controllerPods(ctx, target)
	if err != nil {
		return nil, err
	}
	baseline := &controllerPodBaseline{
		uids:  make(map[types.UID]struct{}, len(pods)),
		names: make(map[string]struct{}, len(pods)),
	}
	for i := range pods {
		baseline.uids[pods[i].UID] = struct{}{}
		baseline.names[pods[i].Name] = struct{}{}
	}
	return baseline, nil
}

func podIsReady(pod *corev1.Pod) bool {
	for _, condition := range pod.Status.Conditions {
		if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionTrue {
			return true
		}
	}
	return false
}

func waitForReplacementControllerPod(target *chaosTarget, baselineUIDs map[types.UID]struct{}, timeout time.Duration) (*corev1.Pod, error) {
	var replacement *corev1.Pod
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, timeout, true, func(ctx context.Context) (bool, error) {
		pods, err := controllerPods(ctx, target)
		if err != nil {
			return false, nil
		}
		for i := range pods {
			if _, existed := baselineUIDs[pods[i].UID]; !existed && podIsReady(&pods[i]) {
				replacement = pods[i].DeepCopy()
				return true, nil
			}
		}
		return false, nil
	})
	if err != nil {
		return nil, fmt.Errorf("wait for a Ready controller pod absent from the pre-injection UID baseline: %w", err)
	}
	return replacement, nil
}

func waitForNetworkedReplacementControllerPod(target *chaosTarget, baselineUIDs map[types.UID]struct{}, timeout time.Duration) (*corev1.Pod, error) {
	var replacement *corev1.Pod
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, timeout, true, func(ctx context.Context) (bool, error) {
		pods, err := controllerPods(ctx, target)
		if err != nil {
			return false, nil
		}
		for i := range pods {
			if _, existed := baselineUIDs[pods[i].UID]; !existed && pods[i].Status.PodIP != "" {
				replacement = pods[i].DeepCopy()
				return true, nil
			}
		}
		return false, nil
	})
	if err != nil {
		return nil, fmt.Errorf("wait for a networked controller pod absent from the pre-partition UID baseline: %w", err)
	}
	return replacement, nil
}

func restartControllerUnderPartition(target *chaosTarget, timeout time.Duration) (*corev1.Pod, error) {
	baseline, err := captureControllerPodBaseline(context.Background(), target)
	if err != nil {
		return nil, err
	}
	current, err := readyControllerPod(context.Background(), target)
	if err != nil {
		return nil, err
	}
	zero := int64(0)
	if err := k8sClient.Delete(context.Background(), current, &client.DeleteOptions{
		GracePeriodSeconds: &zero,
		Preconditions:      &metav1.Preconditions{UID: &current.UID},
	}); err != nil {
		return nil, fmt.Errorf("restart controller pod %s/%s under NetworkPolicy: %w", current.Namespace, current.Name, err)
	}
	return waitForNetworkedReplacementControllerPod(target, baseline.uids, timeout)
}

func waitForReadyControllerPod(target *chaosTarget, timeout time.Duration) (*corev1.Pod, error) {
	var readyPod *corev1.Pod
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, timeout, true, func(ctx context.Context) (bool, error) {
		pod, err := readyControllerPod(ctx, target)
		if err != nil {
			return false, nil
		}
		readyPod = pod
		return true, nil
	})
	if err != nil {
		return nil, fmt.Errorf("wait for a Ready controller pod in namespace %q: %w", target.namespace, err)
	}
	return readyPod, nil
}

func assertDashboardAndOperandsHealthy() error {
	for _, condition := range []struct {
		conditionType string
		status        metav1.ConditionStatus
	}{
		{string(common.ConditionTypeProvisioningSucceeded), metav1.ConditionTrue},
		{string(common.ConditionTypeReady), metav1.ConditionTrue},
		{string(common.ConditionTypeDegraded), metav1.ConditionFalse},
	} {
		if err := waitForCondition(k8sClient, dashboardv1alpha1.DashboardInstanceName, condition.conditionType, condition.status, chaosRecoveryTimeout); err != nil {
			return err
		}
	}

	inventory, err := waitForOperandInventory(k8sClient, testNamespace, dashboardUID, chaosRecoveryTimeout)
	if err != nil {
		return err
	}
	for i := range inventory.deployments {
		if err := waitForDeploymentReady(k8sClient, testNamespace, inventory.deployments[i].Name, chaosRecoveryTimeout); err != nil {
			return err
		}
	}
	return nil
}

func removeOwnedCoreDeploymentLabel(ctx context.Context, key client.ObjectKey) error {
	deployment := &appsv1.Deployment{}
	if err := k8sClient.Get(ctx, key, deployment); err != nil {
		return err
	}
	if deployment.Labels[platformPartOfKey] != platformPartOfValue {
		return fmt.Errorf("Deployment %s/%s does not carry expected ownership label", key.Namespace, key.Name)
	}
	before := deployment.DeepCopy()
	delete(deployment.Labels, platformPartOfKey)
	return k8sClient.Patch(ctx, deployment, client.MergeFrom(before))
}

func assertDeploymentLabelAbsentFor(key client.ObjectKey, duration time.Duration) error {
	deadline := time.Now().Add(duration)
	for {
		ctx, cancel := context.WithTimeout(context.Background(), preflightTimeout)
		deployment := &appsv1.Deployment{}
		err := k8sClient.Get(ctx, key, deployment)
		cancel()
		if err != nil {
			return err
		}
		if _, found := deployment.Labels[platformPartOfKey]; found {
			return fmt.Errorf("controller reconciled Deployment %s/%s while API partition should be active", key.Namespace, key.Name)
		}
		if !time.Now().Before(deadline) {
			return nil
		}
		timer := time.NewTimer(min(e2ePollInterval, time.Until(deadline)))
		<-timer.C
	}
}

func waitForDeploymentLabel(key client.ObjectKey, timeout time.Duration) error {
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, timeout, true, func(ctx context.Context) (bool, error) {
		deployment := &appsv1.Deployment{}
		if err := k8sClient.Get(ctx, key, deployment); err != nil {
			return false, err
		}
		return deployment.Labels[platformPartOfKey] == platformPartOfValue, nil
	})
	if err != nil {
		return fmt.Errorf("wait for controller to restore %s=%s on Deployment %s/%s: %w",
			platformPartOfKey, platformPartOfValue, key.Namespace, key.Name, err)
	}
	return nil
}

func waitForChaosNetworkPolicy(name, namespace string, present bool) error {
	return waitForResourcePresence(&networkingv1.NetworkPolicy{}, client.ObjectKey{Namespace: namespace, Name: name}, present)
}

func waitForChaosPDB(name, namespace string, present bool) error {
	return waitForResourcePresence(&policyv1.PodDisruptionBudget{}, client.ObjectKey{Namespace: namespace, Name: name}, present)
}

func waitForResourcePresence(object client.Object, key client.ObjectKey, present bool) error {
	var lastReadErr error
	err := wait.PollUntilContextTimeout(context.Background(), e2ePollInterval, chaosCleanupTimeout, true, func(ctx context.Context) (bool, error) {
		err := k8sClient.Get(ctx, key, object)
		switch {
		case err == nil:
			lastReadErr = nil
			return present, nil
		case apierrors.IsNotFound(err):
			lastReadErr = nil
			return !present, nil
		default:
			lastReadErr = err
			return false, nil
		}
	})
	if err != nil {
		return fmt.Errorf("wait for %T %s presence=%t: %w", object, key, present, errors.Join(err, lastReadErr))
	}
	return nil
}

func evictControllerPod(ctx context.Context, clientset kubernetes.Interface, pod *corev1.Pod) error {
	uid := pod.UID
	eviction := &policyv1.Eviction{
		ObjectMeta:    metav1.ObjectMeta{Name: pod.Name, Namespace: pod.Namespace},
		DeleteOptions: &metav1.DeleteOptions{Preconditions: &metav1.Preconditions{UID: &uid}},
	}
	return clientset.PolicyV1().Evictions(pod.Namespace).Evict(ctx, eviction)
}
