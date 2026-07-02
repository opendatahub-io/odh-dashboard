package kubernetes

import (
	"strings"

	k8svalidation "k8s.io/apimachinery/pkg/util/validation"
)

// ValidateNamespaceName validates that a namespace name follows Kubernetes DNS-1123 label rules.
// Namespaces are DNS-1123 labels (no dots allowed), not subdomains.
func ValidateNamespaceName(name string) error {
	if errs := k8svalidation.IsDNS1123Label(name); len(errs) > 0 {
		return &ValidationError{Field: "namespace", Message: strings.Join(errs, "; ")}
	}
	return nil
}

// ValidateResourceName validates that a resource name follows Kubernetes DNS-1123 subdomain rules.
// Most Kubernetes resources are DNS-1123 subdomains (dots allowed), not labels.
func ValidateResourceName(resourceType, name string) error {
	if errs := k8svalidation.IsDNS1123Subdomain(name); len(errs) > 0 {
		return &ValidationError{Field: resourceType, Message: strings.Join(errs, "; ")}
	}
	return nil
}
