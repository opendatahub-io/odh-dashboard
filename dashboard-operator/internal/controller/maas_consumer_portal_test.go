package controller

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// maasConsumerPortalTestManager builds a conditions.Manager whose Error-severity dependents
// are all healthy, so the Ready rollup is True before the maasConsumerPortalCond is reconciled.
func maasConsumerPortalTestManager(t *testing.T, dashboard *v1alpha1.Dashboard) *conditions.Manager {
	t.Helper()

	cm := conditions.NewManager(
		dashboard,
		string(common.ConditionTypeReady),
		string(common.ConditionTypeProvisioningSucceeded),
		string(common.ConditionTypeDegraded),
		conditionObservabilityAvailable,
		conditionMaasConsumerPortalAvailable,
	)
	cm.MarkTrue(string(common.ConditionTypeProvisioningSucceeded),
		conditions.WithReason("ResourcesApplied"))
	cm.MarkFalse(string(common.ConditionTypeDegraded),
		conditions.WithReason("NoDegradation"),
		conditions.WithSeverity(common.ConditionSeverityInfo))
	cm.MarkTrue(conditionObservabilityAvailable,
		conditions.WithReason("Deployed"))

	// Ready is not yet True here: MaasConsumerPortalAvailable is still Unknown (Error
	// severity) until the maasConsumerPortalCond reconcile resolves it. Each test asserts
	// Ready becomes True afterwards, proving the Info-severity maasConsumerPortalCond state
	// does not drag the rollup down.
	return cm
}

func TestReconcileMaasConsumerPortalConsoleLink_DomainRequired(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))

	// Portal enabled but no gateway domain — the URL is unresolvable.
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec: v1alpha1.DashboardSpec{
			MaasConsumerPortal: &v1alpha1.MaasConsumerPortalSpec{ManagementState: "Managed"},
		},
	}

	r := &DashboardReconciler{
		Client:            fake.NewClientBuilder().WithScheme(s).Build(),
		Scheme:            s,
		ManifestsBasePath: t.TempDir(),
		Platform:          cluster.SelfManagedRhoai,
	}

	cm := maasConsumerPortalTestManager(t, dashboard)
	r.reconcileMaasConsumerPortalConsoleLink(context.Background(), dashboard, cm)

	maasConsumerPortalCond := cm.GetCondition(conditionMaasConsumerPortalAvailable)
	require.NotNil(t, maasConsumerPortalCond)
	assert.Equal(t, metav1.ConditionFalse, maasConsumerPortalCond.Status)
	assert.Equal(t, "MaasConsumerPortalDomainRequired", maasConsumerPortalCond.Reason)
	assert.Equal(t, common.ConditionSeverityInfo, maasConsumerPortalCond.Severity)

	// Ready must be unaffected: Info-severity False dependents are ignored.
	assert.True(t, cm.IsHappy(), "Ready must remain True when the maasConsumerPortalCond domain is missing")
}

func TestReconcileMaasConsumerPortalConsoleLink_Disabled(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))

	// Portal absent (disabled). The delete attempt is best-effort — any error
	// (e.g. ConsoleLink CRD not registered) is logged and does not affect the
	// MaasConsumerPortalAvailable condition.
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec:       v1alpha1.DashboardSpec{},
	}

	r := &DashboardReconciler{
		Client:            fake.NewClientBuilder().WithScheme(s).Build(),
		Scheme:            s,
		ManifestsBasePath: t.TempDir(),
		Platform:          cluster.SelfManagedRhoai,
	}

	cm := maasConsumerPortalTestManager(t, dashboard)
	r.reconcileMaasConsumerPortalConsoleLink(context.Background(), dashboard, cm)

	maasConsumerPortalCond := cm.GetCondition(conditionMaasConsumerPortalAvailable)
	require.NotNil(t, maasConsumerPortalCond)
	assert.Equal(t, metav1.ConditionFalse, maasConsumerPortalCond.Status)
	assert.Equal(t, "Disabled", maasConsumerPortalCond.Reason)
	assert.Equal(t, common.ConditionSeverityInfo, maasConsumerPortalCond.Severity)
	assert.True(t, cm.IsHappy(), "Ready must remain True when the maasConsumerPortalCond is disabled")
}

func TestReconcileMaasConsumerPortalConsoleLink_DisabledDeleteFails(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, clientgoscheme.AddToScheme(s))
	require.NoError(t, v1alpha1.AddToScheme(s))

	// Portal absent (disabled), but the best-effort delete hits a genuine
	// failure (not NotFound / CRD-not-installed, which are already treated as
	// success). The failure must be surfaced on the condition instead of a
	// misleading clean Disabled, while Info severity keeps Ready True.
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec:       v1alpha1.DashboardSpec{},
	}

	failingClient := fake.NewClientBuilder().WithScheme(s).WithInterceptorFuncs(interceptor.Funcs{
		Delete: func(context.Context, client.WithWatch, client.Object, ...client.DeleteOption) error {
			return errors.New("simulated delete failure")
		},
	}).Build()

	r := &DashboardReconciler{
		Client:            failingClient,
		Scheme:            s,
		ManifestsBasePath: t.TempDir(),
		Platform:          cluster.SelfManagedRhoai,
	}

	cm := maasConsumerPortalTestManager(t, dashboard)
	r.reconcileMaasConsumerPortalConsoleLink(context.Background(), dashboard, cm)

	maasConsumerPortalCond := cm.GetCondition(conditionMaasConsumerPortalAvailable)
	require.NotNil(t, maasConsumerPortalCond)
	assert.Equal(t, metav1.ConditionFalse, maasConsumerPortalCond.Status)
	assert.Equal(t, "MaasConsumerPortalDeleteFailed", maasConsumerPortalCond.Reason)
	assert.Equal(t, common.ConditionSeverityInfo, maasConsumerPortalCond.Severity)
	assert.True(t, cm.IsHappy(), "Ready must remain True even when the portal delete fails (Info severity)")
}
