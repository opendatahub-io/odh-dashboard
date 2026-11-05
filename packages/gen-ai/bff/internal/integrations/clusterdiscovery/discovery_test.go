package clusterdiscovery

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/rest"
	k8stesting "k8s.io/client-go/testing"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

func TestDiscoverCollectors(t *testing.T) {
	collector := func(name, namespace string) runtime.Object {
		return &unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "opentelemetry.io/v1beta1",
			"kind":       "OpenTelemetryCollector",
			"metadata":   map[string]any{"name": name, "namespace": namespace},
		}}
	}
	platform := collector(constants.PlatformCollectorName, "monitoring")
	genAI := collector(constants.GenAICollectorName, "gen-ai-monitoring")

	for _, tt := range []struct {
		name    string
		objects []runtime.Object
		want    Collectors
	}{
		{name: "none"},
		{name: "unrelated", objects: []runtime.Object{collector("other", "other")}},
		{name: "platform only", objects: []runtime.Object{platform}, want: Collectors{PlatformNamespace: "monitoring"}},
		{name: "gen-ai only", objects: []runtime.Object{genAI}, want: Collectors{GenAINamespace: "gen-ai-monitoring"}},
		{
			name: "both namespaces remain distinct", objects: []runtime.Object{platform, genAI},
			want: Collectors{PlatformNamespace: "monitoring", GenAINamespace: "gen-ai-monitoring"},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			dynClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(),
				map[schema.GroupVersionResource]string{constants.OTelCollectorGVR: "OpenTelemetryCollectorList"}, tt.objects...)
			got, err := DiscoverCollectors(context.Background(), dynClient)
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestDiscoverCollectorsDuplicateNames(t *testing.T) {
	collector := func(name, namespace string) unstructured.Unstructured {
		return unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "opentelemetry.io/v1beta1", "kind": "OpenTelemetryCollector",
			"metadata": map[string]any{"name": name, "namespace": namespace},
		}}
	}
	for _, name := range []string{constants.PlatformCollectorName, constants.GenAICollectorName} {
		for _, namespaces := range [][]string{{"monitoring", "other"}, {"other", "monitoring"}, {"monitoring", "monitoring"}} {
			t.Run(name+"/"+namespaces[0]+"-then-"+namespaces[1], func(t *testing.T) {
				otherName := constants.PlatformCollectorName
				want := Collectors{PlatformNamespace: "valid", GenAINamespace: namespaces[0]}
				if name == constants.PlatformCollectorName {
					otherName = constants.GenAICollectorName
					want = Collectors{PlatformNamespace: namespaces[0], GenAINamespace: "valid"}
				}
				client := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(),
					map[schema.GroupVersionResource]string{constants.OTelCollectorGVR: "OpenTelemetryCollectorList"})
				client.PrependReactor("list", "opentelemetrycollectors", func(k8stesting.Action) (bool, runtime.Object, error) {
					// Preserve list order and allow repeated same-namespace entries.
					// Seed the other collector to verify ambiguity discards partial results.
					return true, &unstructured.UnstructuredList{Items: []unstructured.Unstructured{
						collector(otherName, "valid"), collector(name, namespaces[0]), collector(name, namespaces[1]),
					}}, nil
				})
				got, err := DiscoverCollectors(context.Background(), client)
				if namespaces[0] != namespaces[1] {
					require.ErrorContains(t, err, "ambiguous "+name+" collector")
					assert.Contains(t, err.Error(), namespaces[0])
					assert.Contains(t, err.Error(), namespaces[1])
					assert.Empty(t, got)
				} else {
					require.NoError(t, err)
					assert.Equal(t, want, got)
				}
			})
		}
	}
}

func TestDiscoverCollectorsListError(t *testing.T) {
	dynClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(),
		map[schema.GroupVersionResource]string{constants.OTelCollectorGVR: "OpenTelemetryCollectorList"})
	listErr := errors.New("collector list forbidden")
	dynClient.PrependReactor("list", "opentelemetrycollectors", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, listErr
	})

	collectors, err := DiscoverCollectors(context.Background(), dynClient)
	require.ErrorIs(t, err, listErr)
	assert.Empty(t, collectors)
}

func TestDiscoverCollectorsCancellation(t *testing.T) {
	started := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(started)
		<-r.Context().Done()
	}))
	defer server.Close()
	dynClient, err := dynamic.NewForConfig(&rest.Config{Host: server.URL})
	require.NoError(t, err)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan error, 1)
	go func() {
		_, err := DiscoverCollectors(ctx, dynClient)
		done <- err
	}()

	select {
	case <-started:
	case <-time.After(5 * time.Second):
		t.Fatal("collector discovery did not issue a request")
	}
	cancel()
	select {
	case err := <-done:
		require.ErrorIs(t, err, context.Canceled)
	case <-time.After(time.Second):
		t.Fatal("collector discovery ignored cancellation")
	}
}

func TestGenAICollectorEndpoint(t *testing.T) {
	assert.Empty(t, GenAICollectorEndpoint(""))
	assert.Equal(t, "http://gen-ai-trace-collector-collector.monitoring.svc:4318", GenAICollectorEndpoint("monitoring"))
}

func TestNewClientKubeconfigFallback(t *testing.T) {
	t.Setenv("KUBERNETES_SERVICE_HOST", "")
	t.Setenv("KUBERNETES_SERVICE_PORT", "")
	path := filepath.Join(t.TempDir(), "kubeconfig")
	t.Setenv("KUBECONFIG", path)
	cfg := clientcmdapi.Config{
		CurrentContext: "test",
		Contexts: map[string]*clientcmdapi.Context{
			"test": {Cluster: "test", AuthInfo: "test"},
		},
		Clusters: map[string]*clientcmdapi.Cluster{
			"test": {Server: "https://cluster.example.com"},
		},
		AuthInfos: map[string]*clientcmdapi.AuthInfo{
			"test": {Token: "test-token"},
		},
	}
	require.NoError(t, clientcmd.WriteToFile(cfg, path))

	dynClient, restCfg, err := NewClient()
	require.NoError(t, err)
	require.NotNil(t, dynClient)
	assert.Equal(t, "https://cluster.example.com", restCfg.Host)
	assert.Equal(t, "test-token", restCfg.BearerToken)

}
