package bffclient

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The caller's token is sent in a custom header, which net/http forwards on
// every redirect, including to another host. The client must refuse such a
// redirect before the request goes out.
func TestHTTPBFFClient_RefusesACrossOriginRedirect(t *testing.T) {
	var otherHits atomic.Int32
	other := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		otherHits.Add(1)
		_, _ = w.Write([]byte(`{}`))
	}))
	defer other.Close()
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, other.URL+"/api/v1/models", http.StatusFound)
	}))
	defer origin.Close()

	client := NewHTTPBFFClient(origin.URL, BFFTargetMaaS, "caller-token", false, nil)
	var out map[string]any
	err := client.Call(context.Background(), http.MethodGet, "/api/v1/models", nil, &out)

	require.Error(t, err)
	assert.Zero(t, otherHits.Load(), "the redirected request must never be sent")
}
