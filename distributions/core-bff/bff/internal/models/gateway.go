package models

import "k8s.io/apimachinery/pkg/runtime/schema"

// GatewayGVR is the Gateway API Gateway resource the gateway discovery route lists.
var GatewayGVR = schema.GroupVersionResource{
	Group:    "gateway.networking.k8s.io",
	Version:  "v1",
	Resource: "gateways",
}

// Gateway status values, as model-serving-api reports them.
const (
	GatewayStatusReady    = "Ready"
	GatewayStatusNotReady = "NotReady"
	GatewayStatusUnknown  = "Unknown"
)

// Annotations model-serving-api reads for human-readable Gateway metadata.
const (
	GatewayAnnotationDisplayName = "openshift.io/display-name"
	GatewayAnnotationDescription = "openshift.io/description"
)

// GatewayRef is one Gateway listener a deployment in the requested namespace
// may attach routes to. The JSON shape is model-serving-api's
// (odh-model-controller server/gateway/types.go), which the frontend parses.
type GatewayRef struct {
	Name        string `json:"name"`
	Namespace   string `json:"namespace"`
	Listener    string `json:"listener"`
	Status      string `json:"status"`
	DisplayName string `json:"displayName,omitempty"`
	Description string `json:"description,omitempty"`
}

// GatewaysResponse is the GET /api/service/model-serving/api/v1/gateways body.
// Gateways is never null.
type GatewaysResponse struct {
	Gateways []GatewayRef `json:"gateways"`
}
