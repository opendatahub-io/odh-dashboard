package kubernetes

import (
	"context"
	"fmt"
	"time"

	authv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func (kc *InternalKubernetesClient) CanListAgentsInNamespace(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error) {
	return kc.subjectAccessReview(ctx, identity, namespace, "", "deployments", "list")
}

func (kc *InternalKubernetesClient) CanGetAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace, name string) (bool, error) {
	allowedDeploy, err := kc.subjectAccessReview(ctx, identity, namespace, name, "deployments", "get")
	if err != nil || !allowedDeploy {
		return allowedDeploy, err
	}
	return kc.subjectAccessReview(ctx, identity, namespace, name, "services", "get")
}

func (kc *TokenKubernetesClient) CanListAgentsInNamespace(ctx context.Context, _ *RequestIdentity, namespace string) (bool, error) {
	return kc.selfSubjectAccessReview(ctx, namespace, "", "deployments", "list")
}

func (kc *TokenKubernetesClient) CanGetAgentInNamespace(ctx context.Context, _ *RequestIdentity, namespace, name string) (bool, error) {
	allowedDeploy, err := kc.selfSubjectAccessReview(ctx, namespace, name, "deployments", "get")
	if err != nil || !allowedDeploy {
		return allowedDeploy, err
	}
	return kc.selfSubjectAccessReview(ctx, namespace, name, "services", "get")
}

func (kc *InternalKubernetesClient) subjectAccessReview(
	ctx context.Context,
	identity *RequestIdentity,
	namespace, name, resource, verb string,
) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	attrs := &authv1.ResourceAttributes{
		Verb:      verb,
		Resource:  resource,
		Namespace: namespace,
	}
	if name != "" {
		attrs.Name = name
	}

	sar := &authv1.SubjectAccessReview{
		Spec: authv1.SubjectAccessReviewSpec{
			User:               identity.UserID,
			Groups:             identity.Groups,
			ResourceAttributes: attrs,
		},
	}

	response, err := kc.Client.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		return false, fmt.Errorf("SAR failed: %w", err)
	}
	return response.Status.Allowed, nil
}

func (kc *TokenKubernetesClient) selfSubjectAccessReview(
	ctx context.Context,
	namespace, name, resource, verb string,
) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	attrs := &authv1.ResourceAttributes{
		Verb:      verb,
		Resource:  resource,
		Namespace: namespace,
	}
	if name != "" {
		attrs.Name = name
	}

	sar := &authv1.SelfSubjectAccessReview{
		Spec: authv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: attrs,
		},
	}

	resp, err := kc.Client.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		kc.Logger.Error("self-SAR failed", "namespace", namespace, "resource", resource, "verb", verb, "error", err)
		return false, err
	}
	return resp.Status.Allowed, nil
}
