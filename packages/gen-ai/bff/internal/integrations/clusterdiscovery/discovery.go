// Package clusterdiscovery provides stateless Kubernetes discovery shared by
// BFF telemetry and playground configuration. Callers own retry and readiness
// policy; discovery never starts background workers or caches results.
package clusterdiscovery

import (
	"context"
	"fmt"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

const discoveryTimeout = 10 * time.Second

// NewClient loads the service-account configuration, falling back to kubeconfig
// for local development. The returned config is also used by the playground
// manager for authentication to MLflow.
func NewClient() (dynamic.Interface, *rest.Config, error) {
	cfg, err := rest.InClusterConfig()
	if err != nil {
		loadedCfg, loadErr := clientcmd.NewDefaultClientConfigLoadingRules().Load()
		if loadErr != nil {
			return nil, nil, fmt.Errorf("failed to get cluster config (in-cluster and kubeconfig both failed): %w", loadErr)
		}
		cfg, err = clientcmd.NewDefaultClientConfig(*loadedCfg, &clientcmd.ConfigOverrides{}).ClientConfig()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to build kubeconfig client config: %w", err)
		}
	}

	dynClient, err := dynamic.NewForConfig(cfg)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}
	return dynClient, cfg, nil
}

// Collectors records each collector independently. Telemetry can use an
// existing gen-ai collector, but playground provisioning requires the platform
// collector's namespace and service account.
type Collectors struct {
	PlatformNamespace string
	GenAINamespace    string
}

// DiscoverCollectors lists collector CRs once, bounded by both the caller's
// context and the discovery timeout. Missing collectors are represented by
// empty namespaces so each caller can apply its own readiness policy. A known
// collector name in multiple namespaces is ambiguous and fails discovery.
func DiscoverCollectors(ctx context.Context, dynClient dynamic.Interface) (Collectors, error) {
	ctx, cancel := context.WithTimeout(ctx, discoveryTimeout)
	defer cancel()

	list, err := dynClient.Resource(constants.OTelCollectorGVR).Namespace("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return Collectors{}, fmt.Errorf("failed to list OpenTelemetryCollector CRs: %w", err)
	}

	var result Collectors
	for _, item := range list.Items {
		switch item.GetName() {
		case constants.PlatformCollectorName:
			if result.PlatformNamespace != "" && result.PlatformNamespace != item.GetNamespace() {
				return Collectors{}, fmt.Errorf("ambiguous %s collector: found in namespaces %q and %q",
					constants.PlatformCollectorName, result.PlatformNamespace, item.GetNamespace())
			}
			result.PlatformNamespace = item.GetNamespace()
		case constants.GenAICollectorName:
			if result.GenAINamespace != "" && result.GenAINamespace != item.GetNamespace() {
				return Collectors{}, fmt.Errorf("ambiguous %s collector: found in namespaces %q and %q",
					constants.GenAICollectorName, result.GenAINamespace, item.GetNamespace())
			}
			result.GenAINamespace = item.GetNamespace()
		}
	}
	return result, nil
}

// GenAICollectorEndpoint constructs the future collector service address even
// before playground installation creates the gen-ai collector CR.
func GenAICollectorEndpoint(namespace string) string {
	if namespace == "" {
		return ""
	}
	return fmt.Sprintf("http://%s-collector.%s.svc:4318", constants.GenAICollectorName, namespace)
}
