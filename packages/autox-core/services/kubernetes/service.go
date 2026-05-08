package kubernetes

import (
	"context"
	"log/slog"

	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// K8sService provides business logic for Kubernetes operations
type K8sService struct {
	Client K8sClientInterface
	Logger *slog.Logger
}

type K8sServiceConfig struct {
	Logger *slog.Logger
}

func NewK8sService(cfg K8sServiceConfig, client K8sClientInterface) *K8sService {
	return &K8sService{
		Client: client,
		Logger: cfg.Logger,
	}
}

func (s *K8sService) GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]string, error) {
	s.Logger.Info("fetching namespaces", "user", identity.UserID)

	namespaces, err := s.Client.GetNamespaces(ctx, identity)
	if err != nil {
		s.Logger.Error("failed to get namespaces", "error", err)
		return nil, err
	}

	return namespaces, nil
}

func (s *K8sService) GetPods(ctx context.Context, namespace string, identity *RequestIdentity) (*v1.PodList, error) {
	s.Logger.Info("fetching pods", "namespace", namespace, "user", identity.UserID)

	// Validate namespace name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}

	pods, err := s.Client.GetPods(ctx, namespace, identity)
	if err != nil {
		s.Logger.Error("failed to get pods", "namespace", namespace, "error", err)
		return nil, err
	}

	return pods, nil
}

func (s *K8sService) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	s.Logger.Info("listing resources", "gvr", gvr, "namespace", namespace)

	// Validate namespace name if provided
	if namespace != "" {
		if err := ValidateNamespaceName(namespace); err != nil {
			s.Logger.Error("invalid namespace name", "error", err)
			return nil, err
		}
	}

	resources, err := s.Client.ListResources(ctx, gvr, namespace)
	if err != nil {
		s.Logger.Error("failed to list resources", "gvr", gvr, "namespace", namespace, "error", err)
		return nil, err
	}

	return resources, nil
}

func (s *K8sService) GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	s.Logger.Info("getting resource", "gvr", gvr, "namespace", namespace, "name", name)

	// Validate namespace and resource name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}
	if err := ValidateResourceName(gvr.Resource, name); err != nil {
		s.Logger.Error("invalid resource name", "error", err)
		return nil, err
	}

	resource, err := s.Client.GetResource(ctx, gvr, namespace, name)
	if err != nil {
		s.Logger.Error("failed to get resource", "gvr", gvr, "namespace", namespace, "name", name, "error", err)
		return nil, err
	}

	return resource, nil
}

func (s *K8sService) CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	s.Logger.Info("creating resource", "gvr", gvr, "namespace", namespace, "name", obj.GetName())

	// Validate namespace and resource name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}
	if err := ValidateResourceName(gvr.Resource, obj.GetName()); err != nil {
		s.Logger.Error("invalid resource name", "error", err)
		return nil, err
	}

	resource, err := s.Client.CreateResource(ctx, gvr, namespace, obj)
	if err != nil {
		s.Logger.Error("failed to create resource", "gvr", gvr, "namespace", namespace, "name", obj.GetName(), "error", err)
		return nil, err
	}

	return resource, nil
}
