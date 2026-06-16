package kubernetes

import (
	"context"
	"log/slog"
	"sort"
	"strings"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

var openshiftRouteGVR = schema.GroupVersionResource{
	Group:    "route.openshift.io",
	Version:  "v1",
	Resource: "routes",
}

// findExternalAgentCardURL returns a public agent card URL when an OpenShift Route
// targets the agent Service. Failures are best-effort and return an empty string.
func findExternalAgentCardURL(ctx context.Context, dynamicClient dynamic.Interface, logger *slog.Logger, namespace, serviceName string) string {
	serviceName = strings.TrimSpace(serviceName)
	if dynamicClient == nil || namespace == "" || serviceName == "" {
		return ""
	}

	list, err := dynamicClient.Resource(openshiftRouteGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		if logger != nil && !apierrors.IsNotFound(err) && !apierrors.IsForbidden(err) {
			logger.Debug("failed to list routes for external agent card URL",
				slog.String("namespace", namespace),
				slog.String("service", serviceName),
				slog.Any("error", err))
		}
		return ""
	}

	candidates := make([]routeCandidate, 0, len(list.Items))
	for _, item := range list.Items {
		item := item
		if !routeTargetsService(&item, serviceName) {
			continue
		}
		if cardURL := routeAgentCardURL(&item); cardURL != "" {
			candidates = append(candidates, routeCandidate{
				url:      cardURL,
				priority: routeSelectionPriority(&item, serviceName),
				tieBreak: item.GetName(),
			})
		}
	}
	if len(candidates) == 0 {
		return ""
	}

	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].priority != candidates[j].priority {
			return candidates[i].priority < candidates[j].priority
		}
		if candidates[i].tieBreak != candidates[j].tieBreak {
			return candidates[i].tieBreak < candidates[j].tieBreak
		}
		return candidates[i].url < candidates[j].url
	})
	return candidates[0].url
}

type routeCandidate struct {
	url      string
	priority int
	tieBreak string
}

func routeSelectionPriority(route *unstructured.Unstructured, serviceName string) int {
	if route == nil {
		return 2
	}
	if strings.EqualFold(route.GetName(), serviceName) {
		return 0
	}
	spec, ok := route.Object["spec"].(map[string]any)
	if !ok {
		return 2
	}
	host := strings.ToLower(strings.TrimSpace(stringField(spec["host"])))
	service := strings.ToLower(serviceName)
	if host != "" && service != "" && strings.Contains(host, service) {
		return 1
	}
	return 2
}

func routeTargetsService(route *unstructured.Unstructured, serviceName string) bool {
	if route == nil {
		return false
	}

	spec, ok := route.Object["spec"].(map[string]any)
	if !ok {
		return false
	}

	to, ok := spec["to"].(map[string]any)
	if !ok {
		return false
	}

	kind := strings.ToLower(stringField(to["kind"]))
	if kind != "" && kind != "service" {
		return false
	}

	return strings.EqualFold(stringField(to["name"]), serviceName)
}

func routeAgentCardURL(route *unstructured.Unstructured) string {
	spec, ok := route.Object["spec"].(map[string]any)
	if !ok {
		return ""
	}

	host := strings.TrimSpace(stringField(spec["host"]))
	if host == "" || strings.HasPrefix(host, "*.") {
		return ""
	}

	scheme := "http"
	if tls, ok := spec["tls"].(map[string]any); ok && tls != nil {
		scheme = "https"
	}

	path := strings.TrimSpace(stringField(spec["path"]))
	cardPath := agents.A2AAgentCardPath()
	if path == "" {
		path = cardPath
	} else if !strings.HasSuffix(path, cardPath) {
		path = strings.TrimSuffix(path, "/") + cardPath
	}

	return agents.BuildSanitizedHTTPURL(scheme, host, path)
}
