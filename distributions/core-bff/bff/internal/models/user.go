package models

// User represents an authenticated user with cluster admin status.
type User struct {
	UserID       string `json:"userId"`
	ClusterAdmin bool   `json:"clusterAdmin"`
}
