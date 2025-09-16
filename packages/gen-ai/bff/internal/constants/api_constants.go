package constants

const (
	Version = "1.0.0"

	PathPrefix    = "/gen-ai"
	ApiPathPrefix = "/api/v1"

	// API endpoint paths
	HealthCheckPath                   = "/healthcheck"
	OpenAPIPath                       = PathPrefix + "/openapi"
	OpenAPIJSONPath                   = PathPrefix + "/openapi.json"
	OpenAPIYAMLPath                   = PathPrefix + "/openapi.yaml"
	SwaggerUIPath                     = PathPrefix + "/swagger-ui"
	ModelsListPath                    = ApiPathPrefix + "/models"
	ModelsAAPath                      = ApiPathPrefix + "/aa/models"
	VectorStoresListPath              = ApiPathPrefix + "/vectorstores"
	ResponsesPath                     = ApiPathPrefix + "/responses"
	FilesUploadPath                   = ApiPathPrefix + "/files/upload"
	CodeExporterPath                  = ApiPathPrefix + "/code-exporter"
	NamespacesPath                    = ApiPathPrefix + "/namespaces"
	LlamaStackDistributionStatusPath  = ApiPathPrefix + "/llamastack-distribution/status"
	LlamaStackDistributionInstallPath = ApiPathPrefix + "/llamastack-distribution/install"
	UserPath                          = ApiPathPrefix + "/user"

	// MCP (Model Context Protocol) endpoint paths
	MCPToolsPath       = ApiPathPrefix + "/mcp/tools"
	MCPStatusPath      = ApiPathPrefix + "/mcp/status"
	MCPServersListPath = ApiPathPrefix + "/aa/mcps"
)
