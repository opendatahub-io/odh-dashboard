package evalhub

import (
	"fmt"
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWrapClientError_Nil(t *testing.T) {
	assert.Nil(t, wrapClientError(nil, "test"))
}

func TestWrapClientError_URLError(t *testing.T) {
	err := &url.Error{Op: "Get", URL: "http://localhost:1", Err: fmt.Errorf("connection refused")}
	result := wrapClientError(err, "HealthCheck")

	require.NotNil(t, result)
	assert.Equal(t, ErrCodeConnectionFailed, result.Code)
	assert.Equal(t, 502, result.StatusCode)
	assert.Contains(t, result.Message, "HealthCheck")
	assert.Contains(t, result.Message, "connection refused")
}

func TestWrapClientError_BadRequest(t *testing.T) {
	err := &httpError{StatusCode: 400, Body: "bad request body"}
	result := wrapClientError(err, "ListEvaluationJobs")

	require.NotNil(t, result)
	assert.Equal(t, ErrCodeInvalidRequest, result.Code)
	assert.Equal(t, 400, result.StatusCode)
}

func TestWrapClientError_Unauthorized(t *testing.T) {
	err := &httpError{StatusCode: 401, Body: "invalid token"}
	result := wrapClientError(err, "ListEvaluationJobs")

	require.NotNil(t, result)
	assert.Equal(t, ErrCodeUnauthorized, result.Code)
	assert.Equal(t, 401, result.StatusCode)
}

func TestWrapClientError_NotFound(t *testing.T) {
	err := &httpError{StatusCode: 404, Body: "not found"}
	result := wrapClientError(err, "ListEvaluationJobs")

	require.NotNil(t, result)
	assert.Equal(t, ErrCodeNotFound, result.Code)
}

func TestWrapClientError_ServiceUnavailable(t *testing.T) {
	err := &httpError{StatusCode: 503, Body: "unavailable"}
	result := wrapClientError(err, "HealthCheck")

	require.NotNil(t, result)
	assert.Equal(t, ErrCodeServerUnavailable, result.Code)
	assert.Equal(t, 503, result.StatusCode)
}

func TestWrapClientError_UnknownError(t *testing.T) {
	err := fmt.Errorf("something completely unexpected")
	result := wrapClientError(err, "HealthCheck")

	require.NotNil(t, result)
	assert.Equal(t, ErrCodeInternalError, result.Code)
	assert.Contains(t, result.Message, "unexpected error")
}

func TestEvalHubError_ErrorString(t *testing.T) {
	err := NewEvalHubError(ErrCodeConnectionFailed, "cannot connect", 502)
	assert.Equal(t, "EvalHub error [CONNECTION_FAILED]: cannot connect", err.Error())
}
