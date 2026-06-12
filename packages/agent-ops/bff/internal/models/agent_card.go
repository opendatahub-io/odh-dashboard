package models

// AgentSkill describes a skill exposed by an agent.
type AgentSkill struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// AgentCapabilities describes optional protocol features supported by the agent.
type AgentCapabilities struct {
	Streaming         bool `json:"streaming"`
	PushNotifications bool `json:"pushNotifications"`
}

// AgentProvider describes the agent provider metadata.
type AgentProvider struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName,omitempty"`
	URL         string `json:"url,omitempty"`
}

// AgentCard is the agent discovery card for a single agent.
type AgentCard struct {
	Name                 string            `json:"name"`
	Namespace            string            `json:"namespace"`
	Description          string            `json:"description"`
	Version              string            `json:"version"`
	URL                  string            `json:"url,omitempty"`
	Skills               []AgentSkill      `json:"skills"`
	Capabilities         AgentCapabilities `json:"capabilities"`
	Provider             AgentProvider     `json:"provider"`
	SupportedInputModes  []string          `json:"supportedInputModes"`
	SupportedOutputModes []string          `json:"supportedOutputModes"`
}
