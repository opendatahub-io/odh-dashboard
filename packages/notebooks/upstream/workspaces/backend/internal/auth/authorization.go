/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package auth

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/apiserver/pkg/authentication/user"
	"k8s.io/apiserver/pkg/authorization/authorizer"
	"k8s.io/apiserver/pkg/authorization/authorizerfactory"
	authorizationv1 "k8s.io/client-go/kubernetes/typed/authorization/v1"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	allowCacheTTL = 10 * time.Second
	denyCacheTTL  = 10 * time.Second
)

// NewRequestAuthorizer returns a new request authorizer based on the provided configuration.
// loosely based on `WithAuthenticationAndAuthorization` from: https://github.com/kubernetes-sigs/controller-runtime/blob/v0.20.1/pkg/metrics/filters/filters.go#L36-L122
func NewRequestAuthorizer(restConfig *rest.Config, httpClient *http.Client) (authorizer.Authorizer, error) {
	authorizationV1Client, err := authorizationv1.NewForConfigAndClient(restConfig, httpClient)
	if err != nil {
		return nil, err
	}

	authorizerConfig := authorizerfactory.DelegatingAuthorizerConfig{
		SubjectAccessReviewClient: authorizationV1Client,

		// AllowCacheTTL is the length of time that a successful authorization response will be cached
		AllowCacheTTL: allowCacheTTL,

		// DenyCacheTTL is the length of time that a denied authorization response will be cached
		DenyCacheTTL: denyCacheTTL,

		// wait.Backoff is copied from: https://github.com/kubernetes/apiserver/blob/v0.29.0/pkg/server/options/authentication.go#L43-L50
		// options.DefaultAuthWebhookRetryBackoff is not used to avoid a dependency on "k8s.io/apiserver/pkg/server/options".
		WebhookRetryBackoff: &wait.Backoff{
			Duration: 500 * time.Millisecond,
			Factor:   1.5,
			Jitter:   0.2,
			Steps:    5,
		},
	}

	delegatingAuthorizer, err := authorizerConfig.New()
	if err != nil {
		return nil, fmt.Errorf("failed to create authorizer: %w", err)
	}

	return delegatingAuthorizer, nil
}

type ResourcePolicy struct {
	Verb ResourceVerb

	Group    string
	Version  string
	Kind     string
	Resource string

	Namespace string
	Name      string
}

// kindToResource converts a Kind name to a resource name (lowercase plural).
// This is a simplified conversion that works for common resources.
func kindToResource(kind string) string {
	if kind == "" {
		return ""
	}
	lower := strings.ToLower(kind)
	// Handle common irregular plurals
	if strings.HasSuffix(lower, "s") {
		return lower + "es"
	}
	return lower + "s"
}

// NewResourcePolicy returns a new resource policy based on the provided verb and resource object.
func NewResourcePolicy(verb ResourceVerb, object client.Object) *ResourcePolicy {
	gvk := object.GetObjectKind().GroupVersionKind()
	resource := kindToResource(gvk.Kind)

	slog.Debug("NewResourcePolicy",
		"verb", verb,
		"group", gvk.Group,
		"version", gvk.Version,
		"kind", gvk.Kind,
		"resource", resource,
	)

	policy := &ResourcePolicy{
		Verb:     verb,
		Group:    gvk.Group,
		Version:  gvk.Version,
		Kind:     gvk.Kind,
		Resource: resource,
	}

	if object.GetNamespace() != "" {
		policy.Namespace = object.GetNamespace()
	}

	if object.GetName() != "" {
		policy.Name = object.GetName()
	}

	return policy
}

// AttributesFor returns an authorizer.Attributes which could be used with an authorizer.Authorizer to authorize the user for the resource policy.
func (p *ResourcePolicy) AttributesFor(u user.Info) authorizer.Attributes {
	slog.Info("AttributesFor SAR check",
		"user", u.GetName(),
		"groups", u.GetGroups(),
		"verb", p.Verb,
		"apiGroup", p.Group,
		"resource", p.Resource,
		"namespace", p.Namespace,
	)
	return authorizer.AttributesRecord{
		User:            u,
		Verb:            string(p.Verb),
		Namespace:       p.Namespace,
		APIGroup:        p.Group,
		APIVersion:      p.Version,
		Resource:        p.Resource,
		Name:            p.Name,
		ResourceRequest: true,
	}
}

// ResourceVerb are the verbs available for resource policies.
// Corresponds to the verbs of a SubjectAccessReview:
// https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/apis/authorization/types.go#L78-L79
type ResourceVerb string

const (
	ResourceVerbCreate ResourceVerb = "create"
	ResourceVerbDelete ResourceVerb = "delete"
	ResourceVerbGet    ResourceVerb = "get"
	ResourceVerbList   ResourceVerb = "list"
	ResourceVerbPatch  ResourceVerb = "patch"
	ResourceVerbUpdate ResourceVerb = "update"
)
