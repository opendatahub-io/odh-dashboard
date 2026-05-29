package kubernetes

import (
	"log/slog"

	"k8s.io/client-go/kubernetes"
)

// SharedClientLogic holds the common fields used by Kubernetes client implementations
// and TokenKubernetesClient to avoid duplication.
type SharedClientLogic struct {
	Client kubernetes.Interface
	Logger *slog.Logger
	Token  BearerToken
}
