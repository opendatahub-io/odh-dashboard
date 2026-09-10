package api

import (
	"bytes"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestServerErrorResponseLogsWrappedCauseWithoutURLCredentials(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/maas/models", nil)
	recorder := httptest.NewRecorder()

	serverErrorResponse(logger, recorder, req, errors.New("request failed: x509: certificate signed by unknown authority"))

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusInternalServerError)
	}
	if !strings.Contains(logs.String(), "x509: certificate signed by unknown authority") {
		t.Fatalf("logs did not retain transport cause: %s", logs.String())
	}
	if strings.Contains(recorder.Body.String(), "x509") {
		t.Fatalf("response leaked transport cause: %s", recorder.Body.String())
	}

	logs.Reset()
	serverErrorResponse(logger, httptest.NewRecorder(), req, errors.New("request failed: https://user:password@example.com"))
	if strings.Contains(logs.String(), "password") {
		t.Fatalf("logs leaked URL credentials: %s", logs.String())
	}
}
