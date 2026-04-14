package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	helper "github.com/opendatahub-io/automl-library/bff/internal/helpers"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// InternalKubernetesClient uses the backend's service account credentials to perform
// operations with user impersonation via SubjectAccessReview.
//
// This client validates namespace existence before permission checks in GetSecrets,
// providing clearer error messages that distinguish "namespace not found" from
// "permission denied". This is feasible because the service account has cluster-level
// access. TokenKubernetesClient omits this check since it uses the user's token directly
// and cannot distinguish these cases as easily.
type InternalKubernetesClient struct {
	SharedClientLogic
}

// newInternalKubernetesClient creates a Kubernetes client
// using the credentials of the running backend to create a single instance of the client
// If running inside the cluster, it uses the pod's service account.
// If running locally (e.g. for development), it uses the current user's kubeconfig context.
func newInternalKubernetesClient(logger *slog.Logger) (KubernetesClientInterface, error) {
	// Get kubeconfig
	kubeconfig, err := helper.GetKubeconfig()
	if err != nil {
		logger.Error("failed to get kubeconfig", "error", err)
		return nil, fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	// Create client
	clientset, err := kubernetes.NewForConfig(kubeconfig)
	if err != nil {
		logger.Error("failed to create Kubernetes client", "error", err)
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	return &InternalKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client:     clientset,
			Logger:     logger,
			Token:      NewBearerToken(kubeconfig.BearerToken),
			RestConfig: kubeconfig,
		},
	}, nil
}

// Removed service discovery and service-level access checks for starter template.

func (kc *InternalKubernetesClient) GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Optimization 1: Early exit for cluster admins
	// Check if user is cluster-admin first to avoid individual SAR checks
	isAdmin, err := kc.IsClusterAdmin(identity)
	if err != nil {
		kc.Logger.Warn("failed to check cluster admin status", "user", identity.UserID, "error", err)
		// Continue with individual checks if cluster admin check fails
	} else if isAdmin {
		namespaceList, err := kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to list namespaces: %w", err)
		}
		return namespaceList.Items, nil
	}

	// List all namespaces and filter by SAR checks
	namespaceList, err := kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		if !k8serrors.IsForbidden(err) {
			return nil, fmt.Errorf("failed to list namespaces: %w", err)
		}
		// Service account cannot list namespaces (e.g. local dev without cluster-admin).
		// Fall back to the OpenShift Projects API with impersonation so the API server
		// enforces the caller's permissions, not the service account's.
		kc.Logger.Debug("cluster-wide namespace list forbidden, falling back to OpenShift Projects API", "error", err)
		return kc.getNamespacesViaProjectsAPI(ctx, identity)
	}

	// Worker pool for parallel SAR processing
	const numWorkers = 10

	type sarJob struct {
		namespace corev1.Namespace
	}

	type sarResult struct {
		namespace corev1.Namespace
		allowed   bool
		err       error
	}

	jobs := make(chan sarJob, len(namespaceList.Items))
	results := make(chan sarResult, len(namespaceList.Items))

	for w := 0; w < numWorkers; w++ {
		go func() {
			for {
				select {
				case <-ctx.Done():
					return
				case job, ok := <-jobs:
					if !ok {
						return
					}

					sar := &authv1.SubjectAccessReview{
						Spec: authv1.SubjectAccessReviewSpec{
							User:   identity.UserID,
							Groups: identity.Groups,
							ResourceAttributes: &authv1.ResourceAttributes{
								Verb:      "get",
								Resource:  "namespaces",
								Namespace: job.namespace.Name,
							},
						},
					}

					response, err := kc.Client.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})

					select {
					case <-ctx.Done():
						return
					case results <- sarResult{
						namespace: job.namespace,
						allowed:   err == nil && response.Status.Allowed,
						err:       err,
					}:
					}
				}
			}
		}()
	}

	go func() {
		defer close(jobs)
		for _, ns := range namespaceList.Items {
			select {
			case <-ctx.Done():
				return
			case jobs <- sarJob{namespace: ns}:
			}
		}
	}()

	var allowed []corev1.Namespace
	errorCount := 0
	processed := 0

	for processed < len(namespaceList.Items) {
		select {
		case <-ctx.Done():
			kc.Logger.Warn("context cancelled during namespace access checks",
				"user", identity.UserID,
				"processed", processed,
				"total", len(namespaceList.Items))
			return allowed, ctx.Err()
		case result := <-results:
			processed++
			if result.err != nil {
				kc.Logger.Error("failed SAR for namespace", "namespace", result.namespace.Name, "error", result.err)
				errorCount++
				continue
			}
			if result.allowed {
				allowed = append(allowed, result.namespace)
			}
		}
	}

	kc.Logger.Debug("namespace access check completed",
		"user", identity.UserID,
		"total_namespaces", len(namespaceList.Items),
		"accessible_namespaces", len(allowed),
		"errors", errorCount)

	return allowed, nil
}

// getNamespacesViaProjectsAPI uses the OpenShift Projects API to list namespaces
// accessible to the caller. An impersonated rest.Config is created from the caller's
// identity so the API server enforces authorization for the user, not the service account.
func (kc *InternalKubernetesClient) getNamespacesViaProjectsAPI(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error) {
	impersonatedConfig := rest.CopyConfig(kc.RestConfig)
	impersonatedConfig.Impersonate = rest.ImpersonationConfig{
		UserName: identity.UserID,
		Groups:   append([]string(nil), identity.Groups...),
	}
	// Clear client certificates to prevent credential leakage across user boundaries
	impersonatedConfig.CertData = nil
	impersonatedConfig.CertFile = ""
	impersonatedConfig.KeyData = nil
	impersonatedConfig.KeyFile = ""

	dynClient, err := dynamic.NewForConfig(impersonatedConfig)
	if err != nil {
		kc.Logger.Error("failed to create dynamic client for Projects API", "error", err)
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	typedClient, err := kubernetes.NewForConfig(impersonatedConfig)
	if err != nil {
		kc.Logger.Error("failed to create typed client for namespace details", "error", err)
		return nil, fmt.Errorf("failed to create typed client: %w", err)
	}

	projectGVR := schema.GroupVersionResource{
		Group:    "project.openshift.io",
		Version:  "v1",
		Resource: "projects",
	}

	projectList, err := dynClient.Resource(projectGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		kc.Logger.Error("failed to list OpenShift projects", "error", err)
		return nil, fmt.Errorf("failed to list projects: %w", err)
	}

	namespaces := make([]corev1.Namespace, 0, len(projectList.Items))
	for _, project := range projectList.Items {
		projectName := project.GetName()

		ns, err := typedClient.CoreV1().Namespaces().Get(ctx, projectName, metav1.GetOptions{})
		if err != nil {
			if k8serrors.IsNotFound(err) || k8serrors.IsForbidden(err) {
				kc.Logger.Warn("failed to get namespace details, using synthesized namespace", "namespace", projectName, "error", err)
				namespaces = append(namespaces, corev1.Namespace{
					ObjectMeta: metav1.ObjectMeta{
						Name:        projectName,
						Annotations: project.GetAnnotations(),
						Labels:      project.GetLabels(),
					},
				})
			} else {
				return nil, fmt.Errorf("failed to get namespace %q: %w", projectName, err)
			}
		} else {
			namespaces = append(namespaces, *ns)
		}
	}

	kc.Logger.Debug("listed namespaces via OpenShift Projects API", "count", len(namespaces))
	return namespaces, nil
}

// GetSecrets lists secrets in a namespace.
func (kc *InternalKubernetesClient) GetSecrets(ctx context.Context, namespace string, identity *RequestIdentity) ([]corev1.Secret, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Verify the namespace exists before permission checks to provide clearer error messages.
	// The service account can distinguish "namespace not found" from "permission denied",
	// improving UX compared to TokenKubernetesClient which cannot make this distinction.
	_, err := kc.Client.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		kc.Logger.Error("failed to get namespace", "namespace", namespace, "error", err)
		return nil, fmt.Errorf("namespace %s does not exist or is not accessible: %w", namespace, err)
	}

	// Check if user has permission to list secrets in the namespace
	sar := &authv1.SubjectAccessReview{
		Spec: authv1.SubjectAccessReviewSpec{
			User:   identity.UserID,
			Groups: identity.Groups,
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:      "list",
				Resource:  "secrets",
				Namespace: namespace,
			},
		},
	}

	response, err := kc.Client.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to check secret list permissions", "namespace", namespace, "user", identity.UserID, "error", err)
		return nil, fmt.Errorf("failed to check permissions to list secrets in namespace %s: %w", namespace, err)
	}

	if !response.Status.Allowed {
		kc.Logger.Warn("user not allowed to list secrets", "namespace", namespace, "user", identity.UserID)
		status := metav1.Status{
			Status:  metav1.StatusFailure,
			Reason:  metav1.StatusReasonForbidden,
			Message: fmt.Sprintf("user %s does not have permission to list secrets in namespace %s", identity.UserID, namespace),
			Code:    403,
		}
		return nil, &k8serrors.StatusError{ErrStatus: status}
	}

	secretList, err := kc.Client.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		kc.Logger.Error("failed to list secrets", "namespace", namespace, "error", err)
		return nil, fmt.Errorf("failed to list secrets in namespace %s: %w", namespace, err)
	}

	return secretList.Items, nil
}

// GetSecret retrieves a specific secret by name from a namespace.
func (kc *InternalKubernetesClient) GetSecret(ctx context.Context, namespace, secretName string, identity *RequestIdentity) (*corev1.Secret, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Verify the namespace exists first
	_, err := kc.Client.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		kc.Logger.Error("failed to get namespace", "namespace", namespace, "error", err)
		return nil, fmt.Errorf("namespace %s does not exist or is not accessible: %w", namespace, err)
	}

	// Check if user has permission to get the secret in the namespace
	sar := &authv1.SubjectAccessReview{
		Spec: authv1.SubjectAccessReviewSpec{
			User:   identity.UserID,
			Groups: identity.Groups,
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:      "get",
				Resource:  "secrets",
				Namespace: namespace,
				Name:      secretName,
			},
		},
	}

	response, err := kc.Client.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to check secret get permissions", "namespace", namespace, "secretName", secretName, "user", identity.UserID, "error", err)
		return nil, fmt.Errorf("failed to check permissions to get secret %s in namespace %s: %w", secretName, namespace, err)
	}

	if !response.Status.Allowed {
		kc.Logger.Warn("user not allowed to get secret", "namespace", namespace, "secretName", secretName, "user", identity.UserID)
		status := metav1.Status{
			Status:  metav1.StatusFailure,
			Reason:  metav1.StatusReasonForbidden,
			Message: fmt.Sprintf("user %s does not have permission to get secret %s in namespace %s", identity.UserID, secretName, namespace),
			Code:    403,
		}
		return nil, &k8serrors.StatusError{ErrStatus: status}
	}

	secret, err := kc.Client.CoreV1().Secrets(namespace).Get(ctx, secretName, metav1.GetOptions{})
	if err != nil {
		kc.Logger.Error("failed to get secret", "namespace", namespace, "secretName", secretName, "error", err)
		return nil, fmt.Errorf("failed to get secret %s in namespace %s: %w", secretName, namespace, err)
	}

	return secret, nil
}

func (kc *InternalKubernetesClient) IsClusterAdmin(identity *RequestIdentity) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	crbList, err := kc.Client.RbacV1().ClusterRoleBindings().List(ctx, metav1.ListOptions{})
	if err != nil {
		kc.Logger.Error("failed to list ClusterRoleBindings", "error", err)
		return false, fmt.Errorf("failed to list ClusterRoleBindings: %w", err)
	}

	for _, crb := range crbList.Items {
		if crb.RoleRef.Kind != "ClusterRole" || crb.RoleRef.Name != "cluster-admin" {
			continue
		}
		for _, subject := range crb.Subjects {
			if subject.Kind == "User" && subject.Name == identity.UserID {
				return true, nil
			}
		}
	}

	kc.Logger.Info("user is not cluster-admin", "user", identity.UserID)
	return false, nil
}

func (kc *InternalKubernetesClient) GetUser(identity *RequestIdentity) (string, error) {
	// On internal client, we can use the identity from request directly
	return identity.UserID, nil
}

// CanListDSPipelineApplications checks if the user can list DSPipelineApplications in the namespace
// Uses impersonation SubjectAccessReview since internal client uses service account credentials
func (kc *InternalKubernetesClient) CanListDSPipelineApplications(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if identity == nil {
		kc.Logger.Error("identity is nil")
		return false, fmt.Errorf("identity cannot be nil")
	}

	sar := &authv1.SubjectAccessReview{
		Spec: authv1.SubjectAccessReviewSpec{
			ResourceAttributes: &authv1.ResourceAttributes{
				Verb:      "list",
				Group:     "datasciencepipelinesapplications.opendatahub.io",
				Resource:  "datasciencepipelinesapplications",
				Namespace: namespace,
			},
			User:   identity.UserID,
			Groups: identity.Groups,
		},
	}

	resp, err := kc.Client.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("failed to check permissions for listing pipeline servers",
			"user", identity.UserID,
			"namespace", namespace,
			"error", err)
		return false, err
	}

	if !resp.Status.Allowed {
		kc.Logger.Info("user does not have permission to list pipeline servers in namespace",
			"user", identity.UserID,
			"namespace", namespace)
		return false, nil
	}

	return true, nil
}
