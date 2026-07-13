package kubernetes

import (
	"context"
	"log/slog"
	"sort"
	"strings"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

var mcpServerRegistrationGVR = schema.GroupVersionResource{
	Group:    "mcp.kuadrant.io",
	Version:  "v1alpha1",
	Resource: "mcpserverregistrations",
}

var legacyMCPServerRegistrationGVR = schema.GroupVersionResource{
	Group:    "mcp.kagenti.com",
	Version:  "v1alpha1",
	Resource: "mcpserverregistrations",
}

// listMCPToolConnections returns MCP ServerRegistration labels in the namespace.
// Registrations are namespace-scoped today; there is no per-agent link convention yet.
// The MCP CRD is optional; missing CRDs or access errors yield an empty slice.
func listMCPToolConnections(ctx context.Context, dynamicClient dynamic.Interface, logger *slog.Logger, namespace string) []string {
	if dynamicClient == nil || namespace == "" {
		return []string{}
	}

	labels := make(map[string]struct{})
	for _, gvr := range []schema.GroupVersionResource{mcpServerRegistrationGVR, legacyMCPServerRegistrationGVR} {
		list, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
		if err != nil {
			if logger != nil && !meta.IsNoMatchError(err) && !apierrors.IsNotFound(err) && !apierrors.IsForbidden(err) {
				logger.Warn("failed to list MCP server registrations for agent card enrichment",
					slog.String("namespace", namespace),
					slog.String("group", gvr.Group),
					slog.Any("error", err))
			}
			continue
		}
		for _, item := range list.Items {
			if label := mcpRegistrationLabel(&item); label != "" {
				labels[label] = struct{}{}
			}
		}
	}

	out := make([]string, 0, len(labels))
	for label := range labels {
		out = append(out, label)
	}
	sort.Strings(out)
	return out
}

func mcpRegistrationLabel(obj *unstructured.Unstructured) string {
	if obj == nil {
		return ""
	}

	spec, ok := obj.Object["spec"].(map[string]any)
	if ok {
		if prefix := strings.TrimSpace(stringField(spec["toolPrefix"])); prefix != "" {
			return prefix
		}
	}

	return strings.TrimSpace(obj.GetName())
}
