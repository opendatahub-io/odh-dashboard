package helper

import (
	"testing"

	"github.com/kubeflow/model-registry/ui/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func ptr[T any](v T) *T { return &v }

func TestConvertToMCPServer_Basic(t *testing.T) {
	metadata := &models.McpRuntimeMetadata{
		DefaultPort: ptr(int32(9090)),
		McpPath:     ptr("/sse"),
		DefaultArgs: []string{"--verbose"},
	}

	result := ConvertToMCPServer(metadata, ConversionOptions{
		Name:           "my-server",
		ContainerImage: "ghcr.io/example/server:v1",
	})

	cr := result.MCPServer
	assert.Equal(t, "mcp.x-k8s.io/v1alpha1", cr.APIVersion)
	assert.Equal(t, "MCPServer", cr.Kind)
	assert.Equal(t, "my-server", cr.Metadata.Name)
	assert.Empty(t, cr.Metadata.Namespace)
	assert.Equal(t, "ContainerImage", cr.Spec.Source.Type)
	assert.Equal(t, "ghcr.io/example/server:v1", cr.Spec.Source.ContainerImage.Ref)
	assert.Equal(t, int32(9090), cr.Spec.Config.Port)
	assert.Equal(t, "/sse", cr.Spec.Config.Path)
	assert.Equal(t, []string{"--verbose"}, cr.Spec.Config.Arguments)
}

func TestConvertToMCPServer_DefaultPort(t *testing.T) {
	result := ConvertToMCPServer(nil, ConversionOptions{
		Name:           "plain-server",
		ContainerImage: "ghcr.io/example/plain:latest",
	})

	assert.Equal(t, int32(8080), result.MCPServer.Spec.Config.Port)
	assert.Equal(t, "/mcp", result.MCPServer.Spec.Config.Path)
	assert.Equal(t, "ghcr.io/example/plain:latest", result.MCPServer.Spec.Source.ContainerImage.Ref)
}

func TestConvertToMCPServer_NoNamespaceInCR(t *testing.T) {
	metadata := &models.McpRuntimeMetadata{
		DefaultPort: ptr(int32(9090)),
	}

	result := ConvertToMCPServer(metadata, ConversionOptions{
		Name:           "test",
		ContainerImage: "img:v1",
	})

	assert.Empty(t, result.MCPServer.Metadata.Namespace)
}

func TestExtractContainerImage_OciPrefixStripped(t *testing.T) {
	artifacts := []models.McpArtifact{
		{URI: "oci://quay.io/my-org/my-mcp:0.1.0"},
	}

	result := ExtractContainerImage(artifacts)
	assert.Equal(t, "quay.io/my-org/my-mcp:0.1.0", result)
}

func TestExtractContainerImage_NoPrefix(t *testing.T) {
	artifacts := []models.McpArtifact{
		{URI: "ghcr.io/example/plain:latest"},
	}

	result := ExtractContainerImage(artifacts)
	assert.Equal(t, "ghcr.io/example/plain:latest", result)
}

func TestExtractContainerImage_Empty(t *testing.T) {
	result := ExtractContainerImage(nil)
	assert.Equal(t, "", result)
}

func TestConvertToMCPServer_RequiredEnvVars(t *testing.T) {
	metadata := &models.McpRuntimeMetadata{
		RequiredEnvironmentVariables: []models.McpEnvVarMetadata{
			{Name: "API_KEY", Description: "API key for auth", Example: ptr("sk-xxx")},
			{Name: "ENDPOINT", Description: "Endpoint URL"},
		},
	}

	result := ConvertToMCPServer(metadata, ConversionOptions{Name: "env-test", ContainerImage: "img:v1"})

	assert.Len(t, result.MCPServer.Spec.Config.Env, 2)
	assert.Equal(t, "API_KEY", result.MCPServer.Spec.Config.Env[0].Name)
	assert.Equal(t, "<API_KEY>", result.MCPServer.Spec.Config.Env[0].Value)

	assert.Contains(t, result.EnvComments, "Required environment variables:")
	assert.Contains(t, result.EnvComments, "  - API_KEY: API key for auth")
	assert.Contains(t, result.EnvComments, "    Example: sk-xxx")
}

func TestConvertToMCPServer_OptionalEnvVars(t *testing.T) {
	metadata := &models.McpRuntimeMetadata{
		OptionalEnvironmentVariables: []models.McpEnvVarMetadata{
			{Name: "LOG_LEVEL", Description: "Log level", DefaultValue: ptr("info")},
			{Name: "TIMEOUT", Description: "Timeout in seconds"},
		},
	}

	result := ConvertToMCPServer(metadata, ConversionOptions{Name: "opt-test", ContainerImage: "img:v1"})

	assert.Len(t, result.OptionalEnvVars, 2)
	assert.Equal(t, "LOG_LEVEL", result.OptionalEnvVars[0].Name)
	assert.Equal(t, "info", result.OptionalEnvVars[0].Value)
	assert.Equal(t, "TIMEOUT", result.OptionalEnvVars[1].Name)
	assert.Equal(t, "<TIMEOUT>", result.OptionalEnvVars[1].Value)
}

func TestConvertToMCPServer_ServiceAccountPrerequisite(t *testing.T) {
	metadata := &models.McpRuntimeMetadata{
		Prerequisites: &models.McpPrerequisites{
			ServiceAccount: &models.McpServiceAccountRequirement{
				Required:      ptr(true),
				SuggestedName: ptr("my-sa"),
				Hint:          ptr("Needs cluster-reader role"),
			},
		},
	}

	result := ConvertToMCPServer(metadata, ConversionOptions{
		Name:           "sa-test",
		ContainerImage: "img:v1",
	})

	assert.NotNil(t, result.MCPServer.Spec.Runtime)
	assert.NotNil(t, result.MCPServer.Spec.Runtime.Security)
	assert.Equal(t, "my-sa", result.MCPServer.Spec.Runtime.Security.ServiceAccountName)
	assert.Contains(t, result.PrereqComments, "ServiceAccount:")
	assert.Contains(t, result.PrereqComments, "  RBAC hint: Needs cluster-reader role")
}

func TestConvertToMCPServer_SecretAsEnvVar(t *testing.T) {
	metadata := &models.McpRuntimeMetadata{
		Prerequisites: &models.McpPrerequisites{
			Secrets: []models.McpSecretRequirement{
				{
					Name:        "api-credentials",
					Description: "API credentials",
					Keys: []models.McpSecretKey{
						{Key: "token", Description: "Auth token", EnvVarName: ptr("AUTH_TOKEN"), Required: ptr(true)},
					},
				},
			},
		},
	}

	result := ConvertToMCPServer(metadata, ConversionOptions{Name: "secret-test", ContainerImage: "img:v1"})

	found := false
	for _, env := range result.MCPServer.Spec.Config.Env {
		if env.Name == "AUTH_TOKEN" && env.ValueFrom != nil && env.ValueFrom.SecretKeyRef != nil {
			assert.Equal(t, "api-credentials", env.ValueFrom.SecretKeyRef.Name)
			assert.Equal(t, "token", env.ValueFrom.SecretKeyRef.Key)
			found = true
		}
	}
	assert.True(t, found, "expected env var AUTH_TOKEN with secretKeyRef")
}

func TestConvertToMCPServer_SecretMountedAsFile(t *testing.T) {
	metadata := &models.McpRuntimeMetadata{
		Prerequisites: &models.McpPrerequisites{
			Secrets: []models.McpSecretRequirement{
				{
					Name:        "tls-cert",
					Description: "TLS certificate",
					MountAsFile: ptr(true),
					MountPath:   ptr("/etc/tls"),
				},
			},
		},
	}

	result := ConvertToMCPServer(metadata, ConversionOptions{Name: "file-mount-test", ContainerImage: "img:v1"})

	assert.Len(t, result.MCPServer.Spec.Config.Storage, 1)
	s := result.MCPServer.Spec.Config.Storage[0]
	assert.Equal(t, "/etc/tls", s.Path)
	assert.Equal(t, "Secret", s.Source.Type)
	assert.Equal(t, "tls-cert", s.Source.Secret.SecretName)
}

func TestConvertToMCPServer_ConfigMapAsEnvVar(t *testing.T) {
	metadata := &models.McpRuntimeMetadata{
		Prerequisites: &models.McpPrerequisites{
			ConfigMaps: []models.McpConfigMapRequirement{
				{
					Name:        "app-config",
					Description: "Application config",
					Keys: []models.McpConfigMapKey{
						{Key: "config.yaml", Description: "Main config", EnvVarName: ptr("APP_CONFIG")},
					},
				},
			},
		},
	}

	result := ConvertToMCPServer(metadata, ConversionOptions{Name: "cm-env-test", ContainerImage: "img:v1"})

	found := false
	for _, env := range result.MCPServer.Spec.Config.Env {
		if env.Name == "APP_CONFIG" && env.ValueFrom != nil && env.ValueFrom.ConfigMapKeyRef != nil {
			assert.Equal(t, "app-config", env.ValueFrom.ConfigMapKeyRef.Name)
			assert.Equal(t, "config.yaml", env.ValueFrom.ConfigMapKeyRef.Key)
			found = true
		}
	}
	assert.True(t, found, "expected env var APP_CONFIG with configMapKeyRef")
}

func TestConvertToMCPServer_ConfigMapMountedAsFile(t *testing.T) {
	metadata := &models.McpRuntimeMetadata{
		Prerequisites: &models.McpPrerequisites{
			ConfigMaps: []models.McpConfigMapRequirement{
				{
					Name:        "rules",
					Description: "Alert rules",
					MountAsFile: ptr(true),
					MountPath:   ptr("/etc/rules"),
				},
			},
		},
	}

	result := ConvertToMCPServer(metadata, ConversionOptions{Name: "cm-mount-test", ContainerImage: "img:v1"})

	assert.Len(t, result.MCPServer.Spec.Config.Storage, 1)
	s := result.MCPServer.Spec.Config.Storage[0]
	assert.Equal(t, "/etc/rules", s.Path)
	assert.Equal(t, "ConfigMap", s.Source.Type)
	assert.Equal(t, "rules", s.Source.ConfigMap.Name)
}

func TestConvertToMCPServer_NilMetadata(t *testing.T) {
	result := ConvertToMCPServer(nil, ConversionOptions{Name: "no-rt", ContainerImage: "img:v1"})
	assert.Equal(t, int32(8080), result.MCPServer.Spec.Config.Port)
	assert.Equal(t, "/mcp", result.MCPServer.Spec.Config.Path)
	assert.Nil(t, result.EnvComments)
	assert.Nil(t, result.OptionalEnvVars)
	assert.Nil(t, result.PrereqComments)
}
