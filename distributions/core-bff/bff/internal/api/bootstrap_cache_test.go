package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/stretchr/testify/assert"
)

// AC (RHOAIENG-101219): authenticated bootstrap responses prevent shared
// caching. no-store forbids storage; Vary additionally stops an intermediary
// that keys only on the URL from serving one caller's bootstrap to another.
func TestBootstrapResponsesPreventSharedCaching(t *testing.T) {
	app := newTestApp()
	handler := app.SetSecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for _, path := range []string{
		StatusPath,
		ConfigPath,
		ComponentsPath,
		PathPrefix + StatusPath,
	} {
		t.Run(path, func(t *testing.T) {
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, path, nil))

			assert.Equal(t, constants.CacheControlNoStore, rr.Header().Get(constants.HeaderCacheControl))

			vary := rr.Header().Values(constants.HeaderVary)
			assert.Contains(t, vary, constants.HeaderAuthorization)
			assert.Contains(t, vary, constants.HeaderForwardedToken)
			assert.Contains(t, vary, constants.HeaderCookie)
		})
	}
}

// Static assets are identity-independent and keep their own cache policy.
func TestStaticResponsesAreNotMarkedVaryOnIdentity(t *testing.T) {
	app := newTestApp()
	handler := app.SetSecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/assets/main.1a2b3c4d.js", nil))

	assert.Empty(t, rr.Header().Values(constants.HeaderVary))
}

// A handler that already set Vary keeps its entry exactly once.
func TestVaryIsNotDuplicated(t *testing.T) {
	app := newTestApp()
	handler := app.SetSecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set(constants.HeaderVary, "authorization")
		w.WriteHeader(http.StatusOK)
	}))

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, StatusPath, nil))

	var authorizationEntries int
	for _, v := range rr.Header().Values(constants.HeaderVary) {
		if v == "authorization" || v == constants.HeaderAuthorization {
			authorizationEntries++
		}
	}
	assert.Equal(t, 1, authorizationEntries)
}
