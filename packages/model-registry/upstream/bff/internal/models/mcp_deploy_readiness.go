package models

// McpDeployReadinessReason explains why a catalog MCP server cannot be deployed.
// The frontend owns the user-facing text for each reason.
type McpDeployReadinessReason string

const (
	// McpDeployReadinessOperatorNotReady means the MCPLifecycleOperator CR is missing
	// or its Ready condition is not True.
	McpDeployReadinessOperatorNotReady McpDeployReadinessReason = "OPERATOR_NOT_READY"
	// McpDeployReadinessGatewayStatusUnavailable means gateway availability could not be
	// determined (for example the MCPLifecycleOperator CR could not be read).
	McpDeployReadinessGatewayStatusUnavailable McpDeployReadinessReason = "GATEWAY_STATUS_UNAVAILABLE"
	// McpDeployReadinessNoGatewayAvailable means no ready MCP gateway with a usable
	// listener is available on the cluster.
	McpDeployReadinessNoGatewayAvailable McpDeployReadinessReason = "NO_GATEWAY_AVAILABLE"
)

// McpServerDeployReadiness reports whether a catalog MCP server can be deployed.
type McpServerDeployReadiness struct {
	// GatewayRequired is true when the server can only be deployed with an MCP gateway.
	GatewayRequired bool `json:"gatewayRequired"`
	// Deployable is false when a deployment prerequisite is missing.
	Deployable bool `json:"deployable"`
	// Reason and Message are set only when Deployable is false.
	Reason  McpDeployReadinessReason `json:"reason,omitempty"`
	Message string                   `json:"message,omitempty"`
}
