package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/maas-library/bff/internal/config"
	helper "github.com/opendatahub-io/maas-library/bff/internal/helpers"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

func TestRequireMaasApiReady_Returns503WhenUnavailable(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repos, err := repositories.NewRepositories(logger, nil, config.EnvConfig{}, nil, nil, nil, nil, nil)
	if err != nil {
		t.Fatalf("NewRepositories: %v", err)
	}
	app := &App{
		config:       config.EnvConfig{},
		logger:       logger,
		repositories: repos,
		maasApiURL:   helper.NewMaasApiURLHolder(""),
	}

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/models", nil)
	if app.requireMaasApiReady(rr, req) {
		t.Fatal("expected requireMaasApiReady to return false")
	}

	res := rr.Result()
	defer res.Body.Close()
	if res.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", res.StatusCode)
	}

	var body HTTPError
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Error.Message != "maas-api is not available" {
		t.Fatalf("message = %q", body.Error.Message)
	}
}

func TestHandlerWithMaasApi_Returns503WhenUnavailable(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repos, err := repositories.NewRepositories(logger, nil, config.EnvConfig{}, nil, nil, nil, nil, nil)
	if err != nil {
		t.Fatalf("NewRepositories: %v", err)
	}
	app := &App{
		config:       config.EnvConfig{},
		logger:       logger,
		repositories: repos,
		maasApiURL:   helper.NewMaasApiURLHolder(""),
	}

	called := false
	handle := handlerWithMaasApi(app, func(*App, http.ResponseWriter, *http.Request, httprouter.Params) {
		called = true
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/models", nil)
	handle(rr, req, nil)

	if called {
		t.Fatal("handler should not run when maas-api is unavailable")
	}
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rr.Code)
	}
}

func TestHandlerWithMaasApi_AllowsRequestWhenReady(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	maasFakeServer := maas.CreateMaasFakeServer()
	defer maasFakeServer.Close()

	envConfig := config.EnvConfig{MaasApiUrl: maasFakeServer.URL}
	repos, err := repositories.NewRepositories(logger, nil, envConfig, nil, nil, nil, nil, nil)
	if err != nil {
		t.Fatalf("NewRepositories: %v", err)
	}

	app := &App{
		config:       envConfig,
		repositories: repos,
		logger:       logger,
		maasApiURL:   helper.NewMaasApiURLHolder(maasFakeServer.URL),
	}

	called := false
	handle := handlerWithMaasApi(app, func(*App, http.ResponseWriter, *http.Request, httprouter.Params) {
		called = true
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/models", nil)
	handle(rr, req, nil)

	if !called {
		t.Fatal("handler should run when maas-api URL is ready")
	}
}

func TestWireMaasApiURL_EnablesReadyHandlers(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	maasFakeServer := maas.CreateMaasFakeServer()
	defer maasFakeServer.Close()

	envConfig := config.EnvConfig{MaasApiUrl: ""}
	repos, err := repositories.NewRepositories(logger, nil, envConfig, nil, nil, nil, nil, nil)
	if err != nil {
		t.Fatalf("NewRepositories: %v", err)
	}

	holder := helper.NewMaasApiURLHolder("")
	app := &App{
		config:       envConfig,
		repositories: repos,
		logger:       logger,
		maasApiURL:   holder,
	}

	if app.requireMaasApiReady(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil)) {
		t.Fatal("expected not ready before wire")
	}

	if err := app.wireMaasApiURL(maasFakeServer.URL); err != nil {
		t.Fatalf("wireMaasApiURL: %v", err)
	}

	if !app.requireMaasApiReady(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil)) {
		t.Fatal("expected ready after wire")
	}
	if got, ok := holder.URL(); !ok || got != maasFakeServer.URL {
		t.Fatalf("holder URL = (%q, %v), want %q", got, ok, maasFakeServer.URL)
	}
	if app.config.MaasApiUrl != maasFakeServer.URL {
		t.Fatalf("config.MaasApiUrl = %q", app.config.MaasApiUrl)
	}
}
