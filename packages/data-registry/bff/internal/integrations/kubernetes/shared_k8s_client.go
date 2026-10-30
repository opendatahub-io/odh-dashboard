package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

var openshiftProjectsGVR = schema.GroupVersionResource{
	Group:    "project.openshift.io",
	Version:  "v1",
	Resource: "projects",
}

type SharedClientLogic struct {
	Client        kubernetes.Interface
	DynamicClient dynamic.Interface
	Logger        *slog.Logger
	Token         BearerToken
}

// Service discovery helpers removed for minimal starter footprint.

func (kc *SharedClientLogic) BearerToken() (string, error) { return kc.Token.Raw(), nil }

func (kc *SharedClientLogic) GetGroups(ctx context.Context) ([]string, error) { return []string{}, nil }

func (kc *SharedClientLogic) listNamespaces(ctx context.Context) ([]corev1.Namespace, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	namespaceList, err := kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err == nil {
		return namespaceList.Items, nil
	}

	if !k8serrors.IsForbidden(err) {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	if kc.DynamicClient == nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	// OpenShift applies the caller's RBAC visibility rules to this cluster-scoped
	// list because the client is authenticated with the caller's bearer token.
	projectList, err := kc.DynamicClient.Resource(openshiftProjectsGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list OpenShift projects: %w", err)
	}

	projects := make([]corev1.Namespace, 0, len(projectList.Items))
	for _, project := range projectList.Items {
		projects = append(projects, corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{Name: project.GetName()},
		})
	}

	return projects, nil
}

func (kc *SharedClientLogic) GetConnections(ctx context.Context, namespace string) ([]corev1.Secret, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	secretList, err := kc.Client.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "opendatahub.io/dashboard=true",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list secrets in namespace %s: %w", namespace, err)
	}

	var connections []corev1.Secret
	for _, secret := range secretList.Items {
		annotations := secret.Annotations
		if annotations == nil {
			continue
		}
		if _, ok := annotations["opendatahub.io/connection-type"]; ok {
			connections = append(connections, secret)
			continue
		}
		if _, ok := annotations["opendatahub.io/connection-type-ref"]; ok {
			connections = append(connections, secret)
		}
	}

	return connections, nil
}
