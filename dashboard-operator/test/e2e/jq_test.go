package e2e

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestEvaluateJQMatch(t *testing.T) {
	testCases := []struct {
		name            string
		actual          any
		expression      string
		wantMatch       bool
		wantMessagePart string
		sensitive       string
	}{
		{
			name:       "match with literal percent",
			actual:     map[string]any{"value": "a%b"},
			expression: `.value | test("a%b")`,
			wantMatch:  true,
		},
		{
			name:            "mismatch preserves expression",
			actual:          map[string]any{"token": "secret-token"},
			expression:      `.status == "ready"`,
			wantMessagePart: `.status == "ready"`,
			sensitive:       "secret-token",
		},
		{
			name:            "evaluation error preserves details",
			actual:          map[string]any{"token": "secret-token"},
			expression:      `.status ==`,
			wantMessagePart: "unexpected EOF",
			sensitive:       "secret-token",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			matched, failureMessage := evaluateJQMatch(testCase.actual, testCase.expression)
			require.Equal(t, testCase.wantMatch, matched)
			if testCase.wantMessagePart == "" {
				require.Empty(t, failureMessage)
			} else {
				require.Contains(t, failureMessage, testCase.wantMessagePart)
			}
			if testCase.sensitive != "" {
				require.NotContains(t, failureMessage, testCase.sensitive)
			}
		})
	}
}
