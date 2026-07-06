package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func TestBFFConfigHandler_WithCustomLlamaStackURL(t *testing.T) {
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port:          4000,
			LlamaStackURL: "https://custom-llamastack.example.com",
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, constants.ConfigPath, nil)
	assert.NoError(t, err)

	app.BFFConfigHandler(rr, req, nil)

	rs := rr.Result()
	defer func() { _ = rs.Body.Close() }()

	body, err := io.ReadAll(rs.Body)
	assert.NoError(t, err)

	var response struct {
		Data *models.BFFConfigModel `json:"data"`
	}
	err = json.Unmarshal(body, &response)
	assert.NoError(t, err)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.NotNil(t, response.Data)
	assert.True(t, response.Data.IsCustomLSD, "IsCustomLSD should be true when LlamaStackURL is set")
}

func TestBFFConfigHandler_WithoutCustomLlamaStackURL(t *testing.T) {
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port:          4000,
			LlamaStackURL: "", // Empty URL means no custom LSD
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, constants.ConfigPath, nil)
	assert.NoError(t, err)

	app.BFFConfigHandler(rr, req, nil)

	rs := rr.Result()
	defer func() { _ = rs.Body.Close() }()

	body, err := io.ReadAll(rs.Body)
	assert.NoError(t, err)

	var response struct {
		Data *models.BFFConfigModel `json:"data"`
	}
	err = json.Unmarshal(body, &response)
	assert.NoError(t, err)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.NotNil(t, response.Data)
	assert.False(t, response.Data.IsCustomLSD, "IsCustomLSD should be false when LlamaStackURL is empty")
}

func TestBFFConfigHandler_ResponseStructure(t *testing.T) {
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port:          4000,
			LlamaStackURL: "https://custom-llamastack.example.com",
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, constants.ConfigPath, nil)
	assert.NoError(t, err)

	app.BFFConfigHandler(rr, req, nil)

	rs := rr.Result()
	defer func() { _ = rs.Body.Close() }()

	body, err := io.ReadAll(rs.Body)
	assert.NoError(t, err)

	// Verify the response has the correct structure
	var response map[string]interface{}
	err = json.Unmarshal(body, &response)
	assert.NoError(t, err)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, response, "data", "Response should contain 'data' field")

	data, ok := response["data"].(map[string]interface{})
	assert.True(t, ok, "data field should be an object")
	assert.Contains(t, data, "isCustomLSD", "data should contain 'isCustomLSD' field")
}

func TestBFFConfigHandler_ContentType(t *testing.T) {
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port:          4000,
			LlamaStackURL: "",
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, constants.ConfigPath, nil)
	assert.NoError(t, err)

	app.BFFConfigHandler(rr, req, nil)

	rs := rr.Result()
	defer func() { _ = rs.Body.Close() }()

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rs.Header.Get("Content-Type"))
}
