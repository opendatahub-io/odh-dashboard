package maas

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientListModels(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/maas-api/v1/models" || r.Header.Get("Accept") != "application/json" || r.Header.Get("Authorization") != "Bearer secret-key" || r.Header.Get("X-MaaS-Return-All-Models") != "" {
			t.Errorf("headers = %v", r.Header)
		}
		_, _ = w.Write([]byte(`{"data":[{"id":"model-a"}]}`))
	}))
	defer server.Close()
	response, err := NewClient(nil).ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"})
	if err != nil || len(response.Data) != 1 || response.Data[0].ID != "model-a" {
		t.Fatalf("response/error = %+v/%v", response, err)
	}
}

func TestClientAlwaysUsesSecretBearerAuth(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret-key" {
			t.Errorf("authorization = %q", r.Header.Get("Authorization"))
		}
		_, _ = w.Write([]byte(`{"data":[]}`))
	}))
	defer server.Close()
	_, err := NewClient(nil).ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"})
	if err != nil {
		t.Fatal(err)
	}
}

func TestClientSecretConfigUsesConfiguredAuth(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret-key" {
			t.Errorf("authorization = %q", r.Header.Get("Authorization"))
		}
		_, _ = w.Write([]byte(`{"data":[]}`))
	}))
	defer server.Close()
	_, err := NewClient(nil).ListModels(
		context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"},
	)
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
		_, err := NewClient(nil).ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"})
		server.Close()
		transportErr, ok := err.(*TransportError)
		if !ok || transportErr.StatusCode != test.want {
			t.Errorf("status %d: error = %#v", test.status, err)
		}
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("bad")) }))
	_, err := NewClient(nil).ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"})
	server.Close()
	transportErr, ok := err.(*TransportError)
	if !ok || transportErr.StatusCode != http.StatusBadGateway {
		t.Fatalf("malformed error = %#v", err)
	}
}
