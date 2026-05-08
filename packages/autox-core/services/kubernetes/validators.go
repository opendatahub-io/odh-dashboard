package kubernetes

import (
	"fmt"
	"regexp"
)

// DNS-1123 subdomain must consist of lower case alphanumeric characters, '-' or '.',
// and must start and end with an alphanumeric character
var dns1123SubdomainRegex = regexp.MustCompile(`^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$`)

// ValidateNamespaceName validates that a namespace name follows Kubernetes DNS-1123 subdomain rules
func ValidateNamespaceName(name string) error {
	if name == "" {
		return &ValidationError{Field: "namespace", Message: "namespace name cannot be empty"}
	}
	if len(name) > 63 {
		return &ValidationError{Field: "namespace", Message: fmt.Sprintf("namespace name must be 63 characters or less (got %d)", len(name))}
	}
	if !dns1123SubdomainRegex.MatchString(name) {
		return &ValidationError{Field: "namespace", Message: "namespace name must consist of lowercase alphanumeric characters, '-' or '.', and must start and end with an alphanumeric character"}
	}
	return nil
}

// ValidateResourceName validates that a resource name follows Kubernetes DNS-1123 subdomain rules
func ValidateResourceName(resourceType, name string) error {
	if name == "" {
		return &ValidationError{Field: resourceType, Message: fmt.Sprintf("%s name cannot be empty", resourceType)}
	}
	if len(name) > 253 {
		return &ValidationError{Field: resourceType, Message: fmt.Sprintf("%s name must be 253 characters or less (got %d)", resourceType, len(name))}
	}
	if !dns1123SubdomainRegex.MatchString(name) {
		return &ValidationError{Field: resourceType, Message: fmt.Sprintf("%s name must consist of lowercase alphanumeric characters, '-' or '.', and must start and end with an alphanumeric character", resourceType)}
	}
	return nil
}
