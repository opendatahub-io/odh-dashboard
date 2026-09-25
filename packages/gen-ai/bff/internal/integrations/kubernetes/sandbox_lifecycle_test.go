package kubernetes

import (
	"context"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	apimeta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

var sandboxRouteGVK = schema.GroupVersionKind{Group: "route.openshift.io", Version: "v1", Kind: "Route"}

func newSandboxLifecycleClient(t *testing.T, objects ...client.Object) (*TokenKubernetesClient, client.Client) {
	t.Helper()
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	require.NoError(t, rbacv1.AddToScheme(scheme))

	restMapper := apimeta.NewDefaultRESTMapper(nil)
	restMapper.Add(schema.GroupVersionKind{Group: sandboxGroup, Version: sandboxVersion, Kind: sandboxKind}, apimeta.RESTScopeNamespace)
	restMapper.Add(sandboxRouteGVK, apimeta.RESTScopeNamespace)

	fakeClient := fake.NewClientBuilder().WithScheme(scheme).WithRESTMapper(restMapper).WithObjects(objects...).Build()
	return &TokenKubernetesClient{Client: fakeClient, Logger: slog.Default()}, fakeClient
}

func sandboxForLifecycleTest(namespace, name string) *unstructured.Unstructured {
	sandbox := sandboxCR(namespace, name)
	sandbox.SetUID(types.UID("sandbox-uid"))
	return sandbox
}

func TestSandboxDeploymentDependentsHaveSandboxOwner(t *testing.T) {
	const namespace = "test-ns"
	const sandboxName = "test-agent"
	llamaConfig := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "llama-config", Namespace: namespace}}
	wrapperConfig := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "wrapper-config", Namespace: namespace}}
	mcpAuthSecret := &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "agent-mcp-auth-1234", Namespace: namespace}}
	kc, fakeClient := newSandboxLifecycleClient(t, sandboxForLifecycleTest(namespace, sandboxName), llamaConfig, wrapperConfig, mcpAuthSecret)

	require.NoError(t, kc.SetSandboxConfigMapsOwner(context.Background(), namespace, sandboxName, llamaConfig.Name, wrapperConfig.Name))
	require.NoError(t, kc.SetSandboxMCPAuthSecretsOwner(context.Background(), namespace, sandboxName, mcpAuthSecret.Name))
	require.NoError(t, kc.CreateMLflowRoleBinding(context.Background(), namespace, sandboxName))
	require.NoError(t, kc.CreateSandboxService(context.Background(), namespace, sandboxName, map[string]string{"sandbox": sandboxName}))
	_, err := kc.CreateSandboxRoute(context.Background(), namespace, sandboxName)
	require.NoError(t, err)

	assertSandboxOwner := func(t *testing.T, refs []metav1.OwnerReference) {
		t.Helper()
		require.Len(t, refs, 1)
		assert.Equal(t, sandboxGroup+"/"+sandboxVersion, refs[0].APIVersion)
		assert.Equal(t, sandboxKind, refs[0].Kind)
		assert.Equal(t, sandboxName, refs[0].Name)
		assert.Equal(t, types.UID("sandbox-uid"), refs[0].UID)
		assert.True(t, *refs[0].Controller)
	}

	for _, name := range []string{llamaConfig.Name, wrapperConfig.Name} {
		cm := &corev1.ConfigMap{}
		require.NoError(t, fakeClient.Get(context.Background(), client.ObjectKey{Namespace: namespace, Name: name}, cm))
		assertSandboxOwner(t, cm.OwnerReferences)
	}
	secret := &corev1.Secret{}
	require.NoError(t, fakeClient.Get(context.Background(), client.ObjectKey{Namespace: namespace, Name: mcpAuthSecret.Name}, secret))
	assertSandboxOwner(t, secret.OwnerReferences)

	rb := &rbacv1.RoleBinding{}
	require.NoError(t, fakeClient.Get(context.Background(), client.ObjectKey{Namespace: namespace, Name: "mlflow-" + sandboxName}, rb))
	assertSandboxOwner(t, rb.OwnerReferences)

	svc := &corev1.Service{}
	require.NoError(t, fakeClient.Get(context.Background(), client.ObjectKey{Namespace: namespace, Name: sandboxName + "-ext"}, svc))
	assertSandboxOwner(t, svc.OwnerReferences)

	route := sandboxRoute(namespace, sandboxName)
	require.NoError(t, fakeClient.Get(context.Background(), client.ObjectKey{Namespace: namespace, Name: sandboxName}, route))
	assertSandboxOwner(t, route.GetOwnerReferences())
}

func TestRollbackSandboxDeploymentDeletesCreatedResources(t *testing.T) {
	const namespace = "test-ns"
	const sandboxName = "test-agent"
	resources := SandboxDeploymentResources{
		LlamaStackConfigMapName: "llama-config",
		WrapperAppConfigMapName: "wrapper-config",
		MCPAuthSecretNames:      []string{"agent-mcp-auth-1234"},
		SandboxName:             sandboxName,
		MLflowRoleBindingName:   "mlflow-" + sandboxName,
		ServiceName:             sandboxName + "-ext",
		RouteName:               sandboxName,
	}
	route := sandboxRoute(namespace, resources.RouteName)
	kc, fakeClient := newSandboxLifecycleClient(t,
		sandboxForLifecycleTest(namespace, sandboxName),
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: resources.LlamaStackConfigMapName, Namespace: namespace}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: resources.WrapperAppConfigMapName, Namespace: namespace}},
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: resources.MCPAuthSecretNames[0], Namespace: namespace}},
		&rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: resources.MLflowRoleBindingName, Namespace: namespace}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: resources.ServiceName, Namespace: namespace}},
		route,
	)

	kc.RollbackSandboxDeployment(context.Background(), namespace, resources)

	for _, obj := range []client.Object{
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: resources.LlamaStackConfigMapName, Namespace: namespace}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: resources.WrapperAppConfigMapName, Namespace: namespace}},
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: resources.MCPAuthSecretNames[0], Namespace: namespace}},
		&rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: resources.MLflowRoleBindingName, Namespace: namespace}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: resources.ServiceName, Namespace: namespace}},
		sandboxCR(namespace, resources.SandboxName),
		sandboxRoute(namespace, resources.RouteName),
	} {
		err := fakeClient.Get(context.Background(), client.ObjectKeyFromObject(obj), obj)
		assert.True(t, apierrors.IsNotFound(err), "expected %T to be deleted, got %v", obj, err)
	}
}
