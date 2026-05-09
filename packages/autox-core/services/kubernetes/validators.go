package kubernetes

import (
	"fmt"
	"regexp"
)

// DNS-1123 label must consist of lower case alphanumeric characters or '-',
// must start and end with an alphanumeric character, and cannot contain dots
// Used for Kubernetes namespaces
var dns1123LabelRegex = regexp.MustCompile(`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`)

// DNS-1123 subdomain must consist of lower case alphanumeric characters, '-' or '.',
// and must start and end with an alphanumeric character
// Used for most Kubernetes resource names
var dns1123SubdomainRegex = regexp.MustCompile(`^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$`)

// ValidateNamespaceName validates that a namespace name follows Kubernetes DNS-1123 label rules
// Namespaces are DNS-1123 labels (no dots allowed), not subdomains
func ValidateNamespaceName(name string) error {
	if name == "" {
		return &ValidationError{Field: "namespace", Message: "namespace name cannot be empty"}
	}
	if len(name) > 63 {
		return &ValidationError{Field: "namespace", Message: fmt.Sprintf("namespace name must be 63 characters or less (got %d)", len(name))}
	}
	if !dns1123LabelRegex.MatchString(name) {
		return &ValidationError{Field: "namespace", Message: "namespace name must consist of lowercase alphanumeric characters or '-', must start and end with an alphanumeric character, and cannot contain dots"}
	}
	return nil
}

// ValidateResourceName validates that a resource name follows Kubernetes DNS-1123 subdomain rules
// Most Kubernetes resources are DNS-1123 subdomains (dots allowed), not labels
func ValidateResourceName(resourceType, name string) error {
	if name == "" {
		return &ValidationError{Field: resourceType, Message: fmt.Sprintf("%s name cannot be empty", resourceType)}
	}
	if len(name) > 253 {
		return &ValidationError{Field: resourceType, Message: fmt.Sprintf("%s name must be 253 characters or less (got %d)", resourceType, len(name))}
	}
	if !dns1123SubdomainRegex.MatchString(name) {
		return &ValidationError{Field: resourceType, Message: fmt.Sprintf("%s name must consist of lowercase alphanumeric characters, '-', or '.', and must start and end with an alphanumeric character", resourceType)}
	}
	return nil
}
