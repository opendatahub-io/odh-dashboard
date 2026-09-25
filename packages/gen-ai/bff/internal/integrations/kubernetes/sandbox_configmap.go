package kubernetes

import (
	"context"
	"crypto/rand"
	"fmt"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	sandboxConfigMapPrefix  = "llama-stack-config-"
	sandboxConfigMapDataKey = "config.yaml"
	dashboardLabel          = "opendatahub.io/dashboard"
)

// CreateSandboxConfigMap creates the llama-stack-config ConfigMap that the Sandbox pod
// mounts at /etc/ogx/config.yaml. The ConfigMap name is <prefix><profileID>-<4hexchars>.
func (kc *TokenKubernetesClient) CreateSandboxConfigMap(
	ctx context.Context,
	namespace string,
	profileID string,
	configYAML string,
) (*corev1.ConfigMap, error) {
	suffix, err := RandomHex4()
	if err != nil {
		return nil, fmt.Errorf("failed to generate ConfigMap name suffix: %w", err)
	}
	name := sandboxConfigMapPrefix + profileID + "-" + suffix

	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels: map[string]string{
				dashboardLabel: "true",
			},
		},
		Data: map[string]string{
			sandboxConfigMapDataKey: configYAML,
		},
	}

	if err := kc.Client.Create(ctx, cm); err != nil {
		if apierrors.IsForbidden(err) {
			kc.Logger.Error("RBAC forbidden to create sandbox ConfigMap", "error", err, "namespace", namespace)
			return nil, &integrations.HTTPError{
				StatusCode: 403,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "forbidden",
					Message: "insufficient permissions to create sandbox ConfigMap",
				},
			}
		}
		kc.Logger.Error("failed to create sandbox ConfigMap", "error", err, "name", name, "namespace", namespace)
		return nil, fmt.Errorf("failed to create sandbox ConfigMap: %w", err)
	}

	kc.Logger.Info("created sandbox ConfigMap", "name", name, "namespace", namespace)
	return cm, nil
}

// RandomHex4 returns a 4-character lowercase hex string for use as a unique suffix.
func RandomHex4() (string, error) {
	b := make([]byte, 2)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return fmt.Sprintf("%04x", b), nil
}
