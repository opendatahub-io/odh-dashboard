package kubernetes

import (
	"context"
	"log/slog"

	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type SharedClientLogic struct {
	Client        kubernetes.Interface
	RuntimeClient client.Client
	Logger        *slog.Logger
	Token         BearerToken
}

// Service discovery helpers removed for minimal starter footprint.

func (kc *SharedClientLogic) BearerToken() (string, error) { return kc.Token.Raw(), nil }

func (kc *SharedClientLogic) GetGroups(ctx context.Context) ([]string, error) { return []string{}, nil }
