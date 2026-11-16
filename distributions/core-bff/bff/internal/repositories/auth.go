package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/k8sutil"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
)

// AuthRepository handles Auth CRD operations for group-based access control.
// Uses a service-account-scoped dynamic client for reads, matching the privileged watcher model.
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

// AuthAvailability distinguishes the four ways the Auth resource can fail to
// answer. The bootstrap contract gives each one its own documented behaviour
// instead of collapsing them into a single "unavailable" outcome that could
// either lock out or over-admit a caller. See docs/bootstrap-contract.md.
type AuthAvailability string

const (
	// AuthAvailable means the Auth CR was read and parsed.
	AuthAvailable AuthAvailability = "available"

	// AuthCRDAbsent means the CRD is not installed. On a profile that does not
	// include the Auth resource this is the expected steady state, not a fault.
	AuthCRDAbsent AuthAvailability = "crd-absent"

	// AuthInstanceMissing means the CRD is installed but the singleton is not
	// provisioned. The installation owner provisions it; the dashboard never does.
	AuthInstanceMissing AuthAvailability = "instance-missing"

	// AuthForbidden means the read was rejected. This is a permission problem to
	// surface, never a reason to grant access.
	AuthForbidden AuthAvailability = "forbidden"

	// AuthUnavailable means the read failed for any other reason (upstream
	// error, timeout, malformed object).
	AuthUnavailable AuthAvailability = "unavailable"
)

// AuthLookup is the full result of a bootstrap Auth read: the configuration
// when one was readable, plus why it was not.
type AuthLookup struct {
	Config       *AuthConfig
	Availability AuthAvailability
	Err          error
}

// Lookup reads the Auth CR and classifies the outcome. Unlike GetAuth it never
// conflates "the resource is outside this profile" with "the read failed".
func (r *AuthRepository) Lookup(ctx context.Context) AuthLookup {
	if r.saDynClient == nil {
		return AuthLookup{Availability: AuthUnavailable, Err: fmt.Errorf("auth dynamic client unavailable")}
	}

	result, err := r.saDynClient.Resource(models.AuthGVR).Get(ctx, models.AuthInstanceName, metav1.GetOptions{})
	if err != nil {
		switch {
		case k8sutil.IsDiscoveryError(err):
			return AuthLookup{Availability: AuthCRDAbsent}
		case k8serrors.IsNotFound(err):
			return AuthLookup{Availability: AuthInstanceMissing, Err: fmt.Errorf("auth instance not found: %w", err)}
		case k8serrors.IsForbidden(err):
			return AuthLookup{Availability: AuthForbidden, Err: fmt.Errorf("forbidden reading auth config: %w", err)}
		default:
			return AuthLookup{Availability: AuthUnavailable, Err: fmt.Errorf("failed to get auth config: %w", err)}
		}
	}

	spec, ok := result.Object["spec"].(map[string]any)
	if !ok {
		return AuthLookup{Availability: AuthUnavailable, Err: fmt.Errorf("auth CR has missing or invalid spec")}
	}

	return AuthLookup{
		Availability: AuthAvailable,
		Config: &AuthConfig{
			AdminGroups:   extractStringSlice(spec, "adminGroups"),
			AllowedGroups: extractStringSlice(spec, "allowedGroups"),
		},
	}
}

// GetAuth fetches the Auth CR using the SA client. Returns (nil, nil) only when the CRD
// itself is absent. When the CRD exists but the "auth" instance is missing, returns an error
// so callers fall through to SSAR rather than granting access.
func (r *AuthRepository) GetAuth(ctx context.Context) (*AuthConfig, error) {
	lookup := r.Lookup(ctx)
	if lookup.Availability == AuthCRDAbsent {
		return nil, nil
	}
	return lookup.Config, lookup.Err
}

func extractStringSlice(m map[string]any, key string) []string {
	raw, ok := m[key].([]any)
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
