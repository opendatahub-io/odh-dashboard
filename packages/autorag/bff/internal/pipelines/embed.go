package pipelines

import (
	"embed"
	"regexp"
)

//go:embed */pipeline.yaml
var pipelineFS embed.FS

// AutoRAGImagePattern matches the autorag pipeline runtime image from either registry.
var AutoRAGImagePattern = regexp.MustCompile(`(?:registry\.redhat\.io/rhoai/odh-autorag-rhel9@sha256:[0-9a-f]{64}|quay\.io/opendatahub/odh-autorag:[a-zA-Z0-9._-]+)`)

// GetPipelineYAML returns the embedded pipeline YAML for the given pipeline name.
// The name corresponds to a directory under internal/pipelines/ (e.g. "documents_rag_optimization_pipeline").
func GetPipelineYAML(pipelineName string) ([]byte, error) {
	return pipelineFS.ReadFile(pipelineName + "/pipeline.yaml")
}

// ReplaceImageRef replaces all image references matching pattern with newImage.
func ReplaceImageRef(yamlBytes []byte, pattern *regexp.Regexp, newImage string) []byte {
	return pattern.ReplaceAll(yamlBytes, []byte(newImage))
}
