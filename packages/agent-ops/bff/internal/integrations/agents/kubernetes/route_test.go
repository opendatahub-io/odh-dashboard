package kubernetes

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	fakedynamic "k8s.io/client-go/dynamic/fake"
)

func TestRouteAgentCardURLWithoutTLSUsesHTTP(t *testing.T) {
	route := &unstructured.Unstructured{Object: map[string]any{
		"spec": map[string]any{
			"host": "sample-support-agent.apps.example.com",
		},
	}}
	assert.Equal(t,
		"http://sample-support-agent.apps.example.com/.well-known/agent-card.json",
		routeAgentCardURL(route),
	)
}

func TestRouteAgentCardURLWithTLSUsesHTTPS(t *testing.T) {
	route := &unstructured.Unstructured{Object: map[string]any{
		"spec": map[string]any{
			"host": "sample-support-agent.apps.example.com",
			"tls":  map[string]any{"termination": "edge"},
		},
	}}
	assert.Equal(t,
		"https://sample-support-agent.apps.example.com/.well-known/agent-card.json",
		routeAgentCardURL(route),
	)
}

func TestRouteTargetsServiceRequiresSpecTo(t *testing.T) {
	route := &unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{"name": "sample-support-agent"},
		"spec": map[string]any{
			"to": map[string]any{
				"kind": "Service",
				"name": "other-service",
			},
		},
	}}
	assert.False(t, routeTargetsService(route, "sample-support-agent"))
}

func TestRouteTargetsServiceMatchesSpecTo(t *testing.T) {
	route := &unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{"name": "other-route"},
		"spec": map[string]any{
			"to": map[string]any{
				"kind": "Service",
				"name": "sample-support-agent",
			},
		},
	}}
	assert.True(t, routeTargetsService(route, "sample-support-agent"))
	assert.False(t, routeTargetsService(route, "other-agent"))
}

func TestRouteAgentCardURLUsesCustomPath(t *testing.T) {
	route := &unstructured.Unstructured{Object: map[string]any{
		"spec": map[string]any{
			"host": "agent.apps.example.com",
			"path": "/agents/support",
			"tls":  map[string]any{"termination": "edge"},
		},
	}}
	assert.Equal(t,
		"https://agent.apps.example.com/agents/support/.well-known/agent-card.json",
		routeAgentCardURL(route),
	)
}

func TestRouteAgentCardURLMatchesA2APath(t *testing.T) {
	route := &unstructured.Unstructured{Object: map[string]any{
		"spec": map[string]any{
			"host": "agent.apps.example.com",
			"path": "/.well-known/agent-card.json",
			"tls":  map[string]any{"termination": "edge"},
		},
	}}
	assert.Equal(t,
		"https://agent.apps.example.com/.well-known/agent-card.json",
		routeAgentCardURL(route),
	)
}

func TestRouteAgentCardURLRejectsWildcardHost(t *testing.T) {
	route := &unstructured.Unstructured{Object: map[string]any{
		"spec": map[string]any{
			"host":           "*.apps.example.com",
			"wildcardPolicy": "Subdomain",
			"tls":            map[string]any{"termination": "edge"},
		},
	}}
	assert.Equal(t, "", routeAgentCardURL(route))
}

func TestFindExternalAgentCardURLPrefersRouteNamedAfterService(t *testing.T) {
	serviceName := "sample-support-agent"
	gvrToListKind := map[schema.GroupVersionResource]string{
		openshiftRouteGVR: "RouteList",
	}
	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), gvrToListKind,
		&unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "route.openshift.io/v1",
			"kind":       "Route",
			"metadata": map[string]any{
				"name":      "other-route",
				"namespace": "demo-ns",
			},
			"spec": map[string]any{
				"host": "alpha.apps.example.com",
				"to": map[string]any{
					"kind": "Service",
					"name": serviceName,
				},
			},
		}},
		&unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "route.openshift.io/v1",
			"kind":       "Route",
			"metadata": map[string]any{
				"name":      serviceName,
				"namespace": "demo-ns",
			},
			"spec": map[string]any{
				"host": "preferred.apps.example.com",
				"to": map[string]any{
					"kind": "Service",
					"name": serviceName,
				},
			},
		}},
	)

	got := findExternalAgentCardURL(context.Background(), dynamicClient, nil, "demo-ns", serviceName)
	assert.Equal(t, "http://preferred.apps.example.com/.well-known/agent-card.json", got)
}

func TestRouteAgentCardURLRejectsPathTraversal(t *testing.T) {
	route := &unstructured.Unstructured{Object: map[string]any{
		"spec": map[string]any{
			"host": "agent.apps.example.com",
			"path": "/agents/../secrets",
			"tls":  map[string]any{"termination": "edge"},
		},
	}}
	assert.Equal(t, "", routeAgentCardURL(route))
}

func TestRouteSelectionPriority(t *testing.T) {
	serviceName := "sample-support-agent"

	exact := &unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{"name": serviceName},
		"spec":     map[string]any{"host": "other.apps.example.com"},
	}}
	hostMatch := &unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{"name": "other-route"},
		"spec":     map[string]any{"host": "sample-support-agent.apps.example.com"},
	}}
	fallback := &unstructured.Unstructured{Object: map[string]any{
		"metadata": map[string]any{"name": "zzz-route"},
		"spec":     map[string]any{"host": "unrelated.apps.example.com"},
	}}

	assert.Equal(t, 0, routeSelectionPriority(exact, serviceName))
	assert.Equal(t, 1, routeSelectionPriority(hostMatch, serviceName))
	assert.Equal(t, 2, routeSelectionPriority(fallback, serviceName))
}
