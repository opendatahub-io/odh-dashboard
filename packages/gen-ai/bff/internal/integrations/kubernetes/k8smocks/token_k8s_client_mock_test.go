package k8smocks

import (
	"context"
	"testing"

	ogxapi "github.com/ogx-ai/ogx-k8s-operator/api/v1beta1"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestMockAudioNamespaceHasReadyOGXServer(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, ogxapi.AddToScheme(scheme))
	mockClient := &TokenKubernetesClientMock{TokenKubernetesClient: &k8s.TokenKubernetesClient{
		Client: fake.NewClientBuilder().WithScheme(scheme).Build(),
	}}

	servers, err := mockClient.GetOGXServers(context.Background(), nil, "mock-audio-namespace")
	require.NoError(t, err)
	require.Len(t, servers.Items, 1)
	require.Equal(t, ogxapi.OGXServerPhaseReady, servers.Items[0].Status.Phase)
	require.Equal(t, "http://mock-lsd.mock-audio-namespace.svc.cluster.local:8321", servers.Items[0].Status.ServiceURL)
}
