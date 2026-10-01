package models

import "github.com/kubeflow/hub/pkg/openapi"

type ServingRuntime struct {
	CustomProperties         *map[string]openapi.MetadataValue `json:"customProperties,omitempty"`
	Description              *string                           `json:"description,omitempty"`
	ExternalID               *string                           `json:"externalId,omitempty"`
	Name                     *string                           `json:"name,omitempty"`
	ID                       *string                           `json:"id,omitempty"`
	CreateTimeSinceEpoch     *string                           `json:"createTimeSinceEpoch,omitempty"`
	LastUpdateTimeSinceEpoch *string                           `json:"lastUpdateTimeSinceEpoch,omitempty"`
	DisplayName              *string                           `json:"displayName,omitempty"`
	SourceID                 *string                           `json:"sourceId,omitempty"`
	Provider                 *string                           `json:"provider,omitempty"`
	Readme                   *string                           `json:"readme,omitempty"`
	Logo                     *string                           `json:"logo,omitempty"`
	Tags                     []string                          `json:"tags,omitempty"`
	License                  *string                           `json:"license,omitempty"`
	LicenseLink              *string                           `json:"licenseLink,omitempty"`
	DocumentationURL         *string                           `json:"documentationUrl,omitempty"`
	RepositoryURL            *string                           `json:"repositoryUrl,omitempty"`
	SupportedModelFormats    []SupportedModelFormat            `json:"supportedModelFormats,omitempty"`
	Capabilities             *ServingRuntimeCapabilities       `json:"capabilities,omitempty"`
	VersionCount             *int32                            `json:"versionCount,omitempty"`
	PublishedDate            *string                           `json:"publishedDate,omitempty"`
	LastUpdated              *string                           `json:"lastUpdated,omitempty"`
}

type ServingRuntimeVersion struct {
	CustomProperties         *map[string]openapi.MetadataValue     `json:"customProperties,omitempty"`
	Description              *string                               `json:"description,omitempty"`
	ExternalID               *string                               `json:"externalId,omitempty"`
	Name                     *string                               `json:"name,omitempty"`
	ID                       *string                               `json:"id,omitempty"`
	CreateTimeSinceEpoch     *string                               `json:"createTimeSinceEpoch,omitempty"`
	LastUpdateTimeSinceEpoch *string                               `json:"lastUpdateTimeSinceEpoch,omitempty"`
	ArtifactType             string                                `json:"artifactType"`
	Version                  string                                `json:"version"`
	Image                    string                                `json:"image"`
	SupportLevel             *ServingRuntimeSupportLevel           `json:"supportLevel,omitempty"`
	SupportedModelFormats    []SupportedModelFormat                `json:"supportedModelFormats,omitempty"`
	ProtocolVersions         []string                              `json:"protocolVersions,omitempty"`
	RecommendedResources     *ServingRuntimeResourceRecommendation `json:"recommendedResources,omitempty"`
	DefaultArgs              []string                              `json:"defaultArgs,omitempty"`
	Env                      []ServingRuntimeEnvVar                `json:"env,omitempty"`
	Template                 *string                               `json:"template,omitempty"`
	Deprecated               *bool                                 `json:"deprecated,omitempty"`
	PublishedDate            *string                               `json:"publishedDate,omitempty"`
}

type SupportedModelFormat struct {
	Name       string  `json:"name"`
	Version    *string `json:"version,omitempty"`
	AutoSelect *bool   `json:"autoSelect,omitempty"`
	Priority   *int32  `json:"priority,omitempty"`
}

type ServingRuntimeSupportLevel string

const (
	ServingRuntimeSupportLevelSupported        ServingRuntimeSupportLevel = "supported"
	ServingRuntimeSupportLevelTechPreview      ServingRuntimeSupportLevel = "techPreview"
	ServingRuntimeSupportLevelDeveloperPreview ServingRuntimeSupportLevel = "developerPreview"
	ServingRuntimeSupportLevelCommunity        ServingRuntimeSupportLevel = "community"
)

type ServingRuntimeCapabilities struct {
	RequiresGPU           *bool    `json:"requiresGPU,omitempty"`
	SupportedAccelerators []string `json:"supportedAccelerators,omitempty"`
	MultiModel            *bool    `json:"multiModel,omitempty"`
}

type ServingRuntimeResourceRecommendation struct {
	Minimal     *ResourceTier `json:"minimal,omitempty"`
	Recommended *ResourceTier `json:"recommended,omitempty"`
	High        *ResourceTier `json:"high,omitempty"`
}

type ResourceTier struct {
	CPU         *string            `json:"cpu,omitempty"`
	Memory      *string            `json:"memory,omitempty"`
	Accelerator *map[string]string `json:"accelerator,omitempty"`
}

type ServingRuntimeEnvVar struct {
	Name         string  `json:"name"`
	Description  *string `json:"description,omitempty"`
	Required     *bool   `json:"required,omitempty"`
	DefaultValue *string `json:"defaultValue,omitempty"`
	Secret       *bool   `json:"secret,omitempty"`
}

type ServingRuntimeList struct {
	Items         []ServingRuntime `json:"items"`
	NextPageToken string           `json:"nextPageToken"`
	PageSize      int32            `json:"pageSize"`
	Size          int32            `json:"size"`
}

type ServingRuntimeVersionList struct {
	Items         []ServingRuntimeVersion `json:"items"`
	NextPageToken string                  `json:"nextPageToken"`
	PageSize      int32                   `json:"pageSize"`
	Size          int32                   `json:"size"`
}
