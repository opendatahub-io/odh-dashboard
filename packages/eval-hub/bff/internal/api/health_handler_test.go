package api

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthHandler(t *testing.T) {
	result, response, err := setupApiTest[HealthEnvelope](
		http.MethodGet,
		HealthPath,
		nil, nil, nil,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "available", result.Status)
	assert.Equal(t, Version, result.SystemInfo.Version)
}
