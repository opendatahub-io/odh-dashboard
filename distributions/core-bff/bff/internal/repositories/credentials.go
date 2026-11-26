package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

// CredentialPolicy decides whose credentials perform user-initiated resource
// access: reads and mutations a caller asks for through a REST handler.
//
// It does not cover the documented service-account reads (bootstrap
// configuration, the OdhApplication catalogue, connection-type templates and
// the Auth singleton): those stay on the service account on every platform and
// are listed in docs/bootstrap-contract.md, "Service-account permissions".
type CredentialPolicy string

const (
	// CredentialPolicyServiceAccount is the RHOAI privileged-watcher model: the
	// handler authorizes the caller (admin review or a resource SSAR), then the
	// dashboard service account performs the operation. OpenShift keeps it.
	CredentialPolicyServiceAccount CredentialPolicy = "service-account"
	// CredentialPolicyCaller performs the operation with the caller's own
	// credentials, so the API server authorizes the exact resource and verb.
	// The service account is never used as a substitute. xKS uses it.
	CredentialPolicyCaller CredentialPolicy = "caller"
)

// CredentialPolicyFor returns the policy for a resolved platform. Only xKS
// switches to caller credentials; any other value keeps the OpenShift model
// unchanged. An unconfirmed xKS guess also selects caller credentials: that is
// the least-privilege direction, so a misdetection fails closed (the caller is
// denied) rather than open (the service account acts).
func CredentialPolicyFor(platform config.PlatformType) CredentialPolicy {
	if platform.IsXKS() {
		return CredentialPolicyCaller
	}
	return CredentialPolicyServiceAccount
}

// CallerClientsFunc resolves Kubernetes clients authenticated as the caller of
// the request in ctx. It must fail when the request has no usable caller
// credential; it must never return service-account clients.
type CallerClientsFunc func(ctx context.Context) (kubernetes.Interface, dynamic.Interface, error)

// ErrCallerClientsUnavailable means a caller-scoped operation could not obtain
// the caller's clients. The operation is not attempted with any other
// credentials.
var ErrCallerClientsUnavailable = errors.New("caller credentials unavailable for this operation")

// clientSource hands a repository the clients for user-initiated access,
// according to the credential policy. Under CredentialPolicyCaller there is no
// path from a failed or missing caller credential to the service account.
type clientSource struct {
	policy  CredentialPolicy
	saTyped kubernetes.Interface
	saDyn   dynamic.Interface
	caller  CallerClientsFunc
}

func newClientSource(cfg RepositoriesConfig) clientSource {
	policy := cfg.CredentialPolicy
	if policy == "" {
		policy = CredentialPolicyFor(cfg.Platform)
	}
	return clientSource{policy: policy, saTyped: cfg.SAClientset, saDyn: cfg.SADynClient, caller: cfg.CallerClients}
}

// saSource is the source a repository built directly with service-account
// clients uses (tests and the OpenShift constructors).
func saSource(typed kubernetes.Interface, dyn dynamic.Interface) clientSource {
	return clientSource{policy: CredentialPolicyServiceAccount, saTyped: typed, saDyn: dyn}
}

func (s clientSource) callerClients(ctx context.Context) (kubernetes.Interface, dynamic.Interface, error) {
	if s.caller == nil {
		return nil, nil, fmt.Errorf("%w: no caller client resolver configured", ErrCallerClientsUnavailable)
	}
	typed, dyn, err := s.caller(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("%w: %w", ErrCallerClientsUnavailable, err)
	}
	return typed, dyn, nil
}

// surfacesAuthFailure reports whether err must reach the client as the API
// server's 401/403 instead of being folded into a 200 MutationResponse with
// success=false. Under the caller policy an RBAC denial is the expected answer
// for a caller who lacks the permission, and the client must be able to tell it
// apart from any other failure. An unresolved caller identity is one too, so it
// is a 401 here as on every other caller-scoped route. The service-account
// policy keeps its existing response shape.
func (s clientSource) surfacesAuthFailure(err error) bool {
	return s.policy == CredentialPolicyCaller &&
		(k8serrors.IsForbidden(err) || k8serrors.IsUnauthorized(err) || errors.Is(err, httpcontract.ErrIdentityUnresolved))
}

// typed returns the typed clientset for a user-initiated operation.
func (s clientSource) typed(ctx context.Context) (kubernetes.Interface, error) {
	if s.policy == CredentialPolicyCaller {
		typed, _, err := s.callerClients(ctx)
		if err != nil {
			return nil, err
		}
		if typed == nil {
			return nil, fmt.Errorf("%w: caller typed client is nil", ErrCallerClientsUnavailable)
		}
		return typed, nil
	}
	if s.saTyped == nil {
		return nil, fmt.Errorf("service account clientset not available")
	}
	return s.saTyped, nil
}

// dynamic returns the dynamic client for a user-initiated operation.
func (s clientSource) dynamic(ctx context.Context) (dynamic.Interface, error) {
	if s.policy == CredentialPolicyCaller {
		_, dyn, err := s.callerClients(ctx)
		if err != nil {
			return nil, err
		}
		if dyn == nil {
			return nil, fmt.Errorf("%w: caller dynamic client is nil", ErrCallerClientsUnavailable)
		}
		return dyn, nil
	}
	if s.saDyn == nil {
		return nil, fmt.Errorf("service account dynamic client not available")
	}
	return s.saDyn, nil
}
