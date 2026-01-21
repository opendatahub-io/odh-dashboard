package kubernetes

import (
	"context"
	"log/slog"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

type SharedClientLogic struct {
	Client        kubernetes.Interface
	DynamicClient dynamic.Interface
	Logger        *slog.Logger
	Token         BearerToken
}

// Service discovery helpers removed for minimal starter footprint.

func (kc *SharedClientLogic) BearerToken() (string, error) { return kc.Token.Raw(), nil }

func (kc *SharedClientLogic) GetGroups(ctx context.Context) ([]string, error) { return []string{}, nil }

func (kc *SharedClientLogic) GetKubeClient() kubernetes.Interface {
	return kc.Client
}

func (kc *SharedClientLogic) GetDynamicClient() dynamic.Interface {
	return kc.DynamicClient
}
