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

func (s *K8sService) GetNamespaces(ctx context.Context) ([]v1.Namespace, error) {
	s.loggerWithIdentity(ctx).Info("fetching namespaces")

	namespaces, err := s.Client.GetNamespaces(ctx)
	if err != nil {
		s.Logger.Error("failed to get namespaces", "error", err)
		return nil, err
	}

	return namespaces, nil
}

// GetNamespaceInfos retrieves namespaces with display names
func (s *K8sService) GetNamespaceInfos(ctx context.Context) ([]NamespaceInfo, error) {
	s.loggerWithIdentity(ctx).Info("fetching namespace infos")

	namespaces, err := s.Client.GetNamespaces(ctx)
	if err != nil {
		s.Logger.Error("failed to get namespaces", "error", err)
		return nil, err
	}

	infos := make([]NamespaceInfo, 0, len(namespaces))
	for _, ns := range namespaces {
		displayName := ns.Name
		if dn := ns.Annotations["openshift.io/display-name"]; dn != "" {
			displayName = dn
		}

		infos = append(infos, NamespaceInfo{
			Name:        ns.Name,
			DisplayName: displayName,
		})
	}

	return infos, nil
}

func (s *K8sService) GetPods(ctx context.Context, namespace string) (*v1.PodList, error) {
	s.loggerWithIdentity(ctx).Info("fetching pods", "namespace", namespace)

	// Validate namespace name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}

	pods, err := s.Client.GetPods(ctx, namespace)
	if err != nil {
		s.Logger.Error("failed to get pods", "namespace", namespace, "error", err)
		return nil, err
	}

	return pods, nil
}

func (s *K8sService) GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error) {
	s.loggerWithIdentity(ctx).Info("fetching secrets", "namespace", namespace)

	// Validate namespace name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}

	secrets, err := s.Client.GetSecrets(ctx, namespace)
	if err != nil {
		s.Logger.Error("failed to get secrets", "namespace", namespace, "error", err)
		return nil, err
	}

	return secrets, nil
}

func (s *K8sService) GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
	s.loggerWithIdentity(ctx).Info("fetching secret", "namespace", namespace, "secretName", secretName)

	// Validate namespace and secret name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}
	if err := ValidateResourceName("secret", secretName); err != nil {
		s.Logger.Error("invalid secret name", "error", err)
		return nil, err
	}

	secret, err := s.Client.GetSecret(ctx, namespace, secretName)
	if err != nil {
		s.Logger.Error("failed to get secret", "namespace", namespace, "secretName", secretName, "error", err)
		return nil, err
	}

	return secret, nil
}

func (s *K8sService) GetUser(ctx context.Context) (string, error) {
	s.loggerWithIdentity(ctx).Info("getting user identity")

	user, err := s.Client.GetUser(ctx)
	if err != nil {
		s.Logger.Error("failed to get user identity", "error", err)
		return "", err
	}

	return user, nil
}

func (s *K8sService) IsClusterAdmin(ctx context.Context) (bool, error) {
	s.loggerWithIdentity(ctx).Info("checking cluster admin status")

	isAdmin, err := s.Client.IsClusterAdmin(ctx)
	if err != nil {
		s.Logger.Error("failed to check cluster admin status", "error", err)
		return false, err
	}

	return isAdmin, nil
}

// GetUserInfo retrieves user identity and admin status in a single call
func (s *K8sService) GetUserInfo(ctx context.Context) (*UserInfo, error) {
	s.loggerWithIdentity(ctx).Info("getting user info")

	username, err := s.Client.GetUser(ctx)
	if err != nil {
		s.Logger.Error("failed to get user identity", "error", err)
		return nil, err
	}

	isAdmin, err := s.Client.IsClusterAdmin(ctx)
	if err != nil {
		s.Logger.Error("failed to check cluster admin status", "error", err)
		return nil, err
	}

	return &UserInfo{
		UserID:       username,
		ClusterAdmin: isAdmin,
	}, nil
}

func (s *K8sService) CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
	s.loggerWithIdentity(ctx).Info("checking resource access", "namespace", namespace, "verb", verb, "resource", resource)

	// Validate namespace if provided
	if namespace != "" {
		if err := ValidateNamespaceName(namespace); err != nil {
			s.Logger.Error("invalid namespace name", "error", err)
			return false, err
		}
	}

	canAccess, err := s.Client.CanAccessResource(ctx, namespace, verb, group, resource, name)
	if err != nil {
		s.Logger.Error("failed to check resource access", "namespace", namespace, "verb", verb, "resource", resource, "error", err)
		return false, err
	}

	return canAccess, nil
}

func (s *K8sService) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	s.loggerWithIdentity(ctx).Info("listing resources", "gvr", gvr, "namespace", namespace)

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
	s.loggerWithIdentity(ctx).Info("getting resource", "gvr", gvr, "namespace", namespace, "name", name)

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
	s.loggerWithIdentity(ctx).Info("creating resource", "gvr", gvr, "namespace", namespace, "name", obj.GetName())

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

// GetAccessibleNamespaces returns namespaces the user can access, with admin optimization
// This method contains business logic: it checks if the user is a cluster admin first,
// and if not, filters namespaces by checking access permissions for each one.
func (s *K8sService) GetAccessibleNamespaces(ctx context.Context) ([]v1.Namespace, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("fetching accessible namespaces")

	// Optimization: Check if user is cluster admin first
	isAdmin, err := s.Client.IsClusterAdmin(ctx)
	if err == nil && isAdmin {
		logger.Debug("user is cluster admin, returning all namespaces")
		return s.Client.GetNamespaces(ctx)
	}

	// Get all namespaces (or OpenShift Projects if forbidden)
	namespaces, err := s.Client.GetNamespaces(ctx)
	if err != nil {
		s.Logger.Error("failed to get namespaces", "error", err)
		return nil, err
	}

	// Filter by permission
	allowed := make([]v1.Namespace, 0)
	for _, ns := range namespaces {
		canAccess, err := s.Client.CanAccessResource(ctx, ns.Name, "get", "", "namespaces", "")
		if err != nil {
			s.Logger.Warn("failed to check namespace access", "namespace", ns.Name, "error", err)
			continue
		}
		if canAccess {
			allowed = append(allowed, ns)
		}
	}

	logger.Info("filtered namespaces by permission", "total", len(namespaces), "accessible", len(allowed))
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

// DiscoverResourceGVR discovers the preferred API version for a custom resource
// by trying known versions in preference order (newer to older).
// Adds validation, logging, and error handling around the client implementation.
func (s *K8sService) DiscoverResourceGVR(
	ctx context.Context,
	group, resource, namespace string,
	knownVersions []string,
) (schema.GroupVersionResource, error) {
	s.loggerWithIdentity(ctx).Info("discovering resource GVR",
		"group", group,
		"resource", resource,
		"namespace", namespace,
		"versions", knownVersions)

	// Validate namespace name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return schema.GroupVersionResource{}, err
	}

	// Validate inputs
	if group == "" {
		s.Logger.Error("group cannot be empty")
		return schema.GroupVersionResource{}, &ValidationError{Field: "group", Message: "group cannot be empty"}
	}
	if resource == "" {
		s.Logger.Error("resource cannot be empty")
		return schema.GroupVersionResource{}, &ValidationError{Field: "resource", Message: "resource cannot be empty"}
	}
	if len(knownVersions) == 0 {
		s.Logger.Error("knownVersions cannot be empty")
		return schema.GroupVersionResource{}, &ValidationError{Field: "knownVersions", Message: "at least one version must be specified"}
	}

	gvr, err := s.Client.DiscoverResourceGVR(ctx, group, resource, namespace, knownVersions)
	if err != nil {
		s.Logger.Error("failed to discover GVR",
			"group", group,
			"resource", resource,
			"namespace", namespace,
			"error", err)
		return schema.GroupVersionResource{}, err
	}

	s.Logger.Debug("discovered GVR",
		"group", group,
		"resource", resource,
		"version", gvr.Version,
		"namespace", namespace)

	return gvr, nil
}

// loggerWithIdentity extracts identity from context and returns a logger with the user field attached.
// If identity extraction fails, it logs the error and returns the base logger (without user field).
// This should never happen in production if middleware is configured correctly.
func (s *K8sService) loggerWithIdentity(ctx context.Context) *slog.Logger {
	identity, err := IdentityFromContext(ctx)
	if err != nil {
		// This indicates a middleware configuration issue - log but don't fail the request
		s.Logger.Error("missing identity in context", "error", err)
		return s.Logger
	}
	// Return a logger with user field already attached
	return s.Logger.With("user", identity.UserID)
}
