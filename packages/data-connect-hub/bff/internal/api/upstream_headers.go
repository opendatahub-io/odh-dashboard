package api

import (
	"context"
	"fmt"
	"net/http"

	"github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
)

type bearerTokenProvider interface {
	BearerToken() (string, error)
}

func (app *App) dataConnectHubHeaders(ctx context.Context, identity *kubernetes.RequestIdentity, namespace string) (http.Header, error) {
	token := identity.Token
	if token == "" {
		if app.kubernetesClientFactory == nil {
			return nil, fmt.Errorf("Kubernetes client is not configured")
		}
		client, err := app.kubernetesClientFactory.GetClient(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to get Kubernetes client: %w", err)
		}
		provider, ok := client.(bearerTokenProvider)
		if !ok {
			return nil, fmt.Errorf("Kubernetes client cannot provide an upstream bearer token")
		}
		token, err = provider.BearerToken()
		if err != nil {
			return nil, fmt.Errorf("failed to get upstream bearer token: %w", err)
		}
	}
	if token == "" {
		return nil, fmt.Errorf("upstream bearer token is empty")
	}

	headers := http.Header{}
	headers.Set("Authorization", "Bearer "+token)
	headers.Set("X-Tenant-ID", namespace)
	headers.Set("X-Remote-User", identity.UserID)
	return headers, nil
}
