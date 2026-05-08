package maas

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// newTestClient spins up an httptest.Server with the given handler and wires it to a MaasClient.
func newTestClient(t *testing.T, handler http.Handler) *MaasClient {
	t.Helper()
	ts := httptest.NewServer(handler)
	t.Cleanup(ts.Close)
	u, _ := url.Parse(ts.URL)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	return NewMaasClient(logger, u)
}

// jsonHandler returns an HTTP handler that responds with the JSON encoding of v.
func jsonHandler(t *testing.T, v any) http.Handler {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("failed to marshal test response: %v", err)
	}
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(b)
	})
}

func TestSearchAPIKeys_NilDataNormalized(t *testing.T) {
	// Simulate the upstream MaaS API returning null for data (e.g. no keys exist)
	body := map[string]any{
		"object":   "list",
		"data":     nil,
		"has_more": false,
	}
	client := newTestClient(t, jsonHandler(t, body))

	result, err := client.SearchAPIKeys(context.Background(), models.APIKeySearchRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Data == nil {
		t.Error("Data must not be nil after normalization")
	}
	if len(result.Data) != 0 {
		t.Errorf("expected empty Data slice, got %v", result.Data)
	}
}

func TestListSubscriptionsForApiKeys_NilModelRefsNormalized(t *testing.T) {
	// Simulate the upstream MaaS API returning null for model_refs
	body := []map[string]any{
		{
			"subscription_id_header":   "test-sub",
			"subscription_description": "Test",
			"priority":                 1,
			"model_refs":               nil,
		},
	}
	client := newTestClient(t, jsonHandler(t, body))

	result, err := client.ListSubscriptionsForApiKeys(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result))
	}
	if result[0].ModelRefs == nil {
		t.Error("ModelRefs must not be nil after normalization")
	}
	if len(result[0].ModelRefs) != 0 {
		t.Errorf("expected empty ModelRefs slice, got %v", result[0].ModelRefs)
	}
}

func TestListSubscriptionsForApiKeys_NilTokenRateLimitsNormalized(t *testing.T) {
	// Simulate the upstream MaaS API returning null for token_rate_limits inside a model ref
	body := []map[string]any{
		{
			"subscription_id_header":   "test-sub",
			"subscription_description": "Test",
			"priority":                 1,
			"model_refs": []map[string]any{
				{
					"name":              "my-model",
					"namespace":         "llm",
					"token_rate_limits": nil,
				},
			},
		},
	}
	client := newTestClient(t, jsonHandler(t, body))

	result, err := client.ListSubscriptionsForApiKeys(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 || len(result[0].ModelRefs) != 1 {
		t.Fatalf("expected 1 sub with 1 model ref, got %+v", result)
	}
	if result[0].ModelRefs[0].TokenRateLimits == nil {
		t.Error("TokenRateLimits must not be nil after normalization")
	}
	if len(result[0].ModelRefs[0].TokenRateLimits) != 0 {
		t.Errorf("expected empty TokenRateLimits slice, got %v", result[0].ModelRefs[0].TokenRateLimits)
	}
}

func TestListSubscriptionsForApiKeys_ValidDataPassedThrough(t *testing.T) {
	// Upstream returns well-formed data with actual rate limits — must not be altered
	body := []models.SubscriptionListItem{
		{
			SubscriptionIDHeader: "premium-sub",
			Priority:             10,
			ModelRefs: []models.ModelRefInfo{
				{
					Name: "granite-3-8b",
					TokenRateLimits: []models.TokenRateLimitInfo{
						{Limit: 1000, Window: "1h"},
					},
				},
			},
		},
	}
	client := newTestClient(t, jsonHandler(t, body))

	result, err := client.ListSubscriptionsForApiKeys(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result))
	}
	got := result[0].ModelRefs[0].TokenRateLimits[0]
	if got.Limit != 1000 || got.Window != "1h" {
		t.Errorf("rate limit data was altered: got %+v", got)
	}
}
