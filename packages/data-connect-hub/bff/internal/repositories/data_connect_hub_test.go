package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	httpclient "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/httpclient"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/models"
	"github.com/stretchr/testify/require"
)

func TestListConnectionsValidatesEveryItem(t *testing.T) {
	var valid models.Connection
	require.NoError(t, json.Unmarshal([]byte(`{
		"metadata":{"id":"550e8400-e29b-41d4-a716-446655440001"},
		"resource":{"name":"warehouse","data_connection_type_id":"550e8400-e29b-41d4-a716-446655440003","format":"tabular"},
		"status":{"state":"ready"}
	}`), &valid))
	for _, tc := range []struct {
		name   string
		mutate func(*models.Connection)
	}{
		{"missing id", func(c *models.Connection) { c.Metadata.ID = "" }},
		{"missing name", func(c *models.Connection) { c.Resource.Name = "" }},
		{"missing type id", func(c *models.Connection) { c.Resource.DataConnectionTypeID = "" }},
		{"missing format", func(c *models.Connection) { c.Resource.Format = "" }},
		{"invalid format", func(c *models.Connection) { c.Resource.Format = "unsupported" }},
		{"missing state", func(c *models.Connection) { c.Status.State = "" }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			invalid := valid
			tc.mutate(&invalid)
			// A valid first entry must not escape as a partial result.
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				require.NoError(t, json.NewEncoder(w).Encode(map[string]any{"items": []models.Connection{valid, invalid}}))
			}))
			defer upstream.Close()
			client, err := httpclient.NewHTTPClient(slog.Default(), "", upstream.URL, nil, false, nil)
			require.NoError(t, err)
			connections, err := NewDataConnectHubRepository(client).ListConnections(context.Background())
			require.ErrorContains(t, err, "invalid data connection at index 1")
			require.Nil(t, connections)
		})
	}
}

func TestListConnectionsPreservesEmptyList(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, err := w.Write([]byte(`{"items":[]}`))
		require.NoError(t, err)
	}))
	defer upstream.Close()
	client, err := httpclient.NewHTTPClient(slog.Default(), "", upstream.URL, nil, false, nil)
	require.NoError(t, err)
	connections, err := NewDataConnectHubRepository(client).ListConnections(context.Background())
	require.NoError(t, err)
	require.NotNil(t, connections)
	require.Empty(t, connections)
}

func TestDataConnectHubRepositoryHonorsCancellation(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-r.Context().Done()
	}))
	defer upstream.Close()
	client, err := httpclient.NewHTTPClient(slog.Default(), "", upstream.URL, nil, false, nil)
	require.NoError(t, err)
	repository := NewDataConnectHubRepository(client)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err = repository.ListConnections(ctx)
	require.True(t, errors.Is(err, context.Canceled), "got %v", err)
}

func TestDataConnectHubRepositoryRejectsInvalidTypeIDs(t *testing.T) {
	// No HTTP transport is needed: reject unsafe IDs before making a request.
	repository := NewDataConnectHubRepository(nil)
	for _, id := range []string{"..", "", "../connections", "not-a-uuid"} {
		_, err := repository.GetConnectionType(context.Background(), id)
		require.Error(t, err)
	}
}
