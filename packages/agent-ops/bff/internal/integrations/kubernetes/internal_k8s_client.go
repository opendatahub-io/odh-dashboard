package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

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
			Client: clientset,
			Logger: logger,
			Token:  NewBearerToken(kubeconfig.BearerToken),
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

	// List namespaces
	namespaceList, err := kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	// Optimization 2: Worker pool for parallel SAR processing
	// Use a fixed number of workers to process namespace checks, providing better resource control
	const numWorkers = 10 // Fixed number of workers to avoid resource overhead

	type sarJob struct {
		namespace corev1.Namespace
	}

	type sarResult struct {
		namespace corev1.Namespace
		allowed   bool
		err       error
	}

	// Create job and result channels
	jobs := make(chan sarJob, len(namespaceList.Items))
	results := make(chan sarResult, len(namespaceList.Items))

	// Start worker pool
	for w := 0; w < numWorkers; w++ {
		go func() {
			for {
				select {
				case <-ctx.Done():
					// Respect context cancellation
					return
				case job, ok := <-jobs:
					if !ok {
						// Jobs channel closed, exit worker
						return
					}

					// Perform SAR check
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
						// Context cancelled, exit worker
						return
					case results <- sarResult{
						namespace: job.namespace,
						allowed:   err == nil && response.Status.Allowed,
						err:       err,
					}:
						// Result sent successfully
					}
				}
			}
		}()
	}

	// Send jobs to workers
	go func() {
		defer close(jobs)
		for _, ns := range namespaceList.Items {
			select {
			case <-ctx.Done():
				// Context cancelled, stop sending jobs
				return
			case jobs <- sarJob{namespace: ns}:
				// Job sent successfully
			}
		}
	}()

	// Collect results
	var allowed []corev1.Namespace
	errorCount := 0
	processed := 0

	for processed < len(namespaceList.Items) {
		select {
		case <-ctx.Done():
			// Context cancelled, return what we have so far
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
