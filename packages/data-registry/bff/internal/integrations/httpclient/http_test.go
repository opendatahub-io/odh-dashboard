package httpclient

import (
	"strings"
	"testing"
	"time"
)

func TestNewHTTPClientHasRequestTimeout(t *testing.T) {
	client, err := NewHTTPClient(nil, "", "https://example.com", nil, false)
	if err != nil {
		t.Fatalf("NewHTTPClient() error = %v", err)
	}

	httpClient, ok := client.(*HTTPClient)
	if !ok {
		t.Fatalf("NewHTTPClient() returned %T, want *HTTPClient", client)
	}
	if got := httpClient.client.Timeout; got != 30*time.Second {
		t.Errorf("HTTP client timeout = %s, want %s", got, 30*time.Second)
	}
}

func TestReadResponseBodyRejectsOversizedResponses(t *testing.T) {
	oversizedBody := strings.NewReader(strings.Repeat("x", maxResponseBodySize+1))
	if _, err := readResponseBody(oversizedBody); err == nil {
		t.Fatal("readResponseBody() accepted a response larger than the configured limit")
	}
}

func TestReadResponseBodyAcceptsResponsesWithinLimit(t *testing.T) {
	want := "upstream response"
	got, err := readResponseBody(strings.NewReader(want))
	if err != nil {
		t.Fatalf("readResponseBody() error = %v", err)
	}
	if string(got) != want {
		t.Fatalf("readResponseBody() = %q, want %q", got, want)
	}
}
