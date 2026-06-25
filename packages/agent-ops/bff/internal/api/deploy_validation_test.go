package api

import (
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func validDeployRequest() *models.DeployAgentRequest {
	return &models.DeployAgentRequest{
		Name:           "my-agent",
		Namespace:      "default",
		ContainerImage: "quay.io/example/agent",
		ImageTag:       "latest",
		Protocol:       "a2a",
	}
}

func TestValidateDeployRequest(t *testing.T) {
	tests := []struct {
		name    string
		modify  func(r *models.DeployAgentRequest)
		wantErr string
	}{
		{
			name:   "valid minimal request",
			modify: func(r *models.DeployAgentRequest) {},
		},
		{
			name:    "empty name",
			modify:  func(r *models.DeployAgentRequest) { r.Name = "" },
			wantErr: "invalid agent name",
		},
		{
			name:    "uppercase name",
			modify:  func(r *models.DeployAgentRequest) { r.Name = "MyAgent" },
			wantErr: "invalid agent name",
		},
		{
			name:    "name too long",
			modify:  func(r *models.DeployAgentRequest) { r.Name = "a234567890123456789012345678901234567890123456789012345678901234" },
			wantErr: "invalid agent name",
		},
		{
			name:    "empty namespace",
			modify:  func(r *models.DeployAgentRequest) { r.Namespace = "" },
			wantErr: "invalid namespace",
		},
		{
			name:    "uppercase namespace",
			modify:  func(r *models.DeployAgentRequest) { r.Namespace = "INVALID" },
			wantErr: "invalid namespace",
		},
		{
			name:    "empty containerImage",
			modify:  func(r *models.DeployAgentRequest) { r.ContainerImage = "" },
			wantErr: "containerImage is required",
		},
		{
			name:    "empty imageTag",
			modify:  func(r *models.DeployAgentRequest) { r.ImageTag = "" },
			wantErr: "imageTag is required",
		},
		{
			name:    "invalid protocol",
			modify:  func(r *models.DeployAgentRequest) { r.Protocol = "grpc" },
			wantErr: "invalid protocol",
		},
		{
			name:   "valid protocol mcp",
			modify: func(r *models.DeployAgentRequest) { r.Protocol = "mcp" },
		},
		{
			name:    "invalid authBridgeMode",
			modify:  func(r *models.DeployAgentRequest) { r.AuthBridgeMode = "invalid" },
			wantErr: "invalid authBridgeMode",
		},
		{
			name:   "valid authBridgeMode",
			modify: func(r *models.DeployAgentRequest) { r.AuthBridgeMode = "proxy-sidecar" },
		},
		{
			name:    "invalid mtlsMode",
			modify:  func(r *models.DeployAgentRequest) { r.MTLSMode = "invalid" },
			wantErr: "invalid mtlsMode",
		},
		{
			name:   "valid mtlsMode",
			modify: func(r *models.DeployAgentRequest) { r.MTLSMode = "strict" },
		},
		{
			name:    "framework too long",
			modify:  func(r *models.DeployAgentRequest) { r.Framework = "a234567890123456789012345678901234567890123456789012345678901234" },
			wantErr: "invalid framework",
		},
		{
			name:    "framework invalid chars",
			modify:  func(r *models.DeployAgentRequest) { r.Framework = "has spaces" },
			wantErr: "invalid framework",
		},
		{
			name:   "valid framework",
			modify: func(r *models.DeployAgentRequest) { r.Framework = "langgraph" },
		},
		{
			name: "empty env var name",
			modify: func(r *models.DeployAgentRequest) {
				r.EnvVars = []models.EnvVar{{Name: "", Value: "val"}}
			},
			wantErr: "envVars[0].name must not be empty",
		},
		{
			name: "env var name with whitespace",
			modify: func(r *models.DeployAgentRequest) {
				r.EnvVars = []models.EnvVar{{Name: " FOO ", Value: "val"}}
			},
			wantErr: "whitespace",
		},
		{
			name: "env var name starts with digit",
			modify: func(r *models.DeployAgentRequest) {
				r.EnvVars = []models.EnvVar{{Name: "1BAD", Value: "val"}}
			},
			wantErr: "C_IDENTIFIER",
		},
		{
			name: "valid env var",
			modify: func(r *models.DeployAgentRequest) {
				r.EnvVars = []models.EnvVar{{Name: "LOG_LEVEL", Value: "debug"}}
			},
		},
		{
			name: "port zero",
			modify: func(r *models.DeployAgentRequest) {
				r.ServicePorts = []models.ServicePort{{Name: "http", Port: 0, TargetPort: 8000}}
			},
			wantErr: "port must be between",
		},
		{
			name: "port too high",
			modify: func(r *models.DeployAgentRequest) {
				r.ServicePorts = []models.ServicePort{{Name: "http", Port: 8080, TargetPort: 65536}}
			},
			wantErr: "targetPort must be between",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := validDeployRequest()
			tt.modify(req)
			err := validateDeployRequest(req)
			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestApplyDeployDefaults(t *testing.T) {
	t.Run("applies defaults to empty request", func(t *testing.T) {
		req := &models.DeployAgentRequest{}
		applyDeployDefaults(req)

		assert.Equal(t, "a2a", req.Protocol)
		require.NotNil(t, req.AuthBridgeEnabled)
		assert.True(t, *req.AuthBridgeEnabled)
		require.Len(t, req.ServicePorts, 1)
		assert.Equal(t, int32(8080), req.ServicePorts[0].Port)
		assert.Equal(t, int32(8000), req.ServicePorts[0].TargetPort)
	})

	t.Run("does not overwrite existing protocol", func(t *testing.T) {
		req := &models.DeployAgentRequest{Protocol: "mcp"}
		applyDeployDefaults(req)
		assert.Equal(t, "mcp", req.Protocol)
	})

	t.Run("does not overwrite existing service ports", func(t *testing.T) {
		req := &models.DeployAgentRequest{
			ServicePorts: []models.ServicePort{{Name: "grpc", Port: 50051, TargetPort: 50051}},
		}
		applyDeployDefaults(req)
		require.Len(t, req.ServicePorts, 1)
		assert.Equal(t, int32(50051), req.ServicePorts[0].Port)
	})
}

func TestMapDeployRequestToParams(t *testing.T) {
	enabled := true
	req := &models.DeployAgentRequest{
		Name:              "my-agent",
		Namespace:         "default",
		ContainerImage:    "quay.io/example/agent",
		ImageTag:          "v1.0.0",
		Protocol:          "a2a",
		Framework:         "langgraph",
		CreateRoute:       true,
		AuthBridgeEnabled: &enabled,
		EnvVars:           []models.EnvVar{{Name: "KEY", Value: "val"}},
		ServicePorts:      []models.ServicePort{{Name: "http", Port: 8080, TargetPort: 8000, Protocol: "TCP"}},
	}

	params := mapDeployRequestToParams(req)

	assert.Equal(t, "my-agent", params.Name)
	assert.Equal(t, "default", params.Namespace)
	assert.Equal(t, "quay.io/example/agent", params.ContainerImage)
	assert.Equal(t, "v1.0.0", params.ImageTag)
	assert.Equal(t, "a2a", params.Protocol)
	assert.Equal(t, "langgraph", params.Framework)
	assert.True(t, params.CreateRoute)
	assert.True(t, params.AuthBridgeEnabled)
	require.Len(t, params.EnvVars, 1)
	assert.Equal(t, "KEY", params.EnvVars[0].Name)
	require.Len(t, params.ServicePorts, 1)
	assert.Equal(t, int32(8080), params.ServicePorts[0].Port)
}
