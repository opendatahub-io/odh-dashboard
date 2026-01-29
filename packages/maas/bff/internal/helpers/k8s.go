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
