package models

// AgentProfile represents a complete agent configuration resource
type AgentProfile struct {
	APIVersion string               `json:"apiVersion" yaml:"apiVersion"`
	Kind       string               `json:"kind" yaml:"kind"`
	Metadata   AgentProfileMetadata `json:"metadata" yaml:"metadata"`
	Spec       AgentProfileSpec     `json:"spec" yaml:"spec"`
}

// AgentProfileMetadata contains identifying information for an agent profile
type AgentProfileMetadata struct {
	Name            string `json:"name" yaml:"name"`
	ResourceVersion string `json:"resourceVersion" yaml:"-"` // K8s metadata, not stored in YAML
}

// AgentProfileSpec defines the desired state of an agent profile
type AgentProfileSpec struct {
	DisplayName     string                 `json:"displayName" yaml:"displayName"`
	Description     string                 `json:"description,omitempty" yaml:"description,omitempty"`
	Model           ModelReference         `json:"model" yaml:"model"`
	Asr             *AgentProfileAsr       `json:"asr,omitempty" yaml:"asr,omitempty"`
	Prompt          *SystemPromptReference `json:"prompt,omitempty" yaml:"prompt,omitempty"`
	Temperature     *float64               `json:"temperature,omitempty" yaml:"temperature,omitempty"`
	Stream          *bool                  `json:"stream,omitempty" yaml:"stream,omitempty"`
	MaxOutputTokens *int                   `json:"maxOutputTokens,omitempty" yaml:"maxOutputTokens,omitempty"`
	VectorStores    *VectorStoresConfig    `json:"vectorStores,omitempty" yaml:"vectorStores,omitempty"`
	MCPServers      []MCPServerReference   `json:"mcpServers,omitempty" yaml:"mcpServers,omitempty"`
	Guardrails      []GuardrailReference   `json:"guardrails,omitempty" yaml:"guardrails,omitempty"`
}

// AgentProfileAsr contains ASR (transcription) model configuration
type AgentProfileAsr struct {
	Model *ModelReference `json:"model,omitempty" yaml:"model,omitempty"`
}

// ModelReference specifies the model to use for the agent
type ModelReference struct {
	ID            string              `json:"id" yaml:"id"`
	URI           string              `json:"uri" yaml:"uri"`
	SourceType    string              `json:"sourceType,omitempty" yaml:"sourceType,omitempty"`
	Authorization *ModelAuthorization `json:"authorization,omitempty" yaml:"authorization,omitempty"`
}

// ModelAuthorization contains authentication configuration for a model
type ModelAuthorization struct {
	CredentialsRef   *CredentialsRef `json:"credentialsRef,omitempty" yaml:"credentialsRef,omitempty"`
	MaaSSubscription string          `json:"maasSubscription,omitempty" yaml:"maasSubscription,omitempty"`
}

// CredentialsRef points to a Kubernetes Secret containing authentication data
type CredentialsRef struct {
	Kind string `json:"kind" yaml:"kind"`
	Name string `json:"name" yaml:"name"`
	Key  string `json:"key" yaml:"key"`
}

// SystemPromptReference points to a system prompt in an external system
type SystemPromptReference struct {
	Name      string                    `json:"name" yaml:"name"`
	Source    string                    `json:"source" yaml:"source"`
	Namespace string                    `json:"namespace,omitempty" yaml:"namespace,omitempty"`
	Version   string                    `json:"version,omitempty" yaml:"version,omitempty"`
	Variables map[string]PromptVariable `json:"variables,omitempty" yaml:"variables,omitempty"`
}

// PromptVariable represents a template variable in a system prompt
type PromptVariable struct {
	Text string `json:"text" yaml:"text"`
	Type string `json:"type" yaml:"type"`
}

// VectorStoresConfig specifies vector stores for RAG
type VectorStoresConfig struct {
	Stores        []VectorStoreRef `json:"stores" yaml:"stores"`
	MaxNumResults *int             `json:"maxNumResults,omitempty" yaml:"maxNumResults,omitempty"`
}

// VectorStoreRef points to a vector store (either by ConfigMap ref or direct ID)
type VectorStoreRef struct {
	StoreRef *ConfigMapRef `json:"storeRef,omitempty" yaml:"storeRef,omitempty"`
	ID       string        `json:"id,omitempty" yaml:"id,omitempty"`
}

// ConfigMapRef points to a specific key in a ConfigMap
type ConfigMapRef struct {
	Kind string `json:"kind" yaml:"kind"`
	Name string `json:"name" yaml:"name"`
	Key  string `json:"key" yaml:"key"`
}

// MCPServerReference points to an MCP server configuration
type MCPServerReference struct {
	ServerRef      MCPServerRef    `json:"serverRef" yaml:"serverRef"`
	CredentialsRef *CredentialsRef `json:"credentialsRef,omitempty" yaml:"credentialsRef,omitempty"`
	AllowedTools   []string        `json:"allowedTools,omitempty" yaml:"allowedTools,omitempty"`
}

// MCPServerRef can point to either a ConfigMap or MCPServer CRD
type MCPServerRef struct {
	Kind string `json:"kind" yaml:"kind"`
	Name string `json:"name" yaml:"name"`
	Key  string `json:"key,omitempty" yaml:"key,omitempty"`
}

// GuardrailReference points to a guardrail configuration
type GuardrailReference struct {
	Provider     string       `json:"provider" yaml:"provider"`
	GuardrailRef ConfigMapRef `json:"guardrailRef" yaml:"guardrailRef"`
}

// AgentProfileCreateRequest is the HTTP request body for creating an agent profile
// Users only provide the spec; metadata.name (UUID) is auto-generated by the server
type AgentProfileCreateRequest struct {
	Spec AgentProfileSpec `json:"spec"`
}

// AgentProfileCreateResponse is the HTTP response for successful agent profile creation
type AgentProfileCreateResponse struct {
	Name            string `json:"name"`            // ConfigMap name: "agent-profile-{uuid}"
	ProfileID       string `json:"profileId"`       // The UUID (metadata.name)
	DisplayName     string `json:"displayName"`     // User-friendly name from spec
	Namespace       string `json:"namespace"`       // Kubernetes namespace
	ResourceVersion string `json:"resourceVersion"` // K8s resource version
}

// AgentProfileSummary is a lightweight representation for list operations
type AgentProfileSummary struct {
	Name         string `json:"name"`                  // ConfigMap name: "agent-profile-{uuid}"
	ProfileID    string `json:"profileId"`             // The UUID (metadata.name)
	DisplayName  string `json:"displayName"`           // User-friendly name from spec
	Description  string `json:"description,omitempty"` // Optional description from spec
	Namespace    string `json:"namespace"`             // Kubernetes namespace
	LastModified string `json:"lastModified"`          // ISO 8601 timestamp
}

// AgentProfileListResponse is the HTTP response for listing agent profiles
type AgentProfileListResponse struct {
	Profiles   []AgentProfileSummary `json:"profiles"`
	TotalCount int                   `json:"totalCount"`
}

// AgentProfileUpdateRequest is the HTTP request body for updating an agent profile
type AgentProfileUpdateRequest struct {
	Spec            AgentProfileSpec `json:"spec"`
	ResourceVersion string           `json:"resourceVersion"`
}

// AgentProfileUpdateResponse is the HTTP response for successful agent profile update
type AgentProfileUpdateResponse struct {
	Name            string `json:"name"`            // ConfigMap name: "agent-profile-{uuid}"
	ProfileID       string `json:"profileId"`       // The UUID (metadata.name)
	DisplayName     string `json:"displayName"`     // User-friendly name from spec
	Namespace       string `json:"namespace"`       // Kubernetes namespace
	ResourceVersion string `json:"resourceVersion"` // K8s resource version after update
}
