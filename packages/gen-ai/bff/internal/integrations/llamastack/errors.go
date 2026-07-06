package llamastack

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/openai/openai-go/v2"
)

// LlamaStackError represents LlamaStack-specific errors
type LlamaStackError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	Type       string `json:"type,omitempty"`       // OpenAI error type (e.g., "invalid_request_error")
	ErrorCode  string `json:"error_code,omitempty"` // OpenAI error code (e.g., "rate_limit_exceeded")
	Param      string `json:"param,omitempty"`      // Parameter that caused the error
	Component  string `json:"-"`                    // Which subsystem caused the error (e.g., "bff", "ogx", "model"). Set at creation time, sent to frontend in ErrorDetail.Component. See Component* constants
	StatusCode int    `json:"-"`
}

func (e *LlamaStackError) Error() string {
	return fmt.Sprintf("LlamaStack error [%s]: %s", e.Code, e.Message)
}

// LlamaStack error codes
// BFF error codes — used in LlamaStackError.Code for errors the BFF raises
// itself (validation, auth, connection failures). These are distinct from OGX
// response error codes below.
const (
	ErrCodeConnectionFailed  = "CONNECTION_FAILED"
	ErrCodeTimeout           = "TIMEOUT"
	ErrCodeServerUnavailable = "SERVER_UNAVAILABLE"
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeInvalidRequest    = "INVALID_REQUEST"
	ErrCodeNotFound          = "NOT_FOUND"
	ErrCodeInternalError     = "INTERNAL_ERROR"
)

// Component identifies which subsystem produced an error. The frontend uses
// this to select user-facing microcopy and to classify errors as partial
// (warning) vs full (danger) failures.
const (
	ComponentBFF   = "bff"
	ComponentOGX   = "ogx"
	ComponentRAG   = "rag"
	ComponentModel = "model"
	ComponentASR   = "asr"
)

func NewLlamaStackError(code, message string, statusCode int) *LlamaStackError {
	return &LlamaStackError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

func NewLlamaStackErrorWithDetails(code, message, errorType, errorCode, param, component string, statusCode int) *LlamaStackError {
	return &LlamaStackError{
		Code:       code,
		Message:    message,
		Type:       errorType,
		ErrorCode:  errorCode,
		Param:      param,
		Component:  component,
		StatusCode: statusCode,
	}
}

func NewConnectionError(message string) *LlamaStackError {
	e := NewLlamaStackError(ErrCodeConnectionFailed, message, 502)
	e.Component = ComponentOGX
	return e
}

func NewServerUnavailableError(message string) *LlamaStackError {
	e := NewLlamaStackError(ErrCodeServerUnavailable, message, 503)
	e.Component = ComponentOGX
	return e
}

func NewUnauthorizedError(message string) *LlamaStackError {
	e := NewLlamaStackError(ErrCodeUnauthorized, message, 401)
	e.Component = ComponentBFF
	return e
}

func NewInvalidRequestError(message string) *LlamaStackError {
	e := NewLlamaStackError(ErrCodeInvalidRequest, message, 400)
	e.Component = ComponentBFF
	return e
}

func NewNotFoundError(message string) *LlamaStackError {
	e := NewLlamaStackError(ErrCodeNotFound, message, 404)
	e.Component = ComponentBFF
	return e
}

// OGX response error codes — the complete set of codes that OGX may return in
// a response.failed event's error.code field. Any provider error code not in
// this set is clamped to OGXErrServerError by OGX before emission.
//
// OGX errors reach the BFF through three paths, each with a different code vocabulary:
//
//  1. response.failed SSE events — error.code is one of these OGXErr* constants.
//     Handled in-loop by the streaming handlers before being forwarded to the client.
//
//  2. type:"error" SSE events — code is an HTTP status as a string (e.g. "404", "500").
//     Emitted by OGX's SSE generator (ogx_api/inference/fastapi_routes.py) via
//     OpenAIErrorResponse.from_message(detail, code=str(status_code)).
//     Handled in-loop by the streaming handlers.
//
//  3. Non-streaming HTTP error responses — body is {"error": {"message": "..."}} with
//     no "code" field. OGX's global_exception_handler calls
//     OpenAIErrorResponse.from_message(detail) without a code argument, so the Go
//     SDK's openai.Error.Code is always empty. wrapClientError falls back to BFF
//     internal codes (ErrCodeNotFound, ErrCodeInternalError, etc.) based on HTTP status.
//
// Note: OGX does not currently populate the OpenAI-style semantic error codes
// (e.g. "tool_not_found", "model_not_found", "resource_not_found") in any of
// these paths. If OGX adds structured error codes in the future, expand
// ResolveComponent and isRetriable accordingly.
//
// Source: ogx/providers/inline/responses/builtin/responses/streaming.py
// (_VALID_RESPONSE_ERROR_CODES)
const (
	OGXErrServerError                 = "server_error"
	OGXErrRateLimitExceeded           = "rate_limit_exceeded"
	OGXErrInvalidPrompt               = "invalid_prompt"
	OGXErrVectorStoreTimeout          = "vector_store_timeout"
	OGXErrInvalidImage                = "invalid_image"
	OGXErrInvalidImageFormat          = "invalid_image_format"
	OGXErrInvalidBase64Image          = "invalid_base64_image"
	OGXErrInvalidImageURL             = "invalid_image_url"
	OGXErrImageTooLarge               = "image_too_large"
	OGXErrImageTooSmall               = "image_too_small"
	OGXErrImageParseError             = "image_parse_error"
	OGXErrImageContentPolicyViolation = "image_content_policy_violation"
	OGXErrInvalidImageMode            = "invalid_image_mode"
	OGXErrImageFileTooLarge           = "image_file_too_large"
	OGXErrUnsupportedImageMediaType   = "unsupported_image_media_type"
	OGXErrEmptyImageFile              = "empty_image_file"
	OGXErrFailedToDownloadImage       = "failed_to_download_image"
	OGXErrImageFileNotFound           = "image_file_not_found"
)

// ResolveComponent maps an OGX response.failed error code to the subsystem
// that produced it. Used by streaming handlers to set the "component" field
// in error events sent to the frontend. Codes not explicitly mapped default
// to "ogx" (the OGX server itself).
func ResolveComponent(errorCode string) string {
	switch errorCode {
	// RAG (OGX response.failed code)
	case OGXErrVectorStoreTimeout:
		return ComponentRAG
	// Model / inference (OGX response.failed codes)
	case OGXErrInvalidPrompt,
		OGXErrInvalidImage, OGXErrInvalidImageFormat, OGXErrInvalidBase64Image,
		OGXErrInvalidImageURL, OGXErrImageTooLarge, OGXErrImageTooSmall,
		OGXErrImageParseError, OGXErrImageContentPolicyViolation,
		OGXErrInvalidImageMode, OGXErrImageFileTooLarge,
		OGXErrUnsupportedImageMediaType, OGXErrEmptyImageFile,
		OGXErrFailedToDownloadImage, OGXErrImageFileNotFound:
		return ComponentModel
	default:
		return ComponentOGX
	}
}

// wrapClientError wraps errors from the llamastack OpenAI client into our LlamaStackError type for consistent error handling.
// Network errors (connection refused, timeout) are wrapped as ConnectionError.
// API errors (openai.Error) are wrapped with appropriate error codes based on status.
// This ensures all errors can be handled uniformly by handleLlamaStackClientError.
// The operation parameter should be the function name that failed (e.g. "ListModels", "CreateResponse").
func wrapClientError(err error, operation string) *LlamaStackError {
	if err == nil {
		return nil
	}

	// Check for network-level errors (connection refused, timeout, DNS failures, etc.)
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		message := fmt.Sprintf("failed to connect to LlamaStack server on operation %s: %s", operation, urlErr.Err.Error())
		return NewConnectionError(message)
	}

	// Check for API-level errors (status codes from LlamaStack service)
	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		llamastackErrorMsg := apiErr.Message
		if llamastackErrorMsg == "" {
			// if the error message is empty, fall back to the full error string
			llamastackErrorMsg = apiErr.Error()
		}

		// Prefix message with operation context for clarity
		message := fmt.Sprintf("LlamaStack error on operation %s: %s", operation, llamastackErrorMsg)

		// Extract structured error fields from OpenAI error response
		// These fields contain semantic error information (e.g., "rate_limit_exceeded")
		errorType := apiErr.Type
		errorCode := apiErr.Code
		param := apiErr.Param
		component := ResolveComponent(errorCode)

		// Map openai.Error to LlamaStackError based on status code
		// Use the structured error fields for better categorization downstream
		switch apiErr.StatusCode {
		case http.StatusBadRequest:
			return NewLlamaStackErrorWithDetails(ErrCodeInvalidRequest, message, errorType, errorCode, param, component, apiErr.StatusCode)
		case http.StatusUnauthorized:
			return NewLlamaStackErrorWithDetails(ErrCodeUnauthorized, message, errorType, errorCode, param, component, apiErr.StatusCode)
		case http.StatusNotFound:
			return NewLlamaStackErrorWithDetails(ErrCodeNotFound, message, errorType, errorCode, param, component, apiErr.StatusCode)
		case http.StatusServiceUnavailable, http.StatusGatewayTimeout, http.StatusRequestTimeout:
			return NewLlamaStackErrorWithDetails(ErrCodeServerUnavailable, message, errorType, errorCode, param, component, apiErr.StatusCode)
		case http.StatusTooManyRequests:
			// 429 rate limit errors
			return NewLlamaStackErrorWithDetails(ErrCodeServerUnavailable, message, errorType, errorCode, param, component, apiErr.StatusCode)
		default:
			// For other API errors, return as internal error with original message
			return NewLlamaStackErrorWithDetails(ErrCodeInternalError, message, errorType, errorCode, param, component, apiErr.StatusCode)
		}
	}

	// For other unknown errors, wrap as internal error
	e := NewLlamaStackError(ErrCodeInternalError, fmt.Sprintf("unexpected error on operation %s: %s", operation, err.Error()), 0)
	e.Component = ComponentOGX
	return e
}
