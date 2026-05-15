package pipelines

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// DiscoverReadyDSPA discovers a ready DSPA instance in the namespace.
// Results are cached per namespace with the same TTL as pipeline discovery.
func (s *PipelinesService) DiscoverReadyDSPA(ctx context.Context, namespace string) (string, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("discovering ready DSPA", "namespace", namespace)

	if cached, ok := s.dspaCache.get(namespace); ok {
		logger.Debug("using cached DSPA URL", "namespace", namespace, "url", cached)
		return cached, nil
	}

	// DSPA CRD has multiple API versions across ODH/RHOAI releases; try newest first
	dspaGVR, err := s.K8sService.DiscoverResourceGVR(
		ctx,
		"datasciencepipelinesapplications.opendatahub.io",
		"datasciencepipelinesapplications",
		namespace,
		[]string{"v1", "v1beta1", "v1alpha1"},
	)
	if err != nil {
		s.Logger.Error("failed to discover DSPA GVR", "namespace", namespace, "error", err)
		return "", fmt.Errorf("failed to discover DSPA GVR in namespace %s: %w", namespace, err)
	}

	dspas, err := s.K8sService.ListResources(ctx, dspaGVR, namespace)
	if err != nil {
		s.Logger.Error("failed to list DSPAs", "namespace", namespace, "error", err)
		return "", fmt.Errorf("failed to list DSPAs in namespace %s: %w", namespace, err)
	}

	for _, dspa := range dspas.Items {
		conditions, found, err := unstructured.NestedSlice(dspa.Object, "status", "conditions")
		if err != nil || !found {
			continue
		}

		isReady := false
		for _, cond := range conditions {
			condMap, ok := cond.(map[string]any)
			if !ok {
				continue
			}
			if condMap["type"] == "Ready" && condMap["status"] == "True" {
				isReady = true
				break
			}
		}

		if !isReady {
			continue
		}

		components, found, err := unstructured.NestedMap(dspa.Object, "status", "components")
		if err != nil || !found {
			continue
		}

		apiServer, found, err := unstructured.NestedMap(components, "apiServer")
		if err != nil || !found {
			continue
		}

		baseURL, found, err := unstructured.NestedString(apiServer, "url")
		if err != nil || !found || baseURL == "" {
			continue
		}

		if err := validateDSPAURL(baseURL); err != nil {
			logger.Warn("skipping DSPA with invalid URL", "name", dspa.GetName(), "url", baseURL, "error", err)
			continue
		}

		logger.Info("found ready DSPA", "name", dspa.GetName(), "namespace", namespace)
		s.dspaCache.set(namespace, baseURL)
		return baseURL, nil
	}

	return "", fmt.Errorf("no ready DSPA found in namespace %s", namespace)
}

// validateDSPAURL ensures the base URL is safe to use as a pipeline server endpoint.
// Blocks cloud metadata endpoints, loopback, link-local, and non-HTTP schemes.
func validateDSPAURL(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("malformed URL: %w", err)
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("unsupported scheme %q: must be http or https", parsed.Scheme)
	}

	if parsed.User != nil {
		return fmt.Errorf("URL must not contain credentials")
	}

	hostname := parsed.Hostname()
	if hostname == "" {
		return fmt.Errorf("URL must contain a hostname")
	}

	ip := net.ParseIP(hostname)
	if ip != nil {
		if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
			return fmt.Errorf("URL must not point to loopback or link-local address")
		}
		if strings.HasPrefix(hostname, "169.254.") {
			return fmt.Errorf("URL must not point to cloud metadata endpoint")
		}
	}

	return nil
}
