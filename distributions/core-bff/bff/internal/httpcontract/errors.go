// Package httpcontract implements the shared Core BFF failure and correlation contract.
package httpcontract

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"syscall"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Authentication sentinels carry cause information without credential values.
var (
	ErrCredentialsMissing = errors.New("credentials missing")
	ErrCredentialsInvalid = errors.New("credentials invalid")
	ErrCredentialsExpired = errors.New("credentials expired")
	ErrIdentityUnresolved = errors.New("identity unresolved")
)

// ErrorPayload contains the stable code, safe message and request correlation for a BFF failure.
type ErrorPayload struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId"`
}

// HTTPError pairs a BFF error envelope with its HTTP response status.
type HTTPError struct {
	StatusCode int          `json:"-"`
	Error      ErrorPayload `json:"error"`
}

// Local selects safe catalog text rather than reflecting the cause or caller input.
func Local(status int) *HTTPError {
	code, message := "INTERNAL_SERVER_ERROR", "the server encountered a problem and could not process your request"
	switch status {
	case 400:
		code, message = "BAD_REQUEST", "invalid request"
	case 401:
		code, message = "UNAUTHORIZED", "Access unauthorized"
	case 403:
		code, message = "FORBIDDEN", "insufficient permissions for this operation"
	case 404:
		code, message = "NOT_FOUND", "the requested resource could not be found"
	case 405:
		code, message = "METHOD_NOT_ALLOWED", "the method is not supported for this resource"
	case 409:
		code, message = "CONFLICT", "the resource was modified by another request"
	case 422:
		code, message = "VALIDATION_FAILED", "request validation failed"
	case 502:
		code, message = "BAD_GATEWAY", "upstream connection failed"
	case 503:
		code, message = "SERVICE_UNAVAILABLE", "the Kubernetes API is temporarily unavailable"
	case 504:
		code, message = "GATEWAY_TIMEOUT", "the Kubernetes request timed out"
	}
	return &HTTPError{StatusCode: status, Error: ErrorPayload{Code: code, Message: message}}
}

// Classify handles local failures only. WriteError preserves Kubernetes APIStatus first.
func Classify(err error, fallback int) *HTTPError {
	var ne net.Error
	var dns *net.DNSError
	switch {
	case errors.Is(err, ErrCredentialsMissing), errors.Is(err, ErrCredentialsInvalid), errors.Is(err, ErrCredentialsExpired), errors.Is(err, ErrIdentityUnresolved):
		return Local(401)
	case errors.Is(err, context.DeadlineExceeded), errors.As(err, &ne) && ne.Timeout():
		return Local(504)
	case errors.As(err, &dns), errors.Is(err, syscall.ECONNREFUSED), errors.Is(err, syscall.ENETUNREACH), errors.Is(err, syscall.EHOSTUNREACH):
		return Local(503)
	case errors.As(err, &ne):
		return Local(502)
	default:
		return Local(fallback)
	}
}

// WriteLocal writes a correlated BFF failure using the safe message catalog.
func WriteLocal(w http.ResponseWriter, r *http.Request, status int) {
	if status < 400 || status > 599 {
		status = http.StatusInternalServerError
	}
	e := Local(status)
	e.Error.RequestID = EnsureID(w, r)
	if isKubernetesProxyRequest(r) {
		// Kubernetes SDK calls require a failure Status to reject local errors.
		writeJSON(w, r, status, metav1.Status{
			TypeMeta: metav1.TypeMeta{APIVersion: "v1", Kind: "Status"},
			Status:   metav1.StatusFailure, Code: int32(status),
			Reason: "DashboardProxyError", Message: e.Error.Message,
			Details: &metav1.StatusDetails{Causes: []metav1.StatusCause{{Type: metav1.CauseType(e.Error.Code), Message: e.Error.Message}}},
		})
		return
	}
	writeJSON(w, r, status, e)
}

func isKubernetesProxyRequest(r *http.Request) bool {
	if requestState, ok := r.Context().Value(stateKey{}).(*state); ok && requestState.kubernetesProxy {
		return true
	}
	path := strings.TrimPrefix(r.URL.Path, constants.BFFPathPrefix)
	return path == strings.TrimSuffix(constants.K8sProxyPrefix, "/") || strings.HasPrefix(path, constants.K8sProxyPrefix)
}

// WriteBFF preserves existing public domain codes while selecting fixed safe text.
func WriteBFF(w http.ResponseWriter, r *http.Request, e *HTTPError) {
	safe := Local(e.StatusCode)
	switch e.Error.Code {
	case "INVALID_REQUEST":
		safe.Error.Code = "INVALID_REQUEST"
		safe.Error.Message = "invalid connection test request"
	case "UNSUPPORTED_TYPE":
		safe.Error.Code = "UNSUPPORTED_TYPE"
		safe.Error.Message = "connection type is not supported"
	case "PROBE_BUSY":
		safe.Error.Code = "PROBE_BUSY"
		safe.Error.Message = "Connection test queue is full, please retry later"
	}
	safe.Error.RequestID = EnsureID(w, r)
	writeJSON(w, r, safe.StatusCode, safe)
}

// WriteError preserves wrapped Kubernetes Status failures or classifies a local failure.
func WriteError(w http.ResponseWriter, r *http.Request, err error, fallback int) {
	var s k8serrors.APIStatus
	if errors.As(err, &s) {
		status := s.Status()
		code := int(status.Code)
		if code < 400 || code > 599 {
			code = 500
		}
		WriteStatus(w, r, code, status)
		return
	}
	WriteLocal(w, r, Classify(err, fallback).StatusCode)
}

// WriteStatus writes a sanitized Kubernetes Status and applicable retry metadata.
func WriteStatus(w http.ResponseWriter, r *http.Request, code int, status metav1.Status) {
	EnsureID(w, r)
	s := SanitizeStatus(status, code)
	if s.Details != nil && s.Details.RetryAfterSeconds > 0 {
		w.Header().Set(constants.HeaderRetryAfter, strconv.Itoa(int(s.Details.RetryAfterSeconds)))
	}
	writeJSON(w, r, code, s)
}

func writeJSON(w http.ResponseWriter, r *http.Request, status int, value any) {
	if Committed(w) {
		panic(http.ErrAbortHandler)
	}
	if r.Context().Err() != nil {
		panic(http.ErrAbortHandler)
	}
	if audit := AuditID(r.Context()); audit != "" {
		w.Header().Set(AuditIDHeader, audit)
	}
	w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
	w.Header().Del(constants.HeaderContentLength)
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		panic(http.ErrAbortHandler)
	}
}

var schemaName = regexp.MustCompile(`^[a-zA-Z0-9_.\-/]{1,253}$`)
var bracketKey = regexp.MustCompile(`\[[^\]]*\]`)
var arrayIndex = regexp.MustCompile(`^\[[0-9]{1,10}\]$`)
var fieldPath = regexp.MustCompile(`^[a-zA-Z0-9_.\-/]+(\[[0-9]{1,10}\][a-zA-Z0-9_.\-/]*)*$`)
var sensitiveMapKey = regexp.MustCompile(`(^|\.)(data|stringData|annotations|labels)\[[^\]]*\]`)
var sensitiveDottedMapKey = regexp.MustCompile(`(^|\.)(data|stringData|annotations|labels)\..*$`)

func safeFieldPath(path string) string {
	// Kubernetes formats both map keys and array positions in brackets. Numeric
	// Secret data keys are still map keys and must not be retained as positions.
	path = sensitiveMapKey.ReplaceAllString(path, "${1}${2}")
	path = sensitiveDottedMapKey.ReplaceAllString(path, "${1}${2}")
	path = bracketKey.ReplaceAllStringFunc(path, func(segment string) string {
		if arrayIndex.MatchString(segment) {
			return segment
		}
		return ""
	})
	if len(path) <= 253 && fieldPath.MatchString(path) {
		return path
	}
	return ""
}

func safeSchemaName(s string) string {
	if schemaName.MatchString(s) {
		return s
	}
	return ""
}

// SanitizeStatus preserves machine-readable semantics without upstream free text or object identities.
func SanitizeStatus(in metav1.Status, code int) metav1.Status {
	if code < 400 || code > 599 {
		code = 500
	}
	reason := in.Reason
	if _, ok := reasonMessages[reason]; !ok || reason == "" {
		reason = reasonForCode(code)
	}
	out := metav1.Status{TypeMeta: metav1.TypeMeta{APIVersion: "v1", Kind: "Status"}, Status: metav1.StatusFailure, Code: int32(code), Reason: reason, Message: reasonMessages[reason]}
	if in.Details != nil {
		d := in.Details
		out.Details = &metav1.StatusDetails{Group: safeSchemaName(d.Group), Kind: safeSchemaName(d.Kind), RetryAfterSeconds: d.RetryAfterSeconds}
		for _, cause := range d.Causes {
			out.Details.Causes = append(out.Details.Causes, sanitizeCause(cause))
		}
		out.Message = diagnosticSummary(out.Message, out.Details.Causes)
	}
	return out
}

var reasonMessages = map[metav1.StatusReason]string{
	metav1.StatusReasonStoreReadError:        "the server encountered an error reading the resource",
	metav1.StatusReasonUnknown:               "the server encountered an error processing your request",
	metav1.StatusReasonUnauthorized:          "authentication required",
	metav1.StatusReasonForbidden:             "the requested operation is forbidden",
	metav1.StatusReasonNotFound:              "the requested resource could not be found",
	metav1.StatusReasonAlreadyExists:         "the resource already exists",
	metav1.StatusReasonConflict:              "the resource was modified by another request",
	metav1.StatusReasonGone:                  "the requested resource is no longer available",
	metav1.StatusReasonExpired:               "the request has expired",
	metav1.StatusReasonInvalid:               "request validation failed",
	metav1.StatusReasonBadRequest:            "invalid request",
	metav1.StatusReasonMethodNotAllowed:      "the method is not supported for this resource",
	metav1.StatusReasonNotAcceptable:         "the requested representation is not available",
	metav1.StatusReasonRequestEntityTooLarge: "the request is too large",
	metav1.StatusReasonUnsupportedMediaType:  "unsupported media type",
	metav1.StatusReasonTimeout:               "the Kubernetes request timed out",
	metav1.StatusReasonServerTimeout:         "the Kubernetes request timed out",
	metav1.StatusReasonTooManyRequests:       "too many requests",
	metav1.StatusReasonInternalError:         "the server encountered an error processing your request",
	metav1.StatusReasonServiceUnavailable:    "the service is temporarily unavailable",
}

func reasonForCode(code int) metav1.StatusReason {
	switch code {
	case 400:
		return metav1.StatusReasonBadRequest
	case 401:
		return metav1.StatusReasonUnauthorized
	case 403:
		return metav1.StatusReasonForbidden
	case 404:
		return metav1.StatusReasonNotFound
	case 405:
		return metav1.StatusReasonMethodNotAllowed
	case 406:
		return metav1.StatusReasonNotAcceptable
	case 409:
		return metav1.StatusReasonConflict
	case 410:
		return metav1.StatusReasonGone
	case 413:
		return metav1.StatusReasonRequestEntityTooLarge
	case 415:
		return metav1.StatusReasonUnsupportedMediaType
	case 422:
		return metav1.StatusReasonInvalid
	case 429:
		return metav1.StatusReasonTooManyRequests
	case 503:
		return metav1.StatusReasonServiceUnavailable
	case 504:
		return metav1.StatusReasonTimeout
	default:
		return metav1.StatusReasonInternalError
	}
}

// SafeErrorCode is the only error-derived value allowed in request logs.
func SafeErrorCode(err error) string {
	switch {
	case errors.Is(err, ErrCredentialsMissing):
		return "CREDENTIALS_MISSING"
	case errors.Is(err, ErrCredentialsInvalid):
		return "CREDENTIALS_INVALID"
	case errors.Is(err, ErrCredentialsExpired):
		return "CREDENTIALS_EXPIRED"
	case errors.Is(err, ErrIdentityUnresolved):
		return "IDENTITY_UNRESOLVED"
	}
	var s k8serrors.APIStatus
	if errors.As(err, &s) {
		return string(SanitizeStatus(s.Status(), int(s.Status().Code)).Reason)
	}
	if errors.Is(err, context.Canceled) {
		return "CANCELED"
	}
	return Classify(err, 500).Error.Code
}
