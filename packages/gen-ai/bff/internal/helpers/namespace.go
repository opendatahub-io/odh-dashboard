package helper

import (
	"os"
	"strings"
)

const (
	// ServiceAccountNamespaceFile is the path to the namespace file in Kubernetes pods
	ServiceAccountNamespaceFile = "/var/run/secrets/kubernetes.io/serviceaccount/namespace"
)

// GetCurrentNamespace detects the current namespace where the application is running
// This follows the same logic as the main ODH dashboard backend:
// 1. In-cluster: Read from service account namespace file
// 2. Dev mode: Use OC_PROJECT environment variable
// 3. Fallback: Use provided default or "opendatahub"
func GetCurrentNamespace() (string, error) {
	// Try to read from service account namespace file (in-cluster)
	if _, err := os.Stat(ServiceAccountNamespaceFile); err == nil {
		data, err := os.ReadFile(ServiceAccountNamespaceFile)
		if err != nil {
			return "", err
		}
		namespace := strings.TrimSpace(string(data))
		if namespace != "" {
			return namespace, nil
		}
	}

	// Try environment variable (dev mode)
	if envNamespace := os.Getenv("OC_PROJECT"); envNamespace != "" {
		return envNamespace, nil
	}

	// Try NAMESPACE environment variable (common in containerized environments)
	if envNamespace := os.Getenv("NAMESPACE"); envNamespace != "" {
		return envNamespace, nil
	}

	// Default fallback
	return "opendatahub", nil
}
