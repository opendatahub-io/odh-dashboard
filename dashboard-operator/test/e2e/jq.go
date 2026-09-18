package e2e

import (
	"fmt"

	"github.com/opendatahub-io/odh-platform-utilities/framework/utils/test/matchers/jq"
)

func evaluateJQMatch(actual any, expression string) (bool, string) {
	matcher := jq.Match("%s", expression)
	matched, err := matcher.Match(actual)
	if err != nil {
		return false, fmt.Sprintf("failed to evaluate JQ expression %s: %v", expression, err)
	}
	if !matched {
		return false, fmt.Sprintf("JQ expression %s did not match", expression)
	}

	return true, ""
}
