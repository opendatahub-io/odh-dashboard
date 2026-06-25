package models

import "encoding/json"

// CatalogArtifact represents a single artifact returned by the model-catalog BFF.
// Uses json.RawMessage for customProperties to avoid importing the model-registry
// openapi package; the eval-hub frontend can decode these as needed.
type CatalogArtifact struct {
	ArtifactType             string           `json:"artifactType"`
	MetricsType              *string          `json:"metricsType,omitempty"`
	URI                      *string          `json:"uri,omitempty"`
	CreateTimeSinceEpoch     *string          `json:"createTimeSinceEpoch,omitempty"`
	LastUpdateTimeSinceEpoch *string          `json:"lastUpdateTimeSinceEpoch,omitempty"`
	CustomProperties         *json.RawMessage `json:"customProperties,omitempty"`
}

// CatalogModelArtifactList matches the model-catalog BFF paginated response.
type CatalogModelArtifactList struct {
	NextPageToken string            `json:"nextPageToken"`
	PageSize      int32             `json:"pageSize"`
	Size          int32             `json:"size"`
	Items         []CatalogArtifact `json:"items"`
}

// CatalogModelArtifactListEnvelope is the top-level JSON envelope:
// {"data": {CatalogModelArtifactList}}
type CatalogModelArtifactListEnvelope struct {
	Data *CatalogModelArtifactList `json:"data"`
}
