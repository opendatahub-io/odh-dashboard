package models

type TiersList []Tier

type Tier struct {
	Name        string     `json:"name,omitempty"`
	DisplayName string     `json:"displayName,omitempty"`
	Description string     `json:"description,omitempty"`
	Level       int        `json:"level"`
	Groups      []string   `json:"groups,omitempty"`
	Models      []string   `json:"models,omitempty"`
	Limits      TierLimits `json:"limits,omitempty"`
}

type TierLimits struct {
	TokensPerUnit   []RateLimit `json:"tokensPerUnit,omitempty"`
	RequestsPerUnit []RateLimit `json:"requestsPerUnit,omitempty"`
}

type RateLimit struct {
	Count int64       `json:"count,omitempty"`
	Time  int64       `json:"time,omitempty"`
	Unit  Gep2257Unit `json:"unit,omitempty"`
}

type Gep2257Unit string

const (
	GEP_2257_HOUR        Gep2257Unit = "hour"
	GEP_2257_MINUTE      Gep2257Unit = "minute"
	GEP_2257_SECOND      Gep2257Unit = "second"
	GEP_2257_MILLISECOND Gep2257Unit = "millisecond"
)
