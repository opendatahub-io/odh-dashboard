package api

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func deployApp() *App {
	return &App{
		config:       config.EnvConfig{AuthMethod: config.AuthMethodDisabled},
		logger:       slog.New(slog.NewTextHandler(io.Discard, nil)),
		repositories: testRepositoriesWithAgents(),
	}
}

func deployRequest(t *testing.T, body any) *http.Request {
	t.Helper()
	b, err := json.Marshal(body)
	require.NoError(t, err)
	return httptest.NewRequest(http.MethodPost, AgentDeployPath, bytes.NewReader(b))
}

func TestDeployAgentHandler_Success(t *testing.T) {
	app := deployApp()
	req := deployRequest(t, models.DeployAgentRequest{
		Name:           "my-agent",
		Namespace:      "default",
		ContainerImage: "quay.io/example/agent",
		ImageTag:       "latest",
	})
	rr := httptest.NewRecorder()

	app.DeployAgentHandler(rr, req, httprouter.Params{})

	require.Equal(t, http.StatusCreated, rr.Code)

	var envelope DeployAgentEnvelope
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	require.NotNil(t, envelope.Data)
	assert.Equal(t, "my-agent", envelope.Data.Name)
	assert.Equal(t, "default", envelope.Data.Namespace)
}

func TestDeployAgentHandler_BadJSON(t *testing.T) {
	app := deployApp()
	req := httptest.NewRequest(http.MethodPost, AgentDeployPath, bytes.NewReader([]byte("not json")))
	rr := httptest.NewRecorder()

	app.DeployAgentHandler(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDeployAgentHandler_MissingContainerImage(t *testing.T) {
	app := deployApp()
	req := deployRequest(t, models.DeployAgentRequest{
		Name:      "my-agent",
		Namespace: "default",
		ImageTag:  "latest",
	})
	rr := httptest.NewRecorder()

	app.DeployAgentHandler(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDeployAgentHandler_InvalidNamespace(t *testing.T) {
	app := deployApp()
	req := deployRequest(t, models.DeployAgentRequest{
		Name:           "my-agent",
		Namespace:      "INVALID_NS",
		ContainerImage: "quay.io/example/agent",
		ImageTag:       "latest",
	})
	rr := httptest.NewRecorder()

	app.DeployAgentHandler(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDeployAgentHandler_InvalidProtocol(t *testing.T) {
	app := deployApp()
	req := deployRequest(t, models.DeployAgentRequest{
		Name:           "my-agent",
		Namespace:      "default",
		ContainerImage: "quay.io/example/agent",
		ImageTag:       "latest",
		Protocol:       "grpc",
	})
	rr := httptest.NewRecorder()

	app.DeployAgentHandler(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDeployAgentHandler_Duplicate(t *testing.T) {
	app := deployApp()
	body := models.DeployAgentRequest{
		Name:           "dup-agent",
		Namespace:      "default",
		ContainerImage: "quay.io/example/agent",
		ImageTag:       "latest",
	}

	req1 := deployRequest(t, body)
	rr1 := httptest.NewRecorder()
	app.DeployAgentHandler(rr1, req1, httprouter.Params{})
	require.Equal(t, http.StatusCreated, rr1.Code)

	req2 := deployRequest(t, body)
	rr2 := httptest.NewRecorder()
	app.DeployAgentHandler(rr2, req2, httprouter.Params{})
	assert.Equal(t, http.StatusConflict, rr2.Code)
}

func TestDeployAgentHandler_AuthDisabledSkipsRBAC(t *testing.T) {
	app := deployApp()
	req := deployRequest(t, models.DeployAgentRequest{
		Name:           "auth-test-agent",
		Namespace:      "default",
		ContainerImage: "quay.io/example/agent",
		ImageTag:       "latest",
	})
	rr := httptest.NewRecorder()

	app.DeployAgentHandler(rr, req, httprouter.Params{})

	require.Equal(t, http.StatusCreated, rr.Code)
}
