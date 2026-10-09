package controller

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	"sigs.k8s.io/controller-runtime/pkg/event"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
)

func TestExistingMaaSPortalOperatorNamespaces(t *testing.T) {
	tests := []struct {
		name       string
		namespaces []client.Object
		want       map[string]struct{}
	}{
		{
			name: "none exist",
			want: map[string]struct{}{},
		},
		{
			name: "only RHODS exists",
			namespaces: []client.Object{
				&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: maasPortalRhodsOperatorNamespace}},
			},
			want: map[string]struct{}{maasPortalRhodsOperatorNamespace: {}},
		},
		{
			name: "both exist",
			namespaces: []client.Object{
				&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: maasPortalRhodsOperatorNamespace}},
				&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: maasPortalOpenDataHubOperatorNamespace}},
			},
			want: map[string]struct{}{
				maasPortalRhodsOperatorNamespace:       {},
				maasPortalOpenDataHubOperatorNamespace: {},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(tt.namespaces...).Build()
			r := &DashboardReconciler{Client: cli}

			got, err := r.existingMaaSPortalOperatorNamespaces(context.Background())

			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMapMaaSPortalOperatorNamespaceToDashboard(t *testing.T) {
	r := &DashboardReconciler{}
	for _, namespace := range maasPortalOperatorNamespaces {
		t.Run(namespace, func(t *testing.T) {
			watched := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}
			requests := r.mapMaaSPortalOperatorNamespaceToDashboard(context.Background(), watched)
			require.Len(t, requests, 1)
			assert.Equal(t, v1alpha1.DashboardInstanceName, requests[0].Name)
			assert.Empty(t, requests[0].Namespace, "Dashboard is cluster-scoped, request should carry no namespace")
		})
	}

	unrelated := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "unrelated"}}
	assert.Empty(t, r.mapMaaSPortalOperatorNamespaceToDashboard(context.Background(), unrelated))
	assert.Empty(t, r.mapMaaSPortalOperatorNamespaceToDashboard(context.Background(), nil))
}

func TestMaaSPortalOperatorNamespacePredicate(t *testing.T) {
	r := &DashboardReconciler{Namespace: "custom-operators"}
	p := r.maasPortalOperatorNamespacePredicate()
	tests := []struct {
		name string
		obj  client.Object
		want bool
	}{
		{name: "RHODS", obj: &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: maasPortalRhodsOperatorNamespace}}, want: true},
		{name: "ODH", obj: &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: maasPortalOpenDataHubOperatorNamespace}}, want: true},
		{name: "OpenShift operators", obj: &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "openshift-operators"}}, want: true},
		{name: "configured operator namespace", obj: &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: r.Namespace}}, want: true},
		{name: "unrelated", obj: &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "unrelated"}}},
		{name: "nil"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, p.Create(event.CreateEvent{Object: tt.obj}))
			assert.Equal(t, tt.want, p.Update(event.UpdateEvent{ObjectOld: tt.obj, ObjectNew: tt.obj}))
			assert.Equal(t, tt.want, p.Delete(event.DeleteEvent{Object: tt.obj}))
			assert.Equal(t, tt.want, p.Generic(event.GenericEvent{Object: tt.obj}))
		})
	}
}

func TestExistingMaaSPortalOperatorNamespaces_PropagatesGetError(t *testing.T) {
	injectedErr := errors.New("namespace lookup failed")
	cli := fake.NewClientBuilder().
		WithScheme(maasPortalScheme(t)).
		WithInterceptorFuncs(interceptor.Funcs{
			Get: func(context.Context, client.WithWatch, client.ObjectKey, client.Object, ...client.GetOption) error {
				return injectedErr
			},
		}).
		Build()
	r := &DashboardReconciler{Client: cli}

	got, err := r.existingMaaSPortalOperatorNamespaces(context.Background())

	assert.Nil(t, got)
	assert.ErrorIs(t, err, injectedErr)
}

func TestFilterMaaSPortalResourcesByNamespaceCases(t *testing.T) {
	resources := []unstructured.Unstructured{
		{Object: map[string]interface{}{"kind": "Role", "metadata": map[string]interface{}{"name": maasPortalRhodsOperatorSubscriptionResourceName}}},
		{Object: map[string]interface{}{"kind": "RoleBinding", "metadata": map[string]interface{}{"name": maasPortalRhodsOperatorSubscriptionResourceName}}},
		{Object: map[string]interface{}{"kind": "Role", "metadata": map[string]interface{}{"name": maasPortalOpenDataHubOperatorSubscriptionResourceName}}},
		{Object: map[string]interface{}{"kind": "RoleBinding", "metadata": map[string]interface{}{"name": maasPortalOpenDataHubOperatorSubscriptionResourceName}}},
		{Object: map[string]interface{}{"kind": "Deployment", "metadata": map[string]interface{}{"name": maasPortalDeploymentName}}},
		{Object: map[string]interface{}{"kind": "ConfigMap", "metadata": map[string]interface{}{"name": maasPortalParamsConfigMapName}}},
	}
	tests := []struct {
		name               string
		operatorNamespaces map[string]struct{}
		wantNames          []string
	}{
		{
			name:               "no operator namespaces",
			operatorNamespaces: map[string]struct{}{},
			wantNames:          []string{maasPortalDeploymentName},
		},
		{
			name:               "one operator namespace",
			operatorNamespaces: map[string]struct{}{maasPortalRhodsOperatorNamespace: {}},
			wantNames: []string{
				maasPortalRhodsOperatorSubscriptionResourceName,
				maasPortalRhodsOperatorSubscriptionResourceName,
				maasPortalDeploymentName,
			},
		},
		{
			name: "both operator namespaces",
			operatorNamespaces: map[string]struct{}{
				maasPortalRhodsOperatorNamespace:       {},
				maasPortalOpenDataHubOperatorNamespace: {},
			},
			wantNames: []string{
				maasPortalRhodsOperatorSubscriptionResourceName,
				maasPortalRhodsOperatorSubscriptionResourceName,
				maasPortalOpenDataHubOperatorSubscriptionResourceName,
				maasPortalOpenDataHubOperatorSubscriptionResourceName,
				maasPortalDeploymentName,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := filterMaaSPortalResources(resources, tt.operatorNamespaces)
			names := make([]string, 0, len(got))
			for i := range got {
				names = append(names, got[i].GetName())
			}
			assert.Equal(t, tt.wantNames, names)
		})
	}
}

func TestDeleteMaaSPortalOperatorSubscriptionRBACResources_AcrossNamespaces(t *testing.T) {
	portalLabels := map[string]string{labels.PlatformPartOf: maasPortalPartOf}
	tests := []struct {
		name        string
		namespace   string
		labels      map[string]string
		wantDeleted bool
	}{
		{name: maasPortalRhodsOperatorSubscriptionResourceName, namespace: "old-operators", labels: portalLabels, wantDeleted: true},
		{name: maasPortalOpenDataHubOperatorSubscriptionResourceName, namespace: "old-operators", labels: portalLabels, wantDeleted: true},
		{name: maasPortalRhodsOperatorSubscriptionResourceName, namespace: "new-operators", labels: portalLabels, wantDeleted: true},
		{name: maasPortalRhodsOperatorSubscriptionResourceName, namespace: maasPortalRhodsOperatorNamespace, labels: portalLabels, wantDeleted: true},
		{name: "unrelated-portal-role", namespace: "old-operators", labels: portalLabels},
		{name: maasPortalRhodsOperatorSubscriptionResourceName, namespace: "unlabeled-operators"},
		{name: maasPortalRhodsOperatorSubscriptionResourceName, namespace: "other-operators", labels: map[string]string{labels.PlatformPartOf: "other-operand"}},
	}
	var objects []client.Object
	for _, tt := range tests {
		metadata := metav1.ObjectMeta{Name: tt.name, Namespace: tt.namespace, Labels: tt.labels}
		objects = append(objects, &rbacv1.Role{ObjectMeta: metadata}, &rbacv1.RoleBinding{ObjectMeta: metadata})
	}
	cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(objects...).Build()
	r := &DashboardReconciler{Client: cli, Namespace: "new-operators"}
	ctx := context.Background()
	require.NoError(t, r.deleteLabeledMaaSPortalOperatorSubscriptionRBACResources(ctx))
	require.NoError(t, r.deleteLabeledMaaSPortalOperatorSubscriptionRBACResources(ctx), "cleanup must be idempotent")
	for i, tt := range tests {
		for _, resource := range objects[2*i : 2*i+2] {
			err := cli.Get(ctx, client.ObjectKeyFromObject(resource), resource)
			if tt.wantDeleted {
				assert.True(t, apierrors.IsNotFound(err), "%T %s/%s must be deleted", resource, tt.namespace, tt.name)
			} else {
				require.NoError(t, err, "%T %s/%s must be retained", resource, tt.namespace, tt.name)
			}
		}
	}
}

func TestDeleteMaaSPortalOperatorSubscriptionRBACResources_ContinuesAfterDeleteError(t *testing.T) {
	metadata := metav1.ObjectMeta{
		Name:      maasPortalOpenDataHubOperatorSubscriptionResourceName,
		Namespace: "old-operators",
		Labels:    map[string]string{labels.PlatformPartOf: maasPortalPartOf},
	}
	failedRole := &rbacv1.Role{ObjectMeta: metadata}
	objects := []client.Object{failedRole, &rbacv1.RoleBinding{ObjectMeta: metadata}}
	metadata.Name = maasPortalRhodsOperatorSubscriptionResourceName
	objects = append(objects, &rbacv1.Role{ObjectMeta: metadata}, &rbacv1.RoleBinding{ObjectMeta: metadata})
	injectedErr := errors.New("Role deletion failed")
	cli := fake.NewClientBuilder().
		WithScheme(maasPortalScheme(t)).
		WithObjects(objects...).
		WithInterceptorFuncs(interceptor.Funcs{
			Delete: func(ctx context.Context, delegate client.WithWatch, resource client.Object, opts ...client.DeleteOption) error {
				if _, isRole := resource.(*rbacv1.Role); isRole && client.ObjectKeyFromObject(resource) == client.ObjectKeyFromObject(failedRole) {
					return injectedErr
				}
				return delegate.Delete(ctx, resource, opts...)
			},
		}).
		Build()
	r := &DashboardReconciler{Client: cli, Namespace: "new-operators"}
	ctx := context.Background()

	require.ErrorIs(t, r.deleteLabeledMaaSPortalOperatorSubscriptionRBACResources(ctx), injectedErr)
	require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(failedRole), failedRole))
	for _, resource := range objects[1:] {
		assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(resource), resource)),
			"%T %s/%s must be deleted despite the other grant's deletion failure", resource, resource.GetNamespace(), resource.GetName())
	}
}

func TestDeleteMaaSPortalOperatorSubscriptionRBACResources_PropagatesListErrors(t *testing.T) {
	roleErr := errors.New("Role list failed")
	bindingErr := errors.New("RoleBinding list failed")
	cli := fake.NewClientBuilder().
		WithScheme(maasPortalScheme(t)).
		WithInterceptorFuncs(interceptor.Funcs{
			List: func(_ context.Context, _ client.WithWatch, list client.ObjectList, _ ...client.ListOption) error {
				if _, isRoleList := list.(*rbacv1.RoleList); isRoleList {
					return roleErr
				}
				return bindingErr
			},
		}).
		Build()
	r := &DashboardReconciler{Client: cli}

	err := r.deleteLabeledMaaSPortalOperatorSubscriptionRBACResources(context.Background())

	assert.ErrorIs(t, err, roleErr)
	assert.ErrorIs(t, err, bindingErr)
}

func TestDeployMaaSPortalBundle_OperatorSubscriptionRBACUsesExistingNamespace(t *testing.T) {
	base := writeMaaSPortalSubscriptionTestManifest(t)
	s := maasPortalScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: maasPortalRhodsOperatorNamespace}},
	).Build()
	r := &DashboardReconciler{Client: cli, Scheme: s, ManifestsBasePath: base, ApplicationsNamespace: maasPortalTestNamespace}
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec:       v1alpha1.DashboardSpec{Gateway: &v1alpha1.GatewaySpec{Domain: "apps.example.com"}},
	}

	result, err := r.deployMaaSPortalBundle(context.Background(), dashboard)
	require.NoError(t, err)
	assert.False(t, result.Pending)

	role := &rbacv1.Role{}
	require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: maasPortalRhodsOperatorSubscriptionResourceName, Namespace: maasPortalRhodsOperatorNamespace}, role))
	roleBinding := &rbacv1.RoleBinding{}
	require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: maasPortalRhodsOperatorSubscriptionResourceName, Namespace: maasPortalRhodsOperatorNamespace}, roleBinding))
	assert.True(t, apierrors.IsNotFound(cli.Get(context.Background(), client.ObjectKey{Name: maasPortalOpenDataHubOperatorSubscriptionResourceName, Namespace: maasPortalOpenDataHubOperatorNamespace}, &rbacv1.Role{})))
	assert.True(t, apierrors.IsNotFound(cli.Get(context.Background(), client.ObjectKey{Name: maasPortalOpenDataHubOperatorSubscriptionResourceName, Namespace: maasPortalOpenDataHubOperatorNamespace}, &rbacv1.RoleBinding{})))
}

func TestDeployMaaSPortalBundle_PropagatesOperatorNamespaceLookupError(t *testing.T) {
	injectedErr := errors.New("namespace lookup failed")
	base := writeMaaSPortalSubscriptionTestManifest(t)
	cli := fake.NewClientBuilder().
		WithScheme(maasPortalScheme(t)).
		WithInterceptorFuncs(interceptor.Funcs{
			Get: func(context.Context, client.WithWatch, client.ObjectKey, client.Object, ...client.GetOption) error {
				return injectedErr
			},
		}).
		Build()
	r := &DashboardReconciler{Client: cli, ManifestsBasePath: base, ApplicationsNamespace: maasPortalTestNamespace}
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec:       v1alpha1.DashboardSpec{Gateway: &v1alpha1.GatewaySpec{Domain: "apps.example.com"}},
	}

	_, err := r.deployMaaSPortalBundle(context.Background(), dashboard)

	assert.ErrorIs(t, err, injectedErr)
	assert.ErrorContains(t, err, "getting operator namespaces")
}

func writeMaaSPortalSubscriptionTestManifest(t *testing.T) string {
	t.Helper()
	base := t.TempDir()
	bundle := filepath.Join(base, "distributions", maasPortalDeploymentName)
	require.NoError(t, os.MkdirAll(bundle, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "kustomization.yaml"), []byte("apiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nresources:\n  - rhods-role.yaml\n  - rhods-role-binding.yaml\n  - opendatahub-role.yaml\n  - opendatahub-role-binding.yaml\n"), 0644))
	for _, resource := range []struct {
		file string
		kind string
		name string
	}{
		{file: "rhods-role.yaml", kind: "Role", name: maasPortalRhodsOperatorSubscriptionResourceName},
		{file: "rhods-role-binding.yaml", kind: "RoleBinding", name: maasPortalRhodsOperatorSubscriptionResourceName},
		{file: "opendatahub-role.yaml", kind: "Role", name: maasPortalOpenDataHubOperatorSubscriptionResourceName},
		{file: "opendatahub-role-binding.yaml", kind: "RoleBinding", name: maasPortalOpenDataHubOperatorSubscriptionResourceName},
	} {
		content := fmt.Sprintf("apiVersion: rbac.authorization.k8s.io/v1\nkind: %s\nmetadata:\n  name: %s\n", resource.kind, resource.name)
		if resource.kind == "Role" {
			content += "rules: []\n"
		} else {
			content += fmt.Sprintf("roleRef:\n  apiGroup: rbac.authorization.k8s.io\n  kind: Role\n  name: %s\nsubjects: []\n", resource.name)
		}
		require.NoError(t, os.WriteFile(filepath.Join(bundle, resource.file), []byte(content), 0644))
	}
	return base
}

func TestMaaSPortalSubscriptionRBAC_AdditionalNamespaces(t *testing.T) {
	for _, namespace := range []string{"openshift-operators", "custom-operators"} {
		t.Run(namespace, func(t *testing.T) {
			scheme := maasPortalScheme(t)
			cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}).Build()
			r := &DashboardReconciler{Client: cli, Scheme: scheme, Namespace: namespace, ApplicationsNamespace: maasPortalTestNamespace, ManifestsBasePath: writeMaaSPortalSubscriptionTestManifest(t)}
			dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName}, Spec: v1alpha1.DashboardSpec{Gateway: &v1alpha1.GatewaySpec{Domain: "apps.example.com"}}}
			result, err := r.deployMaaSPortalBundle(context.Background(), dashboard)
			require.NoError(t, err)
			assert.False(t, result.Pending)
			for _, name := range []string{maasPortalRhodsOperatorSubscriptionResourceName, maasPortalOpenDataHubOperatorSubscriptionResourceName} {
				require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: name, Namespace: namespace}, &rbacv1.Role{}))
				require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: name, Namespace: namespace}, &rbacv1.RoleBinding{}))
			}
			require.Len(t, r.mapMaaSPortalOperatorNamespaceToDashboard(context.Background(), &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}), 1)
			require.NoError(t, r.deleteLabeledMaaSPortalOperatorSubscriptionRBACResources(context.Background()))
			roles := &rbacv1.RoleList{}
			require.NoError(t, cli.List(context.Background(), roles, client.InNamespace(namespace)))
			assert.Empty(t, roles.Items)
		})
	}
}

func TestMaaSPortalSubscriptionRBAC_ScopedAndDeduplicated(t *testing.T) {
	role := unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "rbac.authorization.k8s.io/v1", "kind": "Role", "metadata": map[string]interface{}{"name": maasPortalOpenDataHubOperatorSubscriptionResourceName},
		"rules": []interface{}{map[string]interface{}{"apiGroups": []interface{}{"operators.coreos.com"}, "resources": []interface{}{"subscriptions"}, "resourceNames": []interface{}{"opendatahub-operator"}, "verbs": []interface{}{"get"}}},
	}}
	for _, namespace := range []string{"openshift-operators", "custom-operators"} {
		resources := setMaaSPortalOperatorSubscriptionNamespaces([]unstructured.Unstructured{*role.DeepCopy()}, namespace)
		seen := map[string]bool{}
		for _, resource := range resources {
			assert.False(t, seen[resource.GetNamespace()], "duplicate Role in %s", resource.GetNamespace())
			seen[resource.GetNamespace()] = true
			assert.Equal(t, role.Object["rules"], resource.Object["rules"])
		}
		assert.True(t, seen[namespace])
		assert.True(t, seen["openshift-operators"])
	}
}
