package repositories

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	helper "github.com/kubeflow/hub/ui/bff/internal/helpers"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
)

// The MCP Lifecycle module operator publishes the MCP gateways it discovers in the
// status of this cluster-scoped singleton.
var mcpLifecycleOperatorGVR = schema.GroupVersionResource{
	Group:    "components.platform.opendatahub.io",
	Version:  "v1alpha1",
	Resource: "mcplifecycleoperators",
}

var mcpGatewayExtensionGVR = schema.GroupVersionResource{
	Group: "mcp.kuadrant.io", Version: "v1alpha1", Resource: "mcpgatewayextensions",
}

var gatewayGVR = schema.GroupVersionResource{
	Group: "gateway.networking.k8s.io", Version: "v1", Resource: "gateways",
}

const (
	mcpLifecycleOperatorName       = "default"
	mcpLifecycleOperatorGetTimeout = 10 * time.Second

	mcpDeployReadinessOperatorNotReadyMessage         = "The MCP lifecycle operator is not ready."
	mcpDeployReadinessGatewayStatusUnavailableMessage = "MCP gateway availability could not be determined."
	mcpDeployReadinessNoGatewayAvailableMessage       = "No MCP gateway is available on this cluster."
	mcpSupportLevel                                   = models.McpSupportLevelTechnologyPreview
	mcpSupportMessage                                 = "MCP Catalog, MCP Lifecycle, and MCP Gateway are Technology Preview features in this platform release."
)

// MCPLifecycleOperatorReader reads the MCPLifecycleOperator singleton.
type MCPLifecycleOperatorReader interface {
	Get(ctx context.Context) (*unstructured.Unstructured, error)
}

// serviceAccountMCPLifecycleOperatorReader reads the CR with the BFF's own service
// account rather than the user's token: the CR is cluster-scoped and users cannot read
// it. The ClusterRole only grants get on resourceNames [default].
type serviceAccountMCPLifecycleOperatorReader struct {
	mu     sync.Mutex
	client dynamic.Interface
}

// NewServiceAccountMCPLifecycleOperatorReader returns a reader that builds its client
// on first use. In cluster the config comes from the mounted service account token
// (re-read from disk as it rotates); locally it falls back to kubeconfig.
func NewServiceAccountMCPLifecycleOperatorReader() MCPLifecycleOperatorReader {
	return &serviceAccountMCPLifecycleOperatorReader{}
}

// Overridable in tests.
var (
	inClusterConfig = rest.InClusterConfig
	localKubeconfig = helper.GetKubeconfig
)

// serviceAccountRESTConfig returns the pod's service account config when running in a
// cluster. It is checked first on purpose: the default kubeconfig loading rules would
// prefer a mounted kubeconfig, which could carry a different identity. The in-cluster
// config reads the token from a file, so rotated projected tokens are picked up. Outside
// a cluster (local development) it falls back to kubeconfig.
func serviceAccountRESTConfig() (*rest.Config, error) {
	cfg, err := inClusterConfig()
	if err == nil {
		return cfg, nil
	}
	if !errors.Is(err, rest.ErrNotInCluster) {
		return nil, fmt.Errorf("failed to load in-cluster service account config: %w", err)
	}
	cfg, err = localKubeconfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load kubeconfig: %w", err)
	}
	return cfg, nil
}

func (r *serviceAccountMCPLifecycleOperatorReader) dynamicClient() (dynamic.Interface, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.client != nil {
		return r.client, nil
	}
	cfg, err := serviceAccountRESTConfig()
	if err != nil {
		return nil, err
	}
	client, err := dynamic.NewForConfig(rest.CopyConfig(cfg))
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic Kubernetes client: %w", err)
	}
	r.client = client
	return client, nil
}

func (r *serviceAccountMCPLifecycleOperatorReader) Get(ctx context.Context) (*unstructured.Unstructured, error) {
	client, err := r.dynamicClient()
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, mcpLifecycleOperatorGetTimeout)
	defer cancel()
	operator, err := client.Resource(mcpLifecycleOperatorGVR).Get(ctx, mcpLifecycleOperatorName, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	// Recent MCP Lifecycle releases keep the operator Ready condition but no longer
	// copy discovered gateways into status.availableMCPGateways. Resolve the current
	// MCPGatewayExtension/Gateway pair directly so the readiness gate follows the
	// live Gateway API implementation instead of an obsolete status shape.
	if _, found, _ := unstructured.NestedSlice(operator.Object, "status", "availableMCPGateways"); !found {
		available, resolveErr := currentMCPGatewayEntries(ctx, client)
		if resolveErr != nil {
			return nil, resolveErr
		}
		if err := unstructured.SetNestedSlice(operator.Object, available, "status", "availableMCPGateways"); err != nil {
			return nil, fmt.Errorf("failed to attach current MCP gateway status: %w", err)
		}
	}

	return operator, nil
}

func currentMCPGatewayEntries(ctx context.Context, client dynamic.Interface) ([]interface{}, error) {
	extensions, err := client.Resource(mcpGatewayExtensionGVR).Namespace(metav1.NamespaceAll).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list MCP gateway extensions: %w", err)
	}

	entries := make([]interface{}, 0, len(extensions.Items))
	for _, extension := range extensions.Items {
		ready, conditionErr := isConditionTrue(&extension, "Ready")
		if conditionErr != nil || !ready {
			continue
		}

		target, found, err := unstructured.NestedMap(extension.Object, "spec", "targetRef")
		if err != nil || !found {
			continue
		}
		gatewayName, _, _ := unstructured.NestedString(target, "name")
		gatewayNamespace, _, _ := unstructured.NestedString(target, "namespace")
		if gatewayName == "" {
			continue
		}
		if gatewayNamespace == "" {
			gatewayNamespace = extension.GetNamespace()
		}

		gateway, err := client.Resource(gatewayGVR).Namespace(gatewayNamespace).Get(ctx, gatewayName, metav1.GetOptions{})
		if err != nil {
			if apierrors.IsNotFound(err) {
				continue
			}
			return nil, fmt.Errorf("failed to read MCP gateway %s/%s: %w", gatewayNamespace, gatewayName, err)
		}
		listeners, _, err := unstructured.NestedSlice(gateway.Object, "status", "listeners")
		if err != nil || len(listeners) == 0 {
			continue
		}

		entries = append(entries, map[string]interface{}{
			"name":      extension.GetName(),
			"namespace": extension.GetNamespace(),
			"ready":     true,
			"gateway": map[string]interface{}{
				"name":      gatewayName,
				"namespace": gatewayNamespace,
				"listeners": listeners,
			},
		})
	}

	return entries, nil
}

// StaticMCPLifecycleOperatorReader returns a fixed object. Used in mock mode.
type StaticMCPLifecycleOperatorReader struct {
	Object *unstructured.Unstructured
	Err    error
}

func (r StaticMCPLifecycleOperatorReader) Get(_ context.Context) (*unstructured.Unstructured, error) {
	if r.Err != nil {
		return nil, r.Err
	}
	return r.Object.DeepCopy(), nil
}

// NewMockMCPLifecycleOperator returns a ready MCPLifecycleOperator with one ready
// gateway, for mock mode.
func NewMockMCPLifecycleOperator() *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": mcpLifecycleOperatorGVR.GroupVersion().String(),
		"kind":       "MCPLifecycleOperator",
		"metadata":   map[string]interface{}{"name": mcpLifecycleOperatorName},
		"status": map[string]interface{}{
			"conditions": []interface{}{
				map[string]interface{}{"type": "Ready", "status": "True"},
			},
			"availableMCPGateways": []interface{}{
				map[string]interface{}{
					"name":      "mcp-gateway-extension",
					"namespace": "mcp-system",
					"ready":     true,
					"gateway": map[string]interface{}{
						"name":      "mcp-gateway",
						"namespace": "gateway-system",
						"listeners": []interface{}{
							map[string]interface{}{"name": "mcps", "hostname": "*.mcp.example.com"},
						},
					},
				},
			},
		},
	}}
}

// EvaluateMcpGatewayReadiness decides whether a server that requires an MCP gateway can
// be deployed, from the result of reading the MCPLifecycleOperator CR. It fails closed:
// anything that prevents a positive answer makes the server not deployable. The returned
// error is non-nil only for unexpected failures the caller should log.
func EvaluateMcpGatewayReadiness(obj *unstructured.Unstructured, getErr error) (models.McpServerDeployReadiness, error) {
	if getErr != nil {
		if apierrors.IsNotFound(getErr) {
			return notDeployable(models.McpDeployReadinessOperatorNotReady, mcpDeployReadinessOperatorNotReadyMessage), nil
		}
		return notDeployable(models.McpDeployReadinessGatewayStatusUnavailable, mcpDeployReadinessGatewayStatusUnavailableMessage),
			fmt.Errorf("failed to read MCPLifecycleOperator %q: %w", mcpLifecycleOperatorName, getErr)
	}
	if obj == nil {
		return notDeployable(models.McpDeployReadinessOperatorNotReady, mcpDeployReadinessOperatorNotReadyMessage), nil
	}

	// The operator publishes the gateway list before it deploys the MCPServer operator
	// and keeps it when that deployment fails, so the list alone does not show that a
	// deploy can work.
	ready, err := isConditionTrue(obj, "Ready")
	if err != nil {
		return notDeployable(models.McpDeployReadinessGatewayStatusUnavailable, mcpDeployReadinessGatewayStatusUnavailableMessage), err
	}
	if !ready {
		return notDeployable(models.McpDeployReadinessOperatorNotReady, mcpDeployReadinessOperatorNotReadyMessage), nil
	}

	// availableMCPGateways is omitted when no gateways are discovered.
	gateways, _, err := unstructured.NestedSlice(obj.Object, "status", "availableMCPGateways")
	if err != nil {
		return notDeployable(models.McpDeployReadinessGatewayStatusUnavailable, mcpDeployReadinessGatewayStatusUnavailableMessage),
			fmt.Errorf("unexpected status.availableMCPGateways: %w", err)
	}
	for _, g := range gateways {
		if isUsableGateway(g) {
			return supportStatus(models.McpServerDeployReadiness{GatewayRequired: true, Deployable: true}), nil
		}
	}
	return notDeployable(models.McpDeployReadinessNoGatewayAvailable, mcpDeployReadinessNoGatewayAvailableMessage), nil
}

func notDeployable(reason models.McpDeployReadinessReason, message string) models.McpServerDeployReadiness {
	return supportStatus(models.McpServerDeployReadiness{
		GatewayRequired: true,
		Deployable:      false,
		Reason:          reason,
		Message:         message,
	})
}

func supportStatus(readiness models.McpServerDeployReadiness) models.McpServerDeployReadiness {
	readiness.SupportLevel = mcpSupportLevel
	readiness.SupportMessage = mcpSupportMessage
	return readiness
}

// isUsableGateway reports whether a discovered gateway is ready and has at least one
// listener. The operator already lists only listeners a server can use, so hostnames are
// not filtered again here.
func isUsableGateway(entry interface{}) bool {
	gateway, ok := entry.(map[string]interface{})
	if !ok {
		return false
	}
	ready, found, err := unstructured.NestedBool(gateway, "ready")
	if err != nil || !found || !ready {
		return false
	}
	listeners, _, err := unstructured.NestedSlice(gateway, "gateway", "listeners")
	return err == nil && len(listeners) > 0
}

func isConditionTrue(obj *unstructured.Unstructured, conditionType string) (bool, error) {
	conditions, _, err := unstructured.NestedSlice(obj.Object, "status", "conditions")
	if err != nil {
		return false, fmt.Errorf("unexpected status.conditions: %w", err)
	}
	for _, c := range conditions {
		condition, ok := c.(map[string]interface{})
		if !ok {
			continue
		}
		if condition["type"] == conditionType {
			return condition["status"] == string(metav1.ConditionTrue), nil
		}
	}
	return false, nil
}
