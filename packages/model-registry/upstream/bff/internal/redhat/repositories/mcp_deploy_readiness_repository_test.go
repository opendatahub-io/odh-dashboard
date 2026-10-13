package repositories

import (
	"context"
	"errors"
	"testing"

	"github.com/kubeflow/hub/ui/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func mcpLifecycleOperator(readyStatus string, gateways []interface{}) *unstructured.Unstructured {
	status := map[string]interface{}{}
	if readyStatus != "" {
		status["conditions"] = []interface{}{
			map[string]interface{}{"type": "ProvisioningSucceeded", "status": "True"},
			map[string]interface{}{"type": "Ready", "status": readyStatus},
		}
	}
	if gateways != nil {
		status["availableMCPGateways"] = gateways
	}
	return &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "components.platform.opendatahub.io/v1alpha1",
		"kind":       "MCPLifecycleOperator",
		"metadata":   map[string]interface{}{"name": "default"},
		"status":     status,
	}}
}

func discoveredGateway(name string, ready bool, listeners ...string) map[string]interface{} {
	gateway := map[string]interface{}{"name": "gw-" + name, "namespace": "gw-ns"}
	if len(listeners) > 0 {
		items := make([]interface{}, 0, len(listeners))
		for _, l := range listeners {
			items = append(items, map[string]interface{}{"name": l, "hostname": "*." + l + ".example.com"})
		}
		gateway["listeners"] = items
	}
	return map[string]interface{}{"name": name, "namespace": name + "-ns", "ready": ready, "gateway": gateway}
}

func TestEvaluateMcpGatewayReadiness(t *testing.T) {
	notFound := apierrors.NewNotFound(schema.GroupResource{Group: "components.platform.opendatahub.io", Resource: "mcplifecycleoperators"}, "default")
	forbidden := apierrors.NewForbidden(schema.GroupResource{Group: "components.platform.opendatahub.io", Resource: "mcplifecycleoperators"}, "default", errors.New("no access"))

	tests := []struct {
		name       string
		obj        *unstructured.Unstructured
		getErr     error
		deployable bool
		reason     models.McpDeployReadinessReason
		wantLogErr bool
	}{
		{name: "CR not found", getErr: notFound, reason: models.McpDeployReadinessOperatorNotReady},
		{name: "read forbidden", getErr: forbidden, reason: models.McpDeployReadinessGatewayStatusUnavailable, wantLogErr: true},
		{name: "other read error", getErr: errors.New("connection refused"), reason: models.McpDeployReadinessGatewayStatusUnavailable, wantLogErr: true},
		{name: "nil object", reason: models.McpDeployReadinessOperatorNotReady},
		{name: "no Ready condition", obj: mcpLifecycleOperator("", []interface{}{discoveredGateway("a", true, "mcps")}), reason: models.McpDeployReadinessOperatorNotReady},
		{name: "Ready False with gateways listed", obj: mcpLifecycleOperator("False", []interface{}{discoveredGateway("a", true, "mcps")}), reason: models.McpDeployReadinessOperatorNotReady},
		{name: "Ready but no availableMCPGateways field", obj: mcpLifecycleOperator("True", nil), reason: models.McpDeployReadinessNoGatewayAvailable},
		{name: "Ready but empty gateway list", obj: mcpLifecycleOperator("True", []interface{}{}), reason: models.McpDeployReadinessNoGatewayAvailable},
		{name: "all gateways not ready", obj: mcpLifecycleOperator("True", []interface{}{discoveredGateway("a", false, "mcps"), discoveredGateway("b", false, "mcp")}), reason: models.McpDeployReadinessNoGatewayAvailable},
		{name: "ready gateway without listeners", obj: mcpLifecycleOperator("True", []interface{}{discoveredGateway("a", true)}), reason: models.McpDeployReadinessNoGatewayAvailable},
		{name: "one usable gateway", obj: mcpLifecycleOperator("True", []interface{}{discoveredGateway("a", true, "mcps")}), deployable: true},
		{name: "mixed list with one usable gateway", obj: mcpLifecycleOperator("True", []interface{}{discoveredGateway("a", false, "mcps"), discoveredGateway("b", true), discoveredGateway("c", true, "mcp-direct", "mcp-wild")}), deployable: true},
		{name: "malformed gateway entry is skipped", obj: mcpLifecycleOperator("True", []interface{}{"not-an-object", discoveredGateway("a", true, "mcps")}), deployable: true},
		{name: "malformed availableMCPGateways", obj: &unstructured.Unstructured{Object: map[string]interface{}{"status": map[string]interface{}{
			"conditions":           []interface{}{map[string]interface{}{"type": "Ready", "status": "True"}},
			"availableMCPGateways": "unexpected",
		}}}, reason: models.McpDeployReadinessGatewayStatusUnavailable, wantLogErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := EvaluateMcpGatewayReadiness(tt.obj, tt.getErr)
			if tt.wantLogErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
			assert.True(t, got.GatewayRequired)
			assert.Equal(t, tt.deployable, got.Deployable)
			assert.Equal(t, tt.reason, got.Reason)
			if tt.deployable {
				assert.Empty(t, got.Message)
			} else {
				assert.NotEmpty(t, got.Message)
			}
		})
	}
}

func TestStaticMCPLifecycleOperatorReader(t *testing.T) {
	obj := NewMockMCPLifecycleOperator()
	got, err := StaticMCPLifecycleOperatorReader{Object: obj}.Get(context.Background())
	require.NoError(t, err)
	got.SetName("changed")
	assert.Equal(t, "default", obj.GetName(), "reader must return a copy")

	readiness, err := EvaluateMcpGatewayReadiness(NewMockMCPLifecycleOperator(), nil)
	require.NoError(t, err)
	assert.True(t, readiness.Deployable, "mock-mode operator should allow deploys")

	_, err = StaticMCPLifecycleOperatorReader{Err: errors.New("boom")}.Get(context.Background())
	require.Error(t, err)
}
