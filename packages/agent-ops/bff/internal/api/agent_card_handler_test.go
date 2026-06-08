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

func TestGetAgentCardHandler(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/cards/agent-ops-demo/sample-support-agent", nil)
	rr := httptest.NewRecorder()

	app.GetAgentCardHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "sample-support-agent"},
	})

	require.Equal(t, http.StatusOK, rr.Code)

	body, err := io.ReadAll(rr.Body)
	require.NoError(t, err)

	var envelope AgentCardEnvelope
	require.NoError(t, json.Unmarshal(body, &envelope))
	require.NotNil(t, envelope.Data)

	card := envelope.Data
	assert.Equal(t, "sample-support-agent", card.Name)
	assert.Equal(t, "agent-ops-demo", card.Namespace)
	assert.Equal(t, "1.2.0", card.Version)
	assert.Equal(t, "http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080", card.URL)
	require.Len(t, card.Skills, 2)
	assert.True(t, card.Capabilities.Streaming)
	assert.False(t, card.Capabilities.PushNotifications)
	assert.Equal(t, "opendatahub", card.Provider.Name)
	assert.Equal(t, []string{"text"}, card.SupportedInputModes)
	assert.Equal(t, []string{"text"}, card.SupportedOutputModes)
}

func TestGetAgentCardHandler_NotFound(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/cards/other-ns/missing-agent", nil)
	rr := httptest.NewRecorder()

	app.GetAgentCardHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "other-ns"},
		{Key: "name", Value: "missing-agent"},
	})

	require.Equal(t, http.StatusNotFound, rr.Code)
}

func TestGetAgentCardHandler_InvalidParams(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/cards/agent-ops-demo/INVALID_NAME", nil)
	rr := httptest.NewRecorder()

	app.GetAgentCardHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "INVALID_NAME"},
	})

	require.Equal(t, http.StatusBadRequest, rr.Code)
}
