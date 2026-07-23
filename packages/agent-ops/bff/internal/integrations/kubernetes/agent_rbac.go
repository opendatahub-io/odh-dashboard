package kubernetes

import (
	"context"
	"fmt"
	"time"

	authv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

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
