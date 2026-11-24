package repositories

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	httpclient "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/httpclient"
	"github.com/stretchr/testify/require"
)

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
