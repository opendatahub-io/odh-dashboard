package pipelines

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
)

type pipelineInputDefinitions struct {
	Parameters map[string]json.RawMessage `json:"parameters"`
}

type pipelineSpecDocument struct {
	Root *struct {
		InputDefinitions *pipelineInputDefinitions `json:"inputDefinitions"`
	} `json:"root"`
	PipelineSpec json.RawMessage `json:"pipeline_spec"`
}

func extractPipelineInputParameters(raw json.RawMessage) ([]string, error) {
	if len(bytes.TrimSpace(raw)) == 0 {
		return nil, errors.New("pipeline spec is empty")
	}

	var document pipelineSpecDocument
	if err := json.Unmarshal(raw, &document); err != nil {
		return nil, fmt.Errorf("failed to decode pipeline spec: %w", err)
	}

	if document.Root != nil && document.Root.InputDefinitions != nil {
		if len(document.Root.InputDefinitions.Parameters) == 0 {
			return nil, errors.New("pipeline spec declares no root input parameters")
		}

		parameters := make([]string, 0, len(document.Root.InputDefinitions.Parameters))
		for name := range document.Root.InputDefinitions.Parameters {
			if name == "" {
				return nil, errors.New("pipeline spec contains a blank root input parameter name")
			}
			parameters = append(parameters, name)
		}
		sort.Strings(parameters)
		return parameters, nil
	}

	if len(bytes.TrimSpace(document.PipelineSpec)) > 0 {
		return extractPipelineInputParameters(document.PipelineSpec)
	}

	return nil, errors.New("pipeline spec does not define root input parameters")
}
