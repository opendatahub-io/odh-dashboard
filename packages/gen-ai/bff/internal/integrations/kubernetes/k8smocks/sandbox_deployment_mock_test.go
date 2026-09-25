package k8smocks

import (
	"context"
	"io"
	"log/slog"
	"testing"

	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestMockSandboxDeploymentPersistsResources(t *testing.T) {
	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	sandbox := mockSandbox("", "")
	ctrlClient := fake.NewClientBuilder().WithStatusSubresource(sandbox).Build()
	mockClient := &TokenKubernetesClientMock{TokenKubernetesClient: &k8s.TokenKubernetesClient{
		Client: ctrlClient,
		Logger: logger,
	}}

	const namespace = "mock-agent-namespace"
	const profileID = "12345678-1234-1234-1234-123456789abc"
	llamaConfig, err := mockClient.CreateSandboxConfigMap(ctx, namespace, profileID, "version: '2'")
	require.NoError(t, err)
	wrapperConfig, err := mockClient.CreateWrapperAppConfigMap(ctx, namespace, profileID, "print('mock')")
	require.NoError(t, err)

	sandboxName, err := mockClient.CreateSandboxCR(ctx, namespace, k8s.SandboxCROptions{
		Name:                    "mock-agent",
		ProfileID:               profileID,
		LlamaStackConfigMapName: llamaConfig.Name,
		WrapperAppConfigMapName: wrapperConfig.Name,
		Image:                   "example.com/ogx:mock",
	})
	require.NoError(t, err)
	require.Equal(t, "mock-agent", sandboxName)

	// controller-runtime's fake client does not allocate UIDs for unstructured
	// custom resources. The envtest API server used by the running mock BFF does.
	createdSandbox := mockSandbox(namespace, sandboxName)
	require.NoError(t, ctrlClient.Get(ctx, client.ObjectKeyFromObject(createdSandbox), createdSandbox))
	createdSandbox.SetUID(types.UID("mock-sandbox-uid"))
	require.NoError(t, ctrlClient.Update(ctx, createdSandbox))

	selector, err := mockClient.WaitForSandboxSelector(ctx, namespace, sandboxName)
	require.NoError(t, err)
	require.Equal(t, map[string]string{"agents.x-k8s.io/sandbox-name-hash": "mockhash"}, selector)

	secret, err := mockClient.CreateSandboxMCPAuthSecret(ctx, namespace, "github", "token")
	require.NoError(t, err)
	modelSecret, err := mockClient.CreateSandboxModelAuthSecret(ctx, namespace, "custom-endpoint-key")
	require.NoError(t, err)
	require.NoError(t, mockClient.SetSandboxConfigMapsOwner(ctx, namespace, sandboxName, llamaConfig.Name, wrapperConfig.Name))
	require.NoError(t, mockClient.SetSandboxMCPAuthSecretsOwner(ctx, namespace, sandboxName, secret.Name, modelSecret.Name))
	require.NoError(t, mockClient.CreateSandboxService(ctx, namespace, sandboxName, selector))
	routeURL, err := mockClient.CreateSandboxRoute(ctx, namespace, sandboxName)
	require.NoError(t, err)
	require.Equal(t, "https://mock-agent-mock-agent-namespace.apps.example.com", routeURL)

	createdSandbox = mockSandbox(namespace, sandboxName)
	require.NoError(t, ctrlClient.Get(ctx, client.ObjectKeyFromObject(createdSandbox), createdSandbox))
	statusSelector, found, err := unstructured.NestedString(createdSandbox.Object, "status", "selector")
	require.NoError(t, err)
	require.True(t, found)
	require.Equal(t, "agents.x-k8s.io/sandbox-name-hash=mockhash", statusSelector)

	createdConfig := &corev1.ConfigMap{}
	require.NoError(t, ctrlClient.Get(ctx, client.ObjectKey{Namespace: namespace, Name: llamaConfig.Name}, createdConfig))
	require.Len(t, createdConfig.OwnerReferences, 1)
	require.Equal(t, sandboxName, createdConfig.OwnerReferences[0].Name)

	createdSecret := &corev1.Secret{}
	require.NoError(t, ctrlClient.Get(ctx, client.ObjectKey{Namespace: namespace, Name: secret.Name}, createdSecret))
	require.Len(t, createdSecret.OwnerReferences, 1)
	require.Equal(t, sandboxName, createdSecret.OwnerReferences[0].Name)

	createdModelSecret := &corev1.Secret{}
	require.NoError(t, ctrlClient.Get(ctx, client.ObjectKey{Namespace: namespace, Name: modelSecret.Name}, createdModelSecret))
	require.Len(t, createdModelSecret.OwnerReferences, 1)
	require.Equal(t, sandboxName, createdModelSecret.OwnerReferences[0].Name)

	service := &corev1.Service{}
	require.NoError(t, ctrlClient.Get(ctx, client.ObjectKey{Namespace: namespace, Name: sandboxName + "-ext"}, service))
	require.Equal(t, selector, service.Spec.Selector)
	require.Len(t, service.OwnerReferences, 1)

	route := &unstructured.Unstructured{}
	route.SetAPIVersion("route.openshift.io/v1")
	route.SetKind("Route")
	require.NoError(t, ctrlClient.Get(ctx, client.ObjectKey{Namespace: namespace, Name: sandboxName}, route))
	host, found, err := unstructured.NestedString(route.Object, "spec", "host")
	require.NoError(t, err)
	require.True(t, found)
	require.Equal(t, "mock-agent-mock-agent-namespace.apps.example.com", host)
	require.Len(t, route.GetOwnerReferences(), 1)
}
