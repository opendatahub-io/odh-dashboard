package models

// GroupsList represents a list of OpenShift Group names the user has access to.
type GroupsList struct {
	Groups []string `json:"groups"`
}
