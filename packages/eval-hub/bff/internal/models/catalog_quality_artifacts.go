package models

import "encoding/json"

// CatalogQualityArtifact represents a model-catalog evaluation-metrics artifact.
type CatalogQualityArtifact struct {
	ArtifactType             string           `json:"artifactType"`
	ID                       *string          `json:"id,omitempty"`
	Name                     *string          `json:"name,omitempty"`
	ExternalID               *string          `json:"externalId,omitempty"`
	MetricsType              *string          `json:"metricsType,omitempty"`
	URI                      *string          `json:"uri,omitempty"`
	CreateTimeSinceEpoch     *string          `json:"createTimeSinceEpoch,omitempty"`
	LastUpdateTimeSinceEpoch *string          `json:"lastUpdateTimeSinceEpoch,omitempty"`
	CustomProperties         *json.RawMessage `json:"customProperties,omitempty"`
}

type CatalogQualityArtifactList struct {
	NextPageToken string                   `json:"nextPageToken"`
	PageSize      int32                    `json:"pageSize"`
	Size          int32                    `json:"size"`
	Items         []CatalogQualityArtifact `json:"items"`
}

type CatalogQualityArtifactListEnvelope struct {
	Data *CatalogQualityArtifactList `json:"data"`
}
