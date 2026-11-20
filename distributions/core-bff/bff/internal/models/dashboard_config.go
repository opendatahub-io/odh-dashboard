package models

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// DashboardConfigGVR is the GroupVersionResource for OdhDashboardConfig CRDs.
var DashboardConfigGVR = schema.GroupVersionResource{
	Group:    "opendatahub.io",
	Version:  "v1alpha",
	Resource: "odhdashboardconfigs",
}

// DashboardConfig represents the OdhDashboardConfig custom resource.
type DashboardConfig struct {
	APIVersion string              `json:"apiVersion"`
	Kind       string              `json:"kind"`
	Metadata   metav1.ObjectMeta   `json:"metadata"`
	Spec       DashboardConfigSpec `json:"spec"`
}

// DashboardConfigSpec is the spec field of an OdhDashboardConfig resource.
type DashboardConfigSpec struct {
	DashboardConfig      DashboardFeatureFlags `json:"dashboardConfig"`
	NotebookController   *NotebookController   `json:"notebookController,omitempty"`
	NotebookSizes        []map[string]any      `json:"notebookSizes,omitempty"`
	ModelServerSizes     []map[string]any      `json:"modelServerSizes,omitempty"`
	TemplateOrder        []string              `json:"templateOrder,omitempty"`
	TemplateDisablement  []string              `json:"templateDisablement,omitempty"`
	HardwareProfileOrder []string              `json:"hardwareProfileOrder,omitempty"`
	ModelServing         *ModelServingConfig   `json:"modelServing,omitempty"`
	GenAiStudioConfig    *GenAiStudioConfig    `json:"genAiStudioConfig,omitempty"`
}

// DashboardFeatureFlags contains all boolean feature flags for the dashboard.
type DashboardFeatureFlags struct {
	Enablement                   bool `json:"enablement"`
	DisableInfo                  bool `json:"disableInfo"`
	DisableSupport               bool `json:"disableSupport"`
	DisableClusterManager        bool `json:"disableClusterManager"`
	DisableTracking              bool `json:"disableTracking"`
	DisableBYONImageStream       bool `json:"disableBYONImageStream"`
	DisableISVBadges             bool `json:"disableISVBadges"`
	DisableAppLauncher           bool `json:"disableAppLauncher"`
	DisableUserManagement        bool `json:"disableUserManagement"`
	DisableHome                  bool `json:"disableHome"`
	DisableProjects              bool `json:"disableProjects"`
	DisableModelServing          bool `json:"disableModelServing"`
	DisableProjectScoped         bool `json:"disableProjectScoped"`
	DisableProjectSharing        bool `json:"disableProjectSharing"`
	DisableCustomServingRuntimes bool `json:"disableCustomServingRuntimes"`
	DisableTrustyBiasMetrics     bool `json:"disableTrustyBiasMetrics"`
	DisablePerformanceMetrics    bool `json:"disablePerformanceMetrics"`
	DisablePipelines             bool `json:"disablePipelines"`
	DisableKServe                bool `json:"disableKServe"`
	DisableKServeAuth            bool `json:"disableKServeAuth"`
	DisableKServeMetrics         bool `json:"disableKServeMetrics"`
	DisableKServeRaw             bool `json:"disableKServeRaw"`
	DisableDistributedWorkloads  bool `json:"disableDistributedWorkloads"`
	DisableModelCatalog          bool `json:"disableModelCatalog"`
	DisableModelRegistry         bool `json:"disableModelRegistry"`
	DisableModelRegistrySecureDB bool `json:"disableModelRegistrySecureDB"`
	DisableServingRuntimeParams  bool `json:"disableServingRuntimeParams"`
	DisableStorageClasses        bool `json:"disableStorageClasses"`
	DisableNIMModelServing       bool `json:"disableNIMModelServing"`
	DisableAdminConnectionTypes  bool `json:"disableAdminConnectionTypes"`
	DisableFeatureStore          bool `json:"disableFeatureStore"`
	FeatureStoreAdmin            bool `json:"featureStoreAdmin"`
	DataRegistry                 bool `json:"dataRegistry"`
	DataConnectHub               bool `json:"dataConnectHub"`
	GenAiStudio                  bool `json:"genAiStudio"`
	GenAiTracing                 bool `json:"genAiTracing"`
	Guardrails                   bool `json:"guardrails"`
	AiSafety                     bool `json:"aiSafety"`
	Automl                       bool `json:"automl"`
	Autorag                      bool `json:"autorag"`
	ModelAsService               bool `json:"modelAsService"`
	MySubscriptions              bool `json:"mySubscriptions"`
	InferencePriorityField       bool `json:"inferencePriorityField"`
	AiAssetCustomEndpoints       bool `json:"aiAssetCustomEndpoints"`
	DisableFineTuning            bool `json:"disableFineTuning"`
	DisableKueue                 bool `json:"disableKueue"`
	DisableLMEval                bool `json:"disableLMEval"`
	Mlflow                       bool `json:"mlflow"`
	WorkbenchesV2                bool `json:"workbenchesV2"`
	McpCatalog                   bool `json:"mcpCatalog"`
	McpRegistry                  bool `json:"mcpRegistry"`
	SkillRegistry                bool `json:"skillRegistry"`
	GenAiMcpRegistryServers      bool `json:"genAiMcpRegistryServers"`
	AgentOps                     bool `json:"agentOps"`
	AgentOpsDeploy               bool `json:"agentOpsDeploy"`
	AgentsCatalog                bool `json:"agentsCatalog"`
	ToolCalling                  bool `json:"toolCalling"`
	TrainingJobs                 bool `json:"trainingJobs"`
	DisableLLMd                  bool `json:"disableLLMd"`
	LlmdTemplates                bool `json:"llmdTemplates"`
	ProjectRBAC                  bool `json:"projectRBAC"`
	RoleManagement               bool `json:"roleManagement"`
	DeploymentWizardYAMLViewer   bool `json:"deploymentWizardYAMLViewer"`
	ExternalVectorStores         bool `json:"externalVectorStores"`
	AgentConfigManagement        bool `json:"agentConfigManagement"`
	GenAiAgentDeployment         bool `json:"genAiAgentDeployment"`
	GenAiImageUpload             bool `json:"genAiImageUpload"`
	GenAiAudioUpload             bool `json:"genAiAudioUpload"`
	VLLMDeploymentOnMaaS         bool `json:"vLLMDeploymentOnMaaS"`
	LlmGatewayField              bool `json:"llmGatewayField"`
	PromptManagement             bool `json:"promptManagement"`
	GlobalProjectPrompts         bool `json:"globalProjectPrompts"`
	HardwareProfileDRA           bool `json:"hardwareProfileDRA"`
	Gpuaas                       bool `json:"gpuaas"`
	ModelCapabilities            bool `json:"modelCapabilities"`
	ObservabilityDashboard       bool `json:"observabilityDashboard"`
	NimWizard                    bool `json:"nimWizard"`
	NimServiceOperator           bool `json:"nimServiceOperator"`
}

type NotebookController struct {
	Enabled          bool    `json:"enabled"`
	PVCSize          *string `json:"pvcSize,omitempty"`
	StorageClassName *string `json:"storageClassName,omitempty"`
}

type ModelServingConfig struct {
	DeploymentStrategy *string `json:"deploymentStrategy,omitempty"`
	IsLLMdDefault      *bool   `json:"isLLMdDefault,omitempty"`
}

type GenAiStudioConfig struct {
	AiAssetCustomEndpoints *AiAssetCustomEndpointsConfig `json:"aiAssetCustomEndpoints,omitempty"`
}

type AiAssetCustomEndpointsConfig struct {
	ExternalProviders bool     `json:"externalProviders"`
	ClusterDomains    []string `json:"clusterDomains"`
}

// BlankDashboardCR provides defaults for all feature flags.
// Must match backend/src/utils/constants.ts blankDashboardCR exactly.
var BlankDashboardCR = DashboardConfig{
	APIVersion: "opendatahub.io/v1alpha",
	Kind:       "OdhDashboardConfig",
	Metadata: metav1.ObjectMeta{
		Name: "odh-dashboard-config",
		Labels: map[string]string{
			"opendatahub.io/dashboard": "true",
		},
	},
	Spec: DashboardConfigSpec{
		DashboardConfig: DashboardFeatureFlags{
			Enablement:                   true,
			DisableInfo:                  false,
			DisableSupport:               false,
			DisableClusterManager:        false,
			DisableTracking:              true,
			DisableBYONImageStream:       false,
			DisableISVBadges:             false,
			DisableAppLauncher:           false,
			DisableUserManagement:        false,
			DisableHome:                  false,
			DisableProjects:              false,
			DisableModelServing:          false,
			DisableProjectScoped:         false,
			DisableProjectSharing:        false,
			DisableCustomServingRuntimes: false,
			DisableTrustyBiasMetrics:     false,
			DisablePerformanceMetrics:    false,
			DisablePipelines:             false,
			DisableKServe:                false,
			DisableKServeAuth:            false,
			DisableKServeMetrics:         false,
			DisableKServeRaw:             false,
			DisableDistributedWorkloads:  false,
			DisableModelCatalog:          false,
			DisableModelRegistry:         false,
			DisableModelRegistrySecureDB: false,
			DisableServingRuntimeParams:  false,
			DisableStorageClasses:        false,
			DisableNIMModelServing:       false,
			DisableAdminConnectionTypes:  false,
			DisableFeatureStore:          false,
			FeatureStoreAdmin:            false,
			DataRegistry:                 false,
			DataConnectHub:               false,
			GenAiStudio:                  true,
			GenAiTracing:                 false,
			Guardrails:                   false,
			AiSafety:                     false,
			Automl:                       true,
			Autorag:                      true,
			ModelAsService:               true,
			MySubscriptions:              false,
			InferencePriorityField:       false,
			AiAssetCustomEndpoints:       false,
			DisableFineTuning:            true,
			DisableKueue:                 true,
			DisableLMEval:                true,
			Mlflow:                       true,
			WorkbenchesV2:                false,
			McpCatalog:                   false,
			McpRegistry:                  false,
			SkillRegistry:                false,
			GenAiMcpRegistryServers:      false,
			AgentOps:                     false,
			AgentOpsDeploy:               false,
			AgentsCatalog:                false,
			ToolCalling:                  false,
			TrainingJobs:                 true,
			DisableLLMd:                  false,
			LlmdTemplates:                false,
			ProjectRBAC:                  true,
			RoleManagement:               true,
			DeploymentWizardYAMLViewer:   false,
			ExternalVectorStores:         false,
			AgentConfigManagement:        false,
			GenAiAgentDeployment:         false,
			GenAiImageUpload:             false,
			GenAiAudioUpload:             false,
			VLLMDeploymentOnMaaS:         false,
			LlmGatewayField:              true,
			PromptManagement:             true,
			GlobalProjectPrompts:         false,
			HardwareProfileDRA:           false,
			Gpuaas:                       true,
			ModelCapabilities:            false,
			ObservabilityDashboard:       true,
			NimWizard:                    true,
			NimServiceOperator:           false,
		},
		NotebookController: &NotebookController{
			Enabled: true,
		},
		TemplateOrder: []string{},
		GenAiStudioConfig: &GenAiStudioConfig{
			AiAssetCustomEndpoints: &AiAssetCustomEndpointsConfig{
				ExternalProviders: false,
				ClusterDomains:    []string{},
			},
		},
	},
}
