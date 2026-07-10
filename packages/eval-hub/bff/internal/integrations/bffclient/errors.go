package bffclient

import "fmt"

const (
	ErrCodeConnectionFailed = "CONNECTION_FAILED"
	ErrCodeTimeout          = "TIMEOUT"
	ErrCodeUnauthorized     = "UNAUTHORIZED"
	ErrCodeForbidden        = "FORBIDDEN"
	ErrCodeNotFound         = "NOT_FOUND"
	ErrCodeBadRequest       = "BAD_REQUEST"
	ErrCodeInternalError    = "INTERNAL_ERROR"
	ErrCodeInvalidResponse  = "INVALID_RESPONSE"
	ErrCodeServiceDown      = "SERVICE_UNAVAILABLE"
	ErrCodePathNotAllowed   = "PATH_NOT_ALLOWED"
)

type BFFClientError struct {
	Code       string
	Message    string
	Target     BFFTarget
	StatusCode int
}

func (e *BFFClientError) Error() string {
	return fmt.Sprintf("[%s] %s BFF error: %s", e.Code, e.Target, e.Message)
}

func NewBFFClientErrorWithTarget(code, message string, target BFFTarget, statusCode int) *BFFClientError {
	return &BFFClientError{Code: code, Message: message, Target: target, StatusCode: statusCode}
}

func NewConnectionError(target BFFTarget, message string) *BFFClientError {
	return &BFFClientError{Code: ErrCodeConnectionFailed, Message: message, Target: target, StatusCode: 502}
}

func NewUnauthorizedError(target BFFTarget, message string) *BFFClientError {
	return &BFFClientError{Code: ErrCodeUnauthorized, Message: message, Target: target, StatusCode: 401}
}

func NewForbiddenError(target BFFTarget, message string) *BFFClientError {
	return &BFFClientError{Code: ErrCodeForbidden, Message: message, Target: target, StatusCode: 403}
}

func NewNotFoundError(target BFFTarget, message string) *BFFClientError {
	return &BFFClientError{Code: ErrCodeNotFound, Message: message, Target: target, StatusCode: 404}
}

func NewBadRequestError(target BFFTarget, message string) *BFFClientError {
	return &BFFClientError{Code: ErrCodeBadRequest, Message: message, Target: target, StatusCode: 400}
}

func NewInvalidResponseError(target BFFTarget, message string) *BFFClientError {
	return &BFFClientError{Code: ErrCodeInvalidResponse, Message: message, Target: target, StatusCode: 502}
}

func NewServerUnavailableError(target BFFTarget) *BFFClientError {
	return &BFFClientError{Code: ErrCodeServiceDown, Message: fmt.Sprintf("%s BFF is unavailable", target), Target: target, StatusCode: 503}
}

func NewPathNotAllowedError(target BFFTarget, path string) *BFFClientError {
	return &BFFClientError{
		Code:       ErrCodePathNotAllowed,
		Message:    fmt.Sprintf("path %q is not in the allowlist for target %s", path, target),
		Target:     target,
		StatusCode: 403,
	}
}
