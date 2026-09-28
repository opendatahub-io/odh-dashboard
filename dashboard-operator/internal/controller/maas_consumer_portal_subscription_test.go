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

func TestDeleteMaaSConsumerPortalOperatorSubscriptionRBACResources_OnlyExistingNamespace(t *testing.T) {
	portalLabels := map[string]string{labels.PlatformPartOf: maasConsumerPortalPartOf}
	role := &rbacv1.Role{ObjectMeta: metav1.ObjectMeta{
		Name:      maasConsumerPortalRhodsOperatorSubscriptionResourceName,
		Namespace: maasConsumerPortalRhodsOperatorNamespace,
		Labels:    portalLabels,
	}}
	roleBinding := &rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{
		Name:      maasConsumerPortalRhodsOperatorSubscriptionResourceName,
		Namespace: maasConsumerPortalRhodsOperatorNamespace,
		Labels:    portalLabels,
	}}
	cli := fake.NewClientBuilder().WithScheme(maasConsumerPortalScheme(t)).WithObjects(
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: maasConsumerPortalRhodsOperatorNamespace}},
		role,
		roleBinding,
	).Build()
	r := &DashboardReconciler{Client: cli}

	require.NoError(t, r.deleteLabeledMaaSConsumerPortalOperatorSubscriptionRBACResources(context.Background()))

	assert.True(t, apierrors.IsNotFound(cli.Get(context.Background(), client.ObjectKeyFromObject(role), &rbacv1.Role{})))
	assert.True(t, apierrors.IsNotFound(cli.Get(context.Background(), client.ObjectKeyFromObject(roleBinding), &rbacv1.RoleBinding{})))
}

func TestDeleteMaaSConsumerPortalOperatorSubscriptionRBACResources_PropagatesNamespaceLookupError(t *testing.T) {
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

	err := r.deleteLabeledMaaSConsumerPortalOperatorSubscriptionRBACResources(context.Background())

	assert.ErrorIs(t, err, injectedErr)
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
