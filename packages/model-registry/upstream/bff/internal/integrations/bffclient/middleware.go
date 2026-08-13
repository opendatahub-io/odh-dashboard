package bffclient

import (
	"context"

	"github.com/kubeflow/hub/ui/bff/internal/constants"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
)

// GetClient retrieves a BFF client from the context for the specified target
func GetClient(ctx context.Context, target BFFTarget) BFFClientInterface {
	key := constants.BFFClientKey(constants.BFFTarget(target))
	if client, ok := ctx.Value(key).(BFFClientInterface); ok {
		return client
	}
	return nil
}

// ClientForRequest builds a BFF client for the given target, forwarding the
// request's identity as a bearer token (AuthMethodUserToken, default) or a
// kubeflow-userid header (AuthMethodInternal). Returns nil (never an error)
// when the target isn't configured, so callers can degrade gracefully.
func ClientForRequest(ctx context.Context, factory BFFClientFactory, target BFFTarget) BFFClientInterface {
	if factory == nil || !factory.IsTargetConfigured(target) {
		return nil
	}

	identity, _ := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)

	if serviceConfig := factory.GetConfig(target); serviceConfig != nil && serviceConfig.AuthMethod == AuthMethodInternal {
		headers := make(map[string]string)
		if identity != nil && identity.UserID != "" {
			headers[constants.KubeflowUserIDHeader] = identity.UserID
		}
		return factory.CreateClientWithHeaders(target, "", headers)
	}

	var authToken string
	if identity != nil {
		authToken = identity.Token
	}

	return factory.CreateClient(target, authToken)
}
