package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestFederationDuringObservabilityDetectionFailure(t *testing.T) {
	for _, portal := range []bool{false, true} {
		name := federationConfigMapName
		if portal {
			name = maasPortalFederationConfigMapName
		}
		for _, tt := range []struct {
			name, existing                   string
			wantPerses, readFails, wantError bool
		}{
			{name: "first installation"},
			{name: "updates modules and preserves Perses", existing: `[{"name":"obsolete"},{"name":"perses","extra":"preserved"}]`, wantPerses: true},
			{name: "updates modules without Perses", existing: `[{"name":"obsolete"}]`},
			{name: "malformed existing configuration is retained", existing: "invalid JSON", wantError: true},
			{name: "invalid entry name is retained", existing: `[{"name":123}]`, wantError: true},
			{name: "read failure does not overwrite existing configuration", existing: `[{"name":"perses"}]`, readFails: true, wantError: true},
		} {
			t.Run(name+"/"+tt.name, func(t *testing.T) {
				readFails := tt.readFails
				scheme := maasPortalScheme(t)
				builder := fake.NewClientBuilder().WithScheme(scheme)
				key := client.ObjectKey{Name: name, Namespace: "applications"}
				if tt.existing != "" {
					builder.WithObjects(&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: key.Name, Namespace: key.Namespace},
						Data: map[string]string{federationConfigKey: tt.existing}})
				}
				cli := builder.WithInterceptorFuncs(interceptor.Funcs{
					Get: func(ctx context.Context, delegate client.WithWatch, request client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
						if readFails && request == key {
							return assert.AnError
						}
						return delegate.Get(ctx, request, obj, opts...)
					},
				}).Build()
				r := &DashboardReconciler{Client: cli, Scheme: scheme, ApplicationsNamespace: key.Namespace, Platform: cluster.SelfManagedRhoai}
				dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
					Spec: v1alpha1.DashboardSpec{MaaSPortal: &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"}}}
				statuses := map[string]v1alpha1.ModuleStatus{"maas": {Phase: v1alpha1.ModulePhaseDeployed}}
				ctx := context.Background()
				var err error
				if portal {
					err = r.deployMaaSPortalFederationConfigMap(ctx, dashboard, statuses, false)
				} else {
					_, err = r.deployFederationConfigMap(ctx, statuses, dashboard, false)
				}
				if tt.readFails {
					require.ErrorIs(t, err, assert.AnError)
				} else if tt.wantError {
					require.Error(t, err)
				} else {
					require.NoError(t, err)
				}
				retained := &corev1.ConfigMap{}
				readFails = false
				require.NoError(t, cli.Get(ctx, key, retained))
				if tt.wantError {
					assert.Equal(t, tt.existing, retained.Data[federationConfigKey])
					return
				}
				var entries []map[string]any
				require.NoError(t, json.Unmarshal([]byte(retained.Data[federationConfigKey]), &entries))
				byName := make(map[string]map[string]any)
				for _, entry := range entries {
					byName[entry["name"].(string)] = entry
				}
				assert.Contains(t, byName, "maas")
				assert.NotContains(t, byName, "obsolete")
				assert.NotContains(t, byName, "genAi")
				if tt.wantPerses {
					require.Contains(t, byName, "perses")
					assert.Equal(t, "preserved", byName["perses"]["extra"])
				} else {
					assert.NotContains(t, byName, "perses")
				}
			})
		}
	}
}

func TestRemovedDetectionFailureEarlyErrorUpdatesPhase(t *testing.T) {
	for _, failure := range []string{"ModuleDeployFailed", "TeardownFailed"} {
		t.Run(failure, func(t *testing.T) {
			scheme := maasPortalScheme(t)
			dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName, Finalizers: []string{dashboardFinalizer}},
				Spec: v1alpha1.DashboardSpec{ManagementSpec: common.ManagementSpec{ManagementState: "Removed"},
					MaaSPortal: &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"}},
				Status: v1alpha1.DashboardStatus{Status: common.Status{Phase: common.PhaseReady}}}
			cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(dashboard).WithStatusSubresource(dashboard).
				WithInterceptorFuncs(interceptor.Funcs{
					Get: func(ctx context.Context, delegate client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
						if _, service := obj.(*corev1.Service); service && key.Name == persesServiceName {
							return assert.AnError
						}
						return delegate.Get(ctx, key, obj, opts...)
					},
					List: func(ctx context.Context, delegate client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
						options := &client.ListOptions{}
						for _, opt := range opts {
							opt.ApplyToList(options)
						}
						// Module cleanup uses an additional component selector. Teardown
						// lists all resources with just the dashboard ownership label.
						if failure == "ModuleDeployFailed" || options.LabelSelector.String() == labels.PlatformPartOf+"=dashboard" {
							return assert.AnError
						}
						return delegate.List(ctx, list, opts...)
					},
				}).Build()
			r := &DashboardReconciler{Client: cli, Scheme: scheme, Platform: cluster.SelfManagedRhoai, ApplicationsNamespace: "applications"}
			ctx := context.Background()
			key := client.ObjectKeyFromObject(dashboard)
			_, err := r.Reconcile(ctx, ctrl.Request{NamespacedName: key})
			require.ErrorIs(t, err, assert.AnError)
			updated := &v1alpha1.Dashboard{}
			require.NoError(t, cli.Get(ctx, key, updated))
			assert.Equal(t, common.PhaseNotReady, updated.Status.Phase)
			assert.Equal(t, "DetectionFailed", conditions.FindStatusCondition(updated, conditionObservabilityAvailable).Reason)
			assert.Equal(t, failure, conditions.FindStatusCondition(updated, string(common.ConditionTypeProvisioningSucceeded)).Reason)
		})
	}
}

func TestCleanupLegacyLocalObservabilityIsBounded(t *testing.T) {
	scheme := maasPortalScheme(t)
	legacy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "dashboard-perses-access", Namespace: "applications",
		Labels: map[string]string{labels.PlatformPartOf: "dashboard"}}}
	core := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "dashboard-core-access", Namespace: "applications", Labels: legacy.Labels}}
	unowned := legacy.DeepCopy()
	unowned.Namespace = "other"
	unowned.Labels = nil
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(legacy, core, unowned).Build()
	r := &DashboardReconciler{Client: cli, Scheme: scheme, ApplicationsNamespace: "applications"}
	ctx := context.Background()
	require.NoError(t, r.cleanupManagedObservability(ctx, &v1alpha1.Dashboard{}))
	assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(legacy), &networkingv1.NetworkPolicy{})))
	for _, retained := range []client.Object{core, unowned} {
		require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(retained), &networkingv1.NetworkPolicy{}))
	}
}

func TestCleanupLegacyLocalObservabilityOwnership(t *testing.T) {
	perses := &unstructured.Unstructured{}
	perses.SetGroupVersionKind(persesdashboardGVK.GroupVersion().WithKind("PersesDashboard"))
	perses.SetName("dashboard-1-model")
	for _, resource := range []client.Object{
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: persesServiceName}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "perses-dashboard-config"}},
		&networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "dashboard-perses-access"}},
		perses,
	} {
		for _, ownership := range []string{"legacy", "unowned", "other component", "other namespace"} {
			t.Run(resource.GetName()+"/"+ownership, func(t *testing.T) {
				obj := resource.DeepCopyObject().(client.Object)
				obj.SetNamespace("applications")
				obj.SetLabels(map[string]string{labels.PlatformPartOf: "dashboard"})
				switch ownership {
				case "unowned":
					obj.SetLabels(nil)
				case "other component":
					obj.SetLabels(map[string]string{labels.PlatformPartOf: "dashboard", moduleComponentLabel: "core"})
				case "other namespace":
					obj.SetNamespace("other")
				}
				scheme := maasPortalScheme(t)
				cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(obj).Build()
				r := &DashboardReconciler{Client: cli, Scheme: scheme, ApplicationsNamespace: "applications"}
				ctx := context.Background()
				require.NoError(t, r.cleanupManagedObservability(ctx, &v1alpha1.Dashboard{}))
				err := cli.Get(ctx, client.ObjectKeyFromObject(obj), obj.DeepCopyObject().(client.Object))
				if ownership == "legacy" {
					assert.True(t, apierrors.IsNotFound(err), "legacy resource should be deleted: %v", err)
				} else {
					require.NoError(t, err, "unrelated resource should be retained")
				}
			})
		}
	}
}

func TestCleanupObservabilityPreservesOperatorResources(t *testing.T) {
	for _, configName := range []string{"odh-dashboard-config", "perses-dashboard-config"} {
		t.Run(configName, func(t *testing.T) {
			t.Setenv("OPERATOR_CONFIGMAP_NAME", configName)
			for _, componentLabel := range []bool{false, true} {
				t.Run(fmt.Sprintf("component label %t", componentLabel), func(t *testing.T) {
					scheme := maasPortalScheme(t)
					ownership := map[string]string{labels.PlatformPartOf: "dashboard"}
					if componentLabel {
						ownership[moduleComponentLabel] = observabilityComponent
					}
					config := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: configName, Namespace: "operators", Labels: ownership}}
					webhook := &corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: operatorDeploymentName + "-webhook", Namespace: "operators", Labels: ownership}}
					legacy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "dashboard-perses-access", Namespace: "operators", Labels: ownership}}
					unrelated := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: "operator-access", Namespace: "operators", Labels: map[string]string{labels.PlatformPartOf: "dashboard"}}}
					cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(config, webhook, legacy, unrelated).Build()
					r := &DashboardReconciler{Client: cli, Scheme: scheme, Namespace: "operators", ApplicationsNamespace: "applications"}
					dashboard := &v1alpha1.Dashboard{Spec: v1alpha1.DashboardSpec{Observability: &v1alpha1.ObservabilitySpec{
						Enabled: false, PersesService: &v1alpha1.ServiceTarget{Name: persesServiceName, Namespace: "operators", Port: 8080},
					}}}
					ctx := context.Background()
					for range 2 {
						require.NoError(t, r.cleanupManagedObservability(ctx, dashboard))
						for _, retained := range []client.Object{config, webhook, unrelated} {
							require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(retained), retained.DeepCopyObject().(client.Object)))
						}
						assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(legacy), &networkingv1.NetworkPolicy{})))
					}
				})
			}
		})
	}
}

func TestPortalFederationPreservationFailureStillReconcilesBundle(t *testing.T) {
	scheme := maasPortalScheme(t)
	base := t.TempDir()
	bundle := filepath.Join(base, "distributions", maasPortalDeploymentName)
	require.NoError(t, os.MkdirAll(bundle, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "kustomization.yaml"), []byte(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
`), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "configmap.yaml"), []byte(`apiVersion: v1
kind: ConfigMap
metadata:
  name: portal-bundle-config
data:
  key: updated
`), 0644))
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec: v1alpha1.DashboardSpec{
			Gateway:    &v1alpha1.GatewaySpec{Domain: "apps.example.com"},
			MaaSPortal: &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"},
		},
	}
	federation := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: maasPortalFederationConfigMapName, Namespace: "applications"},
		Data:       map[string]string{federationConfigKey: "invalid JSON"},
	}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(federation).Build()
	r := &DashboardReconciler{Client: cli, Scheme: scheme, ManifestsBasePath: base,
		ApplicationsNamespace: "applications", Platform: cluster.SelfManagedRhoai}
	cm := maasPortalTestManager(t, dashboard)
	ctx := context.Background()
	retry := r.reconcileMaaSPortalOperand(ctx, dashboard, cm, nil, false)
	assert.Equal(t, maasPortalRetryInterval, retry)
	condition := conditions.FindStatusCondition(dashboard, conditionMaaSPortalAvailable)
	require.NotNil(t, condition)
	assert.Equal(t, metav1.ConditionFalse, condition.Status)
	assert.Equal(t, "MaaSPortalFederationConfigMapFailed", condition.Reason)
	applied := &corev1.ConfigMap{}
	require.NoError(t, cli.Get(ctx, client.ObjectKey{Name: "portal-bundle-config", Namespace: "applications"}, applied))
	assert.Equal(t, "updated", applied.Data["key"])
	require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(federation), applied))
	assert.Equal(t, federation.Data, applied.Data)
}
