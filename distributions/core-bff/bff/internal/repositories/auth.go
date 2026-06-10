package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
)

// AuthRepository handles Auth CRD operations for group-based access control.
// Uses a service-account-scoped dynamic client for reads, matching the privileged watcher model
// privileged watcher model where auth config is read with SA credentials.
type AuthRepository struct {
	saDynClient dynamic.Interface
}

func NewAuthRepository(saDynClient dynamic.Interface) *AuthRepository {
	return &AuthRepository{saDynClient: saDynClient}
}

// AuthConfig holds admin and allowed group lists from the Auth CRD.
type AuthConfig struct {
	AdminGroups   []string `json:"adminGroups"`
	AllowedGroups []string `json:"allowedGroups"`
}

// GetAuth fetches the Auth CR using the SA client. Returns (nil, nil) only when the CRD
// itself is absent. When the CRD exists but the "auth" instance is missing, returns an error
// so callers fall through to SSAR rather than granting access.
func (r *AuthRepository) GetAuth(ctx context.Context) (*AuthConfig, error) {
	if r.saDynClient == nil {
		return nil, fmt.Errorf("auth dynamic client unavailable")
	}

	result, err := r.saDynClient.Resource(models.AuthGVR).Get(ctx, "auth", metav1.GetOptions{})
	if err != nil {
		if isDiscoveryError(err) {
			return nil, nil
		}
		if k8serrors.IsNotFound(err) {
			return nil, fmt.Errorf("auth instance not found: %w", err)
		}
		return nil, classifyAuthError(err)
	}

	spec, ok := result.Object["spec"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("auth CR has missing or invalid spec")
	}

	return &AuthConfig{
		AdminGroups:   extractStringSlice(spec, "adminGroups"),
		AllowedGroups: extractStringSlice(spec, "allowedGroups"),
	}, nil
}

func classifyAuthError(err error) error {
	if k8serrors.IsForbidden(err) {
		return fmt.Errorf("forbidden reading auth config: %w", err)
	}
	return fmt.Errorf("failed to get auth config: %w", err)
}

func extractStringSlice(m map[string]interface{}, key string) []string {
	raw, ok := m[key].([]interface{})
	if !ok {
		return nil
	}
	result := make([]string, 0, len(raw))
	for _, v := range raw {
		if s, ok := v.(string); ok {
			result = append(result, s)
		}
	}
	return result
}
