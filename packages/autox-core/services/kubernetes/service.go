package kubernetes

import (
	"context"
	"crypto/sha256"
	"fmt"
	"log/slog"

	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// Client defines the contract for Kubernetes operations.
//
// Security: Identity is REQUIRED for all operations and must be stored in the context
// via ContextWithIdentity before calling any method. Missing identity is rejected to
// prevent privilege escalation and ensure RBAC enforcement.
//
// Identity behavior by implementation:
//   - internalClient: Creates impersonated clients scoped to user's RBAC permissions.
//   - tokenClient: Uses token from identity for bearer authentication.
//
// Always inject identity into context via middleware (InjectRequestIdentity).
type Client interface {
	// Generic resource operations
	ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error)
	GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error)
	CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error)

	// Common resource operations
	GetNamespaces(ctx context.Context) ([]v1.Namespace, error)
	GetPods(ctx context.Context, namespace string) (*v1.PodList, error)
	GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error)
	GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error)

	// User identity and permissions
	GetUser(ctx context.Context) (string, error)
	IsClusterAdmin(ctx context.Context) (bool, error)
	CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error)

	// DiscoverResourceGVR discovers the preferred API version for a custom resource
	// by trying known versions in preference order (newer to older).
	// Returns the first working GroupVersionResource or an error if none are available.
	DiscoverResourceGVR(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error)
}

// Service defines the public contract for the Kubernetes service layer.
// Consumers should depend on this interface to enable mock substitution in tests.
type Service interface {
	GetNamespaces(ctx context.Context) ([]v1.Namespace, error)
	GetNamespaceInfos(ctx context.Context) ([]NamespaceInfo, error)
	GetAccessibleNamespaces(ctx context.Context) ([]v1.Namespace, error)
	GetAccessibleNamespaceInfos(ctx context.Context) ([]NamespaceInfo, error)
	GetPods(ctx context.Context, namespace string) (*v1.PodList, error)
	GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error)
	GetSecretInfos(ctx context.Context, namespace string) ([]SecretInfo, error)
	GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error)
	GetUser(ctx context.Context) (string, error)
	IsClusterAdmin(ctx context.Context) (bool, error)
	GetUserInfo(ctx context.Context) (*UserInfo, error)
	CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error)
	ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error)
	GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error)
	CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error)
	DiscoverResourceGVR(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error)
}

type ServiceConfig struct {
	Logger *slog.Logger
}

type service struct {
	Client Client
	Logger *slog.Logger
}

// Compile-time interface check.
var _ Service = (*service)(nil)

func NewService(cfg ServiceConfig, client Client) Service {
	return &service{
		Client: client,
		Logger: cfg.Logger,
	}
}

// --- Namespaces ---

func (s *service) GetNamespaces(ctx context.Context) ([]v1.Namespace, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("fetching namespaces")

	namespaces, err := s.Client.GetNamespaces(ctx)
	if err != nil {
		s.Logger.Error("failed to get namespaces", "error", err)
		return nil, TranslateK8sError(err, "namespaces", "list")
	}

	return namespaces, nil
}

// GetNamespaceInfos retrieves namespaces with display names.
// Does NOT perform permission filtering — use GetAccessibleNamespaceInfos for that.
func (s *service) GetNamespaceInfos(ctx context.Context) ([]NamespaceInfo, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("fetching namespace infos")

	namespaces, err := s.Client.GetNamespaces(ctx)
	if err != nil {
		s.Logger.Error("failed to get namespaces", "error", err)
		return nil, TranslateK8sError(err, "namespaces", "list")
	}

	return mapNamespacesToInfos(namespaces), nil
}

// GetAccessibleNamespaces returns namespaces the user can access.
func (s *service) GetAccessibleNamespaces(ctx context.Context) ([]v1.Namespace, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Debug("fetching accessible namespaces")

	// Skip per-namespace SSAR checks for cluster admins — they can access everything.
	// This avoids N+1 API calls (one SSAR per namespace).
	isAdmin, err := s.Client.IsClusterAdmin(ctx)
	if err == nil && isAdmin {
		logger.Debug("user is cluster admin, returning all namespaces")
		namespaces, err := s.Client.GetNamespaces(ctx)
		if err != nil {
			return nil, TranslateK8sError(err, "namespaces", "list")
		}
		return namespaces, nil
	}

	namespaces, err := s.Client.GetNamespaces(ctx)
	if err != nil {
		s.Logger.Error("failed to get namespaces", "error", err)
		return nil, TranslateK8sError(err, "namespaces", "list")
	}

	// Filter by per-namespace SSAR check
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

// GetAccessibleNamespaceInfos returns namespaces the user can access with display names.
func (s *service) GetAccessibleNamespaceInfos(ctx context.Context) ([]NamespaceInfo, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Debug("fetching accessible namespace infos")

	isAdmin, err := s.Client.IsClusterAdmin(ctx)
	if err == nil && isAdmin {
		logger.Debug("user is cluster admin, returning all namespace infos")
		namespaces, err := s.Client.GetNamespaces(ctx)
		if err != nil {
			s.Logger.Error("failed to get namespaces", "error", err)
			return nil, TranslateK8sError(err, "namespaces", "list")
		}
		return mapNamespacesToInfos(namespaces), nil
	}

	namespaces, err := s.Client.GetNamespaces(ctx)
	if err != nil {
		s.Logger.Error("failed to get namespaces", "error", err)
		return nil, TranslateK8sError(err, "namespaces", "list")
	}

	infos := make([]NamespaceInfo, 0)
	for _, ns := range namespaces {
		canAccess, err := s.Client.CanAccessResource(ctx, ns.Name, "get", "", "namespaces", "")
		if err != nil {
			s.Logger.Warn("failed to check namespace access", "namespace", ns.Name, "error", err)
			continue
		}
		if canAccess {
			displayName := ns.Name
			if dn := ns.Annotations["openshift.io/display-name"]; dn != "" {
				displayName = dn
			}
			infos = append(infos, NamespaceInfo{
				Name:        ns.Name,
				DisplayName: displayName,
			})
		}
	}

	logger.Info("filtered namespace infos by permission", "total", len(namespaces), "accessible", len(infos))
	return infos, nil
}

// --- Pods ---

func (s *service) GetPods(ctx context.Context, namespace string) (*v1.PodList, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("fetching pods", "namespace", namespace)

	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}

	pods, err := s.Client.GetPods(ctx, namespace)
	if err != nil {
		s.Logger.Error("failed to get pods", "namespace", namespace, "error", err)
		return nil, TranslateK8sError(err, "pods", "list")
	}

	return pods, nil
}

// --- Secrets ---

func (s *service) GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("fetching secrets", "namespace", namespace)

	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}

	secrets, err := s.Client.GetSecrets(ctx, namespace)
	if err != nil {
		s.Logger.Error("failed to get secrets", "namespace", namespace, "error", err)
		return nil, TranslateK8sError(err, "secrets", "list")
	}

	return secrets, nil
}

// GetSecretInfos retrieves all secrets from a namespace with raw key data.
// Filtering and redaction are the responsibility of the caller.
func (s *service) GetSecretInfos(ctx context.Context, namespace string) ([]SecretInfo, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("fetching secret infos", "namespace", namespace)

	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}

	secrets, err := s.Client.GetSecrets(ctx, namespace)
	if err != nil {
		s.Logger.Error("failed to get secrets", "namespace", namespace, "error", err)
		return nil, TranslateK8sError(err, "secrets", "list")
	}

	secretInfos := make([]SecretInfo, 0, len(secrets))
	for _, secret := range secrets {
		var responseType string
		if annotationType, hasAnnotation := secret.Annotations["opendatahub.io/connection-type"]; hasAnnotation && annotationType != "" {
			responseType = annotationType
		}

		secretInfos = append(secretInfos, SecretInfo{
			UUID:        string(secret.UID),
			Name:        secret.Name,
			Type:        responseType,
			Data:        buildKeysMap(secret),
			DisplayName: secret.Annotations["openshift.io/display-name"],
			Description: secret.Annotations["openshift.io/description"],
		})
	}

	return secretInfos, nil
}

func (s *service) GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Debug("fetching secret", "namespace", namespace, "secretName", secretName)

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
		return nil, TranslateK8sError(err, "secret", "get")
	}

	return secret, nil
}

// --- User & Auth ---

func (s *service) GetUser(ctx context.Context) (string, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("getting user identity")

	user, err := s.Client.GetUser(ctx)
	if err != nil {
		s.Logger.Error("failed to get user identity", "error", err)
		return "", TranslateK8sError(err, "user", "get")
	}

	return user, nil
}

func (s *service) IsClusterAdmin(ctx context.Context) (bool, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("checking cluster admin status")

	isAdmin, err := s.Client.IsClusterAdmin(ctx)
	if err != nil {
		s.Logger.Error("failed to check cluster admin status", "error", err)
		return false, TranslateK8sError(err, "user", "check admin status")
	}

	return isAdmin, nil
}

// GetUserInfo retrieves user identity and admin status in a single call.
// For service accounts, returns just the SA name (not the full system:serviceaccount:namespace:name format).
func (s *service) GetUserInfo(ctx context.Context) (*UserInfo, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("getting user info")

	username, err := s.Client.GetUser(ctx)
	if err != nil {
		s.Logger.Error("failed to get user identity", "error", err)
		return nil, TranslateK8sError(err, "user", "get")
	}

	isAdmin, err := s.Client.IsClusterAdmin(ctx)
	if err != nil {
		s.Logger.Error("failed to check cluster admin status", "error", err)
		return nil, TranslateK8sError(err, "user", "check admin status")
	}

	return &UserInfo{
		UserID:       extractServiceAccountName(username),
		ClusterAdmin: isAdmin,
	}, nil
}

func (s *service) CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Debug("checking resource access", "namespace", namespace, "verb", verb, "resource", resource)

	if namespace != "" {
		if err := ValidateNamespaceName(namespace); err != nil {
			s.Logger.Error("invalid namespace name", "error", err)
			return false, err
		}
	}

	canAccess, err := s.Client.CanAccessResource(ctx, namespace, verb, group, resource, name)
	if err != nil {
		s.Logger.Error("failed to check resource access", "namespace", namespace, "verb", verb, "resource", resource, "error", err)
		return false, TranslateK8sError(err, resource, verb)
	}

	return canAccess, nil
}

// --- Generic Resources ---

func (s *service) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("listing resources", "gvr", gvr, "namespace", namespace)

	if namespace != "" {
		if err := ValidateNamespaceName(namespace); err != nil {
			s.Logger.Error("invalid namespace name", "error", err)
			return nil, err
		}
	}

	resources, err := s.Client.ListResources(ctx, gvr, namespace)
	if err != nil {
		s.Logger.Error("failed to list resources", "gvr", gvr, "namespace", namespace, "error", err)
		return nil, TranslateK8sError(err, gvr.Resource, "list")
	}

	return resources, nil
}

func (s *service) GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("getting resource", "gvr", gvr, "namespace", namespace, "name", name)

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
		return nil, TranslateK8sError(err, gvr.Resource, "get")
	}

	return resource, nil
}

func (s *service) CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("creating resource", "gvr", gvr, "namespace", namespace, "name", obj.GetName())

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
		return nil, TranslateK8sError(err, gvr.Resource, "create")
	}

	return resource, nil
}

// --- Discovery ---

// DiscoverResourceGVR discovers the preferred API version for a custom resource
// by trying known versions in preference order (newer to older).
func (s *service) DiscoverResourceGVR(
	ctx context.Context,
	group, resource, namespace string,
	knownVersions []string,
) (schema.GroupVersionResource, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("discovering resource GVR",
		"group", group,
		"resource", resource,
		"namespace", namespace,
		"versions", knownVersions)

	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return schema.GroupVersionResource{}, err
	}

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
		return schema.GroupVersionResource{}, TranslateK8sError(err, resource, "discover")
	}

	s.Logger.Debug("discovered GVR",
		"group", group,
		"resource", resource,
		"version", gvr.Version,
		"namespace", namespace)

	return gvr, nil
}

// --- Internal ---

func (s *service) loggerWithIdentity(ctx context.Context) *slog.Logger {
	return LoggerWithIdentity(ctx, s.Logger)
}

// LoggerWithIdentity returns logger enriched with the user from context.
// In user_token auth mode, UserID is empty so a short token hash is used as
// a correlation ID instead (deterministic, non-reversible, safe to log).
// Falls back to the base logger silently if identity is not in context
// (expected on paths that skip identity injection, e.g. healthcheck).
func LoggerWithIdentity(ctx context.Context, logger *slog.Logger) *slog.Logger {
	identity, err := IdentityFromContext(ctx)
	if err != nil {
		return logger
	}
	if identity.UserID != "" {
		return logger.With("user", identity.UserID)
	}
	if identity.Token != "" {
		sum := sha256.Sum256([]byte(identity.Token))
		return logger.With("user", fmt.Sprintf("token:%x", sum[:4]))
	}
	return logger
}
