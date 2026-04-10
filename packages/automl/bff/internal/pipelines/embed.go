package pipelines

import "embed"

//go:embed */pipeline.yaml
var pipelineFS embed.FS

// GetPipelineYAML returns the embedded pipeline YAML for the given pipeline name.
// The name corresponds to a directory under internal/pipelines/ (e.g. "autogluon_tabular_training_pipeline").
func GetPipelineYAML(pipelineName string) ([]byte, error) {
	return pipelineFS.ReadFile(pipelineName + "/pipeline.yaml")
}
