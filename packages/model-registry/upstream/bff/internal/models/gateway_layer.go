package models

// GatewayLayerComponentStatus is deliberately more precise than a single
// ready/not-ready flag. A component can be installed without being healthy,
// and healthy infrastructure is not the same thing as a successful request.
type GatewayLayerComponentStatus string

const (
	GatewayLayerStatusNotInstalled   GatewayLayerComponentStatus = "not_installed"
	GatewayLayerStatusInstalled      GatewayLayerComponentStatus = "installed"
	GatewayLayerStatusHealthy        GatewayLayerComponentStatus = "healthy"
	GatewayLayerStatusUsable         GatewayLayerComponentStatus = "usable"
	GatewayLayerStatusBlocked        GatewayLayerComponentStatus = "blocked"
	GatewayLayerStatusNotImplemented GatewayLayerComponentStatus = "not_implemented"
	GatewayLayerStatusNotChecked     GatewayLayerComponentStatus = "not_checked"
	GatewayLayerStatusPartial        GatewayLayerComponentStatus = "partial"
)

type GatewayLayerComponent struct {
	ID               string                      `json:"id"`
	Name             string                      `json:"name"`
	Status           GatewayLayerComponentStatus `json:"status"`
	Installed        bool                        `json:"installed"`
	Healthy          bool                        `json:"healthy"`
	Usable           bool                        `json:"usable"`
	UsabilityChecked bool                        `json:"usabilityChecked"`
	Message          string                      `json:"message,omitempty"`
	Evidence         string                      `json:"evidence,omitempty"`
}

type GatewayLayerStatus struct {
	Layer            string                      `json:"layer"`
	Namespace        string                      `json:"namespace"`
	OverallStatus    GatewayLayerComponentStatus `json:"overallStatus"`
	Installed        bool                        `json:"installed"`
	Healthy          bool                        `json:"healthy"`
	Usable           bool                        `json:"usable"`
	UsabilityChecked bool                        `json:"usabilityChecked"`
	Message          string                      `json:"message,omitempty"`
	Components       []GatewayLayerComponent     `json:"components"`
}

// GatewayLayerUsability is the persisted result of the authenticated MCP
// request probes. It is kept separate from Kubernetes readiness because a
// Ready MCPServer does not prove that an end user can use the exposed Gateway.
type GatewayLayerUsability struct {
	Checked   bool   `json:"checked"`
	Usable    bool   `json:"usable"`
	Message   string `json:"message,omitempty"`
	CheckedAt string `json:"checkedAt,omitempty"`
}
