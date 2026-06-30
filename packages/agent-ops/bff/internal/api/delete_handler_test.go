package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/stretchr/testify/require"
)

func TestDeleteAgentHandler_Success(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodDelete, ApiPathPrefix+"/agents/runtimes/agent-ops-demo/sample-support-agent", nil)
	rr := httptest.NewRecorder()

	app.DeleteAgentHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "sample-support-agent"},
	})

	require.Equal(t, http.StatusNoContent, rr.Code)

	// Verify the agent was actually removed from the mock repository
	detailReq := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/runtimes/agent-ops-demo/sample-support-agent", nil)
	detailRR := httptest.NewRecorder()
	app.GetAgentRuntimeDetailHandler(detailRR, detailReq, httprouter.Params{
		{Key: "ns", Value: "agent-ops-demo"},
		{Key: "name", Value: "sample-support-agent"},
	})
	require.Equal(t, http.StatusNotFound, detailRR.Code)
}

func TestDeleteAgentHandler_NotFound(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodDelete, ApiPathPrefix+"/agents/runtimes/other-ns/missing-agent", nil)
	rr := httptest.NewRecorder()

	app.DeleteAgentHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "other-ns"},
		{Key: "name", Value: "missing-agent"},
	})

	require.Equal(t, http.StatusNotFound, rr.Code)
}

func TestDeleteAgentHandler_InvalidParams(t *testing.T) {
	app := &App{
		repositories: testRepositoriesWithAgents(),
	}

	req := httptest.NewRequest(http.MethodDelete, ApiPathPrefix+"/agents/runtimes/INVALID_NS/sample-support-agent", nil)
	rr := httptest.NewRecorder()

	app.DeleteAgentHandler(rr, req, httprouter.Params{
		{Key: "ns", Value: "INVALID_NS"},
		{Key: "name", Value: "sample-support-agent"},
	})

	require.Equal(t, http.StatusBadRequest, rr.Code)
}
