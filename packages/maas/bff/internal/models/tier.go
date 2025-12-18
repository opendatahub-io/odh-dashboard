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
	TokensPerUnit   []RateLimit `json:"tokensPerUnit,omitempty"`
	RequestsPerUnit []RateLimit `json:"requestsPerUnit,omitempty"`
}

type RateLimit struct {
	Count int    `json:"count,omitempty"`
	Time  int    `json:"time,omitempty"`
	Unit  string `json:"unit,omitempty"`
}
