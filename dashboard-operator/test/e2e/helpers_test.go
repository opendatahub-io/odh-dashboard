//go:build e2e

package e2e

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common/validation"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	e2eFieldOwner     = "dashboard-operator-e2e"
	e2eManagedByKey   = "app.kubernetes.io/managed-by"
	e2ePollInterval   = 2 * time.Second
	e2eCleanupTimeout = 5 * time.Minute
)

func waitForCondition(
	c client.Client,
	name string,
	conditionType string,
	expectedStatus metav1.ConditionStatus,
	timeout time.Duration,
) error {
	err := wait.PollUntilContextTimeout(
		context.Background(),
		e2ePollInterval,
		timeout,
		true,
		func(ctx context.Context) (bool, error) {
			dashboard := &dashboardv1alpha1.Dashboard{}
			if err := c.Get(ctx, client.ObjectKey{Name: name}, dashboard); err != nil {
				if apierrors.IsNotFound(err) {
					return false, nil
				}
				return false, err
			}

			for _, condition := range dashboard.Status.Conditions {
				if condition.Type == conditionType && condition.Status == expectedStatus {
					return true, nil
				}
			}

			return false, nil
		},
	)
	if err != nil {
		return fmt.Errorf(
			"wait for Dashboard %q condition %q to become %q: %w",
			name,
			conditionType,
			expectedStatus,
			err,
		)
	}

	return nil
}

//nolint:unused // Shared E2E helper for follow-up scenario stories.
func waitForDeploymentReady(c client.Client, namespace, name string, timeout time.Duration) error {
	err := wait.PollUntilContextTimeout(
		context.Background(),
		e2ePollInterval,
		timeout,
		true,
		func(ctx context.Context) (bool, error) {
			deployment := &appsv1.Deployment{}
			if err := c.Get(ctx, client.ObjectKey{Namespace: namespace, Name: name}, deployment); err != nil {
				if apierrors.IsNotFound(err) {
					return false, nil
				}
				return false, err
			}

			desiredReplicas := int32(1)
			if deployment.Spec.Replicas != nil {
				desiredReplicas = *deployment.Spec.Replicas
			}
			if deployment.Status.ObservedGeneration < deployment.Generation ||
				deployment.Status.UpdatedReplicas != desiredReplicas ||
				deployment.Status.ReadyReplicas != desiredReplicas {
				return false, nil
			}

			for _, condition := range deployment.Status.Conditions {
				if condition.Type == appsv1.DeploymentAvailable && condition.Status == corev1.ConditionTrue {
					return true, nil
				}
			}

			return false, nil
		},
	)
	if err != nil {
		return fmt.Errorf("wait for Deployment %s/%s to become available: %w", namespace, name, err)
	}

	return nil
}

func createDashboardCR(c client.Client, spec dashboardv1alpha1.DashboardSpec) (types.UID, error) {
	ctx := context.Background()
	dashboard := &dashboardv1alpha1.Dashboard{
		TypeMeta: metav1.TypeMeta{
			APIVersion: dashboardv1alpha1.GroupVersion.String(),
			Kind:       dashboardv1alpha1.DashboardKind,
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: dashboardv1alpha1.DashboardInstanceName,
			Labels: map[string]string{
				e2eManagedByKey: e2eFieldOwner,
			},
		},
		Spec: spec,
	}

	if err := c.Create(ctx, dashboard); err != nil {
		if apierrors.IsAlreadyExists(err) {
			return "", fmt.Errorf("refuse to create Dashboard %q because it already exists", dashboard.Name)
		}
		return "", fmt.Errorf("create Dashboard %q: %w", dashboard.Name, err)
	}
	if dashboard.UID == "" {
		return "", fmt.Errorf("created Dashboard %q has no UID", dashboard.Name)
	}

	return dashboard.UID, nil
}

func cleanupDashboardCR(c client.Client, expectedUID types.UID) error {
	if expectedUID == "" {
		return errors.New("refuse to clean up Dashboard without its expected UID")
	}

	ctx := context.Background()
	dashboard := &dashboardv1alpha1.Dashboard{}
	key := client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}

	if err := c.Get(ctx, key, dashboard); err != nil {
		if apierrors.IsNotFound(err) {
			return nil
		}
		return fmt.Errorf("get Dashboard %q before cleanup: %w", key.Name, err)
	}

	if dashboard.Labels[e2eManagedByKey] != e2eFieldOwner {
		return fmt.Errorf(
			"refuse to delete Dashboard %q without %s=%s ownership label",
			key.Name,
			e2eManagedByKey,
			e2eFieldOwner,
		)
	}
	if dashboard.UID != expectedUID {
		return fmt.Errorf(
			"refuse to delete Dashboard %q with UID %q; expected UID %q",
			key.Name,
			dashboard.UID,
			expectedUID,
		)
	}

	preconditions := client.Preconditions{UID: &expectedUID}
	if err := c.Delete(ctx, dashboard, preconditions); err != nil && !apierrors.IsNotFound(err) {
		return fmt.Errorf("delete Dashboard %q: %w", key.Name, err)
	}

	err := wait.PollUntilContextTimeout(
		ctx,
		e2ePollInterval,
		e2eCleanupTimeout,
		true,
		func(ctx context.Context) (bool, error) {
			current := &dashboardv1alpha1.Dashboard{}
			err := c.Get(ctx, key, current)
			switch {
			case apierrors.IsNotFound(err):
				return true, nil
			case err != nil:
				return false, err
			default:
				return false, nil
			}
		},
	)
	if err != nil {
		return fmt.Errorf("wait for Dashboard %q deletion: %w", key.Name, err)
	}

	return nil
}

//nolint:unused // Shared E2E helper for follow-up scenario stories.
func waitForServiceEndpoints(c client.Client, namespace, name string, timeout time.Duration) error {
	err := wait.PollUntilContextTimeout(
		context.Background(),
		e2ePollInterval,
		timeout,
		true,
		func(ctx context.Context) (bool, error) {
			//nolint:staticcheck // Test the legacy Endpoints resource because dashboard Services still publish it.
			endpoints := &corev1.Endpoints{}
			if err := c.Get(ctx, client.ObjectKey{Namespace: namespace, Name: name}, endpoints); err != nil {
				if apierrors.IsNotFound(err) {
					return false, nil
				}
				return false, err
			}

			for _, subset := range endpoints.Subsets {
				if len(subset.Addresses) > 0 {
					return true, nil
				}
			}

			return false, nil
		},
	)
	if err != nil {
		return fmt.Errorf("wait for Service %s/%s endpoints: %w", namespace, name, err)
	}

	return nil
}

//nolint:unused // Shared E2E helper for follow-up scenario stories.
func assertJQMatch(t *testing.T, actual any, expression string) {
	t.Helper()

	matched, failureMessage := evaluateJQMatch(actual, expression)
	if !matched {
		t.Fatal(failureMessage)
	}
}

//nolint:unused // Shared E2E helper for follow-up scenario stories.
func validateDashboardPlatformContract(t *testing.T, c client.Client, timeout time.Duration) {
	t.Helper()

	if timeout <= 0 {
		require.FailNow(t, "platform contract timeout must be positive")
	}

	validation.ValidatePlatformContract(t, c, validation.ContractOptions{
		GVK:          dashboardv1alpha1.GroupVersion.WithKind(dashboardv1alpha1.DashboardKind),
		InstanceName: dashboardv1alpha1.DashboardInstanceName,
		Timeout:      timeout,
		PollInterval: e2ePollInterval,
	})
}
