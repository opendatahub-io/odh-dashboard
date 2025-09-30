package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas/maasmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func TestAttachMaaSClient(t *testing.T) {
	t.Run("should attach mock client when MockMaaSClient is true without requiring MAAS_URL", func(t *testing.T) {
		app := App{
			config: config.EnvConfig{
				MockMaaSClient: true,
				// Intentionally NOT setting MaaSURL to verify it works without it
			},
			maasClientFactory: maasmocks.NewMockClientFactory(),
			repositories:      repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/maas/models", nil)
		rr := httptest.NewRecorder()

		app.AttachMaaSClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			client := r.Context().Value(constants.MaaSClientKey)
			assert.NotNil(t, client)
			// Verify the mock client is attached and is functional
			mockClient := client.(*maasmocks.MockMaaSClient)
			models, err := mockClient.ListModels(r.Context())
			assert.NoError(t, err)
			assert.Len(t, models, 4) // Our mock returns 4 models
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("should return error when not in mock mode and MAAS_URL is not set", func(t *testing.T) {
		app := App{
			config: config.EnvConfig{
				MockMaaSClient: false,
				// Intentionally NOT setting MaaSURL
			},
			maasClientFactory: maasmocks.NewMockClientFactory(),
			repositories:      repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/maas/models", nil)
		rr := httptest.NewRecorder()

		app.AttachMaaSClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			// This should not be called
			t.Error("Handler should not be called when MaaS URL is not configured")
		})(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})

	t.Run("should create real client when not in mock mode and MAAS_URL is set", func(t *testing.T) {
		app := App{
			config: config.EnvConfig{
				MockMaaSClient: false,
				MaaSURL:        "http://test-maas-server.com",
			},
			maasClientFactory: maasmocks.NewMockClientFactory(), // Using mock factory for testing
			repositories:      repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/maas/models", nil)
		rr := httptest.NewRecorder()

		// Add RequestIdentity to context as required by the middleware
		identity := &integrations.RequestIdentity{
			Token: "test-token",
		}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		app.AttachMaaSClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			client := r.Context().Value(constants.MaaSClientKey)
			assert.NotNil(t, client)
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})
}
