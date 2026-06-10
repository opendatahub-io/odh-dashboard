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
	Port      int32                  `json:"port" yaml:"port"`
	Path      string                 `json:"path,omitempty" yaml:"path,omitempty"`
	Arguments []string               `json:"arguments,omitempty" yaml:"arguments,omitempty"`
	Env       []MCPEnvVar            `json:"env,omitempty" yaml:"env,omitempty"`
	EnvFrom   []corev1.EnvFromSource `json:"envFrom,omitempty" yaml:"envfrom,omitempty"`
	Storage   []MCPStorageMount      `json:"storage,omitempty" yaml:"storage,omitempty"`
}

// MCPEnvVar is a simplified version of corev1.EnvVar that omits valueFrom when not set.
type MCPEnvVar struct {
	Name      string               `json:"name" yaml:"name"`
	Value     string               `json:"value,omitempty" yaml:"value,omitempty"`
	ValueFrom *corev1.EnvVarSource `json:"valueFrom,omitempty" yaml:"valuefrom,omitempty"`
}

type MCPStorageMount struct {
	Path        string           `json:"path" yaml:"path"`
	Permissions string           `json:"permissions,omitempty" yaml:"permissions,omitempty"`
	Source      MCPStorageSource `json:"source" yaml:"source"`
}

type MCPStorageSource struct {
	Type      string                        `json:"type" yaml:"type"`
	ConfigMap *corev1.ConfigMapVolumeSource `json:"configMap,omitempty" yaml:"configmap,omitempty"`
	Secret    *corev1.SecretVolumeSource    `json:"secret,omitempty" yaml:"secret,omitempty"`
}

type MCPRuntimeSpec struct {
	Replicas *int32           `json:"replicas,omitempty" yaml:"replicas,omitempty"`
	Security *MCPSecuritySpec `json:"security,omitempty" yaml:"security,omitempty"`
}

type MCPSecuritySpec struct {
	ServiceAccountName string                     `json:"serviceAccountName,omitempty" yaml:"serviceaccountname,omitempty"`
	PodSecurityContext *corev1.PodSecurityContext `json:"podSecurityContext,omitempty" yaml:"podsecuritycontext,omitempty"`
	SecurityContext    *corev1.SecurityContext    `json:"securityContext,omitempty" yaml:"securitycontext,omitempty"`
}

// MCPServerConversionResult holds the converted MCPServer and metadata useful for the frontend.
type MCPServerConversionResult struct {
	MCPServer       *MCPServer  `json:"mcpServer"`
	EnvComments     []string    `json:"envComments,omitempty"`
	OptionalEnvVars []MCPEnvVar `json:"optionalEnvVars,omitempty"`
	PrereqComments  []string    `json:"prereqComments,omitempty"`
}
