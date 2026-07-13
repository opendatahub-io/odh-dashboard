package api

import (
	"testing"

	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
	"github.com/stretchr/testify/assert"
)

func TestFormatPipelineServerCreateRunError(t *testing.T) {
	t.Parallel()

	const charsetMsg = "pipeline server failed to store the run because its database does not support non-ASCII parameter values; ask your administrator to configure Kubeflow Pipelines MySQL with utf8mb4"
	const genericMsg = "pipeline server failed to create the run"

	t.Run("nil error", func(t *testing.T) {
		t.Parallel()
		assert.Equal(t, genericMsg, formatPipelineServerCreateRunError(nil))
	})

	t.Run("empty message", func(t *testing.T) {
		t.Parallel()
		assert.Equal(t, genericMsg, formatPipelineServerCreateRunError(&ps.HTTPError{
			StatusCode: 500,
			Message:    "",
		}))
	})

	t.Run("WorkflowRuntimeManifest", func(t *testing.T) {
		t.Parallel()
		message := formatPipelineServerCreateRunError(&ps.HTTPError{
			StatusCode: 500,
			Message:    `Failed to store run: Error 1366: Incorrect string value for column 'WorkflowRuntimeManifest'`,
		})
		assert.Equal(t, charsetMsg, message)
	})

	t.Run("Incorrect string value without WorkflowRuntimeManifest", func(t *testing.T) {
		t.Parallel()
		message := formatPipelineServerCreateRunError(&ps.HTTPError{
			StatusCode: 500,
			Message:    `Error 1366: Incorrect string value: '\xE3\x81\x82' for column 'parameters' at row 1`,
		})
		assert.Equal(t, charsetMsg, message)
		assert.NotContains(t, message, "WorkflowRuntimeManifest")
	})

	t.Run("does not disclose unrecognized upstream error", func(t *testing.T) {
		t.Parallel()

		upstream := "internal database connection failed at host db.internal:3306"
		message := formatPipelineServerCreateRunError(&ps.HTTPError{
			StatusCode: 500,
			Message:    upstream,
		})
		assert.Equal(t, genericMsg, message)
		assert.NotContains(t, message, upstream)
	})
}
