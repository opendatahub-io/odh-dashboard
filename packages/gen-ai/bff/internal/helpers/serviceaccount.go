package helper

import (
	"fmt"
	"os"
	"strings"
)

const (
	ServiceAccountTokenFile = "/var/run/secrets/kubernetes.io/serviceaccount/token"
)

// GetServiceAccountToken reads the pod's service account token from the filesystem.
// In development, falls back to the SA_TOKEN environment variable.
func GetServiceAccountToken() (string, error) {
	if _, err := os.Stat(ServiceAccountTokenFile); err == nil {
		data, err := os.ReadFile(ServiceAccountTokenFile)
		if err != nil {
			return "", fmt.Errorf("failed to read service account token: %w", err)
		}
		token := strings.TrimSpace(string(data))
		if token != "" {
			return token, nil
		}
	}

	if envToken := os.Getenv("SA_TOKEN"); envToken != "" {
		return envToken, nil
	}

	return "", fmt.Errorf("service account token not found (checked %s and SA_TOKEN env)", ServiceAccountTokenFile)
}
