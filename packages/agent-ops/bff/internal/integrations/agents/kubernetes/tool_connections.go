package kubernetes

import (
	"context"
	"sort"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

var mcpServerRegistrationGVRs = []schema.GroupVersionResource{
	{Group: "mcp.kuadrant.io", Version: "v1alpha1", Resource: "mcpserverregistrations"},
	{Group: "mcp.kagenti.com", Version: "v1alpha1", Resource: "mcpserverregistrations"},
}

// listMCPToolConnections returns MCP ServerRegistration labels in the namespace.
// Registrations are namespace-scoped today; there is no per-agent link convention yet.
// The MCP CRD is optional; missing CRDs or access errors yield an empty slice.
func listMCPToolConnections(ctx context.Context, dynamicClient dynamic.Interface, namespace string) []string {
	if dynamicClient == nil || namespace == "" {
		return []string{}
	}

	seen := map[string]struct{}{}
	out := make([]string, 0)

	for _, gvr := range mcpServerRegistrationGVRs {
		for _, label := range listMCPToolConnectionsForGVR(ctx, dynamicClient, namespace, gvr) {
			if _, exists := seen[label]; exists {
				continue
			}
			seen[label] = struct{}{}
			out = append(out, label)
		}
	}

	sort.Strings(out)
	return out
}

func listMCPToolConnectionsForGVR(
	ctx context.Context,
	dynamicClient dynamic.Interface,
	namespace string,
	gvr schema.GroupVersionResource,
) []string {
	list, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return []string{}
	}

	out := make([]string, 0, len(list.Items))
	for _, item := range list.Items {
		if label := mcpRegistrationLabel(&item); label != "" {
			out = append(out, label)
		}
	}
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
