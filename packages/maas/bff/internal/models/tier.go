package models

type TiersList []Tier

type Tier struct {
	Name        string     `json:"name,omitempty"`
	DisplayName string     `json:"displayName,omitempty"`
	Description string     `json:"description,omitempty"`
	Level       int        `json:"level,omitempty"`
	Groups      []string   `json:"groups,omitempty"`
	Models      []string   `json:"models,omitempty"`
	Limits      TierLimits `json:"limits,omitempty"`
}

type TierLimits struct {
	TokensPerHour     int `json:"tokensPerHour,omitempty"`
	RequestsPerMinute int `json:"requestsPerMinute,omitempty"`
}
