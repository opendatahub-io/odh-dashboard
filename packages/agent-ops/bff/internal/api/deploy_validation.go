package api

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

var envVarNameRegex = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

var validProtocols = map[string]bool{
	"a2a": true,
	"mcp": true,
}

var validAuthBridgeModes = map[string]bool{
	"proxy-sidecar": true,
	"envoy-sidecar": true,
	"lite":          true,
	"waypoint":      true,
}

var validMTLSModes = map[string]bool{
	"disabled":   true,
	"permissive": true,
	"strict":     true,
}

var validServicePortProtocols = map[string]bool{
	"TCP":  true,
	"UDP":  true,
	"SCTP": true,
	"":     true,
}

func validateDeployRequest(req *models.DeployAgentRequest) error {
	if !isValidDNS1123Label(req.Name) {
		return fmt.Errorf("invalid agent name %q", req.Name)
	}
	if !isValidDNS1123Label(req.Namespace) {
		return fmt.Errorf("invalid namespace %q", req.Namespace)
	}
	if req.ContainerImage == "" {
		return fmt.Errorf("containerImage is required")
	}
	if strings.Contains(req.ContainerImage, ":") {
		return fmt.Errorf("containerImage must not include a tag — use imageTag instead")
	}
	if req.ImageTag == "" {
		return fmt.Errorf("imageTag is required")
	}
	if req.Framework != "" && !isValidLabelValue(req.Framework) {
		return fmt.Errorf("invalid framework %q: must be a valid Kubernetes label value (max 63 chars, alphanumeric, '-', '_', or '.')", req.Framework)
	}
	if req.Protocol != "" && !validProtocols[req.Protocol] {
		return fmt.Errorf("invalid protocol %q: must be one of a2a, mcp", req.Protocol)
	}
	if req.AuthBridgeMode != "" && !validAuthBridgeModes[req.AuthBridgeMode] {
		return fmt.Errorf("invalid authBridgeMode %q: must be one of proxy-sidecar, envoy-sidecar, lite, waypoint", req.AuthBridgeMode)
	}
	if req.MTLSMode != "" && !validMTLSModes[req.MTLSMode] {
		return fmt.Errorf("invalid mtlsMode %q: must be one of disabled, permissive, strict", req.MTLSMode)
	}
	for i, e := range req.EnvVars {
		if strings.TrimSpace(e.Name) != e.Name {
			return fmt.Errorf("envVars[%d].name must not have leading/trailing whitespace", i)
		}
		if e.Name == "" {
			return fmt.Errorf("envVars[%d].name must not be empty", i)
		}
		if !envVarNameRegex.MatchString(e.Name) {
			return fmt.Errorf("envVars[%d].name %q is not a valid C_IDENTIFIER", i, e.Name)
		}
	}
	for i, p := range req.ServicePorts {
		if p.Port < 1 || p.Port > 65535 {
			return fmt.Errorf("servicePorts[%d].port must be between 1 and 65535", i)
		}
		if p.TargetPort < 1 || p.TargetPort > 65535 {
			return fmt.Errorf("servicePorts[%d].targetPort must be between 1 and 65535", i)
		}
		if !validServicePortProtocols[p.Protocol] {
			return fmt.Errorf("servicePorts[%d].protocol %q must be one of TCP, UDP, SCTP", i, p.Protocol)
		}
	}
	return nil
}

func applyDeployDefaults(req *models.DeployAgentRequest) {
	if req.Protocol == "" {
		req.Protocol = "a2a"
	}
	if req.AuthBridgeEnabled == nil {
		enabled := true
		req.AuthBridgeEnabled = &enabled
	}
	if len(req.ServicePorts) == 0 {
		req.ServicePorts = []models.ServicePort{
			{Name: "http", Port: 8080, TargetPort: 8000, Protocol: "TCP"},
		}
	}
}

func mapDeployRequestToParams(req *models.DeployAgentRequest) *agents.DeployAgentParams {
	params := &agents.DeployAgentParams{
		Name:            req.Name,
		Namespace:       req.Namespace,
		ContainerImage:  req.ContainerImage,
		ImageTag:        req.ImageTag,
		ImagePullSecret: req.ImagePullSecret,
		Protocol:        req.Protocol,
		Framework:       req.Framework,
		CreateRoute:     req.CreateRoute,
		AuthBridgeMode:  req.AuthBridgeMode,
		MTLSMode:        req.MTLSMode,
	}
	if req.AuthBridgeEnabled != nil {
		params.AuthBridgeEnabled = *req.AuthBridgeEnabled
	}
	for _, e := range req.EnvVars {
		params.EnvVars = append(params.EnvVars, agents.AgentEnvVar{
			Name:  e.Name,
			Value: e.Value,
		})
	}
	for _, p := range req.ServicePorts {
		params.ServicePorts = append(params.ServicePorts, agents.AgentServicePortSpec{
			Name:       p.Name,
			Port:       p.Port,
			TargetPort: p.TargetPort,
			Protocol:   p.Protocol,
		})
	}
	return params
}
