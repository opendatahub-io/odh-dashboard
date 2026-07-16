package api

import "net/http"

const (
	OpenAPIPath     = PathPrefix + "/openapi"
	OpenAPIJSONPath = PathPrefix + "/openapi.json"
	OpenAPIYAMLPath = PathPrefix + "/openapi.yaml"
	SwaggerUIPath   = PathPrefix + "/swagger-ui"
)

// registerPublicOpenAPIRoutes registers OpenAPI spec and Swagger UI routes as
// public (no auth). Swagger UI and the redirect are only registered in dev mode.
func (app *App) registerPublicOpenAPIRoutes(mux *http.ServeMux) {
	mux.Handle(OpenAPIJSONPath, app.publicRouteFunc(app.openAPI.HandleOpenAPIJSONWrapper))
	mux.Handle(OpenAPIYAMLPath, app.publicRouteFunc(app.openAPI.HandleOpenAPIYAMLWrapper))
	if app.config.DevMode {
		mux.Handle(SwaggerUIPath, app.publicRouteFunc(app.openAPI.HandleSwaggerUIWrapper))
		mux.Handle(OpenAPIPath, app.publicRouteFunc(app.openAPI.HandleOpenAPIRedirectWrapper))
	}
}
