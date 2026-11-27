package controller

import (
	"context"
	"errors"
	"testing"

	routev1 "github.com/openshift/api/route/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// status.url is last-known-good: a transient Route failure must keep the published URL and schedule a
// re-check after a read failure, since the Route watch does not fire when the Route itself did not
// change. A missing or unadmitted Route is watch-driven and must not add a polling loop.
func TestReconcileURLKeepsLastKnownGoodAndRequeues(t *testing.T) {
	const namespace = "applications"
	const previousURL = "https://dashboard.apps.example.com"
	scheme := runtime.NewScheme()
	require.NoError(t, routev1.AddToScheme(scheme))
	admittedRoute := &routev1.Route{
		ObjectMeta: metav1.ObjectMeta{Name: "dashboard", Namespace: namespace, Labels: map[string]string{labels.PlatformPartOf: "dashboard"}},
		Status: routev1.RouteStatus{Ingress: []routev1.RouteIngress{{
			Host:       "dashboard.apps.new.example.com",
			Conditions: []routev1.RouteIngressCondition{{Type: routev1.RouteAdmitted, Status: "True"}},
		}}},
	}

	tests := []struct {
		name       string
		reader     client.Reader
		wantURL    string
		wantRetry  bool
		wantReason string
		// wantMessage is checked instead of the reason when set: WithError owns the reason.
		wantMessage string
	}{
		{
			name:       "route not admitted",
			reader:     fake.NewClientBuilder().WithScheme(scheme).Build(),
			wantURL:    previousURL,
			wantReason: "RouteNotReady",
		},
		{
			name: "route read fails",
			reader: fake.NewClientBuilder().WithScheme(scheme).WithInterceptorFuncs(interceptor.Funcs{
				List: func(context.Context, client.WithWatch, client.ObjectList, ...client.ListOption) error {
					return errors.New("API unavailable")
				},
			}).Build(),
			wantURL:     previousURL,
			wantRetry:   true,
			wantMessage: "API unavailable",
		},
		{
			name:       "route admitted",
			reader:     fake.NewClientBuilder().WithScheme(scheme).WithObjects(admittedRoute).Build(),
			wantURL:    "https://dashboard.apps.new.example.com",
			wantReason: "NoDegradation",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dashboard := &v1alpha1.Dashboard{Status: v1alpha1.DashboardStatus{URL: previousURL}}
			cm := conditions.NewManager(dashboard, string(common.ConditionTypeReady), string(common.ConditionTypeDegraded))
			r := &DashboardReconciler{APIReader: tt.reader, ApplicationsNamespace: namespace, Platform: cluster.OpenDataHub}

			url, retryAfter := r.reconcileURL(context.Background(), dashboard, cm)

			assert.Equal(t, tt.wantURL, url)
			assert.Equal(t, tt.wantURL, dashboard.Status.URL)
			if tt.wantRetry {
				assert.Equal(t, dashboardURLRetryInterval, retryAfter)
			} else {
				assert.Zero(t, retryAfter)
			}
			degraded := cm.GetCondition(string(common.ConditionTypeDegraded))
			require.NotNil(t, degraded)
			if tt.wantMessage != "" {
				assert.Contains(t, degraded.Message, tt.wantMessage)
			} else {
				assert.Equal(t, tt.wantReason, degraded.Reason)
			}
			assert.True(t, cm.IsHappy(), "legacy Route problems are Info-severity and must not fail Ready")
		})
	}
}
