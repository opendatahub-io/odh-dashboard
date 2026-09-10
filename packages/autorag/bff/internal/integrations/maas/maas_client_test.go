package maas

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestListModels(t *testing.T) {
	client := NewMaaSClient(&http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		assert.Equal(t, "/maas-api/v1/models", r.URL.Path)
		assert.Equal(t, "Bearer test-key", r.Header.Get("Authorization"))
		body, err := json.Marshal(map[string]any{
			"object": "list",
			"data": []models.MaaSNativeModel{{
				ID:      "model-a",
				OwnedBy: "models",
				Ready:   true,
			}},
		})
		require.NoError(t, err)
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(string(body)))}, nil
	})})

	got, err := client.ListModels(context.Background(), "https://maas.apps.cluster/maas-api/", "test-key")
	require.NoError(t, err)
	require.Len(t, got, 1)
	assert.Equal(t, "model-a", got[0].ID)
}

func TestBuildModelsURL(t *testing.T) {
	tests := []struct {
		name    string
		baseURL string
		want    string
		wantErr bool
	}{
		{name: "root base", baseURL: "https://maas.apps.cluster/", want: "https://maas.apps.cluster/v1/models"},
		{name: "path base", baseURL: "https://maas.apps.cluster/maas-api/", want: "https://maas.apps.cluster/maas-api/v1/models"},
		{name: "credentials rejected", baseURL: "https://user:pass@maas.apps.cluster", wantErr: true},
		{name: "query rejected", baseURL: "https://maas.apps.cluster?token=secret", wantErr: true},
		{name: "fragment rejected", baseURL: "https://maas.apps.cluster#models", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildModelsURL(tt.baseURL)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestListModelsMapsUpstreamErrors(t *testing.T) {
	client := NewMaaSClient(&http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusUnauthorized, Body: io.NopCloser(strings.NewReader("{}"))}, nil
	})})
	_, err := client.ListModels(context.Background(), "https://maas.apps.cluster", "key")
	var maaSErr *MaaSError
	require.ErrorAs(t, err, &maaSErr)
	assert.Equal(t, ErrCodeUnauthorized, maaSErr.Code)
	assert.Equal(t, http.StatusUnauthorized, maaSErr.StatusCode)
}
