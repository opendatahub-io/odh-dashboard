package kubernetes

import (
	"context"
	"fmt"
	"log/slog"

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
	if route, routeErr := client.Resource(routeGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{}); routeErr == nil {
		host, found, nestedErr := unstructured.NestedString(route.Object, "spec", "host")
		if nestedErr == nil && found && host != "" {
			logger.Info("resolved Data Connect Hub API URL from gateway Route", "route", namespace+"/"+name)
			return "https://" + host, nil
		}
	}

	gateway, err := client.Resource(gatewayGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get gateway Route or Gateway %s/%s: %w", namespace, name, err)
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
		return "https://" + value, nil
	}
	return "", fmt.Errorf("Gateway %s/%s has no usable status address", namespace, name)
}
