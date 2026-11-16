package config

import (
	"fmt"
	"strings"
)

// AdmissionMode selects how the bootstrap contract decides whether an
// authenticated caller is admitted to the dashboard.
//
// See docs/bootstrap-contract.md. Admission is not authorization: it only
// decides whether the UI shell may load. Every API operation still runs its
// own resource authorization.
type AdmissionMode string

const (
	// AdmissionModeAuthResource gates admission on the RHOAI Auth resource
	// (`auths/auth`): group membership first, then an SSAR for `get` as the
	// authoritative fallback. This is the RHOAI behaviour and the default on
	// OpenShift.
	AdmissionModeAuthResource AdmissionMode = "auth-resource"

	// AdmissionModeAuthenticated admits any caller whose identity the API
	// server resolves, without requiring Auth-resource permissions. This is
	// the default on xKS, where the Auth resource is outside the selected
	// profile. Admin capability is still resolved separately and degrades to
	// false when it cannot be evaluated.
	AdmissionModeAuthenticated AdmissionMode = "authenticated"
)

// String implements the fmt.Stringer interface.
func (m AdmissionMode) String() string { return string(m) }

// Set implements the flag.Value interface. An empty value means "resolve from
// the platform at startup" and is accepted here so the flag can be left unset.
func (m *AdmissionMode) Set(value string) error {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case string(AdmissionModeAuthResource):
		*m = AdmissionModeAuthResource
	case string(AdmissionModeAuthenticated):
		*m = AdmissionModeAuthenticated
	case "":
		*m = ""
	default:
		return fmt.Errorf("invalid admission mode: %s (must be %s, %s, or empty to resolve from the platform)",
			value, AdmissionModeAuthResource, AdmissionModeAuthenticated)
	}
	return nil
}

// ResolveAdmissionMode returns the effective admission mode. An explicit
// configured value always wins; otherwise the platform decides: OpenShift keeps
// the RHOAI Auth-resource contract, xKS admits authenticated callers.
//
// platformConfirmed must be false when the platform was guessed rather than
// determined. Startup falls back to XKS when the OpenShift probe fails, because
// XKS is the least-privilege answer for deciding which API calls to make — but
// a forbidden or timed-out probe on a real OpenShift cluster lands in exactly
// that branch. Relaxing admission on a guess would let a transient probe
// failure drop the Auth-resource gate and admit a caller the cluster denies, so
// an unconfirmed platform keeps the restrictive contract. Set ODH_PLATFORM_TYPE
// or ADMISSION_MODE to state the intent explicitly.
func ResolveAdmissionMode(configured AdmissionMode, platform PlatformType, platformConfirmed bool) AdmissionMode {
	if configured != "" {
		return configured
	}
	if platform.IsXKS() && platformConfirmed {
		return AdmissionModeAuthenticated
	}
	return AdmissionModeAuthResource
}
