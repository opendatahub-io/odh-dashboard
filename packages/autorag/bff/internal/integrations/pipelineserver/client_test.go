package pipelineserver

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListPipelineVersions_SinglePage(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.Path, "/apis/v2beta1/pipelines/pipe-1/versions")
		assert.Empty(t, r.URL.Query().Get("page_token"))

		resp := models.KFPipelineVersionsResponse{
			PipelineVersions: []models.KFPipelineVersion{
				{PipelineVersionID: "v1", PipelineID: "pipe-1", DisplayName: "version-1"},
				{PipelineVersionID: "v2", PipelineID: "pipe-1", DisplayName: "version-2"},
			},
			TotalSize: 2,
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewRealPipelineServerClient(server.URL, "", nil)
	result, err := client.ListPipelineVersions(context.Background(), "pipe-1")

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Len(t, result.PipelineVersions, 2)
	assert.Equal(t, int32(2), result.TotalSize)
	assert.Equal(t, "v1", result.PipelineVersions[0].PipelineVersionID)
	assert.Equal(t, "v2", result.PipelineVersions[1].PipelineVersionID)
}

func TestListPipelineVersions_MultiplePages(t *testing.T) {
	t.Parallel()
	var callCount atomic.Int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		call := callCount.Add(1)
		pageToken := r.URL.Query().Get("page_token")

		var resp models.KFPipelineVersionsResponse
		switch call {
		case 1:
			assert.Empty(t, pageToken)
			resp = models.KFPipelineVersionsResponse{
				PipelineVersions: []models.KFPipelineVersion{
					{PipelineVersionID: "v1", PipelineID: "pipe-1"},
				},
				TotalSize:     3,
				NextPageToken: "token-page-2",
			}
		case 2:
			assert.Equal(t, "token-page-2", pageToken)
			resp = models.KFPipelineVersionsResponse{
				PipelineVersions: []models.KFPipelineVersion{
					{PipelineVersionID: "v2", PipelineID: "pipe-1"},
				},
				TotalSize:     3,
				NextPageToken: "token-page-3",
			}
		case 3:
			assert.Equal(t, "token-page-3", pageToken)
			resp = models.KFPipelineVersionsResponse{
				PipelineVersions: []models.KFPipelineVersion{
					{PipelineVersionID: "v3", PipelineID: "pipe-1"},
				},
				TotalSize: 3,
			}
		default:
			t.Fatal("unexpected extra page request")
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewRealPipelineServerClient(server.URL, "", nil)
	result, err := client.ListPipelineVersions(context.Background(), "pipe-1")

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, int32(3), callCount.Load())
	assert.Len(t, result.PipelineVersions, 3)
	assert.Equal(t, int32(3), result.TotalSize)
	assert.Equal(t, "v1", result.PipelineVersions[0].PipelineVersionID)
	assert.Equal(t, "v2", result.PipelineVersions[1].PipelineVersionID)
	assert.Equal(t, "v3", result.PipelineVersions[2].PipelineVersionID)
}

func TestListPipelineVersions_EmptyResponse(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		resp := models.KFPipelineVersionsResponse{}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewRealPipelineServerClient(server.URL, "", nil)
	result, err := client.ListPipelineVersions(context.Background(), "pipe-1")

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Empty(t, result.PipelineVersions)
}

func TestListPipelineVersions_EmptyPipelineID(t *testing.T) {
	t.Parallel()
	client := NewRealPipelineServerClient("http://unused", "", nil)
	_, err := client.ListPipelineVersions(context.Background(), "")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "pipelineID is required")
}

func TestListPipelineVersions_ErrorOnSecondPage(t *testing.T) {
	t.Parallel()
	var callCount atomic.Int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		call := callCount.Add(1)
		if call == 1 {
			resp := models.KFPipelineVersionsResponse{
				PipelineVersions: []models.KFPipelineVersion{
					{PipelineVersionID: "v1", PipelineID: "pipe-1"},
				},
				TotalSize:     2,
				NextPageToken: "token-page-2",
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(resp)
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("internal error"))
	}))
	defer server.Close()

	client := NewRealPipelineServerClient(server.URL, "", nil)
	_, err := client.ListPipelineVersions(context.Background(), "pipe-1")

	assert.Error(t, err)
	var httpErr *HTTPError
	assert.ErrorAs(t, err, &httpErr)
	assert.Equal(t, http.StatusInternalServerError, httpErr.StatusCode)
}

func TestListPipelineVersions_ExceedsMaxPages(t *testing.T) {
	t.Parallel()
	var callCount atomic.Int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		callCount.Add(1)
		resp := models.KFPipelineVersionsResponse{
			PipelineVersions: []models.KFPipelineVersion{
				{PipelineVersionID: "v1", PipelineID: "pipe-1"},
			},
			TotalSize:     9999,
			NextPageToken: "always-more",
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewRealPipelineServerClient(server.URL, "", nil)
	_, err := client.ListPipelineVersions(context.Background(), "pipe-1")

	require.Error(t, err)
	assert.Contains(t, err.Error(), "pagination limit reached")
	assert.Equal(t, int32(maxPaginationPages), callCount.Load())
}

func TestListPipelineVersions_AuthTokenForwarded(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
		resp := models.KFPipelineVersionsResponse{}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewRealPipelineServerClient(server.URL, "test-token", nil)
	_, err := client.ListPipelineVersions(context.Background(), "pipe-1")
	require.NoError(t, err)
}
