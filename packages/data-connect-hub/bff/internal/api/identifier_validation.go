package api

import (
	"fmt"
	"regexp"
)

var canonicalUUIDPattern = regexp.MustCompile(
	`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`,
)

func isCanonicalUUID(value string) bool {
	return canonicalUUIDPattern.MatchString(value)
}

func validateID(location, parameter, value string) error {
	if value == "" {
		return fmt.Errorf("%s '%s' is required and cannot be empty", location, parameter)
	}
	if !isCanonicalUUID(value) {
		return fmt.Errorf("%s '%s' must be a valid UUID", location, parameter)
	}
	return nil
}
