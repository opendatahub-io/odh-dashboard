package kubernetes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestClassifyAccessReview(t *testing.T) {
	for _, tc := range []struct {
		name            string
		allowed, denied bool
		evaluationError string
		want            AccessReviewResult
	}{
		{"allowed", true, false, "", AccessReviewAllowed},
		{"allowed despite a diagnostic", true, false, "webhook timeout", AccessReviewAllowed},
		{"explicitly denied", false, true, "", AccessReviewDenied},
		{"denied despite a diagnostic", false, true, "webhook timeout", AccessReviewDenied},
		{"no opinion", false, false, "", AccessReviewDenied},
		{"no decision because an authorizer failed", false, false, "webhook timeout", AccessReviewIndeterminate},
	} {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, ClassifyAccessReview(tc.allowed, tc.denied, tc.evaluationError))
		})
	}
}
