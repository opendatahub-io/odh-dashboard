package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mlflow/bff/internal/constants"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func requestWithModelRegistryClient(req *http.Request, client bffclient.BFFClientInterface) *http.Request {
	ctx := context.WithValue(req.Context(), constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetModelRegistry)), client)
	return req.WithContext(ctx)
}

func decodeHTTPError(t *testing.T, rr *httptest.ResponseRecorder) HTTPError {
	t.Helper()
	var httpErr HTTPError
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &httpErr))
	return httpErr
}

func TestGetMcpServerToolsHandlerSuccess(t *testing.T) {
	mockClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetModelRegistry)
	mockClient.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
		assert.Equal(t, http.MethodGet, method)
		assert.Contains(t, path, "/mcp_catalog/mcp_servers/server-1/tools")
		assert.Contains(t, path, "namespace=kubeflow")
		envelope, ok := response.(*mcpServerToolsListEnvelope)
		require.True(t, ok)
		envelope.Data = &models.McpToolList{
			Size:     1,
			PageSize: 1,
			Items: []models.McpToolWithServer{
				{ServerID: "server-1", Tool: models.McpTool{Name: "get_weather", AccessType: "read_only"}},
			},
		}
		return nil
	}

	app := &App{logger: testLogger()}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-catalog/servers/server-1/tools?namespace=kubeflow", nil)
	req = requestWithModelRegistryClient(req, mockClient)

	app.GetMcpServerToolsHandler(rr, req, httprouter.Params{{Key: "id", Value: "server-1"}})

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp mcpServerToolsListEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	require.NotNil(t, resp.Data)
	assert.Equal(t, int32(1), resp.Data.Size)
	require.Len(t, resp.Data.Items, 1)
	assert.Equal(t, "get_weather", resp.Data.Items[0].Tool.Name)
}

func TestGetMcpServerToolsHandlerForwardsQueryParams(t *testing.T) {
	mockClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetModelRegistry)
	mockClient.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
		assert.Equal(t, http.MethodGet, method)
		parsed, err := url.Parse(path)
		require.NoError(t, err)
		assert.Equal(t, "/mcp_catalog/mcp_servers/server-1/tools", parsed.Path)
		query := parsed.Query()
		assert.Equal(t, "kubeflow", query.Get("namespace"))
		assert.Equal(t, "name=foo", query.Get("filterQuery"))
		assert.Equal(t, "100", query.Get("pageSize"))
		assert.Equal(t, "name", query.Get("orderBy"))
		assert.Equal(t, "ASC", query.Get("sortOrder"))
		assert.Equal(t, "page-2", query.Get("nextPageToken"))
		assert.Empty(t, query.Get("ignored"))
		envelope, ok := response.(*mcpServerToolsListEnvelope)
		require.True(t, ok)
		envelope.Data = &models.McpToolList{}
		return nil
	}

	app := &App{logger: testLogger()}
	rr := httptest.NewRecorder()
	query := url.Values{
		"namespace":     {"kubeflow"},
		"filterQuery":   {"name=foo"},
		"pageSize":      {"100"},
		"orderBy":       {"name"},
		"sortOrder":     {"ASC"},
		"nextPageToken": {"page-2"},
		"ignored":       {"drop-me"},
	}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-catalog/servers/server-1/tools?"+query.Encode(), nil)
	req = requestWithModelRegistryClient(req, mockClient)

	app.GetMcpServerToolsHandler(rr, req, httprouter.Params{{Key: "id", Value: "server-1"}})

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetMcpServerToolsHandlerMissingServerID(t *testing.T) {
	app := &App{logger: testLogger()}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-catalog/servers//tools?namespace=kubeflow", nil)

	app.GetMcpServerToolsHandler(rr, req, httprouter.Params{{Key: "id", Value: ""}})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	httpErr := decodeHTTPError(t, rr)
	assert.Equal(t, apiErrorCodeForStatus(http.StatusBadRequest), httpErr.Error.Code)
	assert.Equal(t, "server id is required", httpErr.Error.Message)
}

func TestGetMcpServerToolsHandlerMissingNamespace(t *testing.T) {
	app := &App{logger: testLogger()}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-catalog/servers/server-1/tools", nil)

	app.GetMcpServerToolsHandler(rr, req, httprouter.Params{{Key: "id", Value: "server-1"}})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	httpErr := decodeHTTPError(t, rr)
	assert.Equal(t, apiErrorCodeForStatus(http.StatusBadRequest), httpErr.Error.Code)
	assert.Equal(t, "namespace query parameter is required", httpErr.Error.Message)
}

func TestGetMcpServerToolsHandlerUnavailableClient(t *testing.T) {
	app := &App{logger: testLogger()}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-catalog/servers/server-1/tools?namespace=kubeflow", nil)

	app.GetMcpServerToolsHandler(rr, req, httprouter.Params{{Key: "id", Value: "server-1"}})

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
	httpErr := decodeHTTPError(t, rr)
	assert.Equal(t, apiErrorCodeForStatus(http.StatusServiceUnavailable), httpErr.Error.Code)
	assert.Equal(t, "Model Registry BFF is not available", httpErr.Error.Message)
}

func TestGetMcpServerToolsHandlerClientError(t *testing.T) {
	tests := []struct {
		name        string
		err         error
		wantStatus  int
		wantCode    string
		wantMessage string
	}{
		{
			name:        "not found",
			err:         bffclient.NewNotFoundError(bffclient.BFFTargetModelRegistry, "server not found"),
			wantStatus:  http.StatusNotFound,
			wantCode:    apiErrorCodeForStatus(http.StatusNotFound),
			wantMessage: "server not found",
		},
		{
			name:        "forbidden ignores bff client code",
			err:         bffclient.NewForbiddenError(bffclient.BFFTargetModelRegistry, "access denied"),
			wantStatus:  http.StatusForbidden,
			wantCode:    apiErrorCodeForStatus(http.StatusForbidden),
			wantMessage: "access denied",
		},
		{
			name:        "upstream 5xx sanitized",
			err:         bffclient.NewServerUnavailableError(bffclient.BFFTargetModelRegistry),
			wantStatus:  http.StatusServiceUnavailable,
			wantCode:    apiErrorCodeForStatus(http.StatusServiceUnavailable),
			wantMessage: http.StatusText(http.StatusServiceUnavailable),
		},
		{
			name:        "bad gateway sanitized",
			err:         bffclient.NewInvalidResponseError(bffclient.BFFTargetModelRegistry, "internal details"),
			wantStatus:  http.StatusBadGateway,
			wantCode:    apiErrorCodeForStatus(http.StatusBadGateway),
			wantMessage: http.StatusText(http.StatusBadGateway),
		},
		{
			name:        "invalid status remapped to bad gateway",
			err:         bffclient.NewBFFClientError(bffclient.ErrCodeInternalError, "boom", 0),
			wantStatus:  http.StatusBadGateway,
			wantCode:    apiErrorCodeForStatus(http.StatusBadGateway),
			wantMessage: http.StatusText(http.StatusBadGateway),
		},
		{
			name:        "non-bff error",
			err:         errors.New("connection refused"),
			wantStatus:  http.StatusInternalServerError,
			wantCode:    "500",
			wantMessage: "the server encountered a problem and could not process your request",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetModelRegistry)
			mockClient.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
				return tt.err
			}

			app := &App{logger: testLogger()}
			rr := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-catalog/servers/server-1/tools?namespace=kubeflow", nil)
			req = requestWithModelRegistryClient(req, mockClient)

			app.GetMcpServerToolsHandler(rr, req, httprouter.Params{{Key: "id", Value: "server-1"}})

			assert.Equal(t, tt.wantStatus, rr.Code)
			httpErr := decodeHTTPError(t, rr)
			assert.Equal(t, tt.wantCode, httpErr.Error.Code)
			assert.Equal(t, tt.wantMessage, httpErr.Error.Message)
		})
	}
}

func TestGetMcpServerConverterHandlerSuccess(t *testing.T) {
	mockClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetModelRegistry)
	mockClient.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
		assert.Equal(t, http.MethodGet, method)
		assert.Contains(t, path, "/mcp_catalog/mcp_servers/server-1/mcpserver")
		assert.Contains(t, path, "namespace=kubeflow")
		envelope, ok := response.(*mcpServerCREnvelope)
		require.True(t, ok)
		envelope.Data = json.RawMessage(`{"apiVersion":"mcp.x-k8s.io/v1alpha1","kind":"MCPServer","metadata":{"name":"server-1"},"spec":{"source":{"type":"Image"},"config":{"port":8080}}}`)
		return nil
	}

	app := &App{logger: testLogger()}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-catalog/servers/server-1/mcpserver?namespace=kubeflow", nil)
	req = requestWithModelRegistryClient(req, mockClient)

	app.GetMcpServerConverterHandler(rr, req, httprouter.Params{{Key: "id", Value: "server-1"}})

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp mcpServerCREnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Contains(t, string(resp.Data), `"kind":"MCPServer"`)
}

func TestGetMcpServerConverterHandlerMissingServerID(t *testing.T) {
	app := &App{logger: testLogger()}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-catalog/servers//mcpserver?namespace=kubeflow", nil)

	app.GetMcpServerConverterHandler(rr, req, httprouter.Params{{Key: "id", Value: ""}})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	httpErr := decodeHTTPError(t, rr)
	assert.Equal(t, apiErrorCodeForStatus(http.StatusBadRequest), httpErr.Error.Code)
	assert.Equal(t, "server id is required", httpErr.Error.Message)
}

func TestGetMcpServerConverterHandlerMissingNamespace(t *testing.T) {
	app := &App{logger: testLogger()}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-catalog/servers/server-1/mcpserver", nil)

	app.GetMcpServerConverterHandler(rr, req, httprouter.Params{{Key: "id", Value: "server-1"}})

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	httpErr := decodeHTTPError(t, rr)
	assert.Equal(t, apiErrorCodeForStatus(http.StatusBadRequest), httpErr.Error.Code)
	assert.Equal(t, "namespace query parameter is required", httpErr.Error.Message)
}

func TestGetMcpServerConverterHandlerUnavailableClient(t *testing.T) {
	app := &App{logger: testLogger()}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-catalog/servers/server-1/mcpserver?namespace=kubeflow", nil)

	app.GetMcpServerConverterHandler(rr, req, httprouter.Params{{Key: "id", Value: "server-1"}})

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
	httpErr := decodeHTTPError(t, rr)
	assert.Equal(t, apiErrorCodeForStatus(http.StatusServiceUnavailable), httpErr.Error.Code)
	assert.Equal(t, "Model Registry BFF is not available", httpErr.Error.Message)
}

func TestGetMcpServerConverterHandlerClientError(t *testing.T) {
	mockClient := bffmocks.NewMockBFFClient(bffclient.BFFTargetModelRegistry)
	mockClient.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
		return bffclient.NewNotFoundError(bffclient.BFFTargetModelRegistry, "server not found")
	}

	app := &App{logger: testLogger()}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/mcp-catalog/servers/server-1/mcpserver?namespace=kubeflow", nil)
	req = requestWithModelRegistryClient(req, mockClient)

	app.GetMcpServerConverterHandler(rr, req, httprouter.Params{{Key: "id", Value: "server-1"}})

	assert.Equal(t, http.StatusNotFound, rr.Code)
	httpErr := decodeHTTPError(t, rr)
	assert.Equal(t, apiErrorCodeForStatus(http.StatusNotFound), httpErr.Error.Code)
	assert.Equal(t, "server not found", httpErr.Error.Message)
}
