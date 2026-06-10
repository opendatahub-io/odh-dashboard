package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// SharedClientLogic holds shared Kubernetes client logic and configuration.
type SharedClientLogic struct {
	Client     kubernetes.Interface
	Logger     *slog.Logger
	Token      BearerToken
	RestConfig *rest.Config

	dynamicClient dynamic.Interface
	dynamicOnce   sync.Once
	dynamicErr    error
}

func (kc *SharedClientLogic) BearerToken() (string, error) { return kc.Token.Raw(), nil }

func (kc *SharedClientLogic) GetGroups(ctx context.Context) ([]string, error) { return []string{}, nil }

// GetDynamicClient returns a lazily-initialized dynamic client for CRD operations.
func (kc *SharedClientLogic) GetDynamicClient() (dynamic.Interface, error) {
	kc.dynamicOnce.Do(func() {
		if kc.RestConfig == nil {
			kc.dynamicErr = fmt.Errorf("rest config not available for dynamic client creation")
			return
		}
		kc.dynamicClient, kc.dynamicErr = dynamic.NewForConfig(kc.RestConfig)
	})
	return kc.dynamicClient, kc.dynamicErr
}
