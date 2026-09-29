package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	clientrest "k8s.io/client-go/rest"

	helper "github.com/opendatahub-io/data-connect-hub/bff/internal/helpers"
)

var routeGVR = schema.GroupVersionResource{Group: "route.openshift.io", Version: "v1", Resource: "routes"}
var gatewayGVR = schema.GroupVersionResource{Group: "gateway.networking.k8s.io", Version: "v1", Resource: "gateways"}

func ResolveDataConnectHubGatewayURL(ctx context.Context, namespace, name string, logger *slog.Logger) (string, error) {
	restConfig, err := clientrest.InClusterConfig()
	if err != nil {
		restConfig, err = helper.GetKubeconfig()
		if err != nil {
			return "", fmt.Errorf("failed to get Kubernetes config: %w", err)
		}
	}
	client, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return "", fmt.Errorf("failed to create dynamic Kubernetes client: %w", err)
	}
	route, routeErr := client.Resource(routeGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if routeErr == nil {
		host, found, nestedErr := unstructured.NestedString(route.Object, "spec", "host")
		if nestedErr == nil && found && host != "" {
			logger.Info("resolved Data Connect Hub API URL from gateway Route", "route", namespace+"/"+name)
			return "https://" + host, nil
		}
	} else {
		logger.Debug("gateway Route lookup failed; trying Gateway API resource", "route", namespace+"/"+name, "error", routeErr)
	}

	gateway, err := client.Resource(gatewayGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get gateway Route or Gateway %s/%s: %w", namespace, name, err)
	}
	return gatewayURLFromResource(gateway, namespace, name, logger)
}

func gatewayURLFromResource(gateway *unstructured.Unstructured, namespace, name string, logger *slog.Logger) (string, error) {
	listeners, found, err := unstructured.NestedSlice(gateway.Object, "spec", "listeners")
	if err == nil && found {
		for _, rawListener := range listeners {
			listener, ok := rawListener.(map[string]interface{})
			if !ok {
				continue
			}
			hostname, _ := listener["hostname"].(string)
			if hostname != "" && !strings.Contains(hostname, "*") {
				logger.Info("resolved Data Connect Hub API URL from Gateway listener", "gateway", namespace+"/"+name)
				return "https://" + hostname, nil
			}
		}
	}

	addresses, found, err := unstructured.NestedSlice(gateway.Object, "status", "addresses")
	if err != nil || !found {
		return "", fmt.Errorf("Gateway %s/%s has no status.addresses", namespace, name)
	}
	for _, rawAddress := range addresses {
		address, ok := rawAddress.(map[string]interface{})
		if !ok {
			continue
		}
		value, _ := address["value"].(string)
		if value == "" {
			continue
		}
		logger.Info("resolved Data Connect Hub API URL from Gateway status", "gateway", namespace+"/"+name)
		return httpsURLForAddress(value), nil
	}
	return "", fmt.Errorf("Gateway %s/%s has no usable status address", namespace, name)
}

func httpsURLForAddress(address string) string {
	parsedIP := net.ParseIP(address)
	if strings.HasPrefix(address, "[") || parsedIP == nil || parsedIP.To4() != nil {
		return "https://" + address
	}
	return "https://[" + address + "]"
}
