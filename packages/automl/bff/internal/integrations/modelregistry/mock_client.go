package modelregistry

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/kubeflow/model-registry/pkg/openapi"
)

// MockHTTPClient is a test double that returns predetermined responses for Model Registry API calls.
// It tracks the order of calls to verify the RegisterModel flow.
type MockHTTPClient struct {
	// PostResponses holds the JSON response bodies to return for each POST call (in order).
	// For RegisterModel: [RegisteredModel, ModelVersion, ModelArtifact]
	PostResponses [][]byte

	// PostCallCount tracks how many POST calls were made.
	PostCallCount int

	// LastPostURLs records the URLs passed to each POST call.
	LastPostURLs []string

	// LastPostBodies records the request bodies passed to each POST call.
	LastPostBodies []string

	// PostError, when set, causes POST to return this error instead of the mock response.
	PostError error
}

// GET implements HTTPClientInterface. Returns empty for tests that don't need GET.
func (m *MockHTTPClient) GET(_ context.Context, _ string) ([]byte, error) {
	return []byte("{}"), nil
}

// POST implements HTTPClientInterface.
func (m *MockHTTPClient) POST(_ context.Context, url string, body io.Reader) ([]byte, error) {
	m.PostCallCount++
	if m.PostError != nil {
		return nil, m.PostError
	}
	if m.LastPostURLs == nil {
		m.LastPostURLs = make([]string, 0)
	}
	if m.LastPostBodies == nil {
		m.LastPostBodies = make([]string, 0)
	}
	m.LastPostURLs = append(m.LastPostURLs, url)
	if body != nil {
		b, _ := io.ReadAll(body)
		m.LastPostBodies = append(m.LastPostBodies, string(b))
	} else {
		m.LastPostBodies = append(m.LastPostBodies, "")
	}

	idx := m.PostCallCount - 1
	if idx < len(m.PostResponses) {
		return m.PostResponses[idx], nil
	}
	return nil, fmt.Errorf("mock: no response configured for POST call %d", m.PostCallCount)
}

// PATCH implements HTTPClientInterface.
func (m *MockHTTPClient) PATCH(_ context.Context, _ string, _ io.Reader) ([]byte, error) {
	return nil, fmt.Errorf("mock: PATCH not implemented")
}

// NewSuccessMockClient returns a MockHTTPClient that succeeds for the full RegisterModel flow.
func NewSuccessMockClient(modelName, versionName, s3Path string) *MockHTTPClient {
	regModelID := "rm-123"
	versionID := "mv-456"
	artifactID := "ma-789"

	regModel := openapi.RegisteredModel{Id: &regModelID, Name: modelName}
	regModelJSON, _ := json.Marshal(regModel)

	modelVersion := openapi.ModelVersion{Id: &versionID, Name: versionName}
	modelVersionJSON, _ := json.Marshal(modelVersion)

	modelArtifact := openapi.ModelArtifact{Id: &artifactID, Name: &versionName, Uri: &s3Path}
	modelArtifactJSON, _ := json.Marshal(modelArtifact)

	return &MockHTTPClient{
		PostResponses: [][]byte{regModelJSON, modelVersionJSON, modelArtifactJSON},
	}
}

// NewFailingMockClient returns a MockHTTPClient that returns an HTTPError on the first POST.
func NewFailingMockClient(statusCode int, code, message string) *MockHTTPClient {
	return &MockHTTPClient{
		PostError: &HTTPError{
			StatusCode:    statusCode,
			ErrorResponse: ErrorResponse{Code: code, Message: message},
		},
	}
}

// AssertRegisterModelFlow verifies that the mock received the expected sequence of POST calls.
func (m *MockHTTPClient) AssertRegisterModelFlow(t interface {
	Errorf(format string, args ...interface{})
}, regModelName string) {
	if m.PostCallCount != 3 {
		t.Errorf("expected 3 POST calls, got %d", m.PostCallCount)
		return
	}
	if len(m.LastPostURLs) < 3 {
		return
	}
	if !strings.HasSuffix(m.LastPostURLs[0], "/registered_models") {
		t.Errorf("first POST should be to registered_models, got %s", m.LastPostURLs[0])
	}
	if !strings.Contains(m.LastPostURLs[1], "/versions") {
		t.Errorf("second POST should be to versions, got %s", m.LastPostURLs[1])
	}
	if !strings.Contains(m.LastPostURLs[2], "/artifacts") {
		t.Errorf("third POST should be to artifacts, got %s", m.LastPostURLs[2])
	}
	if len(m.LastPostBodies) > 0 {
		var firstBody map[string]interface{}
		_ = json.Unmarshal([]byte(m.LastPostBodies[0]), &firstBody)
		if n, ok := firstBody["name"].(string); ok && n != regModelName {
			t.Errorf("first POST body name: got %q, want %q", n, regModelName)
		}
	}
	if len(m.LastPostBodies) >= 3 {
		var artifactBody map[string]interface{}
		if err := json.Unmarshal([]byte(m.LastPostBodies[2]), &artifactBody); err == nil {
			if at, ok := artifactBody["artifactType"].(string); !ok || at != "model-artifact" {
				t.Errorf("artifact POST body must include artifactType: model-artifact, got %v", artifactBody["artifactType"])
			}
		}
	}
}
