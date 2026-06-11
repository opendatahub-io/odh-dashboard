package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"

	helper "github.com/opendatahub-io/eval-hub/bff/internal/helpers"
)

const crDiscoveryTimeout = 10 * time.Second

// EvalHubCRDiscoverer abstracts cluster-wide EvalHub CR discovery so the App layer
// can swap in a mock for tests without needing real SA credentials.
type EvalHubCRDiscoverer interface {
	// DiscoverServiceURL lists EvalHub CRs across all namespaces using the pod's
	// service account and returns the service URL from the first found CR.
	// Returns ("", nil) when no CR exists anywhere in the cluster.
	DiscoverServiceURL(ctx context.Context) (string, error)

	// DiscoverCRStatus lists EvalHub CRs across all namespaces using the pod's
	// service account and returns the full status of the first found CR.
	// Returns (nil, nil) when no CR exists anywhere in the cluster.
	DiscoverCRStatus(ctx context.Context) (*models.EvalHubCRStatus, error)
}

// SADiscoverer discovers EvalHub CRs using the pod's service account credentials.
// This decouples CR discovery (privileged, cluster-wide) from user request auth,
// matching the pattern used by the MLflow BFF.
type SADiscoverer struct {
	logger    *slog.Logger
	dynClient dynamic.Interface
}

// NewSADiscoverer creates a discoverer that uses in-cluster SA credentials.
// Falls back to kubeconfig for local development.
func NewSADiscoverer(logger *slog.Logger) (*SADiscoverer, error) {
	cfg, err := rest.InClusterConfig()
	if err != nil {
		logger.Debug("In-cluster config not available, falling back to kubeconfig", "error", err)
		cfg, err = helper.GetKubeconfig()
		if err != nil {
			return nil, fmt.Errorf("failed to get kubeconfig for SA discovery: %w", err)
		}
	}

	dynClient, err := dynamic.NewForConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client for SA discovery: %w", err)
	}

	return &SADiscoverer{logger: logger, dynClient: dynClient}, nil
}

// NewSADiscovererFromClient creates a SADiscoverer with a pre-built dynamic client.
// Intended for tests that inject a fake dynamic client.
func NewSADiscovererFromClient(logger *slog.Logger, dynClient dynamic.Interface) *SADiscoverer {
	return &SADiscoverer{logger: logger, dynClient: dynClient}
}

func (d *SADiscoverer) DiscoverServiceURL(ctx context.Context) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, crDiscoveryTimeout)
	defer cancel()

	list, err := d.dynClient.Resource(EvalHubGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		return "", fmt.Errorf("SA discovery: failed to list EvalHub CRs cluster-wide: %w", err)
	}

	if len(list.Items) == 0 {
		d.logger.Debug("SA discovery: no EvalHub CR found in the cluster")
		return "", nil
	}

	if len(list.Items) > 1 {
		d.logger.Warn("SA discovery: multiple EvalHub CRs found cluster-wide, using first",
			"count", len(list.Items))
	}

	item := &list.Items[0]
	status, ok := item.Object["status"].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("SA discovery: EvalHub CR %q in namespace %q has no status field",
			item.GetName(), item.GetNamespace())
	}

	serviceURL, ok := status["url"].(string)
	if !ok || strings.TrimSpace(serviceURL) == "" {
		return "", fmt.Errorf("SA discovery: EvalHub CR %q in namespace %q has no status.url",
			item.GetName(), item.GetNamespace())
	}

	d.logger.Debug("SA discovery: resolved EvalHub service URL",
		"namespace", item.GetNamespace(),
		"crName", item.GetName(),
		"serviceURL", serviceURL)

	return serviceURL, nil
}

func (d *SADiscoverer) DiscoverCRStatus(ctx context.Context) (*models.EvalHubCRStatus, error) {
	ctx, cancel := context.WithTimeout(ctx, crDiscoveryTimeout)
	defer cancel()

	list, err := d.dynClient.Resource(EvalHubGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("SA discovery: failed to list EvalHub CRs cluster-wide: %w", err)
	}

	if len(list.Items) == 0 {
		d.logger.Debug("SA discovery: no EvalHub CR found in the cluster")
		return nil, nil
	}

	if len(list.Items) > 1 {
		d.logger.Warn("SA discovery: multiple EvalHub CRs found cluster-wide, using first",
			"count", len(list.Items))
	}

	return ParseEvalHubCRStatus(&list.Items[0])
}
