package api

import (
	"context"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveMaaSGatewayURL(t *testing.T) {
	withMaaSClient := func(url string) context.Context {
		client := bffmocks.NewMockBFFClient(bffclient.BFFTargetMaaS)
		client.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
			require.Equal(t, "GET", method)
			require.Equal(t, "/gateway-url", path)
			response.(*models.MaaSBFFGatewayURLResponse).Data.URL = url
			return nil
		}
		return context.WithValue(
			context.Background(),
			constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)),
			client,
		)
	}

	t.Run("returns the external MaaS API URL", func(t *testing.T) {
		url, err := resolveMaaSGatewayURL(withMaaSClient("https://maas.apps.example.com/maas-api/"))

		require.NoError(t, err)
		assert.Equal(t, "https://maas.apps.example.com/maas-api", url)
	})

	t.Run("uses the default MaaS BFF mock gateway URL", func(t *testing.T) {
		ctx := context.WithValue(
			context.Background(),
			constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)),
			bffmocks.NewMockBFFClient(bffclient.BFFTargetMaaS),
		)

		url, err := resolveMaaSGatewayURL(ctx)

		require.NoError(t, err)
		assert.Equal(t, "https://maas.apps.example.com/maas-api", url)
	})

	t.Run("rejects an invalid gateway URL", func(t *testing.T) {
		_, err := resolveMaaSGatewayURL(withMaaSClient("maas.apps.example.com/maas-api"))

		require.ErrorContains(t, err, "invalid gateway URL")
	})

	t.Run("rejects a URL without the MaaS API path", func(t *testing.T) {
		_, err := resolveMaaSGatewayURL(withMaaSClient("https://maas.apps.example.com"))

		require.ErrorContains(t, err, "/maas-api")
	})

	t.Run("requires a MaaS BFF client", func(t *testing.T) {
		_, err := resolveMaaSGatewayURL(context.Background())

		require.Error(t, err)
		assert.ErrorAs(t, err, new(*bffclient.BFFClientError))
	})
}
