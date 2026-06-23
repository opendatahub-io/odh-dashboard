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
	agentsmock "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/mock"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListAgentRuntimesHandler_InvalidLimit(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, AgentRuntimesPath+"?limit=0", nil)
	rr := httptest.NewRecorder()
	app.ListAgentRuntimesHandler(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestListAgentRuntimesHandler_WithInvalidNamespace(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, AgentRuntimesPath+"?namespace=INVALID_NS", nil)
	rr := httptest.NewRecorder()
	app.ListAgentRuntimesHandler(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestListAgentRuntimesHandler_InvalidContinueToken(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, AgentRuntimesPath+"?continueToken=invalid", nil)
	rr := httptest.NewRecorder()
	app.ListAgentRuntimesHandler(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestListAgentRuntimesHandler(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, AgentRuntimesPath, nil)
	rr := httptest.NewRecorder()

	app.ListAgentRuntimesHandler(rr, req, httprouter.Params{})

	require.Equal(t, http.StatusOK, rr.Code)

	body, err := io.ReadAll(rr.Body)
	require.NoError(t, err)

	var envelope AgentRuntimesEnvelope
	require.NoError(t, json.Unmarshal(body, &envelope))
	require.NotNil(t, envelope.Data)
	require.Len(t, envelope.Data.Runtimes, 1)

	runtime := envelope.Data.Runtimes[0]
	assert.Equal(t, "sample-support-agent", runtime.Name)
	assert.Equal(t, "agent-ops-demo", runtime.Namespace)
	assert.Equal(t, "Ready", runtime.Status)
	assert.Equal(t, "agent", runtime.Type)
	assert.Equal(t, "http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080", runtime.EndpointURL)
}

func TestListAgentRuntimesHandler_WithNamespace(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, AgentRuntimesPath+"?namespace=agent-ops-demo", nil)
	rr := httptest.NewRecorder()

	app.ListAgentRuntimesHandler(rr, req, httprouter.Params{})

	require.Equal(t, http.StatusOK, rr.Code)

	body, err := io.ReadAll(rr.Body)
	require.NoError(t, err)

	var envelope AgentRuntimesEnvelope
	require.NoError(t, json.Unmarshal(body, &envelope))
	require.NotNil(t, envelope.Data)
	require.Len(t, envelope.Data.Runtimes, 1)
	assert.Equal(t, "agent-ops-demo", envelope.Data.Runtimes[0].Namespace)
}

func TestListAgentRuntimesHandler_WithNamespaceNoResults(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, AgentRuntimesPath+"?namespace=nonexistent-ns", nil)
	rr := httptest.NewRecorder()

	app.ListAgentRuntimesHandler(rr, req, httprouter.Params{})

	require.Equal(t, http.StatusOK, rr.Code)

	body, err := io.ReadAll(rr.Body)
	require.NoError(t, err)

	var envelope AgentRuntimesEnvelope
	require.NoError(t, json.Unmarshal(body, &envelope))
	require.NotNil(t, envelope.Data)
	assert.Empty(t, envelope.Data.Runtimes)
}

func TestListAgentRuntimesHandler_ForbiddenNamespaceDoesNotLeakQueryParams(t *testing.T) {
	mockClient := agentsmock.NewClient()
	mockClient.CanListAgentsInNSResult = false
	repos := repositories.NewRepositories(&agentsmock.Factory{Client: mockClient})

	var buf bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&buf, nil))
	app := &App{
		repositories: repos,
		logger:       logger,
	}

	req := httptest.NewRequest(http.MethodGet, AgentRuntimesPath+"?namespace=secret-ns&continueToken=sensitive-token", nil)
	rr := httptest.NewRecorder()

	app.ListAgentRuntimesHandler(rr, req, httprouter.Params{})

	assert.Equal(t, http.StatusForbidden, rr.Code)

	logOutput := buf.String()
	assert.NotContains(t, logOutput, "sensitive-token")
	assert.NotContains(t, logOutput, "continueToken")
}
