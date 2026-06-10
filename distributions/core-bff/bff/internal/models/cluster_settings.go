package models

// ModelServingPlatformEnabled indicates which model serving platforms are enabled.
type ModelServingPlatformEnabled struct {
	KServe bool `json:"kServe"`
	LLMd   bool `json:"LLMd"`
}

// ClusterSettings holds admin-configurable cluster settings derived from DashboardConfig and ConfigMaps.
type ClusterSettings struct {
	PVCSize                         int                         `json:"pvcSize"`
	CullerTimeout                   int                         `json:"cullerTimeout"`
	UserTrackingEnabled             bool                        `json:"userTrackingEnabled"`
	ModelServingPlatformEnabled     ModelServingPlatformEnabled `json:"modelServingPlatformEnabled"`
	IsDistributedInferencingDefault *bool                       `json:"isDistributedInferencingDefault,omitempty"`
	DefaultDeploymentStrategy       string                      `json:"defaultDeploymentStrategy,omitempty"`
}

// DefaultClusterSettings provides sensible defaults when no CRD or ConfigMap values are available.
var DefaultClusterSettings = ClusterSettings{
	PVCSize:                         20,
	CullerTimeout:                   31536000,
	UserTrackingEnabled:             false,
	IsDistributedInferencingDefault: boolPtr(true),
	ModelServingPlatformEnabled: ModelServingPlatformEnabled{
		KServe: true,
		LLMd:   true,
	},
}

func boolPtr(b bool) *bool { return &b }
