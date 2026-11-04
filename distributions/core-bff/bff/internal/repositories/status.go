package repositories

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/client-go/dynamic"
)

// ClusterInfoProvider exposes startup-time cluster metadata for status responses.
type ClusterInfoProvider interface {
	GetClusterID() string
	GetClusterBranding() string
	GetServerURL() string
	GetCurrentContext() string
}

// StatusRepository handles user session status aggregation.
type StatusRepository struct {
	saDynClient dynamic.Interface
	namespace   string
	authRepo    *AuthRepository
}

func NewStatusRepository(saDynClient dynamic.Interface, namespace string, authRepo *AuthRepository) *StatusRepository {
	return &StatusRepository{saDynClient: saDynClient, namespace: namespace, authRepo: authRepo}
}

func (r *StatusRepository) GetStatus(
	ctx context.Context, client k8s.KubernetesClientInterface,
	identity *k8s.RequestIdentity, clusterInfo ClusterInfoProvider,
) (*models.StatusResponse, error) {
	namespace := r.namespace
	authRepo := r.authRepo
	userName, err := client.GetUser(ctx, identity)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Uses SSAR: patch on auths/default-auth.
	// A failed evaluation must not become an empty-success or an implicit grant.
	isAdmin, err := client.IsUserAdmin(ctx, identity)
	if err != nil {
		return nil, fmt.Errorf("failed to evaluate admin access: %w", err)
	}

	// Check if Auth CRD is present. When absent, all users are allowed (no group restrictions).
	// When present, non-admin users need SSAR for get on auths/default-auth.
	isAllowed := true
	if !isAdmin {
		isAllowed, err = resolveIsAllowed(ctx, client, identity, authRepo)
		if err != nil {
			return nil, fmt.Errorf("failed to check allowed status: %w", err)
		}
	}

	return &models.StatusResponse{
		Kube: models.KubeStatus{
			CurrentContext:  clusterInfo.GetCurrentContext(),
			CurrentUser:     models.KubeUser{Name: userName},
			Namespace:       namespace,
			UserName:        userName,
			UserID:          segmentUserID(identity.Token, userName),
			ClusterID:       clusterInfo.GetClusterID(),
			ClusterBranding: clusterInfo.GetClusterBranding(),
			IsAdmin:         isAdmin,
			IsAllowed:       isAllowed,
			ServerURL:       clusterInfo.GetServerURL(),
		},
	}, nil
}

// resolveIsAllowed determines if a non-admin user is allowed to access the dashboard.
// 1. If Auth CRD is absent (discovery error): all users allowed (no group restrictions).
// 2. If Auth CR has system:authenticated in allowedGroups: all authenticated users allowed.
// 3. If the Auth instance is missing, fall through to SSAR; other read failures propagate.
// 4. Otherwise: SSAR for get on auths/default-auth.
func resolveIsAllowed(
	ctx context.Context, client k8s.KubernetesClientInterface,
	identity *k8s.RequestIdentity, authRepo *AuthRepository,
) (bool, error) {
	authConfig, authErr := authRepo.GetAuth(ctx)

	if authErr == nil && authConfig == nil {
		// CRD absent - all users allowed
		return true, nil
	}

	if authErr == nil && authConfig != nil {
		if hasSystemAuthenticatedGroup(authConfig) {
			return true, nil
		}
	}

	if authErr != nil && !k8serrors.IsNotFound(authErr) {
		return false, fmt.Errorf("failed to read access configuration: %w", authErr)
	}

	allowed, ssarErr := client.IsUserAllowed(ctx, identity)
	if ssarErr != nil {
		return false, fmt.Errorf("failed to evaluate access: %w", ssarErr)
	}
	return allowed, nil
}

// segmentUserID returns a privacy-safe user identifier for Segment analytics.
func segmentUserID(token k8s.BearerToken, userName string) string {
	if sub := jwtSubClaim(token.Raw()); sub != "" {
		return sha256Hex(sub)
	}
	if userName != "" {
		return sha256Hex(userName)
	}
	return ""
}

func jwtSubClaim(token string) string {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return ""
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return ""
	}
	var claims struct {
		Sub string `json:"sub"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return ""
	}
	return claims.Sub
}

func sha256Hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func hasSystemAuthenticatedGroup(auth *AuthConfig) bool {
	if auth == nil {
		return false
	}
	for _, g := range auth.AllowedGroups {
		if g == models.SystemAuthenticated {
			return true
		}
	}
	return false
}
