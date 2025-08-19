package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/mocks"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestHealthCheckHandler(t *testing.T) {
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		repositories: mocks.NewMockRepositories(),
	}

	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, HealthCheckPath, nil)
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
			Version: Version,
		},
	}

	assert.Equal(t, expected, healthCheckRes)
}
