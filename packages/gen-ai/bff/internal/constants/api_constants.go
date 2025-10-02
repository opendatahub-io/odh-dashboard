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

	// MCP (Model Context Protocol) endpoint paths
	MCPToolsPath  = ApiPathPrefix + "/mcp/tools"
	MCPStatusPath = ApiPathPrefix + "/mcp/status"

	// AI Assets (AAA) endpoints
	MCPServersListPath = ApiPathPrefix + "/aaa/mcps"
	ModelsAAPath       = ApiPathPrefix + "/aaa/models"

	// Model as a Service (MaaS) endpoints
	MaaSModelsPath = ApiPathPrefix + "/maas/models"
	MaaSTokensPath = ApiPathPrefix + "/maas/tokens"
)
