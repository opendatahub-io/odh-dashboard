package helper

import (
	"fmt"
	"strings"

	"github.com/kubeflow/model-registry/ui/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
)

// ConversionOptions holds options for the conversion
type ConversionOptions struct {
	Name            string
	ContainerImage  string
	IncludeComments bool
}

// ConvertToMCPServer converts runtime metadata to an MCPServer CR
func ConvertToMCPServer(metadata *models.McpRuntimeMetadata, opts ConversionOptions) *models.MCPServerConversionResult {
	port := int32(0)
	if metadata != nil && metadata.DefaultPort != nil {
		port = *metadata.DefaultPort
	}

	cr := &models.MCPServer{
		APIVersion: "mcp.x-k8s.io/v1alpha1",
		Kind:       "MCPServer",
		Metadata: models.MCPMetadata{
			Name: opts.Name,
		},
		Spec: models.MCPServerSpec{
			Source: models.MCPSourceSpec{
				Type: "ContainerImage",
				ContainerImage: &models.MCPContainerImage{
					Ref: opts.ContainerImage,
				},
			},
			Config: models.MCPConfigSpec{
				Port: port,
			},
		},
	}

	// Set default port if not specified
	if cr.Spec.Config.Port == 0 {
		cr.Spec.Config.Port = 8080
	}

	// Set MCP path: prefer mcpPath, then default "/mcp"
	mcpPath := ""
	if metadata != nil && metadata.McpPath != nil {
		mcpPath = *metadata.McpPath
	}
	switch {
	case mcpPath != "":
		cr.Spec.Config.Path = mcpPath
	default:
		cr.Spec.Config.Path = "/mcp"
	}

	// Add default arguments
	if metadata != nil && len(metadata.DefaultArgs) > 0 {
		cr.Spec.Config.Arguments = metadata.DefaultArgs
	}

	// Build environment variable documentation comments
	var envComments []string

	if metadata != nil && len(metadata.RequiredEnvironmentVariables) > 0 {
		envComments = append(envComments, "Required environment variables:")
		for _, envVar := range metadata.RequiredEnvironmentVariables {
			envComments = append(envComments, fmt.Sprintf("  - %s: %s", envVar.Name, envVar.Description))
			if envVar.Example != nil && *envVar.Example != "" {
				envComments = append(envComments, fmt.Sprintf("    Example: %s", *envVar.Example))
			}
		}
	}

	if metadata != nil && len(metadata.OptionalEnvironmentVariables) > 0 {
		if len(envComments) > 0 {
			envComments = append(envComments, "")
		}
		envComments = append(envComments, "Optional environment variables:")
		for _, envVar := range metadata.OptionalEnvironmentVariables {
			envComments = append(envComments, fmt.Sprintf("  - %s: %s", envVar.Name, envVar.Description))
			if envVar.DefaultValue != nil {
				envComments = append(envComments, fmt.Sprintf("    Default: %v", *envVar.DefaultValue))
			}
		}
	}

	// Create environment variable placeholders for required vars only
	if metadata != nil && len(metadata.RequiredEnvironmentVariables) > 0 {
		cr.Spec.Config.Env = make([]models.MCPEnvVar, 0, len(metadata.RequiredEnvironmentVariables))
		for _, envVar := range metadata.RequiredEnvironmentVariables {
			env := models.MCPEnvVar{
				Name:  envVar.Name,
				Value: fmt.Sprintf("<%s>", envVar.Name),
			}
			cr.Spec.Config.Env = append(cr.Spec.Config.Env, env)
		}
	}

	// Create optional environment variables separately
	var optionalEnvVars []models.MCPEnvVar
	if metadata != nil && len(metadata.OptionalEnvironmentVariables) > 0 {
		optionalEnvVars = make([]models.MCPEnvVar, 0, len(metadata.OptionalEnvironmentVariables))
		for _, envVar := range metadata.OptionalEnvironmentVariables {
			env := models.MCPEnvVar{
				Name: envVar.Name,
			}

			// Use default value if available, otherwise create a placeholder
			if envVar.DefaultValue != nil {
				env.Value = fmt.Sprintf("%v", *envVar.DefaultValue)
			} else {
				env.Value = fmt.Sprintf("<%s>", envVar.Name)
			}

			optionalEnvVars = append(optionalEnvVars, env)
		}
	}

	// Process prerequisites
	var prereqComments []string
	if metadata != nil && metadata.Prerequisites != nil {
		prereqComments = processPrerequisites(cr, metadata.Prerequisites)
	}

	return &models.MCPServerConversionResult{
		MCPServer:       cr,
		EnvComments:     envComments,
		OptionalEnvVars: optionalEnvVars,
		PrereqComments:  prereqComments,
	}
}

// ExtractContainerImage finds the first OCI artifact URI and strips the oci:// prefix.
// Falls back to the first artifact's URI if no OCI artifact is found.
func ExtractContainerImage(artifacts []models.McpArtifact) string {
	for _, a := range artifacts {
		if strings.HasPrefix(a.URI, "oci://") {
			return strings.TrimPrefix(a.URI, "oci://")
		}
	}
	if len(artifacts) > 0 {
		return artifacts[0].URI
	}
	return ""
}

// processPrerequisites maps prerequisite metadata into the MCPServer CR and returns
// YAML comments describing the resources the user must create before applying the CR.
func processPrerequisites(cr *models.MCPServer, prereqs *models.McpPrerequisites) []string {
	var comments []string
	comments = append(comments, "Prerequisites - create these resources before applying this CR:")
	comments = append(comments, "")

	// --- ServiceAccount ---
	if prereqs.ServiceAccount != nil && prereqs.ServiceAccount.Required != nil && *prereqs.ServiceAccount.Required {
		sa := prereqs.ServiceAccount
		saName := ""
		if sa.SuggestedName != nil {
			saName = *sa.SuggestedName
		}
		if saName == "" {
			saName = cr.Metadata.Name + "-sa"
		}

		// Set on the CR
		if cr.Spec.Runtime == nil {
			cr.Spec.Runtime = &models.MCPRuntimeSpec{}
		}
		if cr.Spec.Runtime.Security == nil {
			cr.Spec.Runtime.Security = &models.MCPSecuritySpec{}
		}
		cr.Spec.Runtime.Security.ServiceAccountName = saName

		comments = append(comments, "ServiceAccount:")
		comments = append(comments, fmt.Sprintf("  kubectl create serviceaccount %s -n %s", saName, cr.Metadata.Namespace))
		if sa.Hint != nil && *sa.Hint != "" {
			comments = append(comments, fmt.Sprintf("  RBAC hint: %s", *sa.Hint))
		}
		comments = append(comments, "")
	}

	// --- Secrets ---
	for _, secret := range prereqs.Secrets {
		comments = append(comments, fmt.Sprintf("Secret '%s':", secret.Name))
		if secret.Description != "" {
			comments = append(comments, fmt.Sprintf("  %s", secret.Description))
		}
		if len(secret.Keys) > 0 {
			comments = append(comments, "  Keys:")
			for _, key := range secret.Keys {
				reqLabel := ""
				if key.Required != nil && *key.Required {
					reqLabel = " (required)"
				}
				comments = append(comments, fmt.Sprintf("    - %s: %s%s", key.Key, key.Description, reqLabel))
			}
		}
		comments = append(comments, "")

		if secret.MountAsFile != nil && *secret.MountAsFile {
			// Mount the secret as a file volume
			mountPath := ""
			if secret.MountPath != nil {
				mountPath = *secret.MountPath
			}
			mount := models.MCPStorageMount{
				Path: mountPath,
				Source: models.MCPStorageSource{
					Type: "Secret",
					Secret: &corev1.SecretVolumeSource{
						SecretName: secret.Name,
					},
				},
			}
			cr.Spec.Config.Storage = append(cr.Spec.Config.Storage, mount)
		} else {
			// Map secret keys to environment variables via secretKeyRef
			for _, key := range secret.Keys {
				envName := ""
				if key.EnvVarName != nil {
					envName = *key.EnvVarName
				}
				if envName == "" {
					envName = key.Key
				}
				env := models.MCPEnvVar{
					Name: envName,
					ValueFrom: &corev1.EnvVarSource{
						SecretKeyRef: &corev1.SecretKeySelector{
							LocalObjectReference: corev1.LocalObjectReference{
								Name: secret.Name,
							},
							Key: key.Key,
						},
					},
				}
				cr.Spec.Config.Env = append(cr.Spec.Config.Env, env)
			}
		}
	}

	// --- ConfigMaps ---
	for _, cm := range prereqs.ConfigMaps {
		comments = append(comments, fmt.Sprintf("ConfigMap '%s':", cm.Name))
		if cm.Description != "" {
			comments = append(comments, fmt.Sprintf("  %s", cm.Description))
		}
		if len(cm.Keys) > 0 {
			comments = append(comments, "  Keys:")
			for _, key := range cm.Keys {
				reqLabel := ""
				if key.Required != nil && *key.Required {
					reqLabel = " (required)"
				}
				comments = append(comments, fmt.Sprintf("    - %s: %s%s", key.Key, key.Description, reqLabel))
				if key.DefaultContent != nil && *key.DefaultContent != "" {
					comments = append(comments, "      Default content available in catalog metadata")
				}
			}
		}
		comments = append(comments, "")

		if cm.MountAsFile != nil && *cm.MountAsFile {
			// Mount the ConfigMap as a file volume
			mountPath := ""
			if cm.MountPath != nil {
				mountPath = *cm.MountPath
			}
			mount := models.MCPStorageMount{
				Path: mountPath,
				Source: models.MCPStorageSource{
					Type: "ConfigMap",
					ConfigMap: &corev1.ConfigMapVolumeSource{
						LocalObjectReference: corev1.LocalObjectReference{
							Name: cm.Name,
						},
					},
				},
			}
			cr.Spec.Config.Storage = append(cr.Spec.Config.Storage, mount)
		} else {
			// Map ConfigMap keys to environment variables via configMapKeyRef
			for _, key := range cm.Keys {
				envName := ""
				if key.EnvVarName != nil {
					envName = *key.EnvVarName
				}
				if envName == "" {
					envName = key.Key
				}
				env := models.MCPEnvVar{
					Name: envName,
					ValueFrom: &corev1.EnvVarSource{
						ConfigMapKeyRef: &corev1.ConfigMapKeySelector{
							LocalObjectReference: corev1.LocalObjectReference{
								Name: cm.Name,
							},
							Key: key.Key,
						},
					},
				}
				cr.Spec.Config.Env = append(cr.Spec.Config.Env, env)
			}
		}
	}

	// --- Custom Resources ---
	if len(prereqs.CustomResources) > 0 {
		comments = append(comments, "Additional resources:")
		for _, res := range prereqs.CustomResources {
			comments = append(comments, fmt.Sprintf("  - %s", res))
		}
		comments = append(comments, "")
	}

	return comments
}
