package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/stretchr/testify/assert"
)

// varyMembers splits every Vary field value into its comma-separated members,
// lowercased, so assertions do not depend on how the members are combined.
func varyMembers(h http.Header) []string {
	var members []string
	for _, v := range h.Values(constants.HeaderVary) {
		for _, m := range strings.Split(v, ",") {
			if m = strings.TrimSpace(m); m != "" {
				members = append(members, strings.ToLower(m))
			}
		}
	}
	return members
}

// AC (RHOAIENG-101219): authenticated bootstrap responses prevent shared
// caching. no-store forbids storage by compliant caches; Vary keys any cache
// that honours it on the caller's identity headers.
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

			vary := varyMembers(rr.Header())
			assert.Contains(t, vary, strings.ToLower(constants.HeaderAuthorization))
			assert.Contains(t, vary, strings.ToLower(constants.HeaderForwardedToken))
			assert.Contains(t, vary, strings.ToLower(constants.HeaderCookie))
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

	assert.Empty(t, varyMembers(rr.Header()))
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
	for _, m := range varyMembers(rr.Header()) {
		if m == strings.ToLower(constants.HeaderAuthorization) {
			authorizationEntries++
		}
	}
	assert.Equal(t, 1, authorizationEntries)
}
