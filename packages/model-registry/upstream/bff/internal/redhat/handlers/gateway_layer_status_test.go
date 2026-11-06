package handlers

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/kubeflow/hub/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
)

func TestBuildGatewayLayerStatusWithoutCapability(t *testing.T) {
	status := buildGatewayLayerStatus(
		"mcp-gateway-preview",
		models.McpDeploymentList{},
		redhatrepos.NewMockMCPLifecycleOperator(),
		nil,
		models.McpServerDeployReadiness{Deployable: true},
		models.GatewayLayerUsability{},
	)

	assert.Equal(t, models.GatewayLayerStatusNotInstalled, status.OverallStatus)
	assert.False(t, status.Installed)
	assert.False(t, status.Usable)
	assert.False(t, status.UsabilityChecked)
	assert.Equal(t, "mcp-gateway-preview", status.Namespace)
}

func TestBuildGatewayLayerStatusHealthyMcpSliceRemainsPartialUntilUsabilityProbe(t *testing.T) {
	operator := redhatrepos.NewMockMCPLifecycleOperator()
	status := buildGatewayLayerStatus(
		"mcp-gateway-preview",
		models.McpDeploymentList{
			Size: 1,
			Items: []models.McpDeployment{{
				Name: "openshift-mcp-server",
				Conditions: []models.McpDeploymentCondition{
					{Type: "Ready", Status: "True"},
					{Type: "GatewayRegistration", Status: "True"},
				},
			}},
		},
		operator,
		nil,
		models.McpServerDeployReadiness{Deployable: true},
		models.GatewayLayerUsability{},
	)

	assert.Equal(t, models.GatewayLayerStatusPartial, status.OverallStatus)
	assert.True(t, status.Installed)
	assert.True(t, status.Healthy)
	assert.False(t, status.Usable)
	assert.False(t, status.UsabilityChecked)
	assert.Contains(t, status.Message, "authenticated usability probes")
	assert.Equal(t, models.GatewayLayerStatusNotImplemented, componentByID(status, "maas-gateway").Status)
}

func TestBuildGatewayLayerStatusBlocksWhenPlatformOrRegistrationIsNotReady(t *testing.T) {
	operator := redhatrepos.NewMockMCPLifecycleOperator()
	require.NoError(t, unstructured.SetNestedSlice(operator.Object,
		[]interface{}{map[string]interface{}{"type": "Ready", "status": "False"}},
		"status", "conditions"))
	status := buildGatewayLayerStatus(
		"mcp-gateway-preview",
		models.McpDeploymentList{
			Size: 1,
			Items: []models.McpDeployment{{
				Name:       "openshift-mcp-server",
				Conditions: []models.McpDeploymentCondition{{Type: "Ready", Status: "True"}},
			}},
		},
		operator,
		nil,
		models.McpServerDeployReadiness{Deployable: false, Message: "No ready MCP Gateway is available."},
		models.GatewayLayerUsability{},
	)

	assert.Equal(t, models.GatewayLayerStatusBlocked, status.OverallStatus)
	assert.False(t, status.Healthy)
	assert.Equal(t, models.GatewayLayerStatusInstalled, componentByID(status, "mcp-registration").Status)
}

func TestBuildGatewayLayerStatusReportsUnavailableOperatorAsBlockedEvidence(t *testing.T) {
	status := buildGatewayLayerStatus(
		"mcp-gateway-preview",
		models.McpDeploymentList{},
		nil,
		errors.New("forbidden"),
		models.McpServerDeployReadiness{Message: "MCP gateway availability could not be determined."},
		models.GatewayLayerUsability{},
	)

	assert.Equal(t, models.GatewayLayerStatusNotInstalled, status.OverallStatus)
	assert.Contains(t, componentByID(status, "mcp-lifecycle").Message, "could not be determined")
}

func TestBuildGatewayLayerStatusReportsSuccessfulMcpUsabilityWithoutHidingRemainingAdapters(t *testing.T) {
	operator := redhatrepos.NewMockMCPLifecycleOperator()
	status := buildGatewayLayerStatus(
		"mcp-gateway-preview",
		models.McpDeploymentList{
			Size: 1,
			Items: []models.McpDeployment{{
				Name: "openshift-mcp-server",
				Conditions: []models.McpDeploymentCondition{
					{Type: "Ready", Status: "True"},
					{Type: "GatewayRegistration", Status: "True"},
				},
			}},
		},
		operator,
		nil,
		models.McpServerDeployReadiness{Deployable: true},
		models.GatewayLayerUsability{Checked: true, Usable: true, Message: "passed"},
	)

	assert.Equal(t, models.GatewayLayerStatusPartial, status.OverallStatus)
	assert.True(t, status.Usable)
	assert.True(t, status.UsabilityChecked)
	assert.Equal(t, models.GatewayLayerStatusUsable, componentByID(status, "mcp-usability").Status)
	assert.Contains(t, status.Message, "remaining Gateway adapters")
}

func componentByID(status models.GatewayLayerStatus, id string) models.GatewayLayerComponent {
	for _, component := range status.Components {
		if component.ID == id {
			return component
		}
	}
	return models.GatewayLayerComponent{}
}
