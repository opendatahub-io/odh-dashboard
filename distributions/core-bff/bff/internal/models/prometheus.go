package models

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// PrometheusQueryRequest is the POST body sent by the frontend.
type PrometheusQueryRequest struct {
	Query string `json:"query"`
}

// PrometheusQueryResponse is the envelope returned to the frontend.
type PrometheusQueryResponse struct {
	Code     int             `json:"code"`
	Response json.RawMessage `json:"response"`
}

// PrometheusHTTPError is implemented by Prometheus errors that map to a specific
// HTTP status and client-facing response body.
type PrometheusHTTPError interface {
	error
	HTTPStatus() int
	ResponseBody() json.RawMessage
}

// PrometheusUnavailableError indicates Prometheus is not configured or unreachable.
type PrometheusUnavailableError struct {
	Reason string
}

func (e *PrometheusUnavailableError) Error() string {
	return fmt.Sprintf("Prometheus service is not available: %s", e.Reason)
}

func (e *PrometheusUnavailableError) HTTPStatus() int { return http.StatusServiceUnavailable }

func (e *PrometheusUnavailableError) ResponseBody() json.RawMessage {
	return []byte(`"Prometheus service is not available"`)
}

// PrometheusUnparsableError indicates a Prometheus response could not be decoded.
type PrometheusUnparsableError struct {
	Reason string
}

func (e *PrometheusUnparsableError) Error() string {
	return fmt.Sprintf("unprocessable prometheus response: %s", e.Reason)
}

func (e *PrometheusUnparsableError) HTTPStatus() int { return http.StatusUnprocessableEntity }

func (e *PrometheusUnparsableError) ResponseBody() json.RawMessage {
	return []byte(`"Unprocessable prometheus response"`)
}

// PrometheusQueryError indicates Prometheus returned status:"error" in its response envelope.
type PrometheusQueryError struct {
	Message string
}

func (e *PrometheusQueryError) Error() string { return e.Message }

func (e *PrometheusQueryError) HTTPStatus() int { return http.StatusBadRequest }

func (e *PrometheusQueryError) ResponseBody() json.RawMessage {
	escaped, _ := json.Marshal(e.Message)
	return escaped
}

// PrometheusUpstreamError indicates Prometheus returned a non-2xx HTTP status.
type PrometheusUpstreamError struct {
	StatusCode int
	Body       string
}

func (e *PrometheusUpstreamError) Error() string {
	return fmt.Sprintf("cannot fetch prometheus data, status %d: %s", e.StatusCode, e.Body)
}

func (e *PrometheusUpstreamError) HTTPStatus() int { return e.StatusCode }

func (e *PrometheusUpstreamError) ResponseBody() json.RawMessage {
	escaped, _ := json.Marshal(fmt.Sprintf("Cannot fetch prometheus data, %s", e.Body))
	return escaped
}
