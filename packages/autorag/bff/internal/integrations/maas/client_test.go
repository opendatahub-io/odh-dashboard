package maas

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func testHTTPClient() *http.Client {
	return &http.Client{Transport: http.DefaultTransport}
}

func TestClientListModels(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/maas-api/v1/models" || r.Header.Get("Accept") != "application/json" || r.Header.Get("Authorization") != "Bearer secret-key" || r.Header.Get("X-MaaS-Return-All-Models") != "" {
			t.Errorf("headers = %v", r.Header)
		}
		_, _ = w.Write([]byte(`{"data":[{"id":"model-a"}]}`))
	}))
	defer server.Close()
	response, err := NewClient(testHTTPClient()).ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"})
	if err != nil || len(response.Data) != 1 || response.Data[0].ID != "model-a" {
		t.Fatalf("response/error = %+v/%v", response, err)
	}
}

func TestClientHonorsConfiguredTLSTransport(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"data":[]}`))
	}))
	defer server.Close()

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} //nolint:gosec // test server uses a self-signed certificate
	client := NewClient(&http.Client{Transport: transport})

	if _, err := client.ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"}); err != nil {
		t.Fatalf("configured TLS transport was not honored: %v", err)
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
	_, err := NewClient(testHTTPClient()).ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"})
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
	_, err := NewClient(testHTTPClient()).ListModels(
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
		_, err := NewClient(testHTTPClient()).ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"})
		server.Close()
		transportErr, ok := err.(*TransportError)
		if !ok || transportErr.StatusCode != test.want {
			t.Errorf("status %d: error = %#v", test.status, err)
		}
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("bad")) }))
	_, err := NewClient(testHTTPClient()).ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"})
	server.Close()
	transportErr, ok := err.(*TransportError)
	if !ok || transportErr.StatusCode != http.StatusBadGateway {
		t.Fatalf("malformed error = %#v", err)
	}
}

func TestClientRejectsInvalidEnvelopes(t *testing.T) {
	for _, body := range []string{`{}`, `{"data":null}`, `{"data":{}}`} {
		t.Run(body, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				_, _ = io.WriteString(w, body)
			}))
			defer server.Close()

			_, err := NewClient(testHTTPClient()).ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"})
			var transportErr *TransportError
			if !errors.As(err, &transportErr) || transportErr.StatusCode != http.StatusBadGateway {
				t.Fatalf("error = %#v", err)
			}
		})
	}
}

func TestClientAcceptsEmptyData(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = io.WriteString(w, `{"data":[]}`)
	}))
	defer server.Close()

	response, err := NewClient(testHTTPClient()).ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"})
	if err != nil || response.Data == nil || len(response.Data) != 0 {
		t.Fatalf("response/error = %#v/%v", response, err)
	}
}

func TestClientRejectsOversizedResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = io.WriteString(w, fmt.Sprintf(`{"data":[{"id":"%s"}]}`, string(make([]byte, maxResponseBytes))))
	}))
	defer server.Close()

	_, err := NewClient(testHTTPClient()).ListModels(context.Background(), RequestConfig{GatewayOrigin: server.URL, APIKey: "secret-key"})
	if !errors.Is(err, ErrResponseTooLarge) {
		t.Fatalf("error = %#v, want ErrResponseTooLarge", err)
	}
}

func TestClientDoesNotFollowRedirectOrSendBearerToken(t *testing.T) {
	var redirectedRequest bool
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		redirectedRequest = true
		if got := r.Header.Get("Authorization"); got != "" {
			t.Errorf("redirected authorization = %q", got)
		}
	}))
	defer target.Close()
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Location", target.URL)
		w.WriteHeader(http.StatusFound)
	}))
	defer origin.Close()

	_, err := NewClient(testHTTPClient()).ListModels(context.Background(), RequestConfig{GatewayOrigin: origin.URL, APIKey: "secret-key"})
	if redirectedRequest {
		t.Fatal("redirect was followed")
	}
	var transportErr *TransportError
	if !errors.As(err, &transportErr) || transportErr.StatusCode != http.StatusBadGateway {
		t.Fatalf("error = %#v", err)
	}
}

func TestDefaultClientBlocksLoopback(t *testing.T) {
	_, err := NewClient(nil).ListModels(context.Background(), RequestConfig{
		GatewayOrigin: "https://127.0.0.1:443",
		APIKey:        "secret-key",
	})
	var transportErr *TransportError
	if !errors.As(err, &transportErr) || transportErr.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("error = %#v", err)
	}
}
