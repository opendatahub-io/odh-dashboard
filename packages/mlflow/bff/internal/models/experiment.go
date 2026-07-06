package models

import "time"

// Experiment represents an experiment from the MLflow tracking server.
type Experiment struct {
	ID               string            `json:"id"`
	Name             string            `json:"name"`
	ArtifactLocation string            `json:"artifactLocation,omitempty"`
	LifecycleStage   string            `json:"lifecycleStage,omitempty"`
	Tags             map[string]string `json:"tags,omitempty"`
	CreationTime     time.Time         `json:"creationTime"`
	LastUpdateTime   time.Time         `json:"lastUpdateTime"`
}

// ExperimentsResponse is the paginated response for listing MLflow experiments.
type ExperimentsResponse struct {
	Experiments   []Experiment `json:"experiments"`
	NextPageToken string       `json:"nextPageToken,omitempty"`
}
