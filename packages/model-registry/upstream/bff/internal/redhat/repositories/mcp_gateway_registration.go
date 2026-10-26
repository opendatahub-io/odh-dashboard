package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/kubeflow/hub/ui/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

var (
	mcpGatewayExtensionGVRForRegistration = schema.GroupVersionResource{
		Group: "mcp.kuadrant.io", Version: "v1alpha1", Resource: "mcpgatewayextensions",
	}
	mcpGatewayGVRForRegistration = schema.GroupVersionResource{
		Group: "gateway.networking.k8s.io", Version: "v1", Resource: "gateways",
	}
	mcpHTTPRouteGVR = schema.GroupVersionResource{
		Group: "gateway.networking.k8s.io", Version: "v1", Resource: "httproutes",
	}
	mcpServerRegistrationGVR = schema.GroupVersionResource{
		Group: "mcp.kuadrant.io", Version: "v1alpha1", Resource: "mcpserverregistrations",
	}
)

const (
	mcpGatewayRegistrationAPIVersion = "mcp.kuadrant.io/v1alpha1"
	mcpGatewayRegistrationKind       = "MCPServerRegistration"
	mcpGatewayRegistrationRouteKind  = "HTTPRoute"
)

type mcpGatewayTarget struct {
	name      string
	namespace string
	listener  string
	hostname  string
}

// ensureMcpGatewayRegistration creates the small, declarative gateway surface
// that the MCP Gateway controller consumes. It deliberately discovers the live
// Gateway and listener from MCPGatewayExtension instead of encoding deployment
// names from one reference environment.
func ensureMcpGatewayRegistration(
	ctx context.Context,
	dyn dynamic.Interface,
	namespace string,
	server models.MCPServer,
	registration *models.McpGatewayRegistration,
) ([]createdMcpPrerequisite, error) {
	if registration == nil {
		return nil, nil
	}

	target, err := discoverMcpGatewayTarget(ctx, dyn)
	if err != nil {
		return nil, err
	}

	serverName := server.Metadata.Name
	routeName := mcpGatewayRouteName(serverName)
	hostname := mcpGatewayHostname(serverName, target.hostname)
	labels := mcpPrerequisiteLabels(serverName)
	created := make([]createdMcpPrerequisite, 0, 2)

	routes := dyn.Resource(mcpHTTPRouteGVR).Namespace(target.namespace)
	route, err := routes.Get(ctx, routeName, metav1.GetOptions{})
	if err != nil && !apierrors.IsNotFound(err) {
		return created, fmt.Errorf("failed to inspect MCP gateway HTTPRoute %q: %w", routeName, err)
	}
	if apierrors.IsNotFound(err) {
		route = buildMcpGatewayHTTPRoute(routeName, target, hostname, namespace, serverName, server.Spec.Config.Port, labels)
		if _, err := routes.Create(ctx, route, metav1.CreateOptions{}); err != nil {
			return created, fmt.Errorf("failed to create MCP gateway HTTPRoute %q: %w", routeName, err)
		}
		created = append(created, createdMcpPrerequisite{mcpHTTPRouteGVR, target.namespace, routeName})
	} else if !mcpGatewayHTTPRouteMatches(route, target, hostname, namespace, serverName, server.Spec.Config.Port) {
		return created, fmt.Errorf("MCP gateway HTTPRoute %q already exists with a different target", routeName)
	}

	registrations := dyn.Resource(mcpServerRegistrationGVR).Namespace(target.namespace)
	registrationObj, err := registrations.Get(ctx, serverName, metav1.GetOptions{})
	if err != nil && !apierrors.IsNotFound(err) {
		cleanupMcpPrerequisites(ctx, dyn, created)
		return created, fmt.Errorf("failed to inspect MCPServerRegistration %q: %w", serverName, err)
	}
	if apierrors.IsNotFound(err) {
		registrationObj = buildMcpServerRegistration(
			serverName,
			routeName,
			registration,
			labels,
		)
		if _, err := registrations.Create(ctx, registrationObj, metav1.CreateOptions{}); err != nil {
			cleanupMcpPrerequisites(ctx, dyn, created)
			return created, fmt.Errorf("failed to create MCPServerRegistration %q: %w", serverName, err)
		}
		created = append(created, createdMcpPrerequisite{mcpServerRegistrationGVR, target.namespace, serverName})
	} else if !mcpServerRegistrationMatches(registrationObj, routeName) {
		cleanupMcpPrerequisites(ctx, dyn, created)
		return created, fmt.Errorf("MCPServerRegistration %q already exists with a different target", serverName)
	}

	return created, nil
}

func discoverMcpGatewayTarget(ctx context.Context, dyn dynamic.Interface) (mcpGatewayTarget, error) {
	entries, err := currentMCPGatewayEntries(ctx, dyn)
	if err != nil {
		return mcpGatewayTarget{}, err
	}

	for _, raw := range entries {
		entry, ok := raw.(map[string]interface{})
		if !ok {
			continue
		}
		gateway, found, err := unstructured.NestedMap(entry, "gateway")
		if err != nil || !found {
			continue
		}
		gatewayName, _, _ := unstructured.NestedString(gateway, "name")
		gatewayNamespace, _, _ := unstructured.NestedString(gateway, "namespace")
		if gatewayName == "" || gatewayNamespace == "" {
			continue
		}
		listeners, _, _ := unstructured.NestedSlice(gateway, "listeners")
		var fallback mcpGatewayTarget
		for _, rawListener := range listeners {
			listener, ok := rawListener.(map[string]interface{})
			if !ok {
				continue
			}
			name, _, _ := unstructured.NestedString(listener, "name")
			if name == "" {
				continue
			}
			candidate := mcpGatewayTarget{
				name:      gatewayName,
				namespace: gatewayNamespace,
				listener:  name,
			}
			candidate.hostname, _, _ = unstructured.NestedString(listener, "hostname")
			if fallback.listener == "" {
				fallback = candidate
			}
			if name == "mcps" {
				return candidate, nil
			}
		}
		if fallback.listener != "" {
			return fallback, nil
		}
	}

	return mcpGatewayTarget{}, fmt.Errorf("no ready MCP Gateway listener is available")
}

func buildMcpGatewayHTTPRoute(
	name string,
	target mcpGatewayTarget,
	hostname string,
	backendNamespace string,
	backendName string,
	port int32,
	labels map[string]string,
) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "gateway.networking.k8s.io/v1",
		"kind":       mcpGatewayRegistrationRouteKind,
		"metadata": map[string]interface{}{
			"name":      name,
			"namespace": target.namespace,
			"labels":    stringMapToInterface(labels),
		},
		"spec": map[string]interface{}{
			"hostnames": []interface{}{hostname},
			"parentRefs": []interface{}{map[string]interface{}{
				"group":       "gateway.networking.k8s.io",
				"kind":        "Gateway",
				"name":        target.name,
				"namespace":   target.namespace,
				"sectionName": target.listener,
			}},
			"rules": []interface{}{map[string]interface{}{
				"matches": []interface{}{map[string]interface{}{
					"path": map[string]interface{}{"type": "PathPrefix", "value": "/"},
				}},
				"backendRefs": []interface{}{map[string]interface{}{
					"group":     "",
					"kind":      "Service",
					"name":      backendName,
					"namespace": backendNamespace,
					"port":      int64(port),
					"weight":    int64(1),
				}},
			}},
		},
	}}
}

func buildMcpServerRegistration(name, routeName string, metadata *models.McpGatewayRegistration, labels map[string]string) *unstructured.Unstructured {
	category := metadata.Category
	if len(category) == 0 {
		category = []string{"mcp"}
	}
	path := metadata.Path
	if path == "" {
		path = "/mcp"
	}
	hint := metadata.Hint

	categoryValues := make([]interface{}, len(category))
	for i, value := range category {
		categoryValues[i] = value
	}
	tagValues := make([]interface{}, len(metadata.Tags))
	for i, value := range metadata.Tags {
		tagValues[i] = value
	}

	return &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": mcpGatewayRegistrationAPIVersion,
		"kind":       mcpGatewayRegistrationKind,
		"metadata": map[string]interface{}{
			"name":   name,
			"labels": stringMapToInterface(labels),
		},
		"spec": map[string]interface{}{
			"category": categoryValues,
			"hint":     hint,
			"path":     path,
			"state":    "Enabled",
			"tags":     tagValues,
			"targetRef": map[string]interface{}{
				"group": "gateway.networking.k8s.io",
				"kind":  "HTTPRoute",
				"name":  routeName,
			},
			"userSpecificList": "Disabled",
		},
	}}
}

func mcpGatewayHTTPRouteMatches(
	route *unstructured.Unstructured,
	target mcpGatewayTarget,
	hostname string,
	backendNamespace string,
	backendName string,
	port int32,
) bool {
	hostnames, _, _ := unstructured.NestedStringSlice(route.Object, "spec", "hostnames")
	if len(hostnames) != 1 || hostnames[0] != hostname {
		return false
	}
	parents, _, _ := unstructured.NestedSlice(route.Object, "spec", "parentRefs")
	if len(parents) != 1 {
		return false
	}
	parent, ok := parents[0].(map[string]interface{})
	if !ok {
		return false
	}
	parentName, _, _ := unstructured.NestedString(parent, "name")
	parentNamespace, _, _ := unstructured.NestedString(parent, "namespace")
	sectionName, _, _ := unstructured.NestedString(parent, "sectionName")
	if parentName != target.name || parentNamespace != target.namespace || sectionName != target.listener {
		return false
	}
	rules, _, _ := unstructured.NestedSlice(route.Object, "spec", "rules")
	if len(rules) != 1 {
		return false
	}
	rule, ok := rules[0].(map[string]interface{})
	if !ok {
		return false
	}
	backends, _, _ := unstructured.NestedSlice(rule, "backendRefs")
	if len(backends) != 1 {
		return false
	}
	backend, ok := backends[0].(map[string]interface{})
	if !ok {
		return false
	}
	name, _, _ := unstructured.NestedString(backend, "name")
	ns, _, _ := unstructured.NestedString(backend, "namespace")
	backendPort, _, _ := unstructured.NestedInt64(backend, "port")
	return name == backendName && ns == backendNamespace && backendPort == int64(port)
}

func mcpServerRegistrationMatches(registration *unstructured.Unstructured, routeName string) bool {
	group, _, _ := unstructured.NestedString(registration.Object, "spec", "targetRef", "group")
	kind, _, _ := unstructured.NestedString(registration.Object, "spec", "targetRef", "kind")
	name, _, _ := unstructured.NestedString(registration.Object, "spec", "targetRef", "name")
	return group == "gateway.networking.k8s.io" && kind == "HTTPRoute" && name == routeName
}

func mcpGatewayRouteName(serverName string) string {
	name := serverName + "-route"
	if len(name) > 253 {
		name = strings.TrimRight(name[:253], "-")
	}
	return name
}

func mcpGatewayHostname(serverName, listenerHostname string) string {
	if strings.HasPrefix(listenerHostname, "*.") {
		return serverName + listenerHostname[1:]
	}
	if listenerHostname != "" {
		return serverName + "." + listenerHostname
	}
	return serverName + ".mcp.local"
}

func cleanupOwnedMcpGatewayRegistration(ctx context.Context, dyn dynamic.Interface, serverName string) {
	selector := fmt.Sprintf("%s=%s,%s=%s", mcpPrerequisiteManagedByLabel, mcpPrerequisiteManager, mcpPrerequisiteServerLabel, serverName)
	for _, resource := range []schema.GroupVersionResource{mcpServerRegistrationGVR, mcpHTTPRouteGVR} {
		list, err := dyn.Resource(resource).Namespace(metav1.NamespaceAll).List(ctx, metav1.ListOptions{LabelSelector: selector})
		if err != nil {
			continue
		}
		for _, item := range list.Items {
			_ = dyn.Resource(resource).Namespace(item.GetNamespace()).Delete(ctx, item.GetName(), metav1.DeleteOptions{})
		}
	}
}
