package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
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
