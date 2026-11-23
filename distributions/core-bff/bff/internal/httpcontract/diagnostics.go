package httpcontract

import (
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Three bounded field paths keep the generated summary below 1 KiB.
const maxDiagnosticFields = 3

var causeMessages = map[metav1.CauseType]string{
	metav1.CauseTypeFieldValueNotFound:       "referenced value not found",
	metav1.CauseTypeFieldValueRequired:       "required field",
	metav1.CauseTypeFieldValueDuplicate:      "duplicate field value",
	metav1.CauseTypeFieldValueInvalid:        "invalid field value",
	metav1.CauseTypeFieldValueNotSupported:   "unsupported field value",
	metav1.CauseTypeUnexpectedServerResponse: "unexpected upstream response",
	metav1.CauseTypeForbidden:                "field is forbidden",
	metav1.CauseTypeTooLong:                  "field value is too long",
	metav1.CauseTypeTooMany:                  "too many field values",
	metav1.CauseTypeTypeInvalid:              "invalid field type",
	metav1.CauseTypeInternal:                 "field validation failed",
	metav1.CauseTypeFieldManagerConflict:     "field is managed by another client",
	metav1.CauseTypeResourceVersionTooLarge:  "requested resource version is too large",
}

func sanitizeCause(c metav1.StatusCause) metav1.StatusCause {
	message, ok := causeMessages[c.Type]
	if !ok {
		c.Type = metav1.CauseTypeFieldValueInvalid
		message = causeMessages[c.Type]
	}
	return metav1.StatusCause{Type: c.Type, Field: safeFieldPath(c.Field), Message: message}
}

func diagnosticSummary(base string, causes []metav1.StatusCause) string {
	var fields []string
	for _, cause := range causes {
		if cause.Field == "" {
			continue
		}
		fields = append(fields, cause.Field+": "+cause.Message)
		if len(fields) == maxDiagnosticFields {
			break
		}
	}
	if len(fields) == 0 {
		return base
	}
	return base + ": " + strings.Join(fields, "; ")
}
