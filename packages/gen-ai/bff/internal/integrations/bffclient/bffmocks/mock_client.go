package bffmocks

import (
	"context"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
)

// registeredPrompts stores dynamically registered prompts so that a POST followed
// by a GET for the same name returns the prompt instead of 404.
var registeredPrompts sync.Map

// MockBFFClient provides a mock implementation of the BFFClientInterface for testing
type MockBFFClient struct {
	target    bffclient.BFFTarget
	baseURL   string
	available bool

	// CallHandler allows customizing the mock response for specific calls
	// If nil, default mock responses are used
	CallHandler func(ctx context.Context, method, path string, body interface{}, response interface{}) error
}

// NewMockBFFClient creates a new mock BFF client
func NewMockBFFClient(target bffclient.BFFTarget) *MockBFFClient {
	return &MockBFFClient{
		target:    target,
		baseURL:   fmt.Sprintf("http://mock-%s.test.svc.cluster.local:8080/api/v1", target),
		available: true,
	}
}

// Call returns mock responses based on target and path
func (m *MockBFFClient) Call(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	// Use custom handler if provided
	if m.CallHandler != nil {
		return m.CallHandler(ctx, method, path, body, response)
	}

	// Default mock responses based on target
	switch m.target {
	case bffclient.BFFTargetMaaS:
		return m.handleMaaSCall(ctx, method, path, body, response)
	case bffclient.BFFTargetGenAI:
		return m.handleGenAICall(ctx, method, path, body, response)
	case bffclient.BFFTargetModelRegistry:
		return m.handleModelRegistryCall(ctx, method, path, body, response)
	case bffclient.BFFTargetMLflow:
		return m.handleMLflowCall(ctx, method, path, body, response)
	default:
		return bffclient.NewBFFClientErrorWithTarget(bffclient.ErrCodeNotFound, fmt.Sprintf("mock not implemented for target %s", m.target), m.target, 404)
	}
}

// handleMaaSCall handles mock calls to MaaS BFF
func (m *MockBFFClient) handleMaaSCall(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	switch {
	case path == "/api-keys" && method == "POST":
		// Mock API key creation response.
		// Per MaaS BFF OpenAPI spec, POST /api/v1/api-keys returns an envelope wrapper {"data": {...}}.
		keyResp := map[string]interface{}{
			"data": map[string]interface{}{
				"key":       "sk-oai-mock-" + fmt.Sprintf("%d", time.Now().Unix()),
				"keyPrefix": "sk-oai-mock",
				"id":        "mock-id-" + fmt.Sprintf("%d", time.Now().Unix()),
				"name":      "gen-ai-mock",
				"createdAt": time.Now().Format(time.RFC3339),
				"expiresAt": time.Now().Add(time.Hour).Format(time.RFC3339),
			},
		}
		return marshalToResponse(keyResp, response)

	case (path == "/models" || strings.HasPrefix(path, "/models?")) && method == "GET":
		// Mock models list
		// MaaS BFF wraps models response in {"data": {"object": "list", "data": [...]}} envelope
		modelsResp := map[string]interface{}{
			"data": map[string]interface{}{
				"object": "list",
				"data": []map[string]interface{}{
					{
						"id":       "llama-2-7b-chat",
						"object":   "model",
						"created":  time.Now().Unix(),
						"owned_by": "model-namespace",
						"ready":    true,
						"url":      "https://llama-2-7b-chat.apps.example.openshift.com/v1",
						"subscriptions": []map[string]interface{}{
							{
								"name":        "basic-subscription",
								"displayName": "Basic Tier",
							},
							{
								"name":        "premium-subscription",
								"displayName": "Premium Tier",
								"description": "Premium subscription with higher rate limits",
							},
						},
					},
					{
						"id":       "llama-2-13b-chat",
						"object":   "model",
						"created":  time.Now().Unix(),
						"owned_by": "model-namespace",
						"ready":    true,
						"url":      "https://llama-2-13b-chat.apps.example.openshift.com/v1",
						"subscriptions": []map[string]interface{}{
							{
								"name":        "premium-subscription",
								"displayName": "Premium Tier",
							},
						},
					},
					{
						"id":       "llama-3-8b-instruct",
						"object":   "model",
						"created":  time.Now().Unix(),
						"owned_by": "model-namespace",
						"ready":    false,
						"url":      "https://llama-3-8b-instruct.apps.example.openshift.com/v1",
					},
					{
						"id":       "mistral-7b-instruct",
						"object":   "model",
						"created":  time.Now().Unix(),
						"owned_by": "model-namespace",
						"ready":    false,
						"url":      "https://mistral-7b-instruct.apps.example.openshift.com/v1",
					},
					{
						"id":       "granite-7b-lab",
						"object":   "model",
						"created":  time.Now().Unix(),
						"owned_by": "model-namespace",
						"ready":    true,
						"url":      "https://granite-7b-lab.apps.example.openshift.com/v1",
						"modelDetails": map[string]interface{}{
							"displayName":       "Granite 7B Lab",
							"modelCapabilities": []string{"text-generation", "vision"},
						},
					},
					{
						"id":       "granite-8b-code",
						"object":   "model",
						"created":  time.Now().Unix(),
						"owned_by": "model-namespace",
						"ready":    false,
						"url":      "https://granite-8b-code.apps.example.openshift.com/v1",
						"modelDetails": map[string]interface{}{
							"displayName":       "Granite 8B Code",
							"modelCapabilities": []string{"audio-transcription"},
						},
					},
				},
			},
		}
		return marshalToResponse(modelsResp, response)

	default:
		return bffclient.NewNotFoundError(m.target, fmt.Sprintf("mock not implemented for %s %s", method, path))
	}
}

// handleGenAICall handles mock calls to Gen-AI BFF
func (m *MockBFFClient) handleGenAICall(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	// Add Gen-AI specific mock responses as needed
	return bffclient.NewNotFoundError(m.target, fmt.Sprintf("mock not implemented for %s %s", method, path))
}

// handleModelRegistryCall handles mock calls to Model Registry BFF
func (m *MockBFFClient) handleModelRegistryCall(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	// Add Model Registry specific mock responses as needed
	return bffclient.NewNotFoundError(m.target, fmt.Sprintf("mock not implemented for %s %s", method, path))
}

// handleMLflowCall handles mock calls to MLflow BFF
func (m *MockBFFClient) handleMLflowCall(ctx context.Context, method, path string, body interface{}, response interface{}) error {
	switch {
	case strings.HasPrefix(path, "/prompts") && method == "GET" && !strings.Contains(path, "/versions"):
		// List prompts or load specific prompt
		if strings.Contains(path, "/prompts/") {
			// Load specific prompt (GET /prompts/{name})
			promptName := extractPromptName(path)
			prompt, found := findMockPrompt(promptName)
			if !found {
				return bffclient.NewNotFoundError(m.target, fmt.Sprintf("prompt %q not found", promptName))
			}
			latestVersion := 1
			if v, ok := prompt["latest_version"].(int); ok {
				latestVersion = v
			}
			versionInt := latestVersion
			if v := extractQueryParam(path, "version"); v != "" {
				parsed, err := strconv.Atoi(v)
				if err != nil || parsed < 1 || parsed > latestVersion {
					return bffclient.NewBFFClientErrorWithTarget(bffclient.ErrCodeNotFound, fmt.Sprintf("version %s not found for prompt %q", v, promptName), m.target, 404)
				}
				versionInt = parsed
			}
			template := mockPromptTemplateForVersion(promptName, versionInt)
			promptData := map[string]interface{}{
				"name":     prompt["name"],
				"version":  versionInt,
				"template": template,
				"messages": []map[string]interface{}{
					{
						"role":    "system",
						"content": template,
					},
				},
				"created_at": mockVersionTimestamp(prompt["creation_timestamp"], versionInt),
				"updated_at": mockVersionTimestamp(prompt["creation_timestamp"], versionInt+1),
			}
			if scope, ok := prompt["scope"]; ok {
				promptData["scope"] = scope
			}
			promptResp := map[string]interface{}{
				"data": promptData,
			}
			return marshalToResponse(promptResp, response)
		}
		// List prompts (GET /prompts)
		prompts := mockPromptsList()
		promptsResp := map[string]interface{}{
			"data": map[string]interface{}{
				"prompts":     prompts,
				"total_count": len(prompts),
			},
		}
		return marshalToResponse(promptsResp, response)

	case strings.HasPrefix(path, "/prompts") && method == "POST":
		// Register prompt (POST /prompts)
		promptName := "ct-prompt"
		if body != nil {
			if bodyBytes, err := json.Marshal(body); err == nil {
				var bodyMap map[string]interface{}
				if json.Unmarshal(bodyBytes, &bodyMap) == nil {
					if name, ok := bodyMap["name"].(string); ok && name != "" {
						promptName = name
					}
				}
			}
		}
		now := time.Now().Format(time.RFC3339)
		registeredPrompts.Store(promptName, map[string]interface{}{
			"name":               promptName,
			"description":        "",
			"latest_version":     1,
			"creation_timestamp": now,
			"scope": map[string]interface{}{
				"type":      "project",
				"namespace": extractQueryParam(path, "workspace"),
			},
		})
		promptResp := map[string]interface{}{
			"data": map[string]interface{}{
				"name":       promptName,
				"version":    1,
				"template":   "Hello {{name}}",
				"created_at": now,
				"updated_at": now,
			},
		}
		return marshalToResponse(promptResp, response)

	case strings.Contains(path, "/versions") && method == "GET":
		// List prompt versions (GET /prompts/{name}/versions)
		promptName := extractPromptName(path)
		prompt, found := findMockPrompt(promptName)
		if !found {
			return bffclient.NewNotFoundError(m.target, fmt.Sprintf("prompt %q not found", promptName))
		}
		latestVersion := 1
		if v, ok := prompt["latest_version"].(int); ok {
			latestVersion = v
		}
		versions := make([]map[string]interface{}, 0, latestVersion)
		for i := latestVersion; i >= 1; i-- {
			versions = append(versions, map[string]interface{}{
				"name":           promptName,
				"version":        i,
				"commit_message": fmt.Sprintf("Version %d", i),
				"template":       mockPromptTemplateForVersion(promptName, i),
				"created_at":     mockVersionTimestamp(prompt["creation_timestamp"], i),
				"updated_at":     mockVersionTimestamp(prompt["creation_timestamp"], i+1),
			})
		}
		versionsResp := map[string]interface{}{
			"data": map[string]interface{}{
				"versions":        versions,
				"next_page_token": "",
			},
		}
		return marshalToResponse(versionsResp, response)

	case strings.HasPrefix(path, "/prompts/") && method == "DELETE":
		// Delete prompt or prompt version (DELETE /prompts/{name} or DELETE /prompts/{name}/versions/{version})
		promptName := extractPromptName(path)
		registeredPrompts.Delete(promptName)
		return nil

	default:
		return bffclient.NewNotFoundError(m.target, fmt.Sprintf("mock not implemented for %s %s", method, path))
	}
}

// marshalToResponse marshals a map to the response interface
func marshalToResponse(data interface{}, response interface{}) error {
	if response == nil {
		return nil
	}

	jsonBytes, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return json.Unmarshal(jsonBytes, response)
}

// IsAvailable returns the mock availability status
func (m *MockBFFClient) IsAvailable(ctx context.Context) bool {
	return m.available
}

// GetBaseURL returns the mock base URL
func (m *MockBFFClient) GetBaseURL() string {
	return m.baseURL
}

// GetTarget returns the target BFF identifier
func (m *MockBFFClient) GetTarget() bffclient.BFFTarget {
	return m.target
}

// SetAvailable allows tests to control the availability status
func (m *MockBFFClient) SetAvailable(available bool) {
	m.available = available
}

// MockClientFactory creates mock BFF clients for testing
type MockClientFactory struct {
	config    *bffclient.BFFClientConfig
	clients   map[bffclient.BFFTarget]*MockBFFClient
	clientsMu sync.RWMutex
	logger    *slog.Logger
}

// NewMockClientFactory creates a new mock client factory
func NewMockClientFactory(logger *slog.Logger) bffclient.BFFClientFactory {
	config := bffclient.NewDefaultBFFClientConfig()
	config.MockBFFClients = true

	return &MockClientFactory{
		config:  config,
		clients: make(map[bffclient.BFFTarget]*MockBFFClient),
		logger:  logger,
	}
}

// CreateClient creates a new mock BFF client for the specified target
func (f *MockClientFactory) CreateClient(target bffclient.BFFTarget, authToken string) bffclient.BFFClientInterface {
	return f.CreateClientWithHeaders(target, authToken, nil)
}

// CreateClientWithHeaders creates a new mock BFF client (headers are ignored in mock)
func (f *MockClientFactory) CreateClientWithHeaders(target bffclient.BFFTarget, authToken string, headers map[string]string) bffclient.BFFClientInterface {
	// Check if client already exists (read lock)
	f.clientsMu.RLock()
	if client, ok := f.clients[target]; ok {
		f.clientsMu.RUnlock()
		return client
	}
	f.clientsMu.RUnlock()

	// Create new mock client (write lock)
	f.clientsMu.Lock()
	defer f.clientsMu.Unlock()

	// Double-check after acquiring write lock
	if client, ok := f.clients[target]; ok {
		return client
	}

	client := NewMockBFFClient(target)
	f.clients[target] = client

	if f.logger != nil {
		f.logger.Debug("Created mock BFF client", "target", target)
	}

	return client
}

// GetConfig returns the configuration for a specific target
func (f *MockClientFactory) GetConfig(target bffclient.BFFTarget) *bffclient.BFFServiceConfig {
	return f.config.GetServiceConfig(target)
}

// IsTargetConfigured checks if the target is configured in ServiceConfigs
func (f *MockClientFactory) IsTargetConfigured(target bffclient.BFFTarget) bool {
	return f.config.GetServiceConfig(target) != nil
}

// GetMockClient returns the mock client for a specific target (for test assertions)
func (f *MockClientFactory) GetMockClient(target bffclient.BFFTarget) *MockBFFClient {
	f.clientsMu.RLock()
	defer f.clientsMu.RUnlock()
	return f.clients[target]
}

// NewMockClientFactoryWithConfig creates a new mock client factory with custom config
func NewMockClientFactoryWithConfig(config *bffclient.BFFClientConfig, rootCAs *x509.CertPool, insecureSkipVerify bool, logger *slog.Logger) bffclient.BFFClientFactory {
	return &MockClientFactory{
		config:  config,
		clients: make(map[bffclient.BFFTarget]*MockBFFClient),
		logger:  logger,
	}
}

func extractQueryParam(path, key string) string {
	if idx := strings.Index(path, "?"); idx != -1 {
		query := path[idx+1:]
		for _, param := range strings.Split(query, "&") {
			parts := strings.SplitN(param, "=", 2)
			if len(parts) == 2 && parts[0] == key {
				return parts[1]
			}
		}
	}
	return ""
}

func extractPromptName(path string) string {
	// path is like "/prompts/my-prompt" or "/prompts/my-prompt/versions"
	trimmed := strings.TrimPrefix(path, "/prompts/")
	if idx := strings.Index(trimmed, "/"); idx != -1 {
		return trimmed[:idx]
	}
	if idx := strings.Index(trimmed, "?"); idx != -1 {
		return trimmed[:idx]
	}
	return trimmed
}

func findMockPrompt(name string) (map[string]interface{}, bool) {
	for _, p := range mockPromptsList() {
		if p["name"] == name {
			return p, true
		}
	}
	if val, ok := registeredPrompts.Load(name); ok {
		if prompt, ok := val.(map[string]interface{}); ok {
			return prompt, true
		}
	}
	return nil, false
}

func mockPromptTemplateForVersion(name string, version int) string {
	return fmt.Sprintf("%s (version %d)", mockPromptTemplate(name), version)
}

func mockVersionTimestamp(base interface{}, version int) string {
	if s, ok := base.(string); ok {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			return t.AddDate(0, 0, (version-1)*7).Format(time.RFC3339)
		}
	}
	return time.Now().AddDate(0, 0, -(version-1)*7).Format(time.RFC3339)
}

func mockPromptTemplate(name string) string {
	templates := map[string]string{
		"summarization-prompt":     "You are a summarization assistant. Condense the following text into a brief summary preserving key points.",
		"code-review-prompt":       "You are a code review assistant. Analyze the provided code for quality, best practices, and potential issues.",
		"translation-prompt":       "You are a translation assistant. Translate the following text accurately while preserving tone and meaning.",
		"data-extraction-prompt":   "You are a data extraction assistant. Extract structured data from the provided document and return it as JSON.",
		"starter-template-prompt":  "You are a helpful AI assistant. Answer questions clearly and concisely.",
		"safety-guidelines-prompt": "You are a responsible AI safety reviewer. Evaluate the following content against safety guidelines and flag any concerns.",
		"customer-support-prompt":  "You are a customer support assistant. Help resolve the customer's inquiry professionally and efficiently.",
	}
	if t, ok := templates[name]; ok {
		return t
	}
	return "You are a helpful assistant."
}

func mockPromptsList() []map[string]interface{} {
	now := time.Now().Format(time.RFC3339)
	return []map[string]interface{}{
		{
			"name":               "summarization-prompt",
			"description":        "Summarize content",
			"latest_version":     1,
			"creation_timestamp": now,
			"tags":               map[string]string{"use_case": "summarization", "language": "en"},
			"scope": map[string]interface{}{
				"type":      "project",
				"namespace": "default",
			},
		},
		{
			"name":               "code-review-prompt",
			"description":        "Review code for quality and best practices",
			"latest_version":     3,
			"creation_timestamp": now,
			"tags":               map[string]string{"use_case": "code-review"},
			"scope": map[string]interface{}{
				"type":      "project",
				"namespace": "default",
			},
		},
		{
			"name":               "translation-prompt",
			"description":        "Translate text between languages",
			"latest_version":     2,
			"creation_timestamp": now,
			"scope": map[string]interface{}{
				"type":      "project",
				"namespace": "default",
			},
		},
		{
			"name":               "data-extraction-prompt",
			"description":        "Extract structured data from documents",
			"latest_version":     4,
			"creation_timestamp": "2025-05-20T08:30:00Z",
			"tags":               map[string]string{"use_case": "extraction", "format": "json"},
			"scope": map[string]interface{}{
				"type":      "project",
				"namespace": "my-data-science-project",
			},
		},
		{
			"name":               "starter-template-prompt",
			"description":        "A global starter template for new projects",
			"latest_version":     1,
			"creation_timestamp": now,
			"scope": map[string]interface{}{
				"type":      "global",
				"namespace": "rhoai-templates",
				"read_only": true,
			},
		},
		{
			"name":               "safety-guidelines-prompt",
			"description":        "Enforces responsible AI safety guidelines",
			"latest_version":     5,
			"creation_timestamp": "2025-04-01T14:00:00Z",
			"tags":               map[string]string{"category": "safety", "compliance": "required"},
			"scope": map[string]interface{}{
				"type":      "global",
				"namespace": "rhoai-policies",
				"read_only": true,
			},
		},
		{
			"name":               "customer-support-prompt",
			"description":        "Handle customer support inquiries",
			"latest_version":     2,
			"creation_timestamp": "2025-06-01T09:00:00Z",
			"tags":               map[string]string{"department": "support"},
			"scope": map[string]interface{}{
				"type":      "global",
				"namespace": "shared-team-prompts",
				"read_only": true,
			},
		},
	}
}
