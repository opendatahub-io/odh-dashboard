package mlflow

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
)

// MLflow CRD constants for Kubernetes CR auto-discovery.
// When MLFLOW_URL is not provided, the BFF discovers the MLflow service URL
// by listing MLflow CRs in the pod namespace and reading status.address.url.
const (
	MLflowCRDGroup    = "mlflow.opendatahub.io"
	MLflowCRDVersion  = "v1"
	MLflowCRDResource = "mlflows"
)

// MLflowGVR is the GroupVersionResource for MLflow custom resources, used with the dynamic client.
var MLflowGVR = schema.GroupVersionResource{
	Group:    MLflowCRDGroup,
	Version:  MLflowCRDVersion,
	Resource: MLflowCRDResource,
}

const crDiscoveryTimeout = 10 * time.Second

// DiscoverMLflowURL attempts to find the MLflow tracking URL by listing
// cluster-scoped MLflow CRs and reading status.address.url. Returns the
// in-cluster service URL when exactly one MLflow CR exists, or an error if
// zero or multiple CRs are found. This is a best-effort startup discovery.
//
// The MLflow CRD (mlflows.mlflow.opendatahub.io) is cluster-scoped, so the
// list is performed without a namespace filter.
//
// The pod's service account must have RBAC permission to list
// mlflows.mlflow.opendatahub.io at the cluster scope for auto-discovery
// to succeed.
func DiscoverMLflowURL() (string, error) {
	restCfg, err := rest.InClusterConfig()
	if err != nil {
		return "", fmt.Errorf("failed to get in-cluster config: %w", err)
	}

	dynClient, err := dynamic.NewForConfig(restCfg)
	if err != nil {
		return "", fmt.Errorf("failed to create dynamic client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), crDiscoveryTimeout)
	defer cancel()

	list, err := dynClient.Resource(MLflowGVR).List(ctx, metav1.ListOptions{Limit: 2})
	if err != nil {
		return "", fmt.Errorf("failed to list MLflow CRs: %w", err)
	}

	if len(list.Items) == 0 {
		return "", fmt.Errorf("no MLflow CR found in the cluster")
	}

	if len(list.Items) > 1 || list.GetContinue() != "" {
		return "", fmt.Errorf("multiple MLflow CRs found; set MLFLOW_URL explicitly or narrow discovery criteria")
	}

	return parseAddressURL(&list.Items[0])
}

// parseAddressURL extracts status.address.url from an unstructured MLflow CR.
func parseAddressURL(item *unstructured.Unstructured) (string, error) {
	status, ok := item.Object["status"].(map[string]any)
	if !ok {
		return "", fmt.Errorf("MLflow CR %q has no status field", item.GetName())
	}

	address, ok := status["address"].(map[string]any)
	if !ok {
		return "", fmt.Errorf("MLflow CR %q has no status.address field", item.GetName())
	}

	serviceURL, ok := address["url"].(string)
	if !ok {
		return "", fmt.Errorf("MLflow CR %q has no status.address.url", item.GetName())
	}
	serviceURL = strings.TrimSpace(serviceURL)
	if serviceURL == "" {
		return "", fmt.Errorf("MLflow CR %q has empty status.address.url", item.GetName())
	}

	parsed, err := url.ParseRequestURI(serviceURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return "", fmt.Errorf("MLflow CR %q has invalid status.address.url", item.GetName())
	}
	if parsed.User != nil {
		return "", fmt.Errorf("MLflow CR %q status.address.url must not include credentials", item.GetName())
	}

	return serviceURL, nil
}
