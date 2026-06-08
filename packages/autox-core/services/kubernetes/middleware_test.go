package kubernetes

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

type stubExtractor struct {
	identity *RequestIdentity
	err      error
}

func (s *stubExtractor) Extract(http.Header) (*RequestIdentity, error) {
	return s.identity, s.err
}

func TestInjectRequestIdentity(t *testing.T) {
	t.Run("injects identity into context", func(t *testing.T) {
		extractor := &stubExtractor{
			identity: &RequestIdentity{UserID: "alice", Groups: []string{"devs"}},
		}
		var gotIdentity *RequestIdentity
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			id, err := IdentityFromContext(r.Context())
			if err != nil {
				t.Error(err)
				return
			}
			gotIdentity = id
		})

		mw := InjectRequestIdentity(InjectRequestIdentityConfig{Extractor: extractor})
		req := httptest.NewRequest("GET", "/api/resource", nil)
		rr := httptest.NewRecorder()

		mw(handler).ServeHTTP(rr, req)

		if gotIdentity == nil {
			t.Fatal("identity not injected")
		}
		if gotIdentity.UserID != "alice" {
			t.Errorf("UserID = %q, want %q", gotIdentity.UserID, "alice")
		}
	})

	t.Run("default error handler returns 400", func(t *testing.T) {
		extractor := &stubExtractor{err: fmt.Errorf("bad header")}
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("handler should not be called")
		})

		mw := InjectRequestIdentity(InjectRequestIdentityConfig{Extractor: extractor})
		req := httptest.NewRequest("GET", "/api/resource", nil)
		rr := httptest.NewRecorder()

		mw(handler).ServeHTTP(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rr.Code)
		}
	})

	t.Run("custom error handler", func(t *testing.T) {
		extractor := &stubExtractor{err: fmt.Errorf("unauthorized")}
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("handler should not be called")
		})

		mw := InjectRequestIdentity(InjectRequestIdentityConfig{
			Extractor: extractor,
			OnError: func(w http.ResponseWriter, r *http.Request, err error) {
				http.Error(w, "custom: "+err.Error(), http.StatusUnauthorized)
			},
		})
		req := httptest.NewRequest("GET", "/api/resource", nil)
		rr := httptest.NewRecorder()

		mw(handler).ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rr.Code)
		}
	})

	t.Run("legacy context key", func(t *testing.T) {
		type legacyKey string
		const key legacyKey = "identity"

		extractor := &stubExtractor{
			identity: &RequestIdentity{UserID: "bob"},
		}
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			legacyVal := r.Context().Value(key)
			if legacyVal == nil {
				t.Error("legacy context key not set")
				return
			}
			id, ok := legacyVal.(*RequestIdentity)
			if !ok {
				t.Error("legacy value is not *RequestIdentity")
				return
			}
			if id.UserID != "bob" {
				t.Errorf("legacy UserID = %q, want %q", id.UserID, "bob")
			}

			stdID, err := IdentityFromContext(r.Context())
			if err != nil {
				t.Error("standard identity not found:", err)
				return
			}
			if stdID.UserID != "bob" {
				t.Errorf("standard UserID = %q, want %q", stdID.UserID, "bob")
			}
		})

		mw := InjectRequestIdentity(InjectRequestIdentityConfig{
			Extractor:  extractor,
			ContextKey: key,
		})
		req := httptest.NewRequest("GET", "/api/resource", nil)
		rr := httptest.NewRecorder()

		mw(handler).ServeHTTP(rr, req)
	})
}
