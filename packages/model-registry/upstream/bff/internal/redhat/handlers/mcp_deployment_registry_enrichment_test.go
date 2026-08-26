package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/bffclient"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/bffclient/bffmocks"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/models"
)

func newRedHatTestAppWithMockBFFClients(t *testing.T) *api.App {
	t.Helper()
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)
	app.SetBFFClientFactoryForTest(bffmocks.NewMockClientFactory(noopLogger()))
	return app
}

// fakeUnconfiguredBFFClientFactory reports every target as unconfigured, to
// deterministically exercise the ClientForRequest nil-client no-op path.
type fakeUnconfiguredBFFClientFactory struct{}

func (f *fakeUnconfiguredBFFClientFactory) CreateClient(bffclient.BFFTarget, string) bffclient.BFFClientInterface {
	return nil
}

func (f *fakeUnconfiguredBFFClientFactory) CreateClientWithHeaders(bffclient.BFFTarget, string, map[string]string) bffclient.BFFClientInterface {
	return nil
}

func (f *fakeUnconfiguredBFFClientFactory) GetConfig(bffclient.BFFTarget) *bffclient.BFFServiceConfig {
	return nil
}

func (f *fakeUnconfiguredBFFClientFactory) IsTargetConfigured(bffclient.BFFTarget) bool {
	return false
}

func TestMcpDeploymentListResolvesRegistryDisplayNameViaMLflowBFF(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)

	repo := &mockMcpDeploymentRepo{
		listFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string) (models.McpDeploymentList, error) {
			return models.McpDeploymentList{
				Items: []models.McpDeployment{
					{Name: "kubernetes-mcp", Namespace: namespace, RegistryServer: "io.github.example/kubernetes-mcp", RegistryVersion: "1.0.0"},
					{Name: "catalog-mcp", Namespace: namespace, ServerName: "catalog-server"},
				},
				Size: 2,
			}, nil
		},
	}
	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentList(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentListPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp McpDeploymentListEnvelope
	decodeResponse(t, rr, &resp)

	if len(resp.Data.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(resp.Data.Items))
	}
	if resp.Data.Items[0].RegistryServerDisplayName != "kubernetes-mcp" {
		t.Fatalf("expected registry display name resolved from mock MLflow BFF, got %q", resp.Data.Items[0].RegistryServerDisplayName)
	}
	// Catalog-sourced deployments (no RegistryServer) must not attempt a lookup.
	if resp.Data.Items[1].RegistryServerDisplayName != "" {
		t.Fatalf("expected no registry display name for catalog deployment, got %q", resp.Data.Items[1].RegistryServerDisplayName)
	}
}

func TestMcpDeploymentGetResolvesRegistryDisplayNameViaMLflowBFF(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)

	repo := &mockMcpDeploymentRepo{
		getFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string, name string) (models.McpDeployment, error) {
			return models.McpDeployment{
				Name:            name,
				Namespace:       namespace,
				RegistryServer:  "io.github.example/kubernetes-mcp",
				RegistryVersion: "1.0.0",
			}, nil
		},
	}
	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentGet(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "kubernetes-mcp"}})

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp McpDeploymentEnvelope
	decodeResponse(t, rr, &resp)

	if resp.Data.RegistryServerDisplayName != "kubernetes-mcp" {
		t.Fatalf("expected registry display name resolved from mock MLflow BFF, got %q", resp.Data.RegistryServerDisplayName)
	}
}

func TestMcpDeploymentListDegradesGracefullyWhenMLflowBFFUnavailable(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)
	// Target reports as unconfigured, so bffclient.ClientForRequest returns nil
	// and enrichment must no-op rather than fail the request or attempt a call.
	app.SetBFFClientFactoryForTest(&fakeUnconfiguredBFFClientFactory{})

	repo := &mockMcpDeploymentRepo{
		listFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string) (models.McpDeploymentList, error) {
			return models.McpDeploymentList{
				Items: []models.McpDeployment{
					{Name: "kubernetes-mcp", Namespace: namespace, RegistryServer: "io.github.example/kubernetes-mcp"},
				},
				Size: 1,
			}, nil
		},
	}
	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentList(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentListPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200 even without a configured BFF client, got %d", rr.Code)
	}

	var resp McpDeploymentListEnvelope
	decodeResponse(t, rr, &resp)
	if resp.Data.Items[0].RegistryServerDisplayName != "" {
		t.Fatalf("expected empty display name when MLflow BFF is unconfigured, got %q", resp.Data.Items[0].RegistryServerDisplayName)
	}
}

func TestMcpDeploymentListDegradesGracefullyOnMLflowBFFError(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	mockFactory := bffmocks.NewMockClientFactory(noopLogger())
	app.SetBFFClientFactoryForTest(mockFactory)

	// Force the mlflow client to error, simulating an unreachable/erroring BFF.
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
		return bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow)
	}

	repo := &mockMcpDeploymentRepo{
		listFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string) (models.McpDeploymentList, error) {
			return models.McpDeploymentList{
				Items: []models.McpDeployment{
					{Name: "kubernetes-mcp", Namespace: namespace, RegistryServer: "io.github.example/kubernetes-mcp"},
				},
				Size: 1,
			}, nil
		},
	}
	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentList(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentListPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200 even when the MLflow BFF call fails, got %d", rr.Code)
	}

	var resp McpDeploymentListEnvelope
	decodeResponse(t, rr, &resp)
	if resp.Data.Items[0].RegistryServerDisplayName != "" {
		t.Fatalf("expected empty display name when MLflow BFF call errors, got %q", resp.Data.Items[0].RegistryServerDisplayName)
	}
}

func TestMcpDeploymentListDedupesRegistryLookupsPerServer(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)

	calls := 0
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, response interface{}) error {
		calls++
		env, ok := response.(*mlflowMCPServerEnvelope)
		if ok {
			env.Data.DisplayName = "shared-server"
		}
		return nil
	}

	repo := &mockMcpDeploymentRepo{
		listFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string) (models.McpDeploymentList, error) {
			return models.McpDeploymentList{
				Items: []models.McpDeployment{
					{Name: "a", Namespace: namespace, RegistryServer: "io.github.example/shared"},
					{Name: "b", Namespace: namespace, RegistryServer: "io.github.example/shared"},
				},
				Size: 2,
			}, nil
		},
	}
	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentList(app, failDefault(t))
	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentListPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if calls != 1 {
		t.Fatalf("expected exactly 1 inter-BFF call for 2 deployments sharing a registry server, got %d", calls)
	}

	var resp McpDeploymentListEnvelope
	decodeResponse(t, rr, &resp)
	for _, item := range resp.Data.Items {
		if item.RegistryServerDisplayName != "shared-server" {
			t.Fatalf("expected display name 'shared-server', got %q", item.RegistryServerDisplayName)
		}
	}
}

func TestMcpRegistryServerNamePathSegmentRejectsDotSegments(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"normal name", "io.github.example/kubernetes-mcp", "io.github.example/kubernetes-mcp"},
		{"bare dot-dot", "..", "%2E%2E"},
		{"bare dot", ".", "%2E"},
		{"dot-dot segment with traversal attempt", "../etc/passwd", "%2E%2E/etc/passwd"},
		{"query-injection attempt", "example?workspace=other", "example%3Fworkspace=other"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := mcpRegistryServerNamePathSegment(tt.input)
			if err != nil {
				t.Fatalf("mcpRegistryServerNamePathSegment(%q) returned unexpected error: %v", tt.input, err)
			}
			if got != tt.expected {
				t.Fatalf("mcpRegistryServerNamePathSegment(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestMcpRegistryServerNamePathSegmentRejectsEmptySegments(t *testing.T) {
	for _, input := range []string{"", "/", "/foo", "foo/", "foo//bar"} {
		t.Run(input, func(t *testing.T) {
			if _, err := mcpRegistryServerNamePathSegment(input); err == nil {
				t.Fatalf("mcpRegistryServerNamePathSegment(%q) expected an error for an empty path segment, got none", input)
			}
		})
	}
}

func TestMcpDeploymentListResolvesDistinctServersConcurrently(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)

	var inflight atomic.Int32
	var maxInflight atomic.Int32

	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, response interface{}) error {
		cur := inflight.Add(1)
		for {
			prev := maxInflight.Load()
			if cur <= prev || maxInflight.CompareAndSwap(prev, cur) {
				break
			}
		}
		time.Sleep(20 * time.Millisecond)
		inflight.Add(-1)

		env, ok := response.(*mlflowMCPServerEnvelope)
		if ok {
			env.Data.DisplayName = "resolved"
		}
		return nil
	}

	repo := &mockMcpDeploymentRepo{
		listFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace string) (models.McpDeploymentList, error) {
			return models.McpDeploymentList{
				Items: []models.McpDeployment{
					{Name: "a", Namespace: namespace, RegistryServer: "server-1"},
					{Name: "b", Namespace: namespace, RegistryServer: "server-2"},
					{Name: "c", Namespace: namespace, RegistryServer: "server-3"},
				},
				Size: 3,
			}, nil
		},
	}
	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentList(app, failDefault(t))
	req := httptest.NewRequest(http.MethodGet, api.McpDeploymentListPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	if peak := maxInflight.Load(); peak < 2 {
		t.Fatalf("expected at least 2 concurrent lookups for 3 distinct servers, peak was %d", peak)
	}

	var resp McpDeploymentListEnvelope
	decodeResponse(t, rr, &resp)
	for _, item := range resp.Data.Items {
		if item.RegistryServerDisplayName != "resolved" {
			t.Fatalf("expected display name 'resolved', got %q", item.RegistryServerDisplayName)
		}
	}
}
