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

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"
)

func TestExistingMaaSConsumerPortalOperatorNamespaces(t *testing.T) {
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
				&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalRhodsOperatorNamespace}},
			},
			want: map[string]struct{}{maasConsumerPortalRhodsOperatorNamespace: {}},
		},
		{
			name: "both exist",
			namespaces: []client.Object{
				&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalRhodsOperatorNamespace}},
				&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalOpenDataHubOperatorNamespace}},
			},
			want: map[string]struct{}{
				maasConsumerPortalRhodsOperatorNamespace:       {},
				maasConsumerPortalOpenDataHubOperatorNamespace: {},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cli := fake.NewClientBuilder().WithScheme(maasConsumerPortalScheme(t)).WithObjects(tt.namespaces...).Build()
			r := &DashboardReconciler{Client: cli}

			got, err := r.existingMaaSConsumerPortalOperatorNamespaces(context.Background())

			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMapMaaSConsumerPortalOperatorNamespaceToDashboard(t *testing.T) {
	r := &DashboardReconciler{}
	for _, namespace := range maasConsumerPortalOperatorNamespaces {
		t.Run(namespace, func(t *testing.T) {
			watched := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}
			requests := r.mapMaaSConsumerPortalOperatorNamespaceToDashboard(context.Background(), watched)
			require.Len(t, requests, 1)
			assert.Equal(t, v1alpha1.DashboardInstanceName, requests[0].Name)
			assert.Empty(t, requests[0].Namespace, "Dashboard is cluster-scoped, request should carry no namespace")
		})
	}

	unrelated := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "unrelated"}}
	assert.Empty(t, r.mapMaaSConsumerPortalOperatorNamespaceToDashboard(context.Background(), unrelated))
	assert.Empty(t, r.mapMaaSConsumerPortalOperatorNamespaceToDashboard(context.Background(), nil))
}

func TestExistingMaaSConsumerPortalOperatorNamespaces_PropagatesGetError(t *testing.T) {
	injectedErr := errors.New("namespace lookup failed")
	cli := fake.NewClientBuilder().
		WithScheme(maasConsumerPortalScheme(t)).
		WithInterceptorFuncs(interceptor.Funcs{
			Get: func(context.Context, client.WithWatch, client.ObjectKey, client.Object, ...client.GetOption) error {
				return injectedErr
			},
		}).
		Build()
	r := &DashboardReconciler{Client: cli}

	got, err := r.existingMaaSConsumerPortalOperatorNamespaces(context.Background())

	assert.Nil(t, got)
	assert.ErrorIs(t, err, injectedErr)
}

func TestFilterMaaSConsumerPortalResourcesByNamespaceCases(t *testing.T) {
	resources := []unstructured.Unstructured{
		{Object: map[string]interface{}{"kind": "Role", "metadata": map[string]interface{}{"name": maasConsumerPortalRhodsOperatorSubscriptionResourceName}}},
		{Object: map[string]interface{}{"kind": "RoleBinding", "metadata": map[string]interface{}{"name": maasConsumerPortalRhodsOperatorSubscriptionResourceName}}},
		{Object: map[string]interface{}{"kind": "Role", "metadata": map[string]interface{}{"name": maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName}}},
		{Object: map[string]interface{}{"kind": "RoleBinding", "metadata": map[string]interface{}{"name": maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName}}},
		{Object: map[string]interface{}{"kind": "Deployment", "metadata": map[string]interface{}{"name": maasConsumerPortalDeploymentName}}},
		{Object: map[string]interface{}{"kind": "ConfigMap", "metadata": map[string]interface{}{"name": maasConsumerPortalParamsConfigMapName}}},
	}
	tests := []struct {
		name               string
		operatorNamespaces map[string]struct{}
		wantNames          []string
	}{
		{
			name:               "no operator namespaces",
			operatorNamespaces: map[string]struct{}{},
			wantNames:          []string{maasConsumerPortalDeploymentName},
		},
		{
			name:               "one operator namespace",
			operatorNamespaces: map[string]struct{}{maasConsumerPortalRhodsOperatorNamespace: {}},
			wantNames: []string{
				maasConsumerPortalRhodsOperatorSubscriptionResourceName,
				maasConsumerPortalRhodsOperatorSubscriptionResourceName,
				maasConsumerPortalDeploymentName,
			},
		},
		{
			name: "both operator namespaces",
			operatorNamespaces: map[string]struct{}{
				maasConsumerPortalRhodsOperatorNamespace:       {},
				maasConsumerPortalOpenDataHubOperatorNamespace: {},
			},
			wantNames: []string{
				maasConsumerPortalRhodsOperatorSubscriptionResourceName,
				maasConsumerPortalRhodsOperatorSubscriptionResourceName,
				maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName,
				maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName,
				maasConsumerPortalDeploymentName,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := filterMaaSConsumerPortalResources(resources, tt.operatorNamespaces)
			names := make([]string, 0, len(got))
			for i := range got {
				names = append(names, got[i].GetName())
			}
			assert.Equal(t, tt.wantNames, names)
		})
	}
}

func TestDeleteMaaSConsumerPortalOperatorSubscriptionRBACResources_AcrossNamespaces(t *testing.T) {
	portalLabels := map[string]string{labels.PlatformPartOf: maasConsumerPortalPartOf}
	tests := []struct {
		name        string
		namespace   string
		labels      map[string]string
		wantDeleted bool
	}{
		{name: maasConsumerPortalRhodsOperatorSubscriptionResourceName, namespace: "old-operators", labels: portalLabels, wantDeleted: true},
		{name: maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName, namespace: "old-operators", labels: portalLabels, wantDeleted: true},
		{name: maasConsumerPortalRhodsOperatorSubscriptionResourceName, namespace: "new-operators", labels: portalLabels, wantDeleted: true},
		{name: maasConsumerPortalRhodsOperatorSubscriptionResourceName, namespace: maasConsumerPortalRhodsOperatorNamespace, labels: portalLabels, wantDeleted: true},
		{name: "unrelated-portal-role", namespace: "old-operators", labels: portalLabels},
		{name: maasConsumerPortalRhodsOperatorSubscriptionResourceName, namespace: "unlabeled-operators"},
		{name: maasConsumerPortalRhodsOperatorSubscriptionResourceName, namespace: "other-operators", labels: map[string]string{labels.PlatformPartOf: "other-operand"}},
	}
	var objects []client.Object
	for _, tt := range tests {
		metadata := metav1.ObjectMeta{Name: tt.name, Namespace: tt.namespace, Labels: tt.labels}
		objects = append(objects, &rbacv1.Role{ObjectMeta: metadata}, &rbacv1.RoleBinding{ObjectMeta: metadata})
	}
	cli := fake.NewClientBuilder().WithScheme(maasConsumerPortalScheme(t)).WithObjects(objects...).Build()
	r := &DashboardReconciler{Client: cli, Namespace: "new-operators"}
	ctx := context.Background()
	require.NoError(t, r.deleteLabeledMaaSConsumerPortalOperatorSubscriptionRBACResources(ctx))
	require.NoError(t, r.deleteLabeledMaaSConsumerPortalOperatorSubscriptionRBACResources(ctx), "cleanup must be idempotent")
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

func TestDeleteMaaSConsumerPortalOperatorSubscriptionRBACResources_ContinuesAfterDeleteError(t *testing.T) {
	metadata := metav1.ObjectMeta{
		Name:      maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName,
		Namespace: "old-operators",
		Labels:    map[string]string{labels.PlatformPartOf: maasConsumerPortalPartOf},
	}
	failedRole := &rbacv1.Role{ObjectMeta: metadata}
	objects := []client.Object{failedRole, &rbacv1.RoleBinding{ObjectMeta: metadata}}
	metadata.Name = maasConsumerPortalRhodsOperatorSubscriptionResourceName
	objects = append(objects, &rbacv1.Role{ObjectMeta: metadata}, &rbacv1.RoleBinding{ObjectMeta: metadata})
	injectedErr := errors.New("Role deletion failed")
	cli := fake.NewClientBuilder().
		WithScheme(maasConsumerPortalScheme(t)).
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

	require.ErrorIs(t, r.deleteLabeledMaaSConsumerPortalOperatorSubscriptionRBACResources(ctx), injectedErr)
	require.NoError(t, cli.Get(ctx, client.ObjectKeyFromObject(failedRole), failedRole))
	for _, resource := range objects[1:] {
		assert.True(t, apierrors.IsNotFound(cli.Get(ctx, client.ObjectKeyFromObject(resource), resource)),
			"%T %s/%s must be deleted despite the other grant's deletion failure", resource, resource.GetNamespace(), resource.GetName())
	}
}

func TestDeleteMaaSConsumerPortalOperatorSubscriptionRBACResources_PropagatesListErrors(t *testing.T) {
	roleErr := errors.New("Role list failed")
	bindingErr := errors.New("RoleBinding list failed")
	cli := fake.NewClientBuilder().
		WithScheme(maasConsumerPortalScheme(t)).
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

	err := r.deleteLabeledMaaSConsumerPortalOperatorSubscriptionRBACResources(context.Background())

	assert.ErrorIs(t, err, roleErr)
	assert.ErrorIs(t, err, bindingErr)
}

func TestDeployMaaSConsumerPortalBundle_OperatorSubscriptionRBACUsesExistingNamespace(t *testing.T) {
	base := writeMaaSConsumerPortalSubscriptionTestManifest(t)
	s := maasConsumerPortalScheme(t)
	cli := fake.NewClientBuilder().WithScheme(s).WithObjects(
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalRhodsOperatorNamespace}},
	).Build()
	r := &DashboardReconciler{Client: cli, Scheme: s, ManifestsBasePath: base, ApplicationsNamespace: maasConsumerPortalTestNamespace}
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec:       v1alpha1.DashboardSpec{Gateway: &v1alpha1.GatewaySpec{Domain: "apps.example.com"}},
	}

	require.NoError(t, r.deployMaaSConsumerPortalBundle(context.Background(), dashboard))

	role := &rbacv1.Role{}
	require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: maasConsumerPortalRhodsOperatorSubscriptionResourceName, Namespace: maasConsumerPortalRhodsOperatorNamespace}, role))
	roleBinding := &rbacv1.RoleBinding{}
	require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: maasConsumerPortalRhodsOperatorSubscriptionResourceName, Namespace: maasConsumerPortalRhodsOperatorNamespace}, roleBinding))
	assert.True(t, apierrors.IsNotFound(cli.Get(context.Background(), client.ObjectKey{Name: maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName, Namespace: maasConsumerPortalOpenDataHubOperatorNamespace}, &rbacv1.Role{})))
	assert.True(t, apierrors.IsNotFound(cli.Get(context.Background(), client.ObjectKey{Name: maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName, Namespace: maasConsumerPortalOpenDataHubOperatorNamespace}, &rbacv1.RoleBinding{})))
}

func TestDeployMaaSConsumerPortalBundle_PropagatesOperatorNamespaceLookupError(t *testing.T) {
	injectedErr := errors.New("namespace lookup failed")
	base := writeMaaSConsumerPortalSubscriptionTestManifest(t)
	cli := fake.NewClientBuilder().
		WithScheme(maasConsumerPortalScheme(t)).
		WithInterceptorFuncs(interceptor.Funcs{
			Get: func(context.Context, client.WithWatch, client.ObjectKey, client.Object, ...client.GetOption) error {
				return injectedErr
			},
		}).
		Build()
	r := &DashboardReconciler{Client: cli, ManifestsBasePath: base, ApplicationsNamespace: maasConsumerPortalTestNamespace}
	dashboard := &v1alpha1.Dashboard{
		ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName},
		Spec:       v1alpha1.DashboardSpec{Gateway: &v1alpha1.GatewaySpec{Domain: "apps.example.com"}},
	}

	err := r.deployMaaSConsumerPortalBundle(context.Background(), dashboard)

	assert.ErrorIs(t, err, injectedErr)
	assert.ErrorContains(t, err, "getting operator namespaces")
}

func writeMaaSConsumerPortalSubscriptionTestManifest(t *testing.T) string {
	t.Helper()
	base := t.TempDir()
	bundle := filepath.Join(base, "distributions", maasConsumerPortalDeploymentName)
	require.NoError(t, os.MkdirAll(bundle, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(bundle, "kustomization.yaml"), []byte("apiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nresources:\n  - rhods-role.yaml\n  - rhods-role-binding.yaml\n  - opendatahub-role.yaml\n  - opendatahub-role-binding.yaml\n"), 0644))
	for _, resource := range []struct {
		file string
		kind string
		name string
	}{
		{file: "rhods-role.yaml", kind: "Role", name: maasConsumerPortalRhodsOperatorSubscriptionResourceName},
		{file: "rhods-role-binding.yaml", kind: "RoleBinding", name: maasConsumerPortalRhodsOperatorSubscriptionResourceName},
		{file: "opendatahub-role.yaml", kind: "Role", name: maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName},
		{file: "opendatahub-role-binding.yaml", kind: "RoleBinding", name: maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName},
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

func TestMaaSConsumerPortalSubscriptionRBAC_AdditionalNamespaces(t *testing.T) {
	for _, namespace := range []string{"openshift-operators", "custom-operators"} {
		t.Run(namespace, func(t *testing.T) {
			scheme := maasConsumerPortalScheme(t)
			cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}).Build()
			r := &DashboardReconciler{Client: cli, Scheme: scheme, Namespace: namespace, ApplicationsNamespace: maasConsumerPortalTestNamespace, ManifestsBasePath: writeMaaSConsumerPortalSubscriptionTestManifest(t)}
			dashboard := &v1alpha1.Dashboard{ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DashboardInstanceName}, Spec: v1alpha1.DashboardSpec{Gateway: &v1alpha1.GatewaySpec{Domain: "apps.example.com"}}}
			require.NoError(t, r.deployMaaSConsumerPortalBundle(context.Background(), dashboard))
			for _, name := range []string{maasConsumerPortalRhodsOperatorSubscriptionResourceName, maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName} {
				require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: name, Namespace: namespace}, &rbacv1.Role{}))
				require.NoError(t, cli.Get(context.Background(), client.ObjectKey{Name: name, Namespace: namespace}, &rbacv1.RoleBinding{}))
			}
			require.Len(t, r.mapMaaSConsumerPortalOperatorNamespaceToDashboard(context.Background(), &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}), 1)
			require.NoError(t, r.deleteLabeledMaaSConsumerPortalOperatorSubscriptionRBACResources(context.Background()))
			roles := &rbacv1.RoleList{}
			require.NoError(t, cli.List(context.Background(), roles, client.InNamespace(namespace)))
			assert.Empty(t, roles.Items)
		})
	}
}

func TestMaaSConsumerPortalSubscriptionRBAC_ScopedAndDeduplicated(t *testing.T) {
	role := unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "rbac.authorization.k8s.io/v1", "kind": "Role", "metadata": map[string]interface{}{"name": maasConsumerPortalOpenDataHubOperatorSubscriptionResourceName},
		"rules": []interface{}{map[string]interface{}{"apiGroups": []interface{}{"operators.coreos.com"}, "resources": []interface{}{"subscriptions"}, "resourceNames": []interface{}{"opendatahub-operator"}, "verbs": []interface{}{"get"}}},
	}}
	for _, namespace := range []string{"openshift-operators", "custom-operators"} {
		resources := setMaaSConsumerPortalOperatorSubscriptionNamespaces([]unstructured.Unstructured{*role.DeepCopy()}, namespace)
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
