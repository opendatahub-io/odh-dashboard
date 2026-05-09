package kubernetes

import (
	"context"
	"log/slog"
	"strings"

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

func (s *K8sService) GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]v1.Namespace, error) {
	s.Logger.Info("fetching namespaces", "user", identity.UserID)

	namespaces, err := s.Client.GetNamespaces(ctx, identity)
	if err != nil {
		s.Logger.Error("failed to get namespaces", "error", err)
		return nil, err
	}

	return namespaces, nil
}

func (s *K8sService) GetPods(ctx context.Context, identity *RequestIdentity, namespace string) (*v1.PodList, error) {
	s.Logger.Info("fetching pods", "namespace", namespace, "user", identity.UserID)

	// Validate namespace name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}

	pods, err := s.Client.GetPods(ctx, identity, namespace)
	if err != nil {
		s.Logger.Error("failed to get pods", "namespace", namespace, "error", err)
		return nil, err
	}

	return pods, nil
}

func (s *K8sService) GetSecrets(ctx context.Context, identity *RequestIdentity, namespace string) ([]v1.Secret, error) {
	s.Logger.Info("fetching secrets", "namespace", namespace, "user", identity.UserID)

	// Validate namespace name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}

	secrets, err := s.Client.GetSecrets(ctx, identity, namespace)
	if err != nil {
		s.Logger.Error("failed to get secrets", "namespace", namespace, "error", err)
		return nil, err
	}

	return secrets, nil
}

func (s *K8sService) GetSecret(ctx context.Context, identity *RequestIdentity, namespace, secretName string) (*v1.Secret, error) {
	s.Logger.Info("fetching secret", "namespace", namespace, "secretName", secretName, "user", identity.UserID)

	// Validate namespace and secret name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}
	if err := ValidateResourceName("secret", secretName); err != nil {
		s.Logger.Error("invalid secret name", "error", err)
		return nil, err
	}

	secret, err := s.Client.GetSecret(ctx, identity, namespace, secretName)
	if err != nil {
		s.Logger.Error("failed to get secret", "namespace", namespace, "secretName", secretName, "error", err)
		return nil, err
	}

	return secret, nil
}

func (s *K8sService) GetUser(identity *RequestIdentity) (string, error) {
	s.Logger.Info("getting user identity", "user", identity.UserID)

	user, err := s.Client.GetUser(identity)
	if err != nil {
		s.Logger.Error("failed to get user identity", "error", err)
		return "", err
	}

	return user, nil
}

func (s *K8sService) IsClusterAdmin(identity *RequestIdentity) (bool, error) {
	s.Logger.Info("checking cluster admin status", "user", identity.UserID)

	isAdmin, err := s.Client.IsClusterAdmin(identity)
	if err != nil {
		s.Logger.Error("failed to check cluster admin status", "error", err)
		return false, err
	}

	return isAdmin, nil
}

func (s *K8sService) CanAccessResource(ctx context.Context, identity *RequestIdentity, namespace, verb, group, resource, name string) (bool, error) {
	s.Logger.Info("checking resource access", "user", identity.UserID, "namespace", namespace, "verb", verb, "resource", resource)

	// Validate namespace if provided
	if namespace != "" {
		if err := ValidateNamespaceName(namespace); err != nil {
			s.Logger.Error("invalid namespace name", "error", err)
			return false, err
		}
	}

	canAccess, err := s.Client.CanAccessResource(ctx, identity, namespace, verb, group, resource, name)
	if err != nil {
		s.Logger.Error("failed to check resource access", "namespace", namespace, "verb", verb, "resource", resource, "error", err)
		return false, err
	}

	return canAccess, nil
}

func (s *K8sService) ListResources(ctx context.Context, identity *RequestIdentity, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	s.Logger.Info("listing resources", "gvr", gvr, "namespace", namespace, "user", getLogUser(identity))

	// Validate namespace name if provided
	if namespace != "" {
		if err := ValidateNamespaceName(namespace); err != nil {
			s.Logger.Error("invalid namespace name", "error", err)
			return nil, err
		}
	}

	resources, err := s.Client.ListResources(ctx, identity, gvr, namespace)
	if err != nil {
		s.Logger.Error("failed to list resources", "gvr", gvr, "namespace", namespace, "error", err)
		return nil, err
	}

	return resources, nil
}

func (s *K8sService) GetResource(ctx context.Context, identity *RequestIdentity, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	s.Logger.Info("getting resource", "gvr", gvr, "namespace", namespace, "name", name, "user", getLogUser(identity))

	// Validate namespace and resource name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}
	if err := ValidateResourceName(gvr.Resource, name); err != nil {
		s.Logger.Error("invalid resource name", "error", err)
		return nil, err
	}

	resource, err := s.Client.GetResource(ctx, identity, gvr, namespace, name)
	if err != nil {
		s.Logger.Error("failed to get resource", "gvr", gvr, "namespace", namespace, "name", name, "error", err)
		return nil, err
	}

	return resource, nil
}

func (s *K8sService) CreateResource(ctx context.Context, identity *RequestIdentity, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	s.Logger.Info("creating resource", "gvr", gvr, "namespace", namespace, "name", obj.GetName(), "user", getLogUser(identity))

	// Validate namespace and resource name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}
	if err := ValidateResourceName(gvr.Resource, obj.GetName()); err != nil {
		s.Logger.Error("invalid resource name", "error", err)
		return nil, err
	}

	resource, err := s.Client.CreateResource(ctx, identity, gvr, namespace, obj)
	if err != nil {
		s.Logger.Error("failed to create resource", "gvr", gvr, "namespace", namespace, "name", obj.GetName(), "error", err)
		return nil, err
	}

	return resource, nil
}

// getLogUser returns a safe string representation of the user for logging
func getLogUser(identity *RequestIdentity) string {
	if identity == nil {
		return "service-account"
	}
	return identity.UserID
}

// GetAccessibleNamespaces returns namespaces the user can access, with admin optimization
// This method contains business logic: it checks if the user is a cluster admin first,
// and if not, filters namespaces by checking access permissions for each one.
func (s *K8sService) GetAccessibleNamespaces(ctx context.Context, identity *RequestIdentity) ([]v1.Namespace, error) {
	s.Logger.Info("fetching accessible namespaces", "user", identity.UserID)

	// Optimization: Check if user is cluster admin first
	isAdmin, err := s.Client.IsClusterAdmin(identity)
	if err == nil && isAdmin {
		s.Logger.Debug("user is cluster admin, returning all namespaces", "user", identity.UserID)
		return s.Client.GetNamespaces(ctx, identity)
	}

	// Get all namespaces (or OpenShift Projects if forbidden)
	namespaces, err := s.Client.GetNamespaces(ctx, identity)
	if err != nil {
		s.Logger.Error("failed to get namespaces", "error", err)
		return nil, err
	}

	// Filter by permission
	allowed := make([]v1.Namespace, 0)
	for _, ns := range namespaces {
		canAccess, err := s.Client.CanAccessResource(ctx, identity, ns.Name, "get", "", "namespaces", "")
		if err != nil {
			s.Logger.Warn("failed to check namespace access", "namespace", ns.Name, "error", err)
			continue
		}
		if canAccess {
			allowed = append(allowed, ns)
		}
	}

	s.Logger.Info("filtered namespaces by permission", "user", identity.UserID, "total", len(namespaces), "accessible", len(allowed))
	return allowed, nil
}

// ExtractServiceAccountName extracts the service account name from a Kubernetes username
// If the username is a service account (format: system:serviceaccount:namespace:name),
// it returns just the service account name. Otherwise, it returns the full username.
func ExtractServiceAccountName(username string) string {
	const saPrefix = "system:serviceaccount:"
	if len(username) > len(saPrefix) && username[:len(saPrefix)] == saPrefix {
		parts := strings.SplitN(username[len(saPrefix):], ":", 2)
		if len(parts) == 2 {
			return parts[1] // Return just the SA name
		}
	}
	return username
}
