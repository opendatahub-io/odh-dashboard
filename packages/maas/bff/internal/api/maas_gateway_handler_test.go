package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	helper "github.com/opendatahub-io/maas-library/bff/internal/helpers"
)

func TestGetMaaSGatewayURLHandler(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	t.Run("returns the discovered external MaaS API URL", func(t *testing.T) {
		app := &App{
			logger:     logger,
			maasApiURL: helper.NewMaasApiURLHolder("https://maas.apps.example.com/maas-api"),
		}
		rr := httptest.NewRecorder()

		GetMaaSGatewayURLHandler(app, rr, httptest.NewRequest(http.MethodGet, "/api/v1/gateway-url", nil), nil)

		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
		}
		var response struct {
			Data struct {
				URL string `json:"url"`
			} `json:"data"`
		}
		if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if response.Data.URL != "https://maas.apps.example.com/maas-api" {
			t.Fatalf("url = %q", response.Data.URL)
		}
	})

	t.Run("returns service unavailable while discovery is in progress", func(t *testing.T) {
		app := &App{logger: logger, maasApiURL: helper.NewMaasApiURLHolder("")}
		rr := httptest.NewRecorder()

		GetMaaSGatewayURLHandler(app, rr, httptest.NewRequest(http.MethodGet, "/api/v1/gateway-url", nil), nil)

		if rr.Code != http.StatusServiceUnavailable {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusServiceUnavailable)
		}
	})
}
