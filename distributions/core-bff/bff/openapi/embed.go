// Package openapi provides embedded OpenAPI spec serving and Swagger UI.
package openapi

import _ "embed"

// SpecYAML is the embedded OpenAPI specification in YAML format.
//
//go:embed src/core-bff.yaml
var SpecYAML []byte
