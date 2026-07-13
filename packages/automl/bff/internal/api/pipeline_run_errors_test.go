package api

import (
	"testing"

	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
	"github.com/stretchr/testify/assert"
)

func TestFormatPipelineServerCreateRunError_WorkflowRuntimeManifest(t *testing.T) {
	t.Parallel()

	message := formatPipelineServerCreateRunError(&ps.HTTPError{
		StatusCode: 500,
		Message:    `Failed to store run: Error 1366: Incorrect string value for column 'WorkflowRuntimeManifest'`,
	})
	assert.Contains(t, message, "utf8mb4")
}

func TestFormatPipelineServerCreateRunError_TruncatesLongMessage(t *testing.T) {
	t.Parallel()

	longMsg := string(make([]byte, 700))
	for i := range longMsg {
		longMsg = longMsg[:i] + "a" + longMsg[i+1:]
	}

	message := formatPipelineServerCreateRunError(&ps.HTTPError{
		StatusCode: 500,
		Message:    longMsg,
	})
	assert.LessOrEqual(t, len(message), 560)
}
