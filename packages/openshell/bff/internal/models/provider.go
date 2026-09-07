package models

type Provider struct {
	Metadata ObjectMeta `json:"metadata"`
	Type     string     `json:"type"`
}
