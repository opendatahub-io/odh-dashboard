package pipelines

import (
	"context"
	"fmt"

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

		logger.Info("found ready DSPA", "name", dspa.GetName(), "url", baseURL)
		s.dspaCache.set(namespace, baseURL)
		return baseURL, nil
	}

	return "", fmt.Errorf("no ready DSPA found in namespace %s", namespace)
}
