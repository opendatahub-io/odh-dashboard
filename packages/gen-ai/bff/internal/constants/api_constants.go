package constants

import "time"

const (
	Version = "1.0.0"

	// SSEHeartbeatInterval is the interval between SSE keep-alive comments.
	// OpenShift's HAProxy router closes idle connections after 30s by default;
	// sending a heartbeat every 15s keeps the connection alive through proxies
	// during slow inference (CPU models, tool calls, vector DB retrieval).
	SSEHeartbeatInterval = 15 * time.Second

	PathPrefix    = "/gen-ai"
	ApiPathPrefix = "/api/v1"

	// API endpoint paths
	HealthCheckPath = "/healthcheck"
	OpenAPIPath     = PathPrefix + "/openapi"
	OpenAPIJSONPath = PathPrefix + "/openapi.json"
	OpenAPIYAMLPath = PathPrefix + "/openapi.yaml"
	SwaggerUIPath   = PathPrefix + "/swagger-ui"

	// OGX Server CR-backed endpoints (URL paths remain /lsd/... for frontend compatibility)
	ModelsListPath             = ApiPathPrefix + "/lsd/models"
	VectorStoresListPath       = ApiPathPrefix + "/lsd/vectorstores"
	VectorStoresDeletePath     = ApiPathPrefix + "/lsd/vectorstores/delete"
	ResponsesPath              = ApiPathPrefix + "/lsd/responses"
	ResponsesPassthroughPath   = ApiPathPrefix + "/lsd/responses/passthrough"
	FilesListPath              = ApiPathPrefix + "/lsd/files"
	FilesUploadPath            = ApiPathPrefix + "/lsd/files/upload"
	FilesUploadStatusPath      = ApiPathPrefix + "/lsd/files/upload/status"
	FilesDeletePath            = ApiPathPrefix + "/lsd/files/delete"
	MediaFilesUploadPath       = ApiPathPrefix + "/lsd/files/media"
	AudioTranscriptionsPath    = ApiPathPrefix + "/lsd/audio/transcriptions"
	VectorStoreFilesListPath   = ApiPathPrefix + "/lsd/vectorstores/files"
	VectorStoreFilesUploadPath = ApiPathPrefix + "/lsd/vectorstores/files/upload"
	VectorStoreFilesDeletePath = ApiPathPrefix + "/lsd/vectorstores/files/delete"
	OGXServerStatusPath        = ApiPathPrefix + "/lsd/status"
	OGXServerInstallPath       = ApiPathPrefix + "/lsd/install"
	OGXServerDeletePath        = ApiPathPrefix + "/lsd/delete"

	// General endpoints
	CodeExporterPath = ApiPathPrefix + "/code-exporter"
	NamespacesPath   = ApiPathPrefix + "/namespaces"
	UserPath         = ApiPathPrefix + "/user"
	ConfigPath       = ApiPathPrefix + "/config"

	// MCP (Model Context Protocol) endpoint paths
	MCPToolsPath  = ApiPathPrefix + "/mcp/tools"
	MCPStatusPath = ApiPathPrefix + "/mcp/status"

	// AI Assets (AAA) endpoints
	MCPServersListPath = ApiPathPrefix + "/aaa/mcps"
	ModelsAAPath       = ApiPathPrefix + "/aaa/models"
	VectorStoresAAPath = ApiPathPrefix + "/aaa/vectorstores"

	// External endpoints
	ExternalModelsPath       = ApiPathPrefix + "/models/external"
	VerifyExternalModelPath  = ApiPathPrefix + "/models/external/verify"
	ExternalVectorStoresPath = ApiPathPrefix + "/vectorstores/external"

	// Model as a Service (MaaS) endpoints - direct MaaS controller calls
	MaaSModelsPath = ApiPathPrefix + "/maas/models"
	MaaSTokensPath = ApiPathPrefix + "/maas/tokens"

	// Inter-BFF Communication endpoints - calls to other BFF services
	// These use the BFF client for inter-service communication
	BFFMaaSTokensPath = ApiPathPrefix + "/bff/maas/tokens"

	// MLflow endpoints
	MLflowPromptsPath        = ApiPathPrefix + "/mlflow/prompts"
	MLflowPromptPath         = ApiPathPrefix + "/mlflow/prompts/:name"
	MLflowPromptVersionsPath = ApiPathPrefix + "/mlflow/prompts/:name/versions"
	MLflowPromptVersionPath  = ApiPathPrefix + "/mlflow/prompts/:name/versions/:version"

	GuardrailsStatusPath = ApiPathPrefix + "/guardrails/status"

	// NemoGuardrails endpoints
	NemoGuardrailsInitPath   = ApiPathPrefix + "/nemo-guardrails/init"
	NemoGuardrailsStatusPath = ApiPathPrefix + "/nemo-guardrails/status"

	// Agent Profiles endpoints
	AgentProfilesPath  = ApiPathPrefix + "/agent-profiles"
	AgentProfileIDPath = ApiPathPrefix + "/agent-profiles/:id"
)
