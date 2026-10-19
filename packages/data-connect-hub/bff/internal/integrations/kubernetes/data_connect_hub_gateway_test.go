package kubernetes

import (
	"log/slog"
	"testing"

	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestGatewayURLFromResourcePrefersListenerHostname(t *testing.T) {
	gateway := &unstructured.Unstructured{Object: map[string]interface{}{
		"spec": map[string]interface{}{
			"listeners": []interface{}{map[string]interface{}{"hostname": "dch.example.com"}},
		},
		"status": map[string]interface{}{
			"addresses": []interface{}{map[string]interface{}{"value": "internal.example.com"}},
		},
	}}

	url, err := gatewayURLFromResource(gateway, "opendatahub", "odh-gateway", slog.Default())

	require.NoError(t, err)
	require.Equal(t, "https://dch.example.com", url)
}

func TestGatewayURLFromResourceFallsBackToStatusAddress(t *testing.T) {
	gateway := &unstructured.Unstructured{Object: map[string]interface{}{
		"status": map[string]interface{}{
			"addresses": []interface{}{map[string]interface{}{"value": "internal.example.com"}},
		},
	}}

	url, err := gatewayURLFromResource(gateway, "opendatahub", "odh-gateway", slog.Default())

	require.NoError(t, err)
	require.Equal(t, "https://internal.example.com", url)
}

func TestHTTPSURLForAddressBracketsIPv6(t *testing.T) {
	require.Equal(t, "https://[2001:db8::1]", httpsURLForAddress("2001:db8::1"))
	require.Equal(t, "https://[2001:db8::1]:443", httpsURLForAddress("[2001:db8::1]:443"))
	require.Equal(t, "https://10.0.0.5", httpsURLForAddress("10.0.0.5"))
	require.Equal(t, "https://gateway.example.com", httpsURLForAddress("gateway.example.com"))
}
