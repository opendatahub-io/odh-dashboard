package models

import (
	"encoding/json"
	"fmt"
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

// PrometheusUnavailableError indicates Prometheus is not configured or unreachable.
type PrometheusUnavailableError struct {
	Reason string
}

func (e *PrometheusUnavailableError) Error() string {
	return fmt.Sprintf("Prometheus service is not available: %s", e.Reason)
}

// PrometheusUnparsableError indicates a Prometheus response could not be decoded.
type PrometheusUnparsableError struct {
	Reason string
}

func (e *PrometheusUnparsableError) Error() string {
	return fmt.Sprintf("unprocessable prometheus response: %s", e.Reason)
}

// PrometheusQueryError indicates Prometheus returned status:"error" in its response envelope.
type PrometheusQueryError struct {
	Message string
}

func (e *PrometheusQueryError) Error() string {
	return e.Message
}

// PrometheusUpstreamError indicates Prometheus returned a non-2xx HTTP status.
type PrometheusUpstreamError struct {
	StatusCode int
	Body       string
}

func (e *PrometheusUpstreamError) Error() string {
	return fmt.Sprintf("cannot fetch prometheus data, status %d: %s", e.StatusCode, e.Body)
}
