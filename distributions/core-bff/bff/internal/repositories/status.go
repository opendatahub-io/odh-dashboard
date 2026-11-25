package repositories

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"k8s.io/client-go/dynamic"
)

// ClusterInfoProvider exposes startup-time cluster metadata for status responses.
type ClusterInfoProvider interface {
	GetClusterID() string
	GetClusterBranding() string
	GetServerURL() string
	GetCurrentContext() string
}

// StatusRepository handles user session status aggregation — the bootstrap
// endpoint the frontend calls before it can render anything.
//
// The response carries three separable things, and the contract keeps them
// separate (see docs/bootstrap-contract.md):
//
//	identity       resolved by the API server; a failure here fails the request
//	admission      whether the shell may load (isAllowed)
//	UI capability  whether admin surfaces are offered (isAdmin)
//
// Neither admission nor UI capability authorizes anything. Every API operation
// runs its own resource authorization regardless of what this endpoint returned.
type StatusRepository struct {
	saDynClient   dynamic.Interface
	namespace     string
	authRepo      *AuthRepository
	admissionMode config.AdmissionMode
}

func NewStatusRepository(
	saDynClient dynamic.Interface, namespace string, authRepo *AuthRepository, admissionMode config.AdmissionMode,
) *StatusRepository {
	return &StatusRepository{
		saDynClient:   saDynClient,
		namespace:     namespace,
		authRepo:      authRepo,
		admissionMode: admissionMode,
	}
}

func (r *StatusRepository) GetStatus(
	ctx context.Context, client k8s.KubernetesClientInterface,
	identity *k8s.RequestIdentity, clusterInfo ClusterInfoProvider,
) (*models.StatusResponse, error) {
	// Identity is the one hard requirement: without it there is no session to
	// describe, so the request fails rather than returning a degraded answer.
	userName, err := client.GetUser(ctx, identity)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// UI capability. Uses SSAR: patch on auths/auth. A review that cannot be
	// evaluated degrades to non-admin rather than failing the bootstrap, so a
	// transient upstream problem does not lock out an authorized user. Admin
	// surfaces re-check on their own routes.
	isAdmin, err := client.IsUserAdmin(ctx, identity)
	if err != nil {
		isAdmin = false
		httpcontract.LogContext(nil, ctx).Warn("admin capability review unavailable; reporting non-admin",
			"code", CodeCapabilityAdminUnavailable, "cause", httpcontract.SafeErrorCode(err))
	}

	admission := resolveAdmission(ctx, r.admissionMode, isAdmin, client, identity, r.authRepo)
	httpcontract.LogContext(nil, ctx).Debug("bootstrap admission resolved",
		"mode", r.admissionMode.String(), "admitted", admission.Admitted, "code", admission.Code)

	return &models.StatusResponse{
		Kube: models.KubeStatus{
			CurrentContext:  clusterInfo.GetCurrentContext(),
			CurrentUser:     models.KubeUser{Name: userName},
			Namespace:       r.namespace,
			UserName:        userName,
			UserID:          segmentUserID(identity.Token, userName),
			ClusterID:       clusterInfo.GetClusterID(),
			ClusterBranding: clusterInfo.GetClusterBranding(),
			IsAdmin:         isAdmin,
			IsAllowed:       admission.Admitted,
			ServerURL:       clusterInfo.GetServerURL(),
		},
	}, nil
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
