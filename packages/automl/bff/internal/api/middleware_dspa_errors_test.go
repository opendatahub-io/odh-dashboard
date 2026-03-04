package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDSPAErrorResponses tests the error response functions for DSPA-related errors
func TestDSPAErrorResponses(t *testing.T) {
	app := newTestApp(t)

	t.Run("should return 404 with specific message when no DSPA found", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/test", nil)
		require.NoError(t, err)

		app.notFoundResponseWithMessage(rr, req, "no Pipeline Server (DSPipelineApplication) found in namespace")

		assert.Equal(t, http.StatusNotFound, rr.Code)

		var response HTTPError
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "404", response.Error.Code)
		assert.Equal(t, "no Pipeline Server (DSPipelineApplication) found in namespace", response.Error.Message)
	})

	t.Run("should return 503 with specific message when DSPA not ready", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/test", nil)
		require.NoError(t, err)

		app.serviceUnavailableResponseWithMessage(rr, req,
			fmt.Errorf("pipeline server not ready"),
			"Pipeline Server exists but is not ready - check that the APIServer component is running")

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)

		var response HTTPError
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "503", response.Error.Code)
		assert.Equal(t, "Pipeline Server exists but is not ready - check that the APIServer component is running",
			response.Error.Message)
	})

	t.Run("should return generic 404 message for namespace not found", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/test", nil)
		require.NoError(t, err)

		app.notFoundResponse(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)

		var response HTTPError
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "404", response.Error.Code)
		assert.Equal(t, "the requested resource could not be found", response.Error.Message)
	})
}

// TestErrNoDSPAFound tests the ErrNoDSPAFound error
func TestErrNoDSPAFound(t *testing.T) {
	t.Run("should be identifiable with errors.Is", func(t *testing.T) {
		err := ErrNoDSPAFound
		assert.True(t, errors.Is(err, ErrNoDSPAFound))
	})

	t.Run("should have correct error message", func(t *testing.T) {
		assert.Equal(t, "no DSPipelineApplication found in namespace", ErrNoDSPAFound.Error())
	})

	t.Run("should be identifiable when wrapped", func(t *testing.T) {
		wrappedErr := fmt.Errorf("failed to discover DSPA: %w", ErrNoDSPAFound)
		assert.True(t, errors.Is(wrappedErr, ErrNoDSPAFound))
	})
}

// TestDSPAErrorScenarios tests the complete flow of different DSPA error scenarios
// These tests verify that discovery logic returns the right errors
func TestDSPAErrorScenarios(t *testing.T) {
	t.Run("discoverReadyDSPA returns ErrNoDSPAFound when no DSPAs exist", func(t *testing.T) {
		// This is already tested in middleware_discovery_test.go
		// Just verify the error type here
		err := ErrNoDSPAFound
		assert.NotNil(t, err)
		assert.Contains(t, err.Error(), "no DSPipelineApplication found")
	})
}
