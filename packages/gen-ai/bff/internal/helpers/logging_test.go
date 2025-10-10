package helper

import (
	"bytes"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRequestLogValuer_LogValue(t *testing.T) {
	tests := []struct {
		name           string
		setupRequest   func() *http.Request
		expectedBody   string
		unexpectedBody string
	}{
		{
			name: "multipart form request with single file",
			setupRequest: func() *http.Request {
				body := &bytes.Buffer{}
				writer := multipart.NewWriter(body)
				_ = writer.WriteField("field1", "value1")
				fileWriter, _ := writer.CreateFormFile("file", "test.txt")
				_, err := fileWriter.Write([]byte("test content"))
				if err != nil {
					t.Errorf("Failed to write to file: %v", err)
				}
				writer.Close()

				req := httptest.NewRequest(http.MethodPost, "/test", body)
				req.Header.Set("Content-Type", writer.FormDataContentType())
				return req
			},
			expectedBody:   "[multipart/form-data request with files: file:test.txt]",
			unexpectedBody: "test content", // Should not contain actual file content
		},
		{
			name: "multipart form request with multiple files",
			setupRequest: func() *http.Request {
				body := &bytes.Buffer{}
				writer := multipart.NewWriter(body)
				_ = writer.WriteField("field1", "value1")
				fileWriter1, _ := writer.CreateFormFile("file1", "test1.txt")
				_, err := fileWriter1.Write([]byte("test content 1"))
				if err != nil {
					t.Errorf("Failed to write to file 1: %v", err)
				}
				fileWriter2, _ := writer.CreateFormFile("file2", "test2.txt")
				_, err = fileWriter2.Write([]byte("test content 2"))
				if err != nil {
					t.Errorf("Failed to write to file 2: %v", err)
				}
				writer.Close()

				req := httptest.NewRequest(http.MethodPost, "/test", body)
				req.Header.Set("Content-Type", writer.FormDataContentType())
				return req
			},
			expectedBody:   "[multipart/form-data request with files: file1:test1.txt, file2:test2.txt]",
			unexpectedBody: "test content", // Should not contain actual file content
		},
		{
			name: "multipart form request without files",
			setupRequest: func() *http.Request {
				body := &bytes.Buffer{}
				writer := multipart.NewWriter(body)
				_ = writer.WriteField("field1", "value1")
				_ = writer.WriteField("field2", "value2")
				writer.Close()

				req := httptest.NewRequest(http.MethodPost, "/test", body)
				req.Header.Set("Content-Type", writer.FormDataContentType())
				return req
			},
			expectedBody:   "[multipart/form-data request - no files]",
			unexpectedBody: "value1", // Should not contain form field values
		},
		{
			name: "regular JSON request",
			setupRequest: func() *http.Request {
				body := strings.NewReader(`{"key":"value"}`)
				req := httptest.NewRequest(http.MethodPost, "/test", body)
				req.Header.Set("Content-Type", "application/json")
				return req
			},
			expectedBody: `{"key":"value"}`,
		},
		{
			name: "empty body request",
			setupRequest: func() *http.Request {
				return httptest.NewRequest(http.MethodGet, "/test", nil)
			},
			expectedBody: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := tt.setupRequest()
			valuer := RequestLogValuer{Request: req}
			result := valuer.LogValue()

			// Convert result to string for easier assertion
			attrs := result.Group()
			var bodyValue string
			for _, attr := range attrs {
				if attr.Key == "body" {
					bodyValue = attr.Value.String()
					break
				}
			}

			assert.Contains(t, bodyValue, tt.expectedBody)
			if tt.unexpectedBody != "" {
				assert.NotContains(t, bodyValue, tt.unexpectedBody)
			}
		})
	}
}

func TestHeaderLogValuer_LogValue(t *testing.T) {
	tests := []struct {
		name    string
		headers http.Header
		checkFn func(t *testing.T, value slog.Value)
	}{
		{
			name: "sensitive headers are redacted",
			headers: http.Header{
				"Authorization": []string{"Bearer token123"},
				"Cookie":        []string{"session=abc123"},
				"Safe-Header":   []string{"visible"},
			},
			checkFn: func(t *testing.T, value slog.Value) {
				attrs := value.Group()
				for _, attr := range attrs {
					switch attr.Key {
					case "Authorization", "Cookie":
						assert.Equal(t, "[REDACTED]", attr.Value.String())
					case "Safe-Header":
						assert.Equal(t, "visible", attr.Value.String())
					}
				}
			},
		},
		{
			name:    "empty headers",
			headers: http.Header{},
			checkFn: func(t *testing.T, value slog.Value) {
				assert.Empty(t, value.Group())
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			valuer := HeaderLogValuer{Header: tt.headers}
			result := valuer.LogValue()
			tt.checkFn(t, result)
		})
	}
}
