package api

import (
	"context"
	"fmt"
	"log/slog"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/k8sutil"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// resolveUserViaOpenShiftAPI queries user.openshift.io/v1 to resolve the current user's
// identity. Only available on OpenShift.
// Returns ("", nil, nil) if the User API is unavailable (e.g., CRD not installed).
// TODO: Wire into secureRoute/secureAdminRoute to enrich audit logs with the OpenShift
// username and group memberships resolved from the bearer token.
func (app *App) resolveUserViaOpenShiftAPI(ctx context.Context, client k8s.KubernetesClientInterface) (string, []string, error) {
	if app.config.PlatformType.IsXKS() {
		return "", nil, nil
	}

	dynClient, err := client.GetDynamicClient()
	if err != nil {
		return "", nil, fmt.Errorf("failed to get dynamic client: %w", err)
	}

	result, err := dynClient.Resource(models.OpenShiftUserGVR).Get(ctx, "~", metav1.GetOptions{})
	if err != nil {
		if k8sutil.IsDiscoveryError(err) {
			app.logger.Debug("OpenShift User API not available", slog.Any("error", err))
			return "", nil, nil
		}
		return "", nil, fmt.Errorf("failed to query OpenShift User API: %w", err)
	}

	username, _ := unstructuredString(result.Object, "metadata", "name")
	groups := unstructuredStringSlice(result.Object, "groups")

	return username, groups, nil
}

func unstructuredString(obj map[string]interface{}, keys ...string) (string, bool) {
	current := obj
	for i, key := range keys {
		if i == len(keys)-1 {
			val, ok := current[key].(string)
			return val, ok
		}
		next, ok := current[key].(map[string]interface{})
		if !ok {
			return "", false
		}
		current = next
	}
	return "", false
}

func unstructuredStringSlice(obj map[string]interface{}, key string) []string {
	raw, ok := obj[key]
	if !ok {
		return nil
	}
	slice, ok := raw.([]interface{})
	if !ok {
		return nil
	}
	result := make([]string, 0, len(slice))
	for _, v := range slice {
		if s, ok := v.(string); ok {
			result = append(result, s)
		}
	}
	return result
}
