package constants

const (
	Version = "1.0.0"

	PathPrefix    = "/gen-ai"
	ApiPathPrefix = "/api/v1"

	// API endpoint paths
	HealthCheckPath = "/healthcheck"
	OpenAPIPath     = PathPrefix + "/openapi"
	OpenAPIJSONPath = PathPrefix + "/openapi.json"
	OpenAPIYAMLPath = PathPrefix + "/openapi.yaml"
	SwaggerUIPath   = PathPrefix + "/swagger-ui"

	// LlamaStack Distribution (LSD) endpoints
	ModelsListPath                    = ApiPathPrefix + "/lsd/models"
	VectorStoresListPath              = ApiPathPrefix + "/lsd/vectorstores"
	VectorStoresDeletePath            = ApiPathPrefix + "/lsd/vectorstores/delete"
	ResponsesPath                     = ApiPathPrefix + "/lsd/responses"
	FilesListPath                     = ApiPathPrefix + "/lsd/files"
	FilesUploadPath                   = ApiPathPrefix + "/lsd/files/upload"
	FilesUploadStatusPath             = ApiPathPrefix + "/lsd/files/upload/status"
	FilesDeletePath                   = ApiPathPrefix + "/lsd/files/delete"
	VectorStoreFilesListPath          = ApiPathPrefix + "/lsd/vectorstores/files"
	VectorStoreFilesUploadPath        = ApiPathPrefix + "/lsd/vectorstores/files/upload"
	VectorStoreFilesDeletePath        = ApiPathPrefix + "/lsd/vectorstores/files/delete"
	LlamaStackDistributionStatusPath  = ApiPathPrefix + "/lsd/status"
	LlamaStackDistributionInstallPath = ApiPathPrefix + "/lsd/install"
	LlamaStackDistributionDeletePath  = ApiPathPrefix + "/lsd/delete"

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

	// External vector stores endpoint
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

	// LSD Safety endpoint - returns configured guardrail models and shields
	// Parsed from llama-stack-config ConfigMap
	LSDSafetyPath = ApiPathPrefix + "/lsd/safety"
)
