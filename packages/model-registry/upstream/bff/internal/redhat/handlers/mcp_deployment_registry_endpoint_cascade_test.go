package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/bffclient"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/bffclient/bffmocks"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/models"
)

func mustMarshalEndpointsPage(t *testing.T, endpoints []mlflowMCPAccessEndpoint, nextPageToken string) []byte {
	t.Helper()
	payload := map[string]interface{}{
		"data": map[string]interface{}{
			"endpoints":       endpoints,
			"next_page_token": nextPageToken,
		},
	}
	b, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal test payload: %v", err)
	}
	return b
}

// TestScheduleRegistryAccessEndpointCascadeDeleteSkipsBackgroundWorkWhenRegistryServerEmpty
// proves that a catalog-sourced deployment (no RegistryServer) never even schedules
// background work -- not just that the eventual cascade is a no-op. Because scheduling
// returns synchronously when it skips, there's no goroutine in flight for the CallHandler
// to race against, so asserting no call happened after the call returns is deterministic.
func TestScheduleRegistryAccessEndpointCascadeDeleteSkipsBackgroundWorkWhenRegistryServerEmpty(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
		t.Fatal("expected no inter-BFF call for a catalog-sourced deployment (no RegistryServer)")
		return nil
	}

	scheduleRegistryAccessEndpointCascadeDelete(context.Background(), app, models.McpDeployment{
		Name: "kubernetes-mcp", Namespace: "test-ns", ServerName: "catalog-server",
	})
}

func TestCascadeDeleteRegistryAccessEndpointSkipsWhenRegistryServerEmpty(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
		t.Fatal("expected no inter-BFF call for a catalog-sourced deployment (no RegistryServer)")
		return nil
	}

	status := cascadeDeleteRegistryAccessEndpoint(context.Background(), app, models.McpDeployment{
		Name: "kubernetes-mcp", Namespace: "test-ns", ServerName: "catalog-server",
	})
	if status != RegistryAccessEndpointCleanupSkipped {
		t.Fatalf("expected status %q, got %q", RegistryAccessEndpointCleanupSkipped, status)
	}
}

func TestCascadeDeleteRegistryAccessEndpointDeletesMatchingEndpointByHostname(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)

	var deletedIDs []string
	client.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
		switch method {
		case "GET":
			// Endpoint's URL has a *different* port/path than the deployment's current
			// values, proving the match is hostname-only (robust to port/path drift).
			page := mustMarshalEndpointsPage(t, []mlflowMCPAccessEndpoint{
				{ID: "endpoint-other", EndpointURL: "http://other-mcp.test-ns.svc.cluster.local:8080/mcp"},
				{ID: "endpoint-1", EndpointURL: "http://kubernetes-mcp.test-ns.svc.cluster.local:9999/old-path"},
			}, "")
			return json.Unmarshal(page, response)
		case "DELETE":
			deletedIDs = append(deletedIDs, path)
			return nil
		default:
			t.Fatalf("unexpected method %q", method)
			return nil
		}
	}

	status := cascadeDeleteRegistryAccessEndpoint(context.Background(), app, models.McpDeployment{
		Name: "kubernetes-mcp", Namespace: "test-ns", RegistryServer: "io.github.example/kubernetes-mcp",
		Port: 8080, Path: "/mcp",
	})
	if status != RegistryAccessEndpointCleanupSucceeded {
		t.Fatalf("expected status %q, got %q", RegistryAccessEndpointCleanupSucceeded, status)
	}

	if len(deletedIDs) != 1 {
		t.Fatalf("expected exactly 1 delete call, got %d: %v", len(deletedIDs), deletedIDs)
	}
	if !strings.Contains(deletedIDs[0], "/endpoint-1") {
		t.Fatalf("expected delete call for endpoint-1, got %q", deletedIDs[0])
	}
	if strings.Contains(deletedIDs[0], "endpoint-other") {
		t.Fatalf("must not delete an unrelated deployment's endpoint, got %q", deletedIDs[0])
	}
}

// TestCascadeDeleteRegistryAccessEndpointContinuesAfterPartialDeleteFailure proves that
// when one matching endpoint's delete call fails, the others on the same page are still
// attempted rather than abandoned -- and the overall status still correctly reports failure
// so it isn't mistaken for a silent success.
func TestCascadeDeleteRegistryAccessEndpointContinuesAfterPartialDeleteFailure(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)

	var deletedIDs []string
	client.CallHandler = func(_ context.Context, method, path string, _ interface{}, response interface{}) error {
		switch method {
		case "GET":
			page := mustMarshalEndpointsPage(t, []mlflowMCPAccessEndpoint{
				{ID: "endpoint-fails", EndpointURL: "http://kubernetes-mcp.test-ns.svc.cluster.local:8080/mcp"},
				{ID: "endpoint-succeeds", EndpointURL: "http://kubernetes-mcp.test-ns.svc.cluster.local:8080/mcp"},
			}, "")
			return json.Unmarshal(page, response)
		case "DELETE":
			if strings.Contains(path, "endpoint-fails") {
				return bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow)
			}
			deletedIDs = append(deletedIDs, path)
			return nil
		default:
			t.Fatalf("unexpected method %q", method)
			return nil
		}
	}

	status := cascadeDeleteRegistryAccessEndpoint(context.Background(), app, models.McpDeployment{
		Name: "kubernetes-mcp", Namespace: "test-ns", RegistryServer: "io.github.example/kubernetes-mcp",
		Port: 8080, Path: "/mcp",
	})

	if status != RegistryAccessEndpointCleanupFailed {
		t.Fatalf("expected status %q since one endpoint failed to delete, got %q", RegistryAccessEndpointCleanupFailed, status)
	}
	if len(deletedIDs) != 1 {
		t.Fatalf("expected the second matching endpoint to still be deleted despite the first failing, got %d delete calls: %v", len(deletedIDs), deletedIDs)
	}
	if !strings.Contains(deletedIDs[0], "endpoint-succeeds") {
		t.Fatalf("expected endpoint-succeeds to be deleted, got %v", deletedIDs)
	}
}

func TestCascadeDeleteRegistryAccessEndpointDeletesAllMatches(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)

	deleteCalls := 0
	client.CallHandler = func(_ context.Context, method, _ string, _ interface{}, response interface{}) error {
		if method == "GET" {
			page := mustMarshalEndpointsPage(t, []mlflowMCPAccessEndpoint{
				{ID: "endpoint-1", EndpointURL: "http://kubernetes-mcp.test-ns.svc.cluster.local:8080/mcp"},
				{ID: "endpoint-2", EndpointURL: "http://kubernetes-mcp.test-ns.svc.cluster.local:8080/mcp"},
			}, "")
			return json.Unmarshal(page, response)
		}
		deleteCalls++
		return nil
	}

	status := cascadeDeleteRegistryAccessEndpoint(context.Background(), app, models.McpDeployment{
		Name: "kubernetes-mcp", Namespace: "test-ns", RegistryServer: "io.github.example/kubernetes-mcp",
		Port: 8080, Path: "/mcp",
	})

	if deleteCalls != 2 {
		t.Fatalf("expected 2 delete calls for 2 duplicate endpoints, got %d", deleteCalls)
	}
	if status != RegistryAccessEndpointCleanupSucceeded {
		t.Fatalf("expected status %q, got %q", RegistryAccessEndpointCleanupSucceeded, status)
	}
}

func TestCascadeDeleteRegistryAccessEndpointNoOpWhenNoMatchFound(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)

	client.CallHandler = func(_ context.Context, method, _ string, _ interface{}, response interface{}) error {
		if method == "DELETE" {
			t.Fatal("expected no delete call when search finds no matching endpoint")
		}
		page := mustMarshalEndpointsPage(t, []mlflowMCPAccessEndpoint{
			{ID: "endpoint-unrelated", EndpointURL: "http://some-other-deployment.test-ns.svc.cluster.local:8080/mcp"},
		}, "")
		return json.Unmarshal(page, response)
	}

	// This is the "already gone" case -- a successful end state, not a failure to warn about.
	status := cascadeDeleteRegistryAccessEndpoint(context.Background(), app, models.McpDeployment{
		Name: "kubernetes-mcp", Namespace: "test-ns", RegistryServer: "io.github.example/kubernetes-mcp",
		Port: 8080, Path: "/mcp",
	})
	if status != RegistryAccessEndpointCleanupSucceeded {
		t.Fatalf("expected status %q, got %q", RegistryAccessEndpointCleanupSucceeded, status)
	}
}

func TestCascadeDeleteRegistryAccessEndpointNoOpOnSearchFailure(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)
	client.CallHandler = func(_ context.Context, method, _ string, _ interface{}, _ interface{}) error {
		if method == "DELETE" {
			t.Fatal("expected no delete call when the search itself fails")
		}
		return bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow)
	}

	status := cascadeDeleteRegistryAccessEndpoint(context.Background(), app, models.McpDeployment{
		Name: "kubernetes-mcp", Namespace: "test-ns", RegistryServer: "io.github.example/kubernetes-mcp",
		Port: 8080, Path: "/mcp",
	})
	if status != RegistryAccessEndpointCleanupFailed {
		t.Fatalf("expected status %q, got %q", RegistryAccessEndpointCleanupFailed, status)
	}
}

func TestCascadeDeleteRegistryAccessEndpointFollowsPagination(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)

	searchCalls := 0
	deleteCalls := 0
	client.CallHandler = func(_ context.Context, method, _ string, _ interface{}, response interface{}) error {
		if method == "DELETE" {
			deleteCalls++
			return nil
		}
		searchCalls++
		if searchCalls == 1 {
			page := mustMarshalEndpointsPage(t, []mlflowMCPAccessEndpoint{
				{ID: "endpoint-unrelated", EndpointURL: "http://other.test-ns.svc.cluster.local:8080/mcp"},
			}, "page-2-token")
			return json.Unmarshal(page, response)
		}
		page := mustMarshalEndpointsPage(t, []mlflowMCPAccessEndpoint{
			{ID: "endpoint-1", EndpointURL: "http://kubernetes-mcp.test-ns.svc.cluster.local:8080/mcp"},
		}, "")
		return json.Unmarshal(page, response)
	}

	status := cascadeDeleteRegistryAccessEndpoint(context.Background(), app, models.McpDeployment{
		Name: "kubernetes-mcp", Namespace: "test-ns", RegistryServer: "io.github.example/kubernetes-mcp",
		Port: 8080, Path: "/mcp",
	})

	if searchCalls != 2 {
		t.Fatalf("expected 2 search calls (following pagination), got %d", searchCalls)
	}
	if deleteCalls != 1 {
		t.Fatalf("expected 1 delete call for the match found on page 2, got %d", deleteCalls)
	}
	if status != RegistryAccessEndpointCleanupSucceeded {
		t.Fatalf("expected status %q, got %q", RegistryAccessEndpointCleanupSucceeded, status)
	}
}

func TestCascadeDeleteRegistryAccessEndpointFailsWhenPageCapExceeded(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)

	// Always returns a NextPageToken, so a naive loop would spin forever without the cap.
	client.CallHandler = func(_ context.Context, method, _ string, _ interface{}, response interface{}) error {
		if method == "DELETE" {
			t.Fatal("expected no match/delete before the page cap is hit")
		}
		page := mustMarshalEndpointsPage(t, nil, "next-page-token")
		return json.Unmarshal(page, response)
	}

	status := cascadeDeleteRegistryAccessEndpoint(context.Background(), app, models.McpDeployment{
		Name: "kubernetes-mcp", Namespace: "test-ns", RegistryServer: "io.github.example/kubernetes-mcp",
		Port: 8080, Path: "/mcp",
	})
	if status != RegistryAccessEndpointCleanupFailed {
		t.Fatalf("expected status %q when the page cap is exceeded, got %q", RegistryAccessEndpointCleanupFailed, status)
	}
}

// TestMcpDeploymentDeleteCascadesRegistryAccessEndpoint verifies the full delete handler
// wiring: Get -> Delete -> respond 204 immediately, with the best-effort cascade kicked off
// in the background afterward rather than gating the response.
func TestMcpDeploymentDeleteCascadesRegistryAccessEndpoint(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)

	deleteCalls := 0
	cascadeDone := make(chan struct{})
	client.CallHandler = func(_ context.Context, method, _ string, _ interface{}, response interface{}) error {
		if method == "DELETE" {
			deleteCalls++
			close(cascadeDone)
			return nil
		}
		page := mustMarshalEndpointsPage(t, []mlflowMCPAccessEndpoint{
			{ID: "endpoint-1", EndpointURL: "http://kubernetes-mcp.test-ns.svc.cluster.local:8080/mcp"},
		}, "")
		return json.Unmarshal(page, response)
	}

	repo := &mockMcpDeploymentRepo{
		getFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace, name string) (models.McpDeployment, error) {
			return models.McpDeployment{
				Name: name, Namespace: namespace, RegistryServer: "io.github.example/kubernetes-mcp",
				Port: 8080, Path: "/mcp",
			}, nil
		},
		deleteFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _, _ string) error {
			return nil
		},
	}
	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentDelete(app, failDefault(t))
	req := httptest.NewRequest(http.MethodDelete, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "kubernetes-mcp"}})

	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rr.Code)
	}

	select {
	case <-cascadeDone:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for the background cascade to run")
	}
	if deleteCalls != 1 {
		t.Fatalf("expected the cascade to delete the matching registry access endpoint, got %d delete calls", deleteCalls)
	}
}

// TestMcpDeploymentDeleteSucceedsWhenCascadeFails proves the cascade can never block or
// fail the deployment deletion response -- even when the cascade is slow to fail, the
// response returns before it completes. This is a regression test for a bug where the
// cascade previously ran synchronously before responding: a slow/unreachable MLflow BFF
// could make the request fail (or appear to hang) on the client even though the deployment
// had already been deleted.
func TestMcpDeploymentDeleteSucceedsWhenCascadeFails(t *testing.T) {
	app := newRedHatTestAppWithMockBFFClients(t)
	mockFactory := app.BFFClientFactory().(*bffmocks.MockClientFactory)
	client := mockFactory.CreateClient(bffclient.BFFTargetMLflow, "").(*bffmocks.MockBFFClient)

	const cascadeDelay = 100 * time.Millisecond
	cascadeAttempted := make(chan struct{})
	client.CallHandler = func(_ context.Context, _, _ string, _ interface{}, _ interface{}) error {
		// Simulate a slow-to-fail MLflow BFF. If the handler waited on this before
		// responding (the bug this test guards against), the assertion on elapsed time
		// below would fail.
		time.Sleep(cascadeDelay)
		close(cascadeAttempted)
		return bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow)
	}

	repo := &mockMcpDeploymentRepo{
		getFn: func(_ context.Context, _ k8s.KubernetesClientInterface, namespace, name string) (models.McpDeployment, error) {
			return models.McpDeployment{
				Name: name, Namespace: namespace, RegistryServer: "io.github.example/kubernetes-mcp",
				Port: 8080, Path: "/mcp",
			}, nil
		},
		deleteFn: func(_ context.Context, _ k8s.KubernetesClientInterface, _, _ string) error {
			return nil
		},
	}
	withMcpDeploymentRepo(t, repo)

	handler := overrideMcpDeploymentDelete(app, failDefault(t))
	req := httptest.NewRequest(http.MethodDelete, api.McpDeploymentPath+"?namespace=test-ns", nil)
	rr := httptest.NewRecorder()

	start := time.Now()
	handler(rr, req, httprouter.Params{{Key: api.McpDeploymentName, Value: "kubernetes-mcp"}})
	elapsed := time.Since(start)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected status 204 even when the MLflow BFF is unreachable, got %d", rr.Code)
	}
	if elapsed >= cascadeDelay {
		t.Fatalf("expected the delete response to return before the slow cascade attempt completed, took %v", elapsed)
	}

	select {
	case <-cascadeAttempted:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for the background cascade attempt")
	}
}
