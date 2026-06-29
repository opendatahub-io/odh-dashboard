package kubernetes

import (
	"context"
	"fmt"
	"time"

	authv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var agentWorkloadResources = []string{"deployments", "statefulsets", "jobs"}

var longRunningAgentWorkloadResources = []string{"deployments", "statefulsets"}

func (kc *InternalKubernetesClient) CanGetAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace, name string) (bool, error) {
	allowedJob, err := kc.subjectAccessReview(ctx, identity, namespace, name, "jobs", "get")
	if err != nil {
		return false, err
	}
	if allowedJob {
		return true, nil
	}

	allowedWorkload, err := kc.anySubjectAccessReview(ctx, identity, namespace, name, longRunningAgentWorkloadResources, "get")
	if err != nil || !allowedWorkload {
		return allowedWorkload, err
	}
	return kc.subjectAccessReview(ctx, identity, namespace, name, "services", "get")
}

func (kc *InternalKubernetesClient) CanListAgentsInNamespace(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error) {
	return kc.anySubjectAccessReview(ctx, identity, namespace, "", agentWorkloadResources, "list")
}

func (kc *TokenKubernetesClient) CanListAgentsInNamespace(ctx context.Context, _ *RequestIdentity, namespace string) (bool, error) {
	return kc.anySelfSubjectAccessReview(ctx, namespace, "", agentWorkloadResources, "list")
}

func (kc *TokenKubernetesClient) CanGetAgentInNamespace(ctx context.Context, _ *RequestIdentity, namespace, name string) (bool, error) {
	allowedJob, err := kc.selfSubjectAccessReview(ctx, namespace, name, "jobs", "get")
	if err != nil {
		return false, err
	}
	if allowedJob {
		return true, nil
	}

	allowedWorkload, err := kc.anySelfSubjectAccessReview(ctx, namespace, name, longRunningAgentWorkloadResources, "get")
	if err != nil || !allowedWorkload {
		return allowedWorkload, err
	}
	return kc.selfSubjectAccessReview(ctx, namespace, name, "services", "get")
}

type deployResourceCheck struct {
	group    string
	resource string
	verb     string
}

var agentDeployChecks = []deployResourceCheck{
	{"", "serviceaccounts", "create"},
	{"", "serviceaccounts", "get"},
	{"apps", "deployments", "create"},
	{"", "services", "create"},
	{"agent.kagenti.dev", "agentruntimes", "create"},
	{"agent.kagenti.dev", "agentruntimes", "get"},
}

var agentDeployRouteCheck = deployResourceCheck{"route.openshift.io", "routes", "create"}

func (kc *InternalKubernetesClient) CanDeployAgentInNamespace(ctx context.Context, identity *RequestIdentity, namespace string, createRoute bool) (bool, error) {
	checks := agentDeployChecks
	if createRoute {
		checks = append(append([]deployResourceCheck{}, checks...), agentDeployRouteCheck)
	}
	for _, r := range checks {
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

func (kc *TokenKubernetesClient) CanDeployAgentInNamespace(ctx context.Context, _ *RequestIdentity, namespace string, createRoute bool) (bool, error) {
	checks := agentDeployChecks
	if createRoute {
		checks = append(append([]deployResourceCheck{}, checks...), agentDeployRouteCheck)
	}
	for _, r := range checks {
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

func (kc *InternalKubernetesClient) anySubjectAccessReview(
	ctx context.Context,
	identity *RequestIdentity,
	namespace, name string,
	resources []string,
	verb string,
) (bool, error) {
	for _, resource := range resources {
		allowed, err := kc.subjectAccessReview(ctx, identity, namespace, name, resource, verb)
		if err != nil {
			return false, err
		}
		if allowed {
			return true, nil
		}
	}
	return false, nil
}

func (kc *TokenKubernetesClient) anySelfSubjectAccessReview(
	ctx context.Context,
	namespace, name string,
	resources []string,
	verb string,
) (bool, error) {
	for _, resource := range resources {
		allowed, err := kc.selfSubjectAccessReview(ctx, namespace, name, resource, verb)
		if err != nil {
			return false, err
		}
		if allowed {
			return true, nil
		}
	}
	return false, nil
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

	response, err := kc.authorizationClient().AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
	if err != nil {
		return false, fmt.Errorf("SAR failed: %w", err)
	}
	return response.Status.Allowed, nil
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
