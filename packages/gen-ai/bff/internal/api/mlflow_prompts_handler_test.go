package api

import (
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/gen-ai/internal/models"
)

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

			Expect(envelope.Data.Prompts).To(HaveLen(4))

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

			for name, expectedVersion := range expectedPrompts {
				prompt, ok := promptsByName[name]
				Expect(ok).To(BeTrue(), "expected prompt %s", name)
				Expect(prompt.LatestVersion).To(Equal(expectedVersion), "wrong latest_version for %s", name)
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
				Method: http.MethodPost,
				Path:   "/gen-ai/api/v1/mlflow/prompts?namespace=default",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusMethodNotAllowed))
		})
	})
})
