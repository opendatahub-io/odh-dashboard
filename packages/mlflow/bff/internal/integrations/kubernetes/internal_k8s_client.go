package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	helper "github.com/opendatahub-io/mlflow/bff/internal/helpers"
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

	isAdmin, err := kc.IsClusterAdmin(identity)
	if err != nil {
		kc.Logger.Warn("failed to check cluster admin status", "user", identity.UserID, "error", err)
	} else if isAdmin {
		namespaceList, listErr := kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
		if listErr != nil {
			return nil, fmt.Errorf("failed to list namespaces: %w", listErr)
		}
		return namespaceList.Items, nil
	}

	namespaceList, err := kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	return kc.filterAccessibleNamespaces(ctx, namespaceList.Items, identity)
}

const sarWorkerCount = 10

type sarResult struct {
	namespace corev1.Namespace
	allowed   bool
	err       error
}

// filterAccessibleNamespaces runs parallel SubjectAccessReview checks to
// determine which namespaces the user can access.
func (kc *InternalKubernetesClient) filterAccessibleNamespaces(ctx context.Context, namespaces []corev1.Namespace, identity *RequestIdentity) ([]corev1.Namespace, error) {
	jobs := make(chan corev1.Namespace, len(namespaces))
	results := make(chan sarResult, len(namespaces))

	for w := 0; w < sarWorkerCount; w++ {
		go kc.sarWorker(ctx, identity, jobs, results)
	}

	go func() {
		defer close(jobs)
		for _, ns := range namespaces {
			select {
			case <-ctx.Done():
				return
			case jobs <- ns:
			}
		}
	}()

	return kc.collectSARResults(ctx, len(namespaces), results, identity)
}

func (kc *InternalKubernetesClient) sarWorker(ctx context.Context, identity *RequestIdentity, jobs <-chan corev1.Namespace, results chan<- sarResult) {
	for {
		select {
		case <-ctx.Done():
			return
		case ns, ok := <-jobs:
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
						Namespace: ns.Name,
					},
				},
			}
			response, err := kc.Client.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
			select {
			case <-ctx.Done():
				return
			case results <- sarResult{namespace: ns, allowed: err == nil && response.Status.Allowed, err: err}:
			}
		}
	}
}

func (kc *InternalKubernetesClient) collectSARResults(ctx context.Context, total int, results <-chan sarResult, identity *RequestIdentity) ([]corev1.Namespace, error) {
	var allowed []corev1.Namespace
	var errorCount int

	for processed := 0; processed < total; processed++ {
		select {
		case <-ctx.Done():
			kc.Logger.Warn("context cancelled during namespace access checks",
				"user", identity.UserID,
				"processed", processed,
				"total", total)
			return allowed, ctx.Err()
		case result := <-results:
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
		"total_namespaces", total,
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
