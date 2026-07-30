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

	// "Incorrect string value" is MySQL's phrase for charset/collation rejection (e.g. utf8
	// vs utf8mb4). With upfront ASCII validation this branch should be rare/unreachable for
	// AutoML-created runs, but keep it for Pipelines UI / direct API creates that bypass us.
	if strings.Contains(message, "WorkflowRuntimeManifest") || strings.Contains(message, "Incorrect string value") {
		return charsetPipelineServerCreateRunErrorMsg
	}

	return genericPipelineServerCreateRunErrorMsg
}
