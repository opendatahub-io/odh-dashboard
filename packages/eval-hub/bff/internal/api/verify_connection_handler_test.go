package api

import (
	"net/http"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVerifyConnectionHandler_MissingBaseURL(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	body := models.VerifyConnectionRequest{
		SourceType: "model",
		BaseURL:    "",
	}

	result, response, err := setupApiTest[HTTPError](
		http.MethodPost,
		VerifyConnectionPath+"?namespace=test-ns",
		body, nil, identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
	assert.Contains(t, result.Error.Message, "base_url is required")
}

func TestVerifyConnectionHandler_MissingSourceType(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	body := models.VerifyConnectionRequest{
		SourceType: "",
		BaseURL:    "https://api.example.com",
	}

	result, response, err := setupApiTest[HTTPError](
		http.MethodPost,
		VerifyConnectionPath+"?namespace=test-ns",
		body, nil, identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
	assert.Contains(t, result.Error.Message, "source_type is required")
}

func TestVerifyConnectionHandler_InvalidSourceType(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	body := models.VerifyConnectionRequest{
		SourceType: "invalid",
		BaseURL:    "https://api.example.com",
	}

	result, response, err := setupApiTest[HTTPError](
		http.MethodPost,
		VerifyConnectionPath+"?namespace=test-ns",
		body, nil, identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
	assert.Contains(t, result.Error.Message, "invalid source_type")
}

func TestVerifyConnectionHandler_EmptyBody(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	result, response, err := setupApiTest[HTTPError](
		http.MethodPost,
		VerifyConnectionPath+"?namespace=test-ns",
		nil, nil, identity,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
	assert.NotEmpty(t, result.Error.Message)
}
