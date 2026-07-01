package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
)

var _ = Describe("handleBFFClientError", func() {
	var (
		app *App
		w   *httptest.ResponseRecorder
		r   *http.Request
	)

	BeforeEach(func() {
		cfg := config.EnvConfig{}
		app = &App{
			config: cfg,
			logger: slog.Default(),
		}
		w = httptest.NewRecorder()
		r = httptest.NewRequest(http.MethodGet, "/test", nil)
	})

	It("should handle wrapped BFF client error through errors.As", func() {
		bffErr := &bffclient.BFFClientError{
			StatusCode: http.StatusBadRequest,
			Code:       "bad_request",
			Message:    "invalid input",
		}
		wrappedErr := fmt.Errorf("wrapped: %w", bffErr)

		app.handleBFFClientError(w, r, wrappedErr)

		Expect(w.Code).To(Equal(http.StatusBadRequest))
		var response ErrorEnvelope
		Expect(json.Unmarshal(w.Body.Bytes(), &response)).To(Succeed())
		Expect(response.Error.Code).To(Equal("bad_request"))
		Expect(response.Error.Message).To(Equal("invalid input"))
	})

	It("should NOT leak 5xx message to client", func() {
		bffErr := &bffclient.BFFClientError{
			StatusCode: http.StatusInternalServerError,
			Code:       "server_unavailable",
			Message:    "upstream service X at 10.0.0.5:8080 connection refused",
		}

		app.handleBFFClientError(w, r, bffErr)

		Expect(w.Code).To(Equal(http.StatusInternalServerError))
		var response ErrorEnvelope
		Expect(json.Unmarshal(w.Body.Bytes(), &response)).To(Succeed())
		Expect(response.Error.Message).NotTo(ContainSubstring("upstream service"))
		Expect(response.Error.Message).NotTo(ContainSubstring("10.0.0.5"))
		Expect(response.Error.Message).NotTo(ContainSubstring("connection refused"))
		Expect(response.Error.Message).To(Equal("Internal Server Error"))
	})

	It("should map 5xx code to generic 'internal_error'", func() {
		bffErr := &bffclient.BFFClientError{
			StatusCode: http.StatusServiceUnavailable,
			Code:       "connection_failed",
			Message:    "upstream connection failed",
		}

		app.handleBFFClientError(w, r, bffErr)

		Expect(w.Code).To(Equal(http.StatusServiceUnavailable))
		var response ErrorEnvelope
		Expect(json.Unmarshal(w.Body.Bytes(), &response)).To(Succeed())
		Expect(response.Error.Code).To(Equal("internal_error"))
		Expect(response.Error.Code).NotTo(Equal("connection_failed"))
	})

	It("should handle status code 0 as BadGateway", func() {
		bffErr := &bffclient.BFFClientError{
			StatusCode: 0,
			Code:       "unknown",
			Message:    "no status code",
		}

		app.handleBFFClientError(w, r, bffErr)

		Expect(w.Code).To(Equal(http.StatusBadGateway))
	})

	It("should handle status code 99 as BadGateway", func() {
		bffErr := &bffclient.BFFClientError{
			StatusCode: 99,
			Code:       "invalid",
			Message:    "invalid status code",
		}

		app.handleBFFClientError(w, r, bffErr)

		Expect(w.Code).To(Equal(http.StatusBadGateway))
	})

	It("should handle status code 1000 as BadGateway", func() {
		bffErr := &bffclient.BFFClientError{
			StatusCode: 1000,
			Code:       "invalid",
			Message:    "status code too large",
		}

		app.handleBFFClientError(w, r, bffErr)

		Expect(w.Code).To(Equal(http.StatusBadGateway))
	})

	It("should pass through 4xx code and message", func() {
		bffErr := &bffclient.BFFClientError{
			StatusCode: http.StatusNotFound,
			Code:       "not_found",
			Message:    "resource not found",
		}

		app.handleBFFClientError(w, r, bffErr)

		Expect(w.Code).To(Equal(http.StatusNotFound))
		var response ErrorEnvelope
		Expect(json.Unmarshal(w.Body.Bytes(), &response)).To(Succeed())
		Expect(response.Error.Code).To(Equal("not_found"))
		Expect(response.Error.Message).To(Equal("resource not found"))
	})

	It("should handle non-BFF error as server error", func() {
		genericErr := errors.New("some generic error")

		app.handleBFFClientError(w, r, genericErr)

		Expect(w.Code).To(Equal(http.StatusInternalServerError))
		var response ErrorEnvelope
		Expect(json.Unmarshal(w.Body.Bytes(), &response)).To(Succeed())
		Expect(response.Error.Code).To(Equal("500"))
		Expect(response.Error.Message).To(Equal("the server encountered a problem and could not process your request"))
	})
})

var _ = Describe("maasBFFUnavailableResponse", func() {
	var (
		app *App
		w   *httptest.ResponseRecorder
		r   *http.Request
	)

	BeforeEach(func() {
		cfg := config.EnvConfig{}
		app = &App{
			config: cfg,
			logger: slog.Default(),
		}
		w = httptest.NewRecorder()
		r = httptest.NewRequest(http.MethodGet, "/test", nil)
	})

	It("should return 503 with service_unavailable code", func() {
		app.maasBFFUnavailableResponse(w, r)

		Expect(w.Code).To(Equal(http.StatusServiceUnavailable))
		var response ErrorEnvelope
		Expect(json.Unmarshal(w.Body.Bytes(), &response)).To(Succeed())
		Expect(response.Error.Code).To(Equal("service_unavailable"))
		Expect(response.Error.Message).To(Equal("MaaS BFF is not available"))
	})
})
