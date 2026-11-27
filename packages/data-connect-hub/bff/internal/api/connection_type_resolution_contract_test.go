//go:build contract

package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/config"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/require"
)

// TestConnectionTypeResolutionContractServer exercises production handlers with
// controlled upstream responses. The shared contract runner manages its lifetime.
func TestConnectionTypeResolutionContractServer(t *testing.T) {
	if os.Getenv("CONTRACT_FIXTURE_SERVER") != "true" {
		t.Skip("managed by the central contract runner")
	}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		namespace := r.Header.Get("X-Tenant-ID")
		connections := mockConnections(namespace)[:1]
		var payload any
		if strings.Contains(r.URL.Path, "connection-types") {
			connectionType := mockConnectionTypes(namespace)[0]
			body, err := json.Marshal(connectionType)
			require.NoError(t, err)
			var object map[string]any
			require.NoError(t, json.Unmarshal(body, &object))
			resource := object["resource"].(map[string]any)
			switch namespace {
			case "omitted":
				delete(resource, "credentials_fields")
			case "null":
				resource["credentials_fields"] = nil
			case "empty":
				resource["credentials_fields"] = []any{}
			}
			payload = object
			if strings.HasSuffix(r.URL.Path, "/connection-types") {
				payload = map[string]any{"items": []any{object}}
			}
		} else if strings.HasSuffix(r.URL.Path, "/connections") {
			switch namespace {
			case "invalid-connection":
				connections = append(connections, Connection{})
			case "empty-connections":
				connections = []Connection{}
			}
			payload = map[string]any{"items": connections}
		} else {
			payload = connections[0]
		}
		w.Header().Set("Content-Type", "application/json")
		require.NoError(t, json.NewEncoder(w).Encode(payload))
	}))
	t.Cleanup(upstream.Close)
	app := &App{
		config: config.EnvConfig{DataConnectHubAPIURL: upstream.URL, MockK8Client: true},
		logger: slog.New(slog.NewJSONHandler(os.Stderr, nil)),
	}
	router := httprouter.New()
	router.GET("/healthcheck", func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
		w.WriteHeader(http.StatusOK)
	})
	router.GET(ConnectionsPath, app.GetConnectionsHandler)
	router.GET(ConnectionPath, app.GetConnectionHandler)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity := &k8s.RequestIdentity{UserID: "test-user", Token: "test-token"}
		ctx := context.WithValue(r.Context(), constants.RequestIdentityKey, identity)
		router.ServeHTTP(w, r.WithContext(ctx))
	}))
	t.Cleanup(server.Close)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	fmt.Println(server.URL)
	<-ctx.Done()
}
