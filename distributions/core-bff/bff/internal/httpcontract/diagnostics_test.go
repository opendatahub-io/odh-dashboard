package httpcontract

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestValidationDiagnosticsUseOnlySafeStructuredFields(t *testing.T) {
	status := SanitizeStatus(metav1.Status{
		Reason: metav1.StatusReasonInvalid, Message: "CANARY_ONLY_UPSTREAM_SECRET",
		Details: &metav1.StatusDetails{Name: "CANARY_NAME", Causes: []metav1.StatusCause{
			{Type: metav1.CauseTypeFieldValueRequired, Field: "spec.image", Message: "CANARY_VALUE"},
			{Type: metav1.CauseTypeFieldValueInvalid, Field: "spec.replicas", Message: "CANARY_VALUE"},
			{Type: metav1.CauseTypeFieldValueNotSupported, Field: "spec.args[1]", Message: "CANARY_VALUE"},
			{Type: "CANARY_REASON", Field: "metadata.annotations[CANARY_KEY]", Message: "CANARY_VALUE"},
		}},
	}, 422)
	require.Equal(t, "request validation failed: spec.image: required field; spec.replicas: invalid field value; spec.args[1]: unsupported field value", status.Message)
	require.Len(t, status.Details.Causes, 4, "the bounded summary must not discard structured causes")
	require.Equal(t, "metadata.annotations", status.Details.Causes[3].Field)
	require.Equal(t, metav1.CauseTypeFieldValueInvalid, status.Details.Causes[3].Type)
	body, err := json.Marshal(status)
	require.NoError(t, err)
	require.NotContains(t, string(body), "CANARY")
}

func TestValidationDiagnosticSummaryIsBounded(t *testing.T) {
	var causes []metav1.StatusCause
	for range 10 {
		causes = append(causes, metav1.StatusCause{
			Type:  metav1.CauseTypeFieldManagerConflict,
			Field: "spec." + strings.Repeat("a", 248),
		})
	}
	status := SanitizeStatus(metav1.Status{Reason: metav1.StatusReasonConflict, Details: &metav1.StatusDetails{Causes: causes}}, 409)
	require.Less(t, len(status.Message), 1024)
	require.Equal(t, 3, strings.Count(status.Message, "field is managed by another client"))
	require.Len(t, status.Details.Causes, len(causes))
}

func TestOpaqueDiagnosticTextIsNeverForwarded(t *testing.T) {
	for _, tc := range []struct {
		reason metav1.StatusReason
		code   int
	}{
		{metav1.StatusReasonForbidden, 403},
		{metav1.StatusReasonInvalid, 422},
	} {
		status := SanitizeStatus(metav1.Status{
			Reason: tc.reason, Message: "webhook denied: CANARY_ONLY_UPSTREAM_SECRET",
			Details: &metav1.StatusDetails{Causes: []metav1.StatusCause{{Type: metav1.CauseTypeForbidden, Message: "CANARY_VALUE"}}},
		}, tc.code)
		require.Equal(t, reasonMessages[tc.reason], status.Message)
		body, err := json.Marshal(status)
		require.NoError(t, err)
		require.NotContains(t, string(body), "CANARY")
	}
}
