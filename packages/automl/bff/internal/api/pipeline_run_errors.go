package api

import (
	"strings"

	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
)

const (
	genericPipelineServerCreateRunErrorMsg = "pipeline server failed to create the run"
	charsetPipelineServerCreateRunErrorMsg = "pipeline server failed to store the run because its database does not support non-ASCII parameter values; ask your administrator to configure Kubeflow Pipelines MySQL with utf8mb4"
)

func formatPipelineServerCreateRunError(httpErr *ps.HTTPError) string {
	if httpErr == nil {
		return genericPipelineServerCreateRunErrorMsg
	}

	message := strings.TrimSpace(httpErr.Message)
	if message == "" {
		return genericPipelineServerCreateRunErrorMsg
	}

	if strings.Contains(message, "WorkflowRuntimeManifest") || strings.Contains(message, "Incorrect string value") {
		return charsetPipelineServerCreateRunErrorMsg
	}

	return genericPipelineServerCreateRunErrorMsg
}
