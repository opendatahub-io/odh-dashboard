package integrations

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

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
