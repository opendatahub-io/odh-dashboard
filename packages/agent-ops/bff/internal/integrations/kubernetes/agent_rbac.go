package kubernetes

import (
	"context"
	"fmt"
	"time"

	authv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const sandboxAPIGroup = "agents.x-k8s.io"

func (kc *InternalKubernetesClient) CanGetAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace, name string) (bool, error) {
	return kc.canAccessAgentSandbox(ctx, identity, namespace, name, "get")
}

func (kc *InternalKubernetesClient) CanPatchAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace, name string) (bool, error) {
	return kc.canAccessAgentSandbox(ctx, identity, namespace, name, "patch")
}

func (kc *InternalKubernetesClient) CanDeleteAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace, name string) (bool, error) {
	return kc.canAccessAgentSandbox(ctx, identity, namespace, name, "delete")
}

func (kc *InternalKubernetesClient) canAccessAgentSandbox(
	ctx context.Context,
	identity *RequestIdentity,
	namespace, name, verb string,
) (bool, error) {
	return kc.subjectAccessReviewGroup(ctx, identity, namespace, name, sandboxAPIGroup, "sandboxes", verb)
}

func (kc *InternalKubernetesClient) CanListAgentsInNamespace(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error) {
	return kc.subjectAccessReviewGroup(ctx, identity, namespace, "", sandboxAPIGroup, "sandboxes", "list")
}

func (kc *TokenKubernetesClient) CanListAgentsInNamespace(ctx context.Context, _ *RequestIdentity, namespace string) (bool, error) {
	return kc.selfSubjectAccessReviewGroup(ctx, namespace, "", sandboxAPIGroup, "sandboxes", "list")
}

func (kc *TokenKubernetesClient) CanGetAgentInNamespace(ctx context.Context, _ *RequestIdentity, namespace, name string) (bool, error) {
	return kc.canAccessAgentSandbox(ctx, namespace, name, "get")
}

func (kc *TokenKubernetesClient) CanPatchAgentInNamespace(ctx context.Context, _ *RequestIdentity, namespace, name string) (bool, error) {
	return kc.canAccessAgentSandbox(ctx, namespace, name, "patch")
}

func (kc *TokenKubernetesClient) CanDeleteAgentInNamespace(ctx context.Context, _ *RequestIdentity, namespace, name string) (bool, error) {
	return kc.canAccessAgentSandbox(ctx, namespace, name, "delete")
}

func (kc *TokenKubernetesClient) canAccessAgentSandbox(ctx context.Context, namespace, name, verb string) (bool, error) {
	return kc.selfSubjectAccessReviewGroup(ctx, namespace, name, sandboxAPIGroup, "sandboxes", verb)
}

type deployResourceCheck struct {
	group    string
	resource string
	verb     string
}

var agentDeployChecks = []deployResourceCheck{
	{sandboxAPIGroup, "sandboxes", "create"},
	{sandboxAPIGroup, "sandboxes", "get"},
}

func (kc *InternalKubernetesClient) CanDeployAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error) {
	for _, r := range agentDeployChecks {
		allowed, err := kc.subjectAccessReviewGroup(ctx, identity, namespace, "", r.group, r.resource, r.verb)
		if err != nil {
			return false, err
		}
		if !allowed {
			return false, nil
		}
	}
	return true, nil
}

func (kc *TokenKubernetesClient) CanDeployAgentInNamespace(ctx context.Context, _ *RequestIdentity, namespace string) (bool, error) {
	for _, r := range agentDeployChecks {
		allowed, err := kc.selfSubjectAccessReviewGroup(ctx, namespace, "", r.group, r.resource, r.verb)
		if err != nil {
			return false, err
		}
		if !allowed {
			return false, nil
		}
	}
	return true, nil
}

func (kc *InternalKubernetesClient) subjectAccessReviewGroup(
	ctx context.Context,
	identity *RequestIdentity,
	namespace, name, apiGroup, resource, verb string,
) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	attrs := &authv1.ResourceAttributes{
		Verb:      verb,
		Resource:  resource,
		Namespace: namespace,
	}
	if apiGroup != "" {
		attrs.Group = apiGroup
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

	response, err := kc.authorizationClient().AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		return false, fmt.Errorf("SAR failed: %w", err)
	}
	return response.Status.Allowed, nil
}

func (kc *TokenKubernetesClient) selfSubjectAccessReviewGroup(
	ctx context.Context,
	namespace, name, apiGroup, resource, verb string,
) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	attrs := &authv1.ResourceAttributes{
		Verb:      verb,
		Resource:  resource,
		Namespace: namespace,
	}
	if apiGroup != "" {
		attrs.Group = apiGroup
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
