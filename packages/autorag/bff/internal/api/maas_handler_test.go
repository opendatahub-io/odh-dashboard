package api

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	maas "github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockMaaSRepo struct{ mock.Mock }

func (m *mockMaaSRepo) GetMaaSModels(ctx context.Context, namespace, secretName string) (*models.MaaSModelsData, error) {
	args := m.Called(ctx, namespace, secretName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.MaaSModelsData), args.Error(1)
}

func TestMaaSModelsHandler(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := new(mockMaaSRepo)
	handler := &MaaSHandler{logger: logger, repo: repo}

	t.Run("success", func(t *testing.T) {
		repo.On("GetMaaSModels", mock.Anything, "ns", "maas").Return(&models.MaaSModelsData{
			Models: []models.MaaSModel{{ID: "model-a", Ready: true}},
		}, nil).Once()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/maas/models?secretName=maas", nil)
		req = req.WithContext(context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "ns"))
		rr := httptest.NewRecorder()
		handler.MaaSModelsHandler(rr, req, httprouter.Params{})
		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), `"id": "model-a"`)
		repo.AssertExpectations(t)
	})

	t.Run("missing secret name", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/maas/models", nil)
		req = req.WithContext(context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "ns"))
		rr := httptest.NewRecorder()
		handler.MaaSModelsHandler(rr, req, httprouter.Params{})
		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("missing credentials maps to bad request", func(t *testing.T) {
		repo.On("GetMaaSModels", mock.Anything, "ns", "missing").Return(nil, repositories.ErrMaaSCredentialValidation).Once()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/maas/models?secretName=missing", nil)
		req = req.WithContext(context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "ns"))
		rr := httptest.NewRecorder()
		handler.MaaSModelsHandler(rr, req, httprouter.Params{})
		assert.Equal(t, http.StatusBadRequest, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("upstream unavailable maps to service unavailable", func(t *testing.T) {
		repo.On("GetMaaSModels", mock.Anything, "ns", "unavailable").Return(nil, maas.NewMaaSError(maas.ErrCodeServerUnavailable, "unavailable", http.StatusServiceUnavailable)).Once()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/maas/models?secretName=unavailable", nil)
		req = req.WithContext(context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "ns"))
		rr := httptest.NewRecorder()
		handler.MaaSModelsHandler(rr, req, httprouter.Params{})
		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
		repo.AssertExpectations(t)
	})

}
