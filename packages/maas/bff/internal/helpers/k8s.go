package helper

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	clientRest "k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// GetKubeconfig returns the current KUBECONFIG configuration based on the default loading rules.
func GetKubeconfig() (*clientRest.Config, error) {
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)
	return kubeConfig.ClientConfig()
}

// BuildScheme builds a new runtime scheme with all the necessary types registered.
func BuildScheme() (*runtime.Scheme, error) {
	scheme := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add Kubernetes types to scheme: %w", err)
	}

	return scheme, nil
}

// GetClusterDomainUsingServiceAccount retrieves cluster domain using the pod's service account
func GetClusterDomainUsingServiceAccount(ctx context.Context, logger *slog.Logger) (string, error) {
	cfg, err := clientRest.InClusterConfig()
	if err != nil {
		return "", err
	}

	client, err := dynamic.NewForConfig(cfg)
	if err != nil {
		return "", err
	}

	gvr := schema.GroupVersionResource{Group: "config.openshift.io", Version: "v1", Resource: "ingresses"}
	result, err := client.Resource(gvr).Get(ctx, "cluster", v1.GetOptions{})
	if err != nil {
		return "", err
	}

	domain, found, err := unstructured.NestedString(result.Object, "spec", "domain")
	if err != nil {
		return "", err
	}

	if !found {
		return "", errors.New("invalid ingress config: cluster domain not found")
	}

	return domain, nil
}

// GetGatewayHostname reads the Gateway resource and returns a hostname for
// reaching the gateway. It prefers the internal hostname from
// status.addresses (keeps traffic in-cluster while still routing through
// Envoy/Authorino), then falls back to spec.listeners[].hostname (external).
func GetGatewayHostname(ctx context.Context, logger *slog.Logger, gatewayName, gatewayNamespace string) (string, error) {
	cfg, err := clientRest.InClusterConfig()
	if err != nil {
		return "", fmt.Errorf("in-cluster config: %w", err)
	}

	client, err := dynamic.NewForConfig(cfg)
	if err != nil {
		return "", fmt.Errorf("dynamic client: %w", err)
	}

	gvr := schema.GroupVersionResource{
		Group:    "gateway.networking.k8s.io",
		Version:  "v1",
		Resource: "gateways",
	}
	gw, err := client.Resource(gvr).Namespace(gatewayNamespace).Get(ctx, gatewayName, v1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get gateway %s/%s: %w", gatewayNamespace, gatewayName, err)
	}

	if hostname := gatewayInternalHostname(gw); hostname != "" {
		logger.Info("Resolved Gateway internal hostname from status.addresses", "gateway", gatewayNamespace+"/"+gatewayName, "hostname", hostname)
		return hostname, nil
	}

	if hostname := gatewayListenerHostname(gw); hostname != "" {
		logger.Info("Resolved Gateway external hostname from spec.listeners", "gateway", gatewayNamespace+"/"+gatewayName, "hostname", hostname)
		return hostname, nil
	}

	return "", fmt.Errorf("gateway %s/%s has no hostname in status.addresses or spec.listeners", gatewayNamespace, gatewayName)
}

// gatewayInternalHostname returns the first Hostname-type address from status.addresses.
func gatewayInternalHostname(gw *unstructured.Unstructured) string {
	addresses, found, err := unstructured.NestedSlice(gw.Object, "status", "addresses")
	if err != nil || !found {
		return ""
	}
	for _, addr := range addresses {
		addrMap, ok := addr.(map[string]any)
		if !ok {
			continue
		}
		if addrType, _ := addrMap["type"].(string); addrType == "Hostname" {
			if value, _ := addrMap["value"].(string); value != "" {
				return value
			}
		}
	}
	return ""
}

// gatewayListenerHostname returns the first non-empty hostname from spec.listeners.
func gatewayListenerHostname(gw *unstructured.Unstructured) string {
	listeners, found, err := unstructured.NestedSlice(gw.Object, "spec", "listeners")
	if err != nil || !found {
		return ""
	}
	for _, l := range listeners {
		lMap, ok := l.(map[string]any)
		if !ok {
			continue
		}
		if hostname, _ := lMap["hostname"].(string); hostname != "" {
			return hostname
		}
	}
	return ""
}
