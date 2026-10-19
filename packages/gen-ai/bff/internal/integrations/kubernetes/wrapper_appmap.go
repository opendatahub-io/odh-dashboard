package kubernetes

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	wrapperAppConfigMapPrefix  = "wrapper-app-"
	wrapperAppConfigMapDataKey = "app.py"
)

// CreateWrapperAppConfigMap creates the wrapper-app ConfigMap that the Sandbox pod
// mounts at /opt/custom/app.py. The ConfigMap name is <prefix><profileID>-<4hexchars>.
func (kc *TokenKubernetesClient) CreateWrapperAppConfigMap(
	ctx context.Context,
	namespace string,
	profileID string,
	appPy string,
) (*corev1.ConfigMap, error) {
	suffix, err := RandomHex4()
	if err != nil {
		return nil, fmt.Errorf("failed to generate wrapper-app ConfigMap name suffix: %w", err)
	}
	name := wrapperAppConfigMapPrefix + profileID + "-" + suffix

	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels: map[string]string{
				dashboardLabel: "true",
			},
		},
		Data: map[string]string{
			wrapperAppConfigMapDataKey: appPy,
		},
	}

	if err := kc.Client.Create(ctx, cm); err != nil {
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to create wrapper-app ConfigMap", "error", err, "namespace", namespace)
			return nil, &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to create wrapper-app ConfigMap",
				},
			}
		}
		kc.Logger.Error("failed to create wrapper-app ConfigMap", "error", err, "name", name, "namespace", namespace)
		return nil, fmt.Errorf("failed to create wrapper-app ConfigMap: %w", err)
	}

	kc.Logger.Info("created wrapper-app ConfigMap", "name", name, "namespace", namespace)
	return cm, nil
}
