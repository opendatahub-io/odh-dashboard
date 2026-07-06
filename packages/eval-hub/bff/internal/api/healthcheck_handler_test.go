package api

import (
	"net/http"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthcheckHandler(t *testing.T) {
	result, response, err := setupApiTest[models.HealthCheckModel](
		http.MethodGet,
		HealthCheckPath,
		nil, nil, nil,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "available", result.Status)
	assert.Equal(t, Version, result.SystemInfo.Version)
}
