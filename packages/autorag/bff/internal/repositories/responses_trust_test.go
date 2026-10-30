package repositories

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/stretchr/testify/require"
	v1 "k8s.io/api/core/v1"
)

type responseRoundTripFunc func(*http.Request) (*http.Response, error)

func (f responseRoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestResolveMaaSClientAttachesDiscoveredTrustedOrigin(t *testing.T) {
	origin := maas.MaaSOrigin{Host: "maas.apps.example.com", Port: "443"}
	k8s := &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: map[string][]byte{
				"MAAS_BASE_URL": []byte("https://maas.apps.example.com/maas-api"),
				"MAAS_API_KEY":  []byte("key"),
			}}, nil
		},
	}
	factory := func(baseURL, apiKey string) (*maas.Client, error) {
		return maas.NewClientWithHTTPClient(baseURL, apiKey, &http.Client{Transport: responseRoundTripFunc(func(req *http.Request) (*http.Response, error) {
			got, ok := maas.TrustedMaaSOriginFromContext(req.Context())
			if !ok || !got.Equal(origin) {
				t.Errorf("trusted MaaS origin was not attached")
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"data":[{"embedding":[1]}]}`)),
			}, nil
		})})
	}
	repo := NewResponsesRepositoryWithMaaSClientFactoryAndGatewayResolver(
		nil,
		k8s,
		factory,
		repositoryGatewayResolver{origin: origin},
	)

	client, err := repo.resolveMaasClient(context.Background(), "ns", "maas")
	require.NoError(t, err)
	_, err = client.Embed(context.Background(), "embedding-model", "text")
	require.NoError(t, err)
}
