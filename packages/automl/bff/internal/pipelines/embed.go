package pipelines

import (
	"bytes"
	"embed"
)

//go:embed */pipeline.yaml
var pipelineFS embed.FS

const DefaultAutoMLImage = "registry.redhat.io/rhoai/odh-automl-rhel9@sha256:77d5222d8b4f10828bfeafb692de7348e28c711b45ca3f70854e407bf651a6fd"

// GetPipelineYAML returns the embedded pipeline YAML for the given pipeline name.
// The name corresponds to a directory under internal/pipelines/ (e.g. "autogluon_tabular_training_pipeline").
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
