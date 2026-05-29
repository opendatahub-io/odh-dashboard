package pipelines

import (
	"bytes"
	"embed"
)

//go:embed */pipeline.yaml
var pipelineFS embed.FS

const DefaultAutoRAGImage = "registry.redhat.io/rhoai/odh-autorag-rhel9@sha256:a10e28c36726add59cce2e59435c57bab22795baf979bdc531fd7b40f06cc9d6"

// GetPipelineYAML returns the embedded pipeline YAML for the given pipeline name.
// The name corresponds to a directory under internal/pipelines/ (e.g. "documents_rag_optimization_pipeline").
func GetPipelineYAML(pipelineName string) ([]byte, error) {
	return pipelineFS.ReadFile(pipelineName + "/pipeline.yaml")
}

// ReplaceImages substitutes image references in pipeline YAML bytes.
// Each key in overrides is an old image string to find, and the value is the replacement.
func ReplaceImages(yamlBytes []byte, overrides map[string]string) []byte {
	for oldImage, newImage := range overrides {
		yamlBytes = bytes.ReplaceAll(yamlBytes, []byte(oldImage), []byte(newImage))
	}
	return yamlBytes
}
