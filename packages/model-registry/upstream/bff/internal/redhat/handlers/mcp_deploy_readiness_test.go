package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sync/atomic"
	"testing"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/config"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/httpclient"
	"github.com/kubeflow/hub/ui/bff/internal/mocks"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
	"github.com/kubeflow/hub/ui/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// readinessCatalogMock serves a fixed set of catalog MCP servers for readiness tests.
type readinessCatalogMock struct {
	*mocks.ModelCatalogClientMock
}

func (m readinessCatalogMock) GetMcpServer(_ httpclient.HTTPClientInterface, serverId string, _ url.Values) (*models.McpServer, error) {
	switch serverId {
	case "4":
		return &models.McpServer{ID: "4", Name: openShiftMcpServerCatalogName}, nil
	case "1":
		return &models.McpServer{ID: "1", Name: "io.github.example/other-mcp-server"}, nil
	case "missing":
		return nil, &httpclient.HTTPError{StatusCode: http.StatusNotFound, ErrorResponse: httpclient.ErrorResponse{Code: "404", Message: "not found"}}
	default:
		return nil, errors.New("catalog unavailable")
	}
}

type countingOperatorReader struct {
	obj   *unstructured.Unstructured
	err   error
	calls atomic.Int32
}

func (r *countingOperatorReader) Get(context.Context) (*unstructured.Unstructured, error) {
	r.calls.Add(1)
	if r.err != nil {
		return nil, r.err
	}
	return r.obj.DeepCopy(), nil
}

func newReadinessTestApp(t *testing.T, reader redhatrepos.MCPLifecycleOperatorReader) http.Handler {
	t.Helper()
	original := newMcpLifecycleOperatorReader
	newMcpLifecycleOperatorReader = func(*api.App) redhatrepos.MCPLifecycleOperatorReader { return reader }
	t.Cleanup(func() { newMcpLifecycleOperatorReader = original })

	app := api.NewTestApp(
		config.EnvConfig{MockMRCatalogClient: true, DeploymentMode: config.DeploymentModeFederated},
		noopLogger(),
		&runtimeCatalogKubeFactory{client: &runtimeCatalogKubeClient{address: "catalog.invalid:8080", allow: true}},
		repositories.NewRepositories(nil, readinessCatalogMock{&mocks.ModelCatalogClientMock{}}),
	)
	return app.Routes()
}

func readinessPath(serverID string) string {
	return api.McpServerListPath + "/" + serverID + "/deploy_readiness?namespace=catalog-ns"
}

func TestMcpServerDeployReadiness(t *testing.T) {
	notReadyOperator := redhatrepos.NewMockMCPLifecycleOperator()
	require.NoError(t, unstructured.SetNestedSlice(notReadyOperator.Object,
		[]interface{}{map[string]interface{}{"type": "Ready", "status": "False"}}, "status", "conditions"))

	tests := []struct {
		name            string
		serverID        string
		reader          *countingOperatorReader
		gatewayRequired bool
		deployable      bool
		reason          models.McpDeployReadinessReason
		wantReads       int32
	}{
		{name: "OpenShift server with a usable gateway", serverID: "4", reader: &countingOperatorReader{obj: redhatrepos.NewMockMCPLifecycleOperator()}, gatewayRequired: true, deployable: true, wantReads: 1},
		{name: "OpenShift server with operator not ready", serverID: "4", reader: &countingOperatorReader{obj: notReadyOperator}, gatewayRequired: true, reason: models.McpDeployReadinessOperatorNotReady, wantReads: 1},
		{name: "OpenShift server when the CR cannot be read", serverID: "4", reader: &countingOperatorReader{err: errors.New("forbidden")}, gatewayRequired: true, reason: models.McpDeployReadinessGatewayStatusUnavailable, wantReads: 1},
		{name: "other server does not read the CR", serverID: "1", reader: &countingOperatorReader{err: errors.New("must not be called")}, deployable: true, wantReads: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newReadinessTestApp(t, tt.reader)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, readinessPath(tt.serverID), nil))

			require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
			var envelope McpServerDeployReadinessEnvelope
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &envelope))
			assert.Equal(t, tt.gatewayRequired, envelope.Data.GatewayRequired)
			assert.Equal(t, tt.deployable, envelope.Data.Deployable)
			assert.Equal(t, tt.reason, envelope.Data.Reason)
			assert.Equal(t, tt.wantReads, tt.reader.calls.Load())
		})
	}
}

func TestMcpServerDeployReadinessErrors(t *testing.T) {
	tests := []struct {
		name   string
		path   string
		status int
	}{
		{name: "unknown server forwards catalog 404", path: readinessPath("missing"), status: http.StatusNotFound},
		{name: "catalog failure", path: readinessPath("boom"), status: http.StatusInternalServerError},
		{name: "missing namespace", path: api.McpServerListPath + "/4/deploy_readiness", status: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reader := &countingOperatorReader{obj: redhatrepos.NewMockMCPLifecycleOperator()}
			handler := newReadinessTestApp(t, reader)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, tt.path, nil))

			require.Equal(t, tt.status, rr.Code, rr.Body.String())
			var body map[string]json.RawMessage
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
			assert.Contains(t, body, "error")
			assert.Zero(t, reader.calls.Load())
		})
	}
}

func TestMcpServerRequiresGateway(t *testing.T) {
	assert.True(t, mcpServerRequiresGateway(&models.McpServer{Name: openShiftMcpServerCatalogName}))       //nolint:staticcheck // testing the deprecated helper
	assert.False(t, mcpServerRequiresGateway(&models.McpServer{Name: "com.redhat/other-server"}))          //nolint:staticcheck // testing the deprecated helper
	assert.False(t, mcpServerRequiresGateway(&models.McpServer{DisplayName: ptr("openshift-mcp-server")})) //nolint:staticcheck // testing the deprecated helper
	assert.False(t, mcpServerRequiresGateway(nil))                                                         //nolint:staticcheck // testing the deprecated helper
}

func ptr(s string) *string { return &s }
