package integrations

import "fmt"

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type HTTPError struct {
	StatusCode int `json:"-"`
	ErrorResponse
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %s - %s", e.StatusCode, e.Code, e.Message)
}
