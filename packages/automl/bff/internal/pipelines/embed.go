package pipelines

import (
	"embed"
	"regexp"
)

//go:embed */pipeline.yaml
var pipelineFS embed.FS

// AutoMLImagePattern matches the automl pipeline runtime image with any sha256 digest.
var AutoMLImagePattern = regexp.MustCompile(`registry\.redhat\.io/rhoai/odh-automl-rhel9@sha256:[0-9a-f]{64}`)

// GetPipelineYAML returns the embedded pipeline YAML for the given pipeline name.
// The name corresponds to a directory under internal/pipelines/ (e.g. "autogluon_tabular_training_pipeline").
func GetPipelineYAML(pipelineName string) ([]byte, error) {
	return pipelineFS.ReadFile(pipelineName + "/pipeline.yaml")
}

// ReplaceImageRef replaces all image references matching pattern with newImage.
func ReplaceImageRef(yamlBytes []byte, pattern *regexp.Regexp, newImage string) []byte {
	return pattern.ReplaceAll(yamlBytes, []byte(newImage))
}
