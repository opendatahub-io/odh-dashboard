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
