package api

import (
	"encoding/json"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/mocks"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
	"github.com/stretchr/testify/assert"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthCheckHandler(t *testing.T) {
	mockLSClient, _ := mocks.NewLlamastackClientMock()

	app := App{config: config.EnvConfig{
		Port: 4000,
	},
		repositories: repositories.NewRepositories(mockLSClient),
	}

	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, constants.HealthCheckPath, nil)
	assert.NoError(t, err)

	app.HealthcheckHandler(rr, req, nil)

	rs := rr.Result()
	defer func() { _ = rs.Body.Close() }()

	body, err := io.ReadAll(rs.Body)
	assert.NoError(t, err)

	var healthCheckRes models.HealthCheckModel
	err = json.Unmarshal(body, &healthCheckRes)
	assert.NoError(t, err)

	assert.Equal(t, http.StatusOK, rr.Code)

	expected := models.HealthCheckModel{
		Status: "available",
		SystemInfo: models.SystemInfo{
			Version: constants.Version,
		},
	}

	assert.Equal(t, expected, healthCheckRes)
}
