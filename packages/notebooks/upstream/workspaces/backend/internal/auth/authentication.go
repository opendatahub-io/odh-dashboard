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
	"net/http"
	"slices"
	"strings"

	authenticationv1 "k8s.io/api/authentication/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apiserver/pkg/authentication/authenticator"
	"k8s.io/apiserver/pkg/authentication/request/headerrequest"
	"k8s.io/apiserver/pkg/authentication/user"
	authenticationv1client "k8s.io/client-go/kubernetes/typed/authentication/v1"
)

// withAuthenticatedGroup ensures "system:authenticated" is present in groups, as required by RBAC
// bindings that use that group. Shared by NewRequestAuthenticator and NewBearerTokenAuthenticator.
func withAuthenticatedGroup(groups []string) []string {
	if !slices.Contains(groups, "system:authenticated") {
		groups = append(groups, "system:authenticated")
	}
	return groups
}

// NewRequestAuthenticator returns a new request authenticator based on the provided configuration.
func NewRequestAuthenticator(useridHeader string, useridPrefix string, groupsHeader string) (authenticator.Request, error) {

	// create an upstream `requestHeaderAuthRequestHandler` to extract user and groups from the request headers
	requestHeaderAuthenticator, err := headerrequest.New(
		[]string{useridHeader},
		nil,
		[]string{groupsHeader},
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create request header authenticator: %w", err)
	}

	// wrap the upstream authenticator to:
	// 1. trim the user prefix from the user id (if configured)
	// 2. ensure system:authenticated group is always present for authenticated users
	requestAuthenticator := authenticator.RequestFunc(func(req *http.Request) (*authenticator.Response, bool, error) {
		response, ok, err := requestHeaderAuthenticator.AuthenticateRequest(req)
		if err != nil {
			return nil, false, err
		}

		// if the request was not authenticated, return the response as is
		if !ok {
			return response, ok, nil
		}

		// trim the user id prefix from the username (if configured)
		username := response.User.GetName()
		if useridPrefix != "" {
			username = strings.TrimPrefix(username, useridPrefix)
		}

		return &authenticator.Response{
			User: &user.DefaultInfo{
				Name:   username,
				Groups: withAuthenticatedGroup(response.User.GetGroups()),
				Extra:  response.User.GetExtra(),
			},
		}, true, nil
	})

	return requestAuthenticator, nil
}

// NewBearerTokenAuthenticator returns a new request authenticator that resolves the request's
// identity from a configurable request header (optionally stripping a configurable prefix, e.g.
// "Bearer ") via a Kubernetes TokenReview.
//
// This is used for deployments (e.g. RHOAI/ODH) where the caller forwards the end-user's own
// token instead of injecting `kubeflow-userid`/`kubeflow-groups` request headers. The header and
// prefix are configurable so this can match whatever the calling proxy forwards.
func NewBearerTokenAuthenticator(tokenReviews authenticationv1client.TokenReviewInterface, header string, prefix string) (authenticator.Request, error) {
	requestAuthenticator := authenticator.RequestFunc(func(req *http.Request) (*authenticator.Response, bool, error) {
		raw := req.Header.Get(header)
		if raw == "" {
			return nil, false, nil
		}

		token := raw
		if prefix != "" {
			if !strings.HasPrefix(raw, prefix) {
				return nil, false, nil
			}
			token = strings.TrimPrefix(raw, prefix)
		}
		token = strings.TrimSpace(token)
		if token == "" {
			return nil, false, nil
		}

		review, err := tokenReviews.Create(req.Context(), &authenticationv1.TokenReview{
			Spec: authenticationv1.TokenReviewSpec{
				Token: token,
			},
		}, metav1.CreateOptions{})
		if err != nil {
			return nil, false, fmt.Errorf("failed to create TokenReview: %w", err)
		}

		if !review.Status.Authenticated {
			return nil, false, nil
		}

		return &authenticator.Response{
			User: &user.DefaultInfo{
				Name:   review.Status.User.Username,
				Groups: withAuthenticatedGroup(review.Status.User.Groups),
			},
		}, true, nil
	})

	return requestAuthenticator, nil
}
