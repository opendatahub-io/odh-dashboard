//go:build e2e

package e2e

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/stretchr/testify/require"
	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const contractTimeout = 10 * time.Minute

func TestE2E_PlatformContractConformance(t *testing.T) {
	requireNoDashboardInstances(t)
	requireDashboardCELRule(t)

	webhookTarget := requireDashboardWebhook(t)
	require.NoError(t, waitForServiceEndpoints(
		k8sClient,
		webhookTarget.serviceNamespace,
		webhookTarget.serviceName,
		contractTimeout,
	))

	t.Run("CEL rejects a non-default singleton name", func(t *testing.T) {
		probe := &dashboardv1alpha1.Dashboard{
			ObjectMeta: metav1.ObjectMeta{
				Name: dashboardv1alpha1.DashboardInstanceName + "-duplicate",
				Labels: map[string]string{
					e2eManagedByKey: e2eFieldOwner,
				},
			},
		}

		err := k8sClient.Create(t.Context(), probe)
		if err == nil {
			uid := probe.UID
			deleteErr := k8sClient.Delete(t.Context(), probe, client.Preconditions{UID: &uid})
			require.NoError(t, deleteErr, "clean up unexpectedly accepted CEL probe")
		}
		require.NoError(t, validateCELRejection(err))
	})

	domain := os.Getenv("TEST_GATEWAY_DOMAIN")
	require.NotEmpty(t, domain, "TEST_GATEWAY_DOMAIN must contain the cluster applications domain")

	uid, err := createDashboardCR(k8sClient, dashboardv1alpha1.DashboardSpec{
		ManagementSpec: common.ManagementSpec{ManagementState: common.Managed},
		Gateway:        &dashboardv1alpha1.GatewaySpec{Domain: domain},
		Modules:        disabledContractModules(),
	})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, cleanupDashboardCR(k8sClient, uid))
	})

	require.NoError(t, waitForCondition(
		k8sClient,
		dashboardv1alpha1.DashboardInstanceName,
		string(common.ConditionTypeProvisioningSucceeded),
		metav1.ConditionTrue,
		contractTimeout,
	))
	require.NoError(t, waitForCondition(
		k8sClient,
		dashboardv1alpha1.DashboardInstanceName,
		string(common.ConditionTypeReady),
		metav1.ConditionTrue,
		contractTimeout,
	))

	t.Run("validating webhook rejects a schema-valid duplicate", func(t *testing.T) {
		probe := &dashboardv1alpha1.Dashboard{
			ObjectMeta: metav1.ObjectMeta{Name: dashboardv1alpha1.DashboardInstanceName},
		}

		err := k8sClient.Create(t.Context(), probe)
		require.NoError(t, validateWebhookRejection(err))
	})

	require.NoError(t, waitForRequiredReleases(t.Context(), contractTimeout))
	validateDashboardPlatformContract(t, k8sClient, contractTimeout)
}

func disabledContractModules() map[string]dashboardv1alpha1.ModuleOverride {
	moduleNames := ctrlpkg.ModuleNames()
	modules := make(map[string]dashboardv1alpha1.ModuleOverride, len(moduleNames))
	for _, name := range moduleNames {
		modules[name] = dashboardv1alpha1.ModuleOverride{State: dashboardv1alpha1.ModuleDisabled}
	}

	return modules
}

func requireNoDashboardInstances(t *testing.T) {
	t.Helper()

	dashboards := &dashboardv1alpha1.DashboardList{}
	require.NoError(t, k8sClient.List(t.Context(), dashboards))
	require.Empty(t, dashboards.Items,
		"platform contract E2E requires an isolated cluster with no Dashboard instances")
}

func requireDashboardCELRule(t *testing.T) {
	t.Helper()

	crd := &apiextensionsv1.CustomResourceDefinition{}
	require.NoError(t, k8sClient.Get(t.Context(), client.ObjectKey{Name: dashboardCRDName}, crd))

	for _, servedVersion := range crd.Spec.Versions {
		if !servedVersion.Served || servedVersion.Name != dashboardv1alpha1.GroupVersion.Version || servedVersion.Schema == nil ||
			servedVersion.Schema.OpenAPIV3Schema == nil {
			continue
		}
		for _, rule := range servedVersion.Schema.OpenAPIV3Schema.XValidations {
			if equivalentCELRule(rule.Rule, dashboardCELRule) && rule.Message == dashboardCELValidationMessage {
				return
			}
		}
	}

	t.Fatalf("served Dashboard CRD does not contain CEL rule %q with message %q",
		dashboardCELRule, dashboardCELValidationMessage)
}

func requireDashboardWebhook(t *testing.T) dashboardWebhookTarget {
	t.Helper()

	target, err := waitForDashboardWebhook(t.Context(), contractTimeout)
	require.NoError(t, err)
	t.Logf(
		"using Dashboard validating webhook %s/%s via Service %s/%s:%d%s",
		target.configurationName,
		target.webhookName,
		target.serviceNamespace,
		target.serviceName,
		target.servicePort,
		target.servicePath,
	)

	return target
}

func waitForDashboardWebhook(ctx context.Context, timeout time.Duration) (dashboardWebhookTarget, error) {
	var (
		target  dashboardWebhookTarget
		lastErr error
	)

	err := wait.PollUntilContextTimeout(ctx, e2ePollInterval, timeout, true, func(ctx context.Context) (bool, error) {
		configurations := &admissionregistrationv1.ValidatingWebhookConfigurationList{}
		if err := k8sClient.List(ctx, configurations); err != nil {
			return false, err
		}

		target, lastErr = selectDashboardWebhook(configurations.Items)

		return lastErr == nil, nil
	})
	if err != nil {
		if lastErr != nil {
			return dashboardWebhookTarget{}, fmt.Errorf("wait for Dashboard validating webhook: %w: %w", err, lastErr)
		}

		return dashboardWebhookTarget{}, fmt.Errorf("wait for Dashboard validating webhook: %w", err)
	}

	return target, nil
}

func waitForRequiredReleases(ctx context.Context, timeout time.Duration) error {
	var lastValidationErr error
	err := wait.PollUntilContextTimeout(ctx, e2ePollInterval, timeout, true, func(ctx context.Context) (bool, error) {
		dashboard := &dashboardv1alpha1.Dashboard{}
		if err := k8sClient.Get(ctx, types.NamespacedName{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard); err != nil {
			if apierrors.IsNotFound(err) {
				return false, nil
			}

			return false, err
		}

		lastValidationErr = validateRequiredReleases(dashboard.Status.Releases)

		return lastValidationErr == nil, nil
	})
	if err != nil {
		if lastValidationErr != nil {
			return fmt.Errorf("wait for required Dashboard releases: %w: %w", err, lastValidationErr)
		}

		return fmt.Errorf("wait for required Dashboard releases: %w", err)
	}
	return nil
}
