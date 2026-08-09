package api

import (
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestHealthcheckHandler(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	tests := []struct {
		name           string
		mockReturn     models.HealthCheckModel
		mockErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name: "success",
			mockReturn: models.HealthCheckModel{
				Status: "healthy",
				SystemInfo: models.SystemInfo{
					Version: Version,
				},
			},
			mockErr:        nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"status": "healthy"`,
		},
		{
			name:           "repo error returns 500",
			mockReturn:     models.HealthCheckModel{},
			mockErr:        errors.New("database connection failed"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"message"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := new(mockHealthcheckRepo)
			repo.On("HealthCheck", Version).Return(tt.mockReturn, tt.mockErr)

			handler := &HealthcheckHandler{
				logger: logger,
				repo:   repo,
			}

			req := httptest.NewRequest(http.MethodGet, "/healthcheck", nil)
			rr := httptest.NewRecorder()

			handler.HealthcheckHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			repo.AssertExpectations(t)
		})
	}
}
