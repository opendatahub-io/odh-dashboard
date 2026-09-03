package maas

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientListModels(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token" || r.Header.Get(ReturnAllModelsHeader) != "true" {
			t.Errorf("headers = %v", r.Header)
		}
		_, _ = w.Write([]byte(`{"data":{"data":[{"id":"model-a"}]}}`))
	}))
	defer server.Close()
	response, err := NewClient(server.URL, "user_token", "Authorization", "Bearer ", nil).ListModels(context.Background(), "token", map[string]string{ReturnAllModelsHeader: "true"})
	if err != nil || len(response.Data.Data) != 1 || response.Data.Data[0].ID != "model-a" {
		t.Fatalf("response/error = %+v/%v", response, err)
	}
}

func TestClientInternalAuthDoesNotSendToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "" {
			t.Errorf("unexpected Authorization header")
		}
		_, _ = w.Write([]byte(`{"data":{"data":[]}}`))
	}))
	defer server.Close()
	_, err := NewClient(server.URL, "internal", "Authorization", "Bearer ", nil).ListModels(context.Background(), "token", nil)
	if err != nil {
		t.Fatal(err)
	}
}

func TestClientErrors(t *testing.T) {
	for _, test := range []struct{ status, want int }{
		{http.StatusUnauthorized, http.StatusUnauthorized},
		{http.StatusForbidden, http.StatusForbidden},
		{http.StatusBadRequest, http.StatusBadRequest},
		{http.StatusBadGateway, http.StatusServiceUnavailable},
	} {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(test.status) }))
		_, err := NewClient(server.URL, "user_token", "Authorization", "", nil).ListModels(context.Background(), "token", nil)
		server.Close()
		transportErr, ok := err.(*TransportError)
		if !ok || transportErr.StatusCode != test.want {
			t.Errorf("status %d: error = %#v", test.status, err)
		}
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("bad")) }))
	_, err := NewClient(server.URL, "user_token", "Authorization", "", nil).ListModels(context.Background(), "token", nil)
	server.Close()
	transportErr, ok := err.(*TransportError)
	if !ok || transportErr.StatusCode != http.StatusBadGateway {
		t.Fatalf("malformed error = %#v", err)
	}
}
