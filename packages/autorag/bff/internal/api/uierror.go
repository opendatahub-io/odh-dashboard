package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
)

var sensitiveKeySubstrings = []string{
	"password",
	"token",
	"apikey",
	"secret",
	"credential",
	"authorization",
}

func redactDetails(details map[string]any) map[string]any {
	if len(details) == 0 {
		return details
	}
	safe := make(map[string]any, len(details))
	for k, v := range details {
		lower := strings.ToLower(k)
		redacted := false
		for _, substr := range sensitiveKeySubstrings {
			if strings.Contains(lower, substr) {
				safe[k] = "[REDACTED]"
				redacted = true
				break
			}
		}
		if !redacted {
			safe[k] = v
		}
	}
	return safe
}

// UIError is a structured error response designed for frontend consumption.
// It implements the error interface for idiomatic Go error handling and can
// write itself directly as an HTTP JSON response.
type UIError struct {
	MessageID     string         `json:"messageId"`
	Reason        string         `json:"reason"`
	Status        int            `json:"status"`
	TransactionID string         `json:"transactionId"`
	Details       map[string]any `json:"details"`
	logger        *slog.Logger
}

func (e *UIError) Error() string {
	return e.Reason
}

func NewUIError(status int, messageID string, reason string) *UIError {
	return &UIError{
		MessageID: messageID,
		Reason:    reason,
		Status:    status,
		Details:   map[string]any{},
	}
}

func (e *UIError) WithDetail(key string, value any) *UIError {
	if e.Details == nil {
		e.Details = map[string]any{}
	}
	e.Details[key] = value
	return e
}

func (e *UIError) WithTracing(r *http.Request) *UIError {
	ctx := r.Context()
	if traceID, ok := ctx.Value(constants.TraceIdKey).(string); ok {
		e.TransactionID = traceID
	}
	if logger, ok := ctx.Value(constants.TraceLoggerKey).(*slog.Logger); ok {
		e.logger = logger
	}
	return e
}

func (e *UIError) WithLogger(logger *slog.Logger) *UIError {
	e.logger = logger
	return e
}

func (e *UIError) WriteTo(w http.ResponseWriter) {
	if e.logger != nil {
		e.logger.Debug("UIError response",
			"messageId", e.MessageID,
			"status", e.Status,
			"reason", e.Reason,
			"details", redactDetails(e.Details),
		)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(e.Status)
	if err := json.NewEncoder(w).Encode(e); err != nil && e.logger != nil {
		e.logger.Error("failed to write UIError response",
			"error", err,
			"messageId", e.MessageID,
			"status", e.Status,
		)
	}
}
