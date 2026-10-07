package integrations

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNewHTTPClientWithTransportReusesSharedTransport(t *testing.T) {
	shared := NewSharedHTTPTransport(false, nil)
	first, err := NewHTTPClientWithTransport(slog.Default(), "", "https://example.com", nil, false, nil, shared)
	require.NoError(t, err)
	second, err := NewHTTPClientWithTransport(slog.Default(), "", "https://example.com", nil, false, nil, shared)
	require.NoError(t, err)

	require.Same(t, shared, first.(*HTTPClient).client.Transport)
	require.Same(t, shared, second.(*HTTPClient).client.Transport)
}

func TestReadResponseBodyAcceptsMaximumSize(t *testing.T) {
	body, err := readResponseBody(strings.NewReader(strings.Repeat("a", maxResponseBodySize)))

	require.NoError(t, err)
	require.Len(t, body, maxResponseBodySize)
}

func TestReadResponseBodyRejectsOversizedBody(t *testing.T) {
	body, err := readResponseBody(strings.NewReader(strings.Repeat("a", maxResponseBodySize+1)))

	require.Error(t, err)
	require.Nil(t, body)
	require.ErrorContains(t, err, "response body exceeds maximum size")
}

func TestNewHTTPErrorDoesNotExposeRawResponseBody(t *testing.T) {
	err := newHTTPError(502, []byte("internal upstream details"))

	var httpErr *HTTPError
	require.ErrorAs(t, err, &httpErr)
	require.Equal(t, "502", httpErr.Code)
	require.Equal(t, "upstream service returned an error", httpErr.Message)
}

func TestHTTPClientRejectsRedirects(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		http.Redirect(writer, request, "/redirected", http.StatusFound)
	}))
	defer server.Close()

	client, err := NewHTTPClient(slog.Default(), "", server.URL, nil, false, nil)
	require.NoError(t, err)
	_, err = client.GET("/")

	require.ErrorContains(t, err, "redirects are not allowed")
}
