package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	agentsmock "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/mock"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetAgentRuntimeDetailHandler(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/runtimes/agent-ops-demo/sample-support-agent", nil)
	rr := httptest.NewRecorder()

	app.GetAgentRuntimeDetailHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "sample-support-agent"},
	})

	require.Equal(t, http.StatusOK, rr.Code)

	body, err := io.ReadAll(rr.Body)
	require.NoError(t, err)

	var envelope AgentRuntimeDetailEnvelope
	require.NoError(t, json.Unmarshal(body, &envelope))
	require.NotNil(t, envelope.Data)

	detail := envelope.Data
	assert.Equal(t, "sample-support-agent", detail.Name)
	assert.Equal(t, "agent-ops-demo", detail.Namespace)
	assert.Equal(t, "ready", detail.WorkloadStatus)
	require.Len(t, detail.ServiceEndpoints, 1)

	runtime := detail.Runtime
	assert.Equal(t, "ready", runtime.Status)
	assert.Equal(t, "agent", runtime.Type)
	assert.Equal(t, "http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080", runtime.EndpointURL)
	assert.Equal(t, "Sample Support Agent", detail.DisplayName)
	assert.Equal(t, "langgraph", detail.Framework)
	assert.NotEmpty(t, detail.Conditions)
}

func TestGetAgentRuntimeDetailHandler_NotFound(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/runtimes/other-ns/missing-agent", nil)
	rr := httptest.NewRecorder()

	app.GetAgentRuntimeDetailHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "other-ns"},
		{Key: "name", Value: "missing-agent"},
	})

	require.Equal(t, http.StatusNotFound, rr.Code)
}

func TestGetAgentRuntimeDetailHandler_InvalidParams(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/runtimes/INVALID_NS/sample-support-agent", nil)
	rr := httptest.NewRecorder()

	app.GetAgentRuntimeDetailHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "INVALID_NS"},
		{Key: "name", Value: "sample-support-agent"},
	})

	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetAgentRuntimeDetailHandler_Forbidden(t *testing.T) {
	mockClient := agentsmock.NewDemoClient()
	mockClient.GetAgentErr = agents.ErrForbidden
	app := NewTestApp(config.EnvConfig{}, nil, nil, repositories.NewRepositories(&agentsmock.Factory{Client: mockClient}))

	req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/runtimes/agent-ops-demo/sample-support-agent", nil)
	rr := httptest.NewRecorder()

	app.GetAgentRuntimeDetailHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "sample-support-agent"},
	})

	require.Equal(t, http.StatusForbidden, rr.Code)
}
