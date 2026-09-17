package helper

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNormalizeHTTPSUpstreamURL(t *testing.T) {
	url, err := NormalizeHTTPSUpstreamURL("https://gateway.example.com///")

	require.NoError(t, err)
	require.Equal(t, "https://gateway.example.com", url)
}

func TestNormalizeHTTPSUpstreamURLRejectsNonHTTPS(t *testing.T) {
	_, err := NormalizeHTTPSUpstreamURL("http://gateway.example.com")

	require.Error(t, err)
}
