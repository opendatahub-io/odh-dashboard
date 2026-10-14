package models

// OperatorSubscriptionStatus reports the installed data science operator subscription metadata.
type OperatorSubscriptionStatus struct {
	Channel     string `json:"channel"`
	LastUpdated string `json:"lastUpdated,omitempty"`
}
