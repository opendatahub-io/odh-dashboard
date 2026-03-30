package models

import corev1 "k8s.io/api/core/v1"

// MCPServer represents the mcp.x-k8s.io/v1alpha1 MCPServer Custom Resource.
type MCPServer struct {
	APIVersion string        `json:"apiVersion"`
	Kind       string        `json:"kind"`
	Metadata   MCPMetadata   `json:"metadata"`
	Spec       MCPServerSpec `json:"spec"`
}

type MCPMetadata struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
}

type MCPServerSpec struct {
	Source  MCPSourceSpec   `json:"source"`
	Config  MCPConfigSpec   `json:"config"`
	Runtime *MCPRuntimeSpec `json:"runtime,omitempty"`
}

type MCPSourceSpec struct {
	Type           string             `json:"type"`
	ContainerImage *MCPContainerImage `json:"containerImage,omitempty"`
}

type MCPContainerImage struct {
	Ref string `json:"ref"`
}

type MCPConfigSpec struct {
	Port      int32                  `json:"port"`
	Path      string                 `json:"path,omitempty"`
	Arguments []string               `json:"arguments,omitempty"`
	Env       []MCPEnvVar            `json:"env,omitempty"`
	EnvFrom   []corev1.EnvFromSource `json:"envFrom,omitempty"`
	Storage   []MCPStorageMount      `json:"storage,omitempty"`
}

// MCPEnvVar is a simplified version of corev1.EnvVar that omits valueFrom when not set.
type MCPEnvVar struct {
	Name      string               `json:"name"`
	Value     string               `json:"value,omitempty"`
	ValueFrom *corev1.EnvVarSource `json:"valueFrom,omitempty"`
}

type MCPStorageMount struct {
	Path        string           `json:"path"`
	Permissions string           `json:"permissions,omitempty"`
	Source      MCPStorageSource `json:"source"`
}

type MCPStorageSource struct {
	Type      string                        `json:"type"`
	ConfigMap *corev1.ConfigMapVolumeSource `json:"configMap,omitempty"`
	Secret    *corev1.SecretVolumeSource    `json:"secret,omitempty"`
}

type MCPRuntimeSpec struct {
	Replicas *int32           `json:"replicas,omitempty"`
	Security *MCPSecuritySpec `json:"security,omitempty"`
}

type MCPSecuritySpec struct {
	ServiceAccountName string                     `json:"serviceAccountName,omitempty"`
	PodSecurityContext *corev1.PodSecurityContext `json:"podSecurityContext,omitempty"`
	SecurityContext    *corev1.SecurityContext    `json:"securityContext,omitempty"`
}

// MCPServerConversionResult holds the converted MCPServer and metadata useful for the frontend.
type MCPServerConversionResult struct {
	MCPServer       *MCPServer  `json:"mcpServer"`
	EnvComments     []string    `json:"envComments,omitempty"`
	OptionalEnvVars []MCPEnvVar `json:"optionalEnvVars,omitempty"`
	PrereqComments  []string    `json:"prereqComments,omitempty"`
}
