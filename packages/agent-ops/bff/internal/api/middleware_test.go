package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/stretchr/testify/assert"
)

func TestInjectRequestIdentity_SkipsAuthWhenDisabled(t *testing.T) {
	app := &App{
		config: config.EnvConfig{AuthMethod: config.AuthMethodDisabled},
	}

	req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/runtimes", nil)
	rr := httptest.NewRecorder()

	handlerCalled := false
	handler := app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.True(t, handlerCalled, "next handler should be called when auth is disabled")
}

func TestInjectRequestIdentity_NilFactoryPanicsWithoutDisabledAuth(t *testing.T) {
	app := &App{
		config: config.EnvConfig{AuthMethod: config.AuthMethodInternal},
	}

	req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/runtimes", nil)
	rr := httptest.NewRecorder()

	assert.Panics(t, func() {
		app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})).ServeHTTP(rr, req)
	})
}

func TestInjectRequestIdentity_SkipsNonAPIPaths(t *testing.T) {
	app := &App{
		config: config.EnvConfig{AuthMethod: config.AuthMethodInternal},
	}

	req := httptest.NewRequest(http.MethodGet, HealthCheckPath, nil)
	rr := httptest.NewRecorder()

	handlerCalled := false
	handler := app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.True(t, handlerCalled, "next handler should be called for non-API paths")
}
