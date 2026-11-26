package repositories

import (
	"context"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

// Bootstrap decision codes. They appear in logs so an operator can tell the
// four Auth-resource outcomes apart without reading the source, and they are
// asserted by tests so the behaviour cannot drift silently.
const (
	// CodeAdmissionAuthenticated — admitted because the profile does not gate
	// admission on the Auth resource (xKS default).
	CodeAdmissionAuthenticated = "ADMISSION_AUTHENTICATED"
	// CodeAdmissionAdmin — admitted because the caller is a dashboard admin.
	CodeAdmissionAdmin = "ADMISSION_ADMIN"
	// CodeAdmissionCRDAbsent — admitted because the Auth CRD is not installed,
	// so no group restriction exists to apply.
	CodeAdmissionCRDAbsent = "ADMISSION_AUTH_CRD_ABSENT"
	// CodeAdmissionSystemAuthenticated — admitted because the Auth CR allows
	// system:authenticated.
	CodeAdmissionSystemAuthenticated = "ADMISSION_SYSTEM_AUTHENTICATED"
	// CodeAdmissionReview — decided by the authoritative SSAR on auths/auth.
	CodeAdmissionReview = "ADMISSION_ACCESS_REVIEW"
	// CodeAdmissionAuthInstanceMissing — the CRD exists but the singleton is
	// not provisioned; the SSAR decides.
	CodeAdmissionAuthInstanceMissing = "ADMISSION_AUTH_INSTANCE_MISSING"
	// CodeAdmissionAuthForbidden — the service account may not read the Auth
	// CR; the caller's own SSAR decides.
	CodeAdmissionAuthForbidden = "ADMISSION_AUTH_FORBIDDEN"
	// CodeAdmissionAuthUnavailable — the Auth read failed upstream; the
	// caller's own SSAR decides.
	CodeAdmissionAuthUnavailable = "ADMISSION_AUTH_UNAVAILABLE"
	// CodeAdmissionReviewUnavailable — the SSAR itself could not be evaluated.
	// Admission fails closed; the request is not rejected, because admission is
	// not authorization and every API operation still runs its own check.
	CodeAdmissionReviewUnavailable = "ADMISSION_REVIEW_UNAVAILABLE"
	// CodeCapabilityAdminUnavailable — the admin review could not be evaluated;
	// the UI capability degrades to non-admin.
	CodeCapabilityAdminUnavailable = "CAPABILITY_ADMIN_UNAVAILABLE"
)

// admissionDecision is the outcome of the bootstrap admission contract.
type admissionDecision struct {
	// Admitted reports whether the dashboard shell may load for this caller.
	// It is never a substitute for resource authorization on API operations.
	Admitted bool
	// Code is the stable reason the decision was reached.
	Code string
}

// resolveAdmission decides whether an authenticated caller is admitted.
//
// Separation of concerns, per the bootstrap contract:
//   - identity comes from the API server (SelfSubjectReview) and has already
//     succeeded by the time this runs;
//   - admission is this decision, and only controls whether the shell loads;
//   - authorization stays on each API operation.
//
// In AdmissionModeAuthenticated the Auth resource is not consulted at all, so a
// deployment that omits it — or a service account whose RBAC was reduced to not
// read it — admits authorized non-admin users without an undocumented
// dependency. In AdmissionModeAuthResource the RHOAI behaviour is preserved,
// with each Auth failure mode mapped to its own documented outcome.
func resolveAdmission(
	ctx context.Context,
	mode config.AdmissionMode,
	isAdmin bool,
	client k8s.KubernetesClientInterface,
	identity *k8s.RequestIdentity,
	authRepo *AuthRepository,
) admissionDecision {
	if mode == config.AdmissionModeAuthenticated {
		return admissionDecision{Admitted: true, Code: CodeAdmissionAuthenticated}
	}

	// A dashboard admin is admitted by definition: the admin review already
	// proved access to the Auth resource.
	if isAdmin {
		return admissionDecision{Admitted: true, Code: CodeAdmissionAdmin}
	}

	lookup := authRepo.Lookup(ctx)
	log := httpcontract.LogContext(nil, ctx)

	switch lookup.Availability {
	case AuthCRDAbsent:
		// No Auth resource means no group restriction to enforce.
		return admissionDecision{Admitted: true, Code: CodeAdmissionCRDAbsent}

	case AuthAvailable:
		if hasSystemAuthenticatedGroup(lookup.Config) {
			return admissionDecision{Admitted: true, Code: CodeAdmissionSystemAuthenticated}
		}
		return reviewAdmission(ctx, client, identity, CodeAdmissionReview)

	case AuthInstanceMissing:
		// The CRD is installed but the installation owner has not provisioned
		// the singleton. The dashboard does not create it; the caller's own
		// review decides, so a late provision does not lock anyone out.
		log.Warn("auth instance not provisioned; deferring admission to the access review",
			"code", CodeAdmissionAuthInstanceMissing)
		return reviewAdmission(ctx, client, identity, CodeAdmissionAuthInstanceMissing)

	case AuthForbidden:
		// Reduced service-account RBAC must not become an admission dependency:
		// fall through to the caller's own review rather than denying outright.
		log.Warn("service account may not read the auth config; deferring admission to the access review",
			"code", CodeAdmissionAuthForbidden)
		return reviewAdmission(ctx, client, identity, CodeAdmissionAuthForbidden)

	default:
		log.Warn("auth config unavailable; deferring admission to the access review",
			"code", CodeAdmissionAuthUnavailable, "cause", httpcontract.SafeErrorCode(lookup.Err))
		return reviewAdmission(ctx, client, identity, CodeAdmissionAuthUnavailable)
	}
}

// reviewAdmission runs the authoritative SSAR on auths/auth. A review that
// cannot be evaluated fails closed for admission only.
func reviewAdmission(
	ctx context.Context, client k8s.KubernetesClientInterface, identity *k8s.RequestIdentity, code string,
) admissionDecision {
	allowed, err := client.IsUserAllowed(ctx, identity)
	if err != nil {
		httpcontract.LogContext(nil, ctx).Warn("access review unavailable; reporting not admitted",
			"code", CodeAdmissionReviewUnavailable, "cause", httpcontract.SafeErrorCode(err))
		return admissionDecision{Admitted: false, Code: CodeAdmissionReviewUnavailable}
	}
	return admissionDecision{Admitted: allowed, Code: code}
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
