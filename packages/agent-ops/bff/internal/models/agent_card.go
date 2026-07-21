package models

import "time"

// AgentCardProvider describes the organization that provides an agent.
type AgentCardProvider struct {
	Organization string `json:"organization"`
	URL          string `json:"url,omitempty"`
}

// AgentCardSkillParameter is a parameter accepted by an agent skill.
type AgentCardSkillParameter struct {
	Name        string `json:"name"`
	Type        string `json:"type,omitempty"`
	Description string `json:"description,omitempty"`
	Required    bool   `json:"required"`
	Default     string `json:"default,omitempty"`
}

// AgentCardSkill describes a skill advertised in the agent card.
type AgentCardSkill struct {
	ID          string                    `json:"id"`
	Name        string                    `json:"name"`
	Description string                    `json:"description,omitempty"`
	Tags        []string                  `json:"tags"`
	Examples    []string                  `json:"examples"`
	InputModes  []string                  `json:"inputModes"`
	OutputModes []string                  `json:"outputModes"`
	Parameters  []AgentCardSkillParameter `json:"parameters"`
}

// AgentCardCapabilities summarizes optional agent capabilities.
type AgentCardCapabilities struct {
	Streaming         bool     `json:"streaming"`
	PushNotifications bool     `json:"pushNotifications"`
	Optional          []string `json:"optional"`
}

// AgentCardDetail is A2A agent card metadata enriched for the agent detail UI.
type AgentCardDetail struct {
	Name                  string                `json:"name"`
	Description           string                `json:"description,omitempty"`
	Version               string                `json:"version,omitempty"`
	Provider              *AgentCardProvider    `json:"provider,omitempty"`
	AgentCardURL          string                `json:"agentCardUrl,omitempty"`
	ExternalAgentCardURL  string                `json:"externalAgentCardUrl,omitempty"`
	DocumentationURL      string                `json:"documentationUrl,omitempty"`
	IconURL               string                `json:"iconUrl,omitempty"`
	DefaultInputModes     []string              `json:"defaultInputModes"`
	DefaultOutputModes    []string              `json:"defaultOutputModes"`
	AuthenticationMethods []string              `json:"authenticationMethods"`
	Protocols             []string              `json:"protocols"`
	Labels                []string              `json:"labels"`
	Skills                []AgentCardSkill      `json:"skills"`
	Capabilities          AgentCardCapabilities `json:"capabilities"`
	ToolConnections       []string              `json:"toolConnections"`
	UUID                  string                `json:"uuid,omitempty"`
	SpiffeID              string                `json:"spiffeId,omitempty"`
	LastFetchTime         *time.Time            `json:"lastFetchTime,omitempty"`
	TransportSecurity     string                `json:"transportSecurity,omitempty"`
	ValidSignature        *bool                 `json:"validSignature,omitempty"`
	LinkedSkills          []string              `json:"linkedSkills"`
}
