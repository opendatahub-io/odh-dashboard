package pipelines

import "embed"

//go:embed *.yaml
var pipelineFS embed.FS

// GetPipelineYAML returns the embedded pipeline YAML for the given filename.
func GetPipelineYAML(filename string) ([]byte, error) {
	return pipelineFS.ReadFile(filename)
}
