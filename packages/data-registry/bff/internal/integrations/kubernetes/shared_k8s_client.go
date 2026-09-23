package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type SharedClientLogic struct {
	Client kubernetes.Interface
	Logger *slog.Logger
	Token  BearerToken
}

// Service discovery helpers removed for minimal starter footprint.

func (kc *SharedClientLogic) BearerToken() (string, error) { return kc.Token.Raw(), nil }

func (kc *SharedClientLogic) GetGroups(ctx context.Context) ([]string, error) { return []string{}, nil }

func (kc *SharedClientLogic) GetConnections(ctx context.Context, namespace string) ([]corev1.Secret, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	secretList, err := kc.Client.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "opendatahub.io/dashboard=true",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list secrets in namespace %s: %w", namespace, err)
	}

	var connections []corev1.Secret
	for _, secret := range secretList.Items {
		annotations := secret.Annotations
		if annotations == nil {
			continue
		}
		if _, ok := annotations["opendatahub.io/connection-type"]; ok {
			connections = append(connections, secret)
			continue
		}
		if _, ok := annotations["opendatahub.io/connection-type-ref"]; ok {
			connections = append(connections, secret)
		}
	}

	return connections, nil
}
