package models

import "encoding/json"

// CatalogSecurityArtifact represents a single security artifact returned by the model-catalog BFF.
// Uses json.RawMessage for customProperties to avoid importing the model-registry
// openapi package; the eval-hub frontend can decode these as needed.
type CatalogSecurityArtifact struct {
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

// CatalogSecurityArtifactList matches the model-catalog BFF paginated response.
type CatalogSecurityArtifactList struct {
	NextPageToken string                    `json:"nextPageToken"`
	PageSize      int32                     `json:"pageSize"`
	Size          int32                     `json:"size"`
	Items         []CatalogSecurityArtifact `json:"items"`
}

// CatalogSecurityArtifactListEnvelope is the top-level JSON envelope:
// {"data": {CatalogSecurityArtifactList}}
type CatalogSecurityArtifactListEnvelope struct {
	Data *CatalogSecurityArtifactList `json:"data"`
}
