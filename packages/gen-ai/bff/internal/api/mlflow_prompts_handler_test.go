package api

import (
	"fmt"
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/gen-ai/internal/models"
)

// deletePromptBestEffort attempts to delete a prompt, ignoring errors.
// Used for test cleanup to ensure a clean state regardless of test order.
func deletePromptBestEffort(name string) {
	resp := MakeRequest(TestRequest{
		Method: http.MethodDelete,
		Path:   fmt.Sprintf("/gen-ai/api/v1/mlflow/prompts/%s?namespace=default", name),
	})
	resp.Body.Close()
}

var _ = Describe("MLflow Prompts Handler", func() {

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

			// Other tests may create additional prompts, so check at least 4 exist
			Expect(len(envelope.Data.Prompts)).To(BeNumerically(">=", 4))

			promptsByName := make(map[string]models.MLflowPrompt)
			for _, p := range envelope.Data.Prompts {
				promptsByName[p.Name] = p
			}

			// Verify all seeded prompts are present with correct minimum versions
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
	})

	Describe("POST /api/v1/mlflow/prompts", func() {

		It("should create a new chat prompt", func() {
			promptName := "test-chat-create"
			deletePromptBestEffort(promptName)

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

			deletePromptBestEffort(promptName)
		})

		It("should create a new text prompt", func() {
			promptName := "test-text-create"
			deletePromptBestEffort(promptName)

			req := models.MLflowRegisterPromptRequest{
				Name:          promptName,
				Template:      "Hello {{name}}, welcome to {{place}}!",
				CommitMessage: "initial text version",
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
			Expect(envelope.Data.Template).To(ContainSubstring("Hello {{name}}"))

			deletePromptBestEffort(promptName)
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

		It("should load a seeded prompt by name", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/vet-appointment-dora?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptVersionEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(envelope.Data.Name).To(Equal("vet-appointment-dora"))
			Expect(envelope.Data.Version).To(BeNumerically(">=", 2))
			Expect(envelope.Data.Messages).NotTo(BeEmpty())
		})

		It("should load a specific version when version param is provided", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/vet-appointment-dora?namespace=default&version=1",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptVersionEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(envelope.Data.Name).To(Equal("vet-appointment-dora"))
			Expect(envelope.Data.Version).To(Equal(1))
		})

		It("should return 404 for a nonexistent prompt", func() {
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

	Describe("GET /api/v1/mlflow/prompts/:name/versions", func() {

		It("should list versions for a seeded prompt", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/vet-appointment-dora/versions?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptVersionsEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(len(envelope.Data.Versions)).To(BeNumerically(">=", 2))
		})

		It("should return empty list for a nonexistent prompt", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts/nonexistent-prompt/versions?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			var envelope MLflowPromptVersionsEnvelope
			ReadJSONResponse(resp, &envelope)

			Expect(envelope.Data.Versions).To(BeEmpty())
		})
	})

	Describe("DELETE /api/v1/mlflow/prompts/:name/versions/:version", func() {

		It("should delete a specific version", func() {
			promptName := "test-delete-version"
			deletePromptBestEffort(promptName)

			// Create a prompt to delete
			createReq := models.MLflowRegisterPromptRequest{
				Name:          promptName,
				Template:      "Version 1",
				CommitMessage: "v1",
			}
			createResp := MakeRequest(JSONRequest(
				http.MethodPost,
				"/gen-ai/api/v1/mlflow/prompts?namespace=default",
				createReq,
			))
			defer createResp.Body.Close()
			Expect(createResp.StatusCode).To(Equal(http.StatusCreated))

			// Delete the version
			resp := MakeRequest(TestRequest{
				Method: http.MethodDelete,
				Path:   fmt.Sprintf("/gen-ai/api/v1/mlflow/prompts/%s/versions/1?namespace=default", promptName),
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusNoContent))

			deletePromptBestEffort(promptName)
		})

		It("should return 400 for invalid version parameter", func() {
			resp := MakeRequest(TestRequest{
				Method: http.MethodDelete,
				Path:   "/gen-ai/api/v1/mlflow/prompts/some-prompt/versions/abc?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))
		})
	})

	Describe("DELETE /api/v1/mlflow/prompts/:name", func() {

		It("should delete an entire prompt", func() {
			promptName := "test-delete-prompt"
			deletePromptBestEffort(promptName)

			// Create a prompt to delete
			createReq := models.MLflowRegisterPromptRequest{
				Name:          promptName,
				Template:      "To be deleted",
				CommitMessage: "will be deleted",
			}
			createResp := MakeRequest(JSONRequest(
				http.MethodPost,
				"/gen-ai/api/v1/mlflow/prompts?namespace=default",
				createReq,
			))
			defer createResp.Body.Close()
			Expect(createResp.StatusCode).To(Equal(http.StatusCreated))

			// Delete the prompt
			resp := MakeRequest(TestRequest{
				Method: http.MethodDelete,
				Path:   fmt.Sprintf("/gen-ai/api/v1/mlflow/prompts/%s?namespace=default", promptName),
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusNoContent))

			// Verify it's gone
			getResp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   fmt.Sprintf("/gen-ai/api/v1/mlflow/prompts/%s?namespace=default", promptName),
			})
			defer getResp.Body.Close()

			Expect(getResp.StatusCode).To(Equal(http.StatusNotFound))
		})
	})

	Describe("Full lifecycle", func() {

		It("should support create, read, update, list, and delete operations", func() {
			promptName := "lifecycle-test-prompt"
			basePath := fmt.Sprintf("/gen-ai/api/v1/mlflow/prompts/%s", promptName)

			// Ensure clean state
			deletePromptBestEffort(promptName)

			By("1. Creating a chat prompt")
			createReq := models.MLflowRegisterPromptRequest{
				Name: promptName,
				Messages: []models.MLflowMessage{
					{Role: "system", Content: "You are a helpful assistant."},
					{Role: "user", Content: "Hello {{name}}"},
				},
				CommitMessage: "initial version",
				Tags:          map[string]string{"env": "test"},
			}
			createResp := MakeRequest(JSONRequest(
				http.MethodPost,
				"/gen-ai/api/v1/mlflow/prompts?namespace=default",
				createReq,
			))
			var createEnvelope MLflowPromptVersionEnvelope
			ReadJSONResponse(createResp, &createEnvelope)
			Expect(createResp.StatusCode).To(Equal(http.StatusCreated))
			Expect(createEnvelope.Data.Version).To(Equal(1))
			Expect(createEnvelope.Data.Messages).To(HaveLen(2))

			By("2. Loading the prompt (should return version 1)")
			getResp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   basePath + "?namespace=default",
			})
			var getEnvelope MLflowPromptVersionEnvelope
			ReadJSONResponse(getResp, &getEnvelope)
			Expect(getResp.StatusCode).To(Equal(http.StatusOK))
			Expect(getEnvelope.Data.Version).To(Equal(1))
			Expect(getEnvelope.Data.Messages[1].Content).To(Equal("Hello {{name}}"))

			By("3. Updating the prompt with new messages (creates version 2)")
			updateReq := models.MLflowRegisterPromptRequest{
				Name: promptName,
				Messages: []models.MLflowMessage{
					{Role: "system", Content: "You are a very helpful assistant."},
					{Role: "user", Content: "Hi {{name}}, how are you?"},
				},
				CommitMessage: "updated messages",
			}
			updateResp := MakeRequest(JSONRequest(
				http.MethodPost,
				"/gen-ai/api/v1/mlflow/prompts?namespace=default",
				updateReq,
			))
			var updateEnvelope MLflowPromptVersionEnvelope
			ReadJSONResponse(updateResp, &updateEnvelope)
			Expect(updateResp.StatusCode).To(Equal(http.StatusCreated))
			Expect(updateEnvelope.Data.Version).To(Equal(2))

			By("4. Loading version 1 specifically")
			v1Resp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   basePath + "?namespace=default&version=1",
			})
			var v1Envelope MLflowPromptVersionEnvelope
			ReadJSONResponse(v1Resp, &v1Envelope)
			Expect(v1Resp.StatusCode).To(Equal(http.StatusOK))
			Expect(v1Envelope.Data.Version).To(Equal(1))
			Expect(v1Envelope.Data.Messages[1].Content).To(Equal("Hello {{name}}"))

			By("5. Loading latest (should be version 2)")
			latestResp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   basePath + "?namespace=default",
			})
			var latestEnvelope MLflowPromptVersionEnvelope
			ReadJSONResponse(latestResp, &latestEnvelope)
			Expect(latestResp.StatusCode).To(Equal(http.StatusOK))
			Expect(latestEnvelope.Data.Version).To(Equal(2))
			Expect(latestEnvelope.Data.Messages[1].Content).To(Equal("Hi {{name}}, how are you?"))

			By("6. Listing versions")
			versionsResp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   basePath + "/versions?namespace=default",
			})
			var versionsEnvelope MLflowPromptVersionsEnvelope
			ReadJSONResponse(versionsResp, &versionsEnvelope)
			Expect(versionsResp.StatusCode).To(Equal(http.StatusOK))
			Expect(versionsEnvelope.Data.Versions).To(HaveLen(2))

			By("7. Listing all prompts and verifying lifecycle prompt is present")
			listResp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   "/gen-ai/api/v1/mlflow/prompts?namespace=default",
			})
			var listEnvelope MLflowPromptsEnvelope
			ReadJSONResponse(listResp, &listEnvelope)
			Expect(listResp.StatusCode).To(Equal(http.StatusOK))

			found := false
			for _, p := range listEnvelope.Data.Prompts {
				if p.Name == promptName {
					found = true
					break
				}
			}
			Expect(found).To(BeTrue(), "lifecycle prompt should appear in list")

			By("8. Deleting version 1")
			deleteV1Resp := MakeRequest(TestRequest{
				Method: http.MethodDelete,
				Path:   basePath + "/versions/1?namespace=default",
			})
			defer deleteV1Resp.Body.Close()
			Expect(deleteV1Resp.StatusCode).To(Equal(http.StatusNoContent))

			By("9. Deleting the entire prompt")
			deleteResp := MakeRequest(TestRequest{
				Method: http.MethodDelete,
				Path:   basePath + "?namespace=default",
			})
			defer deleteResp.Body.Close()
			Expect(deleteResp.StatusCode).To(Equal(http.StatusNoContent))

			By("10. Verifying the prompt is gone")
			goneResp := MakeRequest(TestRequest{
				Method: http.MethodGet,
				Path:   basePath + "?namespace=default",
			})
			defer goneResp.Body.Close()
			Expect(goneResp.StatusCode).To(Equal(http.StatusNotFound))
		})
	})
})
