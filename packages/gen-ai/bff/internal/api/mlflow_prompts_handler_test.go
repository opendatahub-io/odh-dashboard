package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

var _ = Describe("MLflow Prompts Handler", func() {
	var mockBFFClient *bffmocks.MockBFFClient

	BeforeEach(func() {
		// Get the shared mock factory from testCtx.App
		mockFactory := testCtx.App.bffClientFactory.(*bffmocks.MockClientFactory)

		// Ensure the mock client exists for MLflow BFF
		mockFactory.CreateClient(bffclient.BFFTargetMLflow, "")
		mockBFFClient = mockFactory.GetMockClient(bffclient.BFFTargetMLflow)

		// Set up custom call handler to return mock prompt data
		mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
			// Default handler returns seeded prompts
			switch {
			case method == "GET" && path == "/prompts?workspace=default":
				// Return seeded prompts
				data := map[string]interface{}{
					"data": map[string]interface{}{
						"prompts": []map[string]interface{}{
							{
								"name":               "vet-appointment-dora",
								"latest_version":     2,
								"creation_timestamp": time.Now().Format(time.RFC3339),
								"scope": map[string]interface{}{
									"type":      "project",
									"namespace": "default",
								},
							},
							{
								"name":               "pet-health-bella",
								"latest_version":     1,
								"creation_timestamp": time.Now().Format(time.RFC3339),
								"scope": map[string]interface{}{
									"type":      "project",
									"namespace": "default",
								},
							},
							{
								"name":               "medication-reminder-ellie",
								"latest_version":     2,
								"creation_timestamp": time.Now().Format(time.RFC3339),
								"scope": map[string]interface{}{
									"type":      "global",
									"namespace": "shared-prompts",
								},
							},
							{
								"name":               "pet-adoption-letter",
								"latest_version":     1,
								"creation_timestamp": time.Now().Format(time.RFC3339),
								"scope": map[string]interface{}{
									"type":      "project",
									"namespace": "default",
								},
							},
						},
						"total_count": 4,
					},
				}
				return marshalToResponse(data, response)
			}

			// Default mock implementation for unmatched paths
			return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
		}
	})

	Describe("GET /api/v1/mlflow/prompts", func() {

		It("should return all seeded prompts in envelope", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))
			Expect(resp.Header.Get("Content-Type")).To(Equal("application/json"))

			var envelope MLflowPromptsEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(len(envelope.Data.Prompts)).To(BeNumerically(">=", 4))

			promptsByName := make(map[string]models.MLflowPrompt)
			for _, p := range envelope.Data.Prompts {
				promptsByName[p.Name] = p
			}

			expectedPrompts := map[string]int{
				"vet-appointment-dora":      2,
				"pet-health-bella":          1,
				"medication-reminder-ellie": 2,
				"pet-adoption-letter":       1,
			}

			for name, minVersion := range expectedPrompts {
				prompt, ok := promptsByName[name]
				Expect(ok).To(BeTrue(), "expected prompt %s", name)
				Expect(prompt.LatestVersion).To(BeNumerically(">=", minVersion), "wrong latest_version for %s", name)
				Expect(prompt.CreationTimestamp.IsZero()).To(BeFalse(), "expected non-zero creation timestamp for %s", name)
			}
		})

		It("should return response wrapped in data envelope", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))
			Expect(resp.Header.Get("Content-Type")).To(Equal("application/json"))

			var raw map[string]any
			ReadJSONResponse(resp, &raw)

			Expect(raw).To(HaveKey("data"))
			data, ok := raw["data"].(map[string]any)
			Expect(ok).To(BeTrue())
			Expect(data).To(HaveKey("prompts"))
		})

		It("should include scope annotations on prompts", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptsEnvelope
			ReadJSONResponse(resp, &envelope)

			promptsByName := make(map[string]models.MLflowPrompt)
			for _, p := range envelope.Data.Prompts {
				promptsByName[p.Name] = p
			}

			dora := promptsByName["vet-appointment-dora"]
			Expect(string(dora.Scope.Type)).To(Equal("project"))
			Expect(dora.Scope.Namespace).To(Equal("default"))

			ellie := promptsByName["medication-reminder-ellie"]
			Expect(string(ellie.Scope.Type)).To(Equal("global"))
			Expect(ellie.Scope.Namespace).To(Equal("shared-prompts"))
		})

		It("should pass through failed_namespaces from MLflow BFF", func() {
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "GET" && path == "/prompts?workspace=default" {
					data := map[string]interface{}{
						"data": map[string]interface{}{
							"prompts": []map[string]interface{}{
								{
									"name":               "local-prompt",
									"latest_version":     1,
									"creation_timestamp": time.Now().Format(time.RFC3339),
									"scope": map[string]interface{}{
										"type":      "project",
										"namespace": "default",
									},
								},
							},
							"total_count":       1,
							"failed_namespaces": []string{"unreachable-ns"},
						},
					}
					return marshalToResponse(data, response)
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptsEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(envelope.Data.Prompts).To(HaveLen(1))
			Expect(envelope.Data.FailedNamespaces).To(ConsistOf("unreachable-ns"))
		})

		It("should return 400 when namespace parameter is missing", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("should return 405 for unsupported HTTP methods", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodPatch,
				Path:   "/gen-ai/api/v1/mlflow/prompts?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusMethodNotAllowed))
		})

		It("should support pagination with max_results", func() {
			// Override mock to return paginated data
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "GET" && path == "/prompts?workspace=default&max_results=2" {
					data := map[string]interface{}{
						"data": map[string]interface{}{
							"prompts": []map[string]interface{}{
								{
									"name":                  "vet-appointment-dora",
									"latest_version":        2,
									"creation_timestamp":    time.Now().Format(time.RFC3339),
									"last_update_timestamp": time.Now().Format(time.RFC3339),
									"scope": map[string]interface{}{
										"type":      "project",
										"namespace": "default",
									},
								},
								{
									"name":                  "pet-health-bella",
									"latest_version":        1,
									"creation_timestamp":    time.Now().Format(time.RFC3339),
									"last_update_timestamp": time.Now().Format(time.RFC3339),
									"scope": map[string]interface{}{
										"type":      "project",
										"namespace": "default",
									},
								},
							},
							"total_count":     4,
							"next_page_token": "token123",
						},
					}
					return marshalToResponse(data, response)
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts?namespace=default&max_results=2",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptsEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(envelope.Data.Prompts).To(HaveLen(2))
			Expect(envelope.Data.NextPageToken).NotTo(BeEmpty())
		})

		It("should filter prompts by name prefix using filter_name", func() {
			// Override mock to return filtered data
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "GET" && path == "/prompts?workspace=default&filter_name=pet" {
					data := map[string]interface{}{
						"data": map[string]interface{}{
							"prompts": []map[string]interface{}{
								{
									"name":                  "pet-health-bella",
									"latest_version":        1,
									"creation_timestamp":    time.Now().Format(time.RFC3339),
									"last_update_timestamp": time.Now().Format(time.RFC3339),
									"scope": map[string]interface{}{
										"type":      "project",
										"namespace": "default",
									},
								},
								{
									"name":                  "pet-adoption-letter",
									"latest_version":        1,
									"creation_timestamp":    time.Now().Format(time.RFC3339),
									"last_update_timestamp": time.Now().Format(time.RFC3339),
									"scope": map[string]interface{}{
										"type":      "project",
										"namespace": "default",
									},
								},
							},
							"total_count": 2,
						},
					}
					return marshalToResponse(data, response)
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts?namespace=default&filter_name=pet",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptsEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(len(envelope.Data.Prompts)).To(BeNumerically(">=", 2))
			for _, p := range envelope.Data.Prompts {
				Expect(p.Name).To(ContainSubstring("pet"), "all returned prompts should contain 'pet'")
			}
		})
	})

	Describe("POST /api/v1/mlflow/prompts", func() {

		It("should create a new chat prompt", func() {
			promptName := "test-chat-create"

			// Override mock to handle POST
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "POST" && path == "/prompts?workspace=default" {
					data := map[string]interface{}{
						"data": map[string]interface{}{
							"name":    promptName,
							"version": 1,
							"messages": []map[string]interface{}{
								{"role": "system", "content": "You are helpful."},
								{"role": "user", "content": "Hello {{name}}"},
							},
							"created_at": time.Now().Format(time.RFC3339),
							"updated_at": time.Now().Format(time.RFC3339),
						},
					}
					return marshalToResponse(data, response)
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			req := models.MLflowRegisterPromptRequest{
				Name: promptName,
				Messages: []models.MLflowMessage{
					{Role: "system", Content: "You are helpful."},
					{Role: "user", Content: "Hello {{name}}"},
				},
				CommitMessage: "initial chat version",
			}

			resp := MakeRequest(JSONRequest(
				http.MethodPost,
				"/gen-ai/api/v1/mlflow/prompts?namespace=default",
				req,
			))
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusCreated))

			var envelope MLflowPromptVersionEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(envelope.Data.Name).To(Equal(promptName))
			Expect(envelope.Data.Version).To(Equal(1))
			Expect(envelope.Data.Messages).To(HaveLen(2))
			Expect(envelope.Data.Messages[0].Role).To(Equal("system"))
		})

		It("should return 400 when name is missing", func() {
			req := models.MLflowRegisterPromptRequest{
				Template: "Hello {{name}}",
			}

			resp := MakeRequest(JSONRequest(
				http.MethodPost,
				"/gen-ai/api/v1/mlflow/prompts?namespace=default",
				req,
			))
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("should return 400 when neither messages nor template is provided", func() {
			req := models.MLflowRegisterPromptRequest{
				Name: "test-empty-prompt",
			}

			resp := MakeRequest(JSONRequest(
				http.MethodPost,
				"/gen-ai/api/v1/mlflow/prompts?namespace=default",
				req,
			))
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("should return 400 for invalid prompt name", func() {
			req := models.MLflowRegisterPromptRequest{
				Name:     "foo/bar",
				Template: "Hello {{name}}",
			}

			resp := MakeRequest(JSONRequest(
				http.MethodPost,
				"/gen-ai/api/v1/mlflow/prompts?namespace=default",
				req,
			))
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("should return 400 when both messages and template are provided", func() {
			req := models.MLflowRegisterPromptRequest{
				Name:     "test-both-prompt",
				Template: "Hello",
				Messages: []models.MLflowMessage{
					{Role: "user", Content: "Hello"},
				},
			}

			resp := MakeRequest(JSONRequest(
				http.MethodPost,
				"/gen-ai/api/v1/mlflow/prompts?namespace=default",
				req,
			))
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))
		})
	})

	Describe("GET /api/v1/mlflow/prompts/:name", func() {

		It("should load a prompt by name", func() {
			// Override mock to return specific prompt
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "GET" && path == "/prompts/vet-appointment-dora?workspace=default" {
					data := map[string]interface{}{
						"data": map[string]interface{}{
							"name":    "vet-appointment-dora",
							"version": 2,
							"messages": []map[string]interface{}{
								{"role": "system", "content": "You are helpful."},
							},
							"created_at": time.Now().Format(time.RFC3339),
							"updated_at": time.Now().Format(time.RFC3339),
						},
					}
					return marshalToResponse(data, response)
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/vet-appointment-dora?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptVersionEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(envelope.Data.Name).To(Equal("vet-appointment-dora"))
			Expect(envelope.Data.Version).To(BeNumerically(">=", 1))
		})

		It("should return 404 for a nonexistent prompt", func() {
			// Override mock to return 404
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "GET" && path == "/prompts/nonexistent-prompt?workspace=default" {
					return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, "prompt not found")
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/nonexistent-prompt?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusNotFound))
		})

		It("should return 400 for invalid version parameter", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/vet-appointment-dora?namespace=default&version=abc",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))
		})
	})

	Describe("DELETE /api/v1/mlflow/prompts/:name", func() {

		It("should delete an entire prompt", func() {
			// Override mock to handle DELETE
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "DELETE" && path == "/prompts/test-delete-prompt?workspace=default" {
					return nil
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodDelete,
				Path:   "/gen-ai/api/v1/mlflow/prompts/test-delete-prompt?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusNoContent))
		})
	})

	Describe("GET /api/v1/mlflow/prompts/:name/versions", func() {

		It("should list all versions for a prompt", func() {
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "GET" && path == "/prompts/test-prompt/versions?workspace=default" {
					data := map[string]interface{}{
						"data": map[string]interface{}{
							"versions": []map[string]interface{}{
								{
									"name":               "test-prompt",
									"version":            2,
									"creation_timestamp": time.Now().Format(time.RFC3339),
								},
								{
									"name":               "test-prompt",
									"version":            1,
									"creation_timestamp": time.Now().Format(time.RFC3339),
								},
							},
						},
					}
					return marshalToResponse(data, response)
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/test-prompt/versions?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptVersionsEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(envelope.Data.Versions).To(HaveLen(2))
			Expect(envelope.Data.Versions[0].Version).To(Equal(2))
			Expect(envelope.Data.Versions[1].Version).To(Equal(1))
		})

		It("should support pagination with max_results", func() {
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "GET" && path == "/prompts/test-prompt/versions?workspace=default&max_results=1" {
					data := map[string]interface{}{
						"data": map[string]interface{}{
							"versions": []map[string]interface{}{
								{
									"name":               "test-prompt",
									"version":            2,
									"creation_timestamp": time.Now().Format(time.RFC3339),
								},
							},
							"next_page_token": "v1",
						},
					}
					return marshalToResponse(data, response)
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/test-prompt/versions?namespace=default&max_results=1",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptVersionsEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(envelope.Data.Versions).To(HaveLen(1))
			Expect(envelope.Data.NextPageToken).To(Equal("v1"))
		})

		It("should support pagination with page_token", func() {
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "GET" && path == "/prompts/test-prompt/versions?workspace=default&page_token=v1" {
					data := map[string]interface{}{
						"data": map[string]interface{}{
							"versions": []map[string]interface{}{
								{
									"name":               "test-prompt",
									"version":            1,
									"creation_timestamp": time.Now().Format(time.RFC3339),
								},
							},
						},
					}
					return marshalToResponse(data, response)
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/test-prompt/versions?namespace=default&page_token=v1",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptVersionsEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(envelope.Data.Versions).To(HaveLen(1))
			Expect(envelope.Data.Versions[0].Version).To(Equal(1))
		})

		It("should return 400 when namespace parameter is missing", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/test-prompt/versions",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("should return 404 for a nonexistent prompt", func() {
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "GET" && path == "/prompts/nonexistent/versions?workspace=default" {
					return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, "prompt not found")
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/nonexistent/versions?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusNotFound))
		})
	})

	Describe("DELETE /api/v1/mlflow/prompts/:name/versions/:version", func() {

		It("should delete a specific version", func() {
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "DELETE" && path == "/prompts/test-prompt/versions/1?workspace=default" {
					return nil
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodDelete,
				Path:   "/gen-ai/api/v1/mlflow/prompts/test-prompt/versions/1?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusNoContent))
		})

		It("should return 400 for invalid version parameter", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodDelete,
				Path:   "/gen-ai/api/v1/mlflow/prompts/test-prompt/versions/abc?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("should return 400 when namespace parameter is missing", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodDelete,
				Path:   "/gen-ai/api/v1/mlflow/prompts/test-prompt/versions/1",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))
		})

		It("should return 404 for a nonexistent version", func() {
			mockBFFClient.CallHandler = func(ctx context.Context, method, path string, body interface{}, response interface{}) error {
				if method == "DELETE" && path == "/prompts/test-prompt/versions/999?workspace=default" {
					return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, "version not found")
				}
				return bffclient.NewNotFoundError(bffclient.BFFTargetMLflow, fmt.Sprintf("mock not implemented for %s %s", method, path))
			}

			resp := MakeRequest(TestRequest{
				Method: http.MethodDelete,
				Path:   "/gen-ai/api/v1/mlflow/prompts/test-prompt/versions/999?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusNotFound))
		})
	})
})

// marshalToResponse is a helper copied from bffmocks package
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
