package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

type GatewayLayerStatusEnvelope api.Envelope[models.GatewayLayerStatus, api.None]

const gatewayLayerStatusGetHandlerID = api.HandlerID("gatewayLayer:status:get")

const gatewayLayerName = "gateway"

func init() {
	api.RegisterHandlerOverride(gatewayLayerStatusGetHandlerID, overrideGatewayLayerStatus)
}

// overrideGatewayLayerStatus is intentionally read-only. It composes the
// shared platform readiness signal with the resources owned by the Project
// Matrix Gateway layer, without installing, upgrading, or deleting operators.
func overrideGatewayLayerStatus(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !shouldUseRedHatOverrides(app) {
		return buildDefault()
	}

	repo := newMcpDeploymentRepository(app)
	reader := newMcpLifecycleOperatorReader(app)

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		namespace, ok := namespaceFromContext(app, w, r)
		if !ok {
			return
		}
		if !requireMcpDeploymentAccess(app, w, r, namespace, "list") {
			return
		}

		client, ok := getKubernetesClient(app, w, r)
		if !ok {
			return
		}
		statusClient, ok := getMcpMutationClient(app, w, r)
		if !ok {
			return
		}

		deployments, err := repo.List(r.Context(), client, namespace)
		if err != nil {
			handleMcpDeploymentError(app, w, r, err)
			return
		}

		operator, operatorErr := reader.Get(r.Context())
		readiness, readinessErr := redhatrepos.EvaluateMcpGatewayReadiness(operator, operatorErr)
		if readinessErr != nil {
			app.Logger().Warn("Gateway layer status could not fully evaluate MCP gateway readiness", "error", readinessErr)
		}

		usability, usabilityErr := redhatrepos.GetGatewayLayerUsability(r.Context(), statusClient, namespace)
		if usabilityErr != nil {
			app.Logger().Warn("Gateway layer usability result could not be read", "error", usabilityErr)
		}

		status := buildGatewayLayerStatus(namespace, deployments, operator, operatorErr, readiness, usability)
		if err := app.WriteJSON(w, http.StatusOK, GatewayLayerStatusEnvelope{Data: status}, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}

func buildGatewayLayerStatus(
	namespace string,
	deployments models.McpDeploymentList,
	operator *unstructured.Unstructured,
	operatorErr error,
	readiness models.McpServerDeployReadiness,
	usability models.GatewayLayerUsability,
) models.GatewayLayerStatus {
	lifecycleInstalled := operator != nil && operatorErr == nil
	lifecycleHealthy := lifecycleInstalled && conditionTrue(operator, "Ready")
	platformMessage := "Gateway platform prerequisites are available through the current platform configuration."
	if operatorErr != nil {
		platformMessage = fmt.Sprintf("Gateway platform readiness could not be determined: %s", readiness.Message)
	} else if !lifecycleHealthy {
		platformMessage = "The MCP Lifecycle operator is installed but is not Ready."
	}

	components := []models.GatewayLayerComponent{
		component(
			"mcp-lifecycle",
			"MCP Lifecycle operator",
			lifecycleInstalled,
			lifecycleHealthy,
			false,
			false,
			platformMessage,
			"Read-only status from the cluster MCPLifecycleOperator singleton.",
		),
		component(
			"mcp-gateway",
			"MCP Gateway",
			lifecycleInstalled,
			readiness.Deployable,
			false,
			false,
			gatewayReadinessMessage(readiness),
			"Readiness is derived from the MCP Lifecycle operator and discovered Gateway API listeners.",
		),
	}

	capabilityInstalled := deployments.Size > 0
	capabilityHealthy := capabilityInstalled && allDeploymentsConditionTrue(deployments.Items, "Ready")
	capabilityMessage := "No Project Matrix Gateway capability is installed in this namespace."
	if capabilityInstalled {
		capabilityMessage = fmt.Sprintf("%d MCP capability deployment(s) found in this namespace.", deployments.Size)
		if !capabilityHealthy {
			capabilityMessage = "At least one MCP capability deployment is not Ready."
		}
	}
	components = append(components,
		component(
			"mcp-capability",
			"MCP capability",
			capabilityInstalled,
			capabilityHealthy,
			false,
			false,
			capabilityMessage,
			"Project Matrix-owned MCPServer resources in the selected namespace.",
		),
		component(
			"mcp-registration",
			"MCP Gateway registration",
			capabilityInstalled,
			capabilityInstalled && allDeploymentsConditionTrue(deployments.Items, "GatewayRegistration"),
			false,
			false,
			registrationMessage(deployments.Items),
			"Project Matrix-owned MCPServerRegistration status reported by the cluster.",
		),
		component(
			"mcp-usability",
			"Authenticated MCP usability",
			usability.Checked,
			usability.Checked && usability.Usable,
			usability.Usable,
			usability.Checked,
			usabilityMessage(usability),
			"Authenticated initialize, tools/list, and tools/call probes through the exposed MCP Gateway.",
		),
	)

	// These are explicit layer contracts, not silent omissions. The current
	// milestone reports them as not implemented so the UI cannot imply that an
	// MCP-only install is the complete Gateway layer.
	for _, future := range []struct {
		id, name, message string
	}{
		{"maas-gateway", "MaaS Gateway", "MaaS Gateway adapter is not implemented in this milestone."},
		{"inference-gateway", "Inference Gateway", "Inference Gateway adapter is not implemented in this milestone."},
		{"identity-exposure", "Identity and exposure", "Identity, TLS, and exposure validation is not implemented in this milestone."},
		{"routing-quotas", "Routing, quotas, and conformance", "Routing, quota, and conformance probes are not implemented in this milestone."},
	} {
		components = append(components, models.GatewayLayerComponent{
			ID:       future.id,
			Name:     future.name,
			Status:   models.GatewayLayerStatusNotImplemented,
			Message:  future.message,
			Evidence: "Tracked as a Project Matrix Gateway-layer implementation gate.",
		})
	}

	status := models.GatewayLayerStatus{
		Layer:            gatewayLayerName,
		Namespace:        namespace,
		Installed:        capabilityInstalled,
		Healthy:          lifecycleHealthy && readiness.Deployable && capabilityHealthy && allDeploymentsConditionTrue(deployments.Items, "GatewayRegistration"),
		Usable:           usability.Checked && usability.Usable,
		UsabilityChecked: usability.Checked,
		Components:       components,
	}
	status.OverallStatus, status.Message = overallGatewayLayerStatus(status)
	return status
}

func component(id, name string, installed, healthy, usable, checked bool, message, evidence string) models.GatewayLayerComponent {
	status := models.GatewayLayerStatusNotInstalled
	switch {
	case usable:
		status = models.GatewayLayerStatusUsable
	case healthy:
		status = models.GatewayLayerStatusHealthy
	case installed:
		status = models.GatewayLayerStatusInstalled
	}
	return models.GatewayLayerComponent{
		ID:               id,
		Name:             name,
		Status:           status,
		Installed:        installed,
		Healthy:          healthy,
		Usable:           usable,
		UsabilityChecked: checked,
		Message:          message,
		Evidence:         evidence,
	}
}

func overallGatewayLayerStatus(status models.GatewayLayerStatus) (models.GatewayLayerComponentStatus, string) {
	if !status.Installed {
		return models.GatewayLayerStatusNotInstalled, "Gateway platform prerequisites are reported, but no Gateway-layer capability is installed in this namespace."
	}
	if !status.Healthy {
		return models.GatewayLayerStatusBlocked, "The Gateway layer has installed resources, but one or more required components are not healthy."
	}
	if !status.UsabilityChecked {
		return models.GatewayLayerStatusPartial, "The MCP capability is healthy and registered, but authenticated usability probes and the remaining Gateway adapters are outstanding."
	}
	if status.Usable {
		return models.GatewayLayerStatusPartial, "The MCP-first Gateway milestone passed its authenticated usability probes; the remaining Gateway adapters are outstanding."
	}
	return models.GatewayLayerStatusPartial, "The Gateway layer is healthy but has not passed all usability checks."
}

func usabilityMessage(usability models.GatewayLayerUsability) string {
	if usability.Message != "" {
		return usability.Message
	}
	return "Authenticated initialize, tools/list, and tools/call probes have not been run."
}

func gatewayReadinessMessage(readiness models.McpServerDeployReadiness) string {
	if readiness.Deployable {
		return "A ready MCP Gateway with a usable listener is available."
	}
	if strings.TrimSpace(readiness.Message) != "" {
		return readiness.Message
	}
	return "No ready MCP Gateway with a usable listener is available."
}

func registrationMessage(deployments []models.McpDeployment) string {
	if len(deployments) == 0 {
		return "Registration will be evaluated after a Gateway-layer capability is installed."
	}
	if allDeploymentsConditionTrue(deployments, "GatewayRegistration") {
		return "All MCP capability deployments report Ready registration with the MCP Gateway."
	}
	return "One or more MCP capability deployments have not reported Ready registration."
}

func allDeploymentsConditionTrue(deployments []models.McpDeployment, conditionType string) bool {
	if len(deployments) == 0 {
		return false
	}
	for _, deployment := range deployments {
		if !deploymentConditionTrue(deployment.Conditions, conditionType) {
			return false
		}
	}
	return true
}

func deploymentConditionTrue(conditions []models.McpDeploymentCondition, conditionType string) bool {
	for _, condition := range conditions {
		if condition.Type == conditionType {
			return condition.Status == "True"
		}
	}
	return false
}

func conditionTrue(obj *unstructured.Unstructured, conditionType string) bool {
	if obj == nil {
		return false
	}
	conditions, found, err := unstructured.NestedSlice(obj.Object, "status", "conditions")
	if err != nil || !found {
		return false
	}
	for _, raw := range conditions {
		condition, ok := raw.(map[string]interface{})
		if ok && condition["type"] == conditionType && condition["status"] == "True" {
			return true
		}
	}
	return false
}
