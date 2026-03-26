package evalhub

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"

	k8s "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
)

const crDiscoveryTimeout = 10 * time.Second

// DiscoverEvalHubURL attempts to find the EvalHub service URL by listing EvalHub CRs
// in the given namespace and reading status.url from the first found instance.
//
// This uses the pod's service account credentials (rest.InClusterConfig), so no user
// token is needed. It is intended to be called once at startup — the resolved URL is
// then reused for every request, avoiding per-request K8s API calls.
//
// The pod's service account must have RBAC permission to list
// evalhubs.trustyai.opendatahub.io in the given namespace for discovery to succeed.
// Set the EVAL_HUB_URL environment variable to skip discovery entirely.
func DiscoverEvalHubURL(namespace string) (string, error) {
	if strings.TrimSpace(namespace) == "" {
		return "", fmt.Errorf("namespace cannot be empty for EvalHub CR discovery")
	}

	restCfg, err := rest.InClusterConfig()
	if err != nil {
		return "", fmt.Errorf("DiscoverEvalHubURL requires in-cluster execution: failed to get in-cluster config: %w", err)
	}

	dynClient, err := dynamic.NewForConfig(restCfg)
	if err != nil {
		return "", fmt.Errorf("failed to create dynamic client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), crDiscoveryTimeout)
	defer cancel()

	list, err := dynClient.Resource(k8s.EvalHubGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to list EvalHub CRs in namespace %q: %w", namespace, err)
	}

	if len(list.Items) == 0 {
		return "", fmt.Errorf("no EvalHub instance found in namespace %q", namespace)
	}

	item := list.Items[0]
	status, ok := item.Object["status"].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("EvalHub CR %q in namespace %q has no status field", item.GetName(), namespace)
	}

	serviceURL, ok := status["url"].(string)
	if !ok || strings.TrimSpace(serviceURL) == "" {
		return "", fmt.Errorf("EvalHub CR %q in namespace %q has no status.url", item.GetName(), namespace)
	}

	serviceURL = strings.TrimSpace(serviceURL)
	parsed, err := url.ParseRequestURI(serviceURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return "", fmt.Errorf("EvalHub CR %q in namespace %q has invalid status.url %q", item.GetName(), namespace, serviceURL)
	}
	if parsed.User != nil {
		return "", fmt.Errorf("EvalHub CR %q in namespace %q status.url must not include credentials", item.GetName(), namespace)
	}

	return serviceURL, nil
}
