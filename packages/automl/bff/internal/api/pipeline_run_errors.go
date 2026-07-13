package api

import (
	"strings"

	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
)

const maxPipelineServerErrorMessageLen = 500

func formatPipelineServerCreateRunError(httpErr *ps.HTTPError) string {
	if httpErr == nil {
		return "pipeline server failed to create the run"
	}

	message := strings.TrimSpace(httpErr.Message)
	if message == "" {
		return "pipeline server failed to create the run"
	}

	if len(message) > maxPipelineServerErrorMessageLen {
		message = message[:maxPipelineServerErrorMessageLen] + "..."
	}

	if strings.Contains(message, "WorkflowRuntimeManifest") || strings.Contains(message, "Incorrect string value") {
		return "pipeline server failed to store the run because its database does not support non-ASCII parameter values; ask your administrator to configure Kubeflow Pipelines MySQL with utf8mb4"
	}

	return "pipeline server failed to create the run: " + message
}
